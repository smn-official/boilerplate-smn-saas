---
name: testes-dotnet
description: Testes automatizados em .NET 10 com xUnit v3, Moq e FluentAssertions — organização espelhando o código, nomenclatura, o que testar em agregado e serviço, e comandos de validação. Use ao escrever, revisar ou executar testes.
agent: net10-agent
---

# Testes automatizados

## Organização

Os testes **espelham o caminho** do artefato de produção:

```text
src/<Produto>.<Modulo>/Core/Models/Aggregates/<Entidade>/<Entidade>.cs
src/<Produto>.<Modulo>/Tests/Core/Models/Aggregates/<Entidade>/<Entidade>Tests.cs
```

```text
src/<Produto>.<Modulo>/Tests/     testes de Core e Data
├── Arquitetura/                  nomes de assembly e regras estruturais
└── Core/
    ├── Models/Aggregates/…       invariantes dos agregados
    └── Services/                 orquestração, com dependências mockadas

src/<Produto>.<Modulo>.Web/Tests/ testes da apresentação
└── Arquitetura/
```

O projeto Web exclui `Tests\**` do próprio csproj (`DefaultItemExcludes`) para não compilar os
testes dentro da aplicação. `TreatWarningsAsErrors` vem do `Directory.Build.props` da raiz e vale
para todos os projetos.

## Ferramentas

- **xUnit v3** como framework.
- **FluentAssertions** para asserções.
- **Moq** somente para dependências externas ao objeto testado.
- **HtmlAgilityPack** para asserção sobre HTML renderizado (camada Web).

## Nomenclatura

`Metodo_Cenario_ResultadoEsperado`:

```csharp
[Fact]
public void Construtor_QuandoCodigoVazio_DeveLancarExcecao()
{
    var acao = () => new <Entidade>(string.Empty, <outros>);

    acao.Should()
        .Throw<ArgumentException>()
        .WithMessage(<Entidade>.MsgCodigoObrigatorio);
}
```

## Regras

- Cada teste valida **um comportamento observável**.
- Agregados são testados pela **API pública** — nunca expor setter para facilitar o teste.
- Testes de agregado assertam pela **constante de mensagem** exposta pelo agregado, nunca por string
  literal duplicada e nunca por sigla de requisito.
- Serviços recebem dependências por construtor; mocks apenas nos limites necessários.
- **Não testar** implementação privada, detalhe de framework ou estrutura interna sem comportamento
  associado.
- Factory privada dentro da classe de teste pode reduzir repetição de construção.
- Dado compartilhado entre módulos só quando a repetição for real.
- Teste de regressão **reproduz primeiro o defeito** observado, depois corrige.

## O que testar em cada artefato

| Artefato | Testar | Não testar |
|---|---|---|
| Agregado | Invariantes, transições de estado, propriedades de regra calculadas | Getters triviais |
| Serviço | Orquestração: qual método foi chamado, em que ordem, o que foi persistido | Regra que pertence ao agregado |
| Specification | A expressão resultante filtra o esperado | Tradução para SQL |
| Repositório | Geralmente coberto por teste de integração, não unitário | Comportamento do EF |
| Controller | Retorno correto por cenário; ViewModel montada | Regra de negócio |
| Arquitetura | Nomes de assembly, direção de dependência | — |

## Execução

```bash
dotnet test <Produto>.slnx -c Release
```

Validação completa antes de entregar:

```bash
npm --prefix src/<Produto>.<Modulo>.Web run typecheck
dotnet build <Produto>.slnx -c Release
dotnet test <Produto>.slnx -c Release --no-build
```

Uma entrega só é válida quando build, testes e typecheck passam **sem erros e sem avisos**. Se algo
falhar, reporte a saída real — nunca declare sucesso sem ter executado.
