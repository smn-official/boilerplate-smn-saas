<!-- Arquivo gerado a partir do AGENTS.md da raiz. Não edite aqui. -->

> **Arquivo gerado — não edite aqui.** A fonte é o [`AGENTS.md`](../AGENTS.md) da raiz; esta é uma
> cópia com os links reescritos de `.ai/…` para `../.ai/…`, porque link relativo lido de dentro de
> `.github/` resolveria para `.github/.ai/…` e morreria. Nenhuma forma de caminho resolve dos dois
> lugares num sistema de arquivos, então a cópia é a única saída. Alterou a norma? Altere o
> `AGENTS.md` da raiz e regenere:
>
> `node .ai/scripts/regenerar-copilot.mjs`
>
> `node .ai/scripts/verificar.mjs` acusa link quebrado **e** divergência de conteúdo entre os dois.

# AGENTS.md

Fonte única da verdade para qualquer assistente de IA que trabalhe neste repositório.
`CLAUDE.md` e `GEMINI.md` são symlinks para este arquivo. `.github/copilot-instructions.md` é uma
**cópia gerada** — link relativo lido de dentro de `.github/` resolveria para `.github/.ai/…` e
morreria, então lá os caminhos são reescritos para `../`. Alterou este arquivo? Regenere a cópia; o
`verificar.mjs` acusa se as duas divergirem.

O detalhamento normativo completo está em
[.ai/docs/estrutura-arquitetura.md](../.ai/docs/estrutura-arquitetura.md). Este arquivo é o índice e
as regras que valem sempre.

## Stack

| Item | Valor |
|---|---|
| Plataforma | .NET 10 (`net10.0`), ASP.NET Core MVC + Razor |
| Banco | PostgreSQL (Npgsql), EF Core 10 |
| Front-end | TypeScript (última estável) + Tailwind CSS 4, compilados por Vite |
| Testes | xUnit v3, Moq, FluentAssertions; HtmlAgilityPack na Web |
| Observabilidade | Azure Application Insights (obrigatório) |

## Regra inviolável — direção de dependência

```text
Web ──► Data ──► Core
  └──────────────► Core
```

- `Core` não referencia **nenhum** projeto da solução. Sem EF, sem HTTP, sem Razor.
- `Data` referencia somente `Core`.
- `Web` referencia `Core` e `Data`, e faz a composição.

Toda vez que uma tarefa parecer exigir violar isso, o desenho está errado — pare e reveja.

## Responsabilidade de cada artefato

| Artefato | Responde | Nunca faz |
|---|---|---|
| Agregado | "como isso funciona?" | acessar banco, chamar API, conhecer framework |
| Service | "o que deve acontecer?" | conter regra de negócio, conhecer o ORM |
| Repository | "onde está / como persistir?" | orquestrar caso de uso, retornar DTO |
| DTO | "quais dados trafegam?" | ter comportamento de domínio |
| Controller | "quem chamou, o que responder?" | regra de negócio, tocar `DbContext` |
| ViewModel | "como a tela enxerga?" | depender de service ou repository |
| View | "como apresentar?" | decidir regra, injetar service |

Fluxo canônico: `Controller → Service → Repository → Agregado`, retornando
`Agregado → DTO → ViewModel → View`.

## Convenções que valem sempre

- **Sem comentários no código**, exceto `<summary>` XML em tipos e operações públicas.
- `CancellationToken` **sempre** como último parâmetro.
- Métodos com 3+ parâmetros relacionados recebem um DTO.
- Propriedades somente leitura em classes novas; exceção para DTO de model binding.
- Sufixo `Dto` em todo objeto de transporte, na classe e no arquivo.
- Enums persistidos convertidos para **string** (`HasConversion<string>()`).
- Early return e cláusulas de guarda em vez de `if` aninhado.
- Linhas de ~120 caracteres, trailing comma quando aplicável, newline final.
- **Idioma:** domínio e pastas no idioma do negócio; configuração e rotas HTTP em inglês
  (kebab-case).
- Nunca embutir sigla de rastreamento de requisito (`RN-*`) em mensagem, constante ou teste.
- **Mensagem de commit nunca credita IA** — sem `Co-Authored-By: Claude`, sem `Generated with`, sem
  variação, mesmo que a ferramenta insira por padrão. Co-autoria de pessoa continua válida. Regra em
  [.ai/skills/padrao-commits](../.ai/skills/padrao-commits/SKILL.md).
- Em PostgreSQL, identificadores por extenso — sem abreviação, sigla ou diminutivo.
- Configuração em `appsettings.json` (PascalCase); só segredo no `.env`. Sobrescrita .NET usa
  `Secao__Chave`; variável de ferramenta externa, `SCREAMING_SNAKE_CASE`.
- **`Directory.Build.props` e `.editorconfig` na raiz são o que torna "sem avisos" verificável** —
  o primeiro estende `TreatWarningsAsErrors`, `Nullable` e os analisadores a **todos** os projetos;
  o segundo codifica formatação e severidade, com `CA1068` (`CancellationToken` por último) como
  erro. Ambos são herdados automaticamente: não repita as propriedades em cada `.csproj` nem os
  remova do projeto derivado — sem eles a regra volta a ser prosa sem efeito.
- **Havendo `.codegraph/` na raiz, consulte o CodeGraph antes de `grep`/`find`.** `codegraph explore`
  (ou o MCP `codegraph_explore`) devolve o fonte dos símbolos relevantes e os caminhos de chamada
  numa única consulta — mais barato em contexto que o laço `grep` → `Read`. O fonte devolvido **já é
  leitura feita**: não reabra o mesmo arquivo. `grep` segue certo para string literal, comentário,
  `.cshtml`, `.css`, `.sql` e `.md`, que ficam fora do índice. Sem `.codegraph/`, não indexe por
  conta própria — é decisão do usuário. Regra em
  [.ai/skills/codegraph-consulta](../.ai/skills/codegraph-consulta/SKILL.md).
- Toda saída do Playwright (screenshot, trace, PDF, download) vai para `.playwright-mcp/`, que é
  ignorada pelo git — **nunca na raiz**. Ao tirar screenshot, passe só o nome do arquivo, jamais
  caminho absoluto ou `../`. Screenshot é inspeção descartável, não artefato de entrega.

## Git e DevOps — pergunte sempre antes de executar

**Nenhum agente executa operação de Git ou DevOps que altere estado sem perguntar ao usuário
imediatamente antes.** Vale para todos os agentes, não só o `github-agent`, e não admite exceção:
nem para operação trivial, nem reversível, nem porque algo parecido já foi autorizado antes.

Exige confirmação: `commit`, `amend`, `rebase`, `merge`, `revert`, `cherry-pick`, `push` (com ou sem
`--force`), `pull`, criar/apagar/renomear branch ou tag, `reset`, `restore`, `clean`, `stash drop`,
`git config`, abrir ou mergear PR, alterar workflow de CI, deploy, release, publicar pacote, rodar
migration em ambiente, mexer em secret ou em recurso de infraestrutura.

Não exige: leitura — `status`, `diff`, `log`, `reflog`, `show`, `branch --list`, `gh pr view`.

**A autorização é pontual e não se estende.** Autorizar o commit não autoriza o push; autorizar o
push não autoriza o merge; autorizar um commit não autoriza o próximo. "Pode organizar isso" é
pedido de proposta, não autorização. Na dúvida, pergunte — detalhe em
[.ai/agents/github-agent.md](../.ai/agents/github-agent.md).

## Ações que dependem do usuário

Parte de qualquer integração externa **só o usuário pode fazer**: criar conta, aceitar termos, gerar
chave de API, autorizar OAuth, criar recurso em painel de terceiro. Código sem essas credenciais não
roda.

Quando faltar uma delas, **não presuma que existe, não invente valor e não siga adiante**. Guie o
usuário:

- Uma etapa por vez, confirmando antes da próxima.
- Diga **onde clicar**, não só o que obter.
- **Nunca peça segredo colado no chat.** Peça para colar no `.env`. Se vier mesmo assim, avise que
  deve ser considerado comprometido e rotacionado.
- Confirme o **formato**, não o valor: "começa com `sk_test_`?" basta.
- Ao final, valide junto — um comando que prova que funcionou vale mais que suposição.

## Agentes

Nove agentes especializados em [.ai/agents/](../.ai/agents/), com 57 skills em [.ai/skills/](../.ai/skills/).

| Tarefa | Agente |
|---|---|
| Criar feature, agregado, serviço, repositório | `net10-agent` |
| Entender ou localizar código, medir impacto de mudança | `codegraph-agent` |
| Escrever ou revisar stored procedure | `pgproc-agent` |
| Alterar tela, componente, TypeScript, build de assets | `frontend-agent` |
| Escrever ou revisar teste | `tester-agent` |
| Branch, commit, merge, desfazer algo no git | `github-agent` |
| Campo novo com dado pessoal, retenção, direito do titular | `lgpd-agent` |
| Auditar implementação nova, dependência vulnerável | `security-agent` |
| Pagamento, assinatura, plano, cobrança recorrente | `stripe-agent` |

Índice da documentação de apoio: [.ai/docs/README.md](../.ai/docs/README.md).

Documentação do **produto** — visão geral, features e regras de negócio: [docs/README.md](../docs/README.md).
Ela responde "o que construir e por quê"; `.ai/docs/` responde "como construir".
Fronteiras entre agentes e ordem sugerida numa entrega: [.ai/docs/agentes.md](../.ai/docs/agentes.md).
Mapa completo de skill → agente: [.ai/docs/skills.md](../.ai/docs/skills.md).
Servidores MCP configurados e o que cada um destrava: [.ai/docs/mcp.md](../.ai/docs/mcp.md).
O que versionar e o que ignorar no git: [.ai/docs/gitignore.md](../.ai/docs/gitignore.md).
Configuração — `.env` vs `appsettings.json` e nomes de variável: [.ai/docs/configuracao.md](../.ai/docs/configuracao.md).

## Orquestração — trabalhe em equipe por padrão

**A postura padrão é delegar, não executar sozinho.** Antes de começar qualquer tarefa, a primeira
pergunta é "isso se divide?" — e não "como eu faço isso?". Fazer sequencialmente o que caberia em
três subagentes paralelos é desperdício de tempo do usuário, não zelo.

Nove agentes especializados existem exatamente para isso. Um único agente resolvendo feature de
ponta a ponta é o modo mais lento e o que menos aproveita as skills.

### O ciclo

1. **Decomponha em unidades sem sobreposição de arquivos.** A fronteira natural é a camada
   (`Core`, `Data`, `Web`) ou a feature vertical — não "back-end e front-end", que quase sempre
   colidem no mesmo `Controller`.
2. **Dispare um subagente por unidade, em paralelo** — todas as chamadas numa **única mensagem**.
   Chamadas em mensagens separadas rodam em série e desperdiçam o ganho inteiro.
3. **Cada subagente devolve:** arquivos alterados, o que testou, riscos e decisões que afetam as
   outras unidades.
4. **Sintetize e valide o conjunto** com os comandos de "Antes de entregar". A validação é sempre do
   todo, nunca da parte: dois diffs corretos isolados podem não compilar juntos.

### Divida sempre que houver

- Mais de uma camada envolvida (`Core` + `Data` + `Web` são três unidades).
- Mais de uma feature ou módulo tocado.
- Implementação + testes + documentação (o `tester-agent` não precisa esperar o código ficar pronto
  se o contrato já existe).
- Investigação ampla — vários subagentes buscando em frentes diferentes acham mais rápido que um
  varrendo tudo.
- Qualquer trabalho repetitivo sobre N itens: N subagentes, não um laço.

Na dúvida entre dividir e não dividir, **divida**. O custo de coordenar é baixo; o de serializar
sem necessidade é o tempo do usuário.

### Trabalhe sozinho apenas quando

| Situação | Por quê |
|---|---|
| Mudança em um ou dois arquivos | Coordenar custa mais do que fazer |
| Uma unidade define o contrato que a outra consome | Interface, DTO e assinatura vêm primeiro; o resto parte deles |
| A tarefa toca dado pessoal | `lgpd-agent` decide base legal **antes** de existir schema |
| Auditoria de segurança e revisão de diff | Precisam do diff **pronto**; são o passo final por definição |

Essas exceções são sobre **dependência real**, não sobre conforto. "É mais simples eu mesmo fazer"
não é uma delas.

### A regra que não se quebra

**Nunca deixe dois subagentes editarem o mesmo arquivo.** Se duas unidades precisam do mesmo arquivo,
ou a decomposição está errada, ou há dependência real — aí serialize: a segunda começa quando a
primeira entregar.

### Sequencial e paralelo se combinam

A "ordem sugerida numa entrega" de [.ai/docs/agentes.md](../.ai/docs/agentes.md) é sequencial nas
pontas e paralela no meio:

```text
lgpd-agent                          (antes, se houver dado pessoal)
      ↓
net10-agent ┐
pgproc-agent├─ em paralelo, arquivos distintos
frontend-agent ┘   (+ tester-agent, assim que o contrato existir)
      ↓
security-agent                      (precisa do diff pronto)
      ↓
github-agent                        (commit e PR)
```

## Antes de entregar

```bash
npm --prefix src/<Produto>.<Modulo>.Web run typecheck
dotnet build <Produto>.slnx -c Release
dotnet test <Produto>.slnx -c Release --no-build
```

Sem erros **e sem avisos**. Se algo falhar, reporte a saída real — nunca declare sucesso sem
verificar.

## Postura

- Não crie abstração prematura: três linhas duplicadas são melhores que um wrapper usado uma vez.
- Não introduza CQRS, MediatR ou event sourcing sem problema concreto que os justifique.
- Não adicione dependência sem justificar qual problema resolve e por que não vale implementar.
- Pastas nascem com o primeiro artefato real — não crie estrutura vazia antecipadamente.
- Ao alterar convenção, responsabilidade ou estrutura, atualize a documentação na mesma entrega.
- **Mexeu em agente, skill ou doc? Rode `node .ai/scripts/verificar.mjs` antes de entregar.** Ele
  confere contagens, links, âncoras, frontmatter, registro, tabelas de roteamento, marcadores de
  identidade e tipos usados em exemplo contra o disco. Adicionar uma skill exige tocar seis arquivos;
  o script transforma o esquecimento em erro barulhento, em vez de deixar o agente orientar contra o
  padrão vigente.
- **Contrato fundacional tem uma definição só.** `AggregateRoot<TId>`, `DomainException`,
  `ISpecification<T>` e `Specification<T>` são declarados em
  [.ai/skills/dominio-agregados](../.ai/skills/dominio-agregados/SKILL.md); `AcessoNegadoException`, em
  [.ai/skills/owasp-web](../.ai/skills/owasp-web/SKILL.md); o `SpecificationEvaluator`, em
  [.ai/skills/persistencia-ef](../.ai/skills/persistencia-ef/SKILL.md). Toda outra skill **referencia** —
  nunca redeclara, nem "só a parte que interessa". Duas declarações parciais do mesmo tipo produzem
  duas skills corretas isoladamente cujo código não compila junto, e nenhuma das duas parece errada.
- **Tipo do projeto usado em exemplo precisa estar definido em algum `.md`.** Exemplo que lança uma
  exceção inexistente ou chama um método que nenhuma classe declara faz o agente inventar a
  assinatura — e cada agente inventa uma diferente. O verificador reprova.

## Estrutura deste repositório

```text
projeto/
├── AGENTS.md                        fonte única da verdade
├── Directory.Build.props            aviso vira erro, nullable e analisadores em todo projeto
├── .editorconfig                    formatação e severidade de analisador (CA1068 = erro)
├── .gitignore                       versiona config, ignora segredo
├── .env.example                     forma esperada do .env (ignorado)
│
├── docs/                            documentação do produto (negócio)
│   ├── architecture/                visão geral, camadas, dependências, fluxo
│   ├── domain/                      glossário, regras, agregados, casos de uso
│   ├── development/                 setup, convenções, estrutura, testes, comandos
│   ├── infrastructure/              banco, auth, integrações, deploy, configuração
│   ├── api/                         convenções de rota, erros, endpoints
│   ├── decisions/                   ADRs — decisão com contexto e consequência
│   └── features/<feature>/          fluxos + rules/ (uma regra por arquivo)
├── CLAUDE.md      -> AGENTS.md      (symlink)
├── GEMINI.md      -> AGENTS.md      (symlink)
├── .github/copilot-instructions.md -> ../AGENTS.md
│
├── .ai/
│   ├── skills/      57 skills, cada uma com SKILL.md
│   ├── agents/      9 definições de agente
│   ├── mcp/         servers.json
│   ├── scripts/     init.mjs (parametrização), verificar.mjs (integridade da doc),
│   │                regenerar-copilot.mjs (cópia do AGENTS.md para o .github/)
│   └── docs/        README.md (índice), estrutura-arquitetura.md,
│                    agentes.md, skills.md,
│                    mcp.md, gitignore.md, configuracao.md
│
├── .mcp.json        -> .ai/mcp/servers.json
└── .claude/skills   -> ../.ai/skills
```
