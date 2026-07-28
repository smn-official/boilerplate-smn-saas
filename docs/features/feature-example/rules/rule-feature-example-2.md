# RN-2 — Requisição acima do saldo é recusada

> **Exemplo preenchido.** Este arquivo mostra o formato de
> [rule-feature-example-1](rule-feature-example-1.md) aplicado a um caso concreto. Use-o como
> referência de nível de detalhe: note que o limite aparece nos **dois lados** na tabela de casos, e
> que a regra tem origem declarada.

**Feature:** [requisicao-material](../feature-example.md)
**Status:** vigente

## Enunciado

> Requisição cuja quantidade exceda o saldo disponível do material no almoxarifado de origem é
> recusada no momento da confirmação.

Saldo disponível = saldo físico − quantidade já reservada por requisições confirmadas e ainda não
atendidas. Requisição em rascunho **não** reserva saldo.

## Por quê

Restrição operacional: o almoxarifado não tem como atender o que não existe, e requisição pendente
sem lastro trava o planejamento de compra — o material aparece como demandado, mas nunca é entregue.

A definição de "disponível" descontar o reservado veio de um problema real: duas requisições
simultâneas para o mesmo material eram ambas aceitas contra o mesmo saldo físico, e a segunda ficava
pendente indefinidamente.

## Casos

Saldo físico 100, reservado 30 ⇒ disponível 70.

| Entrada | Resultado esperado |
|---|---|
| Requisição de 50 | Aceita; disponível passa a 20 |
| Requisição de 70 (exatamente o disponível) | **Aceita**; disponível passa a 0 |
| Requisição de 71 (um a mais) | **Recusada** |
| Requisição de 100 (o saldo físico) | Recusada — físico não é disponível |
| Requisição de 0 ou negativa | Recusada por validação de quantidade, antes desta regra |
| Rascunho de 500, não confirmado | Aceito como rascunho; não reserva nada |

O par 70/71 é o que prova que o limite é inclusivo. Sem ele, um erro de `>` versus `>=` passa
despercebido.

## Exceções

Requisição marcada como **emergencial** por perfil de supervisão pode exceder o disponível, gerando
saldo negativo e um alerta para o setor de compras. Requer justificativa registrada.

Nenhum outro perfil pode autorizar exceção — inclusive administrador.

## Impacto

- **Domínio:** invariante do agregado `Requisicao`, verificada em `Confirmar()`. Não é validação de
  tela: duas requisições concorrentes precisam falhar mesmo chegando ao mesmo tempo.
- **Persistência:** a verificação de saldo e a confirmação ocorrem na mesma transação; sem isso, a
  corrida descrita em "Por quê" volta a acontecer.
- **Interface:** o campo de quantidade mostra o disponível e sinaliza o excesso antes do envio — por
  conveniência, não como garantia.
- **Mensagem ao usuário:** "Quantidade solicitada (71) excede o disponível (70) no almoxarifado
  Central." Mostra os dois números: dizer apenas "quantidade inválida" obriga o usuário a adivinhar.
