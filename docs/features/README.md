# Features

> **Template do boilerplate.** Preencha ao implementar e remova este aviso.

Uma pasta por feature, em kebab-case e no idioma do negócio (`requisicao-material`, não
`MaterialRequest`).

```text
docs/features/<nome-da-feature>/
├── <nome-da-feature>.md        o que faz, fluxos, dados, permissões
└── rules/
    └── rule-<feature>-<n>.md   uma regra de negócio por arquivo
```

## O documento da feature

Seções esperadas, nesta ordem:

| Seção | Conteúdo |
|---|---|
| O que é | Uma ou duas frases. Se não couber, são duas features |
| Por que existe | O problema concreto; sem isso ninguém sabe o que preservar depois |
| Fluxo principal | Caminho feliz em passos, do ponto de vista de quem usa |
| Fluxos alternativos e falhas | O que mais acontece na prática — a seção mais esquecida |
| Regras de negócio | Tabela apontando para `rules/`, uma linha cada |
| Dados | Entidades tocadas e se há dado pessoal |
| Permissões | Quem pode o quê; cada linha deveria virar teste |
| Fora de escopo | O que não entra, e por quê |
| Decisões em aberto | Pergunta, dono da decisão e suposição em uso |

Cabeçalho com **Status** (rascunho · em implementação · entregue) e **Atualizado em**.

## O arquivo de regra

| Seção | Conteúdo |
|---|---|
| Enunciado | A regra em uma frase, no imperativo. Sem "geralmente" |
| Por quê | Origem: exigência legal, decisão comercial, limitação operacional |
| Casos | Tabela que vira teste — inclua o limite **e os dois lados dele** |
| Exceções | Quando não se aplica e quem autoriza. "Não há" também é resposta |
| Impacto | Qual agregado garante a invariante, qual mensagem o usuário vê |

O identificador (`RN-1`) é estável e vive **só na documentação** — nunca em mensagem de erro,
constante, teste ou comentário de código.

Regra é garantida no domínio (`Core`), não apenas validada na tela: validação de interface é
conveniência, invariante de agregado é garantia.

## Antes de codar

Preencha o documento **antes** da implementação. Escrever o fluxo revela ambiguidade enquanto ela é
barata de resolver. Se ao preencher a resposta for "não sei", essa é a pergunta a levar ao dono do
produto.

## Decisão que atravessa features

Escolha estrutural que vale para o produto inteiro — camada, banco, autenticação, gateway de
pagamento — não pertence ao documento de uma feature. Registre-a como ADR em
[../decisions/](../decisions/README.md) e referencie o ADR daqui.
