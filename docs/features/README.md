# Features

> **Template do boilerplate.** Preencha ao implementar e remova este aviso.

Uma pasta por feature, em kebab-case e no idioma do negócio (`requisicao-material`, não
`MaterialRequest`).

```text
docs/features/<nome-da-feature>/
├── <nome-da-feature>.md         o que faz, fluxos, dados, permissões
└── rules/
    └── regra-<feature>-<n>.md   uma regra de negócio por arquivo
```

Molde preenchido para copiar: [confirmacao-pedido/](confirmacao-pedido/confirmacao-pedido.md).

## `RN-*` e `regra-*` são o mesmo identificador, em dois lugares com papéis distintos

Esta é a pergunta que a estrutura acima deixava em aberto, e a resposta é **um sistema só**, nunca
dois paralelos. Dois sistemas de numeração para a mesma regra é a forma mais rápida de ninguém saber
qual enunciado vale.

| Artefato | Papel | Contém |
|---|---|---|
| [../domain/business-rules.md](../domain/business-rules.md) | **Índice único e autoridade da numeração** | Uma linha por regra do produto: id, enunciado resumido, agregado que garante, situação |
| `<feature>/rules/regra-<feature>-<n>.md` | **Texto completo da regra**, onde ela nasce | Enunciado, origem, casos que viram teste, exceções, impacto |

As duas regras que amarram isso:

1. **O `<n>` do nome do arquivo é o número do `RN-*`.** `regra-pedido-1.md` é a `RN-PEDIDO-1`; o
   arquivo declara o id no título e no cabeçalho. Não existe regra com um número no índice e outro no
   arquivo.
2. **O índice sempre aponta para o arquivo.** Toda linha de `business-rules.md` cuja regra pertence a
   uma feature linka para o `rules/` correspondente. Regra que atravessa features (ou que não tem
   feature, como uma invariante de cadastro global) fica **detalhada no próprio
   `business-rules.md`**, na seção de regra detalhada — é o único caso em que não há arquivo em
   `rules/`.

O prefixo do id é o **escopo da feature** (`RN-PEDIDO-1`), não um contador global. `RN-1` sem prefixo
é aceitável apenas enquanto o produto tem uma feature; a partir da segunda, prefixe — renumerar depois
quebra a referência de todo PR e commit antigo, e o identificador é estável por definição.

O identificador vive **só na documentação** — nunca em mensagem de erro, constante, teste, view,
TypeScript ou comentário de código. Ver [../domain/business-rules.md](../domain/business-rules.md).

Regra é garantida no domínio (`Core`), não apenas validada na tela: validação de interface é
conveniência, invariante de agregado é garantia.

## O documento da feature

Seções esperadas, nesta ordem. A coluna **Critério** é o que torna a seção verificável — sem ela, "O
que é" recebe três parágrafos e "Fluxos alternativos" recebe um "N/A".

| Bloco | O que escrever | Critério |
|---|---|---|
| **Cabeçalho** | **Status** (rascunho · em implementação · entregue) e **Atualizado em** | Status "entregue" com decisão em aberto na última seção é contradição — resolva uma das duas |
| **O que é** | Uma ou duas frases | Se não couber em duas, são duas features |
| **Por que existe** | O problema concreto que alguém tem hoje | Precisa nomear quem sofre e o que ele faz hoje no lugar; sem isso ninguém sabe o que preservar num refactor |
| **Fluxo principal** | Caminho feliz em passos numerados, do gatilho ao resultado | Linguagem de negócio, sem nome de classe ou método; se aparece `Service`, isto virou desenho de solução |
| **Fluxos alternativos e falhas** | Cada desvio com a condição que o dispara e o desfecho | Um por invariante que o agregado recusa, mais um por integração que pode falhar. Zero linhas só se a feature não tem regra nem integração — o que quase nunca é verdade |
| **Regras de negócio** | Tabela apontando para `rules/`, uma linha cada | Todo `RN-*` citado nos fluxos aparece aqui, e todo arquivo em `rules/` aparece aqui. As duas direções |
| **Dados** | Entidades tocadas, a **categoria** de cada uma e se há dado pessoal | Categoria vazia é bloqueio: sem ela ninguém sabe escrever o mapeamento ([ADR-003](../decisions/ADR-003-isolamento-multi-schema.md)) |
| **Permissões** | Quem pode o quê — papel e vínculo com o dono **dentro** do contratante | Cada linha deveria virar teste. Se uma linha diz "só do próprio cliente/contratante", está errada: isolamento entre contratantes é do schema, não da feature |
| **Fora de escopo** | O que não entra, e por quê | Precisa doer um pouco. Lista só com o que ninguém pediu não protege de nada |
| **Decisões em aberto** | Pergunta, dono da decisão e **a suposição em uso** | A suposição é obrigatória: sem ela a implementação para, ou pior, alguém decide sozinho e não registra |

## O arquivo de regra

| Bloco | O que escrever | Critério |
|---|---|---|
| **Cabeçalho** | O id (`RN-<FEATURE>-<n>`), a **situação** (vigente · planejada · revogada) e a feature | O id bate com o `<n>` do nome do arquivo e com a linha do índice em `business-rules.md` |
| **Enunciado** | A regra em uma frase, no imperativo, no presente | Alguém do negócio lê e concorda ou discorda. "Geralmente", "deve ser adequado" e "quando aplicável" invalidam o enunciado |
| **Por quê** | Origem: exigência legal, decisão comercial, limitação operacional — com data e onde foi decidido | Sem origem, ninguém consegue julgar daqui a um ano se a regra ainda vale |
| **Casos** | Tabela que vira teste: entrada concreta e resultado esperado | Inclua o limite **e os dois lados dele**. Se o limite é "ao menos um", há caso de zero e caso de um |
| **Exceções** | Quando não se aplica e quem autoriza | "Não há" é resposta válida e precisa estar escrita. Exceção não registrada vira `if` inexplicado seis meses depois |
| **Impacto** | Qual agregado garante a invariante, qual método a aplica, qual constante carrega a mensagem | É o que liga a regra ao código. Sem isso a regra é literatura |

## Antes de codar

Preencha o documento **antes** da implementação. Escrever o fluxo revela ambiguidade enquanto ela é
barata de resolver. Se ao preencher a resposta for "não sei", essa é a pergunta a levar ao dono do
produto — registre-a em "Decisões em aberto" com a suposição que você vai usar até a resposta chegar.

## Decisão que atravessa features

Escolha estrutural que vale para o produto inteiro — camada, banco, autenticação, gateway de
pagamento, isolamento entre contratantes — não pertence ao documento de uma feature. Registre-a como
ADR em [../decisions/](../decisions/README.md) e referencie o ADR daqui.

O caso que mais aparece: **onde os dados da feature vivem.** Não decida isso no documento da feature.
Classifique cada entidade na seção "Dados" usando as duas categorias que o
[ADR-003](../decisions/ADR-003-isolamento-multi-schema.md) já fixou — `Cliente (schema próprio)` ou
`Global (schema compartilhado)` — e siga.
