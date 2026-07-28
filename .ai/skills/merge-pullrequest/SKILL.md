---
name: merge-pullrequest
description: Abertura e integração de pull request — descrição com problema e solução, checklist de build, testes e typecheck sem avisos, revisão do próprio diff e merge apenas com CI verde, preferindo merge commit. Use ao preparar, revisar ou integrar um PR.
agent: github-agent
---

# Pull request e merge

## Regra zero aplicada

Preparar a descrição e revisar o diff é sempre permitido. **Abrir o PR, fazer `push` ou integrar o
merge exige instrução explícita do usuário.** Prepare o texto e o comando, apresente e aguarde.

## Antes de abrir — checklist obrigatório

```powershell
Set-Location src/<Produto>.<Modulo>.Web
npm run typecheck
Set-Location ../..
dotnet build <Produto>.slnx -c Release
dotnet test <Produto>.slnx -c Release --no-build
```

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

**Só com CI verde.** CI vermelha não se contorna com nova tentativa nem com merge forçado: investigue
a causa. CI intermitente é defeito da suíte e deve ser tratado, não tolerado.

| Estratégia | Uso |
|---|---|
| **Merge commit** | Padrão. Preserva o contexto e a sequência de commits da branch de feature |
| Squash | Só quando a branch tem commits de correção de si mesma, sem valor histórico |
| Rebase merge | Evitar: perde o agrupamento da feature no histórico |

O merge commit registra que aqueles commits formavam **uma** entrega. Essa informação é o que permite
entender, meses depois, por que uma linha existe.

Antes do merge:

- [ ] CI verde no último commit da branch, não em um anterior.
- [ ] Comentários da revisão resolvidos, não apenas respondidos.
- [ ] Branch atualizada em relação ao destino.
- [ ] Destino correto na cadeia `main` → `staging` → `homolog`.
- [ ] Merge explicitamente autorizado pelo usuário.

Depois do merge, apagar a branch integrada é higiene — mas continua sendo operação destrutiva, sujeita
à regra zero.

## Se algo der errado depois do merge

Não faça `reset` em branch compartilhada. Use `git revert` do merge commit e trate o caso em
`recuperacao-git`.
