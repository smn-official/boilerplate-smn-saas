---
name: ilustracao-svg
description: Desenho de SVG flat inline em partial Razor — estrutura do arquivo, cores por var() de token, construção de personagem Corporate Memphis com formas geométricas, sombra chapada, otimização e uso em empty state. Use ao desenhar ou revisar uma ilustração, criar personagem, montar partial de ilustração ou converter SVG de terceiro para os tokens.
agent: ilustracao-agent
---

# SVG de ilustração

## Onde mora

```text
Features/Shared/Ilustracoes/_<Nome>.cshtml    partial por ilustração, SVG inline
```

Um partial por ilustração, em `Shared` — ilustração é reusada entre features por definição. Segue a
mesma regra de [`tailwind-design`](../tailwind-design/SKILL.md): repetição vira componente, não
`@apply` nem copiar markup.

## Por que inline, e não `<img src="…svg">`

SVG carregado por `<img>` ou `background-image` roda em documento isolado: **não enxerga as CSS
variables da página**. As cores ficariam hardcoded, o vínculo com os tokens se perderia e o tema
escuro não funcionaria. Inline é o que torna `fill="var(--color-ilustracao-primaria)"` possível.

O custo é markup na página. Aceitável: uma ilustração flat otimizada tem 1–3 KB, e ela aparece em
empty state — uma por tela, não vinte.

## Esqueleto do partial

```razor
@* Features/Shared/Ilustracoes/_CaixaVazia.cshtml *@
<svg viewBox="0 0 240 200"
     fill="none"
     xmlns="http://www.w3.org/2000/svg"
     class="w-full h-auto"
     aria-hidden="true"
     focusable="false">
    ...
</svg>
```

Obrigatório em todo SVG de ilustração:

- **`viewBox` sim, `width`/`height` não** no elemento raiz — quem dimensiona é o container, via token
  de tamanho. Largura fixa no SVG quebra a responsividade.
- **`class="w-full h-auto"`** — preenche o container e preserva proporção.
- **`aria-hidden="true"` + `focusable="false"`** quando decorativa. `focusable="false"` importa: sem
  ele, o IE/Edge legado põe o SVG na ordem de tabulação.
- **Sem `<title>`** em ilustração decorativa — vira tooltip e é anunciado.

## Cores — sempre `var()`, nunca hex

```xml
<!-- certo -->
<circle cx="120" cy="72" r="26" fill="var(--color-ilustracao-pele-2)" />

<!-- errado: congela a cor, ignora o tema, fura o design system -->
<circle cx="120" cy="72" r="26" fill="#E8B98F" />
```

Ao converter SVG de terceiro (unDraw, Storyset, Figma), o trabalho é exatamente esse: mapear cada hex
para o token mais próximo, e **remover** o que não couber — gradiente, filtro, máscara.

## Construção de personagem

Corporate Memphis é geometria simples, não anatomia. O personagem inteiro é círculo, retângulo
arredondado e caminho de traço grosso:

| Parte | Forma | Token típico |
|---|---|---|
| Cabeça | `<circle>` | `pele-1..4` |
| Cabelo | `<path>` chapado sobre a cabeça | `neutro-800` |
| Tronco | `<rect rx>` ou `<path>` | `primaria` / `secundaria` |
| Braço, perna | `<path>` com `stroke-linecap="round"` ou retângulo arredondado | pele ou `neutro-*` |
| Mão, pé | `<circle>` pequeno | pele |
| Sombra no chão | `<ellipse>` chapada, **sem** blur | `neutro-200` (light) |

Proporções levemente exageradas: membros mais longos e finos que o real, cabeça um pouco grande,
mãos simplificadas em círculo. **Rosto sem detalhe** — nem olho, nem boca. É o que evita o vale da
estranheza e o que deixa a mesma ilustração servir a contextos diferentes.

Sombra é **forma chapada de tom mais escuro**, nunca `filter: blur()` nem `opacity`. Opacidade
simulando profundidade quebra o contraste calculado dos tokens.

## Exemplo completo — empty state

Caixa vazia com personagem. Cinco cores, todas de token, fundo transparente:

```razor
@* Features/Shared/Ilustracoes/_CaixaVazia.cshtml *@
<svg viewBox="0 0 240 200"
     fill="none"
     xmlns="http://www.w3.org/2000/svg"
     class="w-full h-auto"
     aria-hidden="true"
     focusable="false">

    <ellipse cx="120" cy="180" rx="76" ry="8"
             fill="var(--color-ilustracao-neutro-200)" />

    <rect x="52" y="142" width="12" height="34" rx="6"
          fill="var(--color-ilustracao-neutro-800)" />
    <rect x="74" y="142" width="12" height="34" rx="6"
          fill="var(--color-ilustracao-neutro-800)" />

    <path d="M56 100h26a11 11 0 0 1 11 11v34H45v-34a11 11 0 0 1 11-11Z"
          fill="var(--color-ilustracao-primaria)" />
    <path d="M90 114c16 1 27 6 34 14"
          stroke="var(--color-ilustracao-pele-2)" stroke-width="8" stroke-linecap="round" />
    <circle cx="69" cy="80" r="15" fill="var(--color-ilustracao-pele-2)" />
    <path d="M54 78c0-11 7-16 15-16s15 5 15 16c0-6-7-8-15-8s-15 2-15 8Z"
          fill="var(--color-ilustracao-neutro-800)" />

    <path d="M118 126h78v44a6 6 0 0 1-6 6h-66a6 6 0 0 1-6-6v-44Z"
          fill="var(--color-ilustracao-secundaria)" />
    <path d="M112 110a4 4 0 0 1 4-4h84a4 4 0 0 1 4 4v17h-92v-17Z"
          fill="var(--color-ilustracao-primaria)" />
    <path d="M144 127h24v8a4 4 0 0 1-4 4h-16a4 4 0 0 1-4-4v-8Z"
          fill="var(--color-ilustracao-neutro-800)" />

    <circle cx="204" cy="70" r="6" fill="var(--color-ilustracao-secundaria)" />
    <circle cx="34" cy="126" r="5" fill="var(--color-ilustracao-secundaria)" />
    <path d="M170 46h11M175.5 40.5v11"
          stroke="var(--color-ilustracao-secundaria)" stroke-width="3" stroke-linecap="round" />
</svg>
```

Cinco cores: `primaria`, `secundaria`, `pele-2`, `neutro-800`, `neutro-200`. O `accent` ficou de
fora de propósito — cabe numa ilustração com mais elementos, não nesta.

**Ordem de pintura importa.** SVG não tem `z-index`: quem vem depois cobre quem veio antes. Erros
que só aparecem ao renderizar:

- Cabelo **depois** da cabeça, senão o círculo da pele cobre o cabelo e sobra só uma borda.
- Personagem **ao lado** da caixa, não atrás: corpo escondido por objeto vira membro flutuante.
- Pernas como duas formas com **vão visível** entre elas — dois traços grossos e próximos leem como
  um bloco só.

Renderize antes de entregar. Revisão de código não pega ordem de pintura errada.

```razor
```

Uso na tela — a ilustração **acompanha** a mensagem, nunca a substitui:

```razor
<div class="flex flex-col items-center gap-4 py-12 text-center">
    <div class="w-[--ilustracao-tamanho-empty] max-w-full">
        <partial name="Ilustracoes/_CaixaVazia" />
    </div>
    <h3 class="text-h3 text-texto">Nenhum pedido por aqui</h3>
    <p class="text-body text-texto-suave max-w-sm">
        Quando você registrar o primeiro pedido, ele aparece nesta lista.
    </p>
    <a asp-action="Novo" class="text-body-sm ...">Registrar pedido</a>
</div>
```

## Otimização

Ilustração entregue tem que estar limpa:

- Sem `<defs>`, `<mask>`, `<clipPath>` a menos que indispensável — em flat, quase nunca é.
- Sem metadado de editor (`<metadata>`, `sodipodi:`, `inkscape:`, `data-name`, `id` gerado).
- Sem grupo `<g>` vazio ou com uma única transformação que dá para aplicar direto no caminho.
- Coordenadas com no máximo 1 casa decimal; `viewBox` em números redondos.
- Sem `style="…"` inline — atributo de apresentação (`fill`, `stroke`) é mais enxuto e sobrescreve
  igual.

`svgo` resolve a maior parte, mas **confira o resultado**: ele às vezes converte `var()` em algo que
não deveria, ou remove `aria-hidden`. Otimização que quebra token é regressão.

## Checklist

- [ ] Nenhum hex literal — toda cor é `var(--color-ilustracao-*)`.
- [ ] ≤ 5 cores distintas.
- [ ] Sem gradiente, `filter`, `opacity` de profundidade, textura ou 3D.
- [ ] Fundo transparente; nenhum retângulo de fundo cobrindo o `viewBox`.
- [ ] `viewBox` presente; sem `width`/`height` no raiz.
- [ ] `aria-hidden="true"` e `focusable="false"` se decorativa.
- [ ] Rosto sem detalhe facial; proporções exageradas com consistência.
- [ ] Mais de um personagem ⇒ tons de pele diferentes.
- [ ] Contraste conferido nos dois temas.
- [ ] Renderiza correto a 320px de largura, sem overflow.

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Cor não muda com o tema | SVG em `<img>` ou hex literal | Inline no partial, cor por `var()` |
| Ilustração estoura em mobile | `width` fixo no `<svg>` | Só `viewBox`, container dimensiona |
| Leitor de tela anuncia a ilustração | Falta `aria-hidden` ou tem `<title>` | Adicionar `aria-hidden`, remover `<title>` |
| Visual "sujo" perto da UI | Gradiente ou sombra com blur | Sombra é forma chapada mais escura |
| Formas se fundem | Degraus vizinhos da escala neutra | Degraus distantes (≥ 3) |
| SVG de 40 KB | Export cru de editor | Remover metadado, simplificar caminho |
