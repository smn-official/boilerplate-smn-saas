---
name: validacao-entrada
description: Validação de entrada em ASP.NET Core MVC — o que valida forma (DataAnnotations no objeto de model binding, ModelState.IsValid com early return na action) e o que valida regra (invariante do agregado), campo obrigatório, tamanho e formato, mensagem de erro exibida no campo do formulário, validação de unicidade que depende do banco e por que não entra FluentValidation. Use quando um campo inválido precisa ser recusado, quando o formulário não aceita ou aceita o que não devia, ao escrever ou revisar action de POST, ao decidir onde uma validação mora, ou ao diagnosticar validação duplicada e mensagem de erro que não aparece na tela.
agent: net10-agent
---

# Validação de entrada

Duas coisas diferentes são chamadas de "validação" e tratadas como uma só. Separá-las é o assunto
inteiro desta skill: `[Required]` e invariante de agregado não são alternativas — são camadas
distintas que respondem perguntas distintas.

[`feature-web`](../feature-web/SKILL.md) define que o Controller valida "apenas aspecto técnico
(model binding)"; [`dominio-agregados`](../dominio-agregados/SKILL.md) define que a invariante mora no
agregado e lança `DomainException`. Esta skill é a fronteira entre os dois.

## A regra que não se quebra

**Model binding e DataAnnotations validam FORMA; o agregado valida REGRA; o controller só traduz.**

Nada de regra de negócio em atributo, nada de validação de formato no agregado.

| Pergunta | Onde vive | Como falha |
|---|---|---|
| O campo veio? Cabe no tamanho? Parece um e-mail, um número, uma data? | DataAnnotations no `Request` | `ModelState` inválido, formulário re-renderizado |
| A operação é permitida pelo estado atual do agregado? | Método do agregado, em `Core` | `DomainException` com mensagem de constante |
| Já existe outro registro com esse código? A referência informada existe? | Serviço de domínio, antes de construir o agregado | `DomainException` com mensagem de constante |

O teste de fronteira é uma pergunta só: **para responder, preciso do banco ou do estado do
agregado?** Se sim, não é forma — e atributo nenhum resolve. Se não, é forma, e o agregado não deve
saber disso.

```csharp
// ❌ Regra de negócio virou atributo: o domínio deixou de ser dono dela e o teste
// unitário do agregado não consegue mais assertá-la.
public sealed class PedidoFormularioRequest
{
    [Required]
    [Range(1, int.MaxValue, ErrorMessage = "Pedido cancelado não pode ser faturado.")]
    public int Quantidade { get; set; }
}

// ✅ Forma no atributo, regra no agregado. Cada uma testável onde vive.
public sealed class PedidoFormularioRequest
{
    [Required(ErrorMessage = MensagensDeFormulario.CampoObrigatorio)]
    [Range(1, 9999, ErrorMessage = MensagensDeFormulario.QuantidadeForaDaFaixa)]
    public int Quantidade { get; set; }
}
```

## O objeto de model binding

Sufixo `Request`, uma classe por formulário, na pasta da feature. É a **única exceção** à regra de
propriedade somente leitura — o AGENTS.md a declara explicitamente ("exceção para DTO de model
binding") porque o binder precisa de `set` público para popular o objeto a partir do corpo da
requisição. Fora dele, `{ get; private set; }` ou `{ get; init; }`.

```csharp
namespace <Produto>.<Modulo>.Web.Features.<Feature>.Requests;

/// <summary>Dados do formulário de <Feature>, sujeitos a model binding.</summary>
public sealed class <Entidade>FormularioRequest
{
    public int? Id { get; set; }

    [Required(ErrorMessage = MensagensDeFormulario.CampoObrigatorio)]
    [StringLength(120, MinimumLength = 3, ErrorMessage = MensagensDeFormulario.TamanhoInvalido)]
    public string Nome { get; set; } = string.Empty;

    [Required(ErrorMessage = MensagensDeFormulario.CampoObrigatorio)]
    [EmailAddress(ErrorMessage = MensagensDeFormulario.EmailInvalido)]
    public string Email { get; set; } = string.Empty;

    [Range(0, 999999, ErrorMessage = MensagensDeFormulario.ValorForaDaFaixa)]
    public decimal Valor { get; set; }
}
```

Os quatro atributos que resolvem quase tudo:

| Atributo | Valida | Cuidado |
|---|---|---|
| `[Required]` | Presença | Em tipo de valor não anulável, `0` e `false` **passam**; use `int?` quando "não informado" é diferente de zero |
| `[StringLength]` | Tamanho máximo e mínimo | O máximo precisa bater com o do `HasMaxLength` da configuration, senão o banco recusa o que a tela aceitou |
| `[Range]` | Faixa numérica ou de data | Faixa é forma; "acima do limite do plano" é regra, e não cabe aqui |
| `[EmailAddress]` | Formato plausível | Não prova existência do endereço — quem prova é o e-mail de confirmação |

O que **não** vai no `Request`: método, propriedade calculada, referência a serviço, atributo de
persistência. Ele carrega dados e para aí. A conversão para o DTO de entrada do serviço é de um
mapper estático da feature, como em [`feature-web`](../feature-web/SKILL.md).

## A action completa

`ModelState.IsValid` no início, early return devolvendo a própria View com o modelo remontado. Sem
`else`, sem aninhamento.

```csharp
namespace <Produto>.<Modulo>.Web.Features.<Feature>.Controllers;

[Route("resources")]
[Authorize]
public class <Entidade>Controller(I<Entidade>Service <entidade>Service) : Controller
{
    [HttpGet("")]
    public async Task<IActionResult> Gerenciar(CancellationToken cancellationToken)
        => View(await CriarVisualizacaoAsync(cancellationToken));

    [HttpPost("save")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Salvar(
        <Entidade>FormularioRequest request,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
            return View(nameof(Gerenciar), await CriarVisualizacaoAsync(request, cancellationToken));

        await <entidade>Service.SalvarAsync(
            <Entidade>FormularioMapper.ParaDto(request),
            cancellationToken);

        return RedirectToAction(nameof(Gerenciar));
    }

    private async Task<<Entidade>ViewModel> CriarVisualizacaoAsync(CancellationToken cancellationToken)
        => CriarVisualizacao(await <entidade>Service.ObterAsync(cancellationToken), request: null);

    private async Task<<Entidade>ViewModel> CriarVisualizacaoAsync(
        <Entidade>FormularioRequest request,
        CancellationToken cancellationToken)
        => CriarVisualizacao(await <entidade>Service.ObterAsync(cancellationToken), request);
}
```

Três decisões que esse trecho carrega:

- **Early return, não `if/else`.** O caminho de sucesso fica na margem esquerda.
- **`return View(...)`, não `RedirectToAction`.** Redirect perde o `ModelState` e o usuário volta a um
  formulário vazio, sem entender por que nada aconteceu.
- **A ViewModel é remontada.** Combo, lista e valores auxiliares vêm do serviço; o que o usuário
  digitou vem do `request`. Devolver a View com a ViewModel nula é `NullReferenceException` na
  renderização, não mensagem de erro.

Na View, o resumo e o erro por campo saem dos helpers padrão — sem `if` sobre `ModelState` na
marcação:

```html
<div asp-validation-summary="ModelOnly" class="text-sm text-red-600"></div>

<label asp-for="Formulario.Nome" class="text-body-sm">Nome</label>
<input asp-for="Formulario.Nome" class="w-full rounded border px-3 py-2" />
<span asp-validation-for="Formulario.Nome" class="text-caption text-red-600"></span>
```

## Por que não FluentValidation

É dependência nova, e a "Postura" do AGENTS.md exige justificar qual problema ela resolve. O problema
que ela resolveria — expressar validação complexa — já tem duas soluções no repositório:
DataAnnotations para forma e invariante de agregado para regra. Adotá-la traz três custos concretos:

- Um terceiro lugar onde procurar validação, além do atributo e do agregado.
- Convite estrutural a colocar regra de negócio no validador — ele tem injeção de dependência, então
  alcança repositório, e a regra migra da `Core` para a `Web` sem ninguém decidir isso.
- Integração própria com `ModelState`, que precisa ser mantida em toda action.

**Quando a validação de forma é genuinamente complexa** — dependência entre campos, "data final
depois da inicial", "informe telefone ou e-mail" — a resposta é `IValidatableObject` no próprio
`Request`, sem pacote nenhum:

```csharp
namespace <Produto>.<Modulo>.Web.Features.<Feature>.Requests;

/// <summary>Filtro de período, com coerência entre as duas datas.</summary>
public sealed class <Feature>PeriodoRequest : IValidatableObject
{
    [Required(ErrorMessage = MensagensDeFormulario.CampoObrigatorio)]
    public DateOnly? Inicio { get; set; }

    [Required(ErrorMessage = MensagensDeFormulario.CampoObrigatorio)]
    public DateOnly? Fim { get; set; }

    /// <summary>Valida a coerência entre início e fim, após o binding de cada campo.</summary>
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Inicio is null || Fim is null)
            yield break;

        if (Fim < Inicio)
        {
            yield return new ValidationResult(
                MensagensDeFormulario.PeriodoInvertido,
                [nameof(Inicio), nameof(Fim)]);
        }
    }
}
```

O `yield break` inicial não é estilo: `Validate` roda **depois** dos atributos, mas roda mesmo com
`ModelState` já inválido. Sem a guarda, um campo ausente produz dois erros — o do `[Required]` e um
`NullReferenceException` disfarçado de erro de comparação.

Se um dia houver problema que isso não resolva, a decisão de trazer a biblioteca é ADR, não escolha
de quem está implementando a tela.

## Validação que depende do banco

Unicidade ("este código já existe") e existência ("a categoria informada existe") não são forma —
nenhum atributo tem como saber — nem invariante interna, porque o agregado não acessa repositório. Elas
moram no **serviço de domínio**, antes de construir ou atualizar o agregado. É o passo 2 da sequência
de `SalvarAsync` em [`dominio-agregados`](../dominio-agregados/SKILL.md).

```csharp
namespace <Produto>.<Modulo>.Core.<Feature>.Services;

/// <summary>Casos de uso de <Entidade>.</summary>
public sealed class <Entidade>Service(I<Entidade>Repository repositorio) : I<Entidade>Service
{
    /// <summary>Cria ou atualiza <Entidade>, garantindo unicidade do código.</summary>
    public async Task SalvarAsync(<Entidade>Dto dto, CancellationToken cancellationToken)
    {
        var existentePorCodigo = await repositorio.ObterPorSpecAsync(
            new <Entidade>PorCodigoSpec(dto.Codigo),
            cancellationToken);

        if (existentePorCodigo is not null && existentePorCodigo.Id != dto.Id)
            throw new DomainException(Mensagens<Entidade>.CodigoDuplicado);

        if (dto.Id is null)
        {
            await repositorio.AdicionarAsync(new <Entidade>(dto.Codigo, dto.Nome), cancellationToken);
            await repositorio.SalvarAlteracoesAsync(cancellationToken);

            return;
        }

        var <entidade> = await repositorio.ObterPorIdAsync(dto.Id.Value, cancellationToken)
            ?? throw new DomainException(Mensagens<Entidade>.NaoEncontrado);

        <entidade>.Atualizar(dto.Codigo, dto.Nome);

        await repositorio.SalvarAlteracoesAsync(cancellationToken);
    }
}
```

Duas consequências que valem registrar:

- **O `!= dto.Id` é obrigatório.** Sem ele, salvar um registro existente sem alterar o código acusa
  duplicidade contra ele mesmo — o defeito clássico da validação de unicidade em edição.
- **Índice único no banco continua necessário.** A checagem no serviço tem janela de corrida entre
  duas requisições simultâneas; o índice é a garantia real. A `Data` traduz a violação em
  `DomainException` com a mesma mensagem, preservando a original em `InnerException` —
  [`persistencia-ef`](../persistencia-ef/SKILL.md).

Como a falha é `DomainException`, quem a transforma em mensagem na tela é o `catch` único do
controller descrito em [`tratamento-erro-global`](../tratamento-erro-global/SKILL.md).

## Mensagem de validação

Constante pública, nunca literal espalhado pela classe. É o que permite ao teste assertar a mensagem
sem duplicar string — [`testes-unitarios`](../testes-unitarios/SKILL.md).

Atributo de DataAnnotations exige **constante de compilação** (`const string`), então a mensagem de
forma não pode ser interpolada nem montada:

```csharp
namespace <Produto>.<Modulo>.Web.Features.Shared;

/// <summary>Mensagens de validação de forma, usadas nos atributos de model binding.</summary>
public static class MensagensDeFormulario
{
    /// <summary>Campo não informado.</summary>
    public const string CampoObrigatorio = "Informe este campo.";

    /// <summary>Texto fora do tamanho aceito.</summary>
    public const string TamanhoInvalido = "O texto deve ter entre 3 e 120 caracteres.";

    /// <summary>Endereço de e-mail com formato inválido.</summary>
    public const string EmailInvalido = "Informe um e-mail válido.";

    /// <summary>Valor numérico fora da faixa aceita.</summary>
    public const string ValorForaDaFaixa = "Informe um valor entre 0 e 999.999.";

    /// <summary>Quantidade fora da faixa aceita.</summary>
    public const string QuantidadeForaDaFaixa = "Informe uma quantidade entre 1 e 9.999.";

    /// <summary>Data final anterior à inicial.</summary>
    public const string PeriodoInvertido = "A data final não pode ser anterior à inicial.";
}
```

Regras que a mensagem obedece:

- **Nunca embute sigla `RN-*`.** Rastreamento de requisito vive na documentação, não no runtime —
  regra do AGENTS.md e checklist de [`docs/api/errors.md`](../../../docs/api/errors.md).
- **Nunca ecoa o valor recebido.** "CPF 123.456.789-00 já cadastrado" devolve dado pessoal e confirma
  a um terceiro que aquele documento está na base. Aponte o campo, não o conteúdo.
- Mensagem de **forma** fica na `Web` (`MensagensDeFormulario`); mensagem de **regra** fica na
  constante `Msg*` do agregado ou na classe de mensagens do domínio. A tela nunca redige regra.
- Redação acionável, no imperativo: "Informe um e-mail válido", não "Valor inválido".

## Validação no cliente não substitui a do servidor

O `asp-validation-for` gera validação em JavaScript a partir dos mesmos atributos — é conveniência de
interface, não controle. Requisição forjada, `curl` e JavaScript desligado passam direto. O servidor
valida **sempre**, e é por isso que `ModelState.IsValid` não é opcional em nenhuma action de escrita.
O mesmo raciocínio de [`owasp-web`](../owasp-web/SKILL.md): controle que roda no cliente é do cliente.

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| A mesma regra falha em dois lugares com redações diferentes | Validada no atributo **e** no agregado | Forma no atributo, regra só no agregado; uma origem por validação |
| Entrada inválida chega ao banco | Nenhuma das duas camadas validou — cada uma achou que era da outra | Aplicar o teste "preciso do banco ou do estado?" e alocar a validação |
| `NullReferenceException` ao re-renderizar o formulário | `return View(request)` sem remontar a ViewModel | Remontar a ViewModel com os dados auxiliares e o `request` |
| Usuário volta a um formulário vazio, sem mensagem | `RedirectToAction` no ramo inválido descarta o `ModelState` | `return View(...)` no early return |
| Campo obrigatório aceita `0` | `[Required]` sobre tipo de valor não anulável | Declarar `int?`/`decimal?` quando "não informado" ≠ zero |
| Banco recusa texto que a tela aceitou | `[StringLength]` maior que o `HasMaxLength` da configuration | Alinhar os dois limites |
| Dois erros no mesmo campo ausente | `IValidatableObject` sem guarda de nulo | `yield break` quando o campo obrigatório não veio |
| Duplicidade acusada ao salvar o próprio registro | Checagem de unicidade sem excluir o `Id` atual | Comparar `existente.Id != dto.Id` |
| Duplicata gravada sob concorrência | Só a checagem no serviço, sem índice único | Índice único no banco, traduzido em `DomainException` na `Data` |
| Regra de negócio validada no `Request` | Atributo com mensagem de domínio | Mover para o agregado; o atributo volta a descrever forma |
| Mensagem de erro exibe o CPF digitado | Mensagem ecoando o valor recebido | Apontar o campo; valor nunca volta na mensagem |
