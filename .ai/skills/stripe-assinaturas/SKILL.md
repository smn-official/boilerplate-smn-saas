---
name: stripe-assinaturas
description: Assinatura recorrente no Stripe — Product e Price, ciclo mensal e anual, trial, add-on como item da mesma assinatura, upgrade e downgrade com proration, cancelamento no fim do período, inadimplência e dunning, e Customer Portal. Use ao implementar plano recorrente, mudança de plano, cancelamento ou cobrança de módulo à parte.
agent: stripe-agent
---

# Assinaturas

Cobrança recorrente. Depende inteiramente das respostas da
[`stripe-descoberta`](../stripe-descoberta/SKILL.md) — plano, preço, ciclo e política de mudança são
decisão de negócio, não escolha técnica.

## Os três objetos

| Objeto | O que é | Exemplo |
|---|---|---|
| `Product` | O que você vende | "Plano Pro" |
| `Price` | Quanto custa, em qual ciclo e moeda | R$ 99/mês · R$ 990/ano |
| `Subscription` | O vínculo do cliente com um ou mais `Price` | Assinatura do cliente X |

Um `Product` tem **vários** `Price`: mensal e anual são preços distintos do mesmo produto. Moeda
diferente também é `Price` diferente.

Crie `Product` e `Price` **no dashboard**, não em código. Preço é decisão de negócio e muda sem
deploy; hardcodar preço em C# obriga a publicar versão para alterar valor. O código referencia o
`price_…` por configuração.

## Uma assinatura, vários itens

Erro estrutural comum: criar uma assinatura por módulo. **Plano + add-ons são itens da mesma
`Subscription`**:

```text
Subscription sub_123
├── item: price_pro_mensal        (qty 1)   R$ 99
└── item: price_relatorios        (qty 1)   R$ 29
                                            ─────
                                  cobrança única: R$ 128
```

Assinaturas separadas geram faturas separadas, ciclos que desalinham e cancelamento parcial confuso.
Só separe se os ciclos forem genuinamente diferentes (plano anual + add-on mensal).

Cobrança por assento usa `Quantity` no item — não crie um item por usuário.

## Criar via Checkout

```csharp
var opcoes = new SessionCreateOptions
{
    Mode = "subscription",
    CustomerEmail = email,
    ClientReferenceId = referenciaInterna,
    SuccessUrl = $"{urlBase}/assinatura/sucesso?sessao={{CHECKOUT_SESSION_ID}}",
    CancelUrl = $"{urlBase}/planos",
    LineItems =
    [
        new SessionLineItemOptions { Price = _opcoes.PrecoProMensal, Quantity = 1 },
    ],
    SubscriptionData = new SessionSubscriptionDataOptions
    {
        TrialPeriodDays = 14,
    },
    AllowPromotionCodes = true,
};
```

`Mode = "subscription"` é o que diferencia de cobrança avulsa. `TrialPeriodDays` só entra se a
descoberta definiu trial.

## Trial

Duas variantes, com consequências distintas:

- **Com cartão** (recomendado): o cliente informa o cartão na entrada; a cobrança acontece sozinha ao
  fim do trial. Status `trialing` → `active`.
- **Sem cartão:** menos atrito para entrar, mas exige um fluxo para coletar pagamento depois, e a
  assinatura pode ficar `incomplete`. Mais conversão na entrada, mais complexidade no código.

Avise antes da cobrança do fim do trial. Cobrança inesperada gera contestação, e contestação custa
mais que o mês cobrado.

## Upgrade e downgrade

A decisão é `ProrationBehavior`:

| Valor | Efeito |
|---|---|
| `always_invoice` | Cobra a diferença **imediatamente**. Padrão para upgrade |
| `create_prorations` | Lança o ajuste na próxima fatura |
| `none` | Sem ajuste; o novo preço vale do próximo ciclo. Padrão para downgrade |

```csharp
var assinatura = await new SubscriptionService().GetAsync(assinaturaId, cancellationToken: ct);

await new SubscriptionService().UpdateAsync(
    assinaturaId,
    new SubscriptionUpdateOptions
    {
        Items =
        [
            new SubscriptionItemOptions
            {
                Id = assinatura.Items.Data[0].Id,   // atualiza o item existente
                Price = novoPrecoId,
            },
        ],
        ProrationBehavior = "always_invoice",
    },
    cancellationToken: ct);
```

Passe o `Id` do item existente. Sem ele, o Stripe **adiciona** um item e o cliente passa a pagar os
dois planos — erro caro e silencioso.

**Downgrade imediato com proration gera crédito**, não devolução em dinheiro. Se a política prometer
reembolso, isso é processo separado.

## Cancelamento

```csharp
// Recomendado: acesso até o fim do período já pago
await new SubscriptionService().UpdateAsync(
    assinaturaId,
    new SubscriptionUpdateOptions { CancelAtPeriodEnd = true },
    cancellationToken: ct);

// Imediato: corta na hora, sem reembolso automático
await new SubscriptionService().CancelAsync(assinaturaId, cancellationToken: ct);
```

`CancelAtPeriodEnd` é o padrão do mercado e o que gera menos contestação — o cliente pagou o mês,
usa o mês. Cancelamento imediato só quando houver política explícita de reembolso.

Enquanto `CancelAtPeriodEnd = true`, a assinatura segue `active`: o acesso continua, e o cliente pode
reativar sem nova cobrança. Não trate como cancelada até o `customer.subscription.deleted`.

## Inadimplência

Falhou a cobrança, a assinatura entra em `past_due` e o Stripe faz **dunning**: novas tentativas
conforme configurado no dashboard, e-mail de aviso, e por fim o desfecho definido (cancelar ou
deixar sem pagamento).

**Não implemente retry de cobrança na mão.** Configure no dashboard e reaja aos eventos.

O que o seu código decide é o **acesso** durante `past_due` — pergunta da descoberta. Cortar na hora
é agressivo com quem só teve o cartão expirado; manter indefinidamente é prejuízo. Um período curto
de tolerância com aviso costuma equilibrar.

## Customer Portal

Portal hospedado pelo Stripe onde o cliente troca cartão, muda de plano, cancela e baixa faturas:

```csharp
var sessao = await new Stripe.BillingPortal.SessionService().CreateAsync(
    new Stripe.BillingPortal.SessionCreateOptions
    {
        Customer = clienteStripeId,
        ReturnUrl = $"{urlBase}/conta",
    },
    cancellationToken: ct);
```

Vale muito: elimina telas de gerenciamento de cartão, atualização de plano e histórico de faturas —
com PCI e edge cases resolvidos. Antes de construir tela própria de billing, verifique se o portal já
resolve.

O que muda lá **volta por webhook**. O portal não é atalho para pular o tratamento de eventos.

## Estado local

Espelhe os status do Stripe, sem inventar os seus (ver [`stripe-webhooks`](../stripe-webhooks/SKILL.md)).
Guarde também `CurrentPeriodEnd` — é o que responde "até quando esse cliente tem acesso" sem chamar a
API a cada request.

A autorização mora no `Core`, avaliando o agregado:

```csharp
public bool PermiteAcesso(DateTimeOffset agora) =>
    Status is StatusAssinatura.Ativa or StatusAssinatura.EmTeste
    || (Status is StatusAssinatura.Inadimplente && agora <= FimToleranciaInadimplencia);
```

Regra de acesso é domínio, não infraestrutura — não a espalhe por `Controller`.

## Checklist

- [ ] `Product` e `Price` criados no dashboard; código referencia por configuração.
- [ ] Add-on é item da mesma assinatura, não assinatura separada.
- [ ] Upgrade atualiza o item existente pelo `Id` (não adiciona outro).
- [ ] `ProrationBehavior` explícito e coerente com a política da descoberta.
- [ ] Cancelamento usa `CancelAtPeriodEnd`, salvo política contrária.
- [ ] Dunning configurado no dashboard, não em código.
- [ ] Regra de acesso no `Core`, avaliando status e período.
- [ ] Customer Portal avaliado antes de construir tela própria.

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Cliente pagando dois planos | Upgrade adicionou item em vez de atualizar | Passar o `Id` do item |
| Acesso cortado ao clicar em cancelar | Tratou `CancelAtPeriodEnd` como cancelado | Cortar só no `deleted` |
| Faturas separadas por módulo | Uma assinatura por add-on | Itens na mesma `Subscription` |
| Preço mudado exige deploy | Valor hardcoded em C# | `price_…` por configuração |
| Cobrança dupla na troca de ciclo | Assinatura nova sem cancelar a antiga | Atualizar a existente |
