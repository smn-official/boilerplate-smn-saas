---
name: testes-ui
description: Testes da camada de apresentação com HtmlAgilityPack — asserção sobre o HTML efetivamente renderizado, validação de desktop e mobile e garantia de ausência de overflow horizontal. Use ao testar View, partial, ViewModel renderizada ou estrutura responsiva.
agent: tester-agent
---

# Testes de UI

## Escopo

Este nível responde **"a tela renderizou a estrutura certa?"** — não "está bonita". Estilo visual,
cor e espaçamento exato não são testáveis aqui; estrutura, conteúdo e classes responsivas são.

| Testar | Não testar |
|---|---|
| Elemento existe, com o texto vindo da ViewModel | Cor, sombra, pixel exato |
| Formulário com `action`, `method` e campos esperados | Comportamento de JavaScript no navegador |
| Estado condicional: bloco aparece só no cenário certo | Ordem de folhas de estilo |
| Classes que definem o comportamento responsivo | Nome de classe utilitária sem efeito estrutural |

Os testes ficam em `src/<Produto>.<Modulo>.Web/Tests/`, espelhando o caminho da View. O csproj da Web
exclui `Tests\**` (`DefaultItemExcludes`) para não compilar os testes na aplicação.

## HtmlAgilityPack

Renderize a View e asserte sobre o DOM resultante — nunca sobre a string bruta com `Contains`.
Comparação de string quebra a cada mudança de espaçamento e não distingue atributo de texto.

```csharp
[Fact]
public void Index_ComListaVazia_DeveExibirMensagemDeVazio()
{
    var html = Renderizar("<Entidade>/Index", new <Entidade>ViewModel { Itens = [] });

    var documento = new HtmlDocument();
    documento.LoadHtml(html);

    documento.DocumentNode
        .SelectSingleNode("//*[@data-test='lista-vazia']")
        .Should().NotBeNull();
}
```

Regras de seleção:

- Prefira um atributo estável de teste (`data-test`) a seletor por classe de estilo.
- Classe utilitária muda com o design; `data-test` só muda quando a estrutura muda de propósito.
- Asserte a **ausência** também: bloco restrito não pode aparecer no cenário sem permissão.

```csharp
documento.DocumentNode.SelectNodes("//*[@data-test='acao-restrita']").Should().BeNull();
```

## Desktop e mobile

Toda tela é validada nos **dois** contextos. O que muda entre eles é estrutural e, portanto,
assertável: quais blocos existem, quais colunas colapsam, qual navegação é exibida.

| Contexto | Verificar |
|---|---|
| Desktop | Tabela completa, colunas secundárias presentes, navegação lateral |
| Mobile | Cartões ou lista em coluna única, colunas secundárias ocultas, menu compacto |

```csharp
[Theory]
[InlineData("<seletor-tabela-desktop>")]
[InlineData("<seletor-cartao-mobile>")]
public void Index_ComItens_DeveRenderizarAmbasAsApresentacoes(string seletor)
```

Uma apresentação escondida por classe responsiva ainda está no HTML: asserte a **classe que a
esconde**, não a ausência do nó.

## Sem overflow horizontal

A página **nunca** rola horizontalmente, em nenhuma largura. É a falha responsiva mais comum e a mais
barata de prevenir por teste estrutural.

| Verificar | Motivo |
|---|---|
| Nenhuma largura fixa em elemento de layout | Largura fixa maior que a viewport estoura a página |
| Conteúdo largo (tabela, bloco de código) dentro de contêiner com rolagem própria | A rolagem fica no contêiner, não no `body` |
| Imagem e mídia limitadas à largura do contêiner | Imagem grande empurra o layout |
| Texto longo sem quebra tratado explicitamente | Palavra ou URL contínua estoura a coluna |

```csharp
[Fact]
public void Index_ComTabelaLarga_DeveEnvolverEmContainerComRolagemPropria()
{
    var documento = CarregarRenderizado("<Entidade>/Index", <viewModel>);

    var tabela = documento.DocumentNode.SelectSingleNode("//table");

    tabela.ParentNode.GetAttributeValue("class", string.Empty)
        .Should().Contain("<classe-de-rolagem-horizontal>");
}
```

Toda tabela, diagrama ou bloco largo entra num contêiner com rolagem própria. Sem exceção.

## Checklist de revisão

- [ ] Asserção sobre nós do DOM, nunca `Contains` na string do HTML.
- [ ] Seleção por atributo estável de teste, não por classe utilitária.
- [ ] Cenário positivo e negativo (elemento presente e ausente).
- [ ] Desktop e mobile validados.
- [ ] Conteúdo largo confinado em contêiner com rolagem própria.
- [ ] Nenhuma largura fixa em elemento de layout.
- [ ] `npm run typecheck` e `dotnet test` executados, saída conferida.

## Execução

```bash
npm --prefix src/<Produto>.<Modulo>.Web run typecheck
dotnet build <Produto>.slnx -c Release
dotnet test <Produto>.slnx -c Release --no-build
```

Sem erros e sem avisos. Nunca declare que passou sem ter executado; se falhou, reporte a saída real.
