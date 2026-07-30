# Comandos

> **Template do boilerplate.** Preencha ao implementar e remova este aviso.

Referência dos comandos do dia a dia. Os blocos marcados como **norma** são fixos pelo boilerplate;
os demais o projeto ajusta conforme a realidade da esteira.

Todos os caminhos partem da **raiz do repositório**, salvo indicação em contrário.

## Antes de entregar — norma

Os comandos do [AGENTS.md](../../AGENTS.md), nesta ordem, sempre, antes de qualquer entrega. Lá eles
aparecem na forma neutra com `npm --prefix`, que roda em qualquer shell; aqui ficam também as
variantes por shell, para quem prefere `cd` explícito.

**PowerShell (Windows):**

```powershell
Set-Location src/<Produto>.<Modulo>.Web
npm run typecheck
Set-Location ../..
dotnet build <Produto>.slnx -c Release
dotnet test <Produto>.slnx -c Release --no-build
```

**bash/zsh (macOS, Linux):** o subshell entre parênteses isola o `cd`, então o diretório de trabalho
volta sozinho ao fim da linha:

```bash
(cd src/<Produto>.<Modulo>.Web && npm run typecheck)
dotnet build <Produto>.slnx -c Release
dotnet test <Produto>.slnx -c Release --no-build
```

**Forma neutra**, idêntica nos três shells — `--prefix` dispensa a troca de diretório e é o que
convém usar em script e em documentação compartilhada:

```bash
npm --prefix src/<Produto>.<Modulo>.Web run typecheck
dotnet build <Produto>.slnx -c Release
dotnet test <Produto>.slnx -c Release --no-build
```

**Sem erros e sem avisos.** Se algo falhar, reporte a saída real — nunca declare sucesso sem
verificar.

Três detalhes que não são acidentais:

| Detalhe | Por quê |
|---|---|
| `typecheck` **antes** do build | O esbuild transpila sem verificar tipo; `tsc --noEmit` é o que reprova erro de tipo |
| `-c Release` | Debug esconde avisos que Release levanta; o que vai para produção é Release |
| `--no-build` no `test` | Garante que os testes rodam **sobre o mesmo binário** que acabou de ser validado |

**Aviso é erro.** Aviso tolerado hoje é a convenção que ninguém cobra amanhã, e o ruído que faz o
aviso realmente importante passar despercebido.

Quem faz isso valer é o [`Directory.Build.props`](../../Directory.Build.props) da raiz: ele estende
`TreatWarningsAsErrors`, `Nullable` e os analisadores a **todos** os projetos — antes disso só os de
teste tinham a propriedade ligada, justamente fora do código que vai para produção. Como
`EnforceCodeStyleInBuild` também está ligado lá, as regras do
[`.editorconfig`](../../.editorconfig) marcadas como `warning` quebram o build junto.

## Formatação — norma

O `.editorconfig` da raiz é verificável por comando, não só por plugin de IDE:

```bash
dotnet format <Produto>.slnx --verify-no-changes   # falha se houver desvio; não altera arquivo
dotnet format <Produto>.slnx                        # aplica a correção
```

`--verify-no-changes` é a forma que serve à esteira e à revisão: sai com código diferente de zero
quando algo está fora do padrão, sem tocar em nada. Use-o para **conferir**; use `dotnet format` sem
flag para **corrigir**, e revise o diff antes de commitar — a correção é mecânica e costuma pegar
arquivos que a sua alteração não tinha encostado.

## Documentação — norma

A documentação normativa deste repositório afirma coisas sobre si mesma — quantos agentes existem,
quais skills, quem é dono de qual. O script confere essas afirmações contra o disco:

```bash
node .ai/scripts/verificar.mjs               # relatório completo
node .ai/scripts/verificar.mjs --silencioso  # só a saída final
```

Ele valida as contagens de agentes e skills escritas em prosa contra o `ls` real, se todo link
markdown relativo resolve, se o frontmatter das skills (`name`, `description`, `agent`) e dos agentes
(`name`, `description`, `model`) está completo, se `agent:` aponta para um agente existente, se
`name:` bate com o diretório, se toda skill do disco está registrada em
[`skills.md`](../../.ai/docs/skills.md) — e vice-versa —, se o subtotal por agente lá bate com o
frontmatter, e se alguma referência em crase a `.ai/skills/<nome>` ou `.ai/agents/<nome>` aponta para
o que não existe.

**Sai com código 1 quando acha problema**, então serve como portão de esteira ao lado do build e dos
testes.

Ele existe porque acrescentar uma skill exige tocar seis arquivos, e o esquecimento não quebra nada
visivelmente: só faz o agente orientar contra o padrão vigente — pior que não ter documentação. Numa
única sessão de manutenção as contagens ficaram defasadas quatro vezes, e um link para uma skill
removida sobreviveu a uma limpeza inteira por estar em crase, fora do alcance de qualquer checador de
link markdown.

## Resumo

| Objetivo | Comando |
|---|---|
| Restaurar dependências .NET | `dotnet restore <Produto>.slnx` |
| Compilar | `dotnet build <Produto>.slnx -c Release` |
| Rodar todos os testes | `dotnet test <Produto>.slnx -c Release --no-build` |
| Conferir formatação | `dotnet format <Produto>.slnx --verify-no-changes` |
| Aplicar formatação | `dotnet format <Produto>.slnx` |
| Conferir a documentação | `node .ai/scripts/verificar.mjs` |
| Só testes unitários | `dotnet test <Produto>.slnx -c Release --no-build --filter "Category!=Integracao"` |
| Só testes de integração | `dotnet test <Produto>.slnx -c Release --no-build --filter "Category=Integracao"` |
| Subir a aplicação | `dotnet run --project src/<Produto>.<Modulo>.Web` |
| Checar tipos do TypeScript | `npm --prefix src/<Produto>.<Modulo>.Web run typecheck` |
| Compilar assets | `npm run build` (na pasta Web) |
| Dev server com HMR | `npm run dev` (na pasta Web) |
| Criar migration | `dotnet ef migrations add <Nome> --project … --startup-project …` |
| Aplicar migrations | `dotnet ef database update --project … --startup-project …` |
| Indexar o código | `codegraph init` |
| Atualizar o índice | `codegraph sync` |
| Consultar o código | `codegraph explore "<pergunta>"` |
| Auditar pacotes .NET | `dotnet list package --vulnerable --include-transitive` |
| Auditar pacotes npm | `npm audit` (na pasta Web) |

## .NET

```bash
dotnet restore <Produto>.slnx
dotnet build <Produto>.slnx -c Release
dotnet run --project src/<Produto>.<Modulo>.Web
```

Compilar um projeto isolado, útil ao iterar em uma camada:

```bash
dotnet build src/<Produto>.<Modulo>/Core -c Release
```

A validação, porém, é sempre **do todo**: dois diffs corretos isolados podem não compilar juntos.

Publicar para deploy:

```bash
dotnet publish src/<Produto>.<Modulo>.Web -c Release -o <saida>
```

## Testes

```bash
dotnet test <Produto>.slnx -c Release --no-build
dotnet test <Produto>.slnx -c Release --no-build --filter "Category!=Integracao"
dotnet test <Produto>.slnx -c Release --no-build --filter "Category=Integracao"
dotnet test <Produto>.slnx -c Release --no-build --filter "FullyQualifiedName~<Entidade>Tests"
```

A suíte de integração sobe banco real em container efêmero — é lenta e fica **fora do ciclo de build
local**. Detalhes em [testing.md](testing.md).

## npm — dentro de `src/<Produto>.<Modulo>.Web`

```bash
npm install         # instala dependências
npm run dev         # dev server do Vite, com HMR
npm run typecheck   # tsc --noEmit — portão de tipo
npm run build       # tsc --noEmit && vite build
```

O `.csproj` da Web amarra `npm install` e `npm run build` a targets `BeforeBuild`, então
`dotnet build` já produz os assets sem passo manual. Os comandos acima servem para iterar no
front-end sem recompilar o C# a cada alteração.

**Norma:** a checagem de tipo é separada da emissão. O esbuild dentro do Vite transpila sem verificar
tipos; `tsc --noEmit` roda antes e é o que efetivamente reprova o build.

*Registre aqui qualquer script npm que o projeto acrescentar (lint, format, teste de front-end).*

## EF Core — migrations

O `--project` aponta para onde as migrations moram (`Data`); o `--startup-project` aponta para quem
tem a configuração e o host (`Web`).

```bash
# criar
dotnet ef migrations add <NomeDaMigration> \
  --project src/<Produto>.<Modulo>/Data \
  --startup-project src/<Produto>.<Modulo>.Web

# aplicar
dotnet ef database update \
  --project src/<Produto>.<Modulo>/Data \
  --startup-project src/<Produto>.<Modulo>.Web

# remover a última, ainda não aplicada
dotnet ef migrations remove \
  --project src/<Produto>.<Modulo>/Data \
  --startup-project src/<Produto>.<Modulo>.Web

# gerar script idempotente para deploy
dotnet ef migrations script --idempotent \
  --project src/<Produto>.<Modulo>/Data \
  --startup-project src/<Produto>.<Modulo>.Web \
  --output <saida>.sql
```

Com mais de um `DbContext`, acrescente `--context <Nome>DbContext`.

**Norma:** migration existe apenas para contexto do qual o projeto é **dono**. Schema de outro
sistema é consumido, nunca migrado — sem `EnsureCreated`, sem migration. Ver
[database.md](../infrastructure/database.md).

Se `dotnet ef` não existir:

```bash
dotnet tool install --global dotnet-ef
dotnet tool update  --global dotnet-ef
```

## CodeGraph

Índice do código consultado pelos agentes. Havendo `.codegraph/` na raiz, **consulte antes de
`grep`/`find`** — uma chamada devolve o fonte dos símbolos relevantes e os caminhos de chamada, mais
barato em contexto que o laço `grep` → `Read`.

```bash
codegraph --version          # confirma a CLI instalada
codegraph init               # cria o índice (depois de a solução existir)
codegraph status             # contagem de símbolos e defasagem do índice
codegraph sync               # atualização incremental
codegraph index --force      # reindexação completa
codegraph explore "<pergunta ou nome de símbolo>"
```

Quando `explore` devolve código que não existe mais, ou vazio logo após rebase/troca de branch, o
índice está defasado: `sync` resolve o caso incremental, `index --force` o caso grave.

`grep` segue certo para string literal, comentário, `.cshtml`, `.css`, `.sql` e `.md`, que ficam fora
do índice.

## Dependências e segurança

```bash
dotnet list package --vulnerable --include-transitive
dotnet list package --outdated
```

```bash
npm audit            # na pasta Web
npm outdated
```

**Norma de versões:** fixe versões exatas em `package.json` e `.csproj` — atualização é deliberada,
nunca implícita. Vulnerabilidade em pacote transitivo se resolve com `PackageReference` fixando a
versão corrigida **e comentário no `.csproj` explicando o motivo**:

```xml
<!-- Pin transitivo: <PacoteOrigem> puxa <PacoteVulneravel> <versao> vulnerável
     (<identificador do aviso>). Fixa a versão corrigida. -->
<PackageReference Include="<PacoteVulneravel>" Version="<versao-corrigida>" />
```

Esta é a única exceção à regra de "sem comentário no código" — e ela vive no `.csproj`, não no C#.

## Git

Fluxo completo em [`fluxo-branches`](../../.ai/skills/fluxo-branches/SKILL.md).

```bash
git fetch origin
git switch -c <tipo>/<escopo-kebab-case> origin/main
```

**Norma:** branch nova nasce de `origin/main`, nunca de `staging` nem de outra feature. Commit direto
em `main` é proibido, sem exceção — inclusive correção urgente.

**Norma:** mensagem de commit **nunca credita IA** — sem `Co-Authored-By: Claude`, sem
`Generated with`, sem variação, mesmo que a ferramenta insira por padrão. Co-autoria de pessoa
continua válida. Padrão em [`padrao-commits`](../../.ai/skills/padrao-commits/SKILL.md).

## Comandos específicos deste projeto

*Registre aqui o que este projeto acrescentou — seed de dados, script de carga, geração de cliente de
API, subida de dependência local via Docker Compose, CLI de terceiro.*

| Objetivo | Comando | Quando usar |
|---|---|---|
| | | |
