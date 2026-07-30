---
name: multi-schema
description: Isolamento de dados por schema do PostgreSQL — resolver o schema do cliente em runtime com SET search_path na abertura da conexão, separar o que é do cliente do que é compartilhado, rodar migrations em N schemas, provisionar cliente novo e testar o isolamento. Use ao criar entidade que guarda dado de cliente, configurar DbContext e interceptor, escrever migration, provisionar cliente ou diagnosticar dado aparecendo no schema errado.
agent: net10-agent
---

# Isolamento por schema

O produto separa os dados de cada cliente em um **schema do PostgreSQL**. A decisão e o porquê estão
no [ADR-003](../../../docs/decisions/ADR-003-isolamento-multi-schema.md); aqui é a execução.

```text
public / compartilhado      cliente_acme            cliente_contoso
├── usuario                 ├── pedido              ├── pedido
├── cliente                 ├── item_de_pedido      ├── item_de_pedido
├── usuario_cliente         └── nota_fiscal         └── nota_fiscal
└── auditoria_de_acesso
```

## A regra que não se quebra

**A conexão define o schema; a entidade não.** As entidades do cliente são mapeadas **sem schema
explícito**, e o `search_path` da conexão resolve. Qualificar a entidade com um schema fixo amarra o
mapeamento a um cliente e quebra o modelo inteiro.

```csharp
// ❌ Schema fixo na entidade do cliente — só funciona para um cliente.
builder.ToTable("pedido", "cliente_acme");

// ✅ Sem schema: o search_path da conexão resolve.
builder.ToTable("pedido");

// ✅ Compartilhado é explícito, porque não depende do cliente.
builder.ToTable("usuario", SchemaConsts.Compartilhado);
```

Isso não revoga a seção 5.1 de [estrutura-arquitetura.md](../../docs/estrutura-arquitetura.md):
schema de **outro sistema** continua explícito em `SchemaConsts`. O que passa a ser implícito é só o
schema **do cliente**, porque ele varia por requisição.

## O que vive onde

| Vai no schema do cliente | Vai no compartilhado |
|---|---|
| Todo dado operacional do negócio | Catálogo de clientes e seus schemas |
| Agregados, itens, documentos | Usuário e credencial |
| Configuração específica do cliente | Vínculo usuário → cliente |
| | Trilha de auditoria de acesso |

Na dúvida, pergunte: *"se este cliente for excluído, este registro vai junto?"* Se sim, é do cliente.

O catálogo no compartilhado é a **lista branca** de schemas válidos — a defesa contra nome de schema
forjado depende dele existir.

## Resolver o schema na conexão

O nome vem da **claim** emitida no login, a partir do vínculo persistido. Nunca de query string,
header, rota ou campo de formulário — isso é
[`owasp-web`](../owasp-web/SKILL.md), seção de vazamento entre schemas.

```csharp
public sealed class SearchPathInterceptor(IContextoDoCliente contexto) : DbConnectionInterceptor
{
    public override async Task<InterceptionResult> ConnectionOpenedAsync(
        DbConnection conexao,
        ConnectionEndEventData dadosDoEvento,
        CancellationToken cancellationToken = default)
    {
        var schema = contexto.SchemaAtual
            ?? throw new InvalidOperationException("Schema do cliente não resolvido.");

        await using var comando = conexao.CreateCommand();
        comando.CommandText = $"SET search_path = {QuoteIdent(schema)}, {SchemaConsts.Compartilhado}";
        await comando.ExecuteNonQueryAsync(cancellationToken);

        return InterceptionResult.Suppress();
    }
}
```

Três detalhes que decidem se isso é seguro:

- **`SET` na abertura, não no início do request.** Conexão vem de pool: sem o `SET` a cada abertura,
  uma conexão reusada roda a query no schema da requisição anterior — e vaza dado **sem erro**.
- **Falha aborta.** Schema não resolvido lança. Nunca `?? "public"`: fallback silencioso transforma
  falha de autenticação em acesso ao compartilhado.
- **Nome validado, nunca concatenado cru.** `QuoteIdent` mais conferência contra o catálogo. Schema
  vindo de string é injeção — o `SET` não aceita parâmetro, então a validação é obrigatória.

## Migrations em N schemas

É o custo real do modelo: **cada cliente é um schema, e cada migration roda em todos**.

```bash
dotnet ef migrations add AdicionaPedido -c ClienteDbContext
```

Aplicar exige percorrer os schemas do catálogo, e a tabela de histórico do EF precisa morar **dentro
de cada schema** — senão o EF acha que já migrou tudo depois do primeiro:

```csharp
options.UseNpgsql(conexao, npgsql => npgsql
    .MigrationsHistoryTable("__EFMigrationsHistory", schemaDoCliente));
```

Regras que evitam corrupção silenciosa:

- **Migration nunca cruza schema.** A do cliente não toca o compartilhado, e vice-versa — são dois
  `DbContext` com históricos separados.
- **Aplicação é parcial por natureza.** Falhar no cliente 40 de 100 deixa o sistema em dois estados;
  registre o progresso e torne a rotina repetível.
- **Migration destrutiva vai em duas etapas** — some a coluna depois que todo cliente migrou.
- **Design-time precisa de um schema alvo.** `IDesignTimeDbContextFactory` com um schema de
  referência, senão o `dotnet ef` não roda.

## Cliente novo

Provisionar é: criar o schema, aplicar todas as migrations nele, registrar no catálogo. Nessa ordem,
e **em transação** — schema criado sem registro fica órfão; registrado sem migration quebra no
primeiro acesso.

```sql
CREATE SCHEMA IF NOT EXISTS cliente_acme;
```

O nome é **derivado**, nunca digitado pelo usuário: prefixo fixo mais identificador validado
(`^[a-z][a-z0-9_]{2,40}$`). Sem isso, nome de cliente vira nome de objeto no banco.

## Excluir um cliente

`DROP SCHEMA cliente_acme CASCADE` elimina tudo de uma vez — é a vantagem operacional do modelo e
atende [`direitos-titular`](../direitos-titular/SKILL.md) e
[`retencao-descarte`](../retencao-descarte/SKILL.md) sem varredura por tabela.

Antes: confirme que o compartilhado não guarda dado pessoal do cliente que exija o mesmo destino, e
lembre que backup e réplica continuam com os dados — eliminar o schema não elimina a cópia.

## Testar o isolamento

Teste de integração precisa **criar o schema**, não só a transação — ver
[`testes-integracao`](../testes-integracao/SKILL.md).

O teste que não pode faltar: **dois clientes, o mesmo id**. Grave no cliente A, consulte autenticado
como B, exija zero resultados. É o único que pega a falha mais cara do modelo — conexão sem
`search_path` correto, que devolve dado do vizinho sem levantar erro.

Cubra também: query bruta e procedure respeitando o schema, e migration aplicada em todos.

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Dado de outro cliente na listagem | Conexão do pool sem `SET search_path` | Faça o `SET` na **abertura**, não por requisição |
| `relation "pedido" does not exist` | `search_path` não aplicado ou schema errado | Confira o interceptor e o valor da claim |
| Migration só no primeiro cliente | Histórico do EF fora do schema | `MigrationsHistoryTable` com o schema do cliente |
| Cliente novo quebra no primeiro acesso | Schema criado sem migrations | Provisionamento em transação: criar, migrar, registrar |
| `dotnet ef` falha fora do host | Sem schema alvo em design-time | `IDesignTimeDbContextFactory` com schema de referência |
| Procedure lendo do schema errado | `search_path` da conexão ignorado | Qualifique, ou receba o schema como parâmetro (`%I`) |
