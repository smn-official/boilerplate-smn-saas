---
name: recuperacao-git
description: Recuperação de estado no Git — reflog como rede de segurança, revert versus reset, recuperar commit perdido, desfazer merge, stash e a proibição de force push em branch compartilhada. Use ao desfazer uma operação, recuperar trabalho aparentemente perdido ou avaliar o risco de um comando destrutivo.
agent: github-agent
---

# Recuperação no Git

## Regra zero aplicada

Toda operação desta skill que **altera** o repositório exige instrução explícita e direta do usuário
para aquela operação específica: `reset`, `checkout`/`restore` de arquivo, `clean`, `push --force`,
exclusão de branch ou tag. Leituras — `status`, `log`, `reflog`, `show`, `diff`, `stash list` — são
sempre permitidas.

O agente prepara o comando, explica **o que ele apaga** e **como recuperar**, e aguarda o pedido.

## Antes de qualquer operação destrutiva

```bash
git status
git log --oneline -10
git log --oneline --graph --all -20
```

Sem exceção. É preciso saber: há trabalho não commitado? Onde `HEAD` está? A branch é compartilhada?
Operação destrutiva sobre estado não verificado é a principal causa de trabalho perdido.

## reflog — a rede de segurança

O `reflog` registra todo movimento de `HEAD` local, inclusive os que "sumiram" do `log`. Enquanto o
commit existir no reflog (semanas, por padrão), o trabalho é recuperável.

```bash
git reflog
git reflog show <branch>
```

```text
a1b2c3d HEAD@{0}: reset: moving to HEAD~3
e4f5g6h HEAD@{1}: commit: feat: <escopo>
```

Recuperar:

```bash
git show e4f5g6h                                  # confirme que é o commit certo
git switch -c recuperacao/<escopo> e4f5g6h        # branch nova: não destrói nada
```

Sempre recupere em **branch nova**. Fazer `reset` de volta é outra operação destrutiva sobre um estado
que você acabou de descobrir.

Limites do reflog: é **local**, não cobre alteração nunca commitada (`clean`, `checkout` de arquivo
com mudanças no working tree) e expira.

## revert versus reset

| | `git revert` | `git reset` |
|---|---|---|
| Efeito | Cria commit novo que desfaz o anterior | Move `HEAD` para trás |
| Histórico | Preservado | Reescrito |
| Branch compartilhada | **Seguro** | **Proibido** |
| Recuperação | Trivial: reverta o revert | Depende do reflog |

**Regra:** commit já publicado se desfaz com `revert`. `reset` só em branch local nunca enviada.

```bash
git revert <sha>
git revert --no-commit <sha1>..<sha2>    # vários commits em um só
```

Modos de `reset`, do menos ao mais destrutivo:

| Modo | Histórico | Índice | Working tree | Risco |
|---|---|---|---|---|
| `--soft` | Move | Preserva | Preserva | Baixo |
| `--mixed` (padrão) | Move | Limpa | Preserva | Médio |
| `--hard` | Move | Limpa | **Descarta** | **Alto — perda real** |

`reset --hard` descarta alteração não commitada de forma que o reflog **não** recupera. Nunca o
apresente sem explicitar isso.

## Desfazer merge

Merge não publicado, em branch local:

```bash
git reset --hard ORIG_HEAD          # destrutivo — exige pedido explícito
```

Merge já publicado — a única opção correta:

```bash
git revert -m 1 <sha-do-merge>
```

`-m 1` indica que o pai a preservar é o primeiro (a branch de destino). Consequência importante: para
reintegrar a branch depois, é preciso reverter o revert — o Git considera aquele merge já realizado.

## Recuperar commit perdido

1. `git reflog` — encontre o SHA.
2. `git show <sha>` — confirme o conteúdo.
3. `git switch -c recuperacao/<escopo> <sha>` — branch nova.
4. Se só um arquivo interessa: `git restore --source=<sha> -- <caminho>`.

Commit fora do reflog (repositório clonado de novo, por exemplo):

```bash
git fsck --lost-found
```

## stash

Guarda trabalho não commitado para trocar de contexto sem commit incompleto:

```bash
git stash push -m "<descrição>"
git stash list
git stash show -p stash@{0}
git stash pop            # aplica e remove da pilha
git stash apply          # aplica e mantém na pilha
```

| Regra | Motivo |
|---|---|
| Sempre com `-m` descritivo | `WIP on branch` não diz nada uma semana depois |
| `apply` antes de `pop` em caso duvidoso | `pop` remove da pilha mesmo com conflito |
| `git stash push -u` para incluir não rastreados | Arquivo novo fica de fora por padrão |
| Não use como armazenamento de longo prazo | Stash não é backup; prefira branch |

`git stash drop` e `git stash clear` são destrutivos: a entrada some da pilha, e recuperá-la exige
`fsck`. Exigem pedido explícito.

## Force push

**Nunca** em branch compartilhada. Reescrever histórico que outra pessoa já baixou quebra a cópia
dela e pode apagar trabalho publicado.

Se for **absolutamente** necessário, em branch pessoal e com o usuário ciente:

```bash
git push --force-with-lease origin <branch>
```

`--force-with-lease` recusa o envio se o remoto avançou desde o último `fetch` — ou seja, se alguém
mais publicou. `--force` puro sobrescreve sem verificar e não deve ser usado.

Antes: `git fetch origin && git log --oneline origin/<branch>..<branch>` para ver exatamente o que
seria descartado.

## Tabela de decisão

| Situação | Comando | Destrutivo |
|---|---|---|
| Desfazer commit publicado | `git revert <sha>` | Não |
| Desfazer commit local não publicado | `git reset --soft HEAD~1` | Baixo |
| Descartar alteração no working tree | `git restore <caminho>` | **Sim, sem reflog** |
| Descartar tudo até um commit | `git reset --hard <sha>` | **Sim** |
| Guardar trabalho temporariamente | `git stash push -m "<descrição>"` | Não |
| Recuperar commit sumido | `git reflog` + `git switch -c` | Não |
| Desfazer merge publicado | `git revert -m 1 <sha>` | Não |
| Remover arquivos não rastreados | `git clean -fd` | **Sim, sem reflog** |

## Checklist

- [ ] `git status` e `git log` executados antes de qualquer operação destrutiva.
- [ ] Branch identificada como local ou compartilhada.
- [ ] Preferida a alternativa reversível (`revert`, branch nova) à destrutiva.
- [ ] Efeito e forma de recuperação explicados antes de apresentar o comando.
- [ ] Nenhum `--force` puro; se inevitável, `--force-with-lease`.
- [ ] Operação destrutiva explicitamente pedida pelo usuário.
