# Menu

Navegação principal do produto. Ocupa a lateral esquerda do shell descrito em [page.md](page.md) e é
o mesmo componente nas três faixas — muda a apresentação, não a lista de itens nem a ordem.

**Uma navegação principal por aplicação.** Não existe menu secundário competindo com ela na mesma
tela; agrupamento interno resolve hierarquia, segundo menu não resolve.

## Anatomia

Duas apresentações do mesmo `<nav>`:

```text
rail (desktop e tablet)          offcanvas (mobile, aberto)
┌────┐                           ┌──────────────────────┐
│ ▣  │ ← item ativo              │ <Marca>          ✕   │
│ ▢  │                           ├──────────────────────┤
│ ▢  │                           │ ▣  <Feature A>       │ ← item ativo
│ ▢  │                           │ ▢  <Feature B>       │
│    │                           │ ▢  <Feature C>       │
│ ▢  │ ← grupo inferior          ├──────────────────────┤
└────┘                           │ ▢  <Configurações>   │
                                 └──────────────────────┘
```

| Parte | Rail | Offcanvas |
|---|---|---|
| Item | Ícone `size-5` em alvo de ~44px | Ícone + rótulo visível, linha de ~44px |
| Item ativo | Destaque de superfície + `aria-current="page"` | Idem |
| Agrupamento | Separador de 1px em `border-borda` | Separador + rótulo de grupo opcional |
| Cabeçalho | Não tem — a marca fica na barra superior | Marca + botão de fechar |

O rail **não** tem estado expandido/recolhido por clique. Largura fixa, só ícones. Menu que abre e
fecha na lateral do desktop adiciona um estado a manter, um botão a explicar e nenhuma informação
que o `aria-label` já não entregue no hover e no leitor de tela.

## Comportamento por faixa

| Faixa | Apresentação | Detalhe |
|---|---|---|
| Mobile 320–767 | Offcanvas | Fechado por padrão; abre pelo gatilho hambúrguer na barra superior |
| Tablet 768–1023 | Rail fixo | Já visível; o rail de ícones cabe sem roubar largura do conteúdo |
| Desktop 1024+ | Rail fixo | Sempre visível, sem gatilho |

O ponto de colapso é **`md` (768px)**: o rail só de ícones ocupa pouca largura e, a partir do tablet,
mantê-lo visível vale mais que devolver esses pixels ao conteúdo — a navegação deixa de custar um
toque. No markup isso é `hidden md:flex` no rail e `md:hidden` no gatilho — um único par de classes
governa a troca, sem media query em CSS de feature e sem decisão em JavaScript.

Mobile-first: a base é o offcanvas; o rail é o que se acrescenta em `md`.

O gatilho hambúrguer permanece renderizado em todas as faixas apenas se abrir algo que o rail não
mostra. Se o offcanvas for só a versão expandida do mesmo rail, ele é `md:hidden` — dois caminhos
para a mesma navegação, visíveis ao mesmo tempo, confundem sem acrescentar.

## Item

Cada item é um `<a href>` real, com URL de `Url.Action` e `nameof`. Nunca `<div onclick>` — link
nativo já traz papel, foco, teclado, abrir em nova aba e status bar.

- **Alvo de toque de ~44px** em todas as faixas, inclusive no rail. Ícone de 20px dentro de uma área
  de 44px, não `<a>` colado no SVG.
- **Ordem estável.** A mesma sequência em todas as telas e sessões; nada de reordenar por uso
  recente — o usuário navega por memória muscular de posição.
- Ícone do item vem do Lucide, ver [icon.md](icon.md). Um ícone por item, sempre presente — item sem
  ícone quebra o alinhamento do rail, que só tem ícones.

### Item só com ícone exige nome acessível

No rail o rótulo não aparece na tela, mas **precisa existir na árvore de acessibilidade**. Ícone
sozinho sem nome é o erro mais comum desta tela: o leitor anuncia "link" e nada mais, e a navegação
inteira vira uma lista de itens indistinguíveis.

A forma preferida é **um único `<span>` com o rótulo, `md:sr-only`** — visível no offcanvas, oculto
visualmente no rail, presente nos dois. Um texto só, escrito uma vez:

```razor
<span class="md:sr-only">@item.Rotulo</span>
```

`aria-label` no `<a>` é o fallback aceitável quando o rótulo não pode existir no markup. Evite-o como
primeira escolha: ele cria um segundo texto, que não é traduzido junto com o conteúdo e diverge do
rótulo visível na primeira alteração. **Nunca use os dois ao mesmo tempo** — `aria-label` sobrescreve
o `<span>`, e o que se lê deixa de ser o que se vê.

O ícone dentro do item é sempre `aria-hidden="true"`, ver
[`acessibilidade-responsivo`](../../.ai/skills/acessibilidade-responsivo/SKILL.md).

O tooltip visual no hover é complemento, **não substituto**: não existe para quem navega por teclado
nem para quem usa leitor de tela. Se houver, repete o mesmo texto do rótulo — nunca um diferente.

## Item ativo

Um item ativo por vez, e ele corresponde ao `<h1>` da página aberta — ver [page.md](page.md).

- **`aria-current="page"`** no item ativo. É o que anuncia "página atual"; classe CSS não anuncia
  nada.
- **O destaque não pode depender só de cor.** Fundo em superfície distinta, peso de texto e uma barra
  indicadora à esquerda — pelo menos dois portadores. Cor sozinha falha para daltonismo, tema de alto
  contraste e monocromático.
- Contraste do indicador contra o fundo ≥ 3:1, como qualquer indicador de estado.
- Qual item está ativo é decisão da ViewModel, resolvida como booleano pronto. A view não compara
  rota na marcação.

## Offcanvas

Sobreposição modal. Enquanto aberto:

| Requisito | Comportamento |
|---|---|
| Foco entra | Ao abrir, foco vai para o painel (primeiro item ou botão de fechar) |
| Foco preso | `Tab` e `Shift+Tab` circulam dentro do painel, não vazam para a página atrás |
| `Esc` fecha | Sempre, sem exceção |
| Foco retorna | Ao fechar, foco volta ao gatilho hambúrguer que o abriu |
| Scroll travado | O `<body>` não rola atrás do painel |
| Clique fora fecha | O backdrop é clicável e fecha; é atalho, não a única saída |

No gatilho: `aria-expanded` alternando entre `false` e `true`, e `aria-controls` apontando para o
`id` do painel. O rótulo do gatilho acompanha o estado — "Abrir menu" e "Fechar menu".

Fechar ao navegar: ao clicar num item, o painel fecha junto com a troca de página. Painel que
permanece aberto sobre a nova tela esconde justamente o conteúdo que o usuário pediu.

Nada de animação de entrada elaborada. Uma transição curta de deslocamento confirma a ação; o resto
é ruído, e `prefers-reduced-motion` desliga a animação.

## Markup

```razor
@* Features/Shared/_Menu.cshtml *@
@model MenuViewModel

<nav id="menu-principal"
     aria-label="Navegação principal"
     data-menu-painel
     class="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col gap-1 border-r border-borda
            bg-superficie p-3 md:static md:flex md:w-16 md:items-center md:p-2">

    <div class="mb-2 flex items-center justify-between md:hidden">
        <span class="text-h4 text-texto">@Model.Marca</span>
        <button type="button"
                data-menu-fechar
                aria-label="Fechar menu"
                class="inline-flex size-11 items-center justify-center rounded-lg
                       focus-visible:outline-2 focus-visible:outline-offset-2
                       focus-visible:outline-primaria">
            <icon name="x" class="size-5" aria-hidden="true" />
        </button>
    </div>

    @foreach (var grupo in Model.Grupos)
    {
        @if (grupo.SeparadorAcima)
        {
            <hr class="my-2 w-full border-borda" />
        }

        @foreach (var item in grupo.Itens)
        {
            <a href="@item.Url"
               aria-current="@(item.Ativo ? "page" : null)"
               class="group relative flex h-11 items-center gap-3 rounded-lg px-3 text-body-sm
                      text-texto-suave hover:text-texto
                      focus-visible:outline-2 focus-visible:outline-offset-2
                      focus-visible:outline-primaria
                      md:w-11 md:justify-center md:px-0
                      aria-[current=page]:bg-primaria/10 aria-[current=page]:font-medium
                      aria-[current=page]:text-texto">
                <span class="absolute inset-y-1 left-0 hidden w-0.5 rounded-full bg-primaria
                             aria-[current=page]:group-[]:block"></span>
                <icon name="@item.Icone" class="size-5 shrink-0" aria-hidden="true" />
                <span class="md:sr-only">@item.Rotulo</span>
            </a>
        }
    }
</nav>

<div data-menu-backdrop hidden class="fixed inset-0 z-30 bg-texto/40 md:hidden"></div>
```

O rótulo é `<span>` visível no offcanvas e `md:sr-only` no rail — o mesmo texto serve de rótulo
visual e de nome acessível, sem `aria-label` paralelo que possa divergir. Quando o rótulo não puder
ser renderizado nem em `sr-only`, aí sim `aria-label` no `<a>`, com o texto idêntico.

O gatilho hambúrguer mora na barra superior e está no markup de [page.md](page.md), com
`aria-controls="menu-principal"`.

## Regras

- Uma navegação principal por aplicação; ordem dos itens estável.
- Todo item é `<a href>` com URL de `Url.Action` e `nameof`.
- Alvo de toque de ~44px em todas as faixas.
- Item só com ícone tem nome acessível — `sr-only` ou `aria-label`, nunca só tooltip.
- Item ativo tem `aria-current="page"` e destaque que não depende só de cor.
- Colapso em `lg`; rail no desktop, offcanvas abaixo.
- Offcanvas com foco preso, `Esc`, retorno de foco, `aria-expanded`/`aria-controls` e scroll travado.
- Cor por token semântico — `bg-superficie`, `text-texto`, `text-texto-suave`, `border-borda`,
  `bg-primaria`. Ver [`tailwind-design`](../../.ai/skills/tailwind-design/SKILL.md).
- Sem badge de contagem decorativa nos itens; contador só quando exige ação, e com texto associado —
  ver [badge.md](badge.md).

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Leitor de tela anuncia "link, link, link" | Item do rail só com ícone, sem nome | `<span class="md:sr-only">` com o rótulo, ou `aria-label` no `<a>` |
| Ícone anunciado junto com o rótulo | Faltou `aria-hidden` no SVG | `aria-hidden="true"` no ícone, ver [icon.md](icon.md) |
| Item ativo some no tema de alto contraste | Destaque só por cor de fundo | Somar barra indicadora e peso de texto |
| `Tab` sai do offcanvas para a página atrás | Foco não está preso | Prender foco no painel enquanto aberto |
| Painel abre e o foco fica no topo da página | Foco não entrou | Mover o foco ao painel na abertura |
| Fechou o menu e o `Tab` recomeça do início | Foco não retornou | Devolver o foco ao gatilho |
| Página rola atrás do painel aberto | `<body>` não travado | Travar a rolagem do `<body>` enquanto aberto |
| Gatilho sempre anuncia "recolhido" | `aria-expanded` fixo no markup | Alternar o atributo ao abrir e fechar |
| Menu continua aberto sobre a nova tela | Não fecha ao navegar | Fechar o painel na navegação |
| Rail aparece por um instante no mobile | Estilo desktop-first | Base é o offcanvas; rail entra em `lg` |
| Dois itens destacados | Ativo derivado na view | Resolver o item ativo na ViewModel |
