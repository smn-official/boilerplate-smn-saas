# Tabs

Abas servem para **alternar entre visões da mesma coisa**. O conjunto de dados é o mesmo, o recorte
muda: uma `<Entidade>` vista como lista ou como quadro, um período visto por mês ou por semana, um
registro visto em resumo ou em histórico. Se o que está atrás de cada aba não responde à mesma
pergunta, não são abas.

O teste é direto: **trocar de aba pode desfazer trabalho do usuário?** Se pode, não são abas — são
etapas, e etapa é wizard.

## Quando não usar

| Situação | O que usar |
|---|---|
| Etapas de um fluxo com ordem obrigatória | Wizard com passo anterior/próximo e progresso explícito |
| Conteúdos sem relação entre si | Páginas separadas, cada uma com sua rota — ver [page.md](page.md) |
| Mais de ~6 recortes | Filtro ou `<select>` de visão; a barra de abas deixa de ser escaneável |
| Uma única aba disponível | Nada. Renderizar um tablist de um item é decoração |
| Conteúdo que o usuário precisa comparar lado a lado | Duas colunas, ou uma tabela — abas escondem metade |

Aba também não é lugar de ação. "Salvar", "Exportar" e "Nova `<Entidade>`" não viram aba; moram no
cabeçalho do bloco ([header.md](header.md)) ou na barra de ações da página.

## As duas variantes

Existem dois componentes diferentes com a mesma aparência, e escolher errado quebra o botão voltar
do navegador ou a acessibilidade. A decisão vem de uma pergunta: **o recorte selecionado precisa
sobreviver a um F5, a um link compartilhado ou ao botão voltar?**

| Variante | Quando | Elemento | Estado ativo |
|---|---|---|---|
| **Navegação** | O recorte é endereçável: entra na URL, é compartilhável, sobrevive ao reload | `<a href>` dentro de `<nav>` | `aria-current="page"` |
| **Painel no cliente** | Recorte descartável, conteúdo já carregado, sem custo de servidor | `<button role="tab">` | `aria-selected="true"` |

Na dúvida, **prefira navegação**. Um alternador de visão de `<Visão>` que não entra na URL faz o
usuário perder o recorte toda vez que volta de uma tela de detalhe — e esse é o caminho mais
percorrido do produto.

**Nunca misture as duas.** `role="tab"` num `<a href>` que navega de verdade anuncia "aba" e executa
"link": o leitor de tela promete troca de painel e a página inteira recarrega.

## Anatomia — variante de navegação

| Parte | Elemento | Papel |
|---|---|---|
| Região | `<nav aria-label="<Visão>">` | Nomeia o grupo; sem rótulo vira "navegação" anônima |
| Item | `<a href>` | Cada recorte, com rota real |
| Ativo | `aria-current="page"` no `<a>` | Estado lido pelo leitor de tela, não só pintado |

Sem `role`, sem `aria-selected`, sem JavaScript. `Tab` percorre os links; `Enter` navega. É o
comportamento nativo do `<a>`, e ele já está correto.

## Anatomia — variante de painel

| Parte | Elemento | Papel |
|---|---|---|
| Lista | `<div role="tablist" aria-label="<Visão>">` | Agrupa e nomeia |
| Aba | `<button role="tab" id="…" aria-controls="…" aria-selected>` | Gatilho de cada recorte |
| Painel | `<div role="tabpanel" id="…" aria-labelledby="…" tabindex="0">` | Conteúdo do recorte |

Regras de teclado, definidas pelo padrão e cobradas em
[`acessibilidade-responsivo`](../../.ai/skills/acessibilidade-responsivo/SKILL.md):

- **Um único tab-stop no tablist.** A aba ativa tem `tabindex="0"`; as demais, `tabindex="-1"`.
  `Tab` entra no grupo e sai dele — não percorre aba por aba.
- **Setas esquerda/direita** movem entre abas. `Home` vai para a primeira, `End` para a última.
- **A troca acompanha a seta** (seleção automática) quando o painel já está carregado, que é o único
  caso em que esta variante é permitida.
- O `tabindex="0"` no painel garante que o conteúdo seja alcançável quando não houver elemento
  focável dentro dele.

O painel inativo é removido ou recebe `hidden`. Escondê-lo com `opacity-0` ou `h-0` mantém o
conteúdo no fluxo de leitura, e o leitor de tela anuncia as duas visões ao mesmo tempo.

## Comportamento nas três faixas

| Faixa | Disposição |
|---|---|
| Mobile 320–767 | Com 2–3 abas: largura total, abas dividindo o espaço em partes iguais, altura de ~44px. Com mais abas: rolagem horizontal do próprio tablist |
| Tablet 768–1023 | Largura do conteúdo, alinhado à esquerda, ao lado dos demais controles do bloco |
| Desktop 1024+ | Igual ao tablet; a barra encolhe para o tamanho das abas e senta na mesma linha do cabeçalho ou dos filtros |

A base é `grid grid-cols-2 w-full` (ou `grid-cols-3`) e o `sm:` devolve a largura do conteúdo.
Escrito no sentido inverso, o alternador fica com duas pílulas encolhidas e um vazio à direita em
320px.

**Divisão em partes iguais só vale até três abas.** Com quatro, cada alvo cai abaixo do mínimo de
toque em 320px — a partir daí a saída é a rolagem.

### Rolagem horizontal do tablist não viola a regra de overflow

A norma de [README.md](README.md) e de
[`acessibilidade-responsivo`](../../.ai/skills/acessibilidade-responsivo/SKILL.md) proíbe que **a
página** role na horizontal. O `overflow-x-auto` aqui fica no contêiner do tablist, exatamente como
fica no wrapper da tabela ([table.md](table.md)): o conteúdo que excede é interno e delimitado, e o
`<body>` continua sem rolagem. Isso é adaptação, não defeito.

Duas condições para valer: a aba ativa é trazida para dentro da área visível ao carregar, e a
rolagem é alcançável por teclado — o que já acontece, porque as setas movem o foco e o navegador
rola o contêiner atrás dele.

**O que não vale é quebrar em duas linhas.** Abas em duas fileiras produzem uma segunda linha com
uma ou duas abas soltas, sem alinhamento com nada, e a fronteira do bloco ativo deixa de ser legível.
Ou cabe em uma linha, ou rola.

## Variante compacta — alternador de recorte

Quando o alternador governa **um bloco** (uma seção, um card) em vez da página inteira, ele encolhe e
senta no canto direito do cabeçalho daquele bloco — ver [header.md](header.md). É o caso típico de
período: dia / semana / mês.

Muda o tamanho e a posição, **não a semântica**. Continua valendo tudo acima: `<a>` com
`aria-current` quando o recorte entra na URL, `role="tab"` quando é descartável, nunca os dois.

| Aspecto | Alternador de página | Compacto de bloco |
|---|---|---|
| Posição | Abaixo do cabeçalho, alinhado à esquerda | Canto direito do cabeçalho do bloco |
| Tipografia | `text-body-sm` | `text-caption` ou `text-body-sm` |
| Altura | ~44px | ~36px no desktop, **~44px no mobile** |
| Opções | 2 a 6 | 2 a 3 — acima disso vira `<select>` |

**No mobile o alvo volta a ~44px**, mesmo que o alternador seja compacto. Compacto é concessão de
densidade no desktop, nunca de alvo de toque.

Quando o cabeçalho do bloco tem título **e** alternador, os dois empilham no mobile: título na
primeira linha, alternador na segunda ocupando a largura total. Alternador espremido ao lado de um
título que quebra em duas linhas é o defeito clássico dessa composição.

```razor
<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <h2 class="text-h3 text-texto">&lt;Seção&gt;</h2>

    <nav aria-label="&lt;Recorte&gt;" class="grid grid-cols-2 gap-1 rounded-lg border border-borda
                                          bg-superficie p-1 sm:inline-flex sm:w-auto">
        @foreach (var opcao in Model.Opcoes)
        {
            <a asp-route-recorte="@opcao.Valor"
               aria-current="@(opcao.Ativa ? "page" : null)"
               class="rounded-md px-3 py-2 text-center text-body-sm text-texto-suave
                      transition-colors hover:text-texto
                      aria-[current=page]:bg-primaria aria-[current=page]:font-medium
                      aria-[current=page]:text-white
                      focus-visible:outline-2 focus-visible:outline-offset-2
                      focus-visible:outline-primaria">@opcao.Rotulo</a>
        }
    </nav>
</div>
```

O recorte selecionado **precisa sobreviver ao reload** quando o usuário compartilha a tela ou volta
de um detalhe — por isso a variante de navegação é a certa aqui, e não `role="tab"`.

## Markup — variante de navegação

```razor
@model <Visão>ViewModel

<nav aria-label="Visão de <Entidade>"
     class="grid w-full grid-cols-2 gap-1 rounded-lg border border-borda bg-superficie p-1
            sm:inline-grid sm:w-auto">
    @foreach (var visao in Model.VisoesDisponiveis)
    {
        <a asp-action="Index" asp-route-visao="@visao.Chave"
           aria-current="@(visao.Ativa ? "page" : null)"
           class="inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4
                  text-body-sm font-medium text-texto-suave
                  hover:text-texto
                  focus-visible:outline-2 focus-visible:outline-offset-2
                  aria-[current=page]:bg-primaria aria-[current=page]:text-white
                  sm:min-h-9">
            <icon name="@visao.Icone" class="size-4" aria-hidden="true" />
            @visao.Rotulo
        </a>
    }
</nav>
```

O estado ativo é decidido na ViewModel (`visao.Ativa`) e aplicado por seletor de atributo. A view não
encadeia `if/else` para montar classe — regra de
[`tailwind-design`](../../.ai/skills/tailwind-design/SKILL.md).

## Markup — variante de painel

```razor
@model <Visão>ViewModel

<div role="tablist" aria-label="Visão de <Entidade>"
     class="grid w-full grid-cols-2 gap-1 rounded-lg border border-borda bg-superficie p-1
            sm:inline-grid sm:w-auto"
     data-tabs>
    @foreach (var visao in Model.VisoesDisponiveis)
    {
        <button type="button" role="tab"
                id="aba-@visao.Chave"
                aria-controls="painel-@visao.Chave"
                aria-selected="@(visao.Ativa ? "true" : "false")"
                tabindex="@(visao.Ativa ? 0 : -1)"
                class="inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4
                       text-body-sm font-medium text-texto-suave
                       hover:text-texto
                       focus-visible:outline-2 focus-visible:outline-offset-2
                       aria-selected:bg-primaria aria-selected:text-white
                       sm:min-h-9">
            <icon name="@visao.Icone" class="size-4" aria-hidden="true" />
            @visao.Rotulo
        </button>
    }
</div>

@foreach (var visao in Model.VisoesDisponiveis)
{
    <div role="tabpanel"
         id="painel-@visao.Chave"
         aria-labelledby="aba-@visao.Chave"
         tabindex="0"
         hidden="@(!visao.Ativa)"
         class="mt-4 focus-visible:outline-2 focus-visible:outline-offset-2">
        @* conteúdo do recorte *@
    </div>
}
```

O `data-tabs` é o único ponto de acoplamento com o TypeScript, conforme
[`razor-interop`](../../.ai/skills/razor-interop/SKILL.md). O script encontra as abas e os painéis pelos
próprios atributos `aria-controls` — não precisa de seletor de classe nem de rota em string.

## Regras

- **Escolha a variante pela URL, não pela facilidade.** Recorte que o usuário compartilha, refaz ou
  volta é navegação com `<a>`. Só use `role="tab"` quando perder o estado ao recarregar for
  irrelevante.
- **Um único tab-stop no `role="tablist"`.** Se `Tab` percorre aba por aba, a implementação de
  `tabindex` roving está faltando.
- **Estado ativo nunca é só cor.** `aria-current="page"` ou `aria-selected="true"` carregam a
  informação; o preenchimento é a expressão visual dela. Regra de contraste e de portador único em
  [`acessibilidade-responsivo`](../../.ai/skills/acessibilidade-responsivo/SKILL.md).
- **Alvo de ~44px no mobile** (`min-h-11`), reduzido a partir de `sm`. Aba de 28px em 320px falha o
  mínimo de toque.
- **Rótulo curto e substantivo** — "Lista", "Quadro", "Histórico". Rótulo que vira frase não cabe na
  divisão em partes iguais e força a rolagem sem necessidade.
- **Ícone da aba é decorativo:** `aria-hidden="true"`, porque o rótulo ao lado já nomeia — ver
  [icon.md](icon.md). Aba só com ícone exige `aria-label` e, na prática, quase nunca se justifica.
- **Contagem na aba usa número real.** "Pendentes (3)" só entra se o 3 vier do servidor e estiver
  correto; número aproximado ou fixo é dado demonstrativo, proibido em
  [.ai/docs/aparencia-generica.md](../../.ai/docs/aparencia-generica.md).
- **Sem animação de deslize do indicador.** A troca é instantânea; microinteração aqui não confirma
  nada que o preenchimento já não diga.
- **Cada visão projeta seus próprios estados** de carregamento, vazio e erro. Uma visão com dados e
  a outra em branco sem explicação é o defeito mais comum ao adicionar a segunda aba.
- **O tablist não rola a página.** `overflow-x-auto` no contêiner das abas, nunca acima dele.

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Aba perdida ao recarregar ou ao voltar | Variante de painel usada para recorte endereçável | Trocar para `<a>` com rota e `aria-current` |
| `Tab` percorre cada aba do grupo | Todas com `tabindex="0"` | Roving: `0` na ativa, `-1` nas demais |
| Setas do teclado não fazem nada | Handler de `keydown` ausente no tablist | Implementar setas, `Home` e `End` |
| Leitor de tela anuncia as duas visões | Painel inativo escondido por CSS | `hidden` no painel, ou removê-lo do DOM |
| Duas pílulas encolhidas e vazio à direita em 320px | Estilo de desktop como base | `grid-cols-2 w-full` na base, `sm:w-auto` acima |
| Abas quebradas em duas fileiras | Muitas abas com `flex-wrap` | Uma linha com `overflow-x-auto` no contêiner |
| Página rola na horizontal com muitas abas | `overflow-x` acima do tablist | Mover o `overflow-x-auto` para o contêiner das abas |
| Usuário perde o que digitou ao trocar de aba | Etapas de fluxo disfarçadas de abas | Virar wizard com passo anterior/próximo |
| Aba única renderizada | Lista de visões não verificada | Não renderizar o tablist com um item |
