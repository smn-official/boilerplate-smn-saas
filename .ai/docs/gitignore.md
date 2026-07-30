# O que versionar e o que ignorar

O [`.gitignore`](../../.gitignore) da raiz cobre .NET, Node/Vite, Playwright, PostgreSQL e as
ferramentas de IA. Este documento registra **por que** cada decisão, especialmente as
contraintuitivas.

## A regra

Versiona-se **configuração**; ignora-se **credencial** e **artefato derivado**.

Configuração diz *como* o projeto funciona e serve a todo mundo que clona. Credencial é o valor
secreto que só existe na máquina de cada pessoa. Artefato derivado é o que um comando regenera —
versioná-lo cria conflito e incha o histórico sem dar nada em troca.

## `.mcp.json` é versionado — e isso é proposital

Parece contraintuitivo, já que ele configura o acesso ao banco. Mas ele **não guarda credencial
nenhuma**:

```json
"env": { "POSTGRES_CONNECTION_STRING": "${POSTGRES_CONNECTION_STRING}" }
```

É uma **referência** a uma variável de ambiente, não o valor. A credencial real vive no `.env`, que é
ignorado. Ignorar o `.mcp.json` significaria que cada pessoa que clona o repositório teria de
descobrir e reconfigurar os quatro servidores MCP do zero — perdendo justamente o que faz este
boilerplate funcionar de imediato.

O mesmo vale para `.ai/` inteiro: agentes, skills e docs são configuração compartilhada. É o produto
deste repositório.

**A pergunta certa não é "esse arquivo é sensível?", e sim "esse arquivo *contém* um segredo?".** Um
arquivo que aponta para um segredo é seguro; um que o embute, não.

## Versionado

| Arquivo | Por quê |
|---|---|
| `.mcp.json` → `.ai/mcp/servers.json` | Só referencia variável de ambiente |
| `.ai/**` | Agentes, skills, docs — a configuração compartilhada |
| `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` | Fonte da verdade e seus symlinks |
| `.env.example` | Diz **quais** variáveis existem, sem valor |
| `appsettings.json` | Estrutura base, sem segredo |
| `Directory.Build.props` | Contrato de build — o que faz "sem avisos" valer para todos |
| `.editorconfig` | Convenção verificável, não preferência de editor |
| `.gitignore` | Óbvio, mas vale dizer: é ele que protege o resto |

## Ignorado

| Padrão | Por quê |
|---|---|
| `.env`, `.env.*` | Onde a credencial de fato mora |
| `appsettings.*.json` | Os de ambiente carregam connection string real |
| `*.pfx`, `*.key`, `*.pem`, `secrets.json` | Certificado e chave |
| `bin/`, `obj/`, `artifacts/` | Saída do `dotnet build` |
| `node_modules/`, `.vite/`, `dist/` | Reinstalável por `npm ci` |
| `wwwroot/dist/` | Assets gerados pelo Vite no build — derivado |
| `*.dump`, `*.backup`, `pgdata/` | **Dump pode conter dado pessoal real** |
| `playwright-report/`, `test-results/` | Saída de execução de teste |
| `.playwright-mcp/` | Screenshot e trace do MCP — inspeção descartável |
| `.claude/settings.local.json` | Preferência local de cada pessoa |
| `.DS_Store`, `.vs/`, `.idea/` | Sistema operacional e editor |

## Detalhes que costumam passar batido

**`appsettings.Development.json` é ignorado.** Muito projeto o versiona por hábito, mas ele é o lugar
onde connection string local acaba parando. Se você precisar compartilhar a *estrutura* dele, crie um
`appsettings.Development.json.example` — o `.gitignore` já abre exceção para esse nome.

**Playwright grava em `.playwright-mcp/`, e em nenhum outro lugar.** Sem configuração, o MCP do
Playwright despeja screenshot, trace, PDF e download **na raiz do projeto** — é o comportamento
padrão dele. Por isso o [`servers.json`](../mcp/servers.json) passa `--output-dir .playwright-mcp`:
não basta ignorar a sujeira, é preciso concentrá-la num lugar só. Ignorar `*.png` na raiz seria a
correção errada, porque esconderia também asset legítimo.

A pasta é ignorada porque screenshot é **inspeção**, não entrega: vale durante o trabalho e perde o
sentido no commit seguinte. Ao pedir screenshot, use só o nome do arquivo — caminho absoluto ou
`../` escapa da pasta e volta a sujar a raiz.

**Dump de banco nunca entra.** Além do tamanho, um dump de homologação frequentemente carrega dado
pessoal real. Versioná-lo é tratamento sem base legal e espalha o dado para todo clone do
repositório, inclusive os que ninguém controla. É exatamente o que
[`dados-pessoais-modelagem`](../skills/dados-pessoais-modelagem/SKILL.md) e
[`retencao-descarte`](../skills/retencao-descarte/SKILL.md) proíbem.

**`wwwroot/dist/` é derivado.** É o `outDir` declarado no `vite.config.ts`, e a skill
[`vite-build`](../skills/vite-build/SKILL.md) amarra `npm run build` ao `dotnet build`, então o
artefato é reproduzível. Versioná-lo gera conflito em todo merge, porque o hash muda a cada build.
A entrada explícita é redundante com o `dist/` genérico da lista acima — que casa em qualquer nível —
mas nomeia o caminho real, para que a regra escrita não descreva um diretório que nada gera.

**`Directory.Build.props` e `.editorconfig` são versionados — são contrato, não preferência.** O
nome do `.editorconfig` sugere ajuste de editor, e a intuição é ignorá-lo junto com `.vs/` e
`.idea/`. Mas a diferença é a mesma da regra geral: `.vs/` guarda o que *uma pessoa* prefere ver;
estes dois definem o que *o build recusa*. O `Directory.Build.props` estende `TreatWarningsAsErrors`,
`Nullable` e os analisadores a todos os projetos, e o `.editorconfig` — com
`EnforceCodeStyleInBuild` ligado — transforma formatação e severidade em verificação, com `CA1068`
(`CancellationToken` como último parâmetro) marcado como erro.

Ignorá-los quebraria o repositório de um jeito silencioso: o build continuaria passando na máquina
de quem já os tem e passaria **mais fácil** na de quem clonou, porque lá o aviso volta a ser só
aviso. O portão de "sem erros e sem avisos" do [AGENTS.md](../../AGENTS.md) só é o mesmo portão para
todo mundo porque estes dois arquivos viajam com o clone.

**Symlink é versionado como symlink.** O git guarda o caminho de destino, não uma cópia. `CLAUDE.md`,
`GEMINI.md` e `.mcp.json` continuam links depois do clone — a estrutura sobrevive.

## Se um segredo já foi commitado

Adicionar ao `.gitignore` **não resolve**: o valor continua no histórico e em todo clone existente.

A ordem correta, conforme
[`segredos-configuracao`](../skills/segredos-configuracao/SKILL.md):

1. **Rotacione o segredo primeiro.** Considere-o comprometido desde o commit. Limpar o histórico
   antes de rotacionar é ordem errada — o valor já esteve exposto.
2. Remova do rastreamento: `git rm --cached <arquivo>`.
3. Acrescente ao `.gitignore`.
4. Se já houve push, limpe o histórico (`git filter-repo` ou BFG) e avise quem tem clone — a
   reescrita muda os hashes.

## Verificar antes do primeiro commit

```bash
git add -A -n    # lista o que entraria, sem adicionar nada
```

Nenhum `.env`, `*.dump`, `*.pem` ou `appsettings.*.json` de ambiente pode aparecer. Este `.gitignore`
foi testado num repositório limpo com esses arquivos presentes: os 8 esperados entram, nenhum segredo
passa.
