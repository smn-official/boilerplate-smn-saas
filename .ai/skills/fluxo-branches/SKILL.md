---
name: fluxo-branches
description: Fluxo de branches — criação sempre a partir de main atualizada, nomenclatura <tipo>/<escopo-kebab-case>, cadeia de ambientes main → staging → homolog e proibição de commit direto em main. Use ao iniciar trabalho novo, decidir de onde partir ou para onde promover uma alteração.
agent: github-agent
---

# Fluxo de branches

## Regra zero aplicada

Criar branch local é seguro. **Apagar, renomear ou mover branch — local ou remota — exige instrução
explícita do usuário.** Trocar de branch com trabalho não commitado pode descartar alterações:
verifique `git status` antes e, se houver pendências, oriente `stash` em vez de trocar direto.

## Sempre a partir de main atualizada

```bash
git fetch origin
git switch -c <tipo>/<escopo-kebab-case> origin/main
```

O `fetch` é obrigatório: partir de uma `main` local desatualizada produz conflito artificial e um PR
cheio de commits de terceiros. Note que o comando parte de `origin/main`, não da `main` local — assim
a branch nasce do estado real do remoto mesmo que a cópia local esteja atrasada.

**Nunca** parta de outra branch de feature. Se o trabalho realmente depende de outra em andamento,
isso é sinal de que o recorte está grande demais — divida ou espere a integração.

## Nomenclatura

`<tipo>/<escopo-kebab-case>` — o tipo é o mesmo vocabulário dos commits.

| Tipo | Uso |
|---|---|
| `feat` | Funcionalidade nova (padrão observado no repositório) |
| `fix` | Correção de defeito |
| `refactor` | Reestruturação sem mudança de comportamento |
| `docs` | Documentação |
| `chore` | Manutenção, dependências, configuração |

| Bom | Ruim | Motivo |
|---|---|---|
| `feat/<escopo-kebab-case>` | `feat/Escopo Novo` | Espaço e maiúscula |
| `fix/<escopo-kebab-case>` | `correcao` | Sem tipo, sem escopo |
| `refactor/<escopo-kebab-case>` | `feat/varias-coisas` | Escopo indefinido |

Regras: minúsculas, kebab-case, sem acento, sem espaço, escopo curto e específico. O nome descreve
**o que a branch entrega**, não quem trabalhou nem o número da tarefa isoladamente.

## Cadeia de ambientes

```text
main (produção) ──► staging ──► homolog
```

| Branch | Ambiente | Regra |
|---|---|---|
| `main` | Produção | Origem de toda branch nova. **Nunca** receba commit direto |
| `staging` | Integração | Recebe merge das branches de feature |
| `homolog` | Homologação | Recebe o que está validado em staging |

Duas consequências práticas:

- Branch nova **nasce de `main`**, mesmo que vá ser integrada primeiro em `staging`. Partir de
  `staging` traz para o PR trabalho de terceiros ainda não promovido.
- Commit direto em `main` está proibido, sem exceção — inclusive correção urgente, que segue o mesmo
  fluxo por branch `fix/<escopo>` e PR.

## Ciclo de trabalho

```bash
git fetch origin
git switch -c feat/<escopo-kebab-case> origin/main

# trabalho, commits seguindo padrao-commits

git fetch origin
git rebase origin/main        # ou merge, se a branch já foi publicada e compartilhada
```

Antes de abrir o PR, atualize a branch em relação a `main` para que o revisor veja apenas o seu diff.
Rebase só é seguro enquanto a branch **não** for compartilhada; depois disso, use merge — reescrever
histórico publicado quebra a cópia de quem já partiu dele.

## Manutenção

```bash
git branch --list                      # leitura, sempre permitida
git branch -vv                         # mostra o rastreamento e o atraso em relação ao remoto
```

Apagar branch já integrada é higiene legítima, mas continua sendo operação destrutiva: prepare o
comando, explique o efeito e aguarde o pedido explícito.

```bash
git branch -d <tipo>/<escopo>          # só apaga se já integrada
git push origin --delete <tipo>/<escopo>
```

Prefira `-d` a `-D`: a recusa do `-d` é uma proteção real contra apagar trabalho não integrado.

## Checklist

- [ ] `git fetch origin` executado antes de criar a branch.
- [ ] Branch criada de `origin/main`, não de `staging` nem de outra feature.
- [ ] Nome em `<tipo>/<escopo-kebab-case>`, minúsculo, sem acento.
- [ ] Nenhum commit direto em `main`.
- [ ] Branch atualizada em relação a `main` antes de abrir o PR.
- [ ] Nenhuma exclusão de branch sem pedido explícito do usuário.
