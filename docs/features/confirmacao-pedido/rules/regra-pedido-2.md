# RN-PEDIDO-2 — Produto inativo não entra em pedido novo nem permite confirmação

*(exemplo — substituir; esta pasta inteira é molde)*

**Situação:** vigente
**Feature:** [confirmacao-pedido](../confirmacao-pedido.md)
**Índice:** [../../../domain/business-rules.md](../../../domain/business-rules.md) — a mesma regra
aparece lá como `RN-7`, na tabela "Índice das regras". **É a mesma regra, não duas:** `RN-PEDIDO-2` é o
mesmo identificador com o prefixo de escopo da feature, e o `2` do nome deste arquivo é o número do id
dentro da feature. A forma sem prefixo é a que o índice usa enquanto o produto tem uma feature só; a
partir da segunda, prefixe em **ambos** os lugares. Ver [../../README.md](../../README.md).

## Enunciado

Produto inativo não pode ser incluído em pedido, e um pedido cujos itens referenciem produto inativo
não pode ser confirmado.

## Por quê

Decisão comercial de 2026-03, mesma ata do fluxo de vendas.

Inativar um produto é como o contratante diz "não vendo mais isto". Deixar a confirmação passar
significaria assumir um compromisso de entrega sobre algo que o negócio já retirou de venda — e o
vendedor descobriria depois, na hora do faturamento, quando o comprador já foi avisado.

A regra tem dois momentos de aplicação porque a inativação pode acontecer **entre** eles: o item foi
incluído quando o produto estava ativo, e o supervisor inativou o produto antes de o vendedor
confirmar. Verificar só na inclusão deixaria essa janela aberta.

## Casos

| Cenário | Entrada | Resultado esperado |
|---|---|---|
| Inclusão de produto ativo | Produto ativo, `AdicionarItem` | Item incluído |
| Inclusão de produto inativo | Produto inativo, `AdicionarItem` | Recusado, `MsgProdutoInativo` |
| **Inativado após a inclusão** | Item incluído com produto ativo; produto inativado; `Confirmar` | Recusado, `MsgProdutoInativo`, apontando qual item |
| Item bloqueante removido | Situação acima; o item é removido; `Confirmar` | Confirmado, se restar ao menos um item (`RN-PEDIDO-1`) |
| Item bloqueante era o único | Situação acima; o item é removido e o pedido zera | Recusado por `RN-PEDIDO-1`, não por esta regra — as duas se aplicam em ordem |
| Reativado antes da confirmação | Produto inativado e reativado; `Confirmar` | Confirmado — a regra olha a situação no instante da confirmação, não o histórico |
| Pedido já confirmado | Produto inativado **depois** da confirmação | O pedido confirmado permanece válido; a regra não retroage. Faturamento segue normalmente |

*O caso em negrito é a razão de a regra existir em dois momentos. O último é o limite do outro lado:
a inativação não invalida o que já foi combinado — coerente com o congelamento de preço da
`RN-PEDIDO-1`.*

## Exceções

Não há.

Nem supervisor confirma pedido com produto inativo. A saída legítima é reativar o produto ou remover o
item — as duas ficam registradas, e é isso que se quer.

## Impacto

| O quê | Onde |
|---|---|
| Agregado que decide | `Produto`, via `Produto.EhDisponivelParaVenda` |
| Agregado que recusa | `Pedido`, em `AdicionarItem` e em `Confirmar` |
| Constante da mensagem | `Produto.MsgProdutoInativo` — "Este produto não está disponível para venda." |
| Serviço | Carrega os produtos referenciados e repassa a situação ao `Pedido`; nenhum agregado alcança o outro |

A decisão mora em `Produto` — é dele a regra do que está disponível — e a **recusa** mora em `Pedido`,
que é quem tem a operação a recusar. `Pedido` não reimplementa o critério de disponibilidade; ele
consulta a propriedade de decisão. É o padrão de
[../../../domain/aggregates.md](../../../domain/aggregates.md) para regra que envolve dois agregados.
