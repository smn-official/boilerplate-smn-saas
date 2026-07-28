# Ícone

**Biblioteca oficial do projeto: [Lucide](https://lucide.dev).** Ícone de qualquer tela vem daqui.
Não se mistura acervo — dois conjuntos na mesma UI se denunciam na primeira tela que mostra os dois
lado a lado.

## Por que Lucide

| Critério | Como Lucide atende |
|---|---|
| Acervo | ~1.600 ícones — cobre um SaaS inteiro sem obrigar a desenhar avulso |
| Peso único | Um só `stroke-width`, o que mantém coerência com várias pessoas mexendo ao longo de meses |
| Cor | `stroke="currentColor"` nativo — herda a cor do texto, tema escuro sem código extra |
| Grade | 24×24, alinhada à escala de espaçamento do Tailwind |
| Licença | ISC — permissiva, sem atribuição obrigatória no produto |

Descartadas: **Heroicons** (~300 ícones, acaba antes do fim do produto), **Phosphor** (seis pesos
viram inconsistência sem disciplina de time), **Tabler** (acervo maior, sem ganho que justifique
trocar o padrão).

## Pacote

```bash
npm install lucide-static
```

`lucide-static` — só os arquivos `.svg`. **Não** instalar `lucide` nem `lucide-react`: trazem runtime
JS que esta stack não usa, já que quem renderiza é o Razor.

## Por que inline, e não `<img src="…svg">`

Mesma razão que vale para ilustração, em
[`ilustracao-svg`](../../.ai/skills/ilustracao-svg/SKILL.md): SVG carregado por `<img>` ou
`background-image` roda em documento isolado e **não enxerga o CSS da página**. Perderia
`currentColor`, o tema escuro e o vínculo com os tokens.

Inline também elimina a requisição extra e qualquer JS no cliente. O custo é markup na página —
irrelevante para um ícone, que tem algumas centenas de bytes.

## Uso

```razor
<icon name="chevron-right" class="size-4" />
```

O TagHelper lê `node_modules/lucide-static/icons/<name>.svg` e injeta o conteúdo inline, com cache em
memória — o disco é lido uma vez por ícone, não por requisição. Nome inexistente falha no build, não
em produção.

## Regras

- **Tamanho pela escala do Tailwind** (`size-4`, `size-5`), nunca `width`/`height` no SVG. Medida
  fixa no elemento quebra a responsividade.
- **Cor herdada do pai** — `text-neutral-500` no container basta. Nunca `stroke` hardcoded.
- **Ícone que acompanha texto é decorativo:** `aria-hidden="true"`. O texto ao lado já nomeia a ação;
  anunciar os dois duplica a leitura.
- **Ícone sozinho dentro de botão exige `aria-label` no botão.** Sem isso o leitor de tela anuncia um
  botão sem nome. É o erro mais comum em paginação e barra de ferramentas — ver
  [`acessibilidade-responsivo`](../../.ai/skills/acessibilidade-responsivo/SKILL.md).
- **Ícone não substitui rótulo** em ação destrutiva ou incomum. Lixeira é entendida; as outras, não.

## Quando não usar ícone

Ilustração é outra coisa: cena, personagem, empty state. Mora em
`Features/Shared/Ilustracoes/`, é desenhada sob os tokens do projeto e segue
[`ilustracao-svg`](../../.ai/skills/ilustracao-svg/SKILL.md). Não se resolve empty state ampliando um
ícone de 24px.
