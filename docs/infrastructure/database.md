# Banco de dados

> **Template do boilerplate.** Preencha ao implementar e remova este aviso.

PostgreSQL com Npgsql e EF Core 10. O banco é fixo pelo boilerplate; o que este documento pede ao
projeto é o **modelo físico** — quais schemas, quais tabelas, quem é dono de quê.

## Stack

| Item | Valor | Observação |
|---|---|---|
| SGBD | PostgreSQL 16+ | Único suportado |
| Provider | `Npgsql.EntityFrameworkCore.PostgreSQL` | Camada `Data` |
| ORM | EF Core 10 | Camada `Data` |
| Tooling | `Microsoft.EntityFrameworkCore.Design` (`PrivateAssets=all`) | Não vai para runtime |

*Preencha aqui a versão exata do servidor em cada ambiente e o serviço gerenciado adotado, se
houver.*

## Convenção de nomes — norma

**Identificadores por extenso: sem abreviação, sigla ou diminutivo.** Vale para schema, tabela,
coluna, constraint, índice, parâmetro, variável e procedure.

| Correto | Errado | Por quê |
|---|---|---|
| `quantidade_disponivel` | `qtd_disp` | Abreviação exige decodificação |
| `data_vencimento` | `dt_venc` | Idem |
| `identificador_cliente` | `id_cli` | Diminutivo é ambíguo |
| `numero_documento` | `nr_doc` | Sigla local não é vocabulário compartilhado |

O motivo é operacional: o banco é lido por quem não escreveu o código — analista, DBA, relatório,
consulta de incidente. Abreviação economiza segundos de digitação e custa minutos em cada leitura
futura, para sempre. Regra completa em
[`nomenclatura`](../../.ai/skills/nomenclatura/SKILL.md).

Nas configurations do EF, use `nameof` para nome de tabela e coluna, de modo que renomear a
propriedade em C# quebre a compilação em vez de quebrar o mapeamento em silêncio.

*Registre aqui a convenção de caixa e separador adotada pelo projeto — `snake_case` é o idioma
natural do PostgreSQL e evita a necessidade de aspas duplas em consulta manual.*

## Propriedade de schema

**Norma:** cada sistema é dono do seu schema. Quando o banco é compartilhado com outro sistema, os
papéis vão para **contextos distintos**, documentados em `<summary>`:

| Papel | Descrição | Migrations |
|---|---|---|
| **Proprietário** | É dono das tabelas do próprio schema | Sim — migrations próprias |
| **Consumidor** | Mapeia tabelas cuja fonte de verdade é de outro sistema | **Nenhuma.** Nunca cria, migra ou apaga tabela; sem `EnsureCreated` |

```csharp
public static class SchemaConsts
{
    /// <summary>Schema próprio do projeto, evoluído por migrations. Leitura e escrita.</summary>
    public const string <Proprio> = "<Proprio>";

    /// <summary>Schema de outro sistema. Consumido; o projeto não é dono.</summary>
    public const string <Externo> = "<Externo>";
}
```

Consumir a mesma fonte de verdade de outro sistema **não é duplicá-la** — o antipadrão seria replicar
os dados e criar uma segunda fonte que diverge com o tempo.

*Liste aqui os schemas deste projeto e o papel de cada um.*

| Schema | Papel | Sistema dono | Observação |
|---|---|---|---|
| | | | |

## Isolamento entre clientes — norma

**Norma:** os dados de cada cliente contratante ficam em um **schema próprio do PostgreSQL**. Não há
coluna discriminadora e não há banco por cliente. A decisão, as alternativas descartadas e as
consequências estão no [ADR-003](../decisions/ADR-003-isolamento-multi-schema.md).

O schema é resolvido em **runtime**, por `SET search_path = <schema_do_cliente>, <compartilhado>`
emitido na **abertura da conexão** por um interceptor do Npgsql. O nome vem de uma claim do usuário
autenticado, definida no login a partir do vínculo persistido — **nunca** de rota, query string,
header, corpo de requisição ou subdomínio.

Isto é ortogonal à propriedade de schema da seção anterior: um sistema pode consumir schema de
terceiro **e** isolar clientes por schema ao mesmo tempo.

| Categoria | Conteúdo | Mapeamento no EF | Migrations |
|---|---|---|---|
| **Schema do cliente** | Todo dado operacional do negócio | **Sem** schema no `ToTable` | Aplicadas em **todos** os schemas de cliente |
| **Schema compartilhado** | Catálogo de clientes, usuário, vínculo usuário→cliente, auditoria | Schema explícito via `SchemaConsts` | Aplicadas uma vez |

Na dúvida sobre onde uma tabela mora, pergunte: *se este cliente for excluído, este registro vai
junto?* Se sim, é do cliente.

Regras que não mudam com o projeto:

| Regra | Motivo |
|---|---|
| Nome de schema **nunca** concatenado em SQL | É a fronteira de isolamento; use `quote_ident`/`%I` e lista branca do catálogo |
| Schema não resolvido **aborta** a requisição | `?? "public"` transforma falha de autenticação em acesso ao compartilhado |
| `SET search_path` na **abertura** da conexão | Conexão vem de pool; sem isso a query roda no schema da requisição anterior |
| Histórico do EF **dentro** de cada schema | Histórico único faz o EF pular todos os clientes após o primeiro |
| Procedure mantém `search_path` **fixo** na definição | O dinamismo é da conexão, não da procedure — ver [`seguranca-sql`](../../.ai/skills/seguranca-sql/SKILL.md) |

Execução completa — interceptor, migrations em N schemas, exclusão de cliente e teste de isolamento
— em [`multi-schema`](../../.ai/skills/multi-schema/SKILL.md).

*Liste aqui os schemas de cliente existentes, ou o critério e o local onde essa lista é mantida — o
catálogo no schema compartilhado costuma ser a fonte de verdade, e este documento aponta para ele.*

| Cliente | Schema | Provisionado em | Observação |
|---|---|---|---|
| | | | |

*Registre a **convenção de nome do schema de cliente** adotada: o prefixo fixo, o identificador que
compõe o sufixo, a expressão que o valida e o limite de tamanho. O nome é sempre derivado por regra,
nunca digitado por um usuário.*

*Descreva a **rotina de provisionamento de cliente novo**: onde ela vive, como é disparada, em que
ordem executa (criar schema, aplicar migrations, registrar no catálogo — em transação), o que
acontece em caso de falha no meio e quem pode executá-la. Registre também o procedimento de
desativação e de exclusão do cliente, incluindo o destino dos backups.*

## Modelo físico

*Esta seção é do projeto. Documente as tabelas com propósito, chaves e relacionamentos — o que o
DDL não explica sozinho: por que uma tabela existe, qual regra de negócio ela sustenta, o que
acontece com o registro ao longo do ciclo de vida.*

| Tabela | Propósito | Chave | Relacionamentos |
|---|---|---|---|
| | | | |

*Um diagrama do modelo ajuda mais que qualquer tabela. Se o projeto mantiver um, aponte o caminho
aqui e registre como ele é regenerado.*

## Mapeamento com EF Core

Uma classe `IEntityTypeConfiguration<T>` por entidade, aplicada explicitamente em `OnModelCreating`.
Convenções fixas:

- `ToTable(nameof(<Entidade>), SchemaConsts.<Schema>)` — **schema explícito** para entidade
  compartilhada ou de outro sistema; entidade **do cliente** vai sem schema, resolvida pelo
  `search_path` da conexão (ver a seção de isolamento entre clientes).
- **Enum persistido com `HasConversion<string>()`** e `HasMaxLength`, nunca como inteiro.
- Valores monetários e decimais com `HasPrecision`.
- Flags booleanas com `HasDefaultValue`.
- Soft delete por propriedade `Excluido`, com `HasDefaultValue(false)`.

```csharp
public sealed class <Entidade>Configuration : IEntityTypeConfiguration<<Entidade>>
{
    public void Configure(EntityTypeBuilder<<Entidade>> builder)
    {
        builder.ToTable(nameof(<Entidade>), SchemaConsts.<Proprio>);
        builder.HasKey(entidade => entidade.Id);

        builder.Property(entidade => entidade.Status)
            .HasConversion<string>()
            .HasMaxLength(30)
            .IsRequired();
    }
}
```

**Por que enum vira string:** inteiro é ilegível em consulta ad hoc, e reordenar os membros do enum
reescreve silenciosamente o significado de cada linha já gravada. String sobrevive à reordenação e à
consulta manual durante um incidente.

**Atenção ao soft delete:** `Excluido = true` **não é eliminação** para efeito de LGPD. Se a tabela
guarda dado pessoal, a exclusão do titular exige anonimização irreversível ou remoção real — ver
[`retencao-descarte`](../../.ai/skills/retencao-descarte/SKILL.md).

## Migrations

Comandos completos em [commands.md](../development/commands.md).

```bash
dotnet ef migrations add <NomeDaMigration> \
  --project src/<Produto>.<Modulo>/Data \
  --startup-project src/<Produto>.<Modulo>.Web
```

Regras:

| Regra | Motivo |
|---|---|
| Migration **só** para contexto proprietário | Migrar schema alheio quebra o outro sistema |
| Uma migration por intenção | Migration guarda-chuva é irreversível na prática |
| Nome descreve a mudança | `AdicionarColunaDataVencimento`, não `Update3` |
| Migration aplicada **nunca** é editada | O histórico já rodou em outro ambiente |
| Toda migration é revisada como código | É a única alteração que não dá para desfazer com `git revert` |
| Migration destrutiva é decisão explícita | `DROP COLUMN` descarta dado; documente e combine antes |
| Migration **nunca** cruza schema | Cliente e compartilhado são contextos e históricos separados |
| Migration de cliente roda em **todos** os schemas | Aplicação parcial é o modo de falha do modelo; a rotina precisa ser repetível |

Adicione um `IDesignTimeDbContextFactory` para cada contexto proprietário, para que o tooling do EF
funcione fora do host.

O que testar: que a migration aplica sobre banco vazio **e** sobre a versão anterior. Ambos os
cenários acontecem em produção; só o primeiro acontece na máquina de quem escreveu.

Aplicação em deploy: ver [deployment.md](deployment.md).

## Índices

**Norma:** todo índice é decisão deliberada, com justificativa. Índice não é gratuito — ele custa
escrita, espaço e manutenção do plano.

| Situação | Ação |
|---|---|
| Coluna usada em filtro frequente | Índice, se o volume justificar |
| Unicidade de negócio (código, documento) | Índice **único**, não só validação na aplicação |
| Chave estrangeira consultada em join | Índice, quase sempre |
| Coluna de baixa cardinalidade (booleano) | Normalmente **não** — o planner ignora |
| Índice que nunca é usado | Remover; ele só encarece escrita |

Antes de criar, meça com `EXPLAIN ANALYZE`. Depois de criar, confirme que o plano mudou — índice que
não entra no plano é custo puro.

Validação de unicidade **só na aplicação não é unicidade**: duas requisições concorrentes passam
pelas duas validações e gravam as duas linhas. A constraint no banco é a única garantia.

*Liste aqui os índices não óbvios do projeto e a consulta que cada um serve.*

## Seed

*Descreva o que este projeto semeia e por qual mecanismo.*

Distinga os dois tipos, que têm regras opostas:

| Tipo | Exemplo | Onde | Regra |
|---|---|---|---|
| **Dado de referência** | Tipos, status, unidades, parametrização | Migration ou rotina idempotente | Faz parte do schema; vai para todos os ambientes |
| **Dado de demonstração** | Usuário fictício, pedido de exemplo | Script separado | **Nunca** em produção |

Seed é sempre **idempotente**: rodar duas vezes não duplica. `INSERT … ON CONFLICT DO NOTHING` ou
verificação prévia.

Dado de homologação derivado de produção precisa ser **anonimizado**, não copiado — ver
[`dados-pessoais-modelagem`](../../.ai/skills/dados-pessoais-modelagem/SKILL.md).

## Stored procedures

O boilerplate suporta procedures PL/pgSQL e mantém um agente dedicado — o `pgproc-agent`, com skills
de escrita, transações, performance, segurança, testes e versionamento.

Quando uma rotina merece virar procedure:

| Vale procedure | Fica na aplicação |
|---|---|
| Processamento em lote sobre volume alto | Regra de negócio do agregado |
| Operação que precisa de transação e cursor no servidor | Orquestração de caso de uso |
| Rotina de manutenção agendada no banco | Qualquer coisa que precise de contexto do usuário |

**Regra de camada:** procedure não substitui domínio. Regra de negócio mora no agregado, em `Core`.
Mover regra para o banco a torna invisível ao teste unitário e ao revisor de PR.

Chamada a partir do .NET por Npgsql/`ExecuteSqlRawAsync`, com parâmetros nomeados — nunca
concatenação de string. Ver [`integracao-dotnet`](../../.ai/skills/integracao-dotnet/SKILL.md).

Versionamento: arquivos `.sql` idempotentes, versionados junto do código, integrados às migrations —
ver [`versionamento-deploy`](../../.ai/skills/versionamento-deploy/SKILL.md).

*Liste aqui as procedures deste projeto, com propósito e assinatura.*

## Privilégio mínimo

**Norma:** a role da aplicação **não** tem DDL.

| Role | Privilégios | Onde é usada |
|---|---|---|
| Aplicação | DML nas tabelas do próprio schema | Runtime |
| Migration | DDL, dono do schema | Só na esteira de deploy |
| Leitura / relatório | `SELECT` restrito | Consulta analítica |
| Auditoria | `INSERT` e `SELECT` na trilha; **sem** `UPDATE`/`DELETE` | Trilha imutável |

Rodar a aplicação com a credencial da migration significa que uma injeção bem-sucedida pode executar
DDL. Detalhes em [`autenticacao-autorizacao`](../../.ai/skills/autenticacao-autorizacao/SKILL.md).

## Backup e recuperação

*Esta seção é do projeto, e é a que mais frequentemente fica só no papel.*

Registre:

| Item | O que documentar |
|---|---|
| Mecanismo | Backup gerenciado do provedor, `pg_dump` agendado, PITR |
| Frequência | Completo e incremental |
| Retenção | Quanto tempo cada geração é mantida |
| Onde | Destino, região, criptografia em repouso |
| Quem restaura | Papel responsável e como pedir |
| RPO / RTO | Perda aceitável e tempo aceitável de indisponibilidade |

**Backup não testado não é backup.** Registre aqui a data do último teste de restauração e a
periodicidade acordada. A primeira restauração real nunca deve ser durante um incidente.

Backup contendo dado pessoal entra na política de retenção: um titular que exerceu o direito de
eliminação continua no backup, e isso precisa estar previsto — ver
[`retencao-descarte`](../../.ai/skills/retencao-descarte/SKILL.md).

## Acesso local e ferramentas

A conexão local vem do `.env` (`ConnectionStrings__Default` para o .NET,
`POSTGRES_CONNECTION_STRING` para o servidor MCP) — ver [configuration.md](configuration.md).

**Norma do `.env.example`:** o servidor MCP aponta **sempre** para banco de desenvolvimento ou cópia
anonimizada, **nunca** para produção. Servidor remoto exige TLS (`?sslmode=require`).
