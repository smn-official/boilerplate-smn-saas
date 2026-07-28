---
name: stripe-modelagem
description: O que persistir de uma integração Stripe — identificadores, espelho de status, tabela de idempotência de eventos, o agregado Assinatura no Core, configuração de EF Core e os limites de LGPD sobre dado de pagamento e retenção fiscal. Use ao criar schema de cobrança, entidade de assinatura, migration de billing ou revisar o que está sendo guardado.
agent: stripe-agent
---

# Modelagem — o que o banco guarda

Cobrança envolve dado pessoal, então [`lgpd-agent`](../../agents/lgpd-agent.md) entra **antes** deste
schema: finalidade e base legal vêm primeiro, como em qualquer campo pessoal.

## O princípio

O seu banco guarda **referência e estado**, nunca instrumento de pagamento. O Stripe é a fonte da
verdade sobre dinheiro; o local é réplica para consulta rápida, que pode estar momentaneamente
desatualizada.

| Guarda | Nunca guarda |
|---|---|
| `cus_…`, `sub_…`, `pi_…` | Número do cartão, CVC, validade |
| Status, plano, início e fim do período | Payload bruto do webhook |
| Últimos 4 dígitos e bandeira (exibição) | Dados do titular replicados sem necessidade |
| `evt_…` processado (idempotência) | Token de pagamento fora do Stripe |

Guardar número de cartão coloca o sistema no escopo pesado de PCI DSS e é, na prática, indefensável:
o Stripe existe justamente para você não precisar.

## O agregado, em Core

```csharp
// Core/Models/Aggregates/Assinatura/Assinatura.cs — sem nenhum tipo do Stripe
public sealed class Assinatura
{
    public Guid Id { get; private set; }
    public Guid ClienteId { get; private set; }

    public string ClienteExternoId { get; private set; } = null!;      // cus_...
    public string AssinaturaExternaId { get; private set; } = null!;   // sub_...
    public string PlanoExternoId { get; private set; } = null!;        // price_...

    public StatusAssinatura Status { get; private set; }
    public DateTimeOffset PeriodoAtualFim { get; private set; }
    public DateTimeOffset? CanceladaEm { get; private set; }
    public bool CancelaNoFimDoPeriodo { get; private set; }

    public bool PermiteAcesso(DateTimeOffset agora) =>
        Status is StatusAssinatura.Ativa or StatusAssinatura.EmTeste
        || (Status is StatusAssinatura.Inadimplente && agora <= PeriodoAtualFim);

    public void Sincronizar(
        StatusAssinatura status,
        DateTimeOffset periodoFim,
        bool cancelaNoFimDoPeriodo)
    {
        Status = status;
        PeriodoAtualFim = periodoFim;
        CancelaNoFimDoPeriodo = cancelaNoFimDoPeriodo;
    }
}
```

Os campos são `string` de identificador externo, não tipos do Stripe. `PermiteAcesso` é a invariante
que justifica o agregado existir — sem ela, isso seria só um DTO.

`Sincronizar` reflete o que veio do webhook. O domínio não decide o status: o Stripe decide, o
domínio decide o que **fazer** com ele.

## Status espelhado

```csharp
public enum StatusAssinatura
{
    Incompleta,      // incomplete
    EmTeste,         // trialing
    Ativa,           // active
    Inadimplente,    // past_due
    Cancelada,       // canceled
}
```

Persistido como **string** (`HasConversion<string>()`), conforme o [AGENTS.md](../../../AGENTS.md):
inteiro no banco vira enigma quando alguém lê a tabela direto, e reordenar o enum corrompe dado
existente.

## Idempotência de evento

```csharp
public sealed class EventoStripeProcessado
{
    public string EventoId { get; init; } = null!;    // evt_... — chave primária
    public string Tipo { get; init; } = null!;
    public DateTimeOffset ProcessadoEm { get; init; }
}
```

`EventoId` como **chave primária**, não índice comum: é a garantia contra corrida entre duas entregas
simultâneas do mesmo evento — o banco rejeita a segunda inserção.

Não guarde o payload. Ele contém dado pessoal do titular e cria uma cópia paralela fora da sua
política de retenção, o que [`dados-pessoais-modelagem`](../dados-pessoais-modelagem/SKILL.md) veda.

Expurgue registros antigos (90 dias resolve): a proteção só importa na janela de reenvio, que é de
dias.

## Configuração EF Core

```csharp
// Data/Configurations/AssinaturaConfiguration.cs
public sealed class AssinaturaConfiguration : IEntityTypeConfiguration<Assinatura>
{
    public void Configure(EntityTypeBuilder<Assinatura> builder)
    {
        builder.ToTable("assinatura");
        builder.HasKey(a => a.Id);

        builder.Property(a => a.ClienteExternoId).HasMaxLength(64).IsRequired();
        builder.Property(a => a.AssinaturaExternaId).HasMaxLength(64).IsRequired();
        builder.Property(a => a.PlanoExternoId).HasMaxLength(64).IsRequired();

        builder.Property(a => a.Status)
               .HasConversion<string>()
               .HasMaxLength(20)
               .IsRequired();

        builder.HasIndex(a => a.AssinaturaExternaId).IsUnique();
        builder.HasIndex(a => a.ClienteId);
    }
}
```

Índice **único** em `AssinaturaExternaId`: é por ele que o webhook encontra o registro, e duplicata
significa estado divergente. O índice em `ClienteId` serve à pergunta "esse cliente tem acesso?",
feita a cada request.

Nomes de coluna por extenso, sem abreviação — regra do [AGENTS.md](../../../AGENTS.md).

## LGPD — o que é específico de pagamento

**Retenção fiscal vence pedido de exclusão.** O titular pede exclusão, mas registro de transação tem
guarda obrigatória por prazo legal. Isso é hipótese do art. 16 da LGPD — conservação para
cumprimento de obrigação legal — e precisa estar documentado na política de retenção, não decidido
caso a caso. Ver [`retencao-descarte`](../retencao-descarte/SKILL.md) e
[`direitos-titular`](../direitos-titular/SKILL.md).

Na prática: anonimize o que é pessoal e **preserve** o registro contábil. Apagar a linha inteira pode
descumprir obrigação fiscal; manter nome e e-mail indefinidamente descumpre a LGPD.

**Não replique o cadastro do Stripe.** Guarde o `cus_…` e consulte quando precisar. Cada cópia de
dado pessoal é mais superfície de vazamento e mais um lugar a atualizar quando o titular pedir
correção.

**Nunca logue identificador junto de dado pessoal.** `sub_1234` num log é aceitável; `sub_1234` ao
lado de nome, e-mail e valor pago transforma o log em base de dados pessoais fora de controle —
exatamente o que [`dados-pessoais-modelagem`](../dados-pessoais-modelagem/SKILL.md) proíbe.

## Reconciliação

Estado local diverge: webhook perdido, processamento com erro, mudança feita direto no dashboard.
Uma rotina periódica que compara assinaturas ativas com a API e corrige a divergência **a favor do
Stripe** paga o próprio custo — sem ela, a divergência só aparece quando um cliente reclama.

## Checklist

- [ ] Nenhum dado de cartão persistido.
- [ ] `Core` sem tipos do Stripe; identificadores como `string`.
- [ ] Status como enum espelhado, persistido como string.
- [ ] `EventoId` é chave primária da tabela de idempotência.
- [ ] Payload de webhook não é persistido.
- [ ] Índice único em `AssinaturaExternaId`; índice em `ClienteId`.
- [ ] Política de retenção cobre o conflito exclusão × obrigação fiscal.
- [ ] `lgpd-agent` consultado antes da migration.
- [ ] Log não junta identificador com dado pessoal.
