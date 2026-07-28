---
name: tailwind-design
description: Design system em Tailwind CSS 4 — declarar tokens em @theme, aplicar a escala tipográfica de 13 tokens, definir cor, espaçamento e superfície, extrair padrão repetido para componente Razor. Use ao criar ou alterar estilo, token, tipografia, cor ou componente visual.
agent: frontend-agent
---

# Tailwind Design

## Onde o estilo mora

```text
Features/Shared/Styles/app.css      @import "tailwindcss" + @theme + componentes compartilhados
Features/<Feature>/Styles/<feature>.css   apenas o que é específico da feature (opcional)
```

**Tokens são declarados uma única vez**, no `@theme` do arquivo compartilhado. Nenhum valor
paralelo fora do tema. Classe de feature nunca redefine o sistema base.

## Configuração — Tailwind 4

No Tailwind 4 não há `tailwind.config.js` obrigatório: a configuração vive no CSS e o plugin oficial
do Vite substitui o PostCSS.

```css
/* Features/Shared/Styles/app.css */
@import "tailwindcss";

@theme {
    --font-sans: "<Fonte>", system-ui, sans-serif;

    --color-primaria: #<hex>;
    --color-superficie: #<hex>;
    --color-borda: #<hex>;
    --color-texto: #<hex>;
    --color-texto-suave: #<hex>;

    --text-display-xl: 56px;
    --text-display-xl--font-weight: 700;
    --text-display-xl--letter-spacing: -0.025em;

    --text-h3: 18px;
    --text-h3--font-weight: 600;
    --text-h3--letter-spacing: -0.01em;

    --text-body: 14px;
    --text-body--font-weight: 400;
}
```

Cada token de `--text-*` gera a utilitária correspondente (`text-h3`, `text-body`) já com peso e
tracking embutidos — é isso que impede o uso de `text-[18px] font-semibold tracking-tight` solto.

## Escala tipográfica

| Token | Tamanho | Peso | Tracking | Uso |
|---|---|---|---|---|
| `display-xl` | 56px | 700 | -0.025em | Hero de landing, lado de marca |
| `display-lg` | 44px | 700 | -0.025em | Headline de tela cheia |
| `display-md` | 34px | 700 | -0.025em | Wordmark, número de KPI gigante |
| `h1` | 26–28px | 700 | -0.02em | Título de página ou card principal |
| `h2` | 22–24px | 700 | -0.02em | Seção da página, KPI grande |
| `h3` | 18px | 600 | -0.01em | Subseção, título de card |
| `h4` | 16px | 600 | 0 | Bloco de formulário, item destacado |
| `body-lg` | 16px | 400 | 0 | Subtítulo de hero, parágrafo de apresentação |
| `body` | 14px | 400 | 0 | Texto padrão: inputs, parágrafos, células |
| `body-sm` | 13px | 400–500 | 0 | Label de formulário, link e botão secundário |
| `caption` | 12px | 500 | 0 | Rodapé, texto de ajuda, metadado |
| `micro` | 11px | 600 | 0.08em | Eyebrow, label de indicador, tag — **sempre uppercase** |
| `nano` | 10–11px | 600 | 0.32em | Tagline, divisor tipográfico — **sempre uppercase** |

## Princípios de tipografia

- Toda declaração de tamanho, peso ou tracking **escolhe um token da escala**. Valor arbitrário fora
  da tabela é proibido; um caso real que não caiba exige **alterar a escala antes de codar a
  exceção**.
- Pesos seguem a escala: 700 em display e headings altos, 600 em `h3`/`h4`/`micro`/`nano`, 500 para
  ênfase em `body-sm`/`caption`, 400 para texto corrido.
- Tracking negativo existe **apenas** em display e heading; de `body` para baixo é `0`.
- `micro` e `nano` só funcionam em caixa alta — o tracking está calibrado para uppercase.
- Nomes de classe referenciam o **token semântico**, nunca o valor em pixels: `text-h3`, não
  `text-18`.
- Tipografia mora na camada de estilo, **nunca** em atributo `style`.
- Tipografia nunca é reduzida abaixo da escala para fazer conteúdo caber — reorganize o layout.

## Cor, espaçamento e superfície

- Cor sempre por token semântico (`bg-superficie`, `text-texto-suave`), nunca por valor
  (`text-[#ff0000]` é exceção justificada, não regra).
- Espaçamento usa a escala do Tailwind; valor arbitrário (`p-[13px]`) indica token faltando.
- Estados visuais de um mesmo componente são consistentes em todas as telas: um botão primário tem
  um único conjunto de classes no produto inteiro.
- Estado sempre expresso por classe utilitária condicionada, e a decisão de **qual** estado vem
  resolvida da ViewModel — a view não deriva classe por cadeia de `if/else`.

## Repetição vira componente, não `@apply`

Duplicação de utilitárias **dentro de um componente único** é aceitável. Espalhada por dez views,
não. A saída é um partial ou view component, não `@apply`.

```razor
@* Features/Shared/_Botao.cshtml *@
@model BotaoViewModel

<button type="@Model.Tipo"
        class="inline-flex items-center justify-center rounded-lg px-4 py-2 text-body-sm
               font-medium bg-primaria text-white transition
               focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria
               disabled:opacity-50 disabled:pointer-events-none">
    @Model.Texto
</button>
```

`@apply` só se justifica para normalizar um elemento base global (reset de `input`, por exemplo),
dentro de `@layer base`, e nunca para montar um componente.

## Layout

- Tokens, superfícies e componentes compartilhados vivem em **um único lugar central**.
- Conteúdo com largura máxima única; navegação lateral fixa no desktop e em offcanvas abaixo de
  ~960px; barra superior aderente.
- A rolagem vertical pertence à **área principal de conteúdo**, nunca ao contêiner centralizado.
- Um contêiner de página padrão controla a pilha vertical e o espaçamento entre blocos — não
  redefinir caso a caso.
- Em telas estreitas, elementos puramente decorativos são removidos, preservando marca e conteúdo
  funcional.

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| `text-[15px]` no markup | Valor fora da escala | Usar o token vizinho ou alterar a escala |
| `style="color: red"` | Estilo escapou do sistema | Classe utilitária com token de cor |
| `.card { @apply ... }` usado em 8 views | Componente disfarçado de CSS | Partial Razor |
| Cor duplicada em `:root` e `@theme` | Fonte de verdade dupla | Só `@theme` |
| `micro` em caixa mista | Tracking calibrado para uppercase | Adicionar `uppercase` |
| Classe de feature sobrescrevendo botão base | Sistema base furado | Mover a variante para o base |
