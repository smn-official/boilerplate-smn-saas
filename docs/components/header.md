# Cabeçalho de seção

**Este arquivo trata do cabeçalho de seção ou bloco** — o par título mais ação que abre um card, uma
seção de conteúdo ou um modal, e que se repete várias vezes na mesma tela. **A barra superior da
aplicação e o cabeçalho de página estão em [page.md](page.md)**, junto com breadcrumb, navegação e
área de conteúdo. Aqui não se documenta nada disso.

A diferença prática é de escopo: o cabeçalho de página diz **onde o usuário está** e aparece uma vez;
o cabeçalho de bloco diz **o que é este pedaço da tela** e aparece quantas vezes houver blocos.

## Anatomia

| Parte | Elemento | Obrigatório | Papel |
|---|---|---|---|
| Ícone | `<icon>` com `aria-hidden` | Não | Ajuda a reconhecer o bloco numa tela com vários |
| Título | `<h2>`…`<h4>`, conforme a posição | Sim | Nomeia o conteúdo do bloco |
| Subtítulo | `<p>` em `text-body-sm text-texto-suave` | Não | Uma frase que qualifica o título |
| Ações | Slot com 1–2 gatilhos | Não | Ações **do bloco**, nunca da tela inteira |

Título é `text-h3` na maioria dos casos e `text-h4` em bloco menor, dentro de um card. Subtítulo é
`text-body-sm`. Nenhuma parte usa `micro` ou `nano`: não são rótulos em caixa alta, são frases lidas
— escala em [`tailwind-design`](../../.ai/skills/tailwind-design/SKILL.md).

**Cabeçalho sem título não existe.** Um bloco com ícone e botão, sem nome, obriga o usuário a inferir
o que ele agrupa. Se não há o que nomear, o bloco provavelmente não deveria ser um bloco.

### Marcador de início de seção

Uma barra vertical curta à esquerda do título é a forma aceita de marcar onde uma seção começa numa
página com vários blocos empilhados:

```razor
<h2 class="flex items-center gap-2 text-h3 text-texto">
    <span class="h-4 w-1 shrink-0 rounded-full bg-primaria" aria-hidden="true"></span>
    &lt;Seção&gt;
</h2>
```

Ela é **decorativa** — `aria-hidden`, e nunca o único sinal de que ali começa uma seção; o `<h2>` já
cumpre esse papel para quem navega por headings. Vale porque custa 1px de largura e não abre nenhuma
das portas que [.ai/docs/aparencia-generica.md](../../.ai/docs/aparencia-generica.md) fecha: não é
pílula, não é badge de categoria ([badge.md](badge.md)), não tem fundo nem texto próprio.

Uma barra **por seção**, no mesmo lado, com a mesma altura. Barra em todo título de card dentro da
seção transforma o marcador em textura e ele deixa de marcar o que quer que seja.

## Nível do heading

O nível vem da **posição na árvore do documento**, nunca do tamanho da fonte desejado.

| Posição | Nível |
|---|---|
| Título da página | `<h1>` — mora em [page.md](page.md), e é único na tela |
| Seção direta da página | `<h2>` |
| Bloco dentro de uma seção | `<h3>` |
| Sub-bloco dentro de um card | `<h4>` |

Regras que não se quebram:

- **Cabeçalho de bloco nunca é `<h1>`.** O `<h1>` é o título da página e existe uma vez.
- **Não pule nível.** De `<h2>` para `<h4>` cria um buraco na estrutura, e a navegação por headings —
  como quem usa leitor de tela percorre a tela — passa a mentir sobre o aninhamento.
- **Tamanho é escolha de classe, não de tag.** Se o `<h3>` correto precisa parecer maior, aplique
  `text-h2` nele. Trocar a tag para conseguir o tamanho quebra a estrutura para ganhar pixels.
- Bloco reutilizado em profundidades diferentes recebe o nível por parâmetro da ViewModel, e o
  chamador informa o nível certo para o contexto dele.

O título do modal segue a mesma lógica dentro do seu próprio contexto e é referenciado por
`aria-labelledby` no diálogo — ver [`acessibilidade-responsivo`](../../.ai/skills/acessibilidade-responsivo/SKILL.md).

## Sem eyebrow, sem slogan

**Nada de rótulo de categoria em pílula acima do título.** Pill, chip, tag, eyebrow, kicker, dot
colorido: todos proibidos, sem exceção, conforme [badge.md](badge.md). O bloco já está dentro de uma
seção que o contextualiza, e repetir a categoria acima do título só disputa a primeira fixação do
olho.

O subtítulo é **uma frase curta que qualifica o título**, não uma promessa. "Materiais cadastrados
nos últimos 30 dias" qualifica; "Gerencie tudo em um só lugar" é slogan, e slogan está na lista de
[.ai/docs/aparencia-generica.md](../../.ai/docs/aparencia-generica.md). Se o subtítulo serve para
qualquer outro bloco do produto, ele não informa nada — corte.

Título também não é centralizado. Alinhamento à esquerda, como todo texto de bloco: texto centralizado
espalhado pela interface é um dos padrões que denunciam tela montada sem critério.

## Comportamento nas três faixas

| Faixa | Disposição |
|---|---|
| Mobile 320–767 | Uma coluna: ícone e título na primeira linha, subtítulo abaixo, ações empilhadas por último em largura total, alvo de ~44px |
| Tablet 768–1023 | Texto à esquerda, ações à direita na mesma linha |
| Desktop 1024+ | Texto à esquerda, ações à direita na mesma linha, com espaço entre os grupos |

A base é `flex-col` e o `sm:flex-row` acrescenta a linha única. No caminho inverso, a ação vira um
botão espremido no canto de 320px, abaixo do alvo mínimo de toque.

**Título longo quebra em duas linhas — e isso é o comportamento correto.** O que não pode acontecer:
truncar sem `title`, reduzir a tipografia abaixo da escala para caber, ou empurrar a ação para fora
da viewport. O bloco de texto tem `min-w-0` para poder encolher, e a ação tem `shrink-0` para não ser
esmagada — sem isso, o flex container mantém o texto na largura natural e produz rolagem horizontal,
proibida por [`acessibilidade-responsivo`](../../.ai/skills/acessibilidade-responsivo/SKILL.md).

**Duas ações é o teto.** Com mais que isso, a primeira fica visível e as demais vão para um menu
suspenso com operação completa por teclado e foco — três botões lado a lado não cabem em 320px sem
virar ícones sem rótulo.

## Markup

```razor
@model CabecalhoDeSecaoViewModel

<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">

    <div class="flex min-w-0 items-start gap-3">
        @if (Model.TemIcone)
        {
            <icon name="@Model.Icone" class="size-5 shrink-0 text-texto-suave" aria-hidden="true" />
        }

        <div class="min-w-0 space-y-1">
            <h3 class="text-h3 text-texto">@Model.Titulo</h3>

            @if (Model.TemSubtitulo)
            {
                <p class="text-body-sm text-texto-suave">@Model.Subtitulo</p>
            }
        </div>
    </div>

    @if (Model.TemAcao)
    {
        <div class="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <a asp-action="@Model.AcaoRota"
               class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md
                      bg-primaria px-4 text-body-sm font-medium text-white
                      focus-visible:outline-2 focus-visible:outline-offset-2
                      sm:min-h-9 sm:w-auto">
                <icon name="plus" class="size-4" aria-hidden="true" />
                @Model.AcaoRotulo
            </a>
        </div>
    }
</div>
```

O nível do heading vem da ViewModel quando o bloco é reutilizável; o markup acima fixa `<h3>` por ser
o caso mais comum. `AcaoRotulo` diz o que acontece ao clicar — "Nova `<Entidade>`", não "Adicionar" —
regra de [.ai/docs/aparencia-generica.md](../../.ai/docs/aparencia-generica.md) e de
[button.md](button.md).

Repetido em mais de uma view, isto vira partial, não `@apply` — regra de
[`tailwind-design`](../../.ai/skills/tailwind-design/SKILL.md).

## Regras

- **Um título, sempre.** Sem título não há cabeçalho.
- **Nível de heading pela estrutura, nunca pelo tamanho.** Cabeçalho de bloco não é `<h1>` e não pula
  nível.
- **Sem eyebrow, kicker, pílula ou dot acima do título** — [badge.md](badge.md).
- **Subtítulo qualifica; não vende.** Frase que serve para qualquer bloco do produto sai.
- **No máximo duas ações.** Além disso, menu suspenso com operação completa por teclado e foco.
- **A ação é do bloco, não da tela.** Ação que afeta a página inteira pertence ao cabeçalho de página
  ([page.md](page.md)); colocá-la no cabeçalho de um bloco engana sobre o escopo do que vai acontecer.
- **Ícone do cabeçalho é decorativo:** `aria-hidden="true"`, porque o título ao lado já nomeia — ver
  [icon.md](icon.md). Ícone que entra só para preencher o espaço à esquerda do título sai.
- **Alinhado à esquerda.** Nada de título centralizado.
- **Sem sombra e sem borda própria.** O cabeçalho pertence ao card ou à seção que já tem a sua
  superfície ([card.md](card.md)); envolvê-lo em outra caixa produz card dentro de card, proibido em
  [.ai/docs/aparencia-generica.md](../../.ai/docs/aparencia-generica.md). Uma `border-b border-borda`
  separando cabeçalho e corpo é aceitável quando há separação real de conteúdo.
- **Alvo de ~44px no mobile** (`min-h-11`), reduzido a partir de `sm`.
- **Sem contador inventado.** "12 `<Entidade>`" ao lado do título só entra com número real do
  servidor.

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Vários `<h1>` na mesma tela | Nível escolhido pelo tamanho da fonte | `<h1>` só no título da página; bloco usa `<h2>`–`<h4>` |
| Navegação por headings mostra hierarquia errada | Nível pulado (`<h2>` para `<h4>`) | Respeitar a ordem, ajustar o tamanho por classe |
| Página rola na horizontal com título longo | Bloco de texto sem `min-w-0` | `min-w-0` no texto, `shrink-0` na ação |
| Título cortado sem indicação | `truncate` sem `title` | Deixar quebrar em duas linhas |
| Botão espremido no canto em 320px | Layout de desktop como base | `flex-col` na base, `sm:flex-row` acima |
| Três botões viram ícones sem rótulo no mobile | Ações demais no cabeçalho | Primeira visível, resto em menu suspenso |
| Pílula "CATEGORIA" acima do título | Eyebrow copiado de referência de design | Remover — [badge.md](badge.md) |
| "Gerencie tudo em um só lugar" como subtítulo | Texto genérico de marketing | Frase que descreve o conteúdo do bloco, ou nenhuma |
| Cabeçalho com borda e sombra dentro de um card | Superfície duplicada | Sem caixa própria; no máximo `border-b` |
| Ação do cabeçalho de bloco afeta a tela inteira | Escopo trocado | Mover para o cabeçalho de página — [page.md](page.md) |
