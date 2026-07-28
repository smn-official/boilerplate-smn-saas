# Select

**O `<select>` nativo é o padrão do projeto.** Ele já traz papel, foco, navegação por teclado, busca
por digitação e o seletor em roda do mobile — tudo isso sem uma linha de JavaScript e sem manutenção.
Trocar isso por um dropdown desenhado é assumir um custo permanente para recuperar o que já existia.

Select serve para **escolher um valor de uma lista fechada e conhecida**. Se o usuário escreve o
valor, é [input.md](input.md). Se escolhe mais de um, veja [multi-select.md](multi-select.md) — e
leia primeiro a seção de alternativas de lá, porque quase sempre há saída mais barata.

## Quando usar, quando não

| Situação | Componente |
|---|---|
| 5 a ~30 opções, uma escolha | `<select>` nativo |
| 2 a 4 opções, todas visíveis ajudam a decidir | Grupo de `<input type="radio">` com `<fieldset>` e `<legend>` |
| Exatamente 2 opções mutuamente exclusivas e simétricas | Radio; se for liga/desliga, `<input type="checkbox">` |
| Mais de ~30 opções, o usuário sabe o que procura | Campo com busca no servidor — ver [input.md](input.md) |
| Lista aberta: o usuário pode precisar de valor que não existe | Input com sugestões (`<datalist>`) ou input + cadastro |
| Escolha múltipla real | [multi-select.md](multi-select.md) |

Duas fronteiras que se erram com frequência:

- **Poucas opções não merecem select.** Com três opções, o select esconde duas e cobra dois cliques.
  Radio mostra tudo e decide em um toque.
- **Muitas opções não cabem em select.** Uma lista de centenas obriga a rolar um painel nativo sem
  filtro. Aí o componente certo é busca, não select maior.

## Opção padrão — filtro e formulário são diferentes

Esta é a distinção que mais causa bug de dado errado gravado. O primeiro `<option>` significa coisas
opostas em cada contexto.

| Contexto | Primeira opção | `value` | Semântica |
|---|---|---|---|
| **Filtro** | `Todos os <Entidade>` | `""` (vazio) | Estado sem filtro — é um resultado válido e é o padrão |
| **Formulário obrigatório** | `Selecione o <Campo>` | `""` + `disabled` | Não é resposta; existe só para não pré-selecionar nada |

No filtro, "Todos" é uma escolha legítima: o usuário quer ver tudo, e voltar a esse valor é como se
limpa o filtro. Ele fica selecionado ao abrir a tela, e o `value=""` faz o parâmetro sumir da query
string — a URL fica limpa quando não há filtro aplicado.

No formulário obrigatório, o placeholder **não pode ser selecionável de volta**: leva `disabled` (e
`selected` no carregamento), de modo que o usuário não consiga voltar ao "nada escolhido" depois de
escolher. Combinado com `required`, o navegador bloqueia o envio sem seleção.

O erro clássico é usar `Selecione…` num filtro, o que sugere que a tela está incompleta, ou usar
`Todos` num formulário, o que grava um valor sem sentido no banco.

**Nunca pré-selecione a primeira opção real** de um campo obrigatório só para "já ter algo". Isso
transforma descuido em dado errado — e o usuário nunca vê o campo, porque ele parece preenchido.

## Nome acessível sem rótulo visível

Barra de filtro compacta não mostra rótulo — mas o campo precisa de nome. Sem ele, o leitor de tela
anuncia "caixa de combinação" e o usuário não sabe o que está filtrando.

| Situação | Solução |
|---|---|
| Formulário | `<label for>` visível, sempre |
| Barra de filtro | `<label for>` com classe `sr-only` — **preferida**: some da tela, não da árvore |
| Sem elemento onde ancorar o label | `aria-label` no `<select>` |

Preferir `sr-only` a `aria-label` tem um motivo prático: o texto fica no markup, é traduzido junto
com o resto da tela e o rótulo continua clicável se um dia virar visível. `aria-label` é o recurso
para quando não há alternativa.

A opção "Todos os <Entidade>" **não** substitui o rótulo. Ela diz o valor atual, não o que o campo
filtra. Ver [`acessibilidade-responsivo`](../../.ai/skills/acessibilidade-responsivo/SKILL.md).

## Comportamento nas três faixas

| Faixa | Barra de filtro | Formulário |
|---|---|---|
| Mobile 320–767 | **Empilhados, cada select em largura total**; ordem: busca, depois os filtros | Uma coluna |
| Tablet 768–1023 | Lado a lado se couberem sem truncar o texto da opção; senão, empilhados | Uma ou duas colunas |
| Desktop 1024+ | Lado a lado, larguras proporcionais ao maior texto de opção | Duas colunas ou mais |

- **Largura nunca em px.** `w-full` na base, `sm:w-auto` ou `sm:max-w-*` a partir do tablet. Select
  com `w-[200px]` é a causa recorrente de rolagem horizontal em 320px.
- **Alvo de toque ~44px**, obtido por `py-2.5` sobre `text-body` — nunca por `h-[44px]`.
- **Texto de opção longo não encolhe a fonte.** Se não cabe, encurte o texto da opção ou dê mais
  largura ao controle. Tipografia não desce da escala para caber.
- **A seta é do componente, não do sistema.** Com `appearance-none` some a seta nativa e é preciso
  desenhar o chevron; sem `appearance-none`, cada navegador põe a sua e a altura varia. Escolha uma
  das duas e mantenha em todo o produto.
- **O painel de opções é do sistema operacional.** No mobile ele vira roda ou folha nativa, já
  acessível e do tamanho certo — mais uma razão para não reimplementar.

## Por que não reimplementar como dropdown custom

Um `<div>` com lista escondida parece simples até a lista de tudo que o nativo dava de graça e passa
a ser sua obrigação:

| O que o nativo resolve | O que o custom obriga a implementar |
|---|---|
| Papel e estado anunciados | `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant` |
| Teclado | Setas, `Home`/`End`, `Enter`, `Esc`, `Tab` que fecha e move |
| Busca por digitação | Pular para a opção pelas primeiras letras |
| Foco | Entrar no painel, voltar ao gatilho ao fechar, não escapar |
| Mobile | Roda/folha nativa em vez de um painel de 200px com scroll apertado |
| Posicionamento | Abrir para cima quando não há espaço abaixo; acompanhar scroll e resize |
| Formulário | Valor enviado no `POST`, `required` e restauração pelo histórico |
| Zoom e alto contraste | Comportamento já testado pelo navegador |

São oito frentes para ganhar controle visual sobre um chevron. **Só reimplemente quando houver
requisito que o nativo não atende** — busca dentro da lista, opção com duas linhas de conteúdo,
seleção múltipla. Nesse caso o componente é outro, e as regras estão em
[multi-select.md](multi-select.md).

Estética não é requisito: o nativo aceita borda, raio, cor de token e chevron próprio. Isso cobre a
quase totalidade dos casos.

## Markup

### Select em formulário

```razor
<div class="flex flex-col gap-1">
    <label for="<campo>" class="text-body-sm font-medium text-texto">
        <Campo>
    </label>
    <select id="<campo>"
            name="<campo>"
            required
            aria-describedby="<campo>-ajuda"
            class="w-full appearance-none rounded-lg border border-borda bg-superficie px-3 py-2.5
                   pr-9 text-body text-texto
                   focus-visible:outline-2 focus-visible:outline-offset-2
                   focus-visible:outline-primaria
                   disabled:pointer-events-none disabled:opacity-50">
        <option value="" disabled selected>Selecione o <Campo></option>
        @foreach (var opcao in Model.Opcoes)
        {
            <option value="@opcao.Valor" selected="@(opcao.Valor == Model.<Campo>)">
                @opcao.Texto
            </option>
        }
    </select>
    <p id="<campo>-ajuda" class="text-caption text-texto-suave">
        <Consequência da escolha, quando não for óbvia>
    </p>
</div>
```

O `pr-9` reserva o espaço do chevron desenhado sobre o controle (`absolute`, `pointer-events-none`,
`aria-hidden="true"`), no mesmo padrão do ícone de busca em [input.md](input.md). O ícone vem do
Lucide, conforme [icon.md](icon.md).

### Select como filtro

```razor
<form method="get" class="flex flex-col gap-3 sm:flex-row sm:items-center">
    @* campo de busca — ver input.md *@

    <div class="relative w-full sm:w-auto">
        <label for="filtro-<campo>" class="sr-only">Filtrar por <Campo></label>
        <select id="filtro-<campo>"
                name="<campo>"
                class="w-full appearance-none rounded-lg border border-borda bg-superficie
                       py-2.5 pl-3 pr-9 text-body text-texto
                       focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto">
            <option value="">Todos os <Entidade></option>
            @foreach (var opcao in Model.Opcoes<Campo>)
            {
                <option value="@opcao.Valor" selected="@(opcao.Valor == Model.<Campo>Selecionado)">
                    @opcao.Texto
                </option>
            }
        </select>
        <icon name="chevron-down"
              class="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2
                     text-texto-suave"
              aria-hidden="true" />
    </div>

    <noscript>
        <button type="submit"
                class="w-full rounded-lg border border-borda px-4 py-2.5 text-body-sm sm:w-auto">
            Filtrar
        </button>
    </noscript>
</form>
```

Sem JS o `<noscript>` garante o envio. Com JS, o script escuta `change` e submete o formulário — o
`<form method="get">` continua sendo a fonte da verdade, e a URL guarda o filtro, conforme
[`razor-interop`](../../.ai/skills/razor-interop/SKILL.md).

**Nunca troque o `<form>` por `fetch` obrigatório.** Sem o formulário real, quem está sem JS fica com
uma barra de filtro que não filtra.

## Estados obrigatórios

| Estado | O que renderizar |
|---|---|
| Carregando opções | Select `disabled` com uma única opção "Carregando…"; nunca select vazio e habilitado |
| Sem opções | Select `disabled` e um texto dizendo **por que** está vazio e o que fazer para haver opção |
| Erro ao carregar | Mensagem com a causa e ação de tentar de novo; não silenciar em lista vazia |
| Desabilitado | `disabled` acompanhado da razão em texto |
| Sem permissão | Não renderizar o filtro que o usuário não pode usar, ou explicar a restrição |

Lista vazia sem explicação é o pior caso: o usuário abre, não vê nada e conclui que a tela está
quebrada. "Nenhum <Entidade> cadastrado ainda" já resolve.

## Regras

- **`<select>` nativo por padrão.** Dropdown custom exige requisito que o nativo não atende.
- **Todo select tem nome acessível** — `<label for>` visível, `sr-only` na barra de filtro, ou
  `aria-label` em último caso.
- **Filtro usa `Todos os <Entidade>` com `value=""`;** formulário obrigatório usa
  `Selecione o <Campo>` com `disabled`.
- **Nunca pré-selecionar opção real** em campo obrigatório.
- **`required` nativo** quando o campo é obrigatório, e erro conforme [input.md](input.md):
  `role="alert"`, `aria-invalid`, texto além da cor.
- **Largura fluida:** `w-full` na base, `sm:w-auto` acima. Nada de px.
- **Alvo de toque ~44px** por padding, nunca por altura fixa.
- **`appearance-none` obriga a desenhar o chevron**, sempre `aria-hidden="true"`.
- **O texto da opção é o vocabulário do domínio** — o termo que o usuário fala, não o do banco.
- **A ViewModel entrega as opções prontas**, com o selecionado já resolvido. A view não filtra nem
  ordena lista.
- **Filtro vai em `GET`**, para caber na URL e sobreviver ao Voltar.

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Grava valor errado sem o usuário perceber | Primeira opção real pré-selecionada | `<option value="" disabled selected>` |
| Filtro parece incompleto ao abrir | `Selecione…` usado como estado sem filtro | `Todos os <Entidade>` com `value=""` |
| Query string com parâmetro vazio | Opção padrão com `value` diferente de `""` | `value=""` na opção "Todos" |
| Leitor de tela anuncia campo sem nome | Filtro sem rótulo | `<label>` `sr-only` ou `aria-label` |
| Rolagem horizontal em 320px | `w-[…px]` no select | `w-full` e `sm:w-auto` |
| Altura diferente entre navegadores | `appearance` do sistema misturada com padding próprio | `appearance-none` + padding do projeto |
| Seta duplicada | `appearance-none` ausente com chevron desenhado por cima | Aplicar `appearance-none` |
| Texto da opção cortado | Largura fixa menor que a maior opção | Largura fluida ou texto de opção mais curto |
| Filtro não filtra sem JS | Barra sem `<form method="get">` | Formulário real; script apenas submete no `change` |
| Painel minúsculo com scroll no mobile | Dropdown custom reimplementado | Voltar ao nativo, que usa a folha do sistema |
| Nenhuma opção e nenhuma explicação | Estado vazio não projetado | Select `disabled` + texto com a causa |
