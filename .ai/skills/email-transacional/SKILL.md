---
name: email-transacional
description: Envio de e-mail transacional — contrato IEnviadorDeEmail em Core, implementação real e EnviadorDeEmailDesabilitado em Data com escolha por flag na DI, falha do provedor que não pode derrubar o caso de uso, idempotência no reenvio, template sem segredo nem dado pessoal desnecessário e ambiente local sem credencial. Use ao enviar OTP, confirmação, recuperação de acesso ou qualquer notificação por e-mail, e ao revisar quem chama o envio.
agent: net10-agent
---

# E-mail transacional

E-mail é **integração externa**, não utilitário. Vale para ele o padrão da seção 5.3 de
[estrutura-arquitetura.md](../../docs/estrutura-arquitetura.md): contrato em `Core`, implementação
real e desabilitada em `Data`, escolha na composição.

O fluxo de OTP de [`autenticacao-autorizacao`](../autenticacao-autorizacao/SKILL.md) depende deste
canal: sem envio não há login. Isso torna as decisões daqui parte do caminho crítico, não detalhe.

## A regra que não se quebra

**Falha de envio não invalida o caso de uso.** O provedor de e-mail cai, estoura timeout, aplica
rate limit e devolve bounce — tudo isso é normal, não excepcional. Um pedido confirmado, um cadastro
criado e um OTP emitido continuam válidos mesmo que a mensagem não saia.

```csharp
// ❌ A exceção do provedor sobe, a transação é desfeita e o usuário perde o cadastro concluído.
await _repositorio.SalvarAlteracoesAsync(cancellationToken);
await _enviador.EnviarAsync(mensagem, cancellationToken);

// ✅ O caso de uso fecha; o envio é enfileirado e falha isoladamente.
await _repositorio.SalvarAlteracoesAsync(cancellationToken);
await _filaDeEmail.EnfileirarAsync(mensagem, cancellationToken);
```

Enfileirar significa gravar a intenção de envio e deixar uma tarefa de fundo despachar — ver
[`tarefas-em-segundo-plano`](../tarefas-em-segundo-plano/SKILL.md). O OTP é a exceção que confirma a
regra: ele não tem valor se não chegar, então o usuário precisa saber que houve falha — mas a
mensagem para ele é "não conseguimos enviar, tente novamente", nunca um erro 500 com o cadastro
perdido no meio.

## O contrato em Core

Na linguagem do domínio, não na do fornecedor. `Core` não conhece SMTP, HTTP nem nome de serviço.

```csharp
public interface IEnviadorDeEmail
{
    Task<ResultadoDeEnvioDto> EnviarAsync(MensagemDeEmailDto mensagem, CancellationToken cancellationToken);
}

public sealed record MensagemDeEmailDto(
    string Destinatario,
    string Assunto,
    string CorpoHtml,
    string CorpoTexto,
    string ChaveDeIdempotencia);

public sealed record ResultadoDeEnvioDto(bool Enviado, string? MotivoDaFalha);
```

Sinais de contrato vazado: parâmetro `SmtpClient`, `MailMessage`, `MimeMessage`, nome de provedor no
tipo, ou `Task` sem resultado quando o chamador precisa saber se saiu. Se `Core` compila com o
pacote do fornecedor removido, o contrato está certo.

Retornar resultado em vez de lançar é deliberado: o chamador decide o que fazer com a falha, e
esquecer um `try/catch` não derruba mais nada.

## As duas implementações em Data

```csharp
public sealed class EnviadorDeEmailSmtp(
    IOptions<EmailSettings> opcoes,
    ILogger<EnviadorDeEmailSmtp> logger) : IEnviadorDeEmail
{
    public async Task<ResultadoDeEnvioDto> EnviarAsync(
        MensagemDeEmailDto mensagem,
        CancellationToken cancellationToken)
    {
        try
        {
            await DespacharAsync(mensagem, cancellationToken);

            return new ResultadoDeEnvioDto(true, null);
        }
        catch (Exception excecao) when (excecao is not OperationCanceledException)
        {
            logger.LogError(excecao, "Falha ao enviar e-mail {Chave}.", mensagem.ChaveDeIdempotencia);

            return new ResultadoDeEnvioDto(false, "Falha no provedor de e-mail.");
        }
    }
}
```

```csharp
public sealed class EnviadorDeEmailDesabilitado(
    ILogger<EnviadorDeEmailDesabilitado> logger,
    IHostEnvironment ambiente) : IEnviadorDeEmail
{
    public Task<ResultadoDeEnvioDto> EnviarAsync(
        MensagemDeEmailDto mensagem,
        CancellationToken cancellationToken)
    {
        if (ambiente.IsDevelopment())
        {
            logger.LogInformation(
                "E-mail não enviado (canal desabilitado) | Assunto: {Assunto}",
                mensagem.Assunto);
        }

        return Task.FromResult(new ResultadoDeEnvioDto(true, null));
    }
}
```

O fallback devolve `Enviado: true` de propósito: ele não é uma falha, é a ausência deliberada do
canal. Devolver `false` faria todo fluxo local parecer quebrado.

Note o que o log **não** tem: destinatário, corpo, código. Assunto e chave bastam para depurar, e
nenhum dos dois é dado pessoal — ver [`observabilidade`](../observabilidade/SKILL.md).

## Escolha na DI

```csharp
private static void AdicionarEmail(IServiceCollection services, IConfiguration configuration)
{
    var secao = configuration.GetSection(EmailSettings.SecaoConfiguracao);
    services.Configure<EmailSettings>(secao);

    var settings = secao.Get<EmailSettings>();
    var habilitado = settings is { Enabled: true } && !string.IsNullOrWhiteSpace(settings.Senha);

    if (habilitado)
    {
        services.AddScoped<IEnviadorDeEmail, EnviadorDeEmailSmtp>();

        return;
    }

    services.AddScoped<IEnviadorDeEmail, EnviadorDeEmailDesabilitado>();
}
```

Host, porta, remetente e `Enabled` vão no `appsettings.json`; **só a senha vai no `.env`**
(`Email__Senha`) — regra de [`configuracao.md`](../../docs/configuracao.md) e de
[`segredos-configuracao`](../segredos-configuracao/SKILL.md).

Consequência que fecha o requisito de ambiente local: **clonar o repositório e rodar `dotnet run`
sem `.env` de e-mail precisa funcionar**. Sem credencial, a flag não liga, o fallback entra, e o
login por OTP continua testável lendo o código do log em Development.

## O que nunca vai no corpo

| Nunca | Por quê |
|---|---|
| Senha, em qualquer forma | E-mail trafega e repousa em servidor de terceiro, em claro |
| Token de sessão, chave de API, link com credencial na URL | Vaza no histórico, no proxy e no encaminhamento |
| Dado pessoal além do necessário para a mensagem fazer sentido | Minimização — art. 6, III da LGPD |
| Dado sensível (saúde, biometria, origem racial) | Art. 11; canal sem garantia de confidencialidade |
| Anexo com relatório de outro titular | Vazamento clássico por engano de destinatário |

O OTP é o caso limite: ele **precisa** ir no corpo, senão não há fluxo. O que não pode é persistir:
o código vai em claro na mensagem, mas no banco só existe hash com salt e pepper
([`autenticacao-autorizacao`](../autenticacao-autorizacao/SKILL.md)), e a mensagem renderizada não é
guardada em log, tabela de auditoria nem tabela de fila. Guarde a intenção de envio, não o conteúdo.

Detalhes que evitam problema: validade explícita no corpo ("expira em 10 minutos"), instrução de
descarte se não foi o usuário quem pediu, e nenhum dado da conta além do necessário para reconhecer
o pedido.

## Template

Um tipo por mensagem, com os dados vindos de um DTO — nunca concatenação de HTML com entrada do
usuário, que é XSS em cliente de e-mail.

```csharp
public interface IRenderizadorDeEmail
{
    Task<MensagemDeEmailDto> RenderizarAsync<TModelo>(
        string template,
        TModelo modelo,
        CancellationToken cancellationToken);
}
```

Regras práticas: sempre versão texto além da HTML (cliente corporativo bloqueia HTML), assunto sem
dado pessoal (aparece na notificação do celular, na tela bloqueada), e remetente configurado, nunca
literal no código.

## Idempotência

Retry acontece: a tarefa de fundo reexecuta, o usuário clica duas vezes, o deploy reinicia o
processo no meio do despacho. Sem chave, cada um vira uma cópia na caixa do usuário.

```csharp
public sealed class EmailPendente
{
    public Guid Id { get; init; }
    public string ChaveDeIdempotencia { get; init; } = null!;   // índice único
    public DateTimeOffset? EnviadoEm { get; private set; }
    public int Tentativas { get; private set; }
}
```

A chave é **derivada do fato**, não aleatória: `otp:{solicitacaoId}`, `pedido-confirmado:{pedidoId}`.
Aleatória não deduplica nada — cada retry gera outra.

- Índice único na chave: é o que sobrevive a duas instâncias despachando ao mesmo tempo.
- Marque `EnviadoEm` **depois** do sucesso; marcar antes perde a mensagem numa falha.
- Marcar depois admite envio duplicado se o processo morrer entre despacho e gravação. É o lado
  certo do trade-off: duplicar um e-mail incomoda, perder um OTP bloqueia o acesso.
- Limite de tentativas com espera crescente, e uma tentativa final que registra desistência. Retry
  infinito contra provedor com rate limit piora o bloqueio.

## Bounce e reputação

Endereço inválido, caixa cheia e domínio inexistente devolvem bounce. Insistir queima a reputação do
remetente e leva todo o domínio para spam — inclusive os OTPs que funcionavam.

Marque o endereço com bounce permanente e pare de enviar até o usuário corrigir. Não é regra de
domínio: é dado operacional do canal, e vive junto do registro de envio.

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Cadastro perdido quando o SMTP cai | Envio dentro da transação do caso de uso | Persistir, enfileirar, despachar fora do request |
| `Core` não compila sem o pacote de e-mail | Contrato na linguagem do fornecedor | Contrato em termos de domínio; tipos do provedor só em `Data` |
| Projeto novo não roda sem credencial | Sem implementação desabilitada | `EnviadorDeEmailDesabilitado` escolhido pela flag na DI |
| Usuário recebe o mesmo e-mail 4 vezes | Retry sem chave de idempotência | Chave derivada do fato, com índice único |
| OTP aparece no log de produção | Corpo renderizado sendo logado | Logue assunto e chave; conteúdo nunca |
| Domínio caiu em spam | Retry infinito sobre bounce permanente | Marcar o endereço e parar de tentar |
| Senha de SMTP no `appsettings.json` | Segredo versionado | Só `Email__Senha` no `.env`; o resto no JSON |
