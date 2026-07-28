# Input

Campo de entrada é onde o usuário **escreve o que só ele sabe**. Se o valor vem de uma lista fechada,
não é input — é [select.md](select.md). Se o usuário escolhe vários de uma lista, é
[multi-select.md](multi-select.md).

O componente inteiro é o conjunto rótulo + controle + ajuda + erro. Um `<input>` solto no markup, sem
`<label>` associado, está incompleto mesmo que pareça funcionar no mouse.

## Anatomia

| Parte | Elemento | Papel | Obrigatório |
|---|---|---|---|
| Rótulo | `<label for="<campo>">` | Nomeia o campo e amplia o alvo de clique | Sim |
| Controle | `<input id="<campo>" name="<campo>">` | Recebe o valor | Sim |
| Texto de ajuda | `<p id="<campo>-ajuda">` | Formato esperado, limite, consequência | Quando houver regra não óbvia |
| Mensagem de erro | `<p id="<campo>-erro" role="alert">` | Diz o que está errado e como corrigir | Quando houver erro |

O `id` do controle amarra tudo: `for` no rótulo aponta para ele, e `aria-describedby` no controle
aponta para ajuda e erro — **os dois ao mesmo tempo, separados por espaço**, quando ambos existem.
Sem isso o leitor de tela anuncia o campo sem dizer o formato nem o motivo da falha.

```text
<Campo>                          ← label, text-body-sm
┌────────────────────────────┐
│ <placeholder curto>        │   ← input, text-body
└────────────────────────────┘
Formato esperado: <regra>        ← ajuda, text-caption, text-texto-suave
```

Tipografia pela escala de [`tailwind-design`](../../.ai/skills/tailwind-design/SKILL.md): `text-body-sm`
no rótulo, `text-body` no controle, `text-caption` na ajuda e no erro. Nada fora da escala, nem para
fazer caber.

## Placeholder não é rótulo

Placeholder some ao digitar. Quem foi interrompido no meio do preenchimento volta para um campo cheio
sem saber o que ele é, e quem usa leitor de tela pode nunca ouvi-lo. Ele serve para **exemplificar o
formato**, não para nomear:

| Uso | Exemplo | Situação |
|---|---|---|
| Exemplo de formato | `000.000.000-00` | Permitido |
| Rótulo disfarçado | `Digite seu <Campo>` | Proibido — vira `<label>` |
| Instrução longa | `Informe o <Campo> conforme…` | Proibido — vira texto de ajuda |

Quando o layout não comporta rótulo visível — barra de filtro compacta, por exemplo — o rótulo existe
mesmo assim, em `sr-only`. Some da tela, não da árvore de acessibilidade.

## Tipo e teclado no mobile

`type` e `inputmode` **são responsividade**, não detalhe de a11y. Errar aqui obriga o usuário de
celular a trocar de teclado a cada campo, e é a causa mais comum de abandono em formulário longo.

| Dado | `type` | `inputmode` | `autocomplete` | Observação |
|---|---|---|---|---|
| Texto curto | `text` | — | conforme o dado | Padrão |
| E-mail | `email` | `email` | `email` | Teclado com `@` e validação nativa de formato |
| Telefone | `tel` | `tel` | `tel` | Teclado numérico com símbolos; máscara é opcional |
| Número inteiro | `text` | `numeric` | — | `type="number"` traz spinner e rola com a roda do mouse |
| Valor monetário | `text` | `decimal` | — | Formatação e cultura resolvidas no servidor |
| Documento numérico | `text` | `numeric` | — | Separador visual não vai no valor enviado |
| Data | `date` | — | conforme o dado | Usa o seletor nativo do sistema, já localizado |
| Busca | `search` | `search` | `off` | Ver a variante abaixo |
| Senha | `password` | — | `current-password` / `new-password` | Nunca desabilitar colar |

Sobre `type="number"`: só cabe em quantidade real com incremento útil. Para documento, CEP, cartão ou
código ele atrapalha — perde zero à esquerda, aceita notação científica e o spinner é um alvo
minúsculo no toque. Use `text` com `inputmode="numeric"`.

`autocomplete` correto poupa digitação e é acessibilidade de fato. Desligue apenas quando o valor for,
por natureza, não reutilizável.

## Comportamento nas três faixas

A obrigação está em [README.md](README.md); a técnica, em
[`acessibilidade-responsivo`](../../.ai/skills/acessibilidade-responsivo/SKILL.md). O que é específico
do campo:

| Faixa | Grade | Largura do controle | Ação primária |
|---|---|---|---|
| Mobile 320–767 | **Uma coluna**, sempre | 100% do contêiner; altura efetiva ~44px | Largura total, acima das secundárias |
| Tablet 768–1023 | Uma ou duas colunas, conforme o tamanho real do dado | Fluida | Tamanho natural |
| Desktop 1024+ | Duas colunas ou mais, com `max-w-*` no formulário | Fluida | Tamanho natural |

Regras que valem em todas as faixas:

- **Largura nunca em px.** `w-full` dentro de um contêiner com `max-w-*`. `w-[320px]` num campo é a
  causa clássica de rolagem horizontal em 320px.
- **Campo curto não fica curto por estética.** CEP e UF podem ocupar menos colunas da grade
  (`md:col-span-1`), mas o controle preenche a coluna que recebeu.
- **Fonte do controle nunca abaixo de `body`.** Além de reprovar na escala, o iOS aplica zoom
  automático em campo com fonte menor que 16px, o que desloca a página inteira.
- **Nada de duas colunas espremidas no tablet** só porque cabem: se o rótulo quebra em três linhas,
  volte para uma coluna.

## Validação e erro

Validação nasce no servidor. O cliente **antecipa a mensagem**, nunca a substitui — é o mesmo
progressive enhancement de [`razor-interop`](../../.ai/skills/razor-interop/SKILL.md).

- **`required` nativo**, não só asterisco. O asterisco é reforço visual; sozinho, não é anunciado e
  não bloqueia envio sem JS.
- **Erro em `role="alert"`**, para ser anunciado no momento em que aparece.
- **`aria-invalid="true"` no controle** enquanto houver erro, com `aria-describedby` apontando a
  mensagem.
- **Cor nunca é o único portador do erro.** Borda avermelhada sem texto não existe para quem não
  distingue a cor nem para quem usa leitor de tela. Texto sempre — ícone, se quiser reforçar.
- **A mensagem diz o que fazer.** "Campo inválido" não ajuda; "O <Campo> deve ter 11 dígitos" ajuda.
- **Erro aparece depois da interação**, não ao carregar a tela. Formulário que abre em erro acusa o
  usuário de algo que ele ainda não fez.
- **O foco vai para o primeiro campo com erro** após um envio recusado.

## Variante — campo de busca

Busca é um input com três diferenças: filtra uma lista em vez de gravar dado, costuma aparecer sem
rótulo visível e quase sempre carrega um ícone à esquerda.

| Aspecto | Regra |
|---|---|
| Rótulo | `sr-only` — a barra é compacta, mas o campo precisa de nome acessível |
| Ícone | Decorativo: `aria-hidden="true"`, posicionado com `absolute`, e `pl-*` no controle abre espaço |
| `type` | `search` — dá o botão de limpar nativo e o teclado certo no mobile |
| Placeholder | Curto, uma expressão: `Buscar <Entidade>` |
| Envio | `<form method="get">` real; sem JS, `Enter` submete e a página recarrega filtrada |
| Com JS | Debounce de ~300ms e atualização só da lista, preservando foco e posição do cursor |
| Anúncio | Quantidade de resultados numa região `role="status"`, para quem não vê a lista mudar |

O `method="get"` é obrigatório: o filtro fica na URL, o link é compartilhável e o histórico funciona.
Busca em `POST` quebra o botão Voltar e o `F5`.

Debounce não é enfeite: sem ele, cada tecla dispara uma requisição e as respostas chegam fora de
ordem. Quando o JS assume, ele **cancela a requisição anterior** antes de disparar a próxima.

## Markup

### Campo padrão

```razor
<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
    <div class="flex flex-col gap-1">
        <label for="<campo>" class="text-body-sm font-medium text-texto">
            <Campo>
        </label>
        <input id="<campo>"
               name="<campo>"
               type="text"
               inputmode="numeric"
               autocomplete="off"
               required
               aria-describedby="<campo>-ajuda"
               placeholder="<formato de exemplo>"
               class="w-full rounded-lg border border-borda bg-superficie px-3 py-2.5 text-body
                      text-texto placeholder:text-texto-suave
                      focus-visible:outline-2 focus-visible:outline-offset-2
                      focus-visible:outline-primaria
                      disabled:pointer-events-none disabled:opacity-50" />
        <p id="<campo>-ajuda" class="text-caption text-texto-suave">
            <Regra de preenchimento em uma linha>
        </p>
    </div>
</div>

<button type="submit"
        class="w-full rounded-lg bg-primaria px-4 py-2.5 text-body-sm font-medium
               focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto">
    <Ação que descreve o que acontece>
</button>
```

O `py-2.5` sobre `text-body` entrega os ~44px de alvo de toque sem altura fixa. Altura em px trava o
controle quando o texto aumenta pelo zoom do navegador.

### Campo com erro

```razor
<div class="flex flex-col gap-1">
    <label for="<campo>" class="text-body-sm font-medium text-texto"><Campo></label>
    <input id="<campo>"
           name="<campo>"
           type="email"
           inputmode="email"
           autocomplete="email"
           required
           aria-invalid="true"
           aria-describedby="<campo>-ajuda <campo>-erro"
           value="@Model.<Campo>"
           class="w-full rounded-lg border border-borda bg-superficie px-3 py-2.5 text-body
                  text-texto focus-visible:outline-2 focus-visible:outline-offset-2" />
    <p id="<campo>-ajuda" class="text-caption text-texto-suave"><Formato esperado></p>
    <p id="<campo>-erro" role="alert" class="flex items-start gap-1 text-caption">
        <icon name="circle-alert" class="size-3.5 shrink-0" aria-hidden="true" />
        @Model.<Campo>Erro
    </p>
</div>
```

O estado inválido vem resolvido da ViewModel e é expresso por `aria-invalid`. A view não decide o
erro por cadeia de `if`, e a borda não é a única pista — o texto acompanha, com ícone de reforço.

### Campo de busca numa barra de filtro

```razor
<form method="get"
      data-filtro-<entidade>
      data-url-listar="@Url.Action(nameof(<Entidade>Controller.Listar), "<Entidade>")"
      class="flex flex-col gap-3 sm:flex-row sm:items-center">
    <div class="relative w-full sm:max-w-sm">
        <label for="busca" class="sr-only">Buscar <Entidade></label>
        <icon name="search"
              class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2
                     text-texto-suave"
              aria-hidden="true" />
        <input id="busca"
               name="busca"
               type="search"
               inputmode="search"
               autocomplete="off"
               value="@Model.Busca"
               placeholder="Buscar <Entidade>"
               class="w-full rounded-lg border border-borda bg-superficie py-2.5 pl-9 pr-3
                      text-body text-texto placeholder:text-texto-suave
                      focus-visible:outline-2 focus-visible:outline-offset-2" />
    </div>

    @* selects do filtro entram aqui — ver select.md *@

    <noscript>
        <button type="submit"
                class="w-full rounded-lg border border-borda px-4 py-2.5 text-body-sm sm:w-auto">
            Filtrar
        </button>
    </noscript>
</form>
```

`flex-col` na base e `sm:flex-row` a partir do tablet: no mobile os controles ficam **empilhados em
largura total**, não em duas colunas de 150px onde nenhum placeholder cabe.

O `<noscript>` mantém a barra utilizável sem JS. Com JS, o script lê `data-url-listar`, aplica o
debounce e substitui só a lista — sem URL literal dentro do `.ts`, conforme
[`razor-interop`](../../.ai/skills/razor-interop/SKILL.md).

## Estados obrigatórios

Campo também tem estados, e eles são projetados junto com o caminho feliz:

| Estado | O que renderizar |
|---|---|
| Desabilitado | `disabled` com opacidade reduzida e **um texto dizendo por quê** — campo apagado sem explicação parece defeito |
| Somente leitura | `readonly` quando o valor importa e é copiável; `disabled` quando nem deve ser enviado |
| Carregando | Só quando o campo depende de dado remoto (CEP que preenche endereço); o dependente fica `readonly` até chegar |
| Erro de carga | Mensagem com a causa concreta e ação de tentar de novo; nunca campo vazio silencioso |
| Sem permissão | Campo não editável **e** explicado; esconder sem dizer nada faz o usuário procurar onde não existe |

## Regras

- **Todo controle tem `<label for>` associado.** Visível por padrão; `sr-only` só em barra compacta.
- **Placeholder nunca faz papel de rótulo.**
- **`aria-describedby` liga ajuda e erro ao controle**, com os dois ids quando ambos existem.
- **`required` nativo em campo obrigatório**, e não só asterisco.
- **Erro tem texto**, `role="alert"` e `aria-invalid` — cor sozinha não comunica.
- **Largura fluida, altura por padding.** Nada de `w-[…px]` nem `h-[…px]` no controle.
- **`type` e `inputmode` corretos** — teclado errado no mobile é defeito de responsividade.
- **Foco sempre visível.** `outline: none` sem substituto reprova.
- **Não desabilite colar** em senha, código ou documento.
- **A ViewModel entrega valor e mensagem prontos.** A view não formata nem deriva estado.
- **Máscara não substitui validação** e nunca impede o usuário de colar o valor completo.
- **Ícone dentro do campo é decorativo** — `aria-hidden="true"`, conforme [icon.md](icon.md).

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Página rola na horizontal em 320px | Largura fixa em px no controle | `w-full` dentro de contêiner com `max-w-*` |
| iOS dá zoom ao focar o campo | Fonte do controle abaixo de 16px | Manter `text-body` e não reduzir a escala |
| Leitor de tela anuncia campo sem nome | Só placeholder, sem `<label>` | `<label for>`, `sr-only` se preciso |
| Usuário não sabe o que corrigir | Erro só na cor da borda | Texto em `role="alert"` + `aria-describedby` |
| Teclado alfabético em campo numérico | `inputmode` ausente | `inputmode="numeric"` ou `decimal` |
| Zero à esquerda some no documento | `type="number"` | `type="text"` com `inputmode="numeric"` |
| Busca dispara requisição por tecla | Sem debounce nem cancelamento | Debounce ~300ms e abortar a anterior |
| Botão Voltar não recupera o filtro | Busca enviada por `POST` | `<form method="get">` |
| Alvo de toque pequeno no mobile | Altura fixa ou padding curto | `py-2.5` sobre `text-body` (~44px) |
| Formulário abre inteiro em erro | Erro renderizado antes da interação | Exibir erro só após envio ou blur |
