# ADR-002 — PostgreSQL com EF Core 10, e stored procedure só quando justificada

**Status:** aceito
**Data:** 2026-07-30

## Contexto

O produto é um SaaS multiusuário com dados relacionais, restrição de integridade real e necessidade
de evoluir o schema com frequência ao longo de anos. Três decisões precisavam ser fixadas de uma vez,
porque decidir uma sem as outras produz um sistema incoerente:

1. **Qual SGBD.** Custo de licença, disponibilidade em nuvem, qualidade do driver .NET e recursos
   (JSONB, índice parcial, tipos ricos) pesam mais que preferência.
2. **Como o .NET fala com ele.** Entre ORM completo e SQL manual há uma troca clássica entre
   produtividade/refatoração segura e controle fino do plano de execução.
3. **Onde a regra pode morar.** Sem uma posição explícita, lógica migra silenciosamente para o banco,
   ou permanece toda na aplicação mesmo quando processar no banco seria ordens de grandeza melhor.

O [ADR-001](ADR-001-use-ddd.md) já fixou que a regra de negócio vive em `Core`, sem conhecer o ORM.
Este ADR precisa ser compatível com aquilo: qualquer escolha que force o domínio a conhecer o banco
está descartada por construção.

## Decisão

**PostgreSQL** como banco, acessado por **EF Core 10** sobre o provider **Npgsql**, com schema
evoluído por **migrations**. Stored procedure é recurso deliberado para casos específicos, nunca o
padrão de acesso a dados.

### Acesso e mapeamento

- Toda persistência mora em `Data`. `Core` declara contratos de repositório; `Data` os implementa.
- Configuração de mapeamento em `IEntityTypeConfiguration<T>` por entidade — não em atributo na
  classe de domínio, que sujaria `Core` com tipo de infraestrutura.
- **Enum persistido sempre como string**, via `HasConversion<string>()`. Persistir o valor ordinal
  amarra o banco à ordem de declaração em C#: inserir um membro no meio do enum reescreve
  silenciosamente o significado das linhas já gravadas. Como string, o dado continua legível em
  consulta ad hoc e resistente a refatoração.
- **Identificadores por extenso**, sem abreviação, sigla ou diminutivo — `data_de_vencimento`, não
  `dt_venc`. O nome da coluna é lido por gente que não tem o código aberto ao lado.

### Evolução de schema

- Migrations do EF Core são a única fonte de mudança estrutural. Alteração aplicada à mão em qualquer
  ambiente não existe: some no próximo deploy limpo.
- Migration é revisada como código. O SQL gerado se lê antes do merge, especialmente em operação que
  reescreve tabela grande ou solta lock longo.

### Stored procedure

Procedure é ferramenta de exceção, adotada quando há motivo concreto — não porque "banco é mais
rápido". Casos que a justificam:

| Situação | Por quê |
|---|---|
| Processamento em lote sobre volume alto | Trafegar milhares de linhas para a aplicação e devolvê-las é o gargalo; a operação de conjunto é ordens de grandeza melhor |
| Operação que exige atomicidade fora do escopo de um agregado | Consistência entre muitas linhas com controle transacional explícito |
| Rotina de manutenção e expurgo | Roda por agendamento, sem aplicação no caminho |

Não justificam procedure: CRUD comum, consulta de tela, validação de regra de negócio. **Regra de
negócio não migra para o banco** — ela é invariante de agregado no `Core` (ADR-001), e duplicá-la em
PL/pgSQL cria duas verdades que divergem na primeira alteração.

Quando existir, a procedure segue as regras de nomenclatura, transação, segurança e versionamento já
documentadas nas skills do `pgproc-agent`, e é chamada a partir de `Data` — nunca de `Web`.

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| SQL Server | Custo de licença relevante para SaaS, e nenhum recurso decisivo que o PostgreSQL não ofereça. Ecossistema .NET não depende mais dele |
| MySQL / MariaDB | Tipagem e recursos analíticos mais pobres; sem JSONB, índice parcial ou de expressão no mesmo nível |
| Banco de documentos (MongoDB e similares) | O domínio é relacional e cheio de invariante entre entidades. Abrir mão de chave estrangeira e transação multi-documento para depois reimplementá-las na aplicação é troca ruim |
| Dapper puro, sem ORM | Ganha controle de query, perde change tracking, migrations e refatoração segura. Renomear propriedade deixa de ser erro de compilação e vira erro em produção. O gargalo do produto é evolução de schema, não microssegundos de query |
| EF Core apenas para leitura, escrita em procedure | Divide a verdade do schema em dois lugares e força o domínio a conhecer a assinatura da procedure |
| Toda a lógica em stored procedure | Lógica no banco não é testável em unidade, não é versionada com o mesmo rigor, não sobe com o deploy da aplicação e viola diretamente o ADR-001 |
| Sem migrations, schema versionado em `.sql` manual | Sem ordem garantida nem estado conhecido por ambiente, a divergência entre desenvolvimento, homologação e produção é questão de tempo |

## Consequências

**Positivas**

- Uma única fonte de verdade do schema — as migrations — versionada junto do código que a consome.
- Refatoração segura: renomear propriedade quebra o build, não a produção.
- `Core` continua ignorando persistência, então a regra segue testável sem banco.
- Recursos do PostgreSQL (JSONB, índice parcial, índice de expressão, tipos ricos) ficam disponíveis
  quando fizerem falta, sem troca de plataforma.
- Sem custo de licença; disponível como serviço gerenciado em qualquer nuvem relevante.

**Negativas**

- EF Core esconde o SQL. Query ingênua gera N+1 ou varredura sequencial sem aviso — exige leitura de
  plano quando o volume cresce.
- Migration mal revisada trava tabela em produção. O risco não some por ser gerada por ferramenta.
- Manter duas formas de acesso (EF Core e procedure) exige disciplina para que a exceção não vire
  hábito.
- Enum como string ocupa mais que o ordinal e obriga a tratar valor legado ao renomear membro. Custo
  aceito de propósito, em troca de legibilidade e segurança na refatoração.

**Passa a ser obrigatório**

- Nenhum acesso a dados fora de `Data`; `Controller` nunca toca `DbContext`.
- Mapeamento em `IEntityTypeConfiguration<T>`, um arquivo por entidade.
- `HasConversion<string>()` em todo enum persistido.
- Identificador PostgreSQL por extenso, sem abreviação, sigla ou diminutivo.
- Toda alteração de schema entra por migration revisada; nada aplicado à mão em ambiente algum.
- Procedure nova exige justificativa registrada — e a justificativa não pode ser regra de negócio.
- Repositório retorna agregado ou tipo do domínio, nunca DTO de apresentação.
- Connection string é segredo: vive no `.env` ou no cofre do ambiente, jamais no `appsettings.json`
  versionado.

## Referências

- [AGENTS.md](../../AGENTS.md) — stack, convenções de enum e de identificador
- [ADR-001](ADR-001-use-ddd.md) — a separação de camadas que esta decisão precisa preservar
- [.ai/skills/persistencia-ef](../../.ai/skills/persistencia-ef/SKILL.md)
- [.ai/skills/nomenclatura](../../.ai/skills/nomenclatura/SKILL.md)
- [.ai/skills/escrita-procedures](../../.ai/skills/escrita-procedures/SKILL.md)
- [.ai/docs/configuracao.md](../../.ai/docs/configuracao.md) — `.env` vs `appsettings.json`
