# Servidores MCP

Configuração em [../mcp/servers.json](../mcp/servers.json), exposta na raiz como `.mcp.json` por
symlink. O Claude Code lê na inicialização e pede aprovação na primeira vez que vê um servidor de
projeto — reinicie a sessão após alterar, e confira com `/mcp`.

## O critério

MCP compete com contexto: cada servidor carrega o schema de todas as suas ferramentas em **toda**
sessão, usadas ou não. Vale quando dá capacidade que o Claude Code não tem — não quando embrulha o
que o `Bash` já faz. `dotnet`, `npm`, `git` e `psql` já rodam por shell; MCP em volta deles seria só
indireção.

## Configurados

| Servidor | Serve a | Credencial |
|---|---|---|
| `playwright` | Testes de UI, ver a tela renderizada | — |
| `context7` | Docs atualizadas de .NET 10, EF Core 10, Tailwind 4 | — |
| `postgres` | `pgproc-agent` e suas 9 skills | `POSTGRES_CONNECTION_STRING` |

### playwright

Dirige um navegador real. Complementa a skill [`testes-ui`](../skills/testes-ui/SKILL.md), que hoje
valida HTML com HtmlAgilityPack — asserção sobre markup não pega layout quebrado nem overflow
horizontal, e é justamente isso que
[`acessibilidade-responsivo`](../skills/acessibilidade-responsivo/SKILL.md) exige verificar.

Também é o jeito de conferir ilustração renderizada de verdade, como manda
[`ilustracao-svg`](../skills/ilustracao-svg/SKILL.md) — ordem de pintura errada em SVG não aparece
em revisão de código, só na imagem.

Os binários dos navegadores são download à parte:

```bash
npx playwright install chromium
```

#### Saída só em `.playwright-mcp/`

Por padrão o servidor grava screenshot, trace, PDF e download **na raiz do projeto**, misturando
artefato descartável com código versionado. O [`servers.json`](../mcp/servers.json) impede isso:

```json
"args": ["-y", "@playwright/mcp@latest", "--output-dir", ".playwright-mcp"]
```

A pasta é ignorada pelo git — ver [gitignore.md](gitignore.md). Duas consequências práticas:

- **Nunca passe caminho absoluto nem `../` ao tirar screenshot ou salvar PDF.** Use só o nome do
  arquivo (`home-mobile.png`); o servidor resolve dentro de `.playwright-mcp/`. Caminho para fora
  derruba a garantia.
- **Se aparecer imagem ou `.zip` de trace solto na raiz**, o `--output-dir` não está valendo — a
  sessão foi iniciada antes da mudança no `servers.json`, ou o servidor está configurado em escopo
  de usuário e sobrepõe o do projeto. Reinicie a sessão e confira com `/mcp`.

Screenshot serve para **inspecionar** durante o trabalho, não vira evidência versionada. O que
prova comportamento é teste automatizado, conforme [`testes-ui`](../skills/testes-ui/SKILL.md).

### context7

Documentação sob demanda. Existe por um motivo específico deste stack: .NET 10, EF Core 10 e
Tailwind 4 são recentes, e **Tailwind 4 mudou o modelo de configuração inteiro** — tokens em
`@theme` no CSS, sem `tailwind.config.js`. Um modelo que regride para a sintaxe v3 contradiz
[`tailwind-design`](../skills/tailwind-design/SKILL.md) e gera código que não funciona.

### postgres

O encaixe mais forte do repositório. O [`pgproc-agent`](../agents/pgproc-agent.md) escreve procedures
às cegas sem ele: não valida sintaxe, não confere assinatura, não lê plano de execução. Destrava:

| Skill | O que passa a ser possível |
|---|---|
| [`performance-sql`](../skills/performance-sql/SKILL.md) | `EXPLAIN ANALYZE` de verdade, em vez de suposição sobre índice |
| [`testes-procedures`](../skills/testes-procedures/SKILL.md) | Executar a procedure e verificar efeito real |
| [`nomenclatura`](../skills/nomenclatura/SKILL.md) | Conferir identificadores contra o schema existente |
| [`escrita-procedures`](../skills/escrita-procedures/SKILL.md) | Validar que compila antes de entregar |

**Connection string por variável de ambiente**, nunca no arquivo — `servers.json` é versionado, e
credencial em repositório é o cenário que
[`segredos-configuracao`](../skills/segredos-configuracao/SKILL.md) trata como incidente. O mesmo
arquivo serve a banco local, container ou servidor: muda a variável, não a configuração.

```bash
# Docker / local
export POSTGRES_CONNECTION_STRING="postgresql://usuario:senha@localhost:5432/banco"

# Servidor
export POSTGRES_CONNECTION_STRING="postgresql://usuario:senha@host:5432/banco?sslmode=require"
```

Ponha o `export` no seu `~/.zshrc` ou num `.env` **fora do git**. Sem a variável, o servidor sobe e
falha ao conectar — os outros dois continuam funcionando normalmente.

## Duas ressalvas sobre o servidor postgres

**Licença AGPL-3.0.** `@henkey/postgres-mcp-server` é AGPL, licença viral que várias empresas
proíbem. Ele é uma ferramenta de desenvolvimento, executada por `npx` — não é distribuída junto com
o seu produto nem linkada ao código dele, então o cenário de contaminação é remoto. Ainda assim, se
sua política jurídica for restritiva, verifique antes de adotar. Alternativa MIT: `postgres-mcp`
(llm-graph), com menos recursos e sem atualização desde abr/2025.

O servidor "oficial" `@modelcontextprotocol/server-postgres` está **deprecado** e não deve ser usado,
apesar de ainda aparecer na maioria dos tutoriais.

**17 ferramentas em contexto.** É o servidor mais pesado dos três. Se você trabalhar semanas sem
tocar em procedure, vale comentar a entrada e reativar quando voltar ao banco — o custo é pago em
toda sessão, o benefício só nas sessões de SQL.

## Privilégio mínimo

O usuário da connection string deve ter **apenas o que a tarefa exige**. Em desenvolvimento, leitura
de schema e execução das procedures do projeto bastam; `SUPERUSER` não. A regra é a de
[`autenticacao-autorizacao`](../skills/autenticacao-autorizacao/SKILL.md), e vale igual para
ferramenta de IA: um agente com credencial ampla erra com alcance amplo.

**Nunca aponte para produção.** Banco de desenvolvimento ou cópia anonimizada — apontar IA para base
com dado pessoal real é tratamento sem base legal, o que
[`principios-lgpd`](../skills/principios-lgpd/SKILL.md) veda.

## Diagnóstico

| Sintoma | Causa provável | Verificação |
|---|---|---|
| Servidor não aparece em `/mcp` | Sessão não reiniciada | `.mcp.json` só é lido na inicialização |
| Aparece, mas falha ao conectar | Servidor não aprovado | Servidor de projeto pede aprovação na primeira vez |
| `postgres` conecta e erra toda query | `POSTGRES_CONNECTION_STRING` ausente ou errada | `echo $POSTGRES_CONNECTION_STRING` no mesmo shell |
| Variável definida e ainda falha | Exportada em outro shell | O `export` precisa valer para o processo do Claude Code |
| `playwright` abre e não navega | Browsers não instalados | `npx playwright install chromium` |
| Screenshot ou trace aparece na raiz | Sessão iniciada antes do `--output-dir`, ou servidor de usuário sobrepondo o do projeto | `git status` deve estar limpo depois de navegar; `/mcp` mostra o escopo |
| Tudo lento ao iniciar | `npx` baixando o pacote | Normal na primeira vez; depois vem do cache |
| Sessão com pouco contexto livre | Muitos servidores ativos | Comentar o que não estiver em uso |

Para inspecionar o estado, use `/mcp` numa sessão interativa — ele lista servidor, status e
ferramentas expostas.

## Adicionar um servidor

1. Acrescente a entrada em [../mcp/servers.json](../mcp/servers.json).
2. Credencial **sempre** por variável de ambiente, nunca literal no arquivo.
3. Registre aqui: o que serve, qual skill se beneficia, qual credencial precisa.
4. Reinicie a sessão e aprove o servidor; confira com `/mcp`.

Antes de adicionar, pergunte se o `Bash` já resolve. Se resolver, não adicione.
