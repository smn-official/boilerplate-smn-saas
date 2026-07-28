# Multi-select

**Este é o componente mais caro da pasta.** Ele existe por um motivo só: o `<select multiple>` nativo
é péssimo de usar. Exige `Ctrl`+clique para escolher itens não adjacentes, perde a seleção inteira
com um clique errado, mostra poucas linhas de cada vez e no mobile vira uma lista quase inoperável.

Tudo o que [select.md](select.md) diz sobre não reimplementar o nativo continua valendo — **este é a
exceção, e só ela**. Como a exceção obriga a reconstruir foco, teclado, leitor de tela, posicionamento
e comportamento mobile na mão, o primeiro passo é sempre verificar se a seleção múltipla é real.

## Antes de usar, considere as alternativas

| Situação | Solução mais barata | Por quê |
|---|---|---|
| Até ~7 opções | Grupo de `<input type="checkbox">` em `<fieldset>` com `<legend>` | Nativo, tudo visível, zero JS, funciona sem script |
| Dois eixos independentes (`<Campo A>` e `<Campo B>`) | Dois selects simples lado a lado | O usuário raramente combina vários valores do mesmo eixo |
| O usuário quase sempre escolhe um só | `<select>` simples | Multi-select cobra dois cliques a mais de todo mundo por um caso raro |
| Muitas opções, o usuário sabe o nome | Campo de busca com resultados | Rolar 200 checkboxes não é escolher |
| Filtro que aceita valores acumuláveis | Filtros aplicados como lista removível abaixo da barra | Mostra o que está ativo sem esconder nada num painel |

**Use multi-select apenas quando as três forem verdadeiras:** a seleção múltipla é o caso comum, não
a exceção; há opções demais para caber em checkboxes visíveis; e o usuário precisa ver quantos itens
selecionou sem abrir nada.

Se qualquer uma falhar, a alternativa acima é melhor — mais rápida de construir, impossível de
quebrar em acessibilidade e mais fácil de entender.

## Anatomia

| Parte | Elemento | Papel |
|---|---|---|
| Rótulo | `<label>` ou `<span id>` referenciado por `aria-labelledby` | Nomeia o campo; `sr-only` em barra compacta |
| Gatilho | `<button type="button">` | Abre o painel e **resume a seleção atual** |
| Painel | `<div>` com a lista | Contém busca, opções e ações |
| Busca interna | `<input type="search">` | Aparece a partir de ~10 opções; abaixo disso é ruído |
| Opção | `<label>` + `<input type="checkbox">` | Cada opção é um checkbox real, com rótulo clicável |
| Ações | `Limpar` e `Aplicar` | `Aplicar` só existe se a seleção não for aplicada na hora |
| Anúncio | Região `aria-live="polite"` | Informa a mudança de seleção a quem não vê o painel |

```text
<Campo>                              ← label (sr-only na barra de filtro)
┌────────────────────────────┐
│ 3 selecionados          ⌄  │       ← gatilho: resumo + chevron
└────────────────────────────┘
┌────────────────────────────┐
│ Buscar <Campo>             │       ← busca interna (≥ ~10 opções)
│ ☑ <Opção A>                │
│ ☑ <Opção B>                │
│ ☐ <Opção C>                │
│ Limpar            Aplicar  │
└────────────────────────────┘
```

### O resumo no gatilho

O gatilho é a única coisa visível com o painel fechado, então ele carrega a informação inteira:

| Seleção | Texto do gatilho |
|---|---|
| Nenhuma, em filtro | `Todos os <Entidade>` — mesmo estado sem filtro de [select.md](select.md) |
| Nenhuma, em formulário | `Selecione <Campo>` |
| Um item | O nome do item, não "1 selecionado" |
| Dois ou mais | `<n> selecionados` |

Com um item, mostrar o nome vale mais que a contagem: o usuário confere a escolha sem abrir. Com
dois ou mais, a contagem é mais legível que uma lista truncada no meio de uma palavra.

## Acessibilidade — obrigatória, não opcional

O nativo dava isto de graça. Reimplementando, cada linha vira responsabilidade sua. Sem os itens
abaixo, o componente **não é entregue**.

| Requisito | Marcação / comportamento |
|---|---|
| Estado do painel | `aria-expanded="true|false"` e `aria-controls="<id do painel>"` no gatilho |
| Nome do campo | `aria-labelledby` apontando o rótulo, ou `aria-label` quando não houver rótulo |
| Lista de opções | Checkboxes reais em `<label>`; não invente `role="listbox"` sobre `<div>` |
| Agrupamento | `<fieldset>` com `<legend>` `sr-only` dentro do painel |
| Setas | `↑`/`↓` percorrem as opções; `Home`/`End` vão à primeira e à última |
| Acionar | `Espaço` e `Enter` marcam e desmarcam a opção focada |
| Fechar | `Esc` fecha o painel **e devolve o foco ao gatilho** |
| Foco preso | Enquanto aberto, `Tab` circula dentro do painel |
| Clique fora | Fecha o painel, com o mesmo retorno de foco |
| Anúncio | `aria-live="polite"` diz `<n> selecionados` a cada mudança |
| Foco visível | Cada parada com `focus-visible:outline-2 focus-visible:outline-offset-2` |

Duas armadilhas específicas:

- **Retorno de foco.** Fechar o painel sem devolver o foco joga o usuário de teclado no início da
  página. É o defeito mais comum e o mais fácil de reproduzir: abra, aperte `Esc`, aperte `Tab`.
- **`aria-live` que tagarela.** A região anuncia o **resumo** (`3 selecionados`), não cada marcação
  individual. Anunciar tudo torna o componente insuportável no leitor de tela.

O checklist geral está em
[`acessibilidade-responsivo`](../../.ai/skills/acessibilidade-responsivo/SKILL.md), que é normativa
também aqui — inclusive quanto a foco preso e `Esc`, iguais aos de modal.

## Comportamento nas três faixas

O erro típico é reaproveitar no celular o mesmo painel ancorado do desktop: um retângulo de 200px com
scroll apertado, sobrando espaço de tela ao redor e alvos de toque grudados.

| Faixa | Gatilho | Painel | Ações |
|---|---|---|---|
| Mobile 320–767 | Largura total | Ocupa a largura do gatilho. Se a lista passar de ~10 opções ou da metade da altura da tela, **vira folha ancorada na base**, com `Aplicar` fixo | `Limpar` e `Aplicar` em largura total, empilhados, ~44px cada |
| Tablet 768–1023 | Largura do contêiner ou natural | Ancorado no gatilho, largura ≥ a dele | Lado a lado no rodapé do painel |
| Desktop 1024+ | Natural, na barra de filtro | Ancorado, com `max-h-*` e scroll interno | Lado a lado |

- **Largura nunca em px.** `w-full` na base, `sm:w-auto` acima — igual ao select.
- **Altura do painel por `max-h-*` com scroll interno**, nunca uma lista solta que empurra a página.
- **Abrir para cima quando não houver espaço abaixo.** No desktop é obrigatório: painel que nasce
  cortado pela borda da janela é defeito.
- **Alvo de toque de ~44px por opção no mobile.** Checkbox de 16px com `py-1` é o clássico erro de
  seleção errada no toque; a área clicável é o `<label>` inteiro, não só a caixinha.
- **`Aplicar` sempre alcançável.** Com lista longa no mobile, ele fica fixo no rodapé da folha — não
  atrás de 40 opções de rolagem.

## Progressive enhancement

Sem JS, o painel nunca abre. Um `<button>` que não faz nada é uma tela quebrada, então o estado
inicial do markup precisa ser utilizável sozinho — a regra de
[`razor-interop`](../../.ai/skills/razor-interop/SKILL.md): **o script melhora, não habilita.**

A estratégia é inverter a ordem: o markup nasce como um `<fieldset>` de checkboxes visíveis dentro de
um `<form method="get">` real. O TypeScript, ao inicializar, **colapsa** esse fieldset e insere o
gatilho e o painel, movendo os mesmos checkboxes para dentro.

| Sem JS | Com JS |
|---|---|
| Checkboxes visíveis no `<fieldset>` | Fieldset colapsado dentro do painel |
| Botão `Filtrar` do `<noscript>` envia o `GET` | `change` aplica, ou `Aplicar` submete |
| Seleção viaja no formulário | Os mesmos `name`/`value` viajam — nada muda no servidor |

Assim os valores enviados são idênticos nos dois caminhos, e o controller não sabe se havia JS. O
inverso — painel oculto por classe que só o script revela — deixa quem está sem JS sem nenhuma forma
de escolher, e está proibido.

## Estados obrigatórios

| Estado | O que renderizar |
|---|---|
| Carregando opções | Gatilho `disabled` com texto `Carregando <Campo>…`; painel não abre vazio |
| Sem opções | Painel com frase dizendo **por que** não há opção e o que fazer; `Aplicar` desabilitado |
| Busca sem resultado | `Nenhuma opção corresponde a "<termo>"` **preservando** as marcadas, com ação de limpar a busca |
| Erro ao carregar | Causa concreta e botão de tentar novamente dentro do painel; nunca lista vazia silenciosa |
| Sem permissão | Não renderizar o filtro inacessível, ou explicar a restrição em texto |

Ponto crítico: **a busca interna filtra a exibição, não a seleção.** Item marcado que sai da lista
pelo termo digitado continua selecionado e continua contando no resumo. Perder seleção ao digitar é o
bug mais frustrante deste componente.

Os quatro estados são exigidos por
[.ai/docs/aparencia-generica.md](../../.ai/docs/aparencia-generica.md).

## Markup

```razor
<div data-multiselect-<campo>
     data-url-opcoes="@Url.Action(nameof(<Entidade>Controller.Opcoes), "<Entidade>")"
     data-aplicar-ao-mudar="false"
     data-rotulo-vazio="Todos os <Entidade>"
     data-rotulo-plural="selecionados"
     class="relative w-full sm:w-auto">

    <span id="<campo>-rotulo" class="sr-only">Filtrar por <Campo></span>

    <button type="button"
            data-multiselect-gatilho
            hidden
            aria-expanded="false"
            aria-controls="<campo>-painel"
            aria-labelledby="<campo>-rotulo <campo>-resumo"
            class="flex w-full items-center justify-between gap-2 rounded-lg border border-borda
                   bg-superficie py-2.5 pl-3 pr-3 text-body text-texto
                   focus-visible:outline-2 focus-visible:outline-offset-2
                   focus-visible:outline-primaria
                   disabled:pointer-events-none disabled:opacity-50 sm:w-auto">
        <span id="<campo>-resumo" data-multiselect-resumo>Todos os <Entidade></span>
        <icon name="chevron-down" class="size-4 shrink-0 text-texto-suave" aria-hidden="true" />
    </button>

    <div id="<campo>-painel"
         data-multiselect-painel
         class="z-10 mt-1 w-full rounded-lg border border-borda bg-superficie p-2
                sm:absolute sm:left-0 sm:top-full sm:w-72">

        <fieldset data-multiselect-opcoes class="max-h-72 overflow-y-auto">
            <legend class="sr-only"><Campo></legend>
            @foreach (var opcao in Model.Opcoes<Campo>)
            {
                <label class="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2
                              text-body text-texto hover:bg-borda/30">
                    <input type="checkbox"
                           name="<campo>"
                           value="@opcao.Valor"
                           checked="@opcao.Selecionada"
                           class="size-4 shrink-0 rounded border-borda
                                  focus-visible:outline-2 focus-visible:outline-offset-2" />
                    <span>@opcao.Texto</span>
                </label>
            }
        </fieldset>

        <div class="mt-2 flex flex-col gap-2 border-t border-borda pt-2 sm:flex-row
                    sm:justify-end">
            <button type="button" data-multiselect-limpar
                    class="w-full rounded-lg px-4 py-2.5 text-body-sm text-texto-suave
                           focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto">
                Limpar
            </button>
            <button type="submit"
                    class="w-full rounded-lg bg-primaria px-4 py-2.5 text-body-sm font-medium
                           focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto">
                Aplicar
            </button>
        </div>
    </div>

    <p data-multiselect-anuncio aria-live="polite" class="sr-only"></p>
</div>
```

Leitura do markup:

- O `<button>` nasce com `hidden` e o painel nasce **aberto**. Sem JS o usuário vê os checkboxes e o
  botão `Aplicar`, que submete o `<form method="get">` ao redor. Com JS, o script remove o `hidden`
  do gatilho, colapsa o painel e passa a controlar `aria-expanded`.
- `aria-labelledby` combina rótulo e resumo: o leitor anuncia `Filtrar por <Campo>, 3 selecionados`.
- Cada opção é `<label>` envolvendo o checkbox — o rótulo inteiro é clicável, e `min-h-11` entrega os
  ~44px de alvo.
- Todo dado e toda URL chegam por `data-*`; nada literal no `.ts`, conforme
  [`razor-interop`](../../.ai/skills/razor-interop/SKILL.md).

O TypeScript lê o contrato pelo `dataset`:

```ts
const raiz = document.querySelector<HTMLElement>("[data-multiselect-<campo>]");

if (raiz === null) {
    return;
}

const aplicarAoMudar = raiz.dataset.aplicarAoMudar === "true";
const rotuloVazio = raiz.dataset.rotuloVazio ?? "";
```

## Aplicar na hora ou no botão

`data-aplicar-ao-mudar` decide, e a escolha não é estética:

| Valor | Comportamento | Quando |
|---|---|---|
| `false` | A seleção só vale ao clicar `Aplicar` | Filtro que recarrega lista; evita uma requisição por clique |
| `true` | Cada marcação já aplica | Poucas opções e resposta instantânea; aí `Aplicar` some e sobra `Limpar` |

Nunca ofereça `Aplicar` e também aplicar a cada clique: o botão passa a não fazer nada e o usuário
deixa de confiar nele.

## Regras

- **Só use se a seleção múltipla for real.** Checkbox visível e filtros separados vêm antes.
- **A opção é `<input type="checkbox">` de verdade**, dentro de `<label>`. Nada de `<div>` com
  `role` inventado.
- **`aria-expanded` e `aria-controls` no gatilho**, sincronizados com o painel.
- **`Esc` fecha e devolve o foco ao gatilho.** Clique fora idem.
- **Setas, `Home`/`End`, `Espaço` e `Enter` funcionam** — teclado não é opcional.
- **`aria-live="polite"` anuncia o resumo**, nunca cada marcação.
- **O resumo mostra o nome quando há um item** e a contagem a partir de dois.
- **Estado sem seleção em filtro é `Todos os <Entidade>`**, coerente com [select.md](select.md).
- **Busca interna filtra a exibição, jamais a seleção.**
- **Painel com `max-h-*` e scroll interno**; folha na base no mobile quando a lista for longa.
- **Alvo de ~44px por opção no mobile**, com a área clicável no `<label>` inteiro.
- **Sem JS a tela continua utilizável** — checkboxes visíveis dentro de `<form method="get">`.
- **A ViewModel entrega as opções com `Selecionada` resolvido.** A view não calcula seleção.
- **O ícone é do Lucide e é decorativo** — `aria-hidden="true"`, ver [icon.md](icon.md).

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Sem JS não dá para escolher nada | Painel oculto por classe, revelado só pelo script | Nascer aberto; o script colapsa |
| `Tab` volta ao topo da página após fechar | Foco não devolvido ao gatilho | Retornar o foco no `Esc` e no clique fora |
| Leitor de tela não diz se está aberto | `aria-expanded` ausente ou dessincronizado | Atualizar a cada abertura e fechamento |
| Leitor tagarela a cada clique | `aria-live` anunciando opção por opção | Anunciar só o resumo |
| Seleção some ao digitar na busca | Busca filtrando a seleção, não a exibição | Filtrar apenas a exibição |
| Usuário marca a opção errada no toque | Alvos grudados, alvo menor que 44px | `min-h-11` e área clicável no `<label>` |
| Painel cortado pela borda da janela | Posição fixa sem checar espaço | Abrir para cima quando faltar espaço abaixo |
| `Aplicar` inalcançável no mobile | Botão após uma lista longa e rolável | Folha na base com ação fixa no rodapé |
| Uma requisição por clique | `Aplicar` existindo junto com aplicar ao mudar | Escolher um dos dois modos |
| Filtro perdido no Voltar | Seleção enviada por `POST` ou só via `fetch` | `<form method="get">`, seleção na URL |
| Gatilho anunciado sem nome | Sem `aria-labelledby` nem `aria-label` | Rótulo `sr-only` referenciado pelo gatilho |
| Painel abre vazio enquanto carrega | Estado de carregamento não projetado | Gatilho `disabled` com `Carregando <Campo>…` |
