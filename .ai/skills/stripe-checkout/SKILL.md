---
name: stripe-checkout
description: Cobrança com Checkout Session em .NET — criar sessão, URLs de sucesso e cancelamento, idempotency key, valor em menor unidade da moeda, métodos assíncronos (Pix, boleto) e o contrato IPagamentoGateway que mantém Stripe fora da camada Core. Use ao implementar pagamento avulso, tela de checkout ou revisar criação de sessão.
agent: stripe-agent
---

# Checkout Session

Padrão recomendado para cobrar. O cliente é levado a uma página hospedada pelo Stripe, informa o
cartão lá, e volta. O cartão **nunca** passa pelo seu servidor — é isso que mantém o sistema fora do
escopo pesado de PCI DSS.

Antes de implementar, confirme que a [`stripe-descoberta`](../stripe-descoberta/SKILL.md) foi feita:
valor, moeda, métodos aceitos e o que acontece após o pagamento.

## O contrato — Stripe não entra no Core

```csharp
// Core/Services/IPagamentoGateway.cs — nenhum tipo do Stripe aqui
public interface IPagamentoGateway
{
    Task<SessaoCheckoutDto> CriarSessaoAsync(
        NovaCobrancaDto cobranca,
        CancellationToken cancellationToken);
}

public sealed class NovaCobrancaDto
{
    public required string ReferenciaInterna { get; init; }
    public required string Descricao { get; init; }
    public required long ValorEmCentavos { get; init; }
    public required string Moeda { get; init; }
    public required string EmailCliente { get; init; }
}

public sealed class SessaoCheckoutDto
{
    public required string SessaoId { get; init; }
    public required string UrlCheckout { get; init; }
}
```

`Core` define o contrato; `Data` implementa com `Stripe.net`. O agregado nunca sabe que Stripe
existe — trocar de gateway vira uma implementação nova, não uma reescrita do domínio.

## A implementação, em Data

```csharp
// Data/Pagamentos/StripePagamentoGateway.cs — único lugar que referencia Stripe.net
public sealed class StripePagamentoGateway : IPagamentoGateway
{
    private readonly StripeOptions _opcoes;

    public StripePagamentoGateway(IOptions<StripeOptions> opcoes) => _opcoes = opcoes.Value;

    public async Task<SessaoCheckoutDto> CriarSessaoAsync(
        NovaCobrancaDto cobranca,
        CancellationToken cancellationToken)
    {
        var opcoes = new SessionCreateOptions
        {
            Mode = "payment",
            CustomerEmail = cobranca.EmailCliente,
            ClientReferenceId = cobranca.ReferenciaInterna,
            SuccessUrl = $"{_opcoes.UrlBase}/pagamento/sucesso?sessao={{CHECKOUT_SESSION_ID}}",
            CancelUrl = $"{_opcoes.UrlBase}/pagamento/cancelado",
            LineItems =
            [
                new SessionLineItemOptions
                {
                    Quantity = 1,
                    PriceData = new SessionLineItemPriceDataOptions
                    {
                        Currency = cobranca.Moeda,
                        UnitAmount = cobranca.ValorEmCentavos,
                        ProductData = new SessionLineItemPriceDataProductDataOptions
                        {
                            Name = cobranca.Descricao,
                        },
                    },
                },
            ],
        };

        var requestOptions = new RequestOptions
        {
            IdempotencyKey = cobranca.ReferenciaInterna,
        };

        var sessao = await new SessionService()
            .CreateAsync(opcoes, requestOptions, cancellationToken);

        return new SessaoCheckoutDto
        {
            SessaoId = sessao.Id,
            UrlCheckout = sessao.Url,
        };
    }
}
```

## Valor em menor unidade da moeda

`UnitAmount` é **inteiro, na menor unidade**: centavos em BRL e USD. R$ 49,90 é `4990`, não `49.90`.

Passar `decimal` direto é o erro clássico — cobra 100× menos ou 100× mais. Guarde `decimal` no
domínio e converta na fronteira:

```csharp
long emCentavos = (long)Math.Round(valor * 100m, MidpointRounding.AwayFromZero);
```

Moedas sem subdivisão (JPY) usam a unidade inteira — se o produto for internacional, confirme na
documentação em vez de assumir 100.

## Idempotency key

Duplo clique, retry de rede ou reenvio do formulário criam **duas cobranças**. O `IdempotencyKey`
impede: com a mesma chave, o Stripe devolve a sessão já criada em vez de criar outra.

Use um identificador **do seu domínio** e estável para a intenção de compra (id do pedido, por
exemplo) — não `Guid.NewGuid()` a cada chamada, que anula a proteção.

## Registrar antes de redirecionar

Grave a intenção de pagamento localmente **antes** de mandar o usuário ao Stripe. Se o webhook chegar
antes de você ter registro do que foi comprado, não há como associar o pagamento a nada.

`ClientReferenceId` carrega sua referência interna e volta no evento — é o que costura os dois lados.

## Sucesso na volta não é confirmação

A `SuccessUrl` significa apenas que o navegador voltou. **Não libere nada nela.** O usuário pode
fechar a aba antes, e com Pix ou boleto o pagamento sequer aconteceu ainda.

A liberação acontece **no webhook**, sempre. A tela de sucesso mostra "estamos confirmando seu
pagamento" e consulta o estado local. Ver [`stripe-webhooks`](../stripe-webhooks/SKILL.md).

## Métodos assíncronos — Pix e boleto

```csharp
PaymentMethodTypes = ["card", "boleto"],
```

Com esses métodos, o checkout termina **sem pagamento efetuado**: o cliente recebe o código e paga
depois. O fluxo ganha um estado intermediário obrigatório:

```text
aguardando_pagamento ──► pago        (async_payment_succeeded)
                    └──► expirado    (async_payment_failed)
```

Comunique o prazo ao usuário — boleto compensa em dias úteis, e sem esse aviso a percepção é de falha.

## Checklist

- [ ] `Core` não referencia `Stripe.net`; a integração vive em `Data`.
- [ ] Valor em menor unidade da moeda, convertido de `decimal` na fronteira.
- [ ] `IdempotencyKey` estável, derivada do domínio.
- [ ] Intenção registrada localmente antes do redirecionamento.
- [ ] `ClientReferenceId` preenchido para costurar webhook e pedido.
- [ ] Nada é liberado na `SuccessUrl`.
- [ ] Métodos assíncronos têm estado "aguardando pagamento".
- [ ] Chave secreta vem de variável de ambiente.

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Cobrança 100× errada | `decimal` passado direto | Converter para centavos inteiros |
| Duas cobranças no duplo clique | Sem `IdempotencyKey` | Chave estável do domínio |
| Acesso liberado sem pagamento | Liberou na `SuccessUrl` | Liberar só no webhook |
| Webhook chega e não acha o pedido | Nada registrado antes do redirect | Gravar intenção antes |
| Boleto marcado como pago na hora | Tratou `completed` como pagamento | Usar `async_payment_succeeded` |
