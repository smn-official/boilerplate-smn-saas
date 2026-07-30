# Testes

> **Template do boilerplate.** Preencha ao implementar e remova este aviso.

O que se testa, em que nível, com quais ferramentas — e o que **deliberadamente não se testa**. A
última parte é tão normativa quanto a primeira: teste que não pode falhar por um defeito real é custo
de manutenção sem retorno.

Estratégia completa em
[`estrategia-testes`](../../.ai/skills/estrategia-testes/SKILL.md).

## Pirâmide

```text
        ┌───────────────┐
        │      UI       │  poucos, lentos, HTML renderizado
        ├───────────────┤
        │  Integração   │  alguns, banco real, fora do build local
        ├───────────────┤
        │   Unitários   │  muitos, rápidos, sem I/O
        └───────────────┘
```

| Nível | Alvo | Custo | Regra |
|---|---|---|---|
| Unitário | Agregado, serviço, specification, controller | Milissegundos | Roda em todo build |
| Integração | Repositório, migration, query real | Segundos | Suíte separada |
| UI | View renderizada, layout | Segundos | Só o que a estrutura garante |

**Norma:** quando o mesmo comportamento pode ser coberto em dois níveis, cubra no **mais baixo**.
Suba de nível apenas para validar a integração em si, nunca para repetir a regra.

## Ferramentas

Fixas pelo boilerplate — não são escolha por projeto.

| Ferramenta | Papel | Onde |
|---|---|---|
| `xunit.v3` | Runner e framework | Todos os projetos de teste |
| `Moq` | Dublês nos limites (repositório, integração) | Testes de serviço |
| `FluentAssertions` | Asserção legível, mensagem de falha útil | Todos |
| `HtmlAgilityPack` | Asserção sobre o HTML efetivamente renderizado | `.Web.Tests` |
| `Microsoft.NET.Test.Sdk` | Execução | Todos |

`TreatWarningsAsErrors` vem do `Directory.Build.props` da raiz e vale para todos os projetos,
inclusive os de teste. O projeto Web exclui `Tests\**` do próprio
csproj via `DefaultItemExcludes`, para não compilar os testes dentro da aplicação.

## O que testar em cada artefato

| Artefato | Testar | Não testar |
|---|---|---|
| Agregado | Invariantes, transições de estado, propriedades de regra calculadas | Getters triviais |
| Serviço | Orquestração: qual método foi chamado, em que ordem, o que foi persistido | Regra do agregado |
| Specification | Que a expressão resultante filtra exatamente o esperado | Tradução para SQL |
| Repositório | Integração com banco real — **nunca** unitário com mock de `DbContext` | Comportamento do EF |
| Controller | Retorno correto por cenário e ViewModel montada com os dados certos | Regra de negócio |
| View | HTML renderizado: elementos, textos, estrutura responsiva | Estilo visual pixel a pixel |
| Arquitetura | Nomes de assembly e direção de dependência entre camadas | — |

### Agregado

Cada invariante é um teste. Cada transição de estado válida é um teste; cada transição **inválida**
também — o caminho de exceção é regra de negócio, não borda.

A asserção usa a **constante de mensagem pública** do agregado, nunca a string duplicada no teste:

```csharp
[Fact]
public void Aprovar_QuandoCancelado_DeveLancarDomainException()
{
    var entidade = Criar<Entidade>Cancelada();

    var acao = () => entidade.Aprovar();

    acao.Should().Throw<DomainException>()
        .WithMessage(<Entidade>.Msg<Entidade>Cancelado);
}
```

### Serviço

O serviço não tem regra própria. Teste que ele chamou o repositório certo, com o argumento certo, e
que traduziu o resultado. **Se um teste de serviço está assertando regra, essa regra vazou do
agregado** — corrija o código, não o teste.

### Specification

Monte a coleção em memória, aplique a expressão compilada, asserte o conjunto filtrado. Não asserte a
árvore de expressão nem o SQL gerado.

### Controller

Um teste por cenário de retorno: sucesso, entrada inválida, recurso inexistente, sem permissão. A
asserção é sobre o tipo do resultado e sobre a ViewModel — nunca sobre efeito de domínio.

### View

Com HtmlAgilityPack, sobre o HTML de verdade: os elementos esperados existem, os textos vêm da
ViewModel, a estrutura responsiva está presente e **não há overflow horizontal**. Nunca sobre pixel.

## Unitário vs. integração

A fronteira é a **entrada/saída real**.

| Cubra por integração | Cubra por unitário |
|---|---|
| Repositório: consulta, gravação, filtro por specification | Invariante de agregado |
| Migration: aplica e reverte sem erro | Orquestração do serviço |
| Constraint, índice único, cascade | Expressão da specification em memória |
| Mapeamento de enum para string | Regra calculada |

**Repositório não se testa unitariamente.** Mock de `DbContext` valida a expectativa do autor sobre o
EF Core, não o comportamento real — tradução de expressão, tracking, mapeamento de enum e constraint
de banco só aparecem contra um banco de verdade.

### Banco real em container efêmero

**Norma:** o banco é subido em container **pela suíte**, por execução, e descartado ao fim. Nunca
aponte testes para banco compartilhado, de desenvolvimento ou de homologação — a suíte passa a
depender de estado alheio e falha de forma não reproduzível.

| Regra | Motivo |
|---|---|
| Container criado pela suíte, não pelo desenvolvedor | Roda igual na máquina local e na esteira |
| Porta atribuída dinamicamente | Duas execuções simultâneas não colidem |
| Migrations aplicadas uma vez, no setup da fixture | Custo pago uma vez, não por teste |
| Container destruído no teardown | Sem resíduo entre execuções |

O **isolamento entre testes vem da transação**, não de recriar o container: cada teste abre uma
transação no setup e faz rollback no teardown.

```csharp
public sealed class <Entidade>RepositoryTests : IClassFixture<BancoFixture>, IAsyncLifetime
{
    private readonly BancoFixture _fixture;
    private IDbContextTransaction _transacao = null!;

    public <Entidade>RepositoryTests(BancoFixture fixture) => _fixture = fixture;

    public async ValueTask InitializeAsync() =>
        _transacao = await _fixture.Contexto.Database.BeginTransactionAsync();

    public async ValueTask DisposeAsync() => await _transacao.RollbackAsync();
}
```

Rollback sempre, inclusive quando o teste falha. Nada de `DELETE` ou `TRUNCATE` entre testes — o
rollback já faz isso, e mais barato.

### Separação das suítes

Testes de integração são lentos e **não rodam a cada build local**. Marque com categoria:

```csharp
[Fact]
[Trait("Category", "Integracao")]
public async Task ObterPorCodigoAsync_QuandoExiste_DeveRetornar<Entidade>()
```

Uma suíte unitária que leva minutos deixa de ser executada. Mantenha a separação mesmo quando parecer
burocrática.

## Organização

```text
src/<Produto>.<Modulo>/Tests/     espelha os caminhos de Core e Data
├── Arquitetura/                  nomes de assembly e regras estruturais
└── Core/
    ├── Models/Aggregates/…       invariantes dos agregados
    └── Services/                 orquestração, com repositórios e integrações mockados

src/<Produto>.<Modulo>.Web/Tests/ testes da apresentação
└── Arquitetura/
```

A estrutura de pastas dos testes **espelha** a do código testado. Nomenclatura de método:
`Metodo_QuandoCondicao_DeveResultado`.

Dados de teste vêm de builders/object mothers determinísticos — sem `Random`, sem `DateTime.Now`. Um
teste que falha uma vez a cada vinte execuções é pior que teste nenhum, porque ensina a equipe a
ignorar falha vermelha.

## Como rodar

```powershell
dotnet build <Produto>.slnx -c Release
dotnet test <Produto>.slnx -c Release --no-build
```

Só a suíte unitária:

```powershell
dotnet test <Produto>.slnx -c Release --no-build --filter "Category!=Integracao"
```

Só a de integração:

```powershell
dotnet test <Produto>.slnx -c Release --no-build --filter "Category=Integracao"
```

Um teste específico:

```powershell
dotnet test <Produto>.slnx -c Release --no-build --filter "FullyQualifiedName~<Entidade>Tests"
```

**Norma: nunca declare que a suíte passou sem ter executado.** Se falhou, reporte a saída real —
inclusive falha de subida do container, que é resultado de teste como qualquer outro.

## Teste de regressão

Ordem obrigatória, sem atalho:

1. Reproduza o defeito em um teste que **falha pelo motivo certo** — confira a mensagem.
2. Só então corrija o código de produção.
3. Rode de novo: o teste passa e nenhum outro quebrou.

Corrigir antes de reproduzir impede saber se o teste realmente cobre o defeito. Acontece o tempo
todo: o teste escrito depois da correção passa desde o primeiro segundo e ninguém percebe que ele
passaria mesmo com o bug de volta.

## Critério de cobertura

**Cobertura de linha não é meta.** A pergunta é:

> Existe um defeito plausível neste artefato que nenhum teste atual detectaria?

Enquanto a resposta for sim e o defeito for plausível, falta teste. Quando a resposta só produz
cenários artificiais, a cobertura está adequada.

*Se o projeto adotar um piso numérico por exigência externa (contrato, auditoria), registre aqui o
valor e a ferramenta que o mede — e trate-o como piso, não como objetivo.*

## O que deliberadamente não se testa

**Norma:**

- **Implementação privada.** Se só se alcança por reflexão, não é comportamento observável.
- **Detalhe de framework.** EF Core, roteamento e model binding já têm suíte própria.
- **Getter trivial.** Propriedade que só devolve o campo não pode falhar sozinha.
- **Estrutura interna sem comportamento associado.** Contagem de campos, ordem de propriedades.
- **Configuração estática sem lógica.** `appsettings`, registro de DI sem condicional.
- **SQL gerado e plano de execução.** Detalhe de implementação do provider.
- **Estilo visual pixel a pixel.** A View é testada por estrutura, não por aparência.

## Cobertura específica deste projeto

*Registre aqui o que este domínio exige de cobertura além do padrão — fluxo crítico com teste
obrigatório, cenário regulatório, integração que precisa de contrato verificado.*
