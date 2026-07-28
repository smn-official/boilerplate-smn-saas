---
name: cor-contexto
description: Roteiro para escolher a cor primária a partir do contexto — perguntas de setor, público e personalidade, tabela de setor para família de cor, análise de concorrentes, ajuste de saturação e luminosidade, e registro da decisão. Use ao definir a identidade visual de um projeto novo, revisar uma cor existente ou quando o usuário não souber que cor escolher.
agent: cor-agent
---

# Escolher cor a partir do contexto

Roteiro prático. A fundamentação está no [`cor-agent`](../../agents/cor-agent.md); aqui é a execução.

## Passo 1 — Levantar o contexto

Verifique primeiro se [docs/context/general-vision.md](../../../docs/context/general-vision.md) já
responde. Se estiver preenchido, o setor e o público estão lá — não pergunte de novo.

O que falta descobrir:

| Pergunta | Se não souber |
|---|---|
| O que o produto faz, e para quem? | Bloqueante — sem isso não há recomendação, só chute |
| Que duas palavras descrevem a marca? | Ofereça: confiável · inovador · acessível · premium · sóbrio · enérgico |
| Que cor usam os concorrentes? | Peça 3–5 nomes; ou assuma a norma do setor e diga que assumiu |
| Público internacional? | Assuma Brasil e registre a suposição |

Duas palavras de personalidade bastam. Cinco viram ruído e nenhuma cor atende a todas.

## Passo 2 — Partir do setor

Ponto de partida, não veredito. A norma do setor é o que o usuário **espera**; sair dela é decisão
consciente do passo 3.

| Setor | Família usual | Por quê |
|---|---|---|
| Financeiro, banco, seguro | Azul, verde-escuro | Competência e estabilidade são o que se compra |
| Saúde, clínica | Azul, verde-água | Calma e assepsia; evite vermelho, que remete a sangue e urgência |
| Jurídico, contábil | Azul-marinho, grafite, bordô | Autoridade e sobriedade |
| Educação | Azul, laranja, amarelo | Acessibilidade sem infantilizar |
| Varejo, e-commerce | Vermelho, laranja | Energia e urgência de compra |
| Alimentação | Vermelho, laranja, verde | Apetite; verde para saudável |
| Agro, sustentabilidade | Verde, marrom, terroso | Robustez e vínculo com a terra |
| Tecnologia B2B, SaaS | Azul, roxo, grafite | Confiança; roxo diferencia sem perder seriedade |
| Beleza, moda, luxo | Preto, roxo, rosa, dourado | Sofisticação |
| Logística, indústria | Azul, laranja, amarelo | Laranja e amarelo carregam segurança operacional |
| Governo, público | Azul, verde | Institucional e neutro |

## Passo 3 — Decidir: conformar ou diferenciar

Levante a cor primária de 3–5 concorrentes. Leva dez minutos e muda a recomendação.

| Situação | Recomende |
|---|---|
| Categoria monocromática (todos azuis) e produto é desafiante | **Diferenciar** — memória e distinção |
| Categoria monocromática e produto vende confiança acima de tudo | **Conformar** — pertencer reduz atrito |
| Categoria já variada | Escolha por personalidade; diferenciação rende menos |
| Concorrente dominante tem cor muito identificada | **Evite essa cor** — comparação implícita e desfavorável |

Ao diferenciar, saia da norma **sem sair do tom do setor**: num mercado de azuis, verde-petróleo ou
roxo-escuro distinguem preservando a leitura de seriedade; laranja vibrante provavelmente não.

## Passo 4 — Calibrar saturação e luminosidade

O matiz é metade da decisão. Segundo Labrecque & Milne (2012), **saturação alta** aumenta a
percepção de empolgação; **luminosidade alta** a reduz.

O mesmo azul, três mensagens:

| Cor | Leitura | Serve a |
|---|---|---|
| `#1E3A8A` escuro, dessaturado | Institucional, sério, tradicional | Banco, jurídico, governo |
| `#2563EB` médio, saturado | Moderno, confiável, ativo | SaaS B2B, fintech |
| `#60A5FA` claro | Leve, acessível, calmo | Bem-estar, educação infantil |

Se a personalidade pedida é "enérgico", suba a saturação antes de trocar de matiz. Se é "calmo",
suba a luminosidade — mas cuidado: cor clara demais reprova em contraste como texto ou botão.

## Passo 5 — Gerar e validar

```bash
node .ai/scripts/paleta.mjs --marca "#1D4ED8"
```

O script corrige o contraste e devolve o bloco `@theme` pronto. **Não pule esta etapa**: intuição não
calcula razão de contraste, e paleta bonita que reprova em WCAG é retrabalho garantido.

Se não houver preferência nenhuma, mostre as prontas:

```bash
node .ai/scripts/paleta.mjs --sem-api
```

**Amarelo e verde-limão puros quase nunca passam** como cor de texto ou botão sobre branco — a
luminância é alta demais. Servem como acento, não como primária. Se o usuário insistir, escureça
bastante (`#A16207` em vez de `#FACC15`) ou reserve a cor para detalhe.

## Passo 6 — Cores de estado

Não derive da marca. Sucesso, erro e alerta seguem convenção — verde, vermelho, âmbar — porque o
usuário já as leu mil vezes.

| Estado | Família | Cuidado |
|---|---|---|
| Sucesso | Verde | Distinguir da primária se ela for verde |
| Erro | Vermelho | Distinguir da primária se ela for vermelha; conferir contraste |
| Alerta | Âmbar, laranja | Costuma reprovar em contraste — escureça |
| Informação | Azul | Confundível com link; diferencie por ícone |

Estado **nunca** é comunicado só por cor: ícone ou texto sempre acompanham. Resolve daltonismo e
diferença cultural de uma vez.

## Passo 7 — Registrar a decisão

Sem registro, a próxima pessoa troca a cor por gosto. Acrescente ao
[docs/context/general-vision.md](../../../docs/context/general-vision.md):

```markdown
## Identidade visual

- **Primária:** #1D4ED8 (azul-royal escuro)
- **Por quê:** SaaS B2B financeiro; personalidade "confiável" e "moderno". Azul é a norma do
  setor e a mantivemos deliberadamente — o produto é entrante e precisa reduzir atrito de
  confiança. Escurecido para afastar do azul-claro genérico de SaaS.
- **Descartados:** verde (confunde com o concorrente X, dominante), roxo (lê como criativo,
  não como financeiro).
- **Cultura:** público brasileiro; sem restrição adicional.
- **Contraste:** verificado com `paleta.mjs`; todos os pares em WCAG AA ou superior.
```

A linha "descartados" é a mais valiosa: é o que impede refazer a mesma discussão em seis meses.

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Cor bonita que ninguém lê | Escolhida sem verificar contraste | `paleta.mjs` antes de aplicar |
| Produto invisível na categoria | Copiou a cor dominante sem decidir | Passo 3, conscientemente |
| Marca "séria" que parece infantil | Saturação alta demais | Baixar saturação, escurecer |
| Erro e primária se confundem | Estado derivado da marca | Estado segue convenção |
| Paleta trocada a cada trimestre | Decisão sem registro | Passo 7 |
| Amarelo ilegível como botão | Luminância alta demais | Acento, não primária |
