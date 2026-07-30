# RN-PEDIDO-3 — Pedido cancelado não recebe item novo, não é confirmado e não é faturado

*(exemplo — substituir; esta pasta inteira é molde)*

**Situação:** vigente
**Feature:** [confirmacao-pedido](../confirmacao-pedido.md)
**Índice:** [../../../domain/business-rules.md](../../../domain/business-rules.md) — indexada lá como
`RN-3`, com o enunciado resumido e o agregado que garante. Mesmo identificador, mesmo número.

## Enunciado

Pedido cancelado é terminal: não aceita item novo, não é confirmado e não é faturado. Nenhuma operação
de escrita sobre ele é permitida.

## Por quê

Limitação operacional, decidida junto com o modelo de estados do pedido em 2026-03.

O cancelamento existe para encerrar uma negociação, e um pedido encerrado que volta a aceitar escrita
não encerra nada — ele apenas some do radar de quem acompanha pedidos abertos enquanto continua
mudando. Pior: se um pedido cancelado pudesse ser faturado, o cancelamento deixaria de ser uma garantia
para o comprador e passaria a ser uma anotação.

"Reabrir" é criar um pedido novo, deliberadamente. Custa alguns cliques ao vendedor e preserva o rastro
do que foi cancelado — que é a informação que o supervisor procura quando pergunta por que o mês fechou
abaixo do esperado.

## Casos

| Cenário | Entrada | Resultado esperado |
|---|---|---|
| Item em pedido cancelado | Pedido cancelado, `AdicionarItem` | Recusado, `MsgPedidoCancelado` |
| Confirmação de cancelado | Pedido cancelado, `Confirmar` | Recusado, `MsgPedidoCancelado` |
| Faturamento de cancelado | Pedido cancelado, `Faturar` | Recusado, `MsgPedidoCancelado` |
| **Cancelamento de rascunho** | Pedido em rascunho, `Cancelar` | Cancelado — rascunho é cancelável |
| **Cancelamento de confirmado** | Pedido confirmado, `Cancelar` | Cancelado — confirmado também é cancelável |
| Cancelamento de faturado | Pedido faturado, `Cancelar` | Recusado; pedido faturado se resolve por devolução, não por cancelamento |
| Cancelamento repetido | Pedido cancelado, `Cancelar` | Recusado, `MsgPedidoCancelado` — nenhuma escrita, nem "inofensiva" |
| Leitura de cancelado | Pedido cancelado, abrir a tela | **Permitido.** A regra proíbe escrita, não consulta — o histórico continua visível |

*Os dois casos em negrito delimitam de onde o cancelamento é alcançável, e a linha seguinte, de onde
não é. O último caso é o que impede alguém de "aplicar a regra" escondendo pedidos cancelados da
listagem — a regra é sobre escrita.*

## Exceções

Não há exceção de negócio.

Correção de cancelamento indevido é operação de suporte, feita por script auditado sobre o banco, com
registro de quem pediu e por quê — não um caminho de código na aplicação. Um método
`ReverterCancelamento` no agregado transformaria o estado terminal em opinião.

## Impacto

| O quê | Onde |
|---|---|
| Agregado que garante | `Pedido` ([../../../domain/aggregates.md](../../../domain/aggregates.md)) |
| Métodos que recusam | `Pedido.AdicionarItem`, `Pedido.Confirmar`, `Pedido.Faturar`, `Pedido.Cancelar` |
| Constante da mensagem | `Pedido.MsgPedidoCancelado` — "Pedido cancelado não pode ser faturado." |
| Onde o estado vive | `SituacaoPedido`, persistida como **string** (`HasConversion<string>()`) |

A guarda é o **primeiro** early return de cada método de mutação, não uma verificação no serviço:
`Cancelado` é terminal na definição do agregado, e nenhum caminho público produz escrita sobre ele. Um
método novo de mutação em `Pedido` que esqueça essa guarda é o defeito a procurar em revisão.

O identificador `RN-PEDIDO-3` **não aparece** na mensagem nem no teste; o teste asserta contra
`Pedido.MsgPedidoCancelado`.
