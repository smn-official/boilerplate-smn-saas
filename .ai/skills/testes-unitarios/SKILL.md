---
name: testes-unitarios
description: Testes unitários em xUnit v3 com FluentAssertions e Moq — agregado testado pela API pública, asserção por constante de mensagem, mock só nos limites, factory privada e um comportamento observável por teste. Use ao escrever ou revisar teste de agregado, serviço, specification ou controller.
agent: tester-agent
---

# Testes unitários

## Organização

Espelham o caminho do artefato de produção:

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

`TreatWarningsAsErrors` vem do `Directory.Build.props` da raiz e vale para todo projeto da solução,
inclusive os de teste — aviso é erro.

## Nomenclatura

`Metodo_Cenario_ResultadoEsperado`. O nome é a documentação do cenário; não use comentário.

| Bom | Ruim |
|---|---|
| `Ativar_QuandoJaAtivo_DeveLancarExcecao` | `TesteAtivar2` |
| `Construtor_QuandoCodigoVazio_DeveLancarExcecao` | `DeveFalhar` |
| `Total_ComTresItens_DeveSomarValores` | `TestTotal` |

## Estrutura de um teste

Arrange, act, assert separados por linha em branco. Um comportamento observável por teste.

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

## Agregado

- Teste **exclusivamente pela API pública**. Se a invariante não é alcançável pelo construtor ou por
  um método público, ela não existe para o consumidor.
- **Nunca** adicione setter público, construtor `internal` ou `InternalsVisibleTo` para facilitar o
  teste. A dificuldade de construir o agregado é sinal de desenho, não de teste.
- A asserção de mensagem usa a **constante exposta pelo agregado**:

```csharp
acao.Should().Throw<ArgumentException>().WithMessage(<Entidade>.MsgCodigoObrigatorio);
```

Nunca duplique a string literal no teste — o teste passaria a validar a si mesmo e a mensagem poderia
mudar em produção sem quebrar nada. Nunca embuta sigla de requisito (`RN-*`) na constante ou no nome.

- Transições de estado: teste o caminho válido **e** o inválido.

```csharp
[Fact]
public void Ativar_QuandoJaAtivo_DeveLancarExcecao()
{
    var <entidade> = Criar<Entidade>();
    <entidade>.Ativar();

    var acao = () => <entidade>.Ativar();

    acao.Should().Throw<InvalidOperationException>().WithMessage(<Entidade>.MsgJaAtivo);
}
```

## Factory privada

Para reduzir repetição de construção, use uma factory privada **na própria classe de teste**, com
valores default sobrescrevíveis por parâmetro opcional:

```csharp
private static <Entidade> Criar<Entidade>(string codigo = "<codigo-valido>") =>
    new(codigo, <outros>);
```

Regras: privada, estática, sem lógica condicional, sem estado compartilhado. Quando a construção
passa a ser usada por várias classes de teste, promova para builder — veja `dados-teste`.

## Serviço e Moq

Mock **somente nos limites** do objeto testado: dependências injetadas por construtor que representam
I/O, tempo ou outro agregado. Nunca faça mock do objeto sob teste nem de tipo do próprio domínio que
poderia ser construído de verdade.

```csharp
[Fact]
public async Task Cadastrar_QuandoDadosValidos_DevePersistir<Entidade>()
{
    var repositorio = new Mock<I<Entidade>Repository>();
    var servico = new <Entidade>Service(repositorio.Object);

    await servico.CadastrarAsync(<dto>, CancellationToken.None);

    repositorio.Verify(
        r => r.AdicionarAsync(It.IsAny<<Entidade>>(), It.IsAny<CancellationToken>()),
        Times.Once);
}
```

| Faça | Não faça |
|---|---|
| Mock de repositório, gateway, relógio | Mock de agregado ou value object |
| `Verify` do que o serviço deve orquestrar | `Verify` de tudo que foi chamado |
| `It.IsAny<CancellationToken>()` no token | Setup de método que o teste não exercita |

Excesso de `Setup` acopla o teste à implementação: configure apenas o necessário para o cenário.

## Specification

Aplique a expressão compilada sobre uma coleção em memória e asserte o conjunto:

```csharp
[Fact]
public void Satisfies_ComItensMistos_DeveFiltrarSomenteAtivos()
{
    var spec = new <Entidade>AtivaSpecification();

    var resultado = <colecao>.AsQueryable().Where(spec.ToExpression()).ToList();

    resultado.Should().ContainSingle().Which.Codigo.Should().Be("<codigo-esperado>");
}
```

## Controller

Um teste por cenário de retorno. Asserte o tipo do resultado e a ViewModel montada:

```csharp
resultado.Should().BeOfType<ViewResult>()
    .Which.Model.Should().BeOfType<<Entidade>ViewModel>();
```

Nunca asserte regra de negócio a partir do controller — ela pertence ao agregado.

## Checklist de revisão

- [ ] Nome segue `Metodo_Cenario_ResultadoEsperado`.
- [ ] Um comportamento observável por teste.
- [ ] Nenhum setter, construtor ou membro exposto só para o teste.
- [ ] Mensagem assertada pela constante do agregado, não por literal.
- [ ] Mock apenas nos limites; nenhum `Setup` sem uso.
- [ ] Dados determinísticos (veja `dados-teste`).
- [ ] `dotnet test` executado, saída conferida.

## Execução

```powershell
dotnet test <Produto>.slnx -c Release
```

Sem erros e sem avisos. Nunca declare que passou sem ter executado; se falhou, reporte a saída real.
