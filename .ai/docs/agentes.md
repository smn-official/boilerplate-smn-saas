# Agentes

Nove agentes especializados. As definições vivem em [../agents/](../agents/) e as 59 skills, num
namespace plano, em [../skills/](../skills/). A base normativa de todos é
[estrutura-arquitetura.md](estrutura-arquitetura.md) e o [AGENTS.md](../../AGENTS.md) da raiz.

| Agente | Escopo | Skills |
|---|---|---|
| `codegraph-agent` | Grafo de código — navegação e impacto | 3 |
| `net10-agent` | .NET 10, camadas, DDD tático, EF Core | 12 |
| `pgproc-agent` | PostgreSQL — apenas stored procedures | 9 |
| `frontend-agent` | Vite + TypeScript sobre Razor, acessibilidade | 4 |
| `tester-agent` | xUnit v3, Moq, FluentAssertions | 5 |
| `github-agent` | Git: branches, commits, PR, recuperação | 4 |
| `lgpd-agent` | Lei 13.709/2018 aplicada ao código | 5 |
| `security-agent` | Auditoria de segurança do diff | 5 |
| `stripe-agent` | Pagamentos e assinaturas com Stripe | 6 |

## Qual agente para qual tarefa

| Tarefa | Agente |
|---|---|
| Entender ou localizar código, medir impacto de mudança | `codegraph-agent` |
| Criar feature, agregado, serviço, repositório | `net10-agent` |
| Escrever ou revisar stored procedure | `pgproc-agent` |
| Alterar tela, componente, TypeScript, build de assets | `frontend-agent` |
| Escrever ou revisar teste | `tester-agent` |
| Branch, commit, merge, desfazer algo no git | `github-agent` |
| Campo novo com dado pessoal, retenção, direito do titular | `lgpd-agent` |
| Auditar implementação nova, dependência vulnerável | `security-agent` |
| Pagamento, assinatura, plano, cobrança recorrente | `stripe-agent` |
| Valor novo em `appsettings.json` ou `.env`, classe de `Options` | `net10-agent` — critério em [configuracao.md](configuracao.md) |
| Enviar e-mail, worker, tarefa agendada, log e telemetria | `net10-agent` |
| Pipeline de CI, deploy, release, tag de versão | `github-agent` — a REGRA ZERO dele cobre publicação e infra |
| Atualizar dependência (subir versão de pacote) | `net10-agent` implementa; `security-agent` audita o resultado |
| "A aplicação não sobe", "esta tela dá erro 500" | `codegraph-agent` localiza; o agente da camada corrige |
| Atualizar a documentação junto com a alteração | O mesmo agente que fez a alteração — não se delega |

## Fronteiras entre agentes

Casos em que mais de um agente parece caber:

| Situação | Quem faz | Por quê |
|---|---|---|
| Investigar como um fluxo funciona | `codegraph-agent` consulta, o agente da camada implementa | Consulta não é implementação |
| Buscar string literal ou conteúdo de `.cshtml`/`.sql` | `grep` direto | Esses arquivos ficam fora do índice |
| Repositório que chama procedure | `net10-agent` escreve o C#, `pgproc-agent` o SQL | Cada um na sua camada |
| Decidir se a lógica é procedure ou serviço C# | `pgproc-agent` | Ele recusa e aponta o caminho certo |
| Migration que aplica um `.sql` | `pgproc-agent` escreve o SQL, `net10-agent` a migration | — |
| Isolamento de dados entre clientes | `net10-agent` implementa, `security-agent` audita | Schema errado vaza dado sem erro |
| Procedure que roda sob o schema do cliente | `pgproc-agent` define o `search_path`, `net10-agent` a conexão | A procedure não pode assumir o schema da sessão |
| ViewModel e View da mesma tela | `net10-agent` (ViewModel), `frontend-agent` (View, TS) | ViewModel é C# de apresentação |
| Teste de procedure | `pgproc-agent` | É teste de integração com banco, no escopo dele |
| Campo novo que guarda CPF | `lgpd-agent` antes, `net10-agent` depois | Base legal e finalidade vêm antes do schema |
| Log que pode conter dado pessoal | `lgpd-agent` e `security-agent` | Vazamento é dos dois escopos |
| Corpo de e-mail com dado do titular | `lgpd-agent` decide o que pode ir, `net10-agent` envia | E-mail sai do domínio do sistema e não volta |
| Tarefa de fundo que toca dado de cliente | `net10-agent` implementa, `security-agent` audita | Worker não tem claim: o schema precisa ser resolvido à mão |
| Cobrança que guarda CPF do titular | `lgpd-agent` antes, `stripe-agent` depois | Base legal vem antes do schema |
| Webhook de pagamento | `stripe-agent` escreve, `security-agent` audita | Endpoint público sem autenticação de sessão |
| Tabela de assinatura | `stripe-agent` modela, `net10-agent` integra ao domínio | Cada um na sua fronteira |

## Ordem sugerida numa entrega

1. `codegraph-agent` — investigação: onde o código vive, quem chama o quê, o que a mudança atinge.
2. `lgpd-agent` — se a mudança toca dado pessoal, define finalidade e base legal **antes** do schema.
3. `net10-agent` / `pgproc-agent` / `frontend-agent` — implementação.
4. `tester-agent` — cobertura.
5. `security-agent` — auditoria do diff pronto.
6. `github-agent` — commit e PR.

O passo 1 é opcional em mudança pontual, e obrigatório antes de alterar algo com muitos chamadores.

## Escopos que geram recusa

Três agentes recusam pedidos deliberadamente, em vez de entregar algo que não compila, que viola
a arquitetura ou que decide pelo usuário:

- **`pgproc-agent`** faz `CREATE PROCEDURE`, corpo PL/pgSQL, `IN`/`INOUT`, controle transacional,
  versionamento `.sql` e a chamada .NET correspondente. Não faz `CREATE FUNCTION`, view, trigger,
  modelagem de tabela ou migration de schema. A distinção que ele reforça: **procedure não retorna
  valor** (`CALL`, `INOUT`) e pode controlar a própria transação; function retorna (`SELECT`) e não
  pode. Pedido de "procedure que retorna lista" é corrigido para function ou `INOUT refcursor`.
- **`net10-agent`** para diante de qualquer desenho que exija violar a direção de dependência
  `Web → Data → Core`.
- **`codegraph-agent`** não indexa um repositório sem autorização do usuário. Sem `.codegraph/` na
  raiz, ele oferece rodar `codegraph init` e espera — criar índice é decisão de quem é dono do
  repositório, não efeito colateral de uma consulta.

## Descoberta pelas ferramentas

- **Claude Code** — os symlinks `.claude/skills -> ../.ai/skills` e `.claude/agents -> ../.ai/agents`
  já existem no repositório e expõem as 59 skills e os 9 agentes; ambos os diretórios são planos.
  **Nada a fazer, e nada a recriar** — não apague nem substitua esses links. `rm -rf .claude/agents`
  pode resolver o symlink e levar `.ai/agents/` inteiro com ele.
- **Outras ferramentas** — leem o `AGENTS.md` da raiz pelo symlink correspondente
  (`CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`).

**Atenção a colisão de nome de skill:** `.ai/skills/` é um namespace plano e os 53 nomes são únicos
hoje. Ao adicionar uma skill, confira que o nome não repete um existente e registre o dono em
[skills.md](skills.md).

## Manutenção

Ao mudar uma convenção em [estrutura-arquitetura.md](estrutura-arquitetura.md) ou no
[AGENTS.md](../../AGENTS.md), atualize a skill correspondente na mesma entrega. Skill desatualizada
faz o agente orientar contra o padrão vigente — pior do que não ter agente.
