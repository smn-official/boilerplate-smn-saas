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

## Checklist antes de entregar

- [ ] Sem overflow horizontal em 320px, 768px, 1024px e 1440px.
- [ ] Tabela extensa com scroll interno no contêiner ou convertida em card.
- [ ] Grade de formulário em uma coluna no mobile.
- [ ] Ação primária em largura total em tela estreita.
- [ ] Nenhuma fonte abaixo da escala para fazer conteúdo caber.
- [ ] Navegação completa por teclado, com foco visível em cada parada.
- [ ] Modal/offcanvas com foco preso e `Esc` funcionando.
- [ ] Contraste verificado em texto, borda e ícone.
- [ ] Toda imagem com `alt` (vazio se decorativa); todo botão de ícone com `aria-label`.
- [ ] Erros de formulário associados por `aria-describedby`.
- [ ] Validado em desktop **e** mobile reais, não só redimensionando a janela.
