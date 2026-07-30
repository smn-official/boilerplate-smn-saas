# Getting started — do clone ao app rodando

> **Template do boilerplate.** Preencha ao implementar e remova este aviso.

Este documento leva alguém que nunca viu o repositório até a aplicação respondendo no navegador.
Cada passo é **verificável**: termina com um comando cuja saída prova que o passo funcionou. Se a
verificação não bater, pare ali — seguir adiante só transfere o erro para um passo onde ele fica
mais difícil de diagnosticar.

## Pré-requisitos

Norma do boilerplate — a stack é fixa, não é menu.

| Ferramenta | Versão | Verificação | Por que é obrigatória |
|---|---|---|---|
| .NET SDK | 10.x (`net10.0`) | `dotnet --version` | Plataforma da solução inteira |
| Node.js | LTS estável mais recente | `node --version` | Roda o Vite, que compila TypeScript e Tailwind |
| PostgreSQL | 16 ou superior | `psql --version` | Banco único suportado (Npgsql + EF Core 10) |
| Git | qualquer recente | `git --version` | Histórico e fluxo de branches |
| CodeGraph CLI | última | `codegraph --version` | Índice do código consultado pelos agentes |

*Preencha aqui a versão exata adotada pelo projeto e qualquer ferramenta adicional que a equipe
tenha decidido exigir (Docker, Azure CLI, Stripe CLI).*

Docker é opcional para desenvolvimento, mas é o caminho mais curto para subir o PostgreSQL local e é
**obrigatório** para os testes de integração, que sobem banco real em container efêmero.

## 1. Clonar o repositório

```bash
git clone <url-do-repositorio>
cd <nome-do-repositorio>
```

Verificação: `git log --oneline -1` mostra o último commit.

## 2. Parametrizar o boilerplate com o nome real do projeto

*Só se aplica a um projeto novo partindo do boilerplate. Se a solução já existe em `src/`, pule para
o passo 4.*

O repositório nasce com os marcadores `<Produto>` e `<Modulo>` no lugar dos nomes reais. O script
`init.mjs` os substitui — e **apenas** eles. Marcadores didáticos das skills (`<Entidade>`,
`<Feature>`, `<schema>`) nunca são substituídos; trocá-los destrói as skills.

Sempre pré-visualize antes de aplicar:

```bash
node .ai/scripts/init.mjs --produto <Produto> --modulo <Modulo> --dry-run
```

Confira as ocorrências e só então aplique:

```bash
node .ai/scripts/init.mjs --produto <Produto> --modulo <Modulo>
```

Nomes precisam ser PascalCase, sem espaço, hífen, ponto ou acento, diferentes entre si e sem colidir
com `System`, `Microsoft`, `Core`, `Data`, `Web`, `Tests`, `Program` ou `Startup`. O script valida e
recusa — não contorne a validação.

Verificação: `grep -r "<Produto>" AGENTS.md .ai/` não retorna nada.

## 3. Criar a solução

O script imprime estes comandos ao final. A estrutura de camadas e as referências entre projetos são
responsabilidade da skill [`arquitetura-camadas`](../../.ai/skills/arquitetura-camadas/SKILL.md).

```bash
dotnet new sln -n <Produto> --format slnx
dotnet new classlib -o src/<Produto>.<Modulo>/Core
dotnet new classlib -o src/<Produto>.<Modulo>/Data
dotnet new mvc      -o src/<Produto>.<Modulo>.Web
```

Norma: **pasta nasce com o primeiro artefato real.** Não crie `Repositories/`, `Specs/` ou
`Integracoes/` vazias antecipadamente.

Verificação: `dotnet build <Produto>.slnx` compila os três projetos.

## 4. Indexar o código com o CodeGraph

Etapa 5 do [`setup-projeto`](../../.ai/skills/setup-projeto/SKILL.md), e a ordem importa.

```bash
codegraph --version   # se não existir, ver a skill codegraph-instalacao
codegraph init
codegraph status
```

> **Esta etapa vem depois da criação da solução, nunca antes.** Indexar um repositório ainda sem
> código gera um grafo quase vazio, e o agente que confia nele conclui que "não existe" o que apenas
> não foi indexado. Se o `init` rodou cedo demais, corrija com `codegraph index --force`.

O `.mcp.json` já declara o servidor `codegraph`. Reinicie a sessão do agente e confirme com `/mcp`.
A partir daí, `codegraph explore` responde "como isso funciona" e "onde fica X" em uma chamada, no
lugar do laço `grep` → `Read`.

Verificação: `codegraph status` mostra contagem de símbolos maior que zero.

## 5. Criar o `.env` a partir do `.env.example`

```bash
cp .env.example .env
```

O `.env.example` é versionado e serve de contrato: descreve a **forma** esperada, nunca um valor
real. O `.env` fica fora do git.

Norma: só entra no `.env` o que é **segredo** ou o que **varia por máquina**. Configuração de
aplicação (timeout, tamanho de página, nível de log, feature flag) vai no `appsettings.json`,
versionada. O critério completo está em [configuration.md](../infrastructure/configuration.md) e em
[.ai/docs/configuracao.md](../../.ai/docs/configuracao.md).

Preencha, no mínimo:

| Variável | O que colocar |
|---|---|
| `ConnectionStrings__Default` | Conexão do PostgreSQL local |
| `POSTGRES_CONNECTION_STRING` | Mesma base, formato URL, para o servidor MCP |
| `ASPNETCORE_ENVIRONMENT` | `Development` |
| `ApplicationInsights__ConnectionString` | Pode ficar vazio localmente — sem telemetria, a app sobe |

*Liste aqui as demais variáveis que este projeto passou a exigir, com o formato esperado de cada
uma — nunca o valor.*

Credencial de terceiro (Stripe, provedor de e-mail, OAuth) **só o usuário cria**. Não invente valor
e não siga adiante sem ela; veja [integrations.md](../infrastructure/integrations.md).

Verificação: `git status` **não** lista o `.env` como arquivo novo.

## 6. Restaurar dependências

```bash
dotnet restore <Produto>.slnx
```

```bash
cd src/<Produto>.<Modulo>.Web
npm install
cd ../..
```

O `.csproj` da Web amarra `npm install` e `npm run build` a targets `BeforeBuild`, então
`dotnet build` já produz os assets. O `npm install` manual aqui serve para separar erro de pacote
Node de erro de compilação C# na primeira execução.

Verificação: `npm run typecheck` termina sem erro.

## 7. Subir o banco

Com Docker, o caminho mais curto:

```bash
docker run --name <produto>-postgres \
  -e POSTGRES_USER=<usuario> \
  -e POSTGRES_PASSWORD=<senha> \
  -e POSTGRES_DB=<banco> \
  -p 5432:5432 -d postgres:16
```

*Substitua por `docker compose up -d` se o projeto adotar um `compose.yaml`, e documente aqui os
serviços que ele sobe.*

Verificação: `psql "$POSTGRES_CONNECTION_STRING" -c "select 1"` responde.

## 8. Aplicar as migrations

```bash
dotnet ef database update \
  --project src/<Produto>.<Modulo>/Data \
  --startup-project src/<Produto>.<Modulo>.Web
```

Norma: migrations existem **apenas** para os contextos dos quais o projeto é dono. Schema de outro
sistema é consumido, nunca migrado — ver [database.md](../infrastructure/database.md).

Verificação: a tabela `__EFMigrationsHistory` existe e lista as migrations aplicadas.

## 9. Rodar

```bash
cd src/<Produto>.<Modulo>.Web
dotnet run
```

Para desenvolvimento de front-end com HMR, deixe o dev server do Vite rodando num segundo terminal:

```bash
cd src/<Produto>.<Modulo>.Web
npm run dev
```

O TagHelper de assets aponta para o dev server em Development e para o `manifest.json` em produção —
nenhuma view conhece esse mecanismo.

Verificação: a URL impressa no console abre no navegador e a página renderiza com estilo aplicado
(estilo ausente indica assets não compilados, não erro de servidor).

## 10. Provar que o ambiente está inteiro

```powershell
Set-Location src/<Produto>.<Modulo>.Web
npm run typecheck
Set-Location ../..
dotnet build <Produto>.slnx -c Release
dotnet test <Produto>.slnx -c Release --no-build
```

Norma: **sem erros e sem avisos.** Este é o mesmo bloco de "Antes de entregar" do
[AGENTS.md](../../AGENTS.md), repetido em [commands.md](commands.md). Rodá-lo agora confirma que a
máquina está pronta antes de existir código seu para culpar.

## Problemas comuns

| Sintoma | Causa provável | Correção |
|---|---|---|
| `dotnet` não encontra `net10.0` | SDK 10 ausente ou `global.json` fixando versão antiga | Instalar o SDK 10 |
| Falha de conexão no startup | `ConnectionStrings__Default` ausente ou banco fora do ar | Conferir `.env` e o container |
| Variável do `.env` ignorada | Underscore simples em vez de `__` | Dois underscores por nível de hierarquia |
| Página sem estilo | Assets não compilados | `npm run build` ou deixar `npm run dev` ativo |
| `codegraph explore` devolve vazio | Índice criado antes do código existir | `codegraph index --force` |
| Ainda aparece `<Produto>` nos caminhos | `init.mjs` não foi executado | Passo 2 |

## Próximos passos

*Aponte aqui a primeira tarefa real de quem acabou de subir o ambiente — a feature de exemplo, o
domínio inicial, a issue de onboarding.*

| Para | Leia |
|---|---|
| Entender onde cada artefato mora | [project-structure.md](project-structure.md) |
| Escrever código dentro da convenção | [coding-standards.md](coding-standards.md) |
| Escrever ou rodar testes | [testing.md](testing.md) |
| Comandos do dia a dia | [commands.md](commands.md) |
