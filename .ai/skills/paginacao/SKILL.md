---
name: paginacao
description: Paginação de listagem com EF Core e specifications — offset com Skip/Take versus keyset/cursor e quando cada um, paginação dentro da specification e não no controller, CountAsync separado e seu custo, DTO de resultado paginado, teto de tamanho de página vindo do cliente e ordenação estável obrigatória. Use ao criar listagem, grade, endpoint de busca ou ao diagnosticar registro repetido ou pulado entre páginas.
agent: net10-agent
---

# Paginação

[`dominio-agregados`](../dominio-agregados/SKILL.md) é dono de `ISpecification<T>` e
`Specification<T>` — filtro, includes, ordenação com desempate e paginação, tudo lá.
[`persistencia-ef`](../persistencia-ef/SKILL.md) é dono do `SpecificationEvaluator`, que traduz isso
para `IQueryable`. Esta skill **não redefine nenhum dos dois**: ela responde como usá-los para a
terceira dimensão da consulta — **quantos registros e a partir de onde** — e por que essa decisão
pertence à specification, não ao controller nem ao repositório.

## A regra que não se quebra

**Paginação sem ordenação determinística não pagina: sorteia.** Sem `ORDER BY` estável, o PostgreSQL
não promete ordem alguma entre execuções, e cada página traz registros que já apareceram e omite
outros que nunca aparecerão.

```csharp
// ❌ Ordena por um campo com valores repetidos: o desempate é arbitrário a cada consulta.
OrdenarPor(pedido => pedido.DataCriacao, descendente: true);

// ✅ Desempate por chave única torna a ordem total e a paginação repetível.
OrdenarPor(pedido => pedido.DataCriacao, descendente: true);
DesempatarPor(pedido => pedido.Id);
```

Vale mesmo quando o campo "parece" único em desenvolvimento: dez registros com timestamps distintos
escondem o defeito até a primeira importação em lote gravar cem linhas no mesmo milissegundo.

## Offset ou keyset

| | Offset (`Skip`/`Take`) | Keyset / cursor |
|---|---|---|
| Navegação | Qualquer página, direto | Só próxima/anterior |
| Custo em página alta | Degrada — o banco lê e descarta as N anteriores | Constante |
| Inserção durante a navegação | Desloca: registro repete ou some | Estável |
| Total de páginas | Possível | Não naturalmente |
| Complexidade | Trivial | Exige cursor e comparação composta |

**Padrão: offset.** Grade administrativa com filtro, algumas centenas de registros e numeração de
páginas é exatamente o caso dele, e o custo de keyset não se paga.

**Keyset quando** houver rolagem infinita, exportação varrendo tudo, volume que leva o usuário a
páginas altas, ou dado que muda enquanto se navega (fila, log, feed). Um `Skip(200000)` obriga o
banco a percorrer duzentas mil linhas para descartá-las — o índice não salva.

```csharp
// Offset
consulta.Skip((pagina - 1) * tamanho).Take(tamanho);

// Keyset: a chave do último item da página anterior; comparação composta acompanha a ordenação.
consulta
    .Where(pedido => pedido.DataCriacao < cursor.DataCriacao
        || (pedido.DataCriacao == cursor.DataCriacao && pedido.Id < cursor.Id))
    .Take(tamanho);
```

O cursor é opaco para o cliente e **não é dado de negócio** codificado: não exponha id interno cru se
ele não for público de qualquer forma, e valide o que voltar — cursor forjado é entrada externa.

## Na specification, não no controller

`Pular`, `Levar`, `OrdenarPor` e `DesempatarPor` **já fazem parte** de `ISpecification<T>` e
`Specification<T>`, cuja definição canônica é de
[`dominio-agregados`](../dominio-agregados/SKILL.md) — esta skill não redeclara nada disso. A spec
concreta apenas chama os membros protegidos herdados:

```csharp
namespace <Produto>.<Modulo>.Core.Specs.<Entidade>;

/// <summary>Página de <Entidade> do <Feature>, ordenada com desempate estável.</summary>
public sealed class <Entidade>Por<Feature>PaginadaSpec : Specification<<Entidade>>
{
    private readonly <Tipo> _<chave>;

    public <Entidade>Por<Feature>PaginadaSpec(<Tipo> <chave>, PaginacaoDto paginacao)
    {
        _<chave> = <chave>;

        AdicionarInclude(<entidade> => <entidade>.<Filhas>);
        OrdenarPor(<entidade> => <entidade>.DataCriacao, descendente: true);
        DesempatarPor(<entidade> => <entidade>.Id);
        Paginar((paginacao.Pagina - 1) * paginacao.Tamanho, paginacao.Tamanho);
    }

    public override Expression<Func<<Entidade>, bool>> ToExpression() =>
        <entidade> => <entidade>.<Chave> == _<chave> && !<entidade>.Excluido;
}
```

O cálculo `(Pagina - 1) * Tamanho` acontece **uma vez**, aqui, sobre um `PaginacaoDto` já normalizado.
A specification expõe **`Pular`/`Levar`** — offset em registros, não número de página. Não existem
`.Pagina` nem `.Tamanho` na spec: numeração de página é assunto do DTO de entrada e do DTO de
resultado, que é onde ela faz sentido para a tela.

Quem traduz `Pular`/`Levar` para `Skip`/`Take` é o `SpecificationEvaluator` da camada `Data`, cujo
código completo é de [`persistencia-ef`](../persistencia-ef/SKILL.md) — **dono do avaliador**. O que
importa aqui: ele aplica **filtro → includes → ordenação com desempate → `Skip`/`Take`**, nessa ordem,
e expõe `AplicarFiltro` separado, sem include nem ordenação, para a contagem.

`Skip`/`Take` **depois** do `OrderBy` — invertido, o EF gera SQL que pagina antes de ordenar e o
resultado é outro. Manter isso no avaliador compartilhado garante a ordem certa uma vez, para todas
as consultas.

O que o controller faz: recebe página e tamanho, **valida**, monta o DTO e passa adiante. Paginar em
memória no controller é o erro que traz a tabela inteira do banco:

```csharp
// ❌ Materializa tudo e descarta na aplicação. Some com o filtro do banco e derruba a memória.
var todos = await _repositorio.ListarAsync(spec, cancellationToken);
var pagina = todos.Skip(50).Take(25).ToList();
```

## Contagem total

O total exige uma **segunda consulta**, com o mesmo filtro e sem ordenação nem paginação:

A página e o tamanho do resultado vêm do `PaginacaoDto` recebido, **não da specification** — ela só
conhece `Pular`/`Levar`:

```csharp
namespace <Produto>.<Modulo>.Data.Repositories;

/// <summary>Repositório de <Entidade> com listagem paginada.</summary>
public sealed class <Entidade>Repository : I<Entidade>Repository
{
    private readonly <Contexto>DbContext _contexto;

    public <Entidade>Repository(<Contexto>DbContext contexto) => _contexto = contexto;

    /// <summary>Devolve a página da specification e o total sob o mesmo filtro.</summary>
    public async Task<ResultadoPaginadoDto<<Entidade>>> ListarPaginadoAsync(
        ISpecification<<Entidade>> specification,
        PaginacaoDto paginacao,
        CancellationToken cancellationToken)
    {
        var consulta = _contexto.Set<<Entidade>>().AsNoTracking();

        var total = await SpecificationEvaluator
            .AplicarFiltro(consulta, specification)
            .CountAsync(cancellationToken);

        var itens = await SpecificationEvaluator
            .AplicarSpecification(consulta, specification)
            .ToListAsync(cancellationToken);

        return new ResultadoPaginadoDto<<Entidade>>(itens, total, paginacao.Pagina, paginacao.Tamanho);
    }
}
```

**A mesma specification alimenta as duas consultas.** Filtro diferente entre contagem e página é o
defeito em que o total nunca bate com o que a tela mostra.

O `CountAsync` roda sobre o filtro **sem** `Include` e **sem** `OrderBy` — ordenar para contar é
trabalho jogado fora, e `Include` numa contagem gera `JOIN` inútil.

O custo é real: contagem exata em tabela grande é varredura, e frequentemente demora mais que a
página em si. Saídas, por preferência: não mostrar total (só "próxima página", que é o modelo do
keyset); estimar por `reltuples` quando não houver filtro; ou pedir `count` apenas na primeira
página e reaproveitar. Contar a cada rolagem é desperdício puro.

## DTO de resultado

```csharp
public sealed record ResultadoPaginadoDto<T>(
    IReadOnlyList<T> Itens,
    int Total,
    int Pagina,
    int Tamanho)
{
    public int TotalDePaginas => Tamanho <= 0 ? 0 : (int)Math.Ceiling(Total / (double)Tamanho);
    public bool TemProxima => Pagina * Tamanho < Total;
}
```

Sufixo `Dto` na classe e no arquivo. Devolver só a lista obriga cada tela a recalcular navegação a
partir do nada, e uma delas vai errar. `TotalDePaginas` e `TemProxima` são cálculo de transporte, não
regra de negócio — ficam aqui, não na view.

Para keyset, troque `Total`/`Pagina` por `CursorProximo` — anunciar total que você não calcula é
mentir para a tela.

## Tamanho de página vindo do cliente

`?tamanho=1000000` é negação de serviço com uma linha de query string: uma requisição materializa a
tabela inteira, e dez derrubam o processo. Isso é o A04/A05 de
[`owasp-web`](../owasp-web/SKILL.md) — falha de desenho por confiar em entrada externa.

**Todo tamanho vindo do cliente passa por um teto do servidor.** Sempre, sem exceção.

O teto tem **um único nome em todo o projeto**: `TamanhoMaximoDePagina`, igual na classe de settings,
no `appsettings.json` e no `Clamp`. Dois nomes para o mesmo teto é como um deles fica sem ninguém
configurando.

```csharp
namespace <Produto>.<Modulo>.Core.Settings;

/// <summary>Padrões e teto de paginação, vindos do <c>appsettings.json</c>.</summary>
public sealed class PaginacaoSettings
{
    public const string SecaoConfiguracao = "<Modulo>:Paginacao";

    public int TamanhoPagina { get; init; } = 25;
    public int TamanhoMaximoDePagina { get; init; } = 100;
}
```

```csharp
namespace <Produto>.<Modulo>.Core.DTOs.Comum;

/// <summary>Página e tamanho pedidos pelo cliente, antes da normalização.</summary>
public sealed record PaginacaoDto
{
    public int Pagina { get; init; } = 1;
    public int Tamanho { get; init; } = 25;

    /// <summary>Aplica piso 1 na página e o teto do servidor no tamanho.</summary>
    public PaginacaoDto Normalizar(PaginacaoSettings settings) => this with
    {
        Pagina = Math.Max(Pagina, 1),
        Tamanho = Math.Clamp(Tamanho, 1, settings.TamanhoMaximoDePagina),
    };
}
```

Limitar (`Clamp`) em vez de rejeitar mantém a tela funcionando; rejeitar com `400` também é aceitável,
desde que a decisão seja consistente. O que **não** vale é confiar no valor.

Página e tamanho padrão vêm do `appsettings.json`, tipados por `IOptions` — o
[`configuracao.md`](../../docs/configuracao.md) já prevê `TamanhoPagina` como configuração do projeto,
nunca segredo e nunca constante espalhada:

```json
{
  "<Modulo>": {
    "Paginacao": {
      "TamanhoPagina": 25,
      "TamanhoMaximoDePagina": 100
    }
  }
}
```

`Normalizar` roda no **controller**, antes de montar a specification — o domínio recebe valor já
confiável, e nenhuma spec precisa se defender de `Tamanho` absurdo.

Cuide também do `Pagina`: valor negativo vira `Skip` negativo e exceção; página além do total devolve
lista vazia com `Total` correto, que é o comportamento certo — não é erro.

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Registro aparece em duas páginas | Ordenação sem desempate único | `OrderBy` do campo + `ThenBy` da chave |
| Registro some ao avançar de página | Inserção durante a navegação com offset | Keyset, ou aceitar e documentar |
| Listagem lenta só em páginas altas | `Skip` grande varre e descarta | Keyset/cursor |
| Memória estoura com filtro amplo | `Skip`/`Take` em memória, após materializar | Paginar na specification, antes do `ToListAsync` |
| `?tamanho=999999` derruba a aplicação | Tamanho do cliente sem teto | `Math.Clamp` contra `TamanhoMaximoDePagina` do `appsettings` |
| Contagem mais lenta que a página | `CountAsync` com `Include`/`OrderBy` | Contar sobre o filtro puro, ou dispensar o total |
| Total não bate com os itens | Contagem e página com filtros diferentes | Mesma specification para as duas consultas |
| SQL pagina antes de ordenar | `Skip`/`Take` aplicados antes do `OrderBy` | Ordenar primeiro no avaliador da specification |
| `ArgumentOutOfRangeException` no `Skip` | Página zero ou negativa | Normalizar com piso 1 antes de calcular |
| `specification.Pagina` não compila | A spec expõe `Pular`/`Levar`, não número de página | Ler página e tamanho do `PaginacaoDto` |
| Ordenação da spec composta se perde | `And` que descarta ordenação de um dos lados | `And` da definição canônica preserva ambos |
