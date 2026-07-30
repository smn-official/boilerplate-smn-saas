# ADR-003 — Isolamento de dados por schema do PostgreSQL, resolvido por `search_path` na conexão

**Status:** aceito
**Data:** 2026-07-30

## Contexto

O produto é um SaaS em que cada cliente contratante enxerga apenas os próprios dados. Isolar dados de
clientes distintos dentro do mesmo banco é uma decisão que atravessa todas as features e é cara de
reverter depois que existir volume em produção — logo, precisa ser fixada antes da primeira entidade
de cliente ser modelada.

O [ADR-002](ADR-002-database-strategy.md) já fixou PostgreSQL com EF Core 10 e migrations como única
fonte de mudança estrutural. Este ADR responde a pergunta que aquele deixou em aberto: **onde as
linhas de um cliente terminam e as de outro começam.**

As forças em jogo:

1. **Isolamento precisa ser estrutural, não condicional.** Se a separação depende de um filtro que
   alguém pode esquecer de aplicar, o modo de falha é vazamento silencioso de dado de um cliente para
   outro — o pior incidente possível neste produto. Isolamento que depende de disciplina não é
   isolamento.
2. **Backup e restore por cliente.** Restaurar um cliente específico a um ponto no tempo, sem tocar
   nos demais, é requisito operacional recorrente em SaaS B2B — e impossível de fazer com decência
   quando as linhas de todo mundo estão misturadas nas mesmas tabelas.
3. **Extração e exclusão total a pedido do cliente.** O contrato pode acabar, e o cliente pode exigir
   a devolução integral dos seus dados ou a eliminação deles. Sob a LGPD isso reaparece no
   art. 18 — os direitos de acesso, portabilidade e eliminação (skill
   [direitos-titular](../../.ai/skills/direitos-titular/SKILL.md)) — com prazo para responder. Um
   `pg_dump --schema` responde a isso em um comando; um `DELETE ... WHERE tenant_id = ...` espalhado
   por quarenta tabelas responde a isso com uma planilha e um pedido de desculpas.
4. **Auditabilidade.** "Prove que o cliente A não conseguia ler dado do cliente B" é uma pergunta que
   se responde olhando privilégio de schema, não relendo toda query do sistema.

A força do outro lado é igualmente concreta e não deve ser minimizada: **N schemas significam N vezes
as migrations.** Toda alteração de schema deixa de ser uma operação e passa a ser um laço sobre todos
os clientes, com o problema de aplicação parcial que todo laço tem — o cliente 37 falhou, os 36
primeiros já migraram, e agora o sistema roda com duas versões de schema simultâneas. Esse custo é
permanente e cresce com o sucesso comercial do produto.

## Decisão

**Isolar dados de clientes por schema do PostgreSQL.** Cada cliente contratante possui um schema
próprio, com o conjunto completo das tabelas de negócio. Não há coluna discriminadora, e não há banco
separado por cliente.

### Resolução do schema em runtime

A resolução é por **`SET search_path` emitido na abertura da conexão**, através de um interceptor do
Npgsql registrado na composição em `Web`:

```text
SET search_path = <schema_do_cliente>, public
```

- As entidades **de cliente** são mapeadas **sem schema explícito** na `IEntityTypeConfiguration<T>`.
  O nome não qualificado é resolvido pelo `search_path` da conexão, o que permite a um único modelo
  do EF Core servir a todos os clientes.
- O `public` (ou um `compartilhado` dedicado) fica por último no `search_path` e guarda apenas o que
  é **global**: catálogo de clientes, usuários, vínculo usuário→cliente e tabelas de infraestrutura.
  Essas entidades continuam com **schema explícito** no mapeamento, via `SchemaConsts`, exatamente
  como a seção 5.1 de [estrutura-arquitetura.md](../../.ai/docs/estrutura-arquitetura.md) já exige.

Que uma entidade tenha ou não schema explícito no mapeamento passa a ser a marca visível de ela ser
global ou de cliente. Não é detalhe de estilo: é a declaração de qual lado da fronteira ela está.

### Origem da identidade do cliente

O schema alvo vem de uma **claim do usuário autenticado**, no cookie de sessão.

- A claim é **definida no login**, a partir do vínculo usuário→cliente persistido no schema global.
- A claim **nunca** vem de input do usuário — não de campo de formulário, não de query string, não de
  header, não de subdomínio. O cliente que o usuário pode acessar é um fato do banco, não uma
  afirmação da requisição.
- Trocar de cliente (quando um usuário tem mais de um vínculo) é **reautenticação da sessão** contra o
  vínculo persistido, não a edição de um valor que o navegador carrega.

### A tensão com `seguranca-sql`, e como as duas coisas convivem

A skill [seguranca-sql](../../.ai/skills/seguranca-sql/SKILL.md) exige `SET search_path` **fixo e
literal** na definição de toda procedure, como defesa contra *shadowing*: sem isso, alguém cria um
objeto homônimo num schema que controla e faz a procedure executar código dele. Multi-schema, por
construção, exige um `search_path` **dinâmico**. Isso parece contradição e não é — são dois níveis
diferentes:

| Nível | `search_path` | Por quê |
|---|---|---|
| Conexão (Npgsql, por requisição) | Dinâmico — o schema do cliente da sessão | É o mecanismo de isolamento; sem ele não há multi-schema |
| Procedure (cláusula `SET` na definição) | Fixo e literal, com `pg_temp` por último | É a fronteira de segurança; o valor da conexão **não** deve influenciar a resolução dentro dela |

A cláusula `SET search_path` de uma procedure **sobrepõe** o da conexão durante a execução. Portanto a
procedure continua determinística e imune a shadowing mesmo com conexão dinâmica — e continua obrigada
a qualificar nomes com schema no corpo. Procedure que precise operar sobre o schema do cliente recebe
o schema **como parâmetro validado**, não o herda do ambiente.

O que torna o dinamismo aceitável é a **procedência do valor**: o schema não é entrada do usuário, é
uma claim emitida pelo próprio sistema a partir de um vínculo lido do banco. Dinâmico com fonte
confiável é diferente de dinâmico com fonte arbitrária.

E, em qualquer nível: **o nome do schema nunca é concatenado em SQL.** Ele entra por identificador
validado — `quote_ident`/`format('%I', ...)` no lado do banco, lista branca conferida contra o
catálogo de clientes no lado da aplicação. Schema vindo de string interpolada é vetor de injeção com o
agravante de que o alvo é justamente a fronteira de isolamento.

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| Coluna `TenantId` com `HasQueryFilter` global (multi-tenant clássico) | Um `IgnoreQueryFilters()` esquecido — ou uma query bruta, ou um `FromSql`, ou um `Include` numa navegação sem filtro — vaza dado entre clientes **sem erro algum**. O isolamento vira convenção verificada por revisão de código, e a falha é silenciosa e permanente. Este boilerplate prefere que a falha seja barulhenta: com schema, a query errada não encontra a tabela e explode |
| Banco separado por cliente | Isolamento ainda mais forte, e custo operacional e de conexão alto demais. Cada cliente vira uma instância a provisionar, monitorar, versionar e fazer backup; o pool de conexões não é compartilhável entre bancos, e o número de conexões cresce linearmente com o número de clientes. Serve a um produto com dezenas de clientes grandes, não a este |
| `HasDefaultSchema` dinâmico no `DbContext` | O EF Core faz cache do modelo por chave de modelo. Schema dinâmico no `OnModelCreating` significa um modelo compilado por cliente: a memória cresce com N clientes e o *warm-up* se repete a cada schema novo. Além disso, procedures e SQL bruto ficariam fora desse mecanismo e exigiriam tratamento à parte — duas formas de resolver schema no mesmo sistema |
| Subdomínio como origem da identidade (`cliente.produto.com.br`) | Exige DNS wildcard e certificado curinga, com renovação e provisionamento próprios, além de tornar ambiente local e de teste mais chatos. A claim resolve a mesma coisa sem nenhuma infraestrutura extra. Subdomínio pode voltar como conveniência de URL, mas nunca como **fonte** da identidade — o que vem da URL é afirmação do cliente, não fato do sistema |
| Row Level Security do PostgreSQL sobre tabela única | Move o isolamento para o banco, o que é bom, mas mantém os dados de todos os clientes fisicamente misturados — sem resolver backup, restore, extração nem exclusão por cliente, que são metade da motivação. A política ainda depende de uma variável de sessão definida corretamente, e o modo de falha continua sendo leitura indevida |

## Consequências

**Positivas**

- Isolamento estrutural: a query que esquece o filtro não encontra a tabela do outro cliente. A falha
  é imediata e visível em desenvolvimento, não silenciosa em produção.
- Backup, restore, extração e exclusão por cliente viram operação de schema — `pg_dump --schema`,
  `DROP SCHEMA ... CASCADE` — em vez de varredura por dezenas de tabelas.
- Resposta a pedido de acesso, portabilidade ou eliminação (LGPD, art. 18) tem caminho técnico direto
  e demonstrável, dentro do prazo legal.
- Privilégio por schema permite provar isolamento olhando `GRANT`, sem reler toda a base de código.
- O modelo do EF Core continua único: uma configuração de entidade serve a todos os clientes.
- Dados de um cliente grande não degradam índices dos demais; estatísticas e planos ficam por schema.

**Negativas**

- **Migrations rodam em cada schema.** Deploy passa a ser um laço com estado parcial possível: metade
  dos clientes migrada, metade não. Exige ordem determinística, idempotência, registro de progresso e
  um plano para o que fazer quando o schema 37 falha.
- **Um schema novo nasce a cada cliente**, o que torna a criação de cliente uma operação de DDL, não
  um `INSERT`. Provisionamento vira código de produção, com tudo que isso implica.
- **O pool de conexões fica menos eficiente.** A conexão passa a carregar estado (`search_path`), o
  que obriga a reemitir o comando a cada abertura e reduz o reaproveitamento útil entre requisições de
  clientes diferentes. É custo de latência e de conexão, pago em toda requisição.
- **`dotnet ef` e o tooling de design-time precisam de um schema alvo.** Gerar migration, inspecionar
  modelo ou rodar `dbcontext script` fora do host exige um `IDesignTimeDbContextFactory` que fixe um
  schema de referência — e o schema de referência pode divergir do que existe em produção.
- **Toda procedure e todo SQL bruto exigem cuidado redobrado.** O que antes era "qualifique o schema"
  passa a ser "decida conscientemente se este objeto é global ou de cliente, e nunca concatene o
  nome".
- **Teste de integração precisa criar schema**, não só transação com rollback. A fixture fica mais
  cara e mais lenta, e passa a ter que testar também o próprio mecanismo de resolução.
- Consulta analítica que atravessa clientes (uso agregado, faturamento, métrica de produto) deixa de
  ser um `GROUP BY` e vira união sobre N schemas.

**Passa a ser obrigatório**

- Entidade **de cliente** mapeada **sem schema explícito**; entidade **global** com schema explícito
  via `SchemaConsts`. Não há terceira categoria, e a escolha é declarada no mapeamento.
- O schema da sessão vem **exclusivamente** da claim emitida no login a partir do vínculo persistido.
  Nenhum caminho de código lê schema de rota, query string, header, corpo de requisição ou subdomínio.
- Nome de schema **nunca** concatenado em SQL: `quote_ident`/`%I` no banco, lista branca conferida
  contra o catálogo de clientes na aplicação.
- Toda procedure mantém `SET search_path` **fixo e literal** na definição, com `pg_temp` por último, e
  qualifica nomes no corpo. Procedure que opere sobre schema de cliente recebe o schema por parâmetro
  validado — nunca o herda da conexão.
- Migration é aplicada a **todos** os schemas de cliente, em ordem determinística, com registro de
  progresso e comportamento definido para falha parcial.
- Criação de cliente cria o schema e aplica todas as migrations pendentes na mesma operação. Cliente
  cujo schema ficou defasado não entra em serviço.
- `IDesignTimeDbContextFactory` para cada contexto proprietário, com schema alvo explícito.
- Teste de integração cria e destrói schema próprio, e ao menos um teste prova que a sessão do
  cliente A não alcança dado do cliente B.
- Consulta que precise atravessar clientes é escrita deliberadamente e revisada como tal — atravessar
  a fronteira nunca acontece por acidente.

## Referências

- [ADR-001](ADR-001-use-ddd.md) — separação de camadas; o interceptor mora em `Data`/`Web`, nunca em
  `Core`
- [ADR-002](ADR-002-database-strategy.md) — PostgreSQL, EF Core 10 e migrations como única fonte de
  mudança estrutural
- [.ai/docs/estrutura-arquitetura.md](../../.ai/docs/estrutura-arquitetura.md) — seção 5.1,
  propriedade de schema e `SchemaConsts`
- [.ai/skills/seguranca-sql](../../.ai/skills/seguranca-sql/SKILL.md) — `search_path` obrigatório,
  `format()`/`%I` e lista branca
- [.ai/skills/persistencia-ef](../../.ai/skills/persistencia-ef/SKILL.md)
- [.ai/skills/direitos-titular](../../.ai/skills/direitos-titular/SKILL.md) — art. 18 da LGPD, acesso,
  portabilidade e eliminação
- [.ai/skills/testes-integracao](../../.ai/skills/testes-integracao/SKILL.md)
