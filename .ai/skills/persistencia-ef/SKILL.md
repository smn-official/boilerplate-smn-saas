---
name: persistencia-ef
description: Persistência com EF Core 10 e PostgreSQL — DbContext, IEntityTypeConfiguration, migrations, repositórios com specifications, propriedade de schema e integrações externas com fallback. Use ao mexer em qualquer coisa da camada Data.
agent: net10-agent
---

# Persistência com EF Core 10

```text
src/<Produto>.<Modulo>/Data/
├── Configurations/     IEntityTypeConfiguration por entidade
├── Context/            DbContexts, DbContextFactory, SchemaConsts
├── Extensions/         Servicos<Modulo>Extensions (registro de DI)
├── Integracoes/        clientes de APIs externas
├── Migrations/         apenas dos contextos dos quais o projeto é dono
└── Repositories/       implementações + SpecificationEvaluator
```

`Data` referencia somente `Core`. **Nunca** contém regra de negócio.

## Propriedade de schema — consumidor vs. proprietário

Quando o banco é compartilhado com outro sistema, separe os papéis em **contextos distintos**:

| Papel | Descrição | Migrations |
|---|---|---|
| **Proprietário** | É dono das tabelas do próprio schema | Sim — próprias, aplicadas no startup |
| **Consumidor** | Mapeia tabelas cuja fonte de verdade é de outro sistema | **Nenhuma.** Nunca cria, migra ou apaga; sem `EnsureCreated` |

Centralize os nomes de schema, documentando o papel em `<summary>`:

```csharp
public static class SchemaConsts
{
    /// <summary>Schema próprio do projeto, evoluído por migrations. Leitura e escrita.</summary>
    public const string <Proprio> = "<Proprio>";

    /// <summary>Schema de outro sistema. Consumido; o projeto não é dono.</summary>
    public const string <Externo> = "<Externo>";
}
```

Consumir a mesma fonte de verdade **não é duplicá-la** — o antipadrão seria replicar os dados. Cada
contexto proprietário recebe um `IDesignTimeDbContextFactory`, para o tooling do EF funcionar fora
do host.

### Schema do cliente vs. schema compartilhado

Proprietário/consumidor responde *"quem é dono destas tabelas?"*. Existe um segundo eixo, ortogonal
a esse: *"estas linhas são de um cliente ou de todos?"*. O isolamento entre clientes é por **schema
do PostgreSQL**, resolvido em runtime por `SET search_path` na abertura da conexão — decisão no
[ADR-003](../../../docs/decisions/ADR-003-isolamento-multi-schema.md).

A consequência prática no mapeamento é direta: entidade **do cliente** é mapeada **sem schema
explícito**, porque o schema varia por requisição e quem resolve é a conexão; entidade
**compartilhada** (catálogo de clientes, usuário, vínculo usuário→cliente, auditoria) continua com
schema explícito via `SchemaConsts`. Ter ou não schema no `ToTable` passa a ser a marca visível de
qual lado da fronteira a entidade está. O detalhe — interceptor, origem da claim, provisionamento,
teste de isolamento — é da skill [`multi-schema`](../multi-schema/SKILL.md), que é a dona do assunto.

## Configurations

Uma `IEntityTypeConfiguration<T>` por entidade, aplicada explicitamente em `OnModelCreating`.

- `ToTable(nameof(<Entidade>), SchemaConsts.<Schema>)` — schema explícito para entidade
  compartilhada ou de outro sistema. **Entidade do cliente vai sem schema:** `ToTable(nameof(<Entidade>))`,
  resolvido pelo `search_path` da conexão — ver [`multi-schema`](../multi-schema/SKILL.md).
- **Enums com `HasConversion<string>()`** + `HasMaxLength`, nunca inteiro.
- Decimais e monetários com `HasPrecision`.
- Flags booleanas com `HasDefaultValue`.
- Soft delete por `Excluido` com `HasDefaultValue(false)`.
- `nameof` para nomes de tabela e coluna.

## Repositórios

Recebem `ISpecification<T>` e delegam a tradução ao avaliador compartilhado:

```csharp
public static IQueryable<T> AplicarSpecification<T>(IQueryable<T> consulta, ISpecification<T> specification)
    where T : class
{
    var consultaComFiltro = consulta.Where(specification.ToExpression());

    foreach (var include in specification.Includes)
        consultaComFiltro = consultaComFiltro.Include(include);

    if (specification.OrderBy is null)
        return consultaComFiltro;

    return specification.OrdemDescendente
        ? consultaComFiltro.OrderByDescending(specification.OrderBy)
        : consultaComFiltro.OrderBy(specification.OrderBy);
}
```

Assim nenhum repositório tem regra de filtro própria e nenhuma consulta escapa do domínio.

**Unit of Work implícito:** `AdicionarAsync` apenas rastreia; `SalvarAlteracoesAsync` — chamado pelo
serviço, **uma vez**, ao final — executa o `SaveChangesAsync`.

**Deve:** buscar/adicionar/remover agregados, encapsular o mecanismo de armazenamento, executar
specs, carregar os `Include` necessários, retornar **sempre entidades de domínio**.

**Nunca:** regra de negócio, orquestração de caso de uso, auditoria, e-mail, integração externa,
retornar DTO ou relatório, vazar `DbContext`/`DbSet` para o serviço.

## Integrações externas com fallback

Padrão obrigatório: **um contrato em `Core`, duas implementações em `Data`, escolha na composição**.

| Contrato (Core) | Real | Fallback | Critério |
|---|---|---|---|
| `I<Servico>Client` | `<Servico>Client` | `<Servico>ClientDesabilitado` | Flag `Enabled` + credencial preenchida |

O fallback é inerte (no-op, ou log só em Development), permitindo rodar local sem credencial
nenhuma. A decisão fica na extensão de DI, **nunca** em `if` dentro do domínio:

```csharp
private static void Adicionar<Servico>(IServiceCollection services, IConfiguration configuration)
{
    var secao = configuration.GetSection(<Servico>Settings.SecaoConfiguracao);
    services.Configure<<Servico>Settings>(secao);

    var settings = secao.Get<<Servico>Settings>();
    var habilitado = settings is { Enabled: true } && !string.IsNullOrWhiteSpace(settings.SecretKey);

    if (habilitado)
    {
        services.AddScoped<I<Servico>Client, <Servico>Client>();

        return;
    }

    services.AddScoped<I<Servico>Client, <Servico>ClientDesabilitado>();
}
```

## Migrations

```powershell
dotnet ef migrations add <Nome> --project src/<Produto>.<Modulo>/Data --context <Contexto>DbContext
```

- Só para contexto **proprietário**.
- Aplicadas no startup com `MigrateAsync()`, apenas nesses contextos.
- Revise o arquivo gerado antes de commitar — migration errada em produção é cara de reverter.

### Migration de entidade do cliente

Migration do contexto do cliente **não roda uma vez: roda em N schemas**, um por cliente do catálogo.
Isso muda três coisas:

- A tabela de histórico do EF precisa ficar **dentro de cada schema**
  (`MigrationsHistoryTable("__EFMigrationsHistory", schemaDoCliente)`). Com um histórico único, o EF
  considera tudo migrado depois do primeiro schema e os demais ficam para trás em silêncio.
- **Migration nunca cruza schema.** A do cliente não toca o compartilhado, e vice-versa — são
  contextos distintos, com históricos distintos.
- A aplicação é **parcial por natureza**: falhar no cliente 40 de 100 deixa dois estados de schema em
  produção. A rotina precisa de ordem determinística, registro de progresso e ser repetível.

Rotina de aplicação, provisionamento de cliente novo e design-time em
[`multi-schema`](../multi-schema/SKILL.md).
