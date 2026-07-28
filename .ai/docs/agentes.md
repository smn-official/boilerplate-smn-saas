# Agentes

Dez agentes especializados. As definições vivem em [../agents/](../agents/) e as 51 skills, num
namespace plano, em [../skills/](../skills/). A base normativa de todos é
[estrutura-arquitetura.md](estrutura-arquitetura.md) e o [AGENTS.md](../../AGENTS.md) da raiz.

| Agente | Escopo | Skills |
|---|---|---|
| `net10-agent` | .NET 10, camadas, DDD tático, EF Core | 8 |
| `pgproc-agent` | PostgreSQL — apenas stored procedures | 9 |
| `frontend-agent` | Tailwind + Vite + TypeScript sobre Razor, direção visual e verificação em navegador | 7 |
| `tela-agent` | Tela nova de ponta a ponta: direção, Razor, design system, SEO | 4 |
| `tester-agent` | xUnit v3, Moq, FluentAssertions | 5 |
| `github-agent` | Git: branches, commits, PR, recuperação | 4 |
| `lgpd-agent` | Lei 13.709/2018 aplicada ao código | 5 |
| `security-agent` | Auditoria de segurança do diff | 5 |
| `ilustracao-agent` | Ilustração flat sobre design tokens | 2 |
| `stripe-agent` | Pagamentos e assinaturas com Stripe | 6 |

## Qual agente para qual tarefa

| Tarefa | Agente |
|---|---|
| Criar feature, agregado, serviço, repositório | `net10-agent` |
| Escrever ou revisar stored procedure | `pgproc-agent` |
| Tela nova, landing, página do zero | `tela-agent` |
| Alterar tela, componente, estilo, TypeScript | `frontend-agent` |
| Escrever ou revisar teste | `tester-agent` |
| Branch, commit, merge, desfazer algo no git | `github-agent` |
| Campo novo com dado pessoal, retenção, direito do titular | `lgpd-agent` |
| Auditar implementação nova, dependência vulnerável | `security-agent` |
| Ilustração, empty state, tela com muito espaço vazio | `ilustracao-agent` |
| Pagamento, assinatura, plano, cobrança recorrente | `stripe-agent` |

## Fronteiras entre agentes

Casos em que mais de um agente parece caber:

| Situação | Quem faz | Por quê |
|---|---|---|
| Repositório que chama procedure | `net10-agent` escreve o C#, `pgproc-agent` o SQL | Cada um na sua camada |
| Decidir se a lógica é procedure ou serviço C# | `pgproc-agent` | Ele recusa e aponta o caminho certo |
| Migration que aplica um `.sql` | `pgproc-agent` escreve o SQL, `net10-agent` a migration | — |
| ViewModel e View da mesma tela | `net10-agent` (ViewModel), `tela-agent` ou `frontend-agent` (View, estilo, TS) | ViewModel é C# de apresentação |
| Tela do zero vs. ajuste em tela existente | `tela-agent` cria, `frontend-agent` altera | Criar exige direção; alterar exige respeitar a que já existe |
| Build, token, `.ts` numa tela nova | `frontend-agent` | O `tela-agent` monta a view, não mexe em pipeline |
| Teste de procedure | `pgproc-agent` | É teste de integração com banco, no escopo dele |
| Campo novo que guarda CPF | `lgpd-agent` antes, `net10-agent` depois | Base legal e finalidade vêm antes do schema |
| Log que pode conter dado pessoal | `lgpd-agent` e `security-agent` | Vazamento é dos dois escopos |
| Empty state numa tela | `ilustracao-agent` desenha o SVG, `frontend-agent` monta a tela | Arte e layout são ofícios distintos |
| Token de cor novo | `frontend-agent`; `ilustracao-agent` se for `--color-ilustracao-*` | Camadas separadas do mesmo `@theme` |
| Cobrança que guarda CPF do titular | `lgpd-agent` antes, `stripe-agent` depois | Base legal vem antes do schema |
| Webhook de pagamento | `stripe-agent` escreve, `security-agent` audita | Endpoint público sem autenticação de sessão |
| Tabela de assinatura | `stripe-agent` modela, `net10-agent` integra ao domínio | Cada um na sua fronteira |

## Ordem sugerida numa entrega

1. `lgpd-agent` — se a mudança toca dado pessoal, define finalidade e base legal **antes** do schema.
2. `net10-agent` / `pgproc-agent` / `frontend-agent` ou `tela-agent` — implementação
   (`ilustracao-agent` em paralelo, se a tela pedir arte).
3. `tester-agent` — cobertura.
4. `security-agent` — auditoria do diff pronto.
5. `github-agent` — commit e PR.

## Escopos que geram recusa

Dois agentes recusam pedidos deliberadamente, em vez de entregar algo que não compila ou que viola
a arquitetura:

- **`pgproc-agent`** faz `CREATE PROCEDURE`, corpo PL/pgSQL, `IN`/`INOUT`, controle transacional,
  versionamento `.sql` e a chamada .NET correspondente. Não faz `CREATE FUNCTION`, view, trigger,
  modelagem de tabela ou migration de schema. A distinção que ele reforça: **procedure não retorna
  valor** (`CALL`, `INOUT`) e pode controlar a própria transação; function retorna (`SELECT`) e não
  pode. Pedido de "procedure que retorna lista" é corrigido para function ou `INOUT refcursor`.
- **`net10-agent`** para diante de qualquer desenho que exija violar a direção de dependência
  `Web → Data → Core`.

## Descoberta pelas ferramentas

- **Claude Code** — o symlink `.claude/skills -> ../.ai/skills` expõe as 51 skills. Para os agentes,
  crie `.claude/agents -> ../.ai/agents` ou copie os arquivos; ambos os diretórios são planos.
- **Outras ferramentas** — leem o `AGENTS.md` da raiz pelo symlink correspondente
  (`CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`).

**Atenção a colisão de nome de skill:** `.ai/skills/` é um namespace plano e os 50 nomes são únicos
hoje. Ao adicionar uma skill, confira que o nome não repete um existente e registre o dono em
[skills.md](skills.md).

## Manutenção

Ao mudar uma convenção em [estrutura-arquitetura.md](estrutura-arquitetura.md) ou no
[AGENTS.md](../../AGENTS.md), atualize a skill correspondente na mesma entrega. Skill desatualizada
faz o agente orientar contra o padrão vigente — pior do que não ter agente.
