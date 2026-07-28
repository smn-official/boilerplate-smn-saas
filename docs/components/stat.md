# Indicador

Card de indicador — um número grande que resume um estado do domínio. É o componente mais fácil de
usar errado da pasta, porque parece útil mesmo quando não é.

**A regra que decide tudo: um indicador existe para provocar uma decisão.** Se ao olhar o número o
usuário não tem nada a fazer com aquilo, o indicador está ocupando o topo da tela sem pagar aluguel.
Fileira de indicadores decorativa é o sinal mais citado de interface genérica.

## Antes de criar um

Responda as quatro. Falhou uma, não é indicador — é dado de relatório.

| Pergunta | Se a resposta for não |
|---|---|
| O usuário **age** quando esse número muda? | É informação de relatório, não de painel |
| Existe um valor **normal** conhecido, que torne o atual bom ou ruim? | Sem referência, o número não informa nada |
| Ele muda **dentro da jornada** do usuário? | Se muda uma vez por mês, não fica no topo de toda tela |
| Clicar nele leva a **algum lugar útil**? | Indicador que não navega é beco sem saída |

**Quantidade vem do domínio, não da grade.** Se existem três estados que exigem ação, são três
indicadores. Quatro cards porque quatro cabem lado a lado é o padrão que denuncia a tela montada sem
uso real. Não force simetria.

## Anatomia

```text
┌──────────────────────────────┐
│ <Rótulo>              <var>  │  ← rótulo text-body-sm, variação à direita
│ 1.284                   [ic] │  ← número text-display-md, ícone opcional
│ <contexto ou comparação>     │  ← text-caption, opcional
└──────────────────────────────┘
```

| Parte | Token | Obrigatória |
|---|---|---|
| Rótulo | `text-body-sm text-texto-suave` | Sim |
| Valor | `text-display-md` ou `text-h1` conforme a densidade | Sim |
| Variação | `text-caption`, com sinal e período | Não |
| Contexto | `text-caption text-texto-suave` | Recomendada |
| Ícone | `size-5`, `aria-hidden="true"` | Não |

O ícone é **decorativo e discreto**. Ele ajuda a distinguir um card do outro na varredura visual;
não vai dentro de círculo colorido, não ganha fundo próprio e não disputa peso com o número — ver
[icon.md](icon.md).

## O número precisa de referência

Um número sozinho não diz se está bom. `142` é muito ou pouco? A referência é o que transforma dado
em decisão:

| Forma | Exemplo | Quando |
|---|---|---|
| Comparação com período anterior | `+12% vs. semana passada` | Há sazonalidade e histórico |
| Proporção do total | `18 de 240` | O todo é conhecido e finito |
| Distância da meta | `62% da meta do mês` | Existe meta acordada |
| Nenhuma | apenas o número | Só quando o valor é autoexplicativo no domínio |

**Variação sem período de referência é ruído.** `0%` isolado não diz "estável" — diz que ninguém
definiu contra o que comparar. Se não há base, **omita a variação** em vez de exibir zero.

Variação leva **sinal e direção explícitos** (`+12%`, `−4%`), e cor nunca é o portador único: quem
não distingue cor precisa ler o sinal. Atenção também ao domínio — queda nem sempre é ruim, e a cor
não deve afirmar o contrário.

## Indicador leva a uma ação

O caminho padrão é o indicador ser um link para a lista **já filtrada** por aquele recorte.

```razor
<a asp-action="@nameof(<Controller>.Index)" asp-route-status="<Status>"
   class="group flex flex-col gap-2 rounded-lg border border-borda bg-superficie p-4
          transition-colors hover:border-texto-suave
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria">
    <span class="flex items-center justify-between gap-2">
        <span class="text-body-sm text-texto-suave">&lt;Rótulo&gt;</span>
        <icon name="&lt;icone&gt;" class="size-5 text-texto-suave" aria-hidden="true" />
    </span>
    <span class="text-display-md text-texto">@Model.Valor</span>
    <span class="text-caption text-texto-suave">@Model.Contexto</span>
</a>
```

O card inteiro é o alvo — não um link "ver mais" no rodapé. Alvo único, sem link aninhado, como em
[card.md](card.md). Hover muda cor de borda; **não levanta, não cresce, não ganha sombra**.

Quando o indicador realmente não tem destino, ele é `<div>`, não `<a>` com `href="#"`.

## Seleção como filtro

Quando os indicadores filtram a lista abaixo, eles deixam de ser cards e viram **controles**. Isso
muda a semântica:

- São `<button>` ou links com estado, não `<div>` com `onclick`.
- O selecionado carrega `aria-pressed="true"` (botão) ou `aria-current="true"` (link).
- O destaque do selecionado usa **pelo menos dois portadores** — borda de destaque e peso de texto,
  por exemplo. Só cor de borda falha para daltonismo e alto contraste.
- Selecionar **atualiza a lista abaixo** e anuncia a mudança por `aria-live` na contagem de
  resultados. Filtro silencioso deixa quem usa leitor de tela sem saber que algo mudou.

## Grupo de valores relacionados

Quando os números **se decompõem uns nos outros** — um total e suas partes, o mesmo valor por
recorte — eles não viram quatro cards independentes. Viram um bloco só, com um cabeçalho que nomeia
o conjunto e os valores divididos por dentro:

```text
┌────────────────────────────────────────────────────────────┐
│ <Título do grupo>                                          │  ← cabeçalho do bloco
├────────────────────────────────────────────────────────────┤
│    TOTAL      │   <PARTE A>   │   <PARTE B>  │  <PARTE C>  │  ← text-micro uppercase
│  R$ 12.480    │   R$ 8.200    │   R$ 3.100   │  R$ 1.180   │  ← text-h2 / display-md
│  +8% vs. <p>  │   +3% vs. <p> │   −2% vs.<p> │  novo       │  ← text-caption
└────────────────────────────────────────────────────────────┘
```

Aqui o rótulo usa `micro` em caixa alta — é o caso para que o token existe: rótulo curto, uppercase,
com tracking calibrado, como fixa [`tailwind-design`](../../.ai/skills/tailwind-design/SKILL.md).
Fora de rótulo curto em caixa alta, `micro` não se usa.

```razor
<section class="rounded-lg border border-borda bg-superficie">
    <header class="border-b border-borda px-4 py-3">
        <h3 class="text-h4 text-texto">&lt;Título do grupo&gt;</h3>
    </header>

    <dl class="grid grid-cols-2 divide-borda sm:grid-cols-4 sm:divide-x">
        @foreach (var valor in Model.Valores)
        {
            <div class="flex flex-col items-center gap-1 p-4 text-center">
                <dt class="text-micro uppercase text-texto-suave">@valor.Rotulo</dt>
                <dd class="text-h2 text-texto">@valor.Formatado</dd>
                @if (valor.TemComparacao)
                {
                    <p class="text-caption text-texto-suave">@valor.Comparacao</p>
                }
            </div>
        }
    </dl>
</section>
```

`<dl>` porque são pares rótulo/valor — a estrutura que o leitor de tela usa para ligar `TOTAL` a
`R$ 12.480`. Quatro `<div>` soltos anunciam oito fragmentos sem relação entre si.

**A comparação é condicional, não decorativa.** `@if (valor.TemComparacao)` é o que impede a fileira
de `0% vs. período anterior` repetida — sem base de comparação, a linha não existe. Repetir a mesma
variação vazia em todas as colunas é o sintoma mais visível de painel montado antes de haver dado.

Quando um valor é parte de outro, o total vem primeiro e as partes seguem na ordem em que o domínio
as lê. Se a soma das partes não fecha com o total, **diga por quê** no contexto — ou o usuário vai
achar que a conta está errada.

## Comportamento por faixa

| Faixa | Grade | Observação |
|---|---|---|
| Mobile 320–767 | 1 ou 2 colunas | Duas só se o número for curto; rótulo nunca trunca |
| Tablet 768–1023 | 2 colunas | Quatro indicadores viram 2×2, não uma fileira espremida |
| Desktop 1024+ | Até 4 colunas | Acima de 4, quebre em duas linhas — não reduza o card |

No grupo de valores, os divisores verticais só existem quando as colunas estão lado a lado
(`sm:divide-x`). Empilhado no mobile, a divisão vira horizontal ou desaparece — linha vertical entre
blocos empilhados não separa nada.

```razor
<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
```

**Nunca reduza a tipografia do número para caber.** Se `text-display-md` não cabe em 320px, o card
passa a ocupar a linha inteira — a escala não desce, como fixa
[`acessibilidade-responsivo`](../../.ai/skills/acessibilidade-responsivo/SKILL.md).

Número longo recebe formatação abreviada no domínio (`12,4 mil`) **decidida na ViewModel**, nunca
truncamento visual com reticências. `1.2...` não é informação.

## Estados obrigatórios

| Estado | O que renderizar |
|---|---|
| Carregando | Esqueleto na altura final do card, para a grade não pular quando os dados chegam |
| Zero legítimo | O número `0` com contexto que explique — "nenhuma &lt;Entidade&gt; hoje" é diferente de erro |
| Sem dados | Traço (`—`) e a razão; nunca `0`, que afirma um fato falso |
| Erro | Traço e a possibilidade de recarregar, sem derrubar os outros indicadores da fileira |
| Sem permissão | O card não é renderizado; não mostre `0` para quem não pode ver o valor |

**Zero e "não sei" são coisas diferentes.** Exibir `0` quando a consulta falhou faz o usuário decidir
com base em fato inexistente — o erro mais grave que um indicador comete. A distinção completa entre
vazio, zero e erro está em [empty-state.md](empty-state.md).

## Regras

- **Cada indicador provoca uma ação**; sem isso, não entra na tela.
- **Quantidade vem do domínio.** Três se são três; nunca quatro por simetria.
- **Variação sempre com período de referência**, ou omitida.
- **Sinal e texto além da cor** na variação.
- **Um alvo por card**, sem link aninhado, sem `href="#"`.
- **Hover só muda cor.** Sem elevar, escalar ou animar — ver [card.md](card.md).
- **Ícone decorativo e discreto**, `aria-hidden`, sem fundo colorido próprio.
- **Escala tipográfica preservada** em toda faixa.
- **Formatação e rótulo vêm prontos da ViewModel**; a view não calcula percentual nem escolhe texto.
- **Sem gráfico de enfeite dentro do card.** Sparkline só se a tendência for lida de verdade.

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Fileira de quatro cards zerados | Indicadores escolhidos por caberem | Manter só os que provocam ação |
| `0%` em todos os cards | Variação sem base de comparação | Omitir a variação até haver histórico |
| Usuário vê o número e não sabe o que fazer | Indicador sem destino | Link para a lista filtrada |
| `0` exibido quando a consulta falhou | Erro tratado como zero | Traço e mensagem de erro |
| Grade pula quando os dados chegam | Falta de esqueleto na altura final | Esqueleto do tamanho do card |
| Número cortado em 320px | Tipografia reduzida ou truncada | Card em largura total, valor abreviado na ViewModel |
| Card de filtro não anuncia mudança | Seleção sem `aria-pressed` e sem `aria-live` | Estado no elemento e contagem em região viva |
| Queda pintada como falha | Cor afirmando juízo que o domínio não sustenta | Sinal e texto; cor só quando a direção é inequívoca |
