---
name: padrao-commits
description: Conventional Commits em português brasileiro — tipos permitidos, descrição no imperativo com ~72 caracteres, corpo que explica o porquê e granularidade por intenção. Use ao redigir mensagem de commit, revisar histórico ou dividir um trabalho em commits.
agent: github-agent
---

# Padrão de commits

## Regra zero aplicada

Redigir a mensagem é sempre permitido. **Criar o commit, fazer `amend` ou `push` exige instrução
explícita do usuário.** Prepare a linha completa, apresente-a e aguarde o pedido.

## Formato

```text
<tipo>: <descrição>

<corpo opcional — explica o porquê>
```

Conventional Commits, com a **descrição em português brasileiro**. O tipo permanece em inglês; é
vocabulário técnico da convenção.

| Elemento | Regra |
|---|---|
| Tipo | Minúsculo, da tabela abaixo, seguido de `: ` |
| Descrição | Minúscula após o tipo, imperativo/afirmativo, **sem ponto final** |
| Primeira linha | ~72 caracteres, nunca ultrapassar de forma relevante |
| Linha em branco | Obrigatória entre descrição e corpo |
| Corpo | Explica o **porquê**; o diff já mostra o quê |

## Tipos

| Tipo | Uso |
|---|---|
| `feat` | Funcionalidade nova ou comportamento novo visível ao usuário |
| `fix` | Correção de defeito |
| `refactor` | Reestruturação interna sem mudança de comportamento |
| `docs` | Documentação |
| `test` | Testes: adição, correção ou reorganização |
| `chore` | Manutenção geral, dependências, configuração de repositório |
| `style` | Formatação sem efeito de comportamento |
| `perf` | Melhoria de desempenho |
| `build` | Sistema de build, empacotamento, publicação |
| `ci` | Esteira de integração contínua |

Na dúvida entre `feat` e `refactor`: mudou o que o usuário observa? `feat`. Não mudou? `refactor`.

## Exemplos no padrão do repositório

```text
feat: exclusão (soft delete) de <entidade> no painel
fix: editar <entidade> deixa de criar duplicata ao renomear o código
feat: login por código OTP no e-mail + topbar branca sem ícones
refactor: extrai montagem da ViewModel de <Entidade> para o controller
test: cobre invariantes de <Entidade> na criação
docs: atualiza estrutura de camadas em estrutura-arquitetura
chore: atualiza dependências de build da Web
```

Observe: descrição concreta e específica, sem ponto final, acento normal do português. A descrição
diz **o que passou a valer**, não "alterações em X".

## Contraexemplos

| Ruim | Problema | Bom |
|---|---|---|
| `Feat: Ajustes` | Maiúsculas, descrição vazia | `fix: corrige validação de código de <Entidade>` |
| `fix: corrigido bug.` | Particípio e ponto final | `fix: corrige duplicidade ao renomear código` |
| `update` | Sem tipo, sem informação | `chore: atualiza dependências da Web` |
| `feat: mudanças no arquivo X` | Descreve arquivo, não intenção | `feat: exclusão (soft delete) de <entidade>` |
| `fix: RN-123` | Sigla de requisito na mensagem | `fix: impede <entidade> duplicada por código` |

Nunca embuta sigla de rastreamento de requisito (`RN-*`) na mensagem. A referência à tarefa, quando
existir, vai no rodapé ou na descrição do PR.

## Corpo

Use corpo quando a decisão não é óbvia pelo diff:

```text
fix: editar <entidade> deixa de criar duplicata ao renomear o código

A atualização buscava a entidade pelo código informado, que é justamente o campo
alterado — o registro não era encontrado e um novo era inserido. A busca passa a
usar o identificador, mantendo o código como dado editável.
```

Regras: linhas de ~72 caracteres, parágrafos curtos, foco na causa e na decisão. Não repita em prosa
o que o diff mostra linha a linha.

## Autoria — nunca creditar a IA

A mensagem **nunca** leva trailer de co-autoria de assistente de IA. Nem `Co-Authored-By: Claude`,
nem Copilot, Gemini, Cursor ou equivalente, em nenhuma forma — trailer, corpo, assinatura ou
`Generated with`.

```text
❌  Co-Authored-By: Claude <noreply@anthropic.com>
❌  🤖 Generated with Claude Code
❌  Assistido por IA
```

Vale mesmo que a ferramenta sugira ou insira o trailer por padrão: **remova antes de commitar.**
Alguns assistentes adicionam automaticamente; a ausência do trailer é responsabilidade de quem
executa o commit.

O motivo é o significado de autoria no histórico. `Co-Authored-By` atribui autoria a uma entidade
que não responde por decisão nenhuma: não revisa, não é procurada em seis meses e não assume
consequência. Quem commita assina o resultado, independentemente da ferramenta usada para chegar
nele — como não se credita o compilador nem a IDE.

**Co-autoria de pessoa continua válida** — é para isso que o trailer existe:

```text
Co-Authored-By: Ana Souza <ana.souza@exemplo.com.br>
```

## Granularidade

Divida por **intenção**, não por arquivo. Cada commit deve:

- Deixar a base em estado consistente — compila e os testes passam.
- Ser revisável isoladamente e descritível em uma frase.
- Conter **um** tipo. Se a mensagem precisa de "e", provavelmente são dois commits.

| Divida | Mantenha junto |
|---|---|
| Refatoração preparatória e a feature que ela habilita | Agregado e o teste que cobre suas invariantes |
| Correção de defeito e melhoria não relacionada | Renomeação e todas as suas referências |
| Formatação em massa e mudança de comportamento | Migration e a configuration correspondente |

## Checklist

- [ ] Tipo válido, minúsculo, seguido de `: `.
- [ ] Descrição em português brasileiro, minúscula, imperativa, sem ponto final.
- [ ] Primeira linha em ~72 caracteres.
- [ ] Linha em branco antes do corpo, quando houver corpo.
- [ ] Corpo explica o porquê, não o quê.
- [ ] Nenhuma sigla de requisito na mensagem.
- [ ] Nenhum trailer de co-autoria de IA (`Co-Authored-By: Claude`, `Generated with`…).
- [ ] Commit deixa a base compilando e com testes passando.
- [ ] Criação do commit explicitamente autorizada pelo usuário.
