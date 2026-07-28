# Menu do usuário

O menu do usuário responde a uma pergunta e só a ela: **quem está logado, e o que eu faço com essa
conta?** Ele fica na ponta direita da barra superior do shell descrito em [page.md](page.md), aberto
por um gatilho com o avatar, e reúne as ações que pertencem à identidade — perfil, preferências e
sair.

Não é navegação. A navegação do produto é a [Sidebar](sidebar.md). O que cai aqui é o que
não pertence a nenhuma feature: se um item do menu do usuário for uma tela de trabalho do domínio,
ele está no lugar errado.

**Um menu do usuário por aplicação**, sempre no mesmo canto, com a mesma ordem de itens. É o único
elemento da interface cuja posição o usuário aprende antes de aprender o produto.

O padrão vira um partial — `Features/Shared/_MenuUsuario.cshtml`, como manda
[`tailwind-design`](../../.ai/skills/tailwind-design/SKILL.md). As classes abaixo são a definição desse
partial, não markup para repetir em cada layout.

## Anatomia

```text
gatilho (fechado)                painel (aberto)
┌──────────────────┐             ┌──────────────────────────────┐
│ (A) <Nome>    ▾  │             │  (A)  <Nome>                 │  ← cabeçalho de conta
│     <Papel>      │             │       <identificador>        │
└──────────────────┘             ├──────────────────────────────┤
                                 │  ▢  <Item de conta>       ›  │  ← itens
                                 │  ▢  <Item de conta>       ›  │
                                 ├──────────────────────────────┤
                                 │  ▢  Sair                     │  ← ação de saída
                                 └──────────────────────────────┘
```

| Parte | Papel | Regra |
|---|---|---|
| Gatilho | `<button>` com avatar, e nome + papel a partir de `lg` | Alvo de ~44px, `aria-expanded`, `aria-haspopup="menu"` |
| Cabeçalho de conta | Avatar, nome e identificador da conta | Texto, **não** item clicável |
| Itens | `<a href>` para telas de conta | Ícone Lucide à esquerda, rótulo visível |
| Separador | `<hr class="border-borda">` | Só entre grupos com intenção distinta |
| Ação de saída | Última, isolada por separador | Ver [Sair](#sair) |

O cabeçalho de conta **não é um item de menu**. Ele é o rótulo do painel, não um destino — leva
`role="presentation"` implícito por ser um `<div>` comum, nunca `role="menuitem"` nem `tabindex`.
Bloco de identidade clicável que às vezes navega e às vezes não é a origem do clique perdido mais
comum deste componente.

## O que entra e o que não entra

| Entra | Não entra |
|---|---|
| Dados da conta e do perfil | Tela de trabalho do domínio |
| Preferências pessoais da aplicação | Ação destrutiva sobre dados do domínio |
| Sessão — sair, trocar de conta | Notificações (têm componente próprio) |
| Acesso à documentação e suporte, se houver | Ação primária de alguma tela |

**Sem gaveta de sobras.** Se um item não cabe em nenhuma linha da coluna da esquerda, o problema é de
arquitetura de navegação — o menu do usuário não é onde se guarda o que não achou lugar.

Entre três e sete itens é a faixa saudável. Acima disso, o menu virou uma segunda navegação e deve
ceder lugar a uma tela de configurações com o seu próprio índice.

## Gatilho

- **É `<button type="button">`**, nunca `<div onclick>` nem `<a>` — ele não navega, abre um painel.
  A regra está em [button.md](button.md).
- **`aria-haspopup="menu"`** e **`aria-expanded`** alternando entre `false` e `true`, mais
  `aria-controls` apontando para o `id` do painel.
- **Nome acessível sempre**, mesmo quando só o avatar aparece: `aria-label="Menu da conta de
  @Model.Nome"`. No mobile o texto ao lado some e sobra um botão anônimo para o leitor de tela.
- **Alvo de ~44px** em todas as faixas, contando o avatar mais o padding — não o `<img>` isolado.
- O chevron indica que algo abre. Ele é `aria-hidden="true"` e **não** gira 180° com animação
  elaborada; uma rotação curta, desligada em `prefers-reduced-motion`, ou nenhuma.

### O avatar

- `alt=""` quando o nome está no `aria-label` do botão ou visível ao lado — o mesmo critério do
  [page.md](page.md). Avatar com `alt="Foto de <Nome>"` ao lado do nome escrito faz o leitor de tela
  anunciar a identidade duas vezes.
- Sem foto, o *fallback* é a **inicial do nome** em superfície neutra, não um ícone genérico de
  pessoa: a inicial distingue contas, o boneco cinza não.
- É o **único** `rounded-full` deste componente. Botão em cápsula continua proibido — ver
  [button.md](button.md).

## Comportamento nas três faixas

| Faixa | Gatilho | Painel |
|---|---|---|
| Mobile 320–767 | Só o avatar, alvo de ~44px | Ancorado à direita, `w-[calc(100vw-2rem)]` com `max-w-xs`, nunca ultrapassa a viewport |
| Tablet 768–1023 | Avatar; nome opcional | Dropdown ancorado à direita |
| Desktop 1024+ | Avatar + nome + papel + chevron | Dropdown ancorado à direita |

Mobile-first: a base é o avatar sozinho; nome e papel entram a partir de `lg` com `hidden lg:block`.

**O painel nunca sangra para fora da viewport.** Ancorado à direita (`right-0`) porque o gatilho vive
na ponta direita da barra; com largura própria, `origin-top-right` e um `max-w-*`, ele resolve os
320px sem cálculo em JavaScript.

Em tela estreita, item de menu ocupa a **linha inteira** com altura de ~44px. Nada de dois itens lado
a lado para "aproveitar espaço" — ver [`acessibilidade-responsivo`](../../.ai/skills/acessibilidade-responsivo/SKILL.md).

## Teclado e foco

O painel é um `role="menu"` com itens `role="menuitem"` e usa a navegação por setas que esse papel
exige:

| Tecla | Comportamento |
|---|---|
| `Enter` / `Espaço` / `↓` no gatilho | Abre e move o foco para o primeiro item |
| `↑` no gatilho | Abre e move o foco para o último item |
| `↓` / `↑` no painel | Move entre itens, circulando nas pontas |
| `Home` / `End` | Primeiro e último item |
| `Tab` | Fecha o painel e segue o fluxo normal da página |
| `Esc` | Fecha sempre, e devolve o foco ao gatilho |
| Clique fora | Fecha; é atalho, não a única saída |

**O foco volta ao gatilho ao fechar.** Sem isso o `Tab` recomeça do topo da página, e quem navega por
teclado perde a posição a cada abertura.

O foco **não fica preso** aqui — o menu do usuário não é modal. `Tab` sai e fecha; é o offcanvas da
[Sidebar](sidebar.md) que prende o foco, porque cobre a tela inteira.

Diferença que importa: dentro de `role="menu"`, quem navega é a seta, não o `Tab`. Os itens levam
`tabindex="-1"` e apenas o item focado no momento entra no fluxo — *roving tabindex*. Menu com dez
itens tabuláveis obriga a atravessar todos para chegar ao conteúdo da página.

## Estados obrigatórios

Os quatro existem, como em qualquer componente do produto — ver
[.ai/docs/aparencia-generica.md](../../.ai/docs/aparencia-generica.md).

| Estado | Comportamento |
|---|---|
| Carregando | O gatilho renderiza com o *fallback* de inicial; nunca um avatar quebrado nem um espaço vazio que empurra a barra |
| Vazio | Não existe menu do usuário sem nenhum item — se sobrou só "Sair", ele é um botão de sair, não um menu |
| Erro | Falha ao carregar dados da conta não derruba a barra: nome cai para o identificador, o menu continua abrindo |
| Sem permissão | Item indisponível **não é renderizado**. Item cinza sem explicação é tela sem tratamento de permissão |

Item que exige permissão é decidido na ViewModel, como booleano pronto. A view não compara papel nem
encadeia `if` sobre dados crus — a regra é do [`revisao-codigo`](../../.ai/skills/revisao-codigo/SKILL.md).

## Sair

É a única ação do painel que **muda o estado do sistema**, e por isso não se comporta como as outras.

- **Vai por `<form method="post">` com antiforgery**, nunca por `<a href>`. Sair por GET é vulnerável
  a CSRF de logout e pode ser disparado por *prefetch* do navegador ou por um scanner de link — o
  usuário é deslogado sem ter clicado em nada. Ver [`owasp-web`](../../.ai/skills/owasp-web/SKILL.md).
- **Isolada por separador**, sempre como último item. Vizinhança com um item de navegação produz o
  clique errado.
- **Tratada como destrutiva na aparência, sem sê-lo de fato**: usa o token de erro no texto e no
  ícone, e **não** exige confirmação — não destrói dado, e um passo extra em cada saída é atrito
  diário. A regra de confirmação de [button.md](button.md) vale para perda de dado, que aqui não há.
- Se houver trabalho não salvo na tela, quem avisa é o formulário, não o menu.

## Markup

```razor
@* Features/Shared/_MenuUsuario.cshtml *@
@model MenuUsuarioViewModel

<div class="relative" data-menu-usuario>
    <button type="button"
            data-menu-usuario-gatilho
            aria-haspopup="menu"
            aria-expanded="false"
            aria-controls="menu-usuario-painel"
            aria-label="Menu da conta de @Model.Nome"
            class="flex h-11 items-center gap-3 rounded-lg px-2 text-left transition-colors
                   hover:bg-borda/40 focus-visible:outline-2 focus-visible:outline-offset-2
                   focus-visible:outline-primaria">
        <img src="@Model.AvatarUrl" alt=""
             class="size-9 shrink-0 rounded-full bg-borda object-cover" />
        <span class="hidden min-w-0 lg:block">
            <span class="block truncate text-body-sm text-texto">@Model.Nome</span>
            <span class="block truncate text-caption text-texto-suave">@Model.Papel</span>
        </span>
        <icon name="chevron-down" class="hidden size-4 shrink-0 text-texto-suave lg:block"
              aria-hidden="true" />
    </button>

    <div id="menu-usuario-painel"
         data-menu-usuario-painel
         role="menu"
         aria-label="Conta"
         hidden
         class="absolute right-0 top-full z-40 mt-2 w-[calc(100vw-2rem)] max-w-xs origin-top-right
                rounded-lg border border-borda bg-superficie p-1">

        <div class="flex items-center gap-3 px-3 py-3">
            <img src="@Model.AvatarUrl" alt=""
                 class="size-10 shrink-0 rounded-full bg-borda object-cover" />
            <div class="min-w-0">
                <p class="truncate text-body-sm font-medium text-texto">@Model.Nome</p>
                <p class="truncate text-caption text-texto-suave">@Model.Identificador</p>
            </div>
        </div>

        <hr class="my-1 border-borda" />

        @foreach (var item in Model.Itens)
        {
            <a href="@item.Url"
               role="menuitem"
               tabindex="-1"
               class="flex h-11 items-center gap-3 rounded-md px-3 text-body-sm text-texto
                      transition-colors hover:bg-borda/40 focus-visible:bg-borda/40
                      focus-visible:outline-2 focus-visible:-outline-offset-2
                      focus-visible:outline-primaria">
                <icon name="@item.Icone" class="size-4 shrink-0 text-texto-suave"
                      aria-hidden="true" />
                <span class="min-w-0 flex-1 truncate">@item.Rotulo</span>
                <icon name="chevron-right" class="size-4 shrink-0 text-texto-suave"
                      aria-hidden="true" />
            </a>
        }

        <hr class="my-1 border-borda" />

        <form method="post" asp-action="@nameof(<Controller>.<Acao>)">
            <button type="submit"
                    role="menuitem"
                    tabindex="-1"
                    class="flex h-11 w-full items-center gap-3 rounded-md px-3 text-body-sm
                           text-erro transition-colors hover:bg-erro/10
                           focus-visible:bg-erro/10 focus-visible:outline-2
                           focus-visible:-outline-offset-2 focus-visible:outline-erro">
                <icon name="log-out" class="size-4 shrink-0" aria-hidden="true" />
                Sair
            </button>
        </form>
    </div>
</div>
```

O avatar aparece duas vezes — no gatilho e no cabeçalho de conta — e leva `alt=""` nas duas, porque o
nome está escrito ao lado em ambas. O `truncate` com `min-w-0` é o que impede um nome longo de
esticar o painel além do `max-w-xs` e produzir rolagem horizontal em 320px.

O `chevron-right` de cada item é decorativo e opcional: ele diz "isso leva para outra tela", o que
já está implícito no `<a>`. Presente ou ausente, é uma decisão para o menu inteiro, nunca item a
item.

Este partial entra na barra superior de [page.md](page.md), substituindo o bloco de identidade
estático que está lá.

## Regras

- **Um menu do usuário por aplicação**, sempre no mesmo canto, com ordem de itens estável.
- **Só ações de conta, sessão e preferência.** Tela de domínio pertence à [Sidebar](sidebar.md).
- **Gatilho é `<button>`** com `aria-haspopup="menu"`, `aria-expanded`, `aria-controls` e nome
  acessível — mesmo quando só o avatar aparece.
- **Cabeçalho de conta é texto**, não item clicável nem `role="menuitem"`.
- **`role="menu"` + `role="menuitem"`** com navegação por setas, `Home`/`End` e *roving tabindex*.
- **`Esc` fecha e devolve o foco ao gatilho.** `Tab` fecha e segue; o foco não fica preso.
- **Sair é `<form method="post">` com antiforgery**, isolado por separador, sempre por último.
- **Item sem permissão não é renderizado**; a decisão vem pronta da ViewModel.
- **Alvo de ~44px** no gatilho e em cada item, em todas as faixas.
- **O painel não sangra a viewport**: ancorado à direita, com `max-w-*` e `truncate` nos textos.
- **`rounded-full` só no avatar.** O painel e os itens seguem `rounded-lg` / `rounded-md`.
- **Sem sombra, sem degradê, sem glassmorphism.** O painel se separa por borda e superfície — ver
  [card.md](card.md).
- **Sem badge de categoria** no painel — nem pílula, nem dot colorido. Ver [badge.md](badge.md).
- **Cor por token semântico**: `bg-superficie`, `text-texto`, `text-texto-suave`, `border-borda`,
  `text-erro`. Hex no markup é erro.
- **Ícone do Lucide, sempre `aria-hidden="true"`** — ver [icon.md](icon.md).

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Leitor de tela anuncia "botão" sem nome | Gatilho só com avatar, sem nome acessível | `aria-label` no `<button>` |
| Identidade anunciada duas vezes | `alt` no avatar somado ao nome visível | `alt=""` no `<img>` |
| Gatilho sempre anuncia "recolhido" | `aria-expanded` fixo no markup | Alternar o atributo ao abrir e fechar |
| `Tab` atravessa dez itens antes do conteúdo | Todos os itens tabuláveis | `tabindex="-1"` e *roving tabindex* |
| Setas não movem entre itens | Papéis de menu ausentes | `role="menu"` no painel, `role="menuitem"` nos itens |
| Fechou o painel e o `Tab` recomeça do início | Foco não retornou | Devolver o foco ao gatilho |
| Painel corta na direita em 320px | Ancorado à esquerda ou sem largura máxima | `right-0` + `max-w-xs` |
| Rolagem horizontal ao abrir com nome longo | Texto sem truncamento | `truncate` com `min-w-0` |
| Usuário deslogado sem ter clicado | Sair por `<a href>` e *prefetch* do navegador | `<form method="post">` com antiforgery |
| Clique em "Sair" quando queria o item acima | Saída encostada nos demais itens | Separador e posição final |
| Confirmação a cada logout | Sair tratado como destrutivo de dado | Sair não confirma; ele não destrói nada |
| Clique no bloco de identidade não faz nada | Cabeçalho de conta com aparência de item | Cabeçalho é texto, sem hover nem cursor de link |
| Menu com doze itens | Virou navegação secundária | Mover para uma tela de configurações |
| Item cinza sem explicação | Permissão negada renderizada como desabilitada | Não renderizar o item |
| Avatar quebrado ou buraco na barra | Sem *fallback* de imagem | Inicial do nome em superfície neutra |
| Painel continua aberto ao trocar de página | Não fecha na navegação | Fechar o painel ao navegar |
