---
name: acessibilidade-responsivo
description: Responsividade e acessibilidade — eliminar overflow horizontal, adaptar tabela extensa, colapsar grade de formulário, dimensionar ação primária em tela estreita, garantir foco visível, contraste, aria e navegação por teclado. Use ao criar ou alterar layout, tabela, formulário, modal, menu ou ao revisar uma tela antes de entregar.
agent: frontend-agent
---

# Acessibilidade e Responsivo

Regras não negociáveis. Toda mudança visual é validada em **desktop e mobile** antes de entregar.

## Responsividade

### Overflow horizontal — nunca

A página **nunca** rola na horizontal, em nenhum breakpoint. Causas quase sempre são as mesmas:

| Causa | Correção |
|---|---|
| Largura fixa em px num bloco | Largura fluida com `max-w-*` |
| Tabela larga solta no fluxo | Scroll interno no contêiner ou virar card |
| Texto longo sem quebra (URL, hash) | `break-words` / `truncate` com `title` |
| Imagem sem limite | `max-w-full h-auto` |
| Grade com colunas fixas no mobile | Colapsar para uma coluna |
| Elemento posicionado além da viewport | Reancorar dentro do contêiner |

### Tabela extensa

Duas saídas legítimas, escolhidas pela quantidade de colunas essenciais:

1. **Scroll interno no próprio contêiner** — o `overflow-x-auto` fica no wrapper da tabela, nunca na
   página. O cabeçalho permanece legível e a rolagem é anunciada como região focável.
2. **Virar card no mobile** — cada linha vira um bloco com rótulo e valor empilhados. Preferível
   quando há mais de ~5 colunas relevantes.

```razor
<div class="overflow-x-auto rounded-lg border border-borda" tabindex="0" role="region"
     aria-label="<Entidade>">
    <table class="w-full text-body">
        <caption class="sr-only">Lista de <Entidade></caption>
        <thead>
            <tr>
                <th scope="col" class="text-body-sm font-medium text-left">...</th>
            </tr>
        </thead>
    </table>
</div>
```

Toda tabela tem `<caption>` (pode ser `sr-only`), `<th scope="col">` no cabeçalho e `scope="row"`
quando houver coluna identificadora. Tabela **não** é ferramenta de layout.

### Formulário

- Grade de formulário **colapsa para uma coluna no mobile**; nada de duas colunas espremidas.
- **Ação primária ocupa a largura disponível em telas estreitas**; em desktop volta ao tamanho
  natural.
- Ações secundárias ficam abaixo da primária no mobile, nunca ao lado em botões minúsculos.
- Alvo de toque com no mínimo ~44px de altura efetiva.

```razor
<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
    <div class="flex flex-col gap-1">
        <label for="<campo>" class="text-body-sm font-medium">...</label>
        <input id="<campo>" name="<campo>" class="text-body ..." />
    </div>
</div>

<button type="submit" class="w-full sm:w-auto text-body-sm ...">Salvar</button>
```

### Tipografia

**Tipografia nunca é reduzida abaixo da escala** para fazer conteúdo caber. Se não cabe, reorganize
o layout: quebre em duas linhas, colapse a grade, mova para card, remova decoração. Diminuir a fonte
resolve o pixel e cria o problema de legibilidade.

Em telas estreitas, elementos puramente decorativos são removidos, preservando marca e conteúdo
funcional.

## Acessibilidade

### Semântica antes de aria

A primeira regra do ARIA é não usar ARIA. Elemento nativo já traz papel, foco e teclado prontos.

| Precisa de | Use | Nunca |
|---|---|---|
| Ação na página | `<button type="button">` | `<div onclick>` |
| Navegação | `<a href>` | `<span>` com listener |
| Envio de dados | `<form method="post">` | `<div>` + `fetch` |
| Rótulo de campo | `<label for>` | `placeholder` como rótulo |
| Estrutura | `<nav> <main> <header> <table>` | `<div>` genérico |

### Foco

- **Foco sempre visível.** Nunca `outline: none` sem substituto. Use
  `focus-visible:outline-2 focus-visible:outline-offset-2`.
- Ordem de tabulação segue a ordem visual; sem `tabindex` positivo.
- Modal e offcanvas: foco entra ao abrir, fica preso enquanto aberto, retorna ao gatilho ao fechar,
  e `Esc` fecha.
- Conteúdo revelado por script recebe foco quando for a próxima ação esperada.
- Link "pular para o conteúdo" no início do layout, visível ao receber foco.

### Teclado

A tela inteira é operável sem mouse: `Tab`/`Shift+Tab` para percorrer, `Enter`/`Espaço` para acionar,
`Esc` para fechar sobreposição, setas dentro de menu e lista de opções. Se algo só funciona com
clique ou hover, está quebrado.

## Modal — o componente completo

Modal é o componente onde mais se erra acessibilidade, porque o foco preso é trabalhoso de escrever
à mão. O que segue é o molde copiável; **dropdown, toast, tabs e accordion se resolvem por analogia**
— mesma decisão de elemento nativo, mesmo contrato `data-*`, mesmo retorno de foco.

### A decisão: `<dialog>` nativo, não `div role="dialog"`

Aplique aqui a primeira regra do ARIA. **`<dialog>` aberto com `showModal()` entrega de graça** o que
o `div role="dialog"` exige escrever e manter:

| Comportamento | `<dialog>` + `showModal()` | `div role="dialog"` |
|---|---|---|
| Papel de diálogo e `aria-modal` | Implícito no elemento | `role` + `aria-modal` à mão |
| Foco entra ao abrir | O navegador move | `focus()` manual no primeiro focável |
| **Foco preso enquanto aberto** | **O navegador prende** | Handler de `Tab`/`Shift+Tab` à mão |
| Conteúdo de trás inerte | Implícito (top layer) | `inert` no `<main>` à mão, e desfazer ao fechar |
| `Esc` fecha | Nativo (evento `cancel`) | Handler de `keydown` à mão |
| Backdrop | `::backdrop`, sem elemento extra | `<div>` de overlay + `z-index` |
| Empilhamento sobre qualquer `z-index` | Top layer do navegador | Guerra de `z-index` |

Traduzido em código: a versão nativa dispensa o handler de `Tab`, o handler de `Esc`, o controle de
`inert` e o overlay — **some a parte difícil, que é justamente onde o erro mora**. Sobra o que o
`<dialog>` de fato não resolve sozinho:

| O que `<dialog>` **não** resolve | Providência |
|---|---|
| Retorno do foco ao gatilho ao fechar | Não é garantido em toda versão de navegador — devolva no evento `close` |
| Clique no backdrop fechar | Nativo não fecha; compare `evento.target` com o próprio `<dialog>` |
| Animação de entrada/saída | `display` muda de imediato; anime com `@starting-style` e respeite `prefers-reduced-motion` |
| Rolagem do corpo atrás do modal | Continua rolando em parte dos navegadores; trave no `<body>` se incomodar |
| Rótulo acessível | `aria-labelledby` apontando o título continua sendo seu |

Só escreva `div role="dialog"` quando um requisito concreto impedir o nativo — e então o foco preso
volta a ser sua responsabilidade (ver o final desta seção).

### A marcação — partial Razor

Gatilho e diálogo são irmãos; o gatilho **é um link real** para a página de confirmação, e só vira
botão de modal quando o script assume (ver progressive enhancement, adiante).

```razor
@model <Entidade>ViewModel

<a href="@Url.Action(nameof(<Entidade>Controller.Confirmar), "<Entidade>", new { id = Model.Id })"
   class="text-body-sm underline focus-visible:outline-2 focus-visible:outline-offset-2"
   data-<feature>-abrir-link>Excluir</a>

<button type="button" hidden
        class="w-full sm:w-auto text-body-sm focus-visible:outline-2 focus-visible:outline-offset-2"
        data-<feature>-abrir>Excluir</button>

<dialog class="m-auto w-full max-w-md rounded-lg border border-borda p-6 backdrop:bg-black/50"
        aria-labelledby="titulo-<feature>"
        aria-describedby="descricao-<feature>"
        data-<feature>-dialogo
        data-url-confirmar="@Url.Action(nameof(<Entidade>Controller.Excluir), "<Entidade>")">
    <h2 id="titulo-<feature>" class="text-heading-sm">Excluir <Entidade></h2>
    <p id="descricao-<feature>" class="mt-2 text-body">Esta ação não pode ser desfeita.</p>

    <form method="post" class="mt-6 flex flex-col gap-2 sm:flex-row-reverse" data-<feature>-form>
        @Html.AntiForgeryToken()
        <input type="hidden" name="id" value="@Model.Id" />
        <button type="submit"
                class="w-full sm:w-auto text-body-sm focus-visible:outline-2 focus-visible:outline-offset-2">
            Excluir
        </button>
        <button type="button" formnovalidate
                class="w-full sm:w-auto text-body-sm focus-visible:outline-2 focus-visible:outline-offset-2"
                data-<feature>-cancelar>
            Cancelar
        </button>
    </form>
</dialog>
```

A `action` do formulário **não** é escrita no `.ts`: chega por `data-url-confirmar`, gerada com
`Url.Action` e `nameof`. O antiforgery token é renderizado pelo Razor e enviado no `POST` real.

### O TypeScript — tudo que sobra

```ts
function inicializarModalDeConfirmacao(): void {
    const dialogo = document.querySelector<HTMLDialogElement>("[data-<feature>-dialogo]");
    const gatilho = document.querySelector<HTMLButtonElement>("[data-<feature>-abrir]");
    const link = document.querySelector<HTMLAnchorElement>("[data-<feature>-abrir-link]");

    if (dialogo === null || gatilho === null || link === null) {
        return;
    }

    const urlConfirmar = dialogo.dataset.urlConfirmar;
    const formulario = dialogo.querySelector<HTMLFormElement>("[data-<feature>-form]");
    const cancelar = dialogo.querySelector<HTMLButtonElement>("[data-<feature>-cancelar]");

    if (urlConfirmar === undefined || formulario === null || cancelar === null) {
        return;
    }

    formulario.action = urlConfirmar;
    link.hidden = true;
    gatilho.hidden = false;

    gatilho.addEventListener("click", () => {
        dialogo.showModal();
    });

    cancelar.addEventListener("click", () => {
        dialogo.close();
    });

    dialogo.addEventListener("close", () => {
        gatilho.focus();
    });

    dialogo.addEventListener("click", (evento: MouseEvent) => {
        if (evento.target === dialogo) {
            dialogo.close();
        }
    });
}

inicializarModalDeConfirmacao();
```

Note o que **não** está aqui: nenhum handler de `Tab`, nenhum handler de `Esc`, nenhum `inert`,
nenhum overlay. `showModal()` cobre os quatro. O `return` mora dentro da função — no topo do módulo
seria erro de sintaxe.

### Progressive enhancement

**Sem JavaScript o modal não abre — e isso é aceitável, desde que a ação continue existindo.** O
padrão é o par acima: o link é a ação real e o botão é o incremento.

| Estado | O que o usuário vê | Resultado |
|---|---|---|
| Sem JS | O link `Excluir` (o botão nasce `hidden`) | Navega para a página de confirmação real, que tem o mesmo `POST` |
| Com JS | O botão `Excluir` (o script esconde o link) | Abre o modal; o `POST` é o mesmo |

O inverso — modal que nasce visível e é escondido por script — deixa o conteúdo piscando na tela e
quebra sem JS. **O estado inicial correto vem do Razor**, nunca de uma classe que o script remove.

### Foco preso à mão — só quando o nativo não servir

Se um requisito concreto forçar `div role="dialog"`, o foco preso volta a ser seu. A regra é
circular a tabulação: `Tab` no último focável vai para o primeiro; `Shift+Tab` no primeiro vai para o
último. Este módulo vive em `Features/Shared/Scripts`.

```ts
const FOCAVEIS = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
].join(",");

function prenderFoco(painel: HTMLElement, evento: KeyboardEvent): void {
    if (evento.key !== "Tab") {
        return;
    }

    const focaveis = Array.from(painel.querySelectorAll<HTMLElement>(FOCAVEIS));
    const primeiro = focaveis.at(0);
    const ultimo = focaveis.at(-1);

    if (primeiro === undefined || ultimo === undefined) {
        return;
    }

    if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
        return;
    }

    if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
    }
}

export { prenderFoco };
```

Isso é só o `Tab`. Ainda faltariam `Esc`, `inert` no conteúdo de trás, o overlay e o foco inicial —
todos já resolvidos por `showModal()`. É o argumento a favor do nativo, escrito em código.

### Por analogia

| Componente | Elemento e atributos | Foco |
|---|---|---|
| Dropdown / menu | `<button aria-expanded aria-controls>` + lista | Setas navegam; `Esc` fecha e devolve ao gatilho |
| Toast | `role="status"` (ou `role="alert"` para erro) | **Não** rouba foco; anuncia e não interrompe |
| Tabs | `role="tablist"` + `aria-selected` | Setas trocam a aba; `Tab` sai do conjunto |
| Accordion | `<button aria-expanded>` + região | Foco fica no gatilho; nada de prender |

❌ Toast que recebe foco e interrompe o que se digitava.
✅ Toast em `role="status"`, lido pelo leitor de tela sem mover o foco.

### Contraste e cor

- Texto normal ≥ 4.5:1 contra o fundo; texto grande (≥ 24px ou 19px em 700) ≥ 3:1.
- Borda, ícone e indicador de estado ≥ 3:1.
- **Cor nunca é o único portador de informação** — acompanhe com ícone, texto ou padrão.
- Estado de erro tem texto associado ao campo, não só borda vermelha.
- Respeite `prefers-reduced-motion` desligando animação não essencial.

### Rótulos e anúncios

| Situação | Marcação |
|---|---|
| Botão só com ícone | `aria-label="<Acao>"` |
| Ícone decorativo | `aria-hidden="true"` |
| Campo com erro | `aria-invalid="true"` + `aria-describedby` apontando a mensagem |
| Campo obrigatório | `required` nativo, e não só asterisco visual |
| Mensagem dinâmica | `role="status"` (`aria-live="polite"`) ou `role="alert"` para erro |
| Bloco expansível | `aria-expanded` no gatilho + `aria-controls` |
| Texto só para leitor | classe `sr-only` |

Não coloque `aria-label` em elemento que já tem texto visível — o rótulo acessível passa a divergir
do que se vê.

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Foco vai para o topo da página ao fechar o modal | Ninguém devolveu o foco ao gatilho | `focus()` no gatilho dentro do evento `close` |
| `Tab` escapa do modal e percorre a página atrás | `div role="dialog"` sem foco preso | `<dialog>` + `showModal()`, que prende sozinho |
| Modal aparece atrás do cabeçalho fixo | Guerra de `z-index` num overlay próprio | `<dialog>` sobe para o top layer do navegador |
| `Esc` não fecha a sobreposição | Handler ausente no `div role="dialog"` | `<dialog>`, que emite `cancel` nativo |
| Modal pisca na tela ao carregar sem JS | Nasce visível e o script esconde | Estado inicial correto no Razor |
| Leitor de tela anuncia o modal sem título | Falta `aria-labelledby` | Apontar o `id` do `<h2>` |
| Toast interrompe a digitação | Recebeu foco | `role="status"`, sem mover o foco |

## Checklist antes de entregar

- [ ] Sem overflow horizontal em 320px, 768px, 1024px e 1440px.
- [ ] Tabela extensa com scroll interno no contêiner ou convertida em card.
- [ ] Grade de formulário em uma coluna no mobile.
- [ ] Ação primária em largura total em tela estreita.
- [ ] Nenhuma fonte abaixo da escala para fazer conteúdo caber.
- [ ] Navegação completa por teclado, com foco visível em cada parada.
- [ ] Modal/offcanvas com foco preso e `Esc` funcionando.
- [ ] Sobreposição usa `<dialog>` + `showModal()`; `div role="dialog"` só com motivo registrado.
- [ ] Foco retorna ao gatilho ao fechar a sobreposição.
- [ ] Ação do modal continua alcançável sem JavaScript (link para página real).
- [ ] Contraste verificado em texto, borda e ícone.
- [ ] Toda imagem com `alt` (vazio se decorativa); todo botão de ícone com `aria-label`.
- [ ] Erros de formulário associados por `aria-describedby`.
- [ ] Validado em desktop **e** mobile reais, não só redimensionando a janela.
