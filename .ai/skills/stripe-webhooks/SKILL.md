---
name: stripe-webhooks
description: Webhook do Stripe em ASP.NET Core — verificação de assinatura com EventUtility.ConstructEvent, corpo bruto sem buffering, idempotência por event.id, responder 2xx antes de processar, ausência de garantia de ordem, quais eventos assinar e teste com Stripe CLI. Use ao criar ou revisar endpoint de webhook, tratar evento de pagamento ou diagnosticar assinatura inválida.
agent: stripe-agent
---

# Webhook do Stripe

Webhook é o que torna a integração confiável: é por ele que você sabe que o pagamento **de fato**
aconteceu. Confiar no retorno do navegador é ingênuo — o usuário fecha a aba, a rede cai, e com Pix
ou boleto a confirmação vem minutos ou dias depois.

## As quatro regras

1. **Verifique a assinatura.** Sem isso, qualquer um que descubra a URL pode forjar "pagamento
   aprovado". É a falha mais grave possível nesse endpoint.
2. **Use o corpo bruto.** Qualquer alteração no payload invalida a assinatura.
3. **Responda 2xx rápido, processe depois.** O Stripe reenvia se você demorar — e reenvio vira
   processamento duplicado.
4. **Seja idempotente.** O mesmo evento **vai** chegar mais de uma vez. Não é hipótese remota.

## O endpoint

```csharp
[ApiController]
[Route("webhooks/stripe")]
public sealed class StripeWebhookController : ControllerBase
{
    private readonly IStripeEventoProcessor _processor;
    private readonly StripeOptions _opcoes;
    private readonly ILogger<StripeWebhookController> _logger;

    public StripeWebhookController(
        IStripeEventoProcessor processor,
        IOptions<StripeOptions> opcoes,
        ILogger<StripeWebhookController> logger)
    {
        _processor = processor;
        _opcoes = opcoes.Value;
        _logger = logger;
    }

    [HttpPost]
    [AllowAnonymous]
    [IgnoreAntiforgeryToken]
    public async Task<IActionResult> Receber(CancellationToken cancellationToken)
    {
        var payload = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync(cancellationToken);

        Event evento;
        try
        {
            evento = EventUtility.ConstructEvent(
                payload,
                Request.Headers["Stripe-Signature"],
                _opcoes.WebhookSecret);
        }
        catch (StripeException)
        {
            _logger.LogWarning("Webhook com assinatura inválida rejeitado.");
            return BadRequest();
        }

        await _processor.EnfileirarAsync(evento.Id, evento.Type, payload, cancellationToken);

        return Ok();
    }
}
```

Pontos que não são estilo, são requisito:

- **`[AllowAnonymous]`** — o Stripe não tem sessão nem cookie. A autenticação **é** a assinatura.
- **`[IgnoreAntiforgeryToken]`** — antiforgery bloquearia o POST externo.
- **Nunca logue o payload inteiro**: ele contém dado pessoal do titular. Logue `evento.Id` e o tipo.
- O `catch` retorna `BadRequest` **sem detalhe** — não devolva a mensagem da exceção a quem chamou.

## Corpo bruto — a armadilha do ASP.NET Core

A verificação usa o **byte exato** que o Stripe assinou. Se algo reserializar o JSON, a assinatura
falha.

- Não use um parâmetro tipado (`[FromBody] Event evento`) — o model binding consome e reserializa o
  corpo, e a assinatura nunca confere.
- Se algum middleware precisar ler o corpo antes, habilite `EnableBuffering()` e rebobine
  (`Request.Body.Position = 0`) antes de ler aqui.
- **Cuidado com fim de linha.** Se alguma camada converter `\n` em `\r\n`, o HMAC muda e a assinatura
  falha com um payload aparentemente idêntico. É a causa mais frustrante de "assinatura inválida" em
  .NET — desconfie disso antes de suspeitar do segredo.

## Idempotência

O mesmo evento chega repetido por reenvio automático, resposta lenta ou reenvio manual pelo
dashboard. Sem proteção, o cliente ganha dois meses de acesso por um pagamento — ou é cobrado duas
vezes.

Guarde o `event.id` processado e verifique antes de agir:

```csharp
public sealed class EventoStripeProcessado
{
    public string EventoId { get; init; } = null!;   // chave primária: evt_...
    public string Tipo { get; init; } = null!;
    public DateTimeOffset ProcessadoEm { get; init; }
}
```

```csharp
public async Task ProcessarAsync(string eventoId, string tipo, CancellationToken cancellationToken)
{
    if (await _repositorio.JaProcessouAsync(eventoId, cancellationToken))
    {
        _logger.LogInformation("Evento {EventoId} já processado; ignorando.", eventoId);
        return;
    }

    await AplicarEfeitoAsync(tipo, cancellationToken);
    await _repositorio.RegistrarProcessadoAsync(eventoId, tipo, cancellationToken);
}
```

O registro e o efeito devem estar na **mesma transação**. Se o efeito for aplicado e o registro
falhar, o reenvio duplica; a chave primária em `EventoId` é a última linha de defesa contra corrida
entre duas entregas simultâneas.

## Não existe garantia de ordem

O Stripe **não garante** a ordem de entrega. Numa assinatura nova, `customer.subscription.created`,
`invoice.paid` e `checkout.session.completed` chegam em qualquer sequência — e o "cancelamento" pode
chegar antes da "criação".

Consequências no código:

- Não escreva máquina de estados que dependa da sequência de chegada.
- Ao receber um evento, **consulte o objeto atual na API** se precisar do estado real, em vez de
  deduzir pelo histórico de eventos recebidos.
- Ignore evento mais antigo que o estado que você já tem — compare por data do objeto, não por ordem
  de chegada.

## Responda antes de processar

Processar de forma síncrona antes do `Ok()` é o erro que gera duplicidade: se o processamento demora,
o Stripe considera falha e reenvia — enquanto o primeiro ainda está rodando.

O padrão é: verificar assinatura → **enfileirar** → responder 200. O trabalho pesado (liberar acesso,
enviar e-mail, emitir nota) acontece fora do request. Um `BackgroundService` com fila, ou uma tabela
de eventos pendentes consumida por worker, resolve — não precisa de infraestrutura de mensageria para
um SaaS pequeno.

## Eventos que importam

Assine **só** o que você trata. Assinar tudo enche o log de ruído e esconde o que importa.

| Evento | Quando age |
|---|---|
| `checkout.session.completed` | Checkout concluído — com cartão, libera acesso |
| `checkout.session.async_payment_succeeded` | **Pix/boleto confirmado** — só aqui libera acesso |
| `checkout.session.async_payment_failed` | Pix/boleto não pago; cancele a expectativa |
| `customer.subscription.created` | Assinatura criada |
| `customer.subscription.updated` | Mudança de plano, status, período — o mais importante |
| `customer.subscription.deleted` | Assinatura encerrada; corte o acesso |
| `invoice.paid` | Renovação paga; estenda o período |
| `invoice.payment_failed` | Falha de cobrança; entra em `past_due` |

**Com Pix e boleto, `checkout.session.completed` não significa pago** — significa que o cliente
concluiu o checkout e recebeu o código. O dinheiro só existe em `async_payment_succeeded`. Liberar
acesso no evento errado é prejuízo direto, e é o erro mais caro desta skill.

## Estado local espelha o Stripe

Espelhe os status do Stripe, não invente os seus:

| Status Stripe | Significado | Acesso |
|---|---|---|
| `trialing` | Em período de teste | Liberado |
| `active` | Em dia | Liberado |
| `past_due` | Falhou, em recobrança | Conforme regra de negócio |
| `canceled` | Encerrada | Bloqueado |
| `incomplete` | Primeiro pagamento não concluído | Bloqueado |

Inventar status próprio (`aguardando`, `suspenso_manual`) cria um mapeamento que diverge com o tempo.
Se precisar de estado extra, mantenha-o **em campo separado**, sem sobrescrever o espelho.

## Teste local

A Stripe CLI entrega os eventos na sua máquina sem expor porta:

```bash
stripe login
stripe listen --forward-to https://localhost:5001/webhooks/stripe
# imprime o whsec_... desta sessão — use como WebhookSecret local

stripe trigger checkout.session.completed
stripe trigger invoice.payment_failed
```

O `whsec_` do `stripe listen` é **diferente** do segredo do endpoint do dashboard. Confundir os dois
gera "assinatura inválida" com código correto.

Teste também o reenvio do mesmo evento — é assim que se prova a idempotência.

## Checklist

- [ ] Assinatura verificada com `EventUtility.ConstructEvent`.
- [ ] Corpo lido bruto, sem `[FromBody]` nem reserialização.
- [ ] `[AllowAnonymous]` e `[IgnoreAntiforgeryToken]` presentes.
- [ ] `event.id` registrado; reprocessamento é no-op.
- [ ] Efeito e registro de idempotência na mesma transação.
- [ ] Responde 2xx antes do trabalho pesado.
- [ ] Nenhuma lógica dependente de ordem de chegada.
- [ ] Pix/boleto libera acesso só em `async_payment_succeeded`.
- [ ] Payload não é logado; segredo vem de variável de ambiente.
- [ ] Testado com `stripe listen`, incluindo reenvio.

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| "Assinatura inválida" com código certo | `whsec_` do CLI vs. do dashboard | Usar o segredo do ambiente correspondente |
| Assinatura falha só em produção | Middleware ou proxy alterou o corpo | Ler bruto; conferir `\r\n` vs `\n` |
| Cliente com acesso dobrado | Evento processado duas vezes | Idempotência por `event.id` |
| Acesso liberado sem pagamento | Liberou em `completed` com Pix | Usar `async_payment_succeeded` |
| Estado oscila entre ativo e cancelado | Código assume ordem de eventos | Consultar o objeto atual na API |
| Stripe marca endpoint como falho | Processamento síncrono demorado | Enfileirar e responder 200 antes |
