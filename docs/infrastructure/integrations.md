# Integrações externas

> **Template do boilerplate.** Preencha ao implementar e remova este aviso.

Todo sistema externo que este projeto chama — gateway de pagamento, provedor de e-mail, API de
terceiro, serviço interno de outro time. O documento registra **o contrato**, não o cliente HTTP: o
que o projeto espera receber, o que faz quando não recebe, e quem é responsável pelo quê.

## Ações que só o usuário pode fazer — norma

Parte de qualquer integração externa **só o usuário pode executar**: criar conta, aceitar termos,
gerar chave de API, autorizar OAuth, criar recurso em painel de terceiro. Código sem essas
credenciais não roda.

Quando faltar uma delas, **não presuma que existe, não invente valor e não siga adiante**. O
procedimento é guiar o usuário:

- **Uma etapa por vez**, confirmando antes da próxima.
- Diga **onde clicar**, não só o que obter.
- **Nunca peça segredo colado no chat.** Peça para colar no `.env`. Se vier mesmo assim, avise que
  deve ser considerado comprometido e rotacionado.
- Confirme o **formato**, não o valor: "começa com `sk_test_`?" basta.
- Ao final, **valide junto** — um comando que prova que funcionou vale mais que suposição.

Isso não é cerimônia. Um agente que inventa uma chave plausível produz um sistema que compila, sobe,
e falha no primeiro uso real — no ambiente onde o erro custa mais caro.

*Para cada integração deste projeto, registre abaixo quais passos são do usuário e onde a
documentação do terceiro os descreve.*

## Integrações deste projeto

*Preencha uma linha por integração.*

| Integração | Papel no produto | Contrato em `Core` | Implementação em `Data` | Fallback | Segredo |
|---|---|---|---|---|---|
| | | `I<Servico>Client` | `<Servico>Client` | `<Servico>ClientDesabilitado` | `<Servico>__SecretKey` |

## Contrato na fronteira — norma

**Uma interface em `Core`, duas implementações em `Data`, escolha na composição.**

```text
Core/Interfaces/Services/I<Servico>Client.cs        o contrato — o que o domínio precisa
Data/Integracoes/<Servico>Client.cs                 a implementação real, com HTTP e SDK
Data/Integracoes/<Servico>ClientDesabilitado.cs     o fallback inerte
Data/Extensions/Servicos<Modulo>Extensions.cs       a escolha, em um único lugar
```

O contrato é escrito na **linguagem do domínio**, não na do terceiro. Ele descreve o que o negócio
precisa — "cobrar", "notificar", "consultar situação" — e não expõe `HttpResponseMessage`, DTO do
SDK, nem código de erro do fornecedor.

```csharp
// ❌ O tipo do terceiro vazou para o Core; trocar de fornecedor reescreve o domínio.
Task<StripeSessionResponse> CriarSessaoAsync(StripeSessionRequest request, CancellationToken ct);

// ✅ Contrato de domínio; o fornecedor é detalhe de Data.
Task<ResultadoCobrancaDto> CobrarAsync(SolicitarCobrancaDto dto, CancellationToken cancellationToken);
```

O teste disso é direto: **se trocar de fornecedor exigir mudar algum arquivo em `Core`, a fronteira
está no lugar errado.**

## Fallback

**Norma:** toda integração externa tem uma implementação inerte, e a escolha entre real e inerte fica
na extensão de DI — nunca num `if` dentro do domínio.

```csharp
private static void Adicionar<Servico>(IServiceCollection services, IConfiguration configuration)
{
    var secao = configuration.GetSection(<Servico>Settings.SecaoConfiguracao);
    services.Configure<<Servico>Settings>(secao);

    var settings = secao.Get<<Servico>Settings>();
    var habilitado = settings is { Enabled: true } && !string.IsNullOrWhiteSpace(settings.SecretKey);

    if (habilitado)
    {
        services.AddScoped<I<Servico>Client, <Servico>Client>();

        return;
    }

    services.AddScoped<I<Servico>Client, <Servico>ClientDesabilitado>();
}
```

O fallback é no-op, ou apenas registra em log quando em Development. O ganho concreto: **qualquer
pessoa clona o repositório e roda a aplicação sem nenhuma credencial de terceiro.** Sem isso, o
onboarding depende de provisionar cinco contas antes da primeira tela abrir.

O critério de habilitação combina flag **e** credencial preenchida. Flag ligada com chave vazia é a
configuração que passa na revisão e falha em produção.

## Timeout

**Norma:** nenhuma chamada externa sem timeout explícito.

Cliente HTTP sem timeout configurado herda o padrão do runtime — longo o bastante para que um
terceiro lento consuma o pool de conexões e derrube a aplicação inteira por um serviço secundário.

| Decisão | Orientação |
|---|---|
| Timeout de conexão e de resposta | Explícito, na casa de segundos |
| Timeout maior que o do cliente da aplicação | Inútil — o usuário já desistiu |
| Retry | Só para falha **transitória** e operação **idempotente** |
| Backoff | Exponencial com jitter; retry imediato em rajada agrava a queda do terceiro |
| Número de tentativas | Baixo; retry infinito transforma indisponibilidade em amplificação |
| Circuit breaker | Quando o terceiro é chamado com frequência alta |

O `CancellationToken` do request é **propagado até a chamada externa** — última posição na
assinatura, como manda a convenção. Sem isso, o usuário fecha a aba e o servidor continua esperando.

*Registre aqui os timeouts efetivos de cada integração e por que esses números.*

## Idempotência

Rede falha no meio. Quando a resposta não chega, o cliente não sabe se a operação aconteceu — e
repetir sem cuidado cobra o cliente duas vezes.

| Direção | Mecanismo |
|---|---|
| **Saída** (chamamos o terceiro) | Chave de idempotência por operação de negócio, estável entre tentativas |
| **Entrada** (o terceiro nos chama) | Tabela de eventos processados, com o id do evento como chave única |

Regras para webhook recebido:

- **Verifique a assinatura** antes de qualquer processamento, sobre o **corpo bruto**.
- **Responda 2xx rápido**, e processe depois. Terceiro que não recebe 2xx reenvia.
- **Deduplique pelo id do evento** — reenvio é o comportamento normal, não a exceção.
- **Não presuma ordem.** O evento de conclusão pode chegar antes do de criação.
- Compare assinatura em **tempo constante** — ver [authentication.md](authentication.md).

A chave de idempotência de saída deriva da **operação de negócio**, não de um `Guid.NewGuid()` gerado
a cada tentativa — senão cada retry vira uma operação nova, que é exatamente o que se quis evitar.

## Segredo por variável de ambiente

**Norma:** credencial de terceiro **nunca** entra no `appsettings.json`. Vai para `.env` em
desenvolvimento e para Key Vault / App Settings nos demais ambientes.

O endereço público da API **não** é segredo e fica no `appsettings.json`, versionado; a credencial
dela é. A regra completa e o formato dos nomes estão em [configuration.md](configuration.md).

```bash
# .env — só a forma, nunca o valor real, no .env.example
<Servico>__SecretKey=
<Servico>__WebhookSecret=
```

Toda variável do `.env` existe no `.env.example`, com placeholder que **não parece valor real**. E
segredo commitado se resolve **rotacionando primeiro** — remover do histórico depois; ver
[configuration.md](configuration.md).

Ambiente de desenvolvimento usa **credencial de teste**, sempre. Chave de produção numa máquina local
cobra dinheiro real e envia e-mail real para pessoas reais.

## Quando o terceiro cai

Indisponibilidade de terceiro não é exceção — é estado previsto. O que o sistema faz precisa ser uma
decisão registrada, não o que acontecer por acaso.

Para cada integração, responda:

| Pergunta | Resposta esperada |
|---|---|
| A operação é **essencial** ou **acessória**? | Essencial bloqueia o fluxo; acessória degrada em silêncio |
| O usuário percebe? | Mensagem clara sobre o que aconteceu e o que fazer |
| Pode ser adiada? | Fila e reprocessamento, se a semântica permitir |
| O estado local fica consistente? | Nunca marque como concluído o que não confirmou |
| Como se reconcilia depois? | Rotina que compara estado local e do terceiro |
| Como se descobre? | Alerta sobre taxa de erro, não relato de usuário |

Dois erros recorrentes:

- **Marcar sucesso otimista.** Gravar "pago" porque a chamada foi enviada, sem confirmação, cria
  divergência que ninguém descobre até a conciliação.
- **Derrubar o fluxo inteiro por integração acessória.** Se o envio de e-mail de boas-vindas falha, o
  cadastro não deve falhar junto.

Registre a falha em `Warning` — situação recuperável ou degradada, fallback acionado — com log
estruturado e **sem** o segredo da chamada. Ver
[`observabilidade`](../../.ai/skills/observabilidade/SKILL.md).

*Preencha aqui, por integração, o comportamento acordado na indisponibilidade.*

## Testes

| Nível | O que cobrir |
|---|---|
| Unitário | Serviço que consome o contrato, com o cliente **mockado** |
| Unitário | O fallback faz o que promete: não lança, não altera estado |
| Integração | Verificação de assinatura de webhook, com payload real capturado |
| Integração | Deduplicação: o mesmo evento processado duas vezes gera um efeito |

Não teste o SDK do terceiro — ele tem suíte própria. Teste **o seu contrato** e **o seu
comportamento na falha**, que é onde os defeitos realmente moram.

## Segurança

- **SSRF:** nunca monte URL de saída a partir de entrada do usuário sem lista de permissão.
- **Payload recebido é entrada não confiável** — valide antes de persistir, mesmo vindo de parceiro.
- **Nada de dado de cartão** trafegando ou persistindo no sistema.
- **Nunca logue** corpo de requisição que contenha credencial ou dado pessoal.
- Compartilhar dado pessoal com terceiro exige base legal e entra no registro de operações de
  tratamento — ver [`principios-lgpd`](../../.ai/skills/principios-lgpd/SKILL.md).

Auditoria completa em [`owasp-web`](../../.ai/skills/owasp-web/SKILL.md).

## Checklist para uma integração nova

- [ ] Contrato declarado em `Core/Interfaces/Services`, na linguagem do domínio.
- [ ] Implementação real e fallback inerte, ambos em `Data/Integracoes`.
- [ ] Escolha entre os dois na extensão de DI, por flag **e** credencial preenchida.
- [ ] Timeout explícito; retry só se transitório e idempotente; backoff com jitter.
- [ ] `CancellationToken` propagado até a chamada externa.
- [ ] Idempotência definida nas duas direções.
- [ ] Webhook com assinatura verificada sobre corpo bruto, resposta 2xx rápida, deduplicação por id.
- [ ] Segredo apenas em `.env` / Key Vault; `.env.example` atualizado com a forma, não o valor.
- [ ] Credencial de teste em desenvolvimento.
- [ ] Comportamento na indisponibilidade decidido e documentado.
- [ ] Log estruturado da falha, sem segredo nem dado pessoal.
- [ ] Passos manuais do usuário registrados neste documento.
