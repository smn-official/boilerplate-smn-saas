---
name: tratamento-erro-global
description: Tratamento de erro em ASP.NET Core MVC — o único catch legítimo no controller (DomainException virando mensagem no formulário), IExceptionHandler global registrado no Program.cs com AddExceptionHandler e UseExceptionHandler, mapeamento de DomainException para 400 e AcessoNegadoException para 403, página /erro genérica com identificador de correlação, resposta diferente para requisição normal e AJAX (HTML vs ProblemDetails) e o que nunca vaza na resposta. Use quando aparecer erro 500 em regra de negócio, stack trace na tela, exceção não tratada, tela branca depois de salvar, ou ao criar página de erro, exception handler e middleware de exceção.
agent: net10-agent
---

# Tratamento de erro global

Duas falhas chegam ao mesmo lugar por caminhos opostos. A `DomainException` de
[`dominio-agregados`](../dominio-agregados/SKILL.md) é uma decisão do sistema: o domínio recusou a
operação e sabe dizer por quê. A `NpgsqlException`, a `TimeoutException` e o `NullReferenceException`
são o sistema quebrando: ninguém previu, e não há mensagem útil para o usuário.

Confundir as duas produz os dois defeitos mais visíveis de uma aplicação: regra de negócio virando
`500` — o que [`docs/api/errors.md`](../../../docs/api/errors.md) proíbe explicitamente — e detalhe
técnico chegando à tela.

## A regra que não se quebra

**Falha de domínio volta para a tela; falha inesperada vira página de erro. Nenhuma das duas vaza
detalhe técnico.**

| Falha | Quem trata | Resposta | Log |
|---|---|---|---|
| `DomainException` numa action de escrita | `catch` no controller | Formulário re-renderizado com a mensagem | O handler global, se escapar |
| `DomainException` fora de action de escrita | `IExceptionHandler` global | `400` + página/`ProblemDetails` | Warning, sem stack trace |
| `AcessoNegadoException` | `IExceptionHandler` global | `403` genérico | Warning como evento de segurança |
| Qualquer outra exceção | `IExceptionHandler` global | `500` + página genérica com correlação | Error, com stack trace, só na telemetria |

## O único `catch` legítimo no controller

Existe **um** motivo para um controller capturar exceção: transformar `DomainException` em mensagem
no formulário que o usuário está preenchendo. O handler global não consegue fazer isso — ele não tem
a ViewModel, não sabe qual View renderizar e não tem os dados digitados.

```csharp
namespace <Produto>.<Modulo>.Web.Features.<Feature>.Controllers;

[Route("resources")]
[Authorize]
public class <Entidade>Controller(I<Entidade>Service <entidade>Service) : Controller
{
    [HttpGet("")]
    public async Task<IActionResult> Gerenciar(CancellationToken cancellationToken)
        => View(await CriarVisualizacaoAsync(request: null, cancellationToken));

    [HttpPost("save")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Salvar(
        <Entidade>FormularioRequest request,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
            return View(nameof(Gerenciar), await CriarVisualizacaoAsync(request, cancellationToken));

        try
        {
            await <entidade>Service.SalvarAsync(
                <Entidade>FormularioMapper.ParaDto(request),
                cancellationToken);
        }
        catch (DomainException excecao)
        {
            ModelState.AddModelError(string.Empty, excecao.Message);

            return View(nameof(Gerenciar), await CriarVisualizacaoAsync(request, cancellationToken));
        }

        return RedirectToAction(nameof(Gerenciar));
    }

    private async Task<<Entidade>ViewModel> CriarVisualizacaoAsync(
        <Entidade>FormularioRequest? request,
        CancellationToken cancellationToken)
        => <Entidade>ViewModelMapper.Criar(
            await <entidade>Service.ObterAsync(cancellationToken),
            request);
}
```

O que esse `catch` **não** faz, e é intencional:

- **Não loga.** O `ILogger` não aparece no construtor porque `DomainException` tratada não é
  incidente — é o usuário pedindo algo que a regra recusa, e isso acontece o dia inteiro. Logar aqui
  e deixar o handler global logar depois é o antipadrão "loga e relança" que a seção 7 de
  [`revisao-codigo`](../revisao-codigo/SKILL.md) proíbe: dois eventos para uma falha, ruído no
  Application Insights e alerta que ninguém lê. Quem loga é sempre o último a tratar.
- **Não captura `Exception`.** `catch (Exception)` engole `NpgsqlException` e a mostra como erro de
  formulário, escondendo defeito real atrás de uma mensagem tranquilizadora.
- **Não envolve o `RedirectToAction`.** O `try` cobre só a chamada ao serviço. Envolver o retorno de
  sucesso captura exceção de renderização e a trata como falha de regra.
- **Não fica em action de leitura.** Um `GET` que lança `DomainException` é defeito de desenho, e o
  handler global deve mesmo transformá-lo em erro visível.

## O handler global

`IExceptionHandler` é a peça do ASP.NET Core para isso — sem middleware artesanal e sem filtro por
controller. Ele fecha o que escapou de todas as actions, das tarefas de fundo que respondem a request
e de qualquer caminho que ninguém previu.

```csharp
namespace <Produto>.<Modulo>.Web.Common;

/// <summary>Traduz exceção não tratada em resposta HTTP sem expor detalhe técnico.</summary>
public sealed class TratadorDeExcecaoGlobal(ILogger<TratadorDeExcecaoGlobal> logger) : IExceptionHandler
{
    /// <summary>Mapeia a exceção para status e mensagem, e escreve a resposta adequada ao cliente.</summary>
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var (status, mensagem) = Mapear(exception);
        var correlacao = httpContext.TraceIdentifier;

        Registrar(exception, status, correlacao);

        httpContext.Response.StatusCode = status;

        if (!EhRequisicaoDeApi(httpContext.Request))
        {
            httpContext.Response.Redirect($"/erro?codigo={status}&correlacao={correlacao}");

            return true;
        }

        var problema = new ProblemDetails
        {
            Status = status,
            Title = mensagem,
            Extensions = { ["correlacao"] = correlacao },
        };

        await httpContext.Response.WriteAsJsonAsync(problema, cancellationToken);

        return true;
    }

    private static (int Status, string Mensagem) Mapear(Exception exception) => exception switch
    {
        DomainException => (StatusCodes.Status400BadRequest, exception.Message),
        AcessoNegadoException => (StatusCodes.Status403Forbidden, MensagensDeErro.AcessoNegado),
        _ => (StatusCodes.Status500InternalServerError, MensagensDeErro.FalhaGenerica),
    };

    private void Registrar(Exception exception, int status, string correlacao)
    {
        if (status == StatusCodes.Status500InternalServerError)
        {
            logger.LogError(exception, "Falha inesperada | Correlacao: {Correlacao}", correlacao);

            return;
        }

        logger.LogWarning(
            "Requisicao recusada | Status: {Status} | Correlacao: {Correlacao}",
            status,
            correlacao);
    }

    private static bool EhRequisicaoDeApi(HttpRequest request)
        => request.Headers.XRequestedWith == "XMLHttpRequest"
            || request.Path.StartsWithSegments("/api")
            || request.Headers.Accept.Any(valor => valor?.Contains("application/json") == true);
}
```

Detalhes que não são estilo:

- **`400` para `DomainException`, `403` para `AcessoNegadoException`.** Os dois tipos são definidos
  uma única vez: `DomainException` em [`dominio-agregados`](../dominio-agregados/SKILL.md) (seção
  "Exceção de domínio") e `AcessoNegadoException` em [`owasp-web`](../owasp-web/SKILL.md). Não
  redeclare nenhum dos dois — o motivo de existirem tipos distintos é exatamente permitir este
  `switch`. Se a superfície JSON do projeto preferir `409`/`422` para regra de negócio, essa é uma
  decisão a registrar no catálogo de [`docs/api/errors.md`](../../../docs/api/errors.md) e a refletir
  aqui; o que não muda é que **regra de negócio nunca é `500`**.
- **A mensagem de `DomainException` sai na resposta; a das demais, não.** Ela foi escrita pelo domínio
  para o usuário, vem de constante `Msg*` e não carrega infraestrutura. `exception.Message` de
  qualquer outro tipo é texto de biblioteca, escrito para desenvolvedor.
- **Nível de log por severidade.** `500` é `LogError` com a exceção; `400` e `403` são `LogWarning`
  sem stack trace — senão todo formulário recusado vira alerta de produção. Ver
  [`observabilidade`](../observabilidade/SKILL.md).
- **`AcessoNegadoException` recebe mensagem genérica.** `MensagensAcesso` já é genérica por decisão de
  [`owasp-web`](../owasp-web/SKILL.md): diferenciar "não existe" de "não é seu" é oráculo de
  enumeração.

## Registro no Program.cs

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllersWithViews();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<TratadorDeExcecaoGlobal>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}
else
{
    app.UseExceptionHandler();
    app.UseHsts();
}

app.UseStatusCodePagesWithReExecute("/erro", "?codigo={0}");
app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

/// <summary>Necessário para o projeto de teste de integração enxergar a classe de entrada.</summary>
public partial class Program;
```

Quatro pontos que falham em silêncio quando esquecidos:

- **`AddExceptionHandler` sem `UseExceptionHandler` não faz nada.** O registro na DI não liga o
  pipeline; a exceção continua subindo e o servidor devolve `500` vazio.
- **`AddProblemDetails` padroniza o corpo de erro** que o próprio framework produz fora do handler
  (`400` de model binding em endpoint de API, por exemplo), no mesmo formato que o handler escreve.
  Sem ele, o mesmo cliente recebe dois formatos de erro diferentes conforme a origem.
- **`UseExceptionHandler` vai antes de tudo** que pode lançar. Registrado depois de
  `UseAuthorization`, não cobre o que acontece na autorização.
- **`UseStatusCodePagesWithReExecute` cobre o que não é exceção.** `404` de rota inexistente e `403`
  do `[Authorize]` não passam por `IExceptionHandler`; sem isso, o usuário vê a página branca do
  servidor.

Em Development, `UseDeveloperExceptionPage` mostra o stack trace de propósito — e é justamente por
isso que a diferença fica **atrás de guarda de ambiente**, nunca de configuração digitada.

## Requisição normal vs. AJAX

A mesma exceção precisa virar HTML numa e `ProblemDetails` na outra. Redirecionar uma chamada `fetch`
para `/erro` devolve uma página HTML onde o TypeScript espera JSON: o `response.json()` estoura, o
erro real desaparece e o usuário vê a tela travada sem mensagem.

A checagem é a de `EhRequisicaoDeApi` acima, com três sinais e não um só: o header
`X-Requested-With`, o prefixo de rota `/api` e o `Accept`. Nenhum deles sozinho é confiável —
`fetch` não envia `X-Requested-With` automaticamente, e nem toda chamada JSON está sob `/api`. No
consumidor, o contrato fica explícito:

```ts
type ProblemaDetalhado = {
    readonly title: string;
    readonly status: number;
    readonly correlacao: string;
};

function ehProblemaDetalhado(valor: unknown): valor is ProblemaDetalhado {
    return typeof valor === "object" && valor !== null
        && "title" in valor && "correlacao" in valor;
}

export async function enviar<Feature>(url: string, corpo: FormData): Promise<void> {
    const resposta = await fetch(url, {
        method: "POST",
        headers: { "X-Requested-With": "XMLHttpRequest", "Accept": "application/json" },
        body: corpo,
    });

    if (resposta.ok) return;

    const problema: unknown = await resposta.json();

    if (!ehProblemaDetalhado(problema)) {
        exibirAviso(MensagemPadrao.FalhaGenerica, "");
        return;
    }

    exibirAviso(problema.title, problema.correlacao);
}
```

`resposta.json()` devolve `any`: sem o type guard, o contrato que esta seção promete tornar explícito
continuaria implícito, e `typescript-estrito` proíbe `any`. O guard é o que faz o formato do
`ProblemDetails` ser verificado do lado do consumidor — e o `early return` cobre o servidor que
respondeu erro sem o corpo esperado.

O campo `correlacao` é o mesmo identificador da página de erro: o usuário lê o código na tela, o time
acha o evento na telemetria.

## O que nunca vai na resposta

| Nunca | Por que vaza |
|---|---|
| Stack trace, nome de classe, arquivo, linha | Entrega a estrutura interna e as versões em uso |
| `NpgsqlException.Message` ou qualquer `ex.Message` de terceiro | Costuma trazer SQL, nome de tabela e o valor que causou a falha |
| Nome de tabela, coluna, schema ou constraint | Mapeia o banco e revela a fronteira de isolamento multi-schema |
| Connection string, host, porta, IP interno | Descreve a topologia da infraestrutura |
| Existência de conta, recurso ou contratante alheio | Permite enumeração |
| Valor de campo com dado pessoal recebido na requisição | Tratamento indevido; a mensagem aponta o campo, nunca o conteúdo |

A regra prática: **a resposta contém mensagem genérica e correlação; o detalhe existe só no
Application Insights**, associado a essa correlação. É a troca que
[`auditoria-implementacao`](../auditoria-implementacao/SKILL.md) já descreve — o identificador dá
suporte ao atendimento sem entregar detalhe ao atacante.

## A página `/erro`

Um controller `[AllowAnonymous]` — quem chega ali frequentemente falhou **na** autenticação, e exigir
login para ver a página de erro produz um laço de redirecionamento.

```csharp
namespace <Produto>.<Modulo>.Web.Features.Shared.Controllers;

[AllowAnonymous]
public class ErroController : Controller
{
    /// <summary>Exibe a página de erro genérica com o identificador de correlação.</summary>
    [Route("erro")]
    public IActionResult Exibir(int codigo = StatusCodes.Status500InternalServerError,
        string? correlacao = null)
    {
        var modelo = new ErroViewModel(
            codigo,
            MensagensDeErro.ParaStatus(codigo),
            correlacao ?? HttpContext.TraceIdentifier);

        Response.StatusCode = codigo;

        return View(modelo);
    }
}
```

```csharp
namespace <Produto>.<Modulo>.Web.Features.Shared.ViewModels;

/// <summary>Dados exibidos na página de erro genérica.</summary>
public sealed record ErroViewModel(int Codigo, string Mensagem, string Correlacao);
```

**O que a página mostra:** o que aconteceu em uma frase, o identificador de correlação em texto
selecionável, um caminho de saída (voltar ao início, tentar de novo) e como pedir ajuda.

**O que ela não mostra:** exceção, tipo, stack trace, `RequestId` interpretável como estado do
sistema, nome de servidor, e nenhuma variação de mensagem que revele **por que** o acesso foi negado.
`403` diz "você não tem acesso a esta área", não "este pedido pertence a outro contratante".

A View é burra — recebe a ViewModel pronta, como qualquer outra
([`feature-web`](../feature-web/SKILL.md)) — e nunca renderiza `Exception.ToString()`, nem sob `if`
de ambiente: em Development quem mostra o detalhe é o `UseDeveloperExceptionPage`, que nem chega
nesta página.

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Regra de negócio devolve `500` | `DomainException` sem `catch` e sem mapeamento no handler | `catch (DomainException)` na action de escrita; `400` no handler |
| Stack trace visível em produção | Sem `UseExceptionHandler`, ou página renderizando a exceção | Guarda de ambiente com handler no ramo não-Development |
| `500` continua vazio depois de registrar o handler | `AddExceptionHandler` sem `UseExceptionHandler` | Registrar os dois; `Use` antes do resto do pipeline |
| Cliente recebe dois formatos de erro conforme a origem | Sem `AddProblemDetails`, o `400` do framework não segue o formato do handler | Adicionar `AddProblemDetails` na composição |
| Dois eventos no Application Insights para a mesma falha | Controller loga e relança | Só o último a tratar loga; o `catch` de domínio não loga |
| Alerta de produção a cada formulário recusado | `LogError` para `400`/`403` | `LogWarning` sem stack trace nesses status |
| `fetch` recebe HTML e estoura no `response.json()` | Handler redireciona também requisição AJAX | Detectar AJAX/API e responder `ProblemDetails` |
| Página branca em `404` de rota inexistente | Só `UseExceptionHandler`, que não vê status sem exceção | `UseStatusCodePagesWithReExecute` para `/erro` |
| Laço de redirecionamento na página de erro | `/erro` exigindo autenticação | `[AllowAnonymous]` no controller de erro |
| Suporte não consegue achar o erro relatado | Página sem identificador de correlação | Exibir `TraceIdentifier` e logá-lo junto da exceção |
| Mensagem revela que o recurso é de outro contratante | Handler repassando a mensagem da exceção | Mensagem genérica para tudo que não é `DomainException` |
| `NpgsqlException` mostrada como erro de formulário | `catch (Exception)` no controller | Capturar apenas `DomainException` |
