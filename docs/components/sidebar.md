# Sidebar

Navegação principal do produto. Ocupa a lateral esquerda do shell descrito em [page.md](page.md) e
mantém a mesma lista, ordem e estado ativo em todas as faixas. No desktop e no tablet pode ficar
expandida ou recolhida; no mobile se apresenta como offcanvas.

**Uma Sidebar por aplicação.** Navegação secundária não compete com ela na mesma tela. Hierarquia
interna é resolvida por grupos e separadores, sem criar uma segunda barra lateral.

## Anatomia

```text
expandida                    recolhida                  mobile, aberta
┌──────────────────────┐     ┌────┐                    ┌──────────────────────┐
│ ◈  <Marca>           │     │ ◈  │                    │ ◈  <Marca>        ✕  │
├──────────────────────┤     ├────┤                    ├──────────────────────┤
│ ▣  <Feature A>       │     │ ▣  │                    │ ▣  <Feature A>       │
│ ▢  <Feature B>       │     │ ▢  │                    │ ▢  <Feature B>       │
│ ▢  <Feature C>       │     │ ▢  │                    │ ▢  <Feature C>       │
│                      │     │    │                    │                      │
│ ▢  <Configurações>   │     │ ▢  │                    │ ▢  <Configurações>   │
└──────────────────────┘     └────┘                    └──────────────────────┘
```

| Parte | Expandida | Recolhida | Mobile aberta |
|---|---|---|---|
| Marca | Símbolo + nome | Somente símbolo | Símbolo + nome |
| Item | Ícone + rótulo | Somente ícone | Ícone + rótulo |
| Item ativo | Superfície + indicador + `aria-current` | Mesmo destaque | Mesmo destaque |
| Grupo | Separador e rótulo opcional | Separador, sem rótulo visual | Separador e rótulo opcional |
| Controle | No header ou na Sidebar | No mesmo lugar | Abrir no header; fechar no painel |

Recolher não troca o componente nem renderiza outra lista. O mesmo `<nav>` muda somente a largura e
a apresentação dos rótulos.

## Estados por faixa

| Faixa | Estado inicial | Estados permitidos | Comportamento |
|---|---|---|---|
| Mobile 320-767px | Fechada | Fechada ou aberta | Offcanvas sobre o conteúdo |
| Tablet 768-1023px | Recolhida | Recolhida ou expandida | Fixa no shell |
| Desktop 1024px+ | Expandida | Expandida ou recolhida | Fixa no shell |

Os pontos de mudança são os breakpoints padrão: `md` em 768px e `lg` em 1024px. Não criar media
query exclusiva para a Sidebar.

No mobile não existe estado "somente ícones". Uma navegação icon-only exige hover ou reconhecimento
prévio e não é adequada para toque. Quando aberta, a Sidebar mobile sempre mostra ícones e rótulos.

Ao cruzar 768px, o estado aberto/fechado do offcanvas não contamina a preferência da faixa ampla. Se
o projeto persistir a preferência expandida/recolhida, ela vale somente a partir de `md`; ao voltar
para o mobile, o painel inicia fechado.

## Expansão e recolhimento

A Sidebar é ancorada à esquerda. Sua borda esquerda e a coluna dos ícones permanecem fixas; somente
a borda direita muda de posição.

### Ícones nunca se deslocam

Cada item reserva uma primeira área de largura fixa com `size-11` para o alvo de 44px. O ícone fica
centralizado nessa área e mantém:

- a mesma coordenada horizontal nos dois estados;
- a mesma coordenada vertical;
- o mesmo tamanho, normalmente `size-5`;
- o mesmo espaçamento em relação aos demais ícones.

Não alternar `padding`, `gap`, `justify-content`, margem ou tamanho do ícone ao recolher. Também não
aplicar `translate`, escala ou rotação nos ícones dos itens.

O item usa duas áreas: uma fixa para o ícone e outra flexível para o rótulo. No recolhimento, o
espaço disponível para o rótulo vai até zero enquanto a primeira área não muda.

```razor
<a href="@item.Url"
   aria-current="@(item.Ativo ? "page" : null)"
   class="flex h-11 min-w-0 items-center rounded-lg text-body-sm text-texto-suave
          focus-visible:outline-2 focus-visible:outline-offset-2
          focus-visible:outline-primaria">
    <span class="flex size-11 shrink-0 items-center justify-center">
        <icon name="@item.Icone" class="size-5 shrink-0" aria-hidden="true" />
    </span>
    <span class="min-w-0 flex-1 overflow-hidden whitespace-nowrap">@item.Rotulo</span>
</a>
```

O exemplo mostra a geometria invariável. A classe que reduz a segunda coluna pertence ao estado do
componente compartilhado, não à view de cada feature.

### Rótulo desaparece da direita para a esquerda

No recolhimento, a largura da Sidebar contrai pela borda direita. O rótulo fica em
`overflow-hidden whitespace-nowrap` e é recortado progressivamente da direita para a esquerda até a
coluna chegar a zero. O ícone não participa dessa animação.

Na expansão ocorre o inverso: a borda direita avança e o rótulo é revelado da esquerda para a
direita. Essa inversão é necessária para retornar ao estado original; não se cria uma animação
independente para cada palavra.

Regras da transição:

- animar somente a largura da Sidebar; a área flexível do rótulo acompanha essa largura;
- usar duração curta, normalmente `duration-200 ease-out`;
- manter `overflow-hidden` no contêiner para impedir texto sobre o conteúdo;
- não animar `left`, `padding`, `gap`, margem ou o SVG;
- desativar a transição com `motion-reduce:transition-none`.

Não usar fade como mecanismo principal. Opacidade faz o texto sumir inteiro e não comunica o
recolhimento da direita para a esquerda.

## Controle de recolhimento

O botão pode morar no header global ou dentro da própria Sidebar. A escolha é feita uma vez no
shell de cada projeto e se repete em todas as páginas; uma feature não escolhe outra posição.

| Projeto | Tablet e desktop | Mobile |
|---|---|---|
| Controle no header | O mesmo botão expande e recolhe | O botão abre o offcanvas |
| Controle na Sidebar | Botão fica numa posição fixa da barra | Header recebe um gatilho exclusivo para abrir |

Quando o controle mora na Sidebar, ele permanece na coluna fixa de 44px e não se desloca entre os
estados. O glifo pode alternar entre `panel-left-close` e `panel-left-open` para comunicar a ação.

O controle é sempre um `<button type="button">` com:

- `aria-controls` apontando para o `id` da Sidebar;
- `aria-expanded="true"` quando expandida e `"false"` quando recolhida;
- nome acessível "Recolher barra lateral" ou "Expandir barra lateral", atualizado com o estado;
- foco visível e alvo de aproximadamente 44px;
- ícone Lucide com `aria-hidden="true"`.

Não renderizar dois controles visíveis para o mesmo estado. Quando o projeto usa o controle dentro
da Sidebar em telas amplas, o gatilho do header é `md:hidden` e existe apenas para o mobile.

## Itens

Cada item é um `<a href>` real, com URL de `Url.Action` e `nameof`. Nunca usar `<div onclick>`:
links nativos já oferecem papel semântico, foco, teclado, abrir em nova aba e status bar.

- **Alvo de aproximadamente 44px** em todas as faixas.
- **Ordem estável.** A sequência não muda por estado, viewport ou uso recente.
- **Um ícone por item.** Todo ícone vem do Lucide conforme [icon.md](icon.md).
- **Mesmo rótulo em todos os estados.** Não abreviar na faixa recolhida.
- **Permissão resolvida no servidor.** Item sem acesso não é renderizado.

A Sidebar é navegação, não um menu de comandos: usar `<nav aria-label="Navegação principal">` e
links comuns. Não aplicar `role="menu"`/`role="menuitem"` nem navegação por setas; a navegação entre
links acontece com `Tab` e `Shift+Tab`.

### Nome acessível no estado recolhido

O rótulo visual pode ter largura zero, mas continua no DOM e na árvore de acessibilidade. Não
aplicar `hidden`, `display: none` ou `aria-hidden="true"` ao texto do item.

O ícone é decorativo e recebe `aria-hidden="true"`. Assim, o nome acessível do link continua sendo o
próprio rótulo, sem duplicar texto em `aria-label`.

Tooltip no estado recolhido é complemento opcional. Quando existir, aparece tanto em hover quanto
em foco, repete exatamente o rótulo e nunca substitui o nome acessível do link.

## Item ativo

Um item ativo por vez, correspondendo ao `<h1>` da página aberta:

- aplicar `aria-current="page"` no link ativo;
- combinar superfície distinta, peso de texto e indicador lateral;
- não depender somente de cor;
- manter indicador com contraste mínimo de 3:1;
- resolver `Ativo` na ViewModel, sem comparar rota na view.

O indicador fica junto à borda esquerda e não muda de posição ao expandir ou recolher.

## Mobile offcanvas

Entre 320px e 767px a Sidebar fica fora do fluxo e fechada por padrão. O gatilho de abertura sempre
fica no header, pois o painel fechado não pode conter o único caminho para abri-lo.

Quando aberta:

- mostra a navegação completa, nunca apenas ícones;
- ocupa uma largura limitada pela viewport e não causa overflow horizontal;
- cobre o conteúdo com backdrop, sem redimensionar o `<main>`;
- remove `inert` da Sidebar e aplica `inert` ao shell de fundo;
- trava a rolagem do `<body>`;
- leva o foco ao botão de fechar ou ao primeiro link;
- prende `Tab` e `Shift+Tab` dentro do painel;
- fecha com `Esc`, clique no backdrop, botão de fechar ou navegação;
- devolve o foco ao gatilho que abriu o painel.

Quando fechada, a Sidebar recebe `inert`: estar fora da viewport não basta, porque links deslocados
continuam focáveis. Ao fechar, o script remove `inert` do shell de fundo antes de devolver o foco ao
gatilho. Ao cruzar para `md`, remove ambos os estados `inert`, porque Sidebar e conteúdo voltam a
coexistir no fluxo.

O backdrop bloqueia o ponteiro, mas não substitui `inert`: leitores de tela e navegação sequencial
também precisam ficar contidos no painel enquanto ele estiver aberto.

Listas longas rolam dentro da própria Sidebar. Cabeçalho, marca e controles permanecem fixos; o
contêiner dos links usa `min-h-0 flex-1 overflow-y-auto overscroll-contain`. O `<body>` continua
travado e nenhum item fica inacessível em viewport baixa.

O fechamento desloca o painel para fora pela esquerda, movimento da direita para a esquerda. A
abertura percorre o caminho inverso. Com `prefers-reduced-motion`, a mudança é imediata.

No gatilho, `aria-expanded` alterna entre `false` e `true`, `aria-controls` aponta para o painel e o
nome acessível alterna entre "Abrir navegação" e "Fechar navegação". O botão de fechar interno usa o
ícone Lucide `x`.

A base continua mobile-first: o offcanvas é o estado base; posicionamento fixo e estados
expandida/recolhida entram em `md`.

Sem JavaScript, a Sidebar mobile permanece expandida no fluxo, antes do `<main>`. Esse é o fallback
único: menos compacto, mas toda a navegação continua acessível. O TypeScript marca o componente como
aprimorado, retira o painel do fluxo, inicia fechado e aplica `inert`. Não esconder a navegação no
CSS base esperando que o script a torne acessível depois.

## Contrato de estado

O Razor renderiza estrutura, links, rótulos e estado ativo. O TypeScript altera somente atributos de
estado e acessibilidade:

```html
<button type="button"
        data-sidebar-controle
        aria-controls="sidebar-principal"
        aria-expanded="true"
        aria-label="Recolher barra lateral">
    <icon name="panel-left-close" class="size-5" aria-hidden="true" />
</button>

<nav id="sidebar-principal"
     data-sidebar
     data-sidebar-recolhida="false"
     data-sidebar-aberta="false"
     aria-label="Navegação principal">
</nav>
```

Seletores de comportamento usam `data-*`, nunca classes de estilo. O script sai cedo quando não
encontra o componente, não recria itens, controla a propriedade `inert` e mantém separado o estado
amplo do estado mobile. Ver [`razor-interop`](../../.ai/skills/razor-interop/SKILL.md).

## Regras

- Uma Sidebar por aplicação, com a mesma ordem de itens em todas as faixas.
- Expandida mostra ícones e rótulos; recolhida mostra somente ícones.
- Ícones, indicador ativo e controle interno nunca se deslocam no recolhimento.
- Rótulos desaparecem da direita para a esquerda por recorte de largura.
- Controle amplo fica no header ou na Sidebar conforme decisão única do projeto.
- No mobile, a Sidebar é offcanvas, fechada por padrão e sempre abre expandida.
- Todo item é `<a href>` com nome acessível; ícone decorativo recebe `aria-hidden="true"`.
- Item ativo usa `aria-current="page"` e destaque que não depende apenas de cor.
- Offcanvas prende foco, fecha com `Esc`, retorna foco e trava a rolagem de fundo.
- Offcanvas fechado fica `inert`; aberto torna o shell de fundo `inert`.
- Lista longa rola dentro da Sidebar, sem esconder marca e controles.
- Sem JavaScript, a navegação mobile permanece expandida no fluxo.
- Ícones vêm somente do Lucide e seguem [icon.md](icon.md).
- Cores usam tokens semânticos; valores literais na view são proibidos.
- Transições respeitam `prefers-reduced-motion`.

## Validação

Conferir em 320px, 768px, 1024px e 1440px:

- [ ] nenhum overflow horizontal;
- [ ] os ícones ocupam a mesma coordenada nos estados expandido e recolhido;
- [ ] o rótulo é recortado da direita para a esquerda sem sobrepor o conteúdo;
- [ ] somente ícones permanecem visíveis ao final do recolhimento;
- [ ] o nome acessível de cada link permanece disponível;
- [ ] o controle tem estado, nome e foco visível corretos;
- [ ] no mobile, foco entra, fica preso, retorna ao gatilho e `Esc` fecha;
- [ ] painel fechado não entra no `Tab` e o fundo aberto não entra na árvore acessível;
- [ ] todos os itens continuam alcançáveis em viewport baixa;
- [ ] sem JavaScript, a navegação permanece utilizável no fluxo;
- [ ] a preferência ampla não abre o painel mobile;
- [ ] `prefers-reduced-motion` remove a transição.

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Ícones saltam ao recolher | `padding`, `gap` ou alinhamento muda por estado | Manter coluna fixa de 44px |
| Rótulos somem de uma vez | Uso de `display: none` ou somente opacidade | Animar largura e recortar à direita |
| Link recolhido não tem nome | Rótulo removido da árvore acessível | Manter texto no DOM; ocultar só visualmente |
| Conteúdo é coberto no desktop | Sidebar retirada do grid do shell | Reservar sua largura no layout a partir de `md` |
| Dois controles aparecem | Header e Sidebar ativos na mesma faixa | Escolher uma posição ampla por projeto |
| Mobile mostra apenas ícones | Estado recolhido foi reutilizado | Separar offcanvas mobile da preferência ampla |
| `Tab` alcança painel fechado | Painel só foi deslocado para fora da tela | Aplicar `inert` enquanto fechado |
| Leitor navega pelo fundo aberto | Backdrop usado como única contenção | Aplicar `inert` ao shell de fundo |
| Itens inferiores ficam inacessíveis | Sidebar sem rolagem interna | `overflow-y-auto` no contêiner dos links |
| `Tab` sai para o fundo | Offcanvas sem contenção de foco | Prender foco enquanto estiver aberto |
| Página rola atrás do painel | Scroll do `<body>` não foi travado | Travar ao abrir e restaurar ao fechar |
| Ícone vem de outro pacote | Acervo misturado | Usar somente `lucide-static` |
| Movimento continua reduzido | Transição ignora preferência do sistema | Aplicar `motion-reduce:transition-none` |
