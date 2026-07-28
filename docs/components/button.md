# Botão

Botão é a promessa de que **algo vai acontecer**. O rótulo diz o quê, a hierarquia diz o que importa
mais, e o estado diz se já aconteceu. Botão que não cumpre as três coisas é decoração com borda.

Todo botão do projeto atende as três faixas de largura de [README.md](README.md). Não existe botão
que só funciona no desktop, nem versão mobile adiada.

O padrão repetido vira um partial — `Features/Shared/_Botao.cshtml`, como manda
[`tailwind-design`](../../.ai/skills/tailwind-design/SKILL.md). As classes abaixo são a definição desse
partial, não markup para colar em dez views.

## Hierarquia

| Variante | Peso visual | Quando | Quantidade |
|---|---|---|---|
| **Primária** | Sólido, `bg-primaria` + texto claro | A ação que o bloco existe para fazer | **Uma por tela ou por card** |
| **Secundária** | Borda `border-borda`, fundo `bg-superficie` | Alternativa legítima: cancelar, voltar, ação paralela | Quantas o fluxo exigir, com moderação |
| **Terciária / discreta** | Sem borda nem fundo, só `text-texto-suave` | Ação de baixa consequência: limpar filtro, exportar | Livre |
| **Destrutiva** | Texto e borda de erro; sólido só na confirmação final | Excluir, cancelar registro, revogar acesso | Uma, e nunca ao lado da primária |
| **Só ícone** | Discreto, alvo quadrado | Ação repetida por linha ou por item, com espaço curto | Agrupadas à direita |
| **Flutuante** | Sólido, ancorado à viewport | A primária de uma lista longa, **só no mobile** | Uma, e só quando os critérios abaixo valem |

Duas primárias no mesmo bloco significam que a decisão não foi tomada: escolha qual é a ação e
rebaixe a outra para secundária.

**Destrutiva não fica encostada na primária.** Separe por espaço, por posição (extremo oposto) ou
por confirmação em outro passo. Excluir por engano é o erro mais caro que um botão produz.

## Rótulo

**Verbo + objeto.** O rótulo diz o que acontece ao clicar, no vocabulário real do domínio — o termo
que o usuário fala no telefone é o termo do botão.

| Genérico | Específico |
|---|---|
| "Saiba mais" | "Ver <Entidade>" |
| "Começar" | "<Ação> <Entidade>" |
| "Enviar" | "<Ação> <N> <Entidade>" |
| "OK" | "Confirmar <Ação>" |
| "Sim" | "Excluir <Entidade>" |

Rótulo vago — "Começar", "Explorar", "Saiba mais", "Continuar" — é proibido por
[.ai/docs/aparencia-generica.md](../../.ai/docs/aparencia-generica.md). Serve para qualquer produto,
logo não serve para nenhum.

Outras regras de rótulo:

- **Ícone à esquerda do texto**, quando houver. Ele reforça a ação; não a substitui.
- Rótulo curto, sem ponto final, e **no imperativo**: "Salvar", não "Salvando" nem "Salvamento".
- Em caixa mista. `uppercase` é dos tokens `micro`/`nano`, que não são de botão.
- Na confirmação de ação destrutiva, o rótulo repete o que será feito — "Excluir <Entidade>" —
  porque é a última chance de ler antes de perder o dado.

## Comportamento nas três faixas

| Faixa | Ação primária | Secundárias | Alvo de toque |
|---|---|---|---|
| Mobile 320–767 | `w-full` | Empilhadas **abaixo** da primária, também em largura total | ~44px de altura efetiva |
| Tablet 768–1023 | Largura natural | Lado a lado, à esquerda da primária | ~44px |
| Desktop 1024+ | Largura natural | Lado a lado | Altura natural, mínimo confortável |

A classe é `w-full sm:w-auto` na primária, mobile-first. A norma está em
[`acessibilidade-responsivo`](../../.ai/skills/acessibilidade-responsivo/SKILL.md); aqui fica a forma.

**Ações secundárias nunca viram botões minúsculos lado a lado no mobile** para caber na mesma linha.
Se não cabem, empilham. Reduzir o alvo até caber é trocar um problema de layout por um de
usabilidade.

O padding do botão padrão (`px-4 py-2.5` sobre `text-body-sm`) já entrega ~44px de altura. Botão só
de ícone precisa da medida explícita: `size-11` no mobile, `size-9` a partir de `md`, onde o ponteiro
é preciso.

## Botão só de ícone

Exige **`aria-label` no botão** e `aria-hidden="true"` no ícone — sem isso o leitor de tela anuncia
um botão sem nome. É o erro mais comum em barra de ferramentas e coluna de ações, e está detalhado em
[icon.md](icon.md).

O rótulo acessível é específico, não genérico: `aria-label="Ver <Entidade> @item.Identificador"`, e
não `aria-label="Ver"`. Numa lista, dez botões com o mesmo nome são indistinguíveis por teclado.

**Ação destrutiva ou incomum não fica só no ícone.** Lixeira é entendida; o resto, não.

## Estados obrigatórios

Todos os cinco existem em qualquer botão do produto. Falta de estado de carregamento é um dos itens
que [.ai/docs/aparencia-generica.md](../../.ai/docs/aparencia-generica.md) marca como obrigatório.

| Estado | Marcação | Regra |
|---|---|---|
| Hover | `hover:bg-primaria/90` (ou `hover:bg-borda/40` no discreto) | Só mudança de cor. Nada de crescer ou levantar |
| Focus | `focus-visible:outline-2 focus-visible:outline-offset-2` | Nunca `outline: none` sem substituto |
| Disabled | `disabled` nativo + `disabled:opacity-50 disabled:pointer-events-none` | Nunca `<button>` visualmente apagado que ainda dispara |
| Carregando | `disabled` + `aria-busy="true"` + spinner substituindo o ícone | **Largura estável**, ver abaixo |
| Destrutivo confirmado | Segundo passo explícito | Nunca destrói no primeiro clique sem confirmação |

### Carregando, em detalhe

- O botão fica `disabled` enquanto a requisição corre — impede o duplo envio, que é o bug clássico de
  formulário.
- `aria-busy="true"` no botão; a conclusão é anunciada por uma região `role="status"`
  (`aria-live="polite"`) fora do botão, não trocando o texto dele em silêncio.
- **A largura não pode mudar.** Trocar "Salvar" por "Salvando…" encolhe ou estica o botão e desloca
  o que está ao lado. A saída é manter o rótulo e trocar apenas o ícone pelo spinner, ou reservar a
  largura com `min-w-*`.
- O spinner respeita `prefers-reduced-motion`.

Botão desabilitado por regra de permissão precisa dizer **por quê** em texto próximo ou `title` —
botão cinza sem explicação é tela sem tratamento de permissão.

## `<button>` ou `<a>`

| Precisa de | Use |
|---|---|
| Executar ação na página, enviar formulário, abrir modal | `<button type="button">` ou `<button type="submit">` |
| Levar para outra URL | `<a href>` / `asp-action` |
| Nunca | `<div>` ou `<span>` com `onclick` |

`<div onclick>` não recebe foco, não responde a `Enter`/`Espaço` e não é anunciado como botão. A
regra completa está em
[`acessibilidade-responsivo`](../../.ai/skills/acessibilidade-responsivo/SKILL.md).

`<button>` dentro de `<form>` sem `type` é `submit` por padrão — declare `type="button"` sempre que
não for para enviar.

Um `<a>` com aparência de botão continua sendo navegação: abre em nova aba com o modificador do
sistema, aparece no histórico, e não deve ter `role="button"` por cima.

## Formato

- Cantos pela escala: **`rounded-lg`**. O botão acompanha o raio do card, ver [card.md](card.md).
- **`rounded-full` é proibido** em botão no fluxo da página. Botão em cápsula está na lista de
  [.ai/docs/aparencia-generica.md](../../.ai/docs/aparencia-generica.md). Botão só de ícone também é
  `rounded-lg` — o quadrado arredondado combina com o alvo de toque retangular e com o raio do card.
  A **única** exceção é o botão flutuante, abaixo, que realmente paira sobre o conteúdo.
- Sem sombra — salvo o botão flutuante, que flutua de verdade e por isso precisa se destacar do que
  passa por baixo.
- Sem degradê, sem borda brilhante, sem animação de entrada.
- Tipografia: `text-body-sm font-medium`. Nenhum tamanho fora da escala de 13 tokens.
- Cor apenas por token semântico: `bg-primaria`, `text-texto`, `text-texto-suave`, `border-borda`,
  `bg-superficie`. Hex ou nome de cor concreta no markup é erro.

## Botão flutuante no mobile

Numa lista longa, a ação primária fica no cabeçalho da página — e some da viewport assim que o
usuário rola. Quem está no fim de uma lista de 40 registros precisa voltar ao topo para agir. Em tela
estreita, onde cabe menos conteúdo por vez, isso acontece o tempo todo.

A saída é **promover a ação primária a botão flutuante apenas no mobile**. Ele não substitui o botão
do cabeçalho: é o mesmo comando, ancorado à viewport enquanto o do cabeçalho rola junto com a página.

### Quando cabe

Os quatro critérios valem juntos. Falhou um, não é caso de flutuante.

| Critério | Por quê |
|---|---|
| A ação é **a** primária da tela, uma só | Dois botões flutuantes é uma decisão não tomada |
| O conteúdo **rola de verdade** — lista, feed, tabela longa | Em tela curta o botão do cabeçalho nunca sai de vista |
| A ação é **frequente** no uso real, não eventual | Ação rara não paga cobrir conteúdo permanentemente |
| A ação é **criar ou iniciar algo**, não destrutiva | Excluir ao alcance do polegar é acidente esperando acontecer |

**Não use** quando a tela é um formulário (a ação conclui no fim, e ali ela está visível), quando a
ação depende de seleção prévia, ou quando existe barra de ações fixa no rodapé — dois elementos
disputando a mesma faixa da tela.

### Regras

- **Só no mobile.** `md:hidden` no flutuante, e o botão do cabeçalho continua existindo em todas as
  faixas. No tablet e no desktop o cabeçalho já está visível ou a rolagem é menor.
- **É o mesmo comando do cabeçalho**, com o mesmo destino e o mesmo nome acessível. Dois caminhos
  para a mesma ação, nunca duas ações diferentes.
- **Rótulo visível sempre que couber.** Ícone sozinho obriga a adivinhar; `+` não diz o que será
  criado. Se só couber o ícone, o `aria-label` é obrigatório — ver [icon.md](icon.md).
- **Não cobre conteúdo útil.** A lista recebe um `padding-bottom` do tamanho do botão mais a folga,
  senão o último registro fica permanentemente embaixo dele.
- **Respeita a safe area** do aparelho: `pb-[env(safe-area-inset-bottom)]` no contêiner. Sem isso ele
  encosta na barra de gestos do iOS.
- **Não briga com o toast.** O toast sobe acima do flutuante, nunca por baixo — ver [toast.md](toast.md).
- **Sem animação de entrada, sem pulsar, sem crescer no hover.** Ele já se destaca por posição.
- Alvo de ~44px, `focus-visible` visível contra o conteúdo que passa por baixo, e ordem de foco no
  fim do `<main>` — ele é atalho, não a primeira parada do teclado.

### Markup

```razor
@* No fluxo: visível em todas as faixas, dentro do cabeçalho da página *@
<a asp-action="@nameof(<Controller>.<Acao>)"
   class="hidden w-full sm:w-auto md:inline-flex ...">&lt;Verbo&gt; &lt;objeto&gt;</a>

@* Flutuante: só no mobile, ancorado à viewport *@
<a asp-action="@nameof(<Controller>.<Acao>)"
   class="fixed bottom-4 right-4 z-30 inline-flex items-center gap-2 rounded-full bg-primaria
          px-5 py-3.5 text-body-sm font-medium text-white shadow-lg md:hidden
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria">
    <icon name="&lt;icone&gt;" class="size-5" aria-hidden="true" />
    &lt;Verbo&gt; &lt;objeto&gt;
</a>
```

O contêiner da lista leva `pb-24 md:pb-0` para reservar o espaço que o flutuante ocupa.

`rounded-full` e `shadow-lg` aparecem **aqui e só aqui**: é o único elemento da pasta que de fato
paira sobre o conteúdo, e a sombra é o que separa ele do que passa por baixo. Card estático não tem
sombra — ver [card.md](card.md).

## Markup

### Primário

```razor
<button type="submit"
        class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primaria px-4 py-2.5
               text-body-sm font-medium text-white transition-colors hover:bg-primaria/90
               focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria
               disabled:pointer-events-none disabled:opacity-50 sm:w-auto">
    <icon name="plus" class="size-4" aria-hidden="true" />
    <Ação> <Entidade>
</button>
```

### Secundário

```razor
<button type="button"
        class="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-borda
               bg-superficie px-4 py-2.5 text-body-sm font-medium text-texto transition-colors
               hover:bg-borda/30 focus-visible:outline-2 focus-visible:outline-offset-2
               disabled:pointer-events-none disabled:opacity-50 sm:w-auto">
    Cancelar
</button>
```

### Par de ações — empilha no mobile

```razor
<div class="flex flex-col gap-3 sm:flex-row sm:justify-end">
    <button type="submit" class="w-full sm:w-auto ...">&lt;Verbo&gt; &lt;objeto&gt;</button>
    <a asp-action="&lt;Acao&gt;" class="w-full text-center sm:w-auto ...">Cancelar</a>
</div>
```

A ordem do DOM é a ordem visual: primária primeiro, secundária depois, no mobile e no desktop.
**Não use `flex-col-reverse` para inverter só o visual** — a ordem de tabulação continuaria a do DOM,
e o teclado passaria pela secundária antes da primária que aparece no topo. Ordem visual divergindo
da ordem de foco é defeito de acessibilidade, não detalhe de layout.

### Só ícone

```razor
<button type="button"
        class="inline-flex size-11 items-center justify-center rounded-md text-texto-suave
               transition-colors hover:bg-borda/40 hover:text-texto
               focus-visible:outline-2 focus-visible:outline-offset-2 md:size-9"
        aria-label="<Ação> <Entidade> @item.Identificador">
    <icon name="<icone-lucide>" class="size-5 md:size-4" aria-hidden="true" />
</button>
```

### Carregando

```razor
<button type="submit"
        class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primaria px-4 py-2.5
               text-body-sm font-medium text-white transition-colors hover:bg-primaria/90
               focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria
               disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
        disabled="@Model.EmProcessamento"
        aria-busy="@Model.EmProcessamento.ToString().ToLowerInvariant()">
    @if (Model.EmProcessamento)
    {
        <icon name="loader-circle" class="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true" />
    }
    else
    {
        <icon name="save" class="size-4" aria-hidden="true" />
    }
    <Ação> <Entidade>
</button>

<p role="status" aria-live="polite" class="sr-only">@Model.MensagemDeProgresso</p>
```

O rótulo é o mesmo nos dois ramos — só o ícone troca. É isso que mantém a largura estável e o layout
parado. Quem decide `EmProcessamento` é a ViewModel; a view não deriva estado por cadeia de `if`
sobre dados crus.

## Regras

- **Uma ação primária por tela ou por card.** Duas anulam a hierarquia.
- **Rótulo é verbo + objeto**, no vocabulário do domínio. "Saiba mais" e "Começar" são proibidos.
- **`w-full sm:w-auto` na ação primária**; secundárias empilham abaixo no mobile, nunca encolhem.
- **Alvo de ~44px no mobile**, inclusive em botão só de ícone.
- **Botão só de ícone exige `aria-label` específico**, e o ícone leva `aria-hidden="true"`.
- **Ação vai em `<button>`, navegação em `<a>`.** `<div onclick>` nunca.
- **`rounded-lg`, nunca `rounded-full`.** Sem sombra, sem degradê.
- **Cinco estados sempre**: hover, focus-visible, disabled, carregando e — quando destrutivo —
  confirmação.
- **Carregando desabilita e não muda a largura.**
- **Ícone à esquerda do rótulo**, e só quando ajuda a identificar a ação.
- **Cor por token semântico**, nunca hex nem nome de cor concreta.
- **O conjunto de classes do primário é único no produto.** Variação por feature significa sistema
  base furado — a variante sobe para o partial compartilhado.

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Registro salvo duas vezes | Botão não desabilita durante o envio | `disabled` + `aria-busy` no submit |
| Layout pula ao clicar em salvar | Rótulo trocado por "Salvando…" | Manter o rótulo, trocar só o ícone |
| Leitor de tela anuncia "botão" sem nome | Ícone sozinho sem `aria-label` | `aria-label` no botão |
| Dez botões idênticos numa lista para o teclado | `aria-label` genérico | Incluir o identificador do registro |
| Dois botões sólidos disputando atenção | Duas primárias | Rebaixar uma para secundária |
| Excluir clicado sem querer | Destrutiva ao lado da primária | Separar por posição e exigir confirmação |
| Botão em cápsula no fluxo da página | `rounded-full` fora do flutuante | `rounded-lg` |
| Último registro da lista escondido atrás do flutuante | Falta de `padding-bottom` no contêiner | `pb-24 md:pb-0` na lista |
| Flutuante encostado na barra de gestos do aparelho | Safe area ignorada | `env(safe-area-inset-bottom)` |
| Flutuante visível no desktop cobrindo conteúdo | Falta de `md:hidden` | Flutuante é exclusivo do mobile |
| Dois flutuantes na mesma tela | Primária não definida | Escolher a ação; a outra volta ao cabeçalho |
| Foco invisível ao tabular | `outline: none` sem substituto | `focus-visible:outline-2 outline-offset-2` |
| Botão cinza sem explicação | Permissão negada sem mensagem | Dizer por que está indisponível |
| Botões espremidos lado a lado em 320px | Ausência de empilhamento | `flex-col sm:flex-row` |
| Foco pula para a secundária antes da primária | `flex-col-reverse` invertendo só o visual | Primária primeiro no DOM |
| Ação que troca de página feita em `<button>` | Ação e navegação confundidas | `<a asp-action>` |
| Cada feature com seu próprio botão primário | Classes duplicadas nas views | Extrair para `_Botao.cshtml` |
