# Paginação

Paginação responde três perguntas, sempre nessa ordem: **quantos itens por vez**, **onde estou no
total** e **como avanço**. Componente que só tem setas responde a última e deixa o usuário sem saber
se faltam duas linhas ou duzentas.

Acompanha a lista que ela pagina — normalmente uma tabela ([table.md](table.md)) — e fica **abaixo**
dela, dentro do mesmo bloco de conteúdo.

## Anatomia

| Parte | Elemento | Papel |
|---|---|---|
| Seletor de tamanho | `<select>` com `<label>` associado | Quantos registros por página |
| Contador de intervalo | `<p>` com `aria-live="polite"` | "Mostrando 21–40 de 137" — números reais |
| Controles | `<button>` ou `<a>` de anterior e próximo | Navegação entre páginas |
| Região | `<nav aria-label="Paginação">` | Agrupa e nomeia o bloco para navegação assistida |

O contador é `text-body-sm text-texto-suave`. O rótulo do seletor é `text-body-sm`. Nada aqui usa
`micro` — não são rótulos de coluna em caixa alta, são frases lidas.

**Numeração de páginas (1, 2, 3, … 12) é opcional e quase sempre dispensável.** Ela só se justifica
quando o usuário volta a uma página específica de propósito. Fora disso, anterior/próximo mais o
contador bastam, e cabem em 320px sem malabarismo.

## Comportamento nas três faixas

| Faixa | Disposição |
|---|---|
| Mobile 320–767 | Empilhado e centralizado: seletor, contador, controles. Anterior e próximo lado a lado com alvo de ~44px |
| Tablet 768–1023 | Uma linha: seletor à esquerda, contador e controles à direita |
| Desktop 1024+ | Uma linha: seletor à esquerda, contador e controles à direita, com espaço entre os grupos |

A base é o mobile — `flex-col` — e o `sm:flex-row` acrescenta a linha única. O caminho inverso
(desktop primeiro, quebrando depois) é o que produz controle espremido em 320px.

**O contador nunca some no mobile.** É a única informação que diz o tamanho do conjunto; escondê-la
em tela estreita retira o dado justamente onde menos linhas cabem na viewport. Se o texto ficar
longo, encurte o rótulo ("21–40 de 137"), não remova.

## Markup

```razor
@model PaginacaoViewModel

<nav aria-label="Paginação"
     class="flex flex-col items-center gap-3 border-t border-borda px-4 py-3
            sm:flex-row sm:items-center sm:justify-between">

    <div class="flex items-center gap-2">
        <label for="itens-por-pagina" class="text-body-sm text-texto-suave">Itens por página</label>
        <select id="itens-por-pagina" name="itensPorPagina"
                class="rounded-md border border-borda bg-superficie px-2 py-2 text-body text-texto
                       focus-visible:outline-2 focus-visible:outline-offset-2"
                data-url="@Url.Action(nameof(<Controller>Controller.Index))">
            @foreach (var tamanho in Model.TamanhosDisponiveis)
            {
                <option value="@tamanho" selected="@(tamanho == Model.ItensPorPagina)">@tamanho</option>
            }
        </select>
    </div>

    <div class="flex items-center gap-4">
        <p class="text-body-sm text-texto-suave" aria-live="polite">
            Mostrando @Model.PrimeiroItem–@Model.UltimoItem de @Model.TotalDeItens
        </p>

        <div class="flex items-center gap-1">
            <a asp-action="Index" asp-route-pagina="@(Model.PaginaAtual - 1)"
               class="inline-flex size-11 items-center justify-center rounded-md text-texto-suave
                      hover:bg-borda/40 hover:text-texto
                      focus-visible:outline-2 focus-visible:outline-offset-2
                      aria-disabled:pointer-events-none aria-disabled:opacity-40 sm:size-9"
               aria-label="Página anterior"
               aria-disabled="@(!Model.TemPaginaAnterior)">
                <icon name="chevron-left" class="size-5" aria-hidden="true" />
            </a>
            <a asp-action="Index" asp-route-pagina="@(Model.PaginaAtual + 1)"
               class="inline-flex size-11 items-center justify-center rounded-md text-texto-suave
                      hover:bg-borda/40 hover:text-texto
                      focus-visible:outline-2 focus-visible:outline-offset-2
                      aria-disabled:pointer-events-none aria-disabled:opacity-40 sm:size-9"
               aria-label="Próxima página"
               aria-disabled="@(!Model.TemProximaPagina)">
                <icon name="chevron-right" class="size-5" aria-hidden="true" />
            </a>
        </div>
    </div>
</nav>
```

`PrimeiroItem`, `UltimoItem`, `TotalDeItens`, `TemPaginaAnterior` e `TemProximaPagina` vêm calculados
da ViewModel. A view não faz aritmética de offset nem decide estado por cadeia de `if` — regra de
[`tailwind-design`](../../.ai/skills/tailwind-design/SKILL.md).

O `data-url` no `<select>` segue o contrato de
[`razor-interop`](../../.ai/skills/razor-interop/SKILL.md): o TypeScript lê a rota do atributo, não a
monta em string. E o `<select>` fica dentro de um `<form>` com `method="get"` quando houver
progressive enhancement — sem JS, mudar o tamanho ainda navega.

## Regras

- **Alvo de toque de ~44px no mobile** (`size-11`), reduzido para `size-9` a partir de `sm`. Seta de
  16px colada na outra é o defeito mais comum deste componente.
- **Todo controle só de ícone tem `aria-label`** e o ícone tem `aria-hidden="true"` — ver
  [icon.md](icon.md). "Página anterior" e "Próxima página" são os rótulos; a chevron não nomeia nada.
- **O contador mostra números reais** — primeiro item, último item e total. "Página 2 de 7" não diz
  quantos registros existem; "Mostrando 21–40 de 137" diz. Se o total for caro de contar, mostre o
  intervalo e diga isso explicitamente, mas **nunca invente** o total.
- **O seletor tem `<label>` visível.** `placeholder` ou o texto "/ pág" solto ao lado não é rótulo
  acessível.
- **Mudar o tamanho da página volta para a primeira página.** Manter o offset faz o usuário cair num
  intervalo que não existe mais.
- **Com uma única página, o bloco de controles não é renderizado — o contador sim.** "Mostrando 1–7
  de 7" confirma que a lista está inteira ali. Renderizar setas permanentemente desabilitadas é
  ocupar espaço com controle que nunca funciona.
- **Sem nenhum registro, não há paginação.** Quem fala é o estado vazio da tabela.
- **Controle indisponível é anunciado, não apenas apagado.** `aria-disabled` no `<a>`, ou o atributo
  `disabled` nativo se for `<button>`; opacidade sozinha não informa o leitor de tela.
- **Nada de decoração.** Sem sombra, sem borda destacada, sem cápsula ao redor das setas — a
  separação da lista é uma `border-t border-borda`, e só. Ver
  [.ai/docs/aparencia-generica.md](../../.ai/docs/aparencia-generica.md).
- **A paginação não rola horizontalmente** em 320px. Se não couber, empilhe mais — nunca reduza a
  tipografia abaixo da escala, conforme
  [`acessibilidade-responsivo`](../../.ai/skills/acessibilidade-responsivo/SKILL.md).

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Contador sumiu no mobile | `hidden sm:block` no texto de intervalo | Manter sempre visível; encurtar o rótulo se preciso |
| Setas minúsculas e coladas em 320px | Tamanho de desktop aplicado como base | `size-11` na base, `sm:size-9` acima |
| Leitor de tela anuncia "link" sem nome | Controle só com ícone e sem `aria-label` | `aria-label` no controle, `aria-hidden` no ícone |
| Página vazia após trocar itens por página | Offset preservado na troca | Voltar para a primeira página |
| Setas desabilitadas numa lista de 3 itens | Paginação renderizada com uma página só | Renderizar apenas o contador |
| "Página 3 de 8" e nada mais | Contador sem números reais | Trocar por intervalo e total de itens |
| Rótulo "/ pág" sem `<label>` | Texto decorativo no lugar do rótulo | `<label for>` associado ao `<select>` |
