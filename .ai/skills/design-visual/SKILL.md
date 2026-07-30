---
name: design-visual
description: Direção visual e acabamento de tela — tokens semânticos de cor no Tailwind 4, disciplina de acento, hierarquia com um ponto de entrada dominante, profundidade por borda e sombra, movimento com duração e easing definidos, receitas de direção prontas e o catálogo de anti-padrões que denunciam tela gerada sem critério. Use ao criar tela nova, definir a identidade visual do produto, revisar tela que "ficou sem graça" ou auditar o acabamento antes de entregar.
agent: frontend-agent
---

# Design Visual

A diferença entre uma tela bonita e uma tela genérica não é talento: é **compromisso com uma direção**
e **disciplina nos detalhes**. Esta skill define os dois. A escala tipográfica é contrato do
[feature-web](../feature-web/SKILL.md#escala-tipográfica) — esta skill não a redeclara; ela define
tudo o que a escala não cobre: cor, hierarquia, profundidade, movimento e direção.

## Uma direção, escolhida antes da primeira tela

Toda tela genérica nasce do mesmo defeito: começar a marcar sem decidir a direção visual. A ordem
certa é o contrário:

1. **Escolha uma direção** — uma das [receitas](#receitas-de-direção) abaixo ou uma própria — e
   registre a escolha nos tokens do `@theme`.
2. **Toda tela obedece a mesma direção.** Misturar receitas na mesma aplicação produz colcha de
   retalhos; trocar de direção é decisão de produto, não de tela.
3. **~80% padrão comprovado + ~20% escolha distintiva.** Os 20% moram em: uma escolha tipográfica
   marcante, uma decisão de cor, uma micro-interação memorável, microcopy com voz do produto
   ("Começar a faturar" em vez de "Enviar"). O resto segue o previsível — previsível é usável.

Teste do resultado: se um screenshot da tela permite identificar de qual produto ela é, há direção.
Se poderia ser de qualquer SaaS, foi entregue um template.

## Tokens semânticos — a fonte única do visual

Todo valor visual repetível vive no `@theme` do Tailwind 4, **nomeado pelo papel, nunca pelo matiz**.
Nome por matiz (`--color-azul-500`) trava o tema; nome por papel sobrevive a rebranding e a tema
escuro. Este é o conjunto canônico:

```css
@import "tailwindcss";

@theme {
    --color-fundo: #fafafa;
    --color-superficie: #ffffff;
    --color-texto: #111827;
    --color-texto-suave: #6b7280;
    --color-borda: #e5e7eb;
    --color-acento: #<hex da marca>;
    --color-acento-forte: #<hex da marca, tom 600 para texto>;
    --color-sucesso: #16a34a;
    --color-alerta: #d97706;
    --color-perigo: #dc2626;
    --font-sans: "<Fonte>", ui-sans-serif, system-ui, sans-serif;
}
```

- Hex cru fora do `@theme` é exceção justificável em pouquíssimos casos (ex.: cor de marca de um
  terceiro num botão de OAuth). Mais de uma dúzia de hex soltos na marcação significa que os tokens
  foram ignorados.
- O tom `600` do acento existe porque acento vivo sobre fundo claro raramente atinge contraste de
  texto: o vivo fica para preenchimentos, o escuro para texto e link.

## Cor — quatro camadas com proporção definida

Uma paleta coerente tem quatro camadas. Planeje as quatro antes de escrever CSS:

| Camada | Fatia da tela | Tokens |
|---|---|---|
| **Neutros** | 70–90% | `fundo`, `superficie`, `texto`, `texto-suave`, `borda` |
| **Acento** (um só) | 5–10% | `acento` / `acento-forte` — nunca inventar um segundo acento |
| **Semânticas** | 0–5% | `sucesso`, `alerta`, `perigo` — só para estado, nunca decoração |
| **Efeito** | <1% | gradiente, brilho — raramente justificado |

### Disciplina de acento

O excesso de acento é a falha de legibilidade mais comum em tela gerada. Limites duros:

- **No máximo 2 usos visíveis do acento por tela.** Par típico: um chip ou eyebrow + a ação
  primária. Um par, não uma inundação.
- Link conta como acento. Se a tela já tem CTA, rebaixe o link para `texto` com sublinhado.
- Hover e anel de foco contam. Racione de acordo.

### Contraste — portão, não meta

| Par | Mínimo |
|---|---|
| Texto de corpo (≤16px) sobre fundo | **4.5:1** |
| Texto grande (>18px, ou 14px bold) | **3:1** |
| Componente de UI contra superfície adjacente | **3:1** |

O detalhamento de acessibilidade (foco, aria, teclado) é do
[acessibilidade-responsivo](../acessibilidade-responsivo/SKILL.md); aqui vale o resumo: contraste se
verifica, não se estima.

### Tema escuro

- Nunca preto puro nem branco puro — ambos vibram e cansam. Fundo `#0f0f0f`-`#121212`, texto
  `#f0f0f0`-`#f7f8f8`.
- Sobre superfície escura, borda translúcida branca (`1px` de `rgba(255,255,255,0.08)`) estrutura
  melhor que borda cinza sólida: cria divisão sem ruído.
- Tema escuro não é inversão do claro: sombras perdem função (superfícies elevadas ficam mais
  **claras**, não mais sombreadas) e o acento costuma precisar de um tom mais luminoso.

## Tipografia — o que a escala não diz

A escala (tamanhos, pesos e tracking por token) está no
[feature-web](../feature-web/SKILL.md#escala-tipográfica). Complementos obrigatórios:

| Contexto | Regra |
|---|---|
| Altura de linha em display/h1 (≥32px) | `1.0`–`1.2` — título com leading solto parece fraco |
| Altura de linha em corpo (14–16px) | `1.5`–`1.6` |
| Largura de linha de corpo | 50–75 caracteres — `max-w-[65ch]` é o padrão seguro |
| Famílias por aplicação | No máximo **2** (display + corpo, ou uma variável em vários pesos) |
| Fallback | Cadeia de sistema sempre declarada; a tela não pode desmontar sem a webfont |
| Alinhamento | Nunca `text-justify` na web — cria rios de espaço; corpo é sempre à esquerda |

## Hierarquia — um ponto de entrada

Toda tela precisa de **um** elemento dominante — não dois, não três. Se tudo compete, nada lidera.

Escala é só um dos cinco vetores de hierarquia. O elemento dominante precisa de **pelo menos dois**
agindo na mesma direção:

| Vetor | O que controla |
|---|---|
| Escala | Contraste de tamanho entre níveis |
| Peso | Massa — mais pesado lê como principal |
| Espaço | Respiro ao redor — mais espaço = mais importância |
| Tracking | Tensão — apertado é veloz, aberto é cerimonial |
| Alinhamento | Quebrar o grid sinaliza importância |

Os dois modos de falha:

- **Hierarquia plana** — tudo com o mesmo peso visual; a tela vira muro. Causa: passos de escala
  próximos demais, peso uniforme, espaçamento uniforme. Correção: aumentar o contraste entre níveis
  com dois vetores ao mesmo tempo.
- **Hierarquia ruidosa** — tudo grande, bold ou acentuado; o olho não tem onde descansar. Correção:
  promover **um** elemento e rebaixar todo o resto, inclusive o que parece importante. Hierarquia é
  relativa.

Regras de composição:

- No máximo **3 níveis visuais** acima da dobra. O quarto nível é problema de composição — colapse
  ou rebaixe antes de criar.
- Espaçamento **é** vetor: seção nova ganha respiro maior que o espaçamento interno dos blocos.
  Espaçamento uniforme entre tudo destrói a hierarquia espacial.
- Papel semântico ≠ papel visual: um `h1` pode render mais discreto que um parágrafo vizinho, desde
  que a ordem de leitura do documento continue reconstruível sem reler.

## Profundidade — borda antes de sombra

Ordem de recursos para separar conteúdo: **espaço em branco → borda → sombra**. Só avance quando o
recurso anterior não resolver.

- Borda padrão: `1px` no token `borda`, sempre discreta. Borda que grita vira grade de planilha.
- Sombra é multicamada e sutil — opacidade acumulada ≤ `0.10` no tema claro. Sombra única, escura e
  espalhada é o carimbo de tela amadora.
- Um raio de canto por família de componente (ex.: `8px` em card e modal, `6px` em botão e input),
  definido uma vez e nunca decidido caso a caso.

## Movimento — pouco, curto e com propósito

Movimento existe para **confirmar** mudança de estado e **orientar** navegação — nunca para ensinar,
decorar ou parecer "premium".

| Duração | Uso |
|---|---|
| 50–100ms | Feedback instantâneo: pressionar botão, alternar toggle, hover |
| **150ms** | Padrão para confirmação de estado — o consenso entre design systems |
| 200–300ms | Entrada de UI: modal, dropdown, sheet |
| 300–500ms | Transição entre telas ou expansão de contêiner |
| >500ms | Nunca em micro-interação — o usuário passa a esperar a animação |

- Hover visto dezenas de vezes por sessão fica em ≤200ms.
- Anime `transform` e `opacity`; evite animar layout (`width`, `height`, `top`).
- **`prefers-reduced-motion` é obrigatório** em tudo que translada, escala ou rotaciona: remova o
  movimento no eixo e mantenha crossfade de opacidade quando a mudança de estado ainda precisar ser
  comunicada.
- Celebração (confete, brilho) dispara **uma vez** e encerra — nunca em loop.
- Spinner e skeleton têm teto de duração — regra no
  [estados-de-interface](../estados-de-interface/SKILL.md).

## Receitas de direção

Três direções prontas, com valores reais extraídos de produtos referência. São **pontos de
partida**: troque o acento pela cor da marca e mantenha o resto da lógica. Nunca misture receitas.

### Precisão escura — inspirada no Linear

Para produto denso de uso diário, ar de ferramenta de engenharia.

| Papel | Valor |
|---|---|
| Fundo | `#08090a` — quase preto, nunca `#000` |
| Superfície / elevado | `#0f1011` / `#191a1b` — elevação por clareamento, não por sombra |
| Texto / suave | `#f7f8f8` / `#8a8f98` |
| Acento | `#5e6ad2` (preenchimento) / `#7170ff` (interativo) — única cor cromática |
| Borda | `rgba(255,255,255,0.06)` — estrutura desenhada a lápis |
| Personalidade | Tracking negativo agressivo em display; hierarquia por luminância, não por cor |

### Minimalismo quente — inspirada no Notion

Para produto de conteúdo e escrita, sensação de papel de qualidade.

| Papel | Valor |
|---|---|
| Fundo / superfície alternada | `#ffffff` / `#f6f5f4` — cinza com subtom amarelado, nunca frio |
| Texto | `rgba(0,0,0,0.95)` — quase-preto que suaviza a leitura |
| Texto suave / terciário | `#615d59` / `#a39e98` — neutros quentes |
| Acento | `#0075de` — a única cor saturada do chrome |
| Borda | `1px` de `rgba(0,0,0,0.1)` — divisão sussurrada |
| Personalidade | Sombras com opacidade acumulada ≤0.05; profundidade sentida, não vista |

### Clareza premium — inspirada no Stripe

Para produto financeiro ou B2B que precisa transmitir confiança com elegância.

| Papel | Valor |
|---|---|
| Fundo | `#ffffff` |
| Títulos | `#061b31` — azul-marinho profundo, nunca preto |
| Acento | `#533afd` — violeta saturado, confiante |
| Sombra | Multicamada azulada: `rgba(50,50,93,0.25)` + `rgba(0,0,0,0.1)` — elevação com cor de marca |
| Raio | 4–8px contido — nada em formato pílula, nada duro |
| Personalidade | Peso leve em display (300–400 grande); números tabulares em dado financeiro |

## Anti-padrões que denunciam tela gerada

Cada item abaixo é o suficiente para reprovar uma revisão visual:

1. **Indigo padrão do Tailwind como acento** — `#6366f1`, `#4f46e5`, `#8b5cf6`, `#7c3aed`,
   `#a855f7`. É o carimbo mais confiável de saída de IA. O acento vem do `@theme`, escolhido de
   propósito.
2. **Gradiente roxo→azul no herói** — superfície chapada + tipografia intencional ganham sempre.
3. **Emoji como ícone de feature** — use SVG monoline de traço `1.5`–`1.8`, com `currentColor`.
4. **Card arredondado com borda esquerda colorida** — o formato canônico do "dashboard de IA".
   Remova o raio ou a borda lateral.
5. **Métrica inventada** — "10× mais rápido", "99.9% uptime". Ou o número tem fonte real, ou o
   espaço recebe um placeholder rotulado.
6. **Texto de enchimento** — lorem ipsum, "recurso um / dois / três". Seção vazia se resolve com
   composição, não inventando palavras.
7. **Blob e onda decorativos de fundo** — geometria sem significado.
8. **Mais de ~12 hex crus fora do `@theme`** — os tokens foram ignorados.
9. **Acento aparecendo 6+ vezes na mesma tela** — releia a disciplina de acento.
10. **Simetria perfeita sem tensão** — alternar densidade (uma seção compacta, uma que respira) lê
    como intencional; tudo idêntico lê como template.

## Antes de entregar

- [ ] A direção visual está registrada nos tokens do `@theme` e a tela não introduz hex fora deles.
- [ ] O acento aparece no máximo 2 vezes; as camadas de cor respeitam as proporções.
- [ ] Um único elemento domina acima da dobra, com dois vetores de hierarquia ativos.
- [ ] Contraste verificado nos pares texto/fundo e componente/superfície.
- [ ] Toda animação tem duração da tabela, anima `transform`/`opacity` e respeita
      `prefers-reduced-motion`.
- [ ] Nenhum item do catálogo de anti-padrões presente.
- [ ] A tela tem ao menos um traço distintivo que um usuário conseguiria descrever depois de fechar.
