---
name: codegraph-instalacao
description: Instalação do CodeGraph e indexação de um projeto — instalar a CLI por script ou npm, registrar o servidor MCP nos agentes, rodar `codegraph init` na raiz, confirmar o índice com `status` e manter `.codegraph/` fora do git. Use ao preparar um projeto novo a partir deste boilerplate, quando não existir `.codegraph/` na raiz, ou quando o MCP `codegraph_explore` não aparecer nas ferramentas.
agent: codegraph-agent
---

# Instalação e indexação do CodeGraph

Duas etapas independentes, nesta ordem: **instalar a CLI** (uma vez por máquina) e **indexar o
projeto** (uma vez por repositório, depois mantido em sincronia).

## 1. Instalar a CLI

Um dos três, conforme o sistema:

```bash
curl -fsSL https://raw.githubusercontent.com/colbymchenry/codegraph/main/install.sh | sh
```

```powershell
irm https://raw.githubusercontent.com/colbymchenry/codegraph/main/install.ps1 | iex
```

```bash
npm i -g @colbymchenry/codegraph
```

Os dois primeiros baixam um build autocontido — não exigem Node instalado. O caminho npm é o
fallback para qualquer sistema.

Confirme antes de seguir:

```bash
codegraph --version
```

Se o comando não for encontrado, o diretório de instalação (`~/.local/bin` no macOS/Linux) não está
no `PATH`. Corrija o `PATH` em vez de reinstalar.

## 2. Registrar o servidor MCP

```bash
codegraph install
```

O comando é interativo e pergunta o agente e o local. Para não-interativo:

```bash
codegraph install --yes            # global, detecção automática do agente
codegraph install --target claude-code --location local
```

Para só ver o JSON, sem escrever em arquivo nenhum:

```bash
codegraph install --print-config claude-code
```

Neste repositório o servidor já está declarado em [`servers.json`](../../mcp/servers.json), então o
registro global é opcional — o `.mcp.json` da raiz basta para o Claude Code. Reinicie a sessão e
confirme com `/mcp`.

## 3. Indexar o projeto

Na **raiz do repositório**:

```bash
codegraph init
```

Ele cria `.codegraph/` e constrói o índice na mesma etapa. A partir daí um watcher nativo mantém o
grafo em dia sozinho.

> **Ordem importa.** Rode o `init` **depois** de criar a solução .NET. Indexar um boilerplate ainda
> sem código produz um grafo quase vazio, e o agente que confia nele conclui que "não existe" o que
> só não foi indexado ainda.

## 4. Conferir que funcionou

```bash
codegraph status
```

A saída traz `Files`, `Nodes`, `Edges` e as linguagens detectadas. O número de arquivos precisa ser
compatível com o tamanho do projeto — `Files: 1` num repositório com dezenas de `.cs` significa que
o índice não pegou o código.

Teste uma consulta real:

```bash
codegraph explore "Program Startup composicao da raiz"
```

## 5. Manter fora do git

O `init` já escreve `.codegraph/.gitignore` ignorando o próprio conteúdo — banco, WAL, PID e log são
locais de cada máquina e mudam a cada indexação.

Não versione, não force `git add -f` e não copie `.codegraph/` entre máquinas: o índice é derivado
do código e se reconstrói com um comando. Ver [gitignore.md](../../docs/gitignore.md).

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| `codegraph: command not found` | Diretório da instalação fora do `PATH` | Ajuste o `PATH`; não reinstale |
| `codegraph_explore` ausente nas ferramentas | MCP não registrado ou sessão antiga | `codegraph install`, reinicie, confira `/mcp` |
| `Files: 0` ou `Nodes: 0` | `init` rodado antes de existir código | `codegraph index --force` depois de criar a solução |
| `init` recusa a pasta | Caminho parece raiz do sistema ou home | Rode na raiz do repositório; `--force` só se for consciente |
| Índice não acompanha as mudanças | Daemon parado | `codegraph sync`; ver `codegraph-manutencao` |
