# RN-PEDIDO-1 — Pedido confirmado tem ao menos um item, e o preço é congelado na confirmação

*(exemplo — substituir; esta pasta inteira é molde)*

**Situação:** vigente
**Feature:** [confirmacao-pedido](../confirmacao-pedido.md)
**Índice:** [../../../domain/business-rules.md](../../../domain/business-rules.md) — a mesma regra
aparece lá como `RN-1`, na tabela "Índice das regras" e na seção de regra detalhada. **É a mesma
regra, não duas:** o índice é a autoridade da numeração e o resumo; este arquivo é o texto completo.
O `1` do nome deste arquivo é o número do id. A regra que governa esse vínculo está em
[../../README.md](../../README.md).

## Enunciado

A confirmação de um pedido exige ao menos um item, e copia para cada item o preço de venda vigente do
produto naquele instante. Alteração posterior do preço de catálogo não altera pedido já confirmado.

## Por quê

Decisão comercial de 2026-03, registrada na ata de definição do fluxo de vendas.

São duas exigências num enunciado só porque têm a mesma origem e o **mesmo momento de aplicação**: o
instante da confirmação é o único em que o sistema tem algo para congelar, e um pedido sem item não tem
o que congelar. Separá-las em duas regras criaria a possibilidade de uma valer sem a outra, que é
estado que o negócio não reconhece.

O motivo comercial: o contratante precisa reajustar o catálogo sem que o histórico de pedidos mude de
valor retroativamente. Um pedido que muda de total depois de combinado com o comprador é, na prática, o
sistema reescrevendo o que foi acordado — e é o que o vendedor hoje evita anotando o total num caderno.

## Casos

| Cenário | Entrada | Resultado esperado |
|---|---|---|
| Sem itens | Pedido em rascunho, zero itens, `Confirmar` | Recusado, `MsgPedidoSemItem`; permanece em rascunho |
| **No limite** | Pedido em rascunho, **exatamente um** item, `Confirmar` | Confirmado — um item já satisfaz a regra |
| Vários itens | Pedido com três itens, `Confirmar` | Confirmado; os três recebem o preço vigente |
| Itens removidos até zerar | Rascunho com um item; item removido; `Confirmar` | Recusado, `MsgPedidoSemItem` |
| Preço congelado | Item confirmado a 10,00; produto reajustado para 12,00 | O item continua 10,00; o total do pedido não muda |
| **Congelamento é na confirmação, não na inclusão** | Item incluído a 10,00; produto vai a 12,00; **depois** `Confirmar` | O item vale 12,00 |
| Preço zerado no catálogo | Produto com preço 0,00 | Não existe: recusado antes, por `RN-4` — preço de venda é maior que zero |
| Já confirmado | Pedido confirmado, `Confirmar` de novo | Recusado; confirmação não é idempotente por decisão — repetição indica erro de fluxo, e aceitá-la reescreveria preços congelados |

*Os dois casos em negrito são os que provam a regra. O primeiro é o limite inferior de "ao menos um" —
zero e um, os dois lados. O segundo separa esta regra de uma versão ingênua dela ("o preço é o do
produto"): as duas só divergem num rascunho de vida longa, e é exatamente lá que o defeito aparece em
produção.*

## Exceções

Não há.

Não existe pedido confirmado sem item, e não há recálculo retroativo de preço — nem por operação
administrativa, nem por correção de erro de digitação no catálogo. Corrigir um pedido confirmado é
cancelá-lo e criar outro, preservando o rastro do primeiro.

## Impacto

| O quê | Onde |
|---|---|
| Agregado que garante | `Pedido` ([../../../domain/aggregates.md](../../../domain/aggregates.md)) |
| Método que recusa | `Pedido.Confirmar` |
| Constante da mensagem | `Pedido.MsgPedidoSemItem` — "Inclua ao menos um item para confirmar o pedido." |
| Decisão exposta à tela | `Pedido.EhConfirmavel`, para habilitar ou não o botão sem reimplementar a regra |
| Onde o preço é gravado | `Pedido.Confirmar` é o **único** caminho que escreve `ItemPedido.PrecoPraticado` |

A imutabilidade do preço é **estrutural**, não convenção de uso: `PrecoPraticado` tem setter privado e
nenhum método público o altera. O preço de origem vem de `Produto.PrecoDeVenda`, e `Produto` é agregado
distinto — quem lê e repassa é o serviço, porque um agregado nunca alcança outro.

O identificador `RN-PEDIDO-1` **não aparece** na mensagem, na constante, no nome do teste nem no
assert. O teste asserta contra `Pedido.MsgPedidoSemItem`.
