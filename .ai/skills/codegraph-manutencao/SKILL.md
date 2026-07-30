---
name: codegraph-manutencao
description: Manutenção do índice do CodeGraph — sync incremental, reindexação completa com index --force, leitura do status, daemon de watcher, lock preso, upgrade da CLI e remoção com uninit. Use quando a consulta devolver código que não existe mais, quando o índice parecer vazio ou defasado, após rebase ou troca de branch com muitas mudanças, ou ao atualizar a versão do CodeGraph.
agent: codegraph-agent
---

# Manutenção do índice

O watcher nativo mantém o grafo em dia sozinho na maior parte do tempo. Esta skill trata do resto:
quando ele fica para trás, quando trava, e quando é preciso reconstruir do zero.

## Diagnóstico primeiro

```bash
codegraph status
```

Leia três coisas antes de agir:

- **`Files` / `Nodes`** — compatíveis com o tamanho do projeto? `Files: 1` num repositório com
  dezenas de arquivos de código é índice que não pegou o código.
- **Linguagens detectadas** — o stack esperado aparece? Sem C#, o índice não cobre a solução .NET.
- **Backend / Journal** — confirma que o banco abriu.

Índice defasado é pior que índice ausente: ele responde com confiança sobre código que já mudou.

## Atualizar

```bash
codegraph sync             # incremental — só o que mudou desde a última indexação
codegraph index --force    # reconstrói do zero
```

`sync` é o padrão e resolve quase tudo. Vá de `index --force` quando:

- O `init` rodou antes de existir código no projeto.
- Houve rebase, merge grande ou troca de branch com muita divergência.
- O `sync` roda sem erro mas o `status` continua incoerente.
- A versão da CLI mudou e o formato do índice pode ter mudado junto.

`--quiet` reduz a saída em execução automatizada; `--verbose` mostra o ciclo dos workers quando algo
falha sem mensagem clara.

## Daemon e lock

```bash
codegraph daemon           # lista os daemons rodando; escolha um para parar
codegraph unlock           # remove lock preso que bloqueia a indexação
```

Lock preso costuma sobrar de um processo morto à força ou de uma máquina desligada no meio da
indexação. O sintoma é a indexação que nunca começa. `unlock` e depois `sync`.

Só pare o daemon com motivo — sem ele, o índice para de acompanhar as edições e volta a exigir
`sync` manual.

## Atualizar a CLI

```bash
codegraph upgrade --check    # só verifica se há versão nova
codegraph upgrade            # atualiza
```

O `upgrade` reescreve sozinho a configuração de MCP que instalações anteriores criaram. Depois de
subir versão maior, rode `codegraph status`; se algo destoar, `codegraph index --force`.

## Remover do projeto

```bash
codegraph uninit
```

Apaga `.codegraph/`. Nada de código é tocado — o índice é derivado e se reconstrói com
`codegraph init`. Ver [`codegraph-instalacao`](../codegraph-instalacao/SKILL.md).

## O que nunca fazer

- **Versionar `.codegraph/`.** É local de cada máquina e muda a cada indexação. O `.gitignore` de
  dentro da pasta já cuida disso; não force `git add -f`.
- **Copiar o índice entre máquinas.** Caminhos absolutos e estado de WAL não sobrevivem à cópia.
- **Editar `codegraph.db` na mão.** É um SQLite gerenciado pela ferramenta.
- **Confiar em índice não conferido** para afirmar que algo não existe no código.

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Consulta cita código já removido | Índice defasado | `codegraph sync` |
| `sync` roda mas `status` segue incoerente | Índice corrompido ou parcial | `codegraph index --force` |
| Indexação nunca inicia | Lock de processo morto | `codegraph unlock`, depois `sync` |
| Mudanças não aparecem mais | Daemon parado | `codegraph sync`; reinicie o watcher com `init` |
| Comportamento estranho após atualizar | Formato de índice antigo | `codegraph index --force` |
| `.codegraph/` aparecendo no `git status` | `.gitignore` interno removido | Restaure-o ou rode `uninit` + `init` |
