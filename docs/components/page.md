# Página

Toda tela autenticada do produto nasce dentro do mesmo shell: barra superior, navegação e área de
conteúdo. A página não inventa layout — ela preenche o slot de conteúdo e declara seu cabeçalho.

Quem decide a estrutura é o layout compartilhado. A view da feature começa no `<h1>`, nunca no
`<body>`. Layout padrão em `Features/_ViewStart.cshtml`, conforme
[`feature-web`](../../.ai/skills/feature-web/SKILL.md).

## Anatomia do shell

```text
┌──────────────────────────────────────────────────────────────────┐
│ ☰  <Marca>   Início / <Feature>              [tema] [avatar]     │  barra superior (aderente)
├────┬─────────────────────────────────────────────────────────────┤
│ ▣  │  ┌───────────────────────────────────────────────────┐      │
│ ▢  │  │ [ícone] <Título da página>       [ Ação primária ] │      │  cabeçalho de página
│ ▢  │  │         <subtítulo de uma linha>                   │      │
│ ▢  │  └───────────────────────────────────────────────────┘      │
│ ▢  │                                                             │
│    │  bloco 1                                                    │  área de conteúdo (rola)
│    │  bloco 2                                                    │
└────┴─────────────────────────────────────────────────────────────┘
  ↑ navegação
```

| Região | Elemento | Responsabilidade |
|---|---|---|
| Barra superior | `<header>` | Gatilho de menu, marca, breadcrumb, ações globais (tema, identidade) |
| Navegação | `<nav>` | Rail de ícones no desktop e tablet, offcanvas no mobile — ver [menu.md](menu.md) |
| Área de conteúdo | `<main>` | Único elemento que rola verticalmente |
| Contêiner de página | `<div>` interno ao `<main>` | Largura máxima e espaçamento entre blocos |

A barra superior é aderente e a navegação é fixa; **a rolagem vertical pertence ao `<main>`**, nunca
ao contêiner centralizado nem ao `<body>`. É isso que mantém barra e menu visíveis durante a leitura
de uma lista longa.

## Cabeçalho de página

Primeiro bloco de toda página. Quatro partes, três delas opcionais:

| Parte | Obrigatória | Token | Observação |
|---|---|---|---|
| Ícone da feature | não | `size-6` | Decorativo — `aria-hidden="true"`, ver [icon.md](icon.md) |
| Título | **sim** | `text-h1` | O único `<h1>` da página |
| Subtítulo | não | `text-body` em `text-texto-suave` | Uma linha; explica o que a tela resolve |
| Ação primária | não | ver [button.md](button.md) | Uma só; as demais são secundárias |

Não existe rótulo de categoria acima do título — pílula, eyebrow ou dot são **proibidos**, ver
[badge.md](badge.md). Quem informa a categoria é o breadcrumb e o item ativo do menu.

### Comportamento da ação primária por faixa

| Faixa | Posição | Largura |
|---|---|---|
| Mobile 320–767 | Abaixo do bloco de texto | Largura total (`w-full`) |
| Tablet 768–1023 | À direita, mesma linha do título | Natural |
| Desktop 1024+ | À direita, mesma linha do título | Natural |

Quando a página é uma lista longa e essa ação é frequente, ela ganha **também** uma versão flutuante
no mobile, ancorada à viewport para não sumir com a rolagem — critérios e markup em
[button.md](button.md). O botão do cabeçalho continua existindo; o flutuante é o mesmo comando, não
um substituto.

Em mobile o botão desce e ocupa a linha inteira — nunca fica espremido ao lado de um título que
quebra em três linhas. Isso é a regra de ação primária em tela estreita de
[`acessibilidade-responsivo`](../../.ai/skills/acessibilidade-responsivo/SKILL.md), que é normativa.

Se houver duas ações, a secundária fica abaixo da primária no mobile e à esquerda dela no desktop —
nunca dois botões minúsculos lado a lado em 320px.

## Breadcrumb

Mora na barra superior, não no cabeçalho de página. Marca a posição do usuário na hierarquia.

| Faixa | O que aparece |
|---|---|
| Mobile 320–767 | **Oculto** — o espaço é da marca e do gatilho de menu |
| Tablet 768–1023 | Encurtado: ícone de início + página atual |
| Desktop 1024+ | Trilha completa: `Início / <Seção> / <Página atual>` |

Regras:

- **Máximo de três níveis.** Hierarquia mais profunda que isso indica navegação mal desenhada, não
  breadcrumb curto demais.
- **O item atual não é link.** Ele é `<span aria-current="page">`. Link que aponta para a página em
  que já se está é uma parada de teclado que não faz nada — ruído para quem navega por `Tab`.
- Os níveis anteriores são `<a href>` reais, com URL gerada por `Url.Action` e `nameof`.
- O separador é decorativo: `aria-hidden="true"`.
- Ocultar no mobile é `hidden md:block` no markup, não `display:none` por script — a informação não é
  essencial ali e o menu já mostra onde o usuário está.

## Empilhamento vertical

O contêiner de página controla a pilha e o espaçamento entre blocos. **Não se redefine caso a caso.**

```razor
<div class="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
```

- `max-w-*` é único no produto — largura máxima decidida uma vez, no layout.
- `gap-*` no contêiner, não `mt-*`/`mb-*` no filho. Margem por bloco produz espaçamento irregular
  assim que alguém reordena a página.
- Espaço vazio excessivo entre blocos é um dos sinais de tela genérica, ver
  [aparencia-generica.md](../../.ai/docs/aparencia-generica.md).

## Regras

- **Um `<h1>` por página**, e ele é o título do cabeçalho de página. Seções internas começam em
  `<h2>`; card usa `<h3>`. Nunca pular nível para acertar tamanho — tamanho vem do token, não da tag.
- **O título casa com o item ativo do menu.** Se o menu diz "<Feature>" e o `<h1>` diz outra coisa, um
  dos dois está errado. Mesmo vocabulário, mesma palavra.
- **A rolagem é do `<main>`.** `overflow-y-auto` no `<main>`, `overflow-hidden` no shell externo.
- **Nunca overflow horizontal**, em 320, 768, 1024 e 1440. Causas e correções em
  [`acessibilidade-responsivo`](../../.ai/skills/acessibilidade-responsivo/SKILL.md).
- **Skip link é o primeiro elemento focável do layout**, aponta para o `id` do `<main>` e fica
  visível ao receber foco (`sr-only focus:not-sr-only`).
- **Landmarks nativos:** `<header>`, `<nav>`, `<main>`. Um `<main>` por documento. Nada de
  `<div role="main">` — elemento nativo já traz o papel.
- **Título do documento** repete o `<h1>`: `<Página> · <Produto>`. É o que o leitor de tela anuncia
  ao trocar de rota e o que aparece na aba.
- Cor sempre por token semântico — `bg-superficie`, `text-texto`, `text-texto-suave`, `border-borda`,
  `bg-primaria`. Valor literal na view é erro, ver
  [`tailwind-design`](../../.ai/skills/tailwind-design/SKILL.md).

## Estados

**A página inteira projeta quatro estados**, não só o caminho feliz. Tela que só existe com dados
está incompleta e não é entregue — ver [aparencia-generica.md](../../.ai/docs/aparencia-generica.md).

| Estado | Onde vive | Regra |
|---|---|---|
| Carregando | Área de conteúdo | Cabeçalho e menu permanecem; só o conteúdo é substituído |
| Vazio | Área de conteúdo | Texto diz o que criar e oferece a ação; ilustração opcional |
| Erro | Área de conteúdo | Diz o que falhou e o que fazer, não "algo deu errado" |
| Sem permissão | Área de conteúdo | Explica quem libera o acesso; a ação primária não é renderizada |

Em nenhum deles o shell desaparece: o usuário continua enxergando onde está e consegue navegar para
outro lugar. Substituir a página inteira por uma mensagem centralizada tira a saída de quem errou o
caminho.

Qual estado renderizar é decisão da ViewModel, resolvida como booleano pronto. A view não deriva
estado por cadeia de `if/else`, conforme [`feature-web`](../../.ai/skills/feature-web/SKILL.md).

## Markup — layout

```razor
@* Features/Shared/_Layout.cshtml *@
<a href="#conteudo"
   class="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-lg
          focus:bg-superficie focus:px-4 focus:py-2 focus:text-body-sm focus:text-texto
          focus:outline-2 focus:outline-offset-2 focus:outline-primaria">
    Pular para o conteúdo
</a>

<div class="flex h-dvh overflow-hidden bg-superficie text-texto">
    <partial name="_Menu" model="Model.Menu" />

    <div class="flex min-w-0 flex-1 flex-col">
        <header class="flex h-14 shrink-0 items-center gap-3 border-b border-borda px-4 sm:px-6">
            <button type="button"
                    data-menu-gatilho
                    aria-controls="menu-principal"
                    aria-expanded="false"
                    aria-label="Abrir menu"
                    class="inline-flex size-11 items-center justify-center rounded-lg md:hidden
                           focus-visible:outline-2 focus-visible:outline-offset-2
                           focus-visible:outline-primaria">
                <icon name="menu" class="size-5" aria-hidden="true" />
            </button>

            <a href="@Url.Action(nameof(InicioController.Painel), "Inicio")"
               class="text-h4 text-texto">@Model.Marca</a>

            <nav aria-label="Trilha de navegação" class="hidden min-w-0 md:block">
                <ol class="flex items-center gap-2 text-body-sm text-texto-suave">
                    @foreach (var nivel in Model.Trilha)
                    {
                        <li class="hidden items-center gap-2 lg:flex">
                            <a href="@nivel.Url" class="hover:text-texto">@nivel.Rotulo</a>
                            <icon name="chevron-right" class="size-4" aria-hidden="true" />
                        </li>
                    }
                    <li class="min-w-0">
                        <span aria-current="page" class="block truncate text-texto">
                            @Model.TituloPagina
                        </span>
                    </li>
                </ol>
            </nav>

            <div class="ml-auto flex items-center gap-2">
                <button type="button"
                        aria-label="Alternar tema"
                        class="inline-flex size-11 items-center justify-center rounded-lg
                               focus-visible:outline-2 focus-visible:outline-offset-2
                               focus-visible:outline-primaria">
                    <icon name="sun" class="size-5" aria-hidden="true" />
                </button>

                <div class="flex items-center gap-3">
                    <span class="hidden text-right lg:block">
                        <span class="block text-body-sm text-texto">@Model.Usuario.Nome</span>
                        <span class="block text-caption text-texto-suave">@Model.Usuario.Papel</span>
                    </span>
                    <img src="@Model.Usuario.Avatar" alt="" class="size-9 shrink-0 rounded-full" />
                </div>
            </div>
        </header>

        <main id="conteudo" class="min-h-0 flex-1 overflow-y-auto">
            <div class="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
                @RenderBody()
            </div>
        </main>
    </div>
</div>
```

O avatar leva `alt=""`: o nome do usuário já está no texto ao lado, e no mobile — onde o texto some —
a identidade não é a informação que a tela precisa anunciar.

## Markup — cabeçalho de página

```razor
@* Features/Shared/_CabecalhoPagina.cshtml *@
@model CabecalhoPaginaViewModel

<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
    <div class="flex min-w-0 items-start gap-3">
        @if (Model.Icone is not null)
        {
            <icon name="@Model.Icone" class="mt-1 size-6 shrink-0 text-texto-suave"
                  aria-hidden="true" />
        }
        <div class="min-w-0">
            <h1 class="text-h1 text-texto">@Model.Titulo</h1>
            @if (Model.Subtitulo is not null)
            {
                <p class="mt-1 text-body text-texto-suave">@Model.Subtitulo</p>
            }
        </div>
    </div>

    @if (Model.ExibirAcaoPrimaria)
    {
        <a href="@Model.AcaoPrimariaUrl"
           class="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg
                  bg-primaria px-4 py-2.5 text-body-sm font-medium
                  focus-visible:outline-2 focus-visible:outline-offset-2
                  focus-visible:outline-primaria lg:w-auto">
            <icon name="plus" class="size-4" aria-hidden="true" />
            @Model.AcaoPrimariaRotulo
        </a>
    }
</div>
```

`lg:flex-row` empilha por padrão e só coloca a ação ao lado a partir de 1024px — mobile-first, o
estilo base é o da tela estreita.

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Barra superior some ao rolar | Rolagem foi parar no `<body>` | `overflow-hidden` no shell, `overflow-y-auto` no `<main>` |
| Rolagem horizontal em 320px | Cabeçalho em `flex-row` sem `min-w-0` | Empilhar no mobile e adicionar `min-w-0` no bloco de texto |
| Dois `<h1>` na tela | Card ou seção usou `<h1>` pelo tamanho | Seção é `<h2>`, card é `<h3>`; tamanho vem do token |
| Botão espremido ao lado do título no mobile | Faltou `w-full` até `lg` | `w-full lg:w-auto` |
| Breadcrumb quebra a barra em duas linhas | Trilha completa no tablet | `hidden lg:flex` nos níveis anteriores |
| Leitor de tela anuncia link para a própria página | Item atual virou `<a>` | `<span aria-current="page">` |
| `Tab` começa no menu, não no conteúdo | Sem skip link | Skip link como primeiro focável do layout |
| Título da aba genérico | `ViewData["Title"]` não definido | `<Página> · <Produto>` em toda view |
| Pílula de categoria acima do título | Padrão copiado de referência | Remover — ver [badge.md](badge.md) |
| Espaçamento irregular entre blocos | `mt-*` nos filhos | `gap-*` no contêiner de página |
