---
name: ilustracao-tokens
description: Camada de tokens de ilustração derivada da paleta de marca com color-mix e oklch — cores primária/secundária/accent, quatro tons de pele, escala neutra 100-900, fundo de container, geometria (stroke, radius) herdada da UI e tamanhos por contexto (spot, emptyState, hero). Use ao criar ou ajustar tokens de ilustração, verificar contraste em tema claro e escuro ou dimensionar uma ilustração.
agent: ilustracao-agent
---

# Tokens de ilustração

Camada **separada** dos tokens de UI, **derivada** deles. Vive no mesmo `@theme` de
[`tailwind-design`](../tailwind-design/SKILL.md) — fonte de verdade única, sem `:root` paralelo.

Prefixo `--color-ilustracao-*` para não colidir com token de UI. Cor de ilustração nunca é usada em
componente de interface, e cor de UI nunca entra no SVG.

## Por que `color-mix`, e não hex

O boilerplate não fixa paleta: `--color-primaria` é `#<hex>`, marcador didático que cada projeto
preenche. Se os tokens de ilustração fossem hex literais, congelariam uma marca que ainda não existe
e quebrariam no primeiro rebrand. Derivando com `color-mix(in oklch, …)`, a camada inteira acompanha
qualquer paleta automaticamente.

`oklch` (e não `srgb`) porque é perceptualmente uniforme: misturar 45% em oklch dá um passo visual
consistente entre matizes diferentes, o que `srgb` não garante — em `srgb` a mesma proporção escurece
demais em azul e de menos em amarelo.

## Os tokens

```css
/* Features/Shared/Styles/app.css — dentro do @theme existente */
@theme {
    /* ---------- ILUSTRAÇÃO — cor ---------- */
    /* Derivadas da marca. Não substitua por hex. */
    --color-ilustracao-primaria: var(--color-primaria);
    --color-ilustracao-secundaria: color-mix(in oklch, var(--color-primaria) 45%, var(--color-superficie));
    --color-ilustracao-accent: color-mix(in oklch, var(--color-primaria) 70%, oklch(78% 0.17 65));

    /* Fundo do container da ilustração — quase a superfície, com um toque de marca */
    --color-ilustracao-fundo: color-mix(in oklch, var(--color-primaria) 8%, var(--color-superficie));

    /* ---------- ILUSTRAÇÃO — pele ---------- */
    /* NÃO derivam da marca: pele não é cor de marca. Fixos, contrastam entre si. */
    --color-ilustracao-pele-1: oklch(88% 0.045 62);
    --color-ilustracao-pele-2: oklch(76% 0.070 55);
    --color-ilustracao-pele-3: oklch(60% 0.075 48);
    --color-ilustracao-pele-4: oklch(43% 0.060 42);

    /* ---------- ILUSTRAÇÃO — neutros ---------- */
    /* Roupa, objeto, sombra chapada. Dessaturados da marca: pertencem à paleta sem competir. */
    --color-ilustracao-neutro-100: color-mix(in oklch, var(--color-primaria) 4%, oklch(97% 0 0));
    --color-ilustracao-neutro-200: color-mix(in oklch, var(--color-primaria) 6%, oklch(92% 0 0));
    --color-ilustracao-neutro-300: color-mix(in oklch, var(--color-primaria) 8%, oklch(85% 0 0));
    --color-ilustracao-neutro-400: color-mix(in oklch, var(--color-primaria) 10%, oklch(74% 0 0));
    --color-ilustracao-neutro-500: color-mix(in oklch, var(--color-primaria) 12%, oklch(62% 0 0));
    --color-ilustracao-neutro-600: color-mix(in oklch, var(--color-primaria) 12%, oklch(50% 0 0));
    --color-ilustracao-neutro-700: color-mix(in oklch, var(--color-primaria) 10%, oklch(38% 0 0));
    --color-ilustracao-neutro-800: color-mix(in oklch, var(--color-primaria) 8%, oklch(27% 0 0));
    --color-ilustracao-neutro-900: color-mix(in oklch, var(--color-primaria) 6%, oklch(18% 0 0));

    /* ---------- ILUSTRAÇÃO — geometria ---------- */
    /* Flat puro: sem contorno. Herda o raio da UI para coerência com card e botão. */
    --ilustracao-stroke: 0px;
    --ilustracao-radius: var(--radius-lg, 0.5rem);

    /* ---------- ILUSTRAÇÃO — tamanho ---------- */
    --ilustracao-tamanho-spot: 6rem;        /*  96px — ao lado de texto, dentro de card */
    --ilustracao-tamanho-empty: 16rem;      /* 256px — empty state, o caso mais comum */
    --ilustracao-tamanho-hero: 30rem;       /* 480px — hero de landing ou login */
}
```

## Tema escuro

Ilustração não pode sumir no fundo. Ajuste **luminosidade, nunca matiz** — trocar matiz troca a
identidade da marca; trocar luminosidade devolve o contraste preservando a marca.

Como os neutros já se derivam de `--color-superficie` e da marca, a maior parte se resolve sozinha
quando a superfície muda. O que precisa de correção explícita é a inversão da escala neutra: o que
era claro precisa ficar escuro, senão a roupa branca vira mancha de luz no escuro.

```css
@media (prefers-color-scheme: dark) {
    @theme {
        /* Marca precisa de mais luz para sobreviver ao fundo escuro */
        --color-ilustracao-primaria: color-mix(in oklch, var(--color-primaria) 82%, oklch(100% 0 0));
        --color-ilustracao-secundaria: color-mix(in oklch, var(--color-primaria) 55%, oklch(72% 0 0));
        --color-ilustracao-fundo: color-mix(in oklch, var(--color-primaria) 12%, var(--color-superficie));

        /* Escala neutra invertida: 100 (o mais claro no light) vira o mais escuro */
        --color-ilustracao-neutro-100: color-mix(in oklch, var(--color-primaria) 6%, oklch(24% 0 0));
        --color-ilustracao-neutro-200: color-mix(in oklch, var(--color-primaria) 8%, oklch(32% 0 0));
        --color-ilustracao-neutro-300: color-mix(in oklch, var(--color-primaria) 9%, oklch(42% 0 0));
        --color-ilustracao-neutro-400: color-mix(in oklch, var(--color-primaria) 10%, oklch(54% 0 0));
        --color-ilustracao-neutro-500: color-mix(in oklch, var(--color-primaria) 11%, oklch(66% 0 0));
        --color-ilustracao-neutro-600: color-mix(in oklch, var(--color-primaria) 10%, oklch(76% 0 0));
        --color-ilustracao-neutro-700: color-mix(in oklch, var(--color-primaria) 8%, oklch(84% 0 0));
        --color-ilustracao-neutro-800: color-mix(in oklch, var(--color-primaria) 6%, oklch(90% 0 0));
        --color-ilustracao-neutro-900: color-mix(in oklch, var(--color-primaria) 4%, oklch(96% 0 0));

        /* Pele: sobe a luminosidade dos tons escuros, preserva matiz e diferença entre eles */
        --color-ilustracao-pele-3: oklch(66% 0.075 48);
        --color-ilustracao-pele-4: oklch(52% 0.060 42);
    }
}
```

## Contraste — a régua

Vale a mesma de [`acessibilidade-responsivo`](../acessibilidade-responsivo/SKILL.md), aplicada às
formas:

| Par | Mínimo |
|---|---|
| Forma principal × fundo do container | **4.5:1** |
| Duas formas adjacentes (roupa × pele, objeto × parede) | **3:1** |
| Detalhe fino (traço de cabelo, haste) × vizinho | **3:1** |

Como os tokens derivam da marca, o contraste **depende da paleta que o projeto escolher** — não dá
para garanti-lo no boilerplate. Portanto: ao definir `--color-primaria` e `--color-superficie` reais,
**meça**. A escala neutra foi espaçada para que saltos de 3 degraus (100→400, 300→600, 500→800)
passem de 3:1 em qualquer marca razoável; saltos de 1 degrau (100→200) **não passam** e só servem
para variação de mesma peça, nunca para separar formas adjacentes.

Regra prática ao montar uma ilustração: **use degraus distantes**. Pele-2 sobre neutro-700 funciona;
pele-2 sobre neutro-300 é mancha.

Medir com DevTools (o inspetor de contraste lê as variáveis já resolvidas) ou qualquer verificador
WCAG, nos **dois temas**.

## Tamanho por contexto

| Token | Valor | Uso |
|---|---|---|
| `spot` | 96px | Ao lado de texto, dentro de card, confirmação inline |
| `empty` | 256px | Empty state — o caso mais comum |
| `hero` | 480px | Hero de landing, lateral de login |

Aplicados por utilitária de largura no container, não por `width` no `<svg>`:

```razor
<div class="w-[--ilustracao-tamanho-empty] max-w-full">
    <partial name="Ilustracoes/_CaixaVazia" />
</div>
```

`max-w-full` é obrigatório: sem ele, o `hero` de 480px estoura em tela de 320px e cria overflow
horizontal — a falha que a skill de acessibilidade proíbe.

Abaixo de ~640px, reduza para o degrau anterior ou remova. Decorativo sai primeiro quando falta
espaço.

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Ilustração some no tema dark | Matiz ajustado em vez de luminosidade | Ajustar luminosidade; matiz é a marca |
| Formas viram uma mancha só | Degraus vizinhos da escala neutra | Usar degraus distantes (≥ 3) |
| Cor de ilustração vazou para botão | Camada usada fora do escopo | Token `--color-ilustracao-*` só entra em SVG |
| Hex literal no `@theme` de ilustração | Derivação abandonada | Voltar para `color-mix` sobre a marca |
| Overflow horizontal em mobile | `hero` sem `max-w-full` | Adicionar `max-w-full` ao container |
| Pele derivada da marca | Pele não é cor de marca | Usar os quatro tokens fixos |
