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

```csharp
public abstract class AggregateRoot<TId>
{
    public TId Id { get; protected init; }
}
```

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

Encapsulam predicado, `Includes` e ordenação — consulta vive no domínio.

```csharp
public abstract class Specification<T> : ISpecification<T>
{
    private readonly List<Expression<Func<T, object>>> _includes = [];

    public abstract Expression<Func<T, bool>> ToExpression();
    public IReadOnlyList<Expression<Func<T, object>>> Includes => _includes.AsReadOnly();
    public Expression<Func<T, object>> OrderBy { get; private set; }
    public bool OrdemDescendente { get; private set; }

    protected void AdicionarInclude(Expression<Func<T, object>> include) => _includes.Add(include);

    protected void OrdenarPor(Expression<Func<T, object>> ordenacao, bool descendente = false)
    {
        OrderBy = ordenacao;
        OrdemDescendente = descendente;
    }
}
```

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
