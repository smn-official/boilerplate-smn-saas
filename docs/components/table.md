# Tabela

Tabela existe para **comparar registros entre si**. Se o usuário não compara — só lê um registro por
vez — o dado não pertence a uma tabela, e sim a uma página de detalhe.

Toda tabela deste projeto atende as três faixas de largura. Não existe "tabela de desktop com mobile
depois": a adaptação faz parte do componente, e a obrigação está em [README.md](README.md).

## Anatomia

| Parte | Elemento | Papel |
|---|---|---|
| Wrapper | `<div>` com borda e `overflow-x-auto` quando houver scroll | Contém a rolagem para que a **página** nunca role |
| Legenda | `<caption class="sr-only">` | Nomeia a tabela para leitor de tela. **Obrigatória** |
| Cabeçalho | `<thead>` com `<th scope="col">` | Rotula a coluna e liga cada célula ao seu rótulo |
| Corpo | `<tbody>` com uma `<tr>` por registro | Um registro por linha, sempre |
| Identificador | `<th scope="row">` na primeira célula | Diz qual registro é aquele: código, número, nome |
| Ações | Última `<td>`, alinhada à direita | Ações **daquela linha**, nunca da tela inteira |

O cabeçalho usa `text-micro uppercase text-texto-suave` — é o único lugar do componente onde `micro`
cabe, porque são rótulos curtos em caixa alta, como exige
[`tailwind-design`](../../.ai/skills/tailwind-design/SKILL.md). Célula é `text-body`. Metadado dentro da
célula é `text-body-sm text-texto-suave`.

## As duas saídas para tabela extensa

[`acessibilidade-responsivo`](../../.ai/skills/acessibilidade-responsivo/SKILL.md) fixa a norma; aqui
está o critério de escolha.

| Saída | Quando | Custo |
|---|---|---|
| **Scroll interno no wrapper** | Até ~4 colunas relevantes, estreitas e comparáveis | Usuário precisa arrastar para ver o fim da linha |
| **Virar card no mobile** | ~5+ colunas relevantes, ou alguma com texto longo | Perde a comparação lado a lado; ganha leitura completa |

Regra prática: **se para decidir algo o usuário precisa ver duas colunas que não cabem juntas em
320px, vire card.** Scroll horizontal que esconde a coluna decisiva não é adaptação, é defeito
adiado.

O `overflow-x-auto` mora **no wrapper**. Nunca no `<body>`, nunca no contêiner de página. Página com
rolagem horizontal reprova em qualquer largura.

## Prioridade de coluna

O tablet não tem espaço para todas as colunas do desktop, e espremer as mesmas colunas em fonte menor
é proibido — tipografia não desce da escala para caber. A saída é **classificar cada coluna antes de
escrever o markup**:

| Classe | Definição | Comportamento |
|---|---|---|
| **Essencial** | Sem ela o usuário não identifica o registro nem decide o que fazer | Presente nas três faixas |
| **Contextual** | Ajuda a interpretar, mas a decisão sobrevive sem ela na lista | Sai no tablet, **volta no card do mobile** |
| **Descartável** | Só é consultada dentro do registro | Não entra na tabela; mora na página de detalhe |

Testes para classificar:

- **Essencial?** Se essa coluna sumir, duas linhas diferentes ficam indistinguíveis? Então é
  essencial.
- **Contextual?** O usuário olha essa coluna para escolher a linha, ou depois de já ter escolhido?
  "Depois de escolher" é contextual.
- **Descartável?** Alguém já filtrou ou ordenou por ela? Se nunca, ela ocupa largura sem pagar
  aluguel.

O ponto que mais se erra: **coluna contextual não desaparece do produto quando some no tablet.** Ela
reaparece empilhada no card do mobile, com rótulo. Esconder no tablet e também não mostrar no card é
perder dado, não priorizar.

Estado do registro é essencial sempre que muda o que o usuário faz com a linha. Ele mora aqui, e não
é badge de categoria — a distinção está em [badge.md](badge.md).

## Comportamento nas três faixas

| Faixa | Estrutura | Colunas | Ações |
|---|---|---|---|
| Mobile 320–767 | Cada linha vira um bloco: identificador e ações na primeira linha; campos empilhados com rótulo e valor abaixo | Essenciais **e** contextuais, empilhadas | Alvo de ~44px na linha do identificador |
| Tablet 768–1023 | Tabela plena | Essenciais; contextuais ocultas | Coluna à direita, ícone com `aria-label` |
| Desktop 1024+ | Tabela plena | Essenciais e contextuais | Coluna à direita |

No mobile, valor numérico ou monetário e o estado do registro recebem peso maior que o resto do
bloco — são o que o olho procura primeiro. Peso vem do token (`font-medium` sobre `text-body`), nunca
de tamanho fora da escala.

## Markup

Duas visões do mesmo dado no mesmo `@foreach`: a tabela some abaixo de `md`, o card some a partir de
`md`. Nada é anunciado duas vezes pelo leitor de tela porque uma das duas está sempre com `hidden`.

```razor
@model IReadOnlyList<<Entidade>ViewModel>

<div class="hidden overflow-x-auto rounded-lg border border-borda bg-superficie md:block">
    <table class="w-full text-body">
        <caption class="sr-only">Lista de <Entidade></caption>
        <thead class="border-b border-borda">
            <tr>
                <th scope="col" class="px-4 py-3 text-left text-micro uppercase text-texto-suave">
                    <Coluna identificadora>
                </th>
                <th scope="col" class="px-4 py-3 text-left text-micro uppercase text-texto-suave">
                    <Coluna essencial>
                </th>
                <th scope="col"
                    class="hidden px-4 py-3 text-left text-micro uppercase text-texto-suave lg:table-cell">
                    <Coluna contextual>
                </th>
                <th scope="col" class="px-4 py-3 text-right text-micro uppercase text-texto-suave">
                    <span class="sr-only">Ações</span>
                </th>
            </tr>
        </thead>
        <tbody>
            @foreach (var item in Model)
            {
                <tr class="border-b border-borda last:border-0 hover:bg-borda/20">
                    <th scope="row" class="px-4 py-3 text-left font-medium text-texto">
                        @item.Identificador
                    </th>
                    <td class="px-4 py-3 text-texto">@item.<Coluna></td>
                    <td class="hidden px-4 py-3 text-texto-suave lg:table-cell">@item.<Contextual></td>
                    <td class="px-4 py-3">
                        <div class="flex items-center justify-end gap-1">
                            <a asp-action="Detalhe" asp-route-id="@item.Id"
                               class="inline-flex size-9 items-center justify-center rounded-md
                                      text-texto-suave hover:bg-borda/40 hover:text-texto
                                      focus-visible:outline-2 focus-visible:outline-offset-2"
                               aria-label="Ver <Entidade> @item.Identificador">
                                <icon name="eye" class="size-4" aria-hidden="true" />
                            </a>
                        </div>
                    </td>
                </tr>
            }
        </tbody>
    </table>
</div>

<ul class="flex flex-col gap-3 md:hidden">
    @foreach (var item in Model)
    {
        <li class="rounded-lg border border-borda bg-superficie p-4">
            <div class="flex items-start justify-between gap-3">
                <p class="text-body font-medium text-texto">@item.Identificador</p>
                <a asp-action="Detalhe" asp-route-id="@item.Id"
                   class="inline-flex size-11 shrink-0 items-center justify-center rounded-md
                          text-texto-suave focus-visible:outline-2 focus-visible:outline-offset-2"
                   aria-label="Ver <Entidade> @item.Identificador">
                    <icon name="eye" class="size-5" aria-hidden="true" />
                </a>
            </div>
            <dl class="mt-3 flex flex-col gap-2">
                <div class="flex items-baseline justify-between gap-3">
                    <dt class="text-body-sm text-texto-suave"><Coluna essencial></dt>
                    <dd class="text-body text-texto">@item.<Coluna></dd>
                </div>
                <div class="flex items-baseline justify-between gap-3">
                    <dt class="text-body-sm text-texto-suave"><Coluna contextual></dt>
                    <dd class="text-body text-texto">@item.<Contextual></dd>
                </div>
                <div class="flex items-baseline justify-between gap-3">
                    <dt class="text-body-sm text-texto-suave"><Valor></dt>
                    <dd class="text-body font-medium text-texto">@item.<Valor></dd>
                </div>
            </dl>
        </li>
    }
</ul>
```

O card do mobile é `<ul>`/`<li>` com `<dl>` dentro — lista de registros, cada um com pares
rótulo/valor. Não é `<table>` com `display: block`, que quebra a semântica sem ganho, nem `<div>`
solto, que não anuncia quantos itens existem.

Quando a escolha for **scroll interno** em vez de card, existe um wrapper só, e ele recebe
`tabindex="0"`, `role="region"` e `aria-label` para que a área rolável seja alcançável pelo teclado.

## Estados obrigatórios

Toda tabela projeta os quatro. Tabela que só existe com dados está incompleta e não é entregue.

| Estado | O que renderizar |
|---|---|
| Carregando | Estrutura da tabela com linhas de esqueleto na altura da linha real, sem pular layout |
| Vazio | Frase que diz **por que** está vazio e a ação possível; distinguir "não há registros" de "o filtro não achou nada" |
| Erro | Mensagem com a causa concreta e uma ação de tentar novamente; nunca "algo deu errado" |
| Sem permissão | Explicar que o acesso é restrito e a quem pedir; não mostrar tabela vazia fingindo que não há dado |

Vazio por filtro **mantém os filtros visíveis** e oferece limpá-los. Trocar a tabela por uma tela em
branco faz o usuário achar que perdeu o trabalho.

## Regras

- **`<caption>` obrigatório**, mesmo que `sr-only`. É o que dá nome à tabela sem depender do título
  da página.
- **`<th scope="col">` em todo cabeçalho** e `scope="row"` na célula identificadora. Sem `scope`, o
  leitor de tela lê valores sem saber a que coluna pertencem.
- **Tabela não é ferramenta de layout.** Grade de formulário, cartão e barra de ações são
  `flex`/`grid`.
- **Ação com ícone sozinho exige `aria-label` no elemento**, e o ícone leva `aria-hidden="true"` —
  ver [icon.md](icon.md). Ação destrutiva não fica só no ícone.
- **Alvo de toque de ~44px no mobile.** Ícones de 16px encostados um no outro são o erro clássico da
  coluna de ações em tela estreita.
- **Rolagem horizontal só dentro do wrapper.** Nunca na página, em nenhuma das quatro larguras de
  validação.
- **Zebra e hover são discretos ou não existem.** Servem para o olho seguir a linha, não para
  decorar; sombra em linha, borda brilhante e card dentro de card estão fora.
- **Ordenação e filtro pertencem à tabela quando existem de verdade.** Cabeçalho clicável é
  `<button>` dentro do `<th>` com `aria-sort`; nunca um `<th>` com `onclick`.
- **A ViewModel entrega o valor pronto** — data formatada, valor com moeda, rótulo do estado. A view
  não formata nem decide por cadeia de `if`.

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Página rola na horizontal em 320px | `overflow-x` na página, ou tabela solta no fluxo | Mover a rolagem para o wrapper ou virar card |
| Coluna some no tablet e nunca mais aparece | Coluna contextual esquecida no card | Incluí-la no `<dl>` do mobile |
| Fonte menor no tablet para caber | Tipografia usada como ajuste de layout | Ocultar a coluna contextual, manter a escala |
| Leitor de tela lê valores soltos | Falta `scope` no `<th>` | `scope="col"` e `scope="row"` |
| Botão anunciado sem nome | Ícone sozinho sem `aria-label` | `aria-label` no botão, `aria-hidden` no ícone |
| Estado do registro só por cor | Cor como único portador da informação | Texto junto da cor |
| Tela em branco quando o filtro não acha nada | Estado vazio não projetado | Vazio com os filtros preservados |
| Registro anunciado duas vezes | Card e tabela visíveis ao mesmo tempo | `hidden md:block` e `md:hidden` complementares |
