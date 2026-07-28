---
name: design-intencional
description: Direção visual deliberada e escrita de interface — ancorar a tela no que o produto é, escolher o elemento de assinatura, decidir onde cabe movimento e escrever rótulo, erro e vazio como material de design. Use ao criar tela nova, landing, hero ou empty state, ao revisar uma tela que ficou genérica, e sempre que houver texto de interface a redigir.
agent: frontend-agent
---

# Design Intencional

`tailwind-design` responde **com que peças construir**. Esta skill responde **por que esta tela é
assim e não de qualquer outro jeito** — e como escrever o texto que vive nela.

As duas convivem: a intenção decide, o sistema executa. Toda decisão daqui sai em token declarado no
`@theme` — se o papel que a tela precisa não existe na escala, o token novo entra no tema antes de
codar, nunca como valor solto no markup.

## Decida pelo produto, não por lista de proibições

Não existe catálogo de looks banidos aqui, e isso é deliberado: uma lista de caras proibidas não
abre o espaço, ela recorta regiões e empurra tudo para o meio seguro — que é como todas as telas
acabam parecidas.

O critério é outro, e é positivo: **cada decisão visual precisa de uma razão que venha deste
produto.** Uma direção que você escolheu porque o assunto pede é legítima, mesmo que seja comum.
A mesma direção escolhida porque foi a primeira que apareceu é o defeito — independentemente de
qual seja.

A pergunta que separa as duas: *se o produto fosse outro, eu teria chegado aqui igual?* Se sim,
não foi decisão, foi inércia. Troque e registre o porquê.

## Ancore no que o produto é

Antes de desenhar, fixe três coisas em uma frase cada — se o pedido não as define, **você define e
declara**:

1. **Assunto concreto** — não "sistema de gestão", e sim "diário de obra que o mestre preenche no
   canteiro, com luva e sol na tela".
2. **Quem usa** — e em que condição: pressa, ruído, telefone na mão, primeira vez.
3. **A única tarefa da tela** — o que a pessoa veio fazer aqui. Uma, não três.

O vocabulário do próprio domínio é de onde sai a decisão distintiva: os materiais, os instrumentos,
os artefatos e as palavras que aquela gente usa. Tela de obra pode ter a lógica de uma prancheta;
tela de conciliação, a de um extrato. Isso orienta ritmo, densidade e ilustração — não autoriza
inventar cor nem tipografia fora do tema.

## O elemento de assinatura

Cada tela tem **um** elemento pelo qual é lembrada, e o resto é disciplinado ao redor dele. Ousadia
concentrada num ponto lê como decisão; espalhada, lê como ruído.

Num produto com design system compartilhado, a assinatura vem de **composição**, não de exceção
visual. Ela pode ser o recorte do hero, a ilustração, o ritmo da grade, o modo como a lista respira.
Ela **não** é um botão que só existe ali, um token novo, nem uma família tipográfica extra.

> Antes de entregar, tire um acessório. Se a tela tem três coisas querendo ser a assinatura, duas
> são decoração.

## Movimento

Movimento serve o assunto ou não entra. Um momento orquestrado — a entrada da tela, uma revelação no
scroll — vale mais que efeito espalhado em tudo.

- Micro-interação em hover e foco: sim, é feedback.
- Transição de estado que explica o que aconteceu: sim.
- Elemento que se mexe sem ter o que dizer: não.
- `prefers-reduced-motion` respeitado sempre — regra em
  [acessibilidade-responsivo](../acessibilidade-responsivo/SKILL.md).

## Complexidade proporcional

Direção densa exige execução elaborada; direção mínima exige precisão de espaçamento, tipo e
detalhe. Elegância é executar bem a direção escolhida — tela "sóbria" que na verdade é tela árida
não é sobriedade, é entrega incompleta. Quando o vazio for legítimo, ele é resolvido com
ilustração ([ilustracao-svg](../ilustracao-svg/SKILL.md)), nunca ampliando um ícone.

## Método — duas passadas

**Passada 1, no seu raciocínio:** escreva o plano antes do código.

- **Cor:** quais tokens do `@theme` esta tela usa e em que papel. Se falta um papel, o token entra
  no tema — não no markup.
- **Tipo:** que hierarquia a tela precisa, e quais tokens a expressam. Se o brief pede uma voz
  tipográfica que a escala atual não tem, o token entra no `@theme` nesta passada.
- **Layout:** uma frase de conceito, e um rascunho em ASCII se ajudar a comparar opções.
- **Assinatura:** a única coisa pela qual a tela será lembrada.
- **Estados:** carregamento, vazio, erro e permissão — os quatro, sempre.

**Passada 2, antes de codar:** releia o plano contra o produto. Para cada item, pergunte: *eu
chegaria nisto para qualquer outra tela parecida?* Se a resposta for sim, é default — troque e
registre o que mudou e por quê. Só depois escreva o código, seguindo o plano revisado.

Itere no raciocínio; mostre ao usuário quando houver confiança de que vai agradar, não a cada
hipótese.

## Escrita de interface

Palavra em tela existe para tornar o uso mais fácil. É material de design, não enfeite — trate com o
mesmo cuidado que espaçamento e cor.

| Regra | Ruim | Bom |
|---|---|---|
| Nomeie pelo que a pessoa controla | "Configurar webhook" | "Avisos por e-mail" |
| Voz ativa dizendo o que acontece | "Enviar" | "Salvar alterações" |
| Mesmo verbo do início ao fim | Botão "Publicar" → toast "Operação concluída" | "Publicar" → "Publicado" |
| Específico vence esperto | "Ops, algo deu errado" | "O CNPJ já está cadastrado" |
| Cada elemento faz um trabalho só | Label que também explica e exemplifica | Label rotula; texto de apoio explica |

- **Erro não pede desculpa e não é vago.** Diz o que aconteceu e como resolver, na voz da interface.
- **Vazio é convite.** Diz o que existe ali quando houver conteúdo, e qual é o próximo passo.
- **Sentence case**, verbo simples, sem enchimento. Tom calibrado ao público — no canteiro, direto;
  no financeiro, preciso.
- O texto sai no idioma do negócio, como manda o [AGENTS.md](../../../AGENTS.md).

## Autocrítica antes de entregar

- [ ] Consigo dizer, em uma frase, por que esta tela é assim para **este** produto?
- [ ] Cada decisão visual tem razão vinda do produto, ou alguma foi a primeira que apareceu?
- [ ] A assinatura é uma só, e o resto está quieto?
- [ ] Tem numeração, divisória ou rótulo que decora em vez de informar?
- [ ] Nenhum *eyebrow*, *kicker*, pílula ou tag de categoria?
- [ ] Todo tamanho e toda cor saem de token do `@theme` — nenhum valor solto no markup?
- [ ] Os quatro estados existem — carregamento, vazio, erro, permissão?
- [ ] Os textos passam na tabela acima: rótulo pelo que a pessoa controla, verbo consistente, erro
      específico?
- [ ] Olhei a tela renderizada, não só o markup — [verificacao-navegador](../verificacao-navegador/SKILL.md).

E as duas perguntas finais, antes do signoff:

> Que parte visível eu ainda não olhei de perto?
> Qual defeito me envergonharia se o usuário reparasse?

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Tela correta e sem personalidade | Plano pulado; foi direto ao código | Passada 1 e 2 antes de codar |
| Três elementos disputando atenção | Ousadia espalhada | Escolher uma assinatura, calar o resto |
| Cor nova aparecendo no markup | Paleta pensada por tela | Token no `@theme`, uma vez só |
| `text-[22px]` no meio da tela | Token criado no markup em vez do tema | Declarar no `@theme` e usar pelo nome |
| Todas as telas com o mesmo peso e ritmo | Escala tratada como teto, não como ponto de partida | Brief que pede outra voz ganha token próprio no tema |
| Pílula de categoria "reaparecendo" | Conselho externo de direção de arte | Regra do repositório vence — hierarquia de título |
| Botão "Enviar" e toast "Sucesso!" | Copy escrita depois, por outra pessoa | Verbo definido junto do fluxo, mantido até o fim |
