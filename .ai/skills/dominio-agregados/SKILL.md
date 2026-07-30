---
name: dominio-agregados
description: Modelagem de domínio em .NET — criar agregados com invariantes, serviços de domínio, DTOs, enums e specifications; decidir quando separar um domínio novo. Use ao criar ou alterar qualquer artefato dentro da camada Core.
agent: net10-agent
---

# Domínio e agregados

Tudo aqui vive em `Core`, que **não** referencia projeto algum: sem EF, sem HTTP, sem Razor.

## Agregado

Unidade de consistência. Responsabilidade única: **proteger invariantes e manter o próprio estado
válido**. Responde "como isso funciona?".

### Base

Igualdade **por identidade, não por referência**: o mesmo agregado carregado duas vezes na mesma
consulta é o mesmo agregado. Sem isso, `Contains`, `Distinct`, `Except` e
`Should().BeEquivalentTo()` comparam ponteiro e passam a mentir tão logo o EF materialize duas
instâncias da mesma linha. Esta é a decisão do padrão — implemente `Equals`, não deixe implícito.

`Id` default (zero, `Guid.Empty`) significa **agregado ainda não persistido**, que não é igual a
ninguém — nem a outro agregado transiente com o mesmo `Id` default.

```csharp
namespace <Produto>.<Modulo>.Core.Common;

/// <summary>Raiz de agregado, com igualdade por identidade.</summary>
public abstract class AggregateRoot<TId> : IEquatable<AggregateRoot<TId>>
    where TId : IEquatable<TId>
{
    public TId Id { get; protected init; } = default!;

    public bool EhTransiente => EqualityComparer<TId>.Default.Equals(Id, default!);

    public bool Equals(AggregateRoot<TId>? outro)
    {
        if (outro is null)
            return false;

        if (ReferenceEquals(this, outro))
            return true;

        if (GetType() != outro.GetType())
            return false;

        if (EhTransiente || outro.EhTransiente)
            return false;

        return EqualityComparer<TId>.Default.Equals(Id, outro.Id);
    }

    public override bool Equals(object? obj) => Equals(obj as AggregateRoot<TId>);

    public override int GetHashCode() => HashCode.Combine(GetType(), Id);

    public static bool operator ==(AggregateRoot<TId>? esquerda, AggregateRoot<TId>? direita) =>
        esquerda?.Equals(direita) ?? direita is null;

    public static bool operator !=(AggregateRoot<TId>? esquerda, AggregateRoot<TId>? direita) =>
        !(esquerda == direita);
}
```

O `GetType()` na comparação e no hash impede que duas entidades diferentes com `Id` 7 se digam
iguais. `GetHashCode` usa o `Id` mesmo transiente — inconsistente com `Equals` por definição, e é o
motivo de **não colocar agregado transiente em `HashSet` ou chave de `Dictionary`**: persista
primeiro.

### Regras

- Propriedades com **setter privado**; mutação só por métodos de intenção (`Atualizar`, `Excluir`,
  `Vincular…`).
- **Invariantes validadas no construtor** e em cada mutação.
- Mensagens de validação em **constantes públicas** (`Msg<Campo>Obrigatorio`), para testar sem
  duplicar string.
- Construtor `protected` sem parâmetros apenas para o ORM materializar: `protected <Entidade>() {}`.
- Coleções filhas: campo privado exposto como `IReadOnlyCollection<T>`.
- Decisões de regra viram **propriedade calculada** (`Eh<Condicao>`), para o serviço consultar sem
  reimplementar.
- Mantenha-o pequeno: se uma operação exige carregar dezenas de entidades associadas, está grande
  demais.

### Nunca

- Acessar banco ou repositório.
- Chamar API externa, e-mail, cache, storage, fila.
- Depender de `DbContext`, `HttpClient`, `ILogger`, `IHttpContextAccessor`.
- Converter-se em DTO.
- Expor `set` público ou coleção mutável.
- Alterar outro agregado — coordenação é do serviço.

```csharp
public class <Entidade> : AggregateRoot<int>
{
    public const string Msg<Campo>Obrigatorio = "<Campo> é obrigatório.";

    private readonly List<<Filha>> _<filhas> = [];

    protected <Entidade>() {}

    public <Entidade>(string <campo>, <Tipo> <outro>)
    {
        Validar(<campo>, <outro>);

        <Campo> = <campo>.Trim();
        DataCriacao = DateTimeOffset.UtcNow;
    }

    public string <Campo> { get; private set; }
    public DateTimeOffset DataCriacao { get; private set; }
    public IReadOnlyCollection<<Filha>> <Filhas> => _<filhas>.AsReadOnly();
    public bool Eh<Condicao> => <expressao de regra>;

    public void <Acao>()
    {
        if (Status == <Entidade>Status.Cancelado)
            throw new DomainException(Msg<Entidade>Cancelado);

        Status = <Entidade>Status.<Novo>;
    }
}
```

## Exceção de domínio

**Invariante violada lança `DomainException` — sempre este tipo, nunca `ArgumentException`,
`InvalidOperationException` ou `Exception`.** Um único tipo é o que permite ao teste assertar a
regra sem adivinhar (`Throw<DomainException>()`) e ao middleware da `Web` distinguir "o usuário
pediu algo inválido" de "o sistema quebrou" — o primeiro é `400`, o segundo é `500`. Com tipos do
framework espalhados, essa distinção some.

O nome canônico é `DomainException`, em inglês — não existe variante em português. É o único tipo de
exceção que o domínio lança por decisão de regra.

```csharp
namespace <Produto>.<Modulo>.Core.Common;

/// <summary>Sinaliza violação de invariante de domínio. Falha esperada, não defeito.</summary>
public class DomainException : Exception
{
    /// <summary>Cria a exceção com a mensagem de violação.</summary>
    public DomainException(string mensagem)
        : base(mensagem)
    {
    }

    /// <summary>Cria a exceção preservando a falha de origem que a motivou.</summary>
    public DomainException(string mensagem, Exception excecaoInterna)
        : base(mensagem, excecaoInterna)
    {
    }
}
```

O segundo construtor existe para traduzir falha de infraestrutura em linguagem de domínio **sem
perder o rastro**: a camada `Data` captura o erro do banco, lança a mensagem que o negócio entende e
mantém a original em `InnerException`, onde o Application Insights a encontra — ver
[`integracao-dotnet`](../integracao-dotnet/SKILL.md).

```csharp
// ❌ A causa real desaparece: o log mostra "já existe" e nada sobre qual constraint violou.
throw new DomainException(MsgCodigoDuplicado);

// ✅ Mensagem de domínio para o usuário, exceção original preservada para o diagnóstico.
throw new DomainException(MsgCodigoDuplicado, excecao);
```

**Nunca** dê à `DomainException` propriedade de HTTP (status, código de resposta) nem herde dela por
regra — `Core` não conhece a Web. Distinguir violações diferentes é papel da **mensagem em constante
pública**, que o teste já assere.

## Serviço de domínio

Orquestra o caso de uso. Responde "**o que deve acontecer?**", nunca "como".

**Sequência típica de um `SalvarAsync`:**

1. Buscar existente por specification (resolve criação vs. edição).
2. Garantir invariantes de unicidade que dependem do repositório.
3. Construir ou atualizar o agregado — invariantes internas são dele.
4. Consultar **propriedade de regra do agregado** para decidir o caminho.
5. Sincronizar integração externa pelo contrato declarado em `Core`.
6. Persistir **uma única vez**, ao final.

**Nunca:** conter regra de negócio, alterar estado interno (`entidade.Status = …`), conhecer o ORM
(`.Include`, `ChangeTracker`), instanciar infraestrutura (`new HttpClient()`), ou acumular
dependências até o construtor virar lista telefônica.

## Specifications

Encapsulam predicado, `Includes`, ordenação (com desempate) e paginação — a consulta inteira vive no
domínio. **Esta é a definição canônica e única de `ISpecification<T>` e `Specification<T>`**; as
demais skills referenciam daqui e não redeclaram. Ambas moram em `Core/Common`.

Quem traduz isso para `IQueryable` é o `SpecificationEvaluator` da camada `Data` —
[`persistencia-ef`](../persistencia-ef/SKILL.md) é o dono desse código.

```csharp
namespace <Produto>.<Modulo>.Core.Common;

/// <summary>Consulta de domínio: predicado, includes, ordenação e paginação.</summary>
public interface ISpecification<T>
{
    /// <summary>Predicado de filtro traduzido para SQL.</summary>
    Expression<Func<T, bool>> ToExpression();

    /// <summary>Relacionamentos a carregar junto.</summary>
    IReadOnlyList<Expression<Func<T, object>>> Includes { get; }

    /// <summary>Ordenação principal; nulo quando a consulta não ordena.</summary>
    Expression<Func<T, object>>? OrderBy { get; }

    /// <summary>Indica se a ordenação principal é descendente.</summary>
    bool OrdemDescendente { get; }

    /// <summary>Desempate da ordenação principal; obrigatório quando há paginação.</summary>
    Expression<Func<T, object>>? ThenBy { get; }

    /// <summary>Indica se o desempate é descendente.</summary>
    bool DesempateDescendente { get; }

    /// <summary>Registros a saltar; nulo quando a consulta não pagina.</summary>
    int? Pular { get; }

    /// <summary>Registros a devolver; nulo quando a consulta não pagina.</summary>
    int? Levar { get; }
}
```

```csharp
namespace <Produto>.<Modulo>.Core.Common;

/// <summary>Base das specifications, com composição por <c>And</c>.</summary>
public abstract class Specification<T> : ISpecification<T>
{
    private readonly List<Expression<Func<T, object>>> _includes = [];

    public abstract Expression<Func<T, bool>> ToExpression();

    public IReadOnlyList<Expression<Func<T, object>>> Includes => _includes.AsReadOnly();
    public Expression<Func<T, object>>? OrderBy { get; private set; }
    public bool OrdemDescendente { get; private set; }
    public Expression<Func<T, object>>? ThenBy { get; private set; }
    public bool DesempateDescendente { get; private set; }
    public int? Pular { get; private set; }
    public int? Levar { get; private set; }

    /// <summary>Compõe com outra specification por conjunção, preservando includes e ordenação.</summary>
    public Specification<T> And(Specification<T> outra) => new SpecificationComposta<T>(this, outra);

    protected void AdicionarInclude(Expression<Func<T, object>> include) => _includes.Add(include);

    protected void OrdenarPor(Expression<Func<T, object>> ordenacao, bool descendente = false)
    {
        OrderBy = ordenacao;
        OrdemDescendente = descendente;
    }

    protected void DesempatarPor(Expression<Func<T, object>> desempate, bool descendente = false)
    {
        ThenBy = desempate;
        DesempateDescendente = descendente;
    }

    protected void Paginar(int pular, int levar)
    {
        Pular = pular;
        Levar = levar;
    }
}
```

### `And` — por que não basta `Expression.AndAlso`

Cada lambda tem o **seu próprio** `ParameterExpression`. Combinar os corpos direto deixa a árvore com
dois parâmetros distintos, e o EF Core não traduz: compila, passa no teste em memória com
`Where(spec.ToExpression())` e falha só em runtime, contra o banco.

```csharp
// ❌ Corpos de lambdas diferentes: parâmetro "a" da primeira não existe na segunda.
Expression.Lambda<Func<T, bool>>(
    Expression.AndAlso(esquerda.Body, direita.Body),
    esquerda.Parameters[0]);

// ✅ Reescreve a segunda árvore para usar o parâmetro da primeira.
var direitaReescrita = ParameterReplacer.Substituir(direita.Body, direita.Parameters[0], parametro);
```

```csharp
namespace <Produto>.<Modulo>.Core.Common;

/// <summary>Reescreve uma árvore de expressão para usar outro parâmetro.</summary>
internal sealed class ParameterReplacer : ExpressionVisitor
{
    private readonly ParameterExpression _origem;
    private readonly ParameterExpression _destino;

    private ParameterReplacer(ParameterExpression origem, ParameterExpression destino)
    {
        _origem = origem;
        _destino = destino;
    }

    /// <summary>Devolve a expressão com todas as ocorrências de <paramref name="origem"/> trocadas.</summary>
    public static Expression Substituir(
        Expression expressao,
        ParameterExpression origem,
        ParameterExpression destino) =>
        new ParameterReplacer(origem, destino).Visit(expressao);

    protected override Expression VisitParameter(ParameterExpression node) =>
        node == _origem ? _destino : base.VisitParameter(node);
}
```

A composta preserva os `Includes` dos dois lados e herda ordenação e paginação — a da direita ganha
quando definida, para que `spec.And(new <Entidade>PaginadaSpec(paginacao))` funcione:

```csharp
namespace <Produto>.<Modulo>.Core.Common;

/// <summary>Conjunção de duas specifications, unindo includes, ordenação e paginação.</summary>
internal sealed class SpecificationComposta<T> : Specification<T>
{
    private readonly Specification<T> _esquerda;
    private readonly Specification<T> _direita;

    public SpecificationComposta(Specification<T> esquerda, Specification<T> direita)
    {
        _esquerda = esquerda;
        _direita = direita;

        foreach (var include in esquerda.Includes.Concat(direita.Includes))
            AdicionarInclude(include);

        var ordenacao = direita.OrderBy ?? esquerda.OrderBy;
        var descendente = direita.OrderBy is not null ? direita.OrdemDescendente : esquerda.OrdemDescendente;

        if (ordenacao is not null)
            OrdenarPor(ordenacao, descendente);

        var desempate = direita.ThenBy ?? esquerda.ThenBy;
        var desempateDescendente = direita.ThenBy is not null
            ? direita.DesempateDescendente
            : esquerda.DesempateDescendente;

        if (desempate is not null)
            DesempatarPor(desempate, desempateDescendente);

        var pular = direita.Pular ?? esquerda.Pular;
        var levar = direita.Levar ?? esquerda.Levar;

        if (levar is not null)
            Paginar(pular ?? 0, levar.Value);
    }

    public override Expression<Func<T, bool>> ToExpression()
    {
        var esquerda = _esquerda.ToExpression();
        var direita = _direita.ToExpression();
        var parametro = Expression.Parameter(typeof(T));

        var corpoEsquerda = ParameterReplacer.Substituir(esquerda.Body, esquerda.Parameters[0], parametro);
        var corpoDireita = ParameterReplacer.Substituir(direita.Body, direita.Parameters[0], parametro);

        return Expression.Lambda<Func<T, bool>>(
            Expression.AndAlso(corpoEsquerda, corpoDireita),
            parametro);
    }
}
```

`Includes` duplicado na composição é inofensivo — o EF Core deduplica. Já ordenação duplicada não
seria: por isso há um vencedor explícito em vez de acumular.

**Uma spec por filtro.** Nunca uma spec "guarda-chuva" com vários filtros opcionais e `null check`
dentro da expressão — o EF traduz o `OR NULL` literalmente e gera SQL pior. Componha no serviço:

```csharp
Specification<<Entidade>> spec = new <Entidade>Por<Chave>Spec(<chave>);

if (filtro.<Colecao>?.Count > 0)
    spec = spec.And(new <Entidade>Por<Colecao>Spec(filtro.<Colecao>));
```

## DTO

Transporte entre camadas. Responde "quais dados trafegam?".

- Sufixo `Dto` na classe **e** no arquivo.
- Tipos distintos para entrada (`Salvar<Entidade>Dto`) e saída (`<Entidade>ResumoDto`).
- `record` quando imutável, só dados e sem identidade.
- Convertido para o domínio **fora dele**, no serviço.
- Nunca: regra de negócio, comportamento de domínio, acesso a banco, dependência de service ou
  repository.

> Nem todo `record` é DTO — também modelam Command, Query, Value Object e evento de domínio.

## Value Object

Valor sem identidade própria, **definido pelo que contém**: dois CPFs com os mesmos dígitos são o
mesmo CPF. Diferença de fundo em relação ao DTO: o DTO transporta e não valida nada; o Value Object
**garante que só existe válido**. Num SaaS brasileiro, CPF, CNPJ, e-mail, telefone, dinheiro e
endereço são todos Value Object — não `string`.

`string Cpf` obriga cada consumidor a se perguntar se aquele valor já foi validado, e a resposta
espalha o mesmo `if` por controller, serviço e agregado. `Cpf` valida uma vez, no construtor.

| Value Object | Agregado | DTO |
|---|---|---|
| Igualdade por valor | Igualdade por `Id` | Sem semântica de igualdade |
| Imutável (`record`) | Muta por método de intenção | Imutável ou mutável (model binding) |
| Sem `Id` | Tem `Id` | Pode carregar `Id` como dado |
| Valida no construtor | Valida invariante em toda mutação | Não valida |

- `readonly record struct` para valor pequeno (uma ou duas propriedades); `sealed record` quando há
  coleção, mais campos ou herança de comportamento.
- Validação no construtor, lançando `DomainException` com a **mesma convenção `Msg*`** de constante
  pública dos agregados — é o que o teste assere.
- Normalize na construção (`Trim`, remover máscara, `ToLowerInvariant` em e-mail): duas grafias do
  mesmo valor devem produzir instâncias iguais.
- Sem `set`, sem método que altere estado. Mudança gera **instância nova** (`with`).
- Construtor `private` + factory `Criar` quando a normalização precede a validação, para não validar
  o valor cru.

```csharp
namespace <Produto>.<Modulo>.Core.Models.ValueObjects;

/// <summary>CPF válido e normalizado, sem máscara.</summary>
public readonly record struct Cpf
{
    public const string MsgObrigatorio = "CPF é obrigatório.";
    public const string MsgInvalido = "CPF informado não é válido.";

    private const int Tamanho = 11;

    private Cpf(string numero) => Numero = numero;

    /// <summary>Onze dígitos, sem ponto nem traço.</summary>
    public string Numero { get; }

    /// <summary>Valida e normaliza o valor informado.</summary>
    public static Cpf Criar(string? valor)
    {
        if (string.IsNullOrWhiteSpace(valor))
            throw new DomainException(MsgObrigatorio);

        var numero = new string(valor.Where(char.IsAsciiDigit).ToArray());

        if (numero.Length != Tamanho || !DigitosVerificadoresConferem(numero))
            throw new DomainException(MsgInvalido);

        return new Cpf(numero);
    }

    public override string ToString() => Numero;

    /// <summary>Formata como 000.000.000-00 para apresentação.</summary>
    public string Formatado() =>
        $"{Numero[..3]}.{Numero[3..6]}.{Numero[6..9]}-{Numero[9..]}";

    private static bool DigitosVerificadoresConferem(string numero)
    {
        if (numero.Distinct().Count() == 1)
            return false;

        return DigitoVerificador(numero, 9) == numero[9]
            && DigitoVerificador(numero, 10) == numero[10];
    }

    private static char DigitoVerificador(string numero, int quantidadeDeDigitos)
    {
        var peso = quantidadeDeDigitos + 1;
        var soma = 0;

        for (var indice = 0; indice < quantidadeDeDigitos; indice++)
            soma += (numero[indice] - '0') * peso--;

        var resto = soma * 10 % 11;

        return (char)('0' + (resto == 10 ? 0 : resto));
    }
}
```

`Formatado()` é apresentação de um valor que o próprio tipo já conhece — não é regra de negócio e não
justifica vazar a `string` crua para a view formatar. O que **não** entra aqui: consulta a banco,
chamada a serviço de validação externa, `ILogger`.

### Mapeamento no EF Core

O Value Object não conhece o EF, mas alguém precisa mapeá-lo. Três caminhos, por forma do tipo:

| Forma | Mapeamento | Resultado no banco |
|---|---|---|
| Uma propriedade (`Cpf`, `Email`) | `HasConversion` | Uma coluna |
| Várias propriedades, sem consulta por parte (`Endereco`) | `ComplexProperty` | Colunas irmãs na tabela |
| Coleção de valores | `OwnsMany` | Tabela própria |

`ComplexProperty` é o padrão para valor composto no EF Core 10 — não `OwnsOne`, que cria identidade
onde o domínio disse não haver. Detalhe e exemplo de configuration em
[`persistencia-ef`](../persistencia-ef/SKILL.md).

Value Object **nunca** é mockado em teste: construa o de verdade — é a regra de
[`testes-unitarios`](../testes-unitarios/SKILL.md).

## Quando criar um domínio novo

| Pergunta | Mesmo domínio | Domínios distintos |
|---|---|---|
| Regras de negócio são as mesmas? | Sim | Quase nada em comum |
| O negócio usa a mesma linguagem? | Mesmo vocabulário | Vocabulários distintos |
| As mudanças acontecem juntas? | Evoluem juntos | Evoluem independente |
| Há dependência constante entre modelos? | Poucos pontos de integração | Tudo depende de tudo |

**Sinais de domínio inchado:** um modelo virou o centro do sistema; serviços de contextos diferentes
acessam a mesma entidade de formas diferentes; proliferação de `if (tipo == A) … if (tipo == B)`;
a classe tem vários motivos distintos para mudar.

**Comunicação entre domínios:** não compartilhe entidade. Referencie por identificador
(`<entidadeA>.Id<EntidadeB>`), não navegue pelo objeto de outro domínio.

**Regra de ouro:** se a pergunta que o negócio faz muda, o domínio provavelmente muda.
