# Card

Card é **agrupador**, não moldura. Ele existe para dizer "estas coisas pertencem juntas e se separam
do resto da tela". Um bloco de filtros mais a tabela que eles filtram mais a paginação daquela tabela
são uma coisa só — e por isso cabem num card. Três parágrafos soltos não viram um conjunto porque
ganharam borda.

O teste antes de abrir um card: **se eu tirar a borda, alguém deixa de entender que isto é um
bloco?** Se a resposta é não, o card é decoração e não entra.

Toda a obrigação de responsividade de [README.md](README.md) vale aqui: não existe card que só
funciona no desktop.

## Quando se justifica e quando não

| Situação | Card? | Por quê |
|---|---|---|
| Filtros + tabela + paginação da mesma listagem | Sim | Um único assunto operacional, com fronteira real |
| Cabeçalho da feature: identificação e ação primária | Sim | Separa "onde estou e o que posso fazer" do conteúdo |
| Formulário de um registro, com suas ações | Sim | O conjunto tem começo, fim e um botão que o conclui |
| Um parágrafo de texto | Não | Não há o que agrupar; use espaçamento |
| Um único indicador numérico | Não | Card não adiciona informação a um número solto |
| Cada item de uma lista, para "ficar bonito" | Não | Card vira papel de parede e perde o sentido de agrupar |
| Dar sombra ou borda a algo que já está dentro de um card | Não | É card dentro de card |

Grade de cards se justifica pela quantidade real de itens do domínio, nunca por simetria: se existem
cinco, são cinco.

## Anatomia

| Parte | Obrigatória | Conteúdo |
|---|---|---|
| Cabeçalho | Não | Título (`text-h3`), descrição opcional em `text-body-sm text-texto-suave` e, à direita, a ação daquele bloco |
| Corpo | Sim | O conteúdo agrupado: formulário, tabela, lista, filtros |
| Rodapé | Não | Ações que concluem o conjunto, ou metadado do bloco. Separado por `border-t border-borda` |

Card sem cabeçalho é legítimo e comum — quando o título da página já nomeia o que está dentro,
repetir o nome no card é ruído.

O cabeçalho de feature é uma variação do cabeçalho de card: ícone da feature, título e subtítulo à
esquerda; ação primária à direita. O ícone vem do Lucide e é decorativo (`aria-hidden="true"`), ver
[icon.md](icon.md) — e ele fica sobre a superfície do próprio card, sem quadrado colorido em volta.

**Card não leva badge de categoria no topo.** Nem pílula, nem dot colorido, nem eyebrow em caixa
alta acima do título — [badge.md](badge.md) explica por quê e o que fazer no lugar.

## Comportamento nas três faixas

| Faixa | Padding | Cabeçalho | Grade de cards |
|---|---|---|---|
| Mobile 320–767 | `p-4` | Empilhado: título acima, ação abaixo em largura total | Uma coluna |
| Tablet 768–1023 | `p-5` | Lado a lado, ação à direita | Até duas colunas |
| Desktop 1024+ | `p-6` | Lado a lado, ação à direita | Colunas conforme o conteúdo, nunca "três porque cabem" |

Mobile-first: a classe base é a estreita e os breakpoints adicionam (`p-4 md:p-5 lg:p-6`,
`grid-cols-1 md:grid-cols-2`). O caminho inverso é proibido.

No mobile, a ação primária do cabeçalho vai para baixo em `w-full`, como exige
[`acessibilidade-responsivo`](../../.ai/skills/acessibilidade-responsivo/SKILL.md) — e não encolhe para
um ícone só para caber ao lado do título. Detalhe do dimensionamento em [button.md](button.md).

Card não impõe rolagem horizontal. Conteúdo largo — tabela, principalmente — resolve a rolagem no
próprio wrapper, dentro do card, conforme [table.md](table.md).

## Elevação: borda é o padrão

| Elemento | Tratamento |
|---|---|
| Card estático na página | `border border-borda bg-superficie` — **sem sombra** |
| Elemento que flutua de verdade: modal, dropdown, popover, toast | Sombra, porque há distância real entre ele e a página |

Sombra suave em todo componente é um dos sinais mais claros de interface montada sem critério.
Sombra é a informação "isto está acima daquilo"; usada em tudo, deixa de informar qualquer coisa.

Canto pela escala do Tailwind: `rounded-lg` no card. **Nunca** `rounded-2xl` ou maior — canto
exageradamente arredondado é proibido. Borda clara, brilhante ou com degradê também está fora.

## Card clicável

Quando o card inteiro leva a um lugar, **o alvo é um só**: o próprio `<a>` envolve o conteúdo.

- Nada de link ou botão aninhado dentro de um card que já é link — HTML inválido e navegação por
  teclado imprevisível. Se há duas ações, o card não é clicável: as ações são explícitas.
- Foco visível no card inteiro: `focus-visible:outline-2 focus-visible:outline-offset-2`.
- Feedback discreto no hover — mudança de cor de borda ou de fundo. **Card que sobe, cresce ou ganha
  sombra no hover é proibido**: o card não se moveu, e fingir profundidade que não existe desloca o
  conteúdo sob o cursor.

## Card de destaque — landing page

Em página pública de marketing, um card apresenta **uma frente do produto** a quem ainda não é
usuário. O trabalho ali é de leitura e persuasão, não de operação: não há tabela, filtro nem ação
por card. Isso permite um tratamento visual que a tela autenticada não comporta.

**Escopo:** vale apenas em landing page e páginas públicas. Dentro do produto, card continua sendo o
agrupador descrito acima, sem faixa e sem numeração.

### Anatomia

| Parte | Obrigatória | Tratamento |
|---|---|---|
| Faixa superior | sim | `h-1`, transparente em repouso, `bg-primaria` no hover do card |
| Título numerado | sim | `text-h3`, com `<span class="text-texto-suave">N.</span>` antes do nome |
| Descrição | sim | `text-body text-texto-suave`, duas a três linhas |
| Ícone | sim | `size-5` em `text-borda-forte`, no rodapé e alinhado à direita |

### A faixa ocupa espaço sempre

A faixa é `bg-transparent` em repouso e ganha cor por `group-hover`. **Ela nunca é criada ou
removida no hover** — o `h-1` está lá desde o início. Faixa que só existe ao passar o mouse empurra
o conteúdo 4px para baixo e faz a grade inteira tremer quando o cursor atravessa a linha de cards.

O card é `group`; a faixa reage com `group-hover:bg-primaria`. É a mesma regra de "hover não desloca
conteúdo" da seção anterior, aplicada a um elemento que muda de cor, não de tamanho.

No mobile não há ponteiro e a faixa nunca acende — por isso ela é **realce**, não informação. O que
o card comunica precisa estar inteiro sem ela.

### Numeração vem dentro do título

A numeração fica **dentro do `<h3>`**, em `text-texto-suave` para não competir com o nome da frente.
Nunca em pílula ou linha própria acima do título: isso é *eyebrow*, proibido por
[badge.md](badge.md), que prescreve exatamente esta alternativa.

Numerar só se faz quando as frentes têm **ordem real** — sequência de uso, etapas de um fluxo, ou
uma lógica que o texto sustente. Numeração sobre itens sem ordem promete um encadeamento que não
existe; nesse caso, o título vai sem número.

### Ícone é assinatura, não entrada

No rodapé e à direita (`mt-auto self-end`), em `text-borda-forte`. O olho entra pelo título e sai
pelo ícone — o inverso do card operacional, onde o ícone identifica a feature no topo.

O ícone é decorativo: `aria-hidden="true"`, sempre. Ele repete o que o título já diz.

`mt-auto` exige que o container do conteúdo seja `flex flex-1 flex-col` — é o que empurra o ícone
para baixo e mantém os ícones de todos os cards da linha na mesma altura, mesmo com descrições de
tamanhos diferentes.

### Markup

```razor
<ul class="grid grid-cols-1 gap-4 md:grid-cols-3">
    <li class="group flex h-full flex-col overflow-hidden rounded-lg border border-borda
               bg-superficie">
        <div class="h-1 bg-transparent transition-colors group-hover:bg-primaria"></div>
        <div class="flex flex-1 flex-col gap-3 p-4 md:p-5 lg:p-6">
            <h3 class="text-h3 text-texto">
                <span class="text-texto-suave">1.</span> &lt;Frente&gt;
            </h3>
            <p class="text-body text-texto-suave">&lt;O que esta frente resolve&gt;</p>
            <icon name="&lt;icone-lucide&gt;" class="mt-auto size-5 self-end text-borda-forte"
                  aria-hidden="true" />
        </div>
    </li>
</ul>
```

`overflow-hidden` no `<li>` faz a faixa respeitar o `rounded-lg` do card — sem ele, os cantos
superiores aparecem quadrados quando a faixa acende.

### Regras

- **Só em página pública.** Dentro do produto, vale o card agrupador.
- **A faixa ocupa `h-1` em repouso**, transparente. Nunca aparece do nada no hover.
- **Numeração dentro do `<h3>`**, e só quando há ordem real entre os itens.
- **Ícone no rodapé, à direita, em `text-borda-forte`** e `aria-hidden="true"`.
- **Sem sombra, sem elevação, `rounded-lg`** — tudo que a seção de elevação já exige.
- **Cor por token semântico**, como em qualquer card.

## Markup

### Card simples

```razor
<section class="rounded-lg border border-borda bg-superficie p-4 md:p-5 lg:p-6">
    <p class="text-body text-texto">@Model.<Conteudo></p>
</section>
```

### Card com cabeçalho e ação

```razor
<section class="rounded-lg border border-borda bg-superficie">
    <header class="flex flex-col gap-3 border-b border-borda p-4
                   md:flex-row md:items-center md:justify-between md:p-5 lg:p-6">
        <div class="flex items-start gap-3">
            <icon name="<icone-lucide>" class="size-5 shrink-0 text-texto-suave" aria-hidden="true" />
            <div class="flex flex-col gap-1">
                <h2 class="text-h3 text-texto"><Entidade></h2>
                <p class="text-body-sm text-texto-suave"><Descrição do que este bloco resolve></p>
            </div>
        </div>
        <a asp-action="Criar"
           class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primaria px-4 py-2.5
                  text-body-sm font-medium text-white transition-colors hover:bg-primaria/90
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria
                  md:w-auto">
            <icon name="plus" class="size-4" aria-hidden="true" />
            <Ação> <Entidade>
        </a>
    </header>

    <div class="flex flex-col gap-4 p-4 md:p-5 lg:p-6">
        @* Filtros, tabela e paginação do mesmo assunto — sem card interno em volta de nenhum deles *@
    </div>
</section>
```

Os filtros dentro do card ficam lado a lado no desktop e empilhados no mobile
(`grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4`), sem borda nem fundo próprios: eles já estão
delimitados pelo card que os contém.

### Grade de cards

```razor
<ul class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
    @foreach (var item in Model.<Itens>)
    {
        <li>
            <a asp-action="Detalhe" asp-route-id="@item.Id"
               class="flex h-full flex-col gap-2 rounded-lg border border-borda bg-superficie p-4
                      transition-colors hover:border-texto-suave
                      focus-visible:outline-2 focus-visible:outline-offset-2">
                <h3 class="text-h4 text-texto">@item.<Titulo></h3>
                <p class="text-body-sm text-texto-suave">@item.<Descricao></p>
            </a>
        </li>
    }
</ul>
```

`h-full` no filho do `<li>` mantém a altura uniforme na linha sem forçar altura fixa, que cortaria
texto longo. O número de colunas em `lg` segue a quantidade real de itens, não o hábito de três.

## Regras

- **Card agrupa; se não há o que agrupar, não há card.** Borda não é enfeite disponível.
- **Nunca card dentro de card.** Divisor, `<section>` com cabeçalho, ou nada.
- **Card estático não tem sombra.** Sombra só onde existe flutuação real.
- **`rounded-lg`**, pela escala. Canto exagerado está fora.
- **Cor só por token semântico** — `bg-superficie`, `border-borda`, `text-texto`, `text-texto-suave`,
  `bg-primaria`. Hex ou nome de cor concreta no markup é erro, ver
  [`tailwind-design`](../../.ai/skills/tailwind-design/SKILL.md).
- **Padding cresce com a largura**, nunca o contrário; nunca abaixo de `p-4` no mobile.
- **Uma ação primária por card**, no cabeçalho ou no rodapé. Duas competem e nenhuma vence.
- **Card clicável tem alvo único**, sem link aninhado, e sem hover que levanta ou aumenta.
- **Título do card é `<h2>`/`<h3>` real**, na ordem da página — não um `<div>` com peso maior.
- **Estados são do conteúdo, não do card.** Carregando, vazio, erro e sem permissão vivem dentro do
  card, mantendo a moldura estável para o layout não pular.

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Duas bordas concêntricas na mesma área | Card dentro de card | Remover a interna; usar divisor ou espaçamento |
| Tela virou um mosaico de retângulos | Card usado como item de lista | Lista com divisor, ou um card só envolvendo a lista |
| Conteúdo pula ao passar o mouse | Hover que translada ou escala o card | Só mudança de cor |
| Sombra em tudo, nada se destaca | Sombra como decoração | Borda no estático; sombra só no que flutua |
| Ação primária espremida ao lado do título em 320px | Cabeçalho sem empilhamento | `flex-col md:flex-row` e `w-full md:w-auto` na ação |
| Card sem título e sem contexto | Cabeçalho omitido onde era necessário | Título no card ou nome do bloco na página |
| Cartão com fundo transparente e blur | Glassmorphism | `bg-superficie` sólido |
| Pílula de categoria acima do título | Badge de categoria | Remover — ver [badge.md](badge.md) |
| Card com altura fixa cortando texto | `h-*` em vez de `h-full` na grade | `h-full` e deixar o conteúdo definir a altura |
| Grade treme quando o cursor atravessa os cards | Faixa de destaque criada só no hover | Faixa `h-1` sempre presente, `bg-transparent` → `group-hover:bg-primaria` |
| Faixa de destaque com cantos quadrados | Falta `overflow-hidden` no card | `overflow-hidden` no `<li>` para a faixa seguir o `rounded-lg` |
| Ícones do rodapé em alturas diferentes na mesma linha | Conteúdo sem `flex-1` para o `mt-auto` empurrar | `flex flex-1 flex-col` no container do conteúdo |
| Numeração em pílula acima do título | Eyebrow disfarçado de numeração | Número dentro do `<h3>` — ver [badge.md](badge.md) |
| Faixa de destaque em tela do produto | Padrão de landing aplicado fora do escopo | Card agrupador, sem faixa nem numeração |
