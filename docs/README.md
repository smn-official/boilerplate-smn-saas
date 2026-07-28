# Documentação do produto

O que este sistema faz e por quê — em linguagem de negócio. Cresce conforme as features surgem.

Não confundir com [.ai/docs/](../.ai/docs/), que documenta **como construir**: arquitetura,
convenções, agentes e ferramentas. Aqui é **o que construir e por quê**.

```text
docs/
├── context/
│   └── general-vision.md      o produto, o domínio, quem usa, fronteiras
└── features/
    └── <nome-da-feature>/
        ├── <nome-da-feature>.md    o que a feature faz, fluxos, dados, permissões
        └── rules/
            └── rule-<feature>-<n>.md   uma regra de negócio por arquivo
```

## Quando escrever

| Momento | O que fazer |
|---|---|
| Início do projeto | Preencher [context/general-vision.md](context/general-vision.md) |
| Feature nova aprovada | Copiar `feature-example/`, renomear, preencher **antes** de codar |
| Regra de negócio descoberta | Novo arquivo em `rules/`, com identificador estável |
| Regra muda | Editar o arquivo; se for substituída, marcar status e apontar a nova |
| Feature entregue | Atualizar status e data no documento da feature |

**Documente antes de implementar, não depois.** Escrever o fluxo e as regras revela ambiguidade
enquanto ela ainda é barata de resolver — depois do código pronto, cada descoberta custa retrabalho.
Se ao preencher o template a resposta for "não sei", essa é exatamente a pergunta a levar ao dono do
produto.

## Como criar uma feature

```bash
cp -R docs/features/feature-example docs/features/requisicao-material
cd docs/features/requisicao-material
mv feature-example.md requisicao-material.md
mv rules/rule-feature-example-1.md rules/rule-requisicao-material-1.md
mv rules/rule-feature-example-2.md rules/rule-requisicao-material-2.md
```

Nome da pasta em **kebab-case, no idioma do negócio** — `requisicao-material`, não `MaterialRequest`.
É a mesma convenção de pastas do [AGENTS.md](../AGENTS.md).

Mantenha `feature-example/` intacta: é o molde.

## O que vai aqui e o que não vai

| Vai | Não vai |
|---|---|
| Fluxo do ponto de vista de quem usa | Nome de classe, tabela, endpoint |
| Regra de negócio e sua origem | Decisão de arquitetura ou padrão de código |
| Permissões por perfil | Configuração, deploy, infraestrutura |
| Termos do domínio | Detalhe de implementação |

Se o texto menciona `Controller`, `DbContext` ou `price_…`, ele provavelmente pertence a
[.ai/docs/](../.ai/docs/) ou a uma skill — não aqui.

O motivo é prático: documentação de produto e de implementação mudam em ritmos diferentes. Misturar
as duas faz a de negócio envelhecer junto com o código e perder a confiança de quem a lê.

## Identificadores de regra

Cada regra tem um identificador estável (`RN-1`, `RN-2`) usado para referenciá-la entre documentos.

**Ele nunca entra no código** — nem em mensagem de erro, constante, nome de teste ou comentário. É
regra do [AGENTS.md](../AGENTS.md). O código expressa a regra; a rastreabilidade vive nestes
arquivos. Sigla vazando para a interface é ruído para o usuário, e vira mentira quando a regra muda
de número.

## Para a IA

Ao trabalhar numa tarefa deste projeto:

1. **Leia [context/general-vision.md](context/general-vision.md) primeiro** se não conhecer o
   domínio. Ele define o vocabulário que aparece em agregado, tabela e rota.
2. **Procure a feature correspondente** em `features/` antes de implementar. As regras em `rules/`
   são requisito, não sugestão.
3. **Ao descobrir uma regra não documentada**, escreva-a — no formato de
   [rule-feature-example-1](features/feature-example/rules/rule-feature-example-1.md), com casos no
   limite dos dois lados.
4. **Ao encontrar contradição** entre o código e um documento daqui, não escolha em silêncio:
   pergunte. Documento desatualizado e código errado são problemas diferentes, com correções
   diferentes.
5. **Feature que toca dado pessoal** aciona o [`lgpd-agent`](../.ai/agents/lgpd-agent.md) antes do
   schema — finalidade e base legal vêm primeiro.

O template preenchido em
[rule-feature-example-2](features/feature-example/rules/rule-feature-example-2.md) mostra o nível de
detalhe esperado: limite testado nos dois lados, origem da regra declarada e mensagem de erro que
informa os números em vez de "valor inválido".
