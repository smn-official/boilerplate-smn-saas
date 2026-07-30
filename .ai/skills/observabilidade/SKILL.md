---
name: observabilidade
description: Logging e telemetria com Azure Application Insights em .NET 10 — registro do SDK, ILogger estruturado, níveis, enriquecimento por usuário, amostragem e custo. Use ao configurar telemetria, adicionar log ou diagnosticar comportamento em produção.
agent: net10-agent
---

# Observabilidade — Azure Application Insights

**Obrigatório em todo projeto.** Sem telemetria centralizada não há diagnóstico de produção:
`Console.WriteLine` e log em arquivo não sobrevivem a um App Service reiniciado ou escalado
horizontalmente.

## Registro

Registre **cedo** no `Program.cs`, antes das demais dependências, para capturar exceção do próprio
startup:

```xml
<PackageReference Include="Microsoft.ApplicationInsights.AspNetCore" Version="<versao>" />
```

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplicationInsightsTelemetry(options =>
{
    options.ConnectionString = builder.Configuration["ApplicationInsights:ConnectionString"];
    options.EnableAdaptiveSampling = true;
});

builder.Services.ConfigureTelemetryModule<DependencyTrackingTelemetryModule>(
    (module, _) => module.EnableSqlCommandTextInstrumentation = false);
```

- Sempre **`ConnectionString`**, nunca `InstrumentationKey` — descontinuada, sem suporte a endpoints
  regionais.
- `EnableSqlCommandTextInstrumentation` **desligado**: o texto do SQL pode conter dado pessoal.

## Configuração

```bash
# .env.example — em Azure App Service, prefira injetar via App Settings do serviço
ApplicationInsights__ConnectionString=InstrumentationKey=<guid>;IngestionEndpoint=https://<regiao>.in.applicationinsights.azure.com/
```

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.EntityFrameworkCore.Database.Command": "Warning"
    },
    "ApplicationInsights": { "LogLevel": { "Default": "Information" } }
  }
}
```

Connection string **vazia** → o SDK não envia e o startup **não falha**. O projeto roda local sem
recurso Azure provisionado. Cada ambiente usa um **recurso próprio** — telemetria de homologação não
pode poluir alerta de produção.

## Como logar

**`ILogger<T>` injetado, nunca a API do SDK.** Isso mantém o domínio dependendo apenas de
`Microsoft.Extensions.Logging.Abstractions` — o destino é decidido na composição.

```csharp
public class <Entidade>Service(
    I<Entidade>Repository repository,
    ILogger<<Entidade>Service> logger) : I<Entidade>Service
{
    public async Task SalvarAsync(Salvar<Entidade>Dto dto, CancellationToken cancellationToken)
    {
        logger.LogInformation(
            "Salvando <entidade> {Codigo} no contexto {IdContexto}.",
            dto.Codigo,
            dto.IdContexto);
    }
}
```

### Regras

- **Sempre logging estruturado** — placeholder nomeado (`{Codigo}`), nunca interpolação de string.
  Interpolação destrói a consulta por dimensão no Kusto.
- **Nunca logar segredo ou dado pessoal**: senha, token, código de acesso, chave de API, documento,
  cartão. Em Development um código de uso único pode ir ao log; em produção, jamais.
- **Não logar e relançar** a mesma exceção. Registre onde ela é tratada, uma única vez.
- Exceção não tratada já é capturada pelo SDK — não duplique com `try/catch` que só loga.

## Quando logar

**Não existe regra de "todo fluxo emite log".** Requisição, status, duração, consulta ao banco,
chamada externa e exceção não tratada já chegam ao Application Insights sem uma linha de `ILogger` —
ver [Coletado automaticamente](#coletado-automaticamente). Log manual repetindo isso não acrescenta
dimensão nenhuma: custa ingestão, polui a consulta e some na amostragem junto com o resto.

O critério é **o que a telemetria automática não consegue afirmar**. Logue explicitamente quando o
evento for um destes:

| Evento | Nível | Por que a coleta automática não basta |
|---|---|---|
| Efeito externo irreversível concluído | `Information` | E-mail enviado, cobrança criada, arquivo publicado. O SDK vê a chamada HTTP de saída; não sabe que ela representa dinheiro ou uma mensagem que não volta atrás |
| Fallback acionado | `Warning` | A operação retorna `200` e a requisição parece sadia. Sem log não há como saber que rodou em modo degradado |
| Autorização negada | `Warning` | O `403` aparece, mas não *quem* tentou acessar *o quê* — e é isso que distingue erro de navegação de varredura |
| Decisão automática que o usuário vai contestar | `Information` | Plano trocado, acesso revogado, registro expurgado por retenção. Sem trilha, a pergunta "por que isso mudou?" não tem resposta |
| Transição de estado de assinatura | `Information` | Origem em webhook, fora de qualquer requisição do usuário; reconciliar depois exige o registro |
| Falha que o código tratou e engoliu | `Error` ou `Warning` | Exceção capturada não sobe para o SDK. Se o `catch` decide o rumo e não loga, o incidente é invisível |

E **não logue**:

- Entrada e saída de service ou controller — é a requisição HTTP, já coletada.
- Sucesso de leitura, listagem ou consulta.
- `DomainException` tratada: é validação de negócio, não incidente. Detalhe em
  [`tratamento-erro-global`](../tratamento-erro-global/SKILL.md).
- Qualquer coisa dentro de laço sobre N itens — logue o resultado do lote, não a iteração.

```csharp
public async Task<bool> PublicarAsync(PublicarDto dto, CancellationToken cancellationToken)
{
    if (!await autorizacao.PodePublicarAsync(dto.IdContexto, cancellationToken))
    {
        logger.LogWarning(
            "Publicação negada para o contexto {IdContexto} pelo usuário {IdUsuario}.",
            dto.IdContexto,
            dto.IdUsuario);

        return false;
    }

    await repository.PublicarAsync(dto.IdContexto, cancellationToken);

    logger.LogInformation(
        "<Entidade> {Codigo} publicada no contexto {IdContexto}.",
        dto.Codigo,
        dto.IdContexto);

    return true;
}
```

Dois logs num caso de uso inteiro — a negativa, porque o `403` sozinho não diz quem nem o quê, e a
publicação, porque é irreversível. A leitura que antecede, a validação e o caminho feliz do
carregamento não logam nada.

Na dúvida, pergunte: **se este log não existisse, que pergunta de produção ficaria sem resposta?**
Sem resposta concreta, não logue.

## Níveis

| Nível | Uso |
|---|---|
| `Critical` | Aplicação inutilizável; ação imediata |
| `Error` | Operação falhou e afetou o usuário |
| `Warning` | Situação recuperável ou degradada — fallback acionado, integração indisponível |
| `Information` | Marco de negócio: entidade criada, integração sincronizada, login efetuado |
| `Debug` / `Trace` | Somente Development; nunca em produção |

## Enriquecimento

Correlacionar telemetria ao usuário — na camada Web, pois depende de `HttpContext`:

```csharp
public class UsuarioTelemetryInitializer(IHttpContextAccessor httpContextAccessor) : ITelemetryInitializer
{
    public void Initialize(ITelemetry telemetry)
    {
        var usuario = httpContextAccessor.HttpContext?.User;

        if (usuario?.Identity?.IsAuthenticated != true)
            return;

        telemetry.Context.User.AuthenticatedUserId = usuario.ObterIdentificador();
    }
}
```

```csharp
builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<ITelemetryInitializer, UsuarioTelemetryInitializer>();
```

Use **identificador opaco** (id do usuário), nunca e-mail, CPF ou nome — Application Insights não é
repositório de dado pessoal.

## Coletado automaticamente

- Requisições HTTP (rota, status, duração) e exceções não tratadas.
- Dependências: banco, HTTP de saída, integrações.
- Contadores de performance e disponibilidade.
- **Correlação distribuída** — um `operation_Id` amarra requisição, consultas e chamadas externas.

## Amostragem e custo

Cobrança por volume ingerido. Em produção mantenha a **amostragem adaptativa** (padrão do SDK). Ela
preserva a correlação: se a requisição é amostrada, dependências e exceções acompanham. Desligue
apenas em investigação pontual.

Configure **alertas** de taxa de erro e latência — telemetria que ninguém observa não é
observabilidade.
