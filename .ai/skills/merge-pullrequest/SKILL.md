---
name: merge-pullrequest
description: Abertura e integração de pull request — descrição com problema e solução, checklist de build, testes e typecheck sem avisos, revisão do próprio diff e merge apenas com verificação verde observada (pipeline do Azure DevOps ou, sem pipeline, a validação local do AGENTS.md), preferindo merge commit. Use ao preparar, revisar ou integrar um PR.
agent: github-agent
---

# Pull request e merge

## Regra zero aplicada

Preparar a descrição e revisar o diff é sempre permitido. **Abrir o PR, fazer `push` ou integrar o
merge exige instrução explícita do usuário.** Prepare o texto e o comando, apresente e aguarde.

## Antes de abrir — checklist obrigatório

Da raiz do repositório, em qualquer shell — `--prefix` evita `cd` e roda igual em PowerShell,
bash e zsh:

```bash
npm --prefix src/<Produto>.<Modulo>.Web run typecheck
dotnet build <Produto>.slnx -c Release
dotnet test <Produto>.slnx -c Release --no-build
```

As duas variantes com troca de diretório estão em
[docs/development/commands.md](../../../docs/development/commands.md).

- [ ] `npm run typecheck` sem erros **e sem avisos**.
- [ ] `dotnet build -c Release` sem erros **e sem avisos**.
- [ ] `dotnet test -c Release --no-build` com toda a suíte verde.
- [ ] Branch atualizada em relação a `origin/main`.
- [ ] Nenhum arquivo temporário, segredo, `appsettings` local ou artefato de build no diff.
- [ ] Commits seguem o padrão — veja `padrao-commits`.

Aviso é erro: uma entrega com avisos não está pronta. Nunca declare que os comandos passaram sem
tê-los executado; se falharam, reporte a saída real.

## Revise o próprio diff antes

```bash
git diff origin/main...HEAD
git diff origin/main...HEAD --stat
```

Leia o diff inteiro como se fosse de outra pessoa. O que se procura:

| Verificar | Sinal de problema |
|---|---|
| Escopo | Alteração sem relação com o título do PR |
| Depuração | `Console.WriteLine`, `console.log`, breakpoint, código comentado |
| Segredos | Chave, token, string de conexão, credencial |
| Ruído | Reformatação em massa misturada à mudança real |
| Consistência | Convenção do repositório respeitada nos artefatos tocados |
| Testes | Comportamento novo ou corrigido sem teste correspondente |

Defeito encontrado pelo próprio autor custa uma fração do que custa encontrado na revisão.

## Descrição do PR

A descrição tem duas partes obrigatórias: **o problema** e **a solução**.

```markdown
## Problema

<O que estava errado ou faltando, e por que isso importa. Comportamento observável,
não nome de classe.>

## Solução

<O que foi feito e por que essa abordagem. Alternativa descartada, se houver.>

## Como validar

1. <passo>
2. <resultado esperado>

## Checklist

- [ ] Build sem erros e sem avisos
- [ ] Testes verdes
- [ ] Typecheck sem avisos
- [ ] Diff revisado pelo autor
```

Regras:

- Título do PR no mesmo padrão da mensagem de commit: `<tipo>: <descrição>`.
- Português brasileiro, sem ponto final no título, ~72 caracteres.
- Sem sigla de rastreamento de requisito no título; referência à tarefa vai no corpo.
- Se o PR muda a interface, descreva o comportamento em desktop **e** mobile.
- PR grande demais para revisar em uma sessão deve ser dividido, não explicado com mais texto.

## Merge

**Só com a verificação verde — e verde é o que foi observado, nunca o que se presume.**

A esteira alvo dos projetos derivados deste boilerplate é o **Azure DevOps (Azure Pipelines)**. O
portão do merge depende de o projeto já ter pipeline configurada:

| Situação do projeto | O que vale como portão |
|---|---|
| Pipeline no Azure DevOps configurada | O resultado da execução no **último commit da branch** |
| Sem pipeline ainda | A validação local do AGENTS.md — `typecheck`, `build -c Release`, `test`, sem erros e sem avisos |

O boilerplate em si não tem código de aplicação nem pipeline própria: nele o portão é sempre a
validação local. Enquanto o projeto não configurar a esteira, o portão continua sendo a validação
local — **executada de fato**, com a saída real reportada, e não um item marcado de memória.

**O agente nunca declara verde o que não verificou.** Sem execução observada — resultado da pipeline
lido ou comandos locais rodados — a resposta correta é "não verificado", não "verde". Presumir
sucesso porque não havia o que rodar é o pior desfecho: transforma ausência de verificação em
aprovação.

Vermelho não se contorna com nova tentativa nem com merge forçado: investigue a causa. Falha
intermitente é defeito da suíte e deve ser tratado, não tolerado.

Verificação verde **não autoriza o merge**. O merge é operação que altera estado e exige
confirmação explícita do usuário imediatamente antes, conforme a regra zero — o agente prepara o
comando, apresenta o resultado da verificação e aguarda.

| Estratégia | Uso |
|---|---|
| **Merge commit** | Padrão. Preserva o contexto e a sequência de commits da branch de feature |
| Squash | Só quando a branch tem commits de correção de si mesma, sem valor histórico |
| Rebase merge | Evitar: perde o agrupamento da feature no histórico |

O merge commit registra que aqueles commits formavam **uma** entrega. Essa informação é o que permite
entender, meses depois, por que uma linha existe.

Antes do merge:

- [ ] Verificação verde no **último** commit da branch, não em um anterior — pipeline do Azure
      DevOps, ou a validação local do AGENTS.md enquanto ela não existir.
- [ ] O resultado acima foi observado nesta sessão, não presumido.
- [ ] Comentários da revisão resolvidos, não apenas respondidos.
- [ ] Branch atualizada em relação ao destino.
- [ ] Destino correto na cadeia `main` → `staging` → `homolog`.
- [ ] Merge explicitamente autorizado pelo usuário.

Depois do merge, apagar a branch integrada é higiene — mas continua sendo operação destrutiva, sujeita
à regra zero.

## Se algo der errado depois do merge

Não faça `reset` em branch compartilhada. Use `git revert` do merge commit e trate o caso em
`recuperacao-git`.
