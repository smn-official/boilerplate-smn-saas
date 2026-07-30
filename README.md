# Boilerplate SaaS — .NET 10 + PostgreSQL

Ponto de partida para um SaaS em .NET 10, com a arquitetura, as convenções e a orientação de IA já
definidas. **Não há código de aplicação aqui** — o que existe é o contrato de como o código deve ser
escrito: 9 agentes especializados, 53 skills, documentação normativa e o script de
parametrização.

A premissa: decisão de arquitetura, convenção de nome e política de LGPD custam
mais para acertar depois do que antes. Este repositório carrega essas decisões já tomadas, escritas
num formato que tanto pessoa quanto assistente de IA conseguem seguir.

## Stack

| Item | Valor |
|---|---|
| Plataforma | .NET 10 (`net10.0`), ASP.NET Core MVC + Razor |
| Banco | PostgreSQL (Npgsql), EF Core 10 |
| Front-end | TypeScript + Tailwind CSS 4, compilados por Vite |
| Testes | xUnit v3, Moq, FluentAssertions; HtmlAgilityPack na Web |
| Observabilidade | Azure Application Insights |
| Pagamentos | Stripe (opcional, com skills próprias) |

A stack é fixa e opinativa. O setup não pergunta se você quer trocar o ORM.

## Começando

Pré-requisitos: .NET 10 SDK, Node.js 20+, PostgreSQL.

### 1. Parametrize o boilerplate

Todo o repositório usa os marcadores `<Produto>` e `<Modulo>`. O script os substitui pelos nomes
reais e remove a documentação de exemplo.

```bash
node .ai/scripts/init.mjs --produto Contoso --modulo Vendas --dry-run   # confere
node .ai/scripts/init.mjs --produto Contoso --modulo Vendas             # aplica
```

Rode uma vez só. Os outros marcadores — `<Entidade>`, `<Feature>`, `<schema>`, `<tabela>` — são
notação didática das skills e permanecem intactos de propósito.

### 2. Crie a solução

```bash
dotnet new sln -n Contoso --format slnx
dotnet new classlib -o src/Contoso.Vendas/Core
dotnet new classlib -o src/Contoso.Vendas/Data
dotnet new mvc      -o src/Contoso.Vendas.Web
```

### 3. Indexe o código com o CodeGraph

Com a solução criada, construa o índice na raiz do repositório:

```bash
codegraph --version   # se não existir, instale — ver codegraph-instalacao
codegraph init
codegraph status
```

O `.mcp.json` já declara o servidor `codegraph` — basta reiniciar a sessão para as ferramentas
aparecerem. A partir daí, `codegraph explore` responde "como isso funciona" e "onde fica X" numa
única chamada, no lugar do laço `grep` → `Read` — bem mais barato em contexto.

Esta etapa vem **depois** de criar a solução: indexar um repositório ainda sem código gera um grafo
vazio, e o agente que confia nele conclui que "não existe" o que apenas não foi indexado. Se o
`init` rodou cedo demais, corrija com `codegraph index --force`. A pasta `.codegraph/` é derivada e
local — fica fora do git.

### 4. Configure o ambiente

```bash
cp .env.example .env
```

Preencha `ConnectionStrings__Default`, `ApplicationInsights__ConnectionString` e, se houver
cobrança, as chaves do Stripe. O `.env` guarda **segredo e o que varia por máquina**; configuração
de aplicação vai no `appsettings.json` versionado — o critério está em
[.ai/docs/configuracao.md](.ai/docs/configuracao.md).

## Arquitetura

```text
Web ──► Data ──► Core
  └──────────────► Core
```

`Core` não referencia nenhum projeto da solução — sem EF, sem HTTP, sem Razor. `Data` referencia só
`Core`. `Web` referencia ambos e faz a composição.

Fluxo canônico: `Controller → Service → Repository → Agregado`, retornando
`Agregado → DTO → ViewModel → View`.

| Artefato | Responde | Nunca faz |
|---|---|---|
| Agregado | "como isso funciona?" | acessar banco, chamar API, conhecer framework |
| Service | "o que deve acontecer?" | conter regra de negócio, conhecer o ORM |
| Repository | "onde está / como persistir?" | orquestrar caso de uso, retornar DTO |
| Controller | "quem chamou, o que responder?" | regra de negócio, tocar `DbContext` |
| View | "como apresentar?" | decidir regra, injetar service |

A referência normativa completa está em
[.ai/docs/estrutura-arquitetura.md](.ai/docs/estrutura-arquitetura.md).

## Estrutura

```text
.
├── AGENTS.md              fonte única da verdade das convenções
├── CLAUDE.md              -> AGENTS.md (symlink)
├── GEMINI.md              -> AGENTS.md (symlink)
├── .github/copilot-instructions.md -> ../AGENTS.md
├── .mcp.json              -> .ai/mcp/servers.json
├── .env.example           forma esperada do .env
├── Directory.Build.props  aviso vira erro, nullable e analisadores em todo projeto
├── .editorconfig          formatação e severidade de analisador (CA1068 = erro)
│
├── docs/                  documentação do PRODUTO — o que construir e por quê
│   ├── architecture/      visão geral, camadas, dependências, fluxo, diagramas
│   ├── domain/            glossário, regras de negócio, agregados, casos de uso
│   ├── development/       setup, convenções, estrutura, testes, comandos
│   ├── infrastructure/    banco, autenticação, integrações, deploy, configuração
│   ├── api/               convenções de rota, catálogo de erros, endpoints
│   ├── decisions/         ADRs — decisão com contexto e consequência
│   └── features/          fluxos + rules/ (uma regra de negócio por arquivo)
│
└── .ai/                   documentação da CONSTRUÇÃO — como construir
    ├── agents/            9 definições de agente
    ├── skills/            53 skills, cada uma com SKILL.md
    ├── docs/              arquitetura, agentes, skills, MCP, configuração
    ├── mcp/servers.json   codegraph, playwright, context7, postgres
    └── scripts/           init.mjs (parametrização), verificar.mjs (integridade)
```

`docs/` responde "o que construir e por quê"; `.ai/docs/` responde "como construir". Elas mudam em
ritmos diferentes — misturá-las faz a de negócio envelhecer junto com o código.

## Agentes

| Tarefa | Agente |
|---|---|
| Entender ou localizar código, medir impacto de mudança | `codegraph-agent` |
| Criar feature, agregado, serviço, repositório | `net10-agent` |
| Escrever ou revisar stored procedure | `pgproc-agent` |
| Alterar tela, componente, TypeScript, build de assets | `frontend-agent` |
| Escrever ou revisar teste | `tester-agent` |
| Branch, commit, merge, desfazer algo no git | `github-agent` |
| Campo novo com dado pessoal, retenção, direito do titular | `lgpd-agent` |
| Auditar implementação, dependência vulnerável | `security-agent` |
| Pagamento, assinatura, plano, cobrança recorrente | `stripe-agent` |

Ordem sugerida numa entrega — sequencial nas pontas, paralela no meio:

```text
lgpd-agent                          (antes, se houver dado pessoal)
      ↓
net10-agent   ┐
pgproc-agent  ├─ em paralelo, arquivos distintos
frontend-agent┘  (+ tester-agent, assim que o contrato existir)
      ↓
security-agent                      (precisa do diff pronto)
      ↓
github-agent                        (commit e PR)
```

A regra que não se quebra: **nunca dois agentes editando o mesmo arquivo**.

Fronteiras entre agentes: [.ai/docs/agentes.md](.ai/docs/agentes.md).
Mapa skill → agente: [.ai/docs/skills.md](.ai/docs/skills.md).

## Convenções principais

- Sem comentários no código, exceto `<summary>` XML em tipos e operações públicas.
- `CancellationToken` sempre como último parâmetro.
- Métodos com 3+ parâmetros relacionados recebem um DTO; sufixo `Dto` na classe e no arquivo.
- Enums persistidos convertidos para string (`HasConversion<string>()`).
- Early return e cláusulas de guarda em vez de `if` aninhado.
- Domínio e pastas no idioma do negócio; configuração e rotas HTTP em inglês (kebab-case).
- Em PostgreSQL, identificadores por extenso — sem abreviação, sigla ou diminutivo.

Boa parte delas é **verificada no build**, não só em revisão: o `Directory.Build.props` estende
`TreatWarningsAsErrors`, `Nullable` e os analisadores a todos os projetos, e o `.editorconfig` define
formatação e severidade — `CA1068`, o `CancellationToken` por último, é erro.

O conjunto normativo vive em [AGENTS.md](AGENTS.md).

## MCP

Quatro servidores em [.ai/mcp/servers.json](.ai/mcp/servers.json), versionado:

| Servidor | Destrava |
|---|---|
| `codegraph` | consultar o grafo do código — símbolos, fonte e caminhos de chamada |
| `playwright` | navegar e inspecionar a aplicação rodando |
| `context7` | documentação atualizada de biblioteca |
| `postgres` | consultar o schema e os dados de desenvolvimento |

O postgres lê `POSTGRES_CONNECTION_STRING` do `.env` — **sempre banco de desenvolvimento ou cópia
anonimizada, nunca produção**. Detalhes e ressalvas em [.ai/docs/mcp.md](.ai/docs/mcp.md).

Saída do Playwright (screenshot, trace, PDF) vai para `.playwright-mcp/`, ignorada pelo git.

## Antes de entregar

```powershell
Set-Location src/Contoso.Web
npm run typecheck
Set-Location ../..
dotnet build Contoso.slnx -c Release
dotnet test Contoso.slnx -c Release --no-build
```

Sem erros **e sem avisos**. Se algo falhar, reporte a saída real.

## Ações que só o usuário pode fazer

Criar conta, aceitar termos, gerar chave de API, autorizar OAuth, criar recurso em painel de
terceiro. Quando faltar uma credencial, o assistente não deve presumir nem inventar valor — deve
guiar passo a passo. E segredo nunca é colado no chat: vai direto para o `.env`.

## Documentação

| Assunto | Onde |
|---|---|
| Convenções que valem sempre | [AGENTS.md](AGENTS.md) |
| Arquitetura completa | [.ai/docs/estrutura-arquitetura.md](.ai/docs/estrutura-arquitetura.md) |
| Índice da documentação de apoio | [.ai/docs/README.md](.ai/docs/README.md) |
| Documentação do produto | [docs/README.md](docs/README.md) |
| O que versionar no git | [.ai/docs/gitignore.md](.ai/docs/gitignore.md) |
