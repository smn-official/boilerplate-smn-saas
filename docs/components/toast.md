# Toast

Toast **confirma que a ação do usuário aconteceu** e sai de cena sozinho. Ele responde a uma única
pergunta — "funcionou?" — e a resposta tem prazo de validade curto, porque o usuário acabou de fazer
a coisa e ainda lembra do que era.

Daí sai a regra que governa o componente inteiro: **toast nunca carrega informação que o usuário
precise reler.** Se o texto tem número que será usado depois, prazo a cumprir, identificador a
copiar ou instrução a seguir, ele está no componente errado.

## O que não é toast

| Situação | Onde vai |
|---|---|
| Erro que exige o usuário decidir algo | Alerta inline, ao lado do contexto — [alert.md](alert.md) |
| Erro que bloqueia o fluxo até ser resolvido | Modal |
| Erro de campo de formulário | Mensagem associada ao campo — [input.md](input.md) |
| Condição persistente ("3 `<Entidade>` vencem hoje") | Alerta inline |
| Dado que o usuário vai anotar ou copiar | Conteúdo da página |
| Confirmação de ação destrutiva antes de executar | Modal com confirmação explícita |

Falha **pode** virar toast quando não há decisão a tomar e a ação é repetível na hora — "Não foi
possível salvar `<Entidade>`. Tente novamente." é aceitável se o botão continua ali e o estado da
tela não mudou. Fora disso, falha é alerta.

## O que o texto diz

Mesmo com poucos segundos na tela, o texto nomeia **o que aconteceu e com o quê** — regra de
[.ai/docs/aparencia-generica.md](../../.ai/docs/aparencia-generica.md).

| Genérico | Específico |
|---|---|
| "Sucesso!" | "`<Entidade>` `<Identificador>` foi arquivada" |
| "Salvo" | "Alterações em `<Entidade>` foram salvas" |
| "Erro" | "Não foi possível excluir `<Entidade>`: tente novamente" |

Uma frase, sem título separado. Se o conteúdo precisa de título e descrição para ser entendido, ele é
longo demais para desaparecer em quatro segundos — é alerta.

## Região viva e anúncio

O contêiner de toasts existe **vazio no DOM desde a carga da página**, com o `role` já aplicado.
Criar o elemento e a live region ao mesmo tempo faz vários leitores de tela não anunciarem nada.

| Intenção | Marcação | Comportamento |
|---|---|---|
| Sucesso e informação | `role="status"` (`aria-live="polite"`) | Anuncia quando o leitor terminar a frase atual |
| Falha crítica | `aria-live="assertive"` | Interrompe a leitura em curso |

**`assertive` é exceção.** Interromper o leitor de tela para dizer que algo deu certo é hostil, e
para dizer que algo falhou só se justifica quando o usuário precisa saber antes de continuar
digitando. Na dúvida, `polite`.

O contêiner leva `aria-atomic="true"`, para o toast ser lido inteiro, e nunca é escondido com
`display: none` entre uma mensagem e outra — a região precisa permanecer no DOM para funcionar.

## Fila, limite e duração

| Parâmetro | Valor | Razão |
|---|---|---|
| Simultâneos | Máximo 3 | Acima disso a pilha cobre a interface e nenhum é lido |
| Excedente | Entra em fila, não empilha | O quarto espera o primeiro sair |
| Duração mínima | ~4s | Abaixo disso não dá tempo de ler uma frase completa |
| Duração com ação | ~8s, ou persistente | O usuário precisa notar, mover a mão e clicar |
| Pausa | Ao passar o mouse ou receber foco | Ler não pode ser corrida contra o relógio |

A contagem **recomeça** quando o ponteiro sai ou o foco deixa o toast. Toast que some enquanto o
usuário lê é o mesmo defeito de não mostrar nada.

Ações repetidas não geram uma pilha: a mesma mensagem disparada de novo atualiza o toast existente e
reinicia a contagem, em vez de somar cópias idênticas.

## Foco e teclado

- **Toast nunca rouba o foco.** O usuário estava em algum lugar e continua lá; mover o foco para uma
  confirmação tira a pessoa do fluxo e, com teclado, faz perder a posição na tela.
- **Toast com ação precisa ser alcançável por teclado.** Se some em quatro segundos, a ação existe só
  para quem usa mouse e enxerga — o que a torna inacessível na prática. Por isso: **toast com ação
  tem duração maior ou é persistente**, e some apenas ao ser dispensado ou ao ser acionado.
- Se a ação é indispensável — desfazer algo destrutivo, por exemplo — reconsidere: confirmação prévia
  em modal resolve melhor do que uma janela de desfazer que expira.
- Todo toast dispensável tem botão de fechar com `aria-label`, ícone `aria-hidden` e alvo de ~44px no
  mobile — ver [icon.md](icon.md).
- `Esc` dispensa o toast em foco.
- Com `prefers-reduced-motion`, a entrada e a saída acontecem sem deslocamento, conforme
  [`acessibilidade-responsivo`](../../.ai/skills/acessibilidade-responsivo/SKILL.md).

## Posicionamento nas três faixas

| Faixa | Posição |
|---|---|
| Mobile 320–767 | Largura total menos margem lateral, ancorado embaixo, acima da navegação inferior e respeitando a safe area |
| Tablet 768–1023 | Canto inferior direito, largura limitada |
| Desktop 1024+ | Canto inferior direito, largura limitada, empilhados verticalmente com espaçamento |

No mobile as duas restrições são inegociáveis:

- **Não cobrir a ação primária.** Botão de salvar ou de criar fixo na base da tela é justamente o que
  o usuário vai tocar em seguida; um toast por cima transforma confirmação em obstáculo. Se a tela
  tem ação fixa embaixo, o toast senta acima dela.
- **Não cobrir a navegação inferior** nem entrar na safe area do dispositivo. O deslocamento sai de
  `env(safe-area-inset-bottom)`, não de um valor fixo em pixels chutado para um aparelho.

O contêiner é `fixed` e `pointer-events-none`; cada toast reativa `pointer-events-auto`. Sem isso, a
área vazia da pilha intercepta cliques em elementos que estão embaixo dela.

## Sombra aqui é legítima

[.ai/docs/aparencia-generica.md](../../.ai/docs/aparencia-generica.md) proíbe sombra decorativa, e
[card.md](card.md) segue essa norma: card é superfície no fluxo, delimitada por borda, sem elevação
para simular.

Toast é o caso oposto — **ele realmente flutua sobre o conteúdo**. A sombra comunica que aquele bloco
está numa camada acima, que não pertence à página abaixo e que vai embora. É informação de
profundidade real, não enfeite.

O mesmo raciocínio vale para modal e menu suspenso ([user-menu.md](user-menu.md)). O que continua
proibido é sombra em elemento que não flutua: alerta inline ([alert.md](alert.md)), card, cabeçalho
de bloco ([header.md](header.md)).

## Markup

O contêiner mora no layout, uma única vez, presente desde a carga:

```razor
@* Features/Shared/_ToastContainer.cshtml *@

<div id="toasts"
     role="status"
     aria-live="polite"
     aria-atomic="true"
     class="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2
            p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]
            sm:inset-x-auto sm:right-0 sm:items-end sm:pb-4"
     data-toast-container
     data-duracao-padrao="4000"
     data-duracao-com-acao="8000"
     data-maximo-simultaneos="3">
</div>
```

O template de um toast, clonado pelo TypeScript:

```razor
<template id="toast-modelo">
    <div class="pointer-events-auto flex w-full items-start gap-3 rounded-lg border border-borda
                bg-superficie p-4 shadow-lg sm:w-96"
         data-toast>
        <icon name="circle-check" class="size-5 shrink-0" aria-hidden="true" data-toast-icone />
        <p class="flex-1 text-body-sm text-texto" data-toast-mensagem></p>
        <button type="button"
                class="inline-flex size-11 shrink-0 items-center justify-center rounded-md
                       text-texto-suave hover:text-texto
                       focus-visible:outline-2 focus-visible:outline-offset-2
                       sm:size-9"
                aria-label="Dispensar mensagem"
                data-toast-fechar>
            <icon name="x" class="size-4" aria-hidden="true" />
        </button>
    </div>
</template>
```

Toda a configuração — duração, limite de simultâneos — chega por `data-*` no contêiner, conforme
[`razor-interop`](../../.ai/skills/razor-interop/SKILL.md). O TypeScript não guarda número mágico e não
monta rota em string.

Quando a confirmação vem de um POST com redirect, a mensagem é passada pelo servidor e o script lê o
`data-*` no carregamento — sem isso, o toast só funciona em fluxo com fetch, e o progressive
enhancement se perde.

## Regras

- **Toast confirma; ele não informa.** Nada que o usuário precise reler, anotar ou consultar depois
  entra aqui.
- **Contêiner com `role` presente no DOM desde a carga**, vazio. Criar a live region junto com a
  mensagem faz o anúncio falhar.
- **`polite` por padrão.** `assertive` só em falha que o usuário precisa saber antes de continuar.
- **Nunca roubar o foco.**
- **Toast com ação dura mais ou não expira.** Ação que some antes de ser alcançada por teclado é
  ação que não existe.
- **Máximo de 3 simultâneos**, o resto em fila. Mensagem repetida atualiza a existente.
- **A contagem pausa no hover e no foco**, e recomeça ao sair.
- **No mobile não cobre ação primária nem navegação inferior**, e respeita a safe area.
- **Uma frase, sem título.** Precisou de dois níveis de texto, virou alerta.
- **Sem barra de progresso decorativa.** A régua que encolhe pressiona a leitura e não acrescenta
  informação — ver [.ai/docs/aparencia-generica.md](../../.ai/docs/aparencia-generica.md).
- **Ícone do Lucide, `aria-hidden="true"`** ([icon.md](icon.md)); a intenção também está na frase,
  porque cor não é portador único —
  [`acessibilidade-responsivo`](../../.ai/skills/acessibilidade-responsivo/SKILL.md).
- **A sombra existe porque há elevação real.** Não copie esse tratamento para componente que está no
  fluxo.

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Leitor de tela não anuncia nada | Live region criada junto com a mensagem | Contêiner com `role` vazio no DOM desde a carga |
| Usuário perde a informação e não consegue recuperá-la | Conteúdo persistente entregue como toast | Trocar por alerta inline — [alert.md](alert.md) |
| Toast some antes de o usuário terminar de ler | Duração curta ou sem pausa no hover | Mínimo ~4s e pausa no hover e no foco |
| Ação "Desfazer" inalcançável por teclado | Toast com ação e duração padrão | Duração maior ou toast persistente |
| Pilha de toasts cobrindo a tela | Sem limite de simultâneos | Máximo 3, resto em fila |
| Sete toasts idênticos após cliques repetidos | Cada disparo cria um novo | Atualizar o existente e reiniciar a contagem |
| Botão de salvar inacessível no mobile | Toast sobre a ação primária fixa | Ancorar o toast acima da ação |
| Toast cortado pela barra do sistema | Safe area ignorada | `env(safe-area-inset-bottom)` no deslocamento |
| Cliques não passam na área da pilha | Contêiner capturando eventos | `pointer-events-none` no contêiner, `auto` no toast |
| Foco perdido após a ação | Toast movendo o foco ao aparecer | Não mover o foco |
| Erro que exige decisão mostrado e perdido | Falha tratada como confirmação | Alerta inline ou modal |
