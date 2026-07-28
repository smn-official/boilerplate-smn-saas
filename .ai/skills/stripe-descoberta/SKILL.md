---
name: stripe-descoberta
description: Levantamento obrigatório antes de escrever qualquer código de pagamento — nome e preço dos planos, ciclo de cobrança, módulos ou add-ons vendidos à parte, trial, métodos de pagamento (cartão, Pix, boleto), moeda, impostos, cupom, o que acontece na inadimplência e no cancelamento. Use SEMPRE como primeiro passo de uma integração Stripe, antes de modelar, criar produto no dashboard ou escrever código.
agent: stripe-agent
---

# Descoberta — antes de qualquer linha de código

Modelo de cobrança é **decisão de negócio**, não detalhe técnico. Definido errado, custa caro para
corrigir: mudar ciclo, preço ou estrutura de plano depois que existem assinaturas ativas envolve
migração de dados, proration e comunicação com cliente pagante — não é refatoração.

**Não escreva código de pagamento antes de ter estas respostas.** Se o usuário não souber alguma,
registre a suposição explicitamente e siga; não invente silenciosamente.

## Como conduzir

Pergunte em blocos, não tudo de uma vez — a maioria das respostas depende da anterior. Comece pelo
**modelo de cobrança**, que determina quase todo o resto.

Use as perguntas abaixo como roteiro, adaptando ao que já souber do projeto. Quando o usuário
responder "não sei" ou "tanto faz", ofereça o padrão recomendado e siga.

## Bloco 1 — Modelo de cobrança

| Pergunta | Por que importa |
|---|---|
| É pagamento avulso, assinatura recorrente, ou os dois? | Define Checkout Session simples vs. Subscription; muda o modelo de dados inteiro |
| Se recorrente: mensal, anual, ou ambos? | Anual costuma ter desconto e muda a comunicação de preço |
| Cobrança por assento/usuário, por uso, ou preço fixo? | Assento e uso exigem reportar quantidade ao Stripe; preço fixo não |
| Tem período de teste grátis? Quantos dias? Pede cartão na entrada? | Trial sem cartão gera estado `trialing` sem método de pagamento — caminho diferente |

**Padrão recomendado** quando não houver preferência: assinatura mensal e anual, preço fixo por
plano, trial de 14 dias **com** cartão (reduz cancelamento por esquecimento e evita conta órfã).

## Bloco 2 — Planos

| Pergunta | Por que importa |
|---|---|
| Quantos planos, e qual o nome de cada um? | Vira `Product` no Stripe e enum/tabela no domínio |
| Qual o preço de cada plano, em cada ciclo? | Vira `Price`; cada combinação plano × ciclo × moeda é um `Price` distinto |
| O que cada plano libera de fato? | É a regra que o `Core` vai avaliar; sem isso não há como implementar autorização |
| Existe plano gratuito? | Gratuito normalmente **não** vira assinatura no Stripe — é estado local |
| Existe plano sob consulta/enterprise? | Costuma ficar fora do checkout automático |

Peça a lista concreta. "Básico, Pro, Enterprise" sem preço nem escopo não é resposta suficiente para
modelar.

## Bloco 3 — Módulos e add-ons

| Pergunta | Por que importa |
|---|---|
| Existe módulo vendido à parte do plano? | Vira `Price` adicional no mesmo `Subscription`, não outra assinatura |
| Add-on é cobrado no mesmo ciclo do plano? | Ciclos diferentes exigem assinaturas separadas — bem mais complexo |
| Add-on tem quantidade (ex.: 10 usuários extras)? | Precisa de `quantity` no item da assinatura |
| Módulo pode ser contratado e cancelado no meio do ciclo? | Exige decidir proration (ver Bloco 6) |

Um `Subscription` do Stripe comporta **vários itens**. Plano + dois add-ons = uma assinatura com três
itens, não três assinaturas. Errar isso multiplica a complexidade de cobrança e cancelamento.

## Bloco 4 — Métodos de pagamento

| Pergunta | Por que importa |
|---|---|
| Cartão de crédito apenas, ou também Pix e boleto? | Pix e boleto são **assíncronos**: o pagamento não confirma na hora |
| Se Pix/boleto: aceita para assinatura recorrente ou só avulso? | Boleto recorrente exige tratamento de vencimento e inadimplência diferente |
| Aceita cartão internacional? Em qual moeda? | Muda `currency` e pode exigir Adaptive Pricing |
| Precisa parcelar? | Parcelamento no Brasil tem regra própria e nem todo método suporta |

**Ponto crítico:** com cartão, o acesso pode ser liberado na confirmação do checkout. Com **Pix ou
boleto, não** — o pagamento confirma depois, por webhook. Liberar acesso antes da confirmação é
prejuízo direto. Se houver método assíncrono, o fluxo precisa de um estado "aguardando pagamento".

## Bloco 5 — Moeda, imposto e emissão

| Pergunta | Por que importa |
|---|---|
| Qual moeda? Uma só ou várias? | Cada moeda é um `Price` distinto |
| Preço com imposto incluso ou somado no checkout? | Muda `tax_behavior` e o valor exibido |
| Precisa emitir nota fiscal? Por qual sistema? | Stripe não emite NF-e brasileira; exige integração à parte |
| Precisa coletar CPF/CNPJ? | É dado pessoal — `lgpd-agent` entra antes do schema |

Se houver emissão de nota fiscal, diga claramente que o Stripe **não** resolve isso no Brasil e que
será necessário integrar um emissor separado. É uma das descobertas tardias mais comuns.

## Bloco 6 — Mudança de plano e cancelamento

| Pergunta | Por que importa |
|---|---|
| Upgrade tem cobrança proporcional imediata, ou só no próximo ciclo? | É a decisão de `proration_behavior` |
| Downgrade vale na hora ou no fim do período pago? | Valer na hora exige política de reembolso |
| Cancelamento corta o acesso na hora ou no fim do período pago? | Padrão do mercado: fim do período pago |
| Tem reembolso? Em qual janela? | Define política e processo operacional |

**Padrão recomendado:** upgrade com proration imediata; downgrade e cancelamento no fim do período
pago (`cancel_at_period_end`). É o que o usuário espera e o que menos gera contestação.

## Bloco 7 — Inadimplência

| Pergunta | Por que importa |
|---|---|
| Quantas tentativas de recobrança antes de suspender? | O Stripe faz *dunning* configurável — não implemente na mão |
| O que acontece no `past_due`: acesso mantido ou suspenso? | Regra de negócio que o `Core` precisa avaliar |
| Depois de quanto tempo a conta é cancelada de vez? | Define a transição final de estado |
| Dado do cliente é apagado no cancelamento? | Cruza com retenção legal — ver [`retencao-descarte`](../retencao-descarte/SKILL.md) |

Atenção ao último: obrigação fiscal costuma exigir guardar registro da transação **mesmo depois** de
o titular pedir exclusão. Isso é hipótese legal de conservação, e precisa estar documentado.

## Bloco 8 — Cupom e promoção

| Pergunta | Por que importa |
|---|---|
| Vai ter cupom de desconto? | Ativa `allow_promotion_codes` no checkout |
| Desconto é percentual ou valor fixo? Uma vez ou recorrente? | Vira `Coupon` com duração definida |
| Vai ter preço promocional de lançamento? | Costuma ser `Price` separado, não cupom |

## Fechamento — registre o que foi decidido

Antes de codar, escreva um resumo curto e confirme com o usuário. Sem isso, a decisão vira folclore
oral e ninguém lembra por que o downgrade funciona daquele jeito.

```markdown
## Modelo de cobrança — <Produto>

- **Modelo:** assinatura recorrente, mensal e anual
- **Planos:** Essencial (R$ 49/mês, R$ 490/ano) · Pro (R$ 99/mês, R$ 990/ano)
- **Add-ons:** Módulo Relatórios (R$ 29/mês), mesmo ciclo do plano, com quantidade
- **Trial:** 14 dias, exige cartão
- **Métodos:** cartão; Pix apenas para pagamento anual
- **Moeda:** BRL, imposto incluso no preço
- **Upgrade:** proporcional imediato · **Downgrade/cancelamento:** fim do período pago
- **Inadimplência:** 3 tentativas em 7 dias; acesso suspenso em `past_due`; cancela em 30 dias
- **Nota fiscal:** emissor externo (a definir) — Stripe não emite NF-e
- **Cupom:** sim, percentual, primeira cobrança apenas
- **Suposições assumidas:** <o que o usuário não soube responder>
```

Guarde esse resumo em `.ai/docs/` do projeto. Ele é a referência que evita a próxima pessoa
reinventar a regra por dedução do código.

## Depois da descoberta

Com as respostas em mãos, a ordem é:

1. [`lgpd-agent`](../../agents/lgpd-agent.md) — se coletar CPF/CNPJ ou dado de cobrança, base legal
   e finalidade vêm antes do schema.
2. [`stripe-modelagem`](../stripe-modelagem/SKILL.md) — o que o banco guarda.
3. [`stripe-checkout`](../stripe-checkout/SKILL.md) / [`stripe-assinaturas`](../stripe-assinaturas/SKILL.md) — o fluxo.
4. [`stripe-webhooks`](../stripe-webhooks/SKILL.md) — a confirmação, que é o que torna tudo confiável.
