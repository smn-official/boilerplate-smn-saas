---
name: setup-projeto
description: Parametriza este boilerplate com o nome real do projeto — substitui os marcadores <Produto> e <Modulo> em AGENTS.md, agentes e skills, e cria a solução .NET em camadas. Use uma única vez, ao iniciar um projeto novo a partir deste boilerplate, ou quando alguém perguntar como começar, como renomear o produto ou por que ainda aparece <Produto> nos caminhos.
agent: net10-agent
---

# setup-projeto — parametrização inicial

Executado **uma vez**, no início de um projeto novo. A stack deste boilerplate é fixa e opinativa
(.NET 10 em camadas, PostgreSQL, Vite, xUnit v3) — o setup **não** liga nem desliga tecnologia.
Ele só troca a identidade do projeto.

## A distinção que importa

O repositório tem dois tipos de marcador `<...>`, e confundi-los destrói as skills:

| Tipo | Marcadores | O que fazer |
|---|---|---|
| **Identidade do projeto** | `<Produto>`, `<Modulo>` | Substituir pelos nomes reais, uma vez |
| **Notação didática** | `<Entidade>`, `<Feature>`, `<schema>`, `<tabela>`, `<Contexto>`, `<coluna>`… | **Nunca substituir** |

`<Entidade>` aparece 119 vezes e significa "o agregado que você está escrevendo agora" — é parte da
linguagem das skills, não um campo a preencher. Um find-and-replace cego sobre `<...>` transformaria
as 53 skills em lixo. O script já conhece essa fronteira: sua lista de marcadores é exatamente
`Produto` e `Modulo`, e nada deve ser acrescentado a ela.

## Procedimento

**1. Colher os nomes.** Pergunte ao usuário, se ainda não souber:

- **Produto** — o nome do sistema, em PascalCase. Vira o nome da solução (`Contoso.slnx`).
- **Módulo** — o primeiro módulo/contexto, em PascalCase. Vira `Contoso.Vendas.Web`.

Ambos precisam ser PascalCase sem espaço, hífen, ponto ou acento; não podem ser iguais entre si nem
colidir com `System`, `Microsoft`, `Core`, `Data`, `Web`, `Tests`, `Program`, `Startup`. O script
valida e recusa com mensagem explícita — não tente contornar a validação.

**2. Pré-visualizar.** Sempre antes de aplicar:

```bash
node .ai/scripts/init.mjs --produto Contoso --modulo Vendas --dry-run
```

Mostra as ocorrências por arquivo sem gravar nada. Confirme com o usuário.

**3. Aplicar.**

```bash
node .ai/scripts/init.mjs --produto Contoso --modulo Vendas
```

Reescreve `AGENTS.md`, os agentes, as skills afetadas e `.ai/docs/estrutura-arquitetura.md`. Os
symlinks (`CLAUDE.md`, `GEMINI.md`, `.mcp.json`, `.claude/*`) não são seguidos nem tocados —
refletem a mudança automaticamente por serem links.

Rodar de novo é seguro: sem marcadores nem exemplos restantes, o script informa que já foi
parametrizado e não faz nada.

**A árvore de `docs/` não é descartada.** Ela nasce como template a preencher — `architecture/`,
`domain/`, `development/`, `infrastructure/`, `api/`, `decisions/` e `features/` —, e cada arquivo
já traz as seções esperadas com o critério do que escrever. Apagá-la tiraria do projeto justamente
o que ele deve completar.

Onde a regra é norma do boilerplate (direção `Web → Data → Core`, fluxo canônico, convenções de
código), o conteúdo já vem escrito por extenso, não como lacuna. O que é decisão do projeto está
marcado como tal. Os dois ADRs iniciais — [ADR-001](../../../docs/decisions/ADR-001-use-ddd.md) e
[ADR-002](../../../docs/decisions/ADR-002-database-strategy.md) — já estão aceitos e registram por
que a stack é o que é.

Cada arquivo abre com um aviso de template: remova-o conforme for preenchendo.

**4. Criar a solução.** O script imprime os comandos ao final:

```bash
dotnet new sln -n Contoso --format slnx
dotnet new classlib -o src/Contoso.Vendas/Core
dotnet new classlib -o src/Contoso.Vendas/Data
dotnet new mvc      -o src/Contoso.Vendas.Web
```

Os projetos criados aqui **herdam automaticamente** o `Directory.Build.props` da raiz —
`TargetFramework`, `Nullable`, `TreatWarningsAsErrors`, `EnforceCodeStyleInBuild` e os analisadores
já valem sem nenhuma linha a mais. Não repita essas propriedades nos `.csproj`: duplicá-las cria
dois lugares para mudar e o `.csproj` acaba silenciosamente afrouxando o que a raiz aperta.

A partir daqui, a estrutura de pastas e as referências entre projetos são responsabilidade da skill
[`arquitetura-camadas`](../arquitetura-camadas/SKILL.md) — carregue-a para montar as camadas
respeitando `Web → Data → Core`. Não crie pastas vazias antecipadamente: elas nascem com o primeiro
artefato real.

**5. Indexar o código com o CodeGraph.** Com a solução criada, instale a CLI e construa o índice na
raiz do repositório:

```bash
codegraph --version   # se não existir, instale — ver codegraph-instalacao
codegraph init
codegraph status
```

O `.mcp.json` deste repositório já declara o servidor `codegraph`; reinicie a sessão e confirme com
`/mcp`. A partir daí, `codegraph explore` responde "como isso funciona" e "onde fica X" numa única
chamada, no lugar do laço `grep` → `Read` — bem mais barato em contexto.

> **Esta etapa vem depois da 4, não antes.** Indexar um boilerplate ainda sem código gera um grafo
> quase vazio, e o agente que confia nele conclui que "não existe" o que apenas não foi indexado.
> Se o `init` já tiver rodado cedo demais, corrija com `codegraph index --force`.

O passo a passo completo — instalação por sistema, registro do MCP, `.gitignore` e diagnóstico —
está em [`codegraph-instalacao`](../codegraph-instalacao/SKILL.md).

## Depois do setup

Remova esta skill e `.ai/scripts/init.mjs` do projeto gerado — servem ao boilerplate, não ao produto.
Mantenha-os apenas se este repositório continuar sendo o boilerplate.

O `.ai/scripts/verificar.mjs` é o caso oposto: se o projeto derivado mantiver a estrutura `.ai/`, ele
**fica**. Enquanto houver agentes e skills, ele continua conferindo contagens, links, frontmatter e
registro — agora sobre a documentação do produto, que envelhece pelos mesmos motivos.

## Se alguém pedir para escolher tecnologias

Este boilerplate não é um menu. A stack está declarada no [AGENTS.md](../../../AGENTS.md) e sustentada
pelos 9 agentes e 53 skills; desligar uma tecnologia exigiria podar agentes e skills e regenerar a
documentação, e skill sobrevivente desatualizada passa a orientar contra o padrão vigente — pior do
que não ter agente. Se a mudança de stack for real, ela é uma decisão de arquitetura: atualize
`AGENTS.md`, `.ai/docs/estrutura-arquitetura.md` e as skills afetadas na mesma entrega.
