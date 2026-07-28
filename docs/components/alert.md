# Alerta

Alerta é **inline e persistente**. Ele nasce dentro do fluxo da página, ao lado do que ele explica, e
fica lá até a condição mudar ou o usuário dispensá-lo. É o componente para o que o usuário **precisa
poder reler**.

## Fronteira com toast

| Critério | Alerta | Toast ([toast.md](toast.md)) |
|---|---|---|
| Onde vive | No fluxo da página, junto do contexto | Flutuando sobre a interface |
| Duração | Até a condição mudar ou ser dispensado | Alguns segundos, some sozinho |
| Responde a | Um estado da página ou do registro | Uma ação que o usuário acabou de executar |
| Pode ser relido | Sim — é para isso que existe | Não |
| Pode exigir decisão | Sim | Não |

A regra que resolve o caso duvidoso: **se o usuário precisar do texto de novo daqui a trinta
segundos, é alerta.** Confirmação de que algo deu certo e acabou é toast. Erro que exige escolher o
que fazer nunca é toast — vira alerta inline, ou modal quando bloqueia o fluxo.

## Variantes por intenção

São quatro, e cada uma responde a uma pergunta diferente. A cor sai do **token semântico de estado**
correspondente — nunca de nome de cor concreta, hex ou valor arbitrário, conforme
[`tailwind-design`](../../.ai/skills/tailwind-design/SKILL.md).

| Intenção | Responde | Ícone Lucide | `role` |
|---|---|---|---|
| Informação | "Existe algo que muda como você deve agir aqui" | `info` | `status` |
| Sucesso | "Terminou, e o resultado está registrado" | `circle-check` | `status` |
| Aviso | "Vai dar problema se nada for feito" | `triangle-alert` | `status` |
| Erro | "Não foi feito, e é preciso decidir algo" | `circle-alert` | `alert` |

**Cor nunca é o único portador da informação.** Todo alerta tem ícone e texto; o token de estado só
reforça o que o ícone e a frase já dizem. Quem lê em escala de cinza, com daltonismo ou por leitor de
tela recebe a mesma informação — exigência de
[`acessibilidade-responsivo`](../../.ai/skills/acessibilidade-responsivo/SKILL.md).

Não existe quinta variante. "Dica", "novidade" e "promoção" não são estados do sistema; se o conteúdo
não descreve algo que aconteceu ou vai acontecer com o dado do usuário, ele não é alerta.

## O que o texto precisa dizer

Alerta genérico é pior que nenhum alerta: ocupa espaço, interrompe a leitura e não permite agir. O
texto responde **o que aconteceu, com o quê ou com quem, quando, e qual é a ação necessária** — regra
de [.ai/docs/aparencia-generica.md](../../.ai/docs/aparencia-generica.md).

| Genérico | Específico |
|---|---|
| "Algo deu errado" | "Não foi possível salvar `<Entidade>`: o campo `<Campo>` já está em uso em outro registro" |
| "Atenção" | "3 `<Entidade>` vencem em 20/08. Depois dessa data elas saem do `<Processo>`" |
| "Operação realizada com sucesso" | "`<Entidade>` `<Identificador>` foi enviada para `<Destino>` às 14:32" |
| "Erro de validação" | "2 dos 40 registros do arquivo não foram importados: linhas 12 e 27, `<Campo>` vazio" |
| "Sua sessão pode expirar" | "Sua sessão expira em 5 minutos. Salve `<Entidade>` antes disso" |

Números, identificadores e datas vêm do servidor, sempre reais. Contagem estimada ou fixa em markup é
dado demonstrativo, e dado demonstrativo em alerta faz o usuário tomar decisão sobre algo que não
existe.

## Semântica

| Situação | Marcação | Por quê |
|---|---|---|
| Erro que exige atenção imediata, surgido após uma ação | `role="alert"` | Interrompe o leitor de tela e anuncia na hora |
| Sucesso, aviso e informação surgidos após uma ação | `role="status"` (`aria-live="polite"`) | Anuncia quando o leitor terminar a frase atual |
| Conteúdo estático, presente já na carga da página | Nenhum `role` de live region | O leitor já lê na ordem do documento |

O terceiro caso é o mais errado na prática. **`role="alert"` em bloco que sempre esteve na página faz
o leitor de tela interromper a leitura no carregamento**, e o usuário ouve o alerta antes do título
da tela. Live region é para conteúdo que **aparece ou muda depois**; alerta renderizado pelo servidor
junto com o resto da página é só um bloco de conteúdo com ícone e texto.

Quando o alerta é inserido por script, o contêiner com o `role` já precisa existir vazio no DOM
antes: inserir o elemento e o `role` ao mesmo tempo faz vários leitores não anunciarem nada.

Alerta ligado a um campo de formulário não usa nenhuma das duas regras acima — a mensagem é associada
ao campo por `aria-describedby` com `aria-invalid="true"` no input, conforme
[`acessibilidade-responsivo`](../../.ai/skills/acessibilidade-responsivo/SKILL.md) e [input.md](input.md).

## Alerta com ação e alerta dispensável

Os dois são opcionais e independentes.

**Com ação** — a saída do problema é um passo concreto, e o alerta o oferece. Um único gatilho, com
rótulo que diz o que vai acontecer: "Revisar as 3 pendências", nunca "Saiba mais". Se a ação leva a
outra tela, é `<a>`; se resolve ali mesmo, é `<button>` — ver [button.md](button.md). Duas ações no
mesmo alerta significam que ele está descrevendo duas coisas.

**Dispensável** — só quando dispensar é legítimo: o usuário viu, entendeu e a informação não precisa
voltar. Erro de validação e aviso de prazo **não são dispensáveis**, porque a condição continua
valendo depois do clique. O botão de fechar tem `aria-label` explícito ("Dispensar aviso sobre
`<Entidade>`") e o ícone dentro dele é `aria-hidden` — regra de [icon.md](icon.md).

Alerta dispensado por engano precisa poder voltar: se a informação era importante o bastante para
interromper, ela continua acessível na tela que a originou.

## Comportamento nas três faixas

| Faixa | Disposição |
|---|---|
| Mobile 320–767 | Largura total do contêiner. Ícone e texto na primeira linha, ação abaixo em largura total. Fechar no canto superior direito, alvo de ~44px |
| Tablet 768–1023 | Largura total do contêiner. Ação alinhada à direita quando o texto for curto; abaixo quando longo |
| Desktop 1024+ | Largura do bloco a que pertence, limitada pela largura máxima do conteúdo. Ícone, texto e ação na mesma linha |

O alerta acompanha a largura do bloco que ele explica — se explica um formulário, tem a largura do
formulário. Alerta esticado de ponta a ponta da tela enquanto o conteúdo é uma coluna estreita perde
o vínculo visual com o que descreve.

**O ícone nunca some no mobile.** Ele é o segundo portador da intenção; removê-lo em tela estreita
deixa a cor sozinha, exatamente onde o contraste tende a ser pior. O que encolhe é o espaçamento, não
a informação. Ele também não encolhe nem estica com o texto — `shrink-0` e alinhado ao topo da
primeira linha, para não descer ao centro quando a mensagem quebra em três linhas.

Texto longo quebra normalmente; identificador e URL recebem `break-words` para não empurrar a largura
do contêiner e produzir rolagem horizontal.

## Markup

```razor
@model AlertaViewModel

<div class="relative flex flex-col gap-3 rounded-lg border border-borda bg-superficie p-4
            sm:flex-row sm:items-start sm:gap-4"
     role="@Model.PapelAria">

    <icon name="@Model.Icone" class="size-5 shrink-0 @Model.ClasseDoIcone" aria-hidden="true" />

    <div class="flex-1 space-y-1">
        <p class="text-body-sm font-medium text-texto">@Model.Titulo</p>
        <p class="text-body-sm break-words text-texto-suave">@Model.Descricao</p>
    </div>

    @if (Model.TemAcao)
    {
        <a asp-action="@Model.AcaoRota"
           class="inline-flex min-h-11 w-full items-center justify-center rounded-md border
                  border-borda px-4 text-body-sm font-medium text-texto
                  hover:bg-borda/40
                  focus-visible:outline-2 focus-visible:outline-offset-2
                  sm:min-h-9 sm:w-auto sm:shrink-0">
            @Model.AcaoRotulo
        </a>
    }

    @if (Model.Dispensavel)
    {
        <button type="button"
                class="absolute right-2 top-2 inline-flex size-11 items-center justify-center
                       rounded-md text-texto-suave hover:text-texto
                       focus-visible:outline-2 focus-visible:outline-offset-2
                       sm:static sm:size-9 sm:shrink-0"
                aria-label="Dispensar @Model.TituloParaLeitorDeTela"
                data-dispensar-alerta>
            <icon name="x" class="size-4" aria-hidden="true" />
        </button>
    }
</div>
```

`PapelAria`, `Icone` e `ClasseDoIcone` vêm resolvidos da ViewModel a partir da intenção. A view não
deriva variante por cadeia de `if/else` — regra de
[`tailwind-design`](../../.ai/skills/tailwind-design/SKILL.md). `AcaoRotulo` é frase de ação real, não
"Saiba mais".

O `data-dispensar-alerta` é o contrato com o TypeScript, conforme
[`razor-interop`](../../.ai/skills/razor-interop/SKILL.md).

## Regras

- **Alerta explica um contexto da página, e fica perto dele.** Alerta de formulário acima do
  formulário; alerta de um registro dentro do card daquele registro ([card.md](card.md)); alerta da
  tela inteira no topo da área de conteúdo, abaixo do cabeçalho de página ([page.md](page.md)).
- **`role="alert"` só para erro que exige atenção imediata.** Nunca em conteúdo estático da página, e
  nunca em sucesso — interromper a leitura para dizer que deu certo é hostil.
- **A frase diz o que aconteceu, com o quê, quando e o que fazer.** "Algo deu errado" não é
  mensagem; é a ausência dela.
- **Ícone obrigatório**, sempre do Lucide ([icon.md](icon.md)), sempre `aria-hidden="true"` — o texto
  ao lado já nomeia a intenção.
- **Uma intenção por alerta.** Sucesso parcial com erro parcial são dois fatos: descreva o resultado
  real ("38 de 40 importados") num alerta só, com a intenção do que precisa de ação.
- **No máximo um alerta visível por contexto.** Três alertas empilhados no topo da tela viram uma
  faixa que o usuário aprende a pular. Se há três problemas, o alerta os resume e a lista deles fica
  no conteúdo.
- **Alerta não substitui validação de campo.** Erro de um campo específico pertence ao campo, com
  `aria-describedby` — ver [input.md](input.md). Alerta no topo listando 8 erros faz o usuário
  procurar cada um.
- **Sem sombra.** Alerta é inline: ele não flutua sobre nada, logo não tem elevação. Sombra aqui é
  decoração, proibida em [.ai/docs/aparencia-generica.md](../../.ai/docs/aparencia-generica.md). Quem
  flutua de verdade é o toast ([toast.md](toast.md)).
- **Sem animação de entrada** em alerta renderizado pelo servidor. Ele já estava lá quando a página
  carregou; animar sugere que algo acabou de acontecer.
- **Erro que impede o usuário de continuar não é alerta dispensável.** Ou a condição muda, ou o
  alerta fica.
- **Contraste de texto, borda e ícone verificados** nas quatro larguras e nos dois temas, conforme
  [`acessibilidade-responsivo`](../../.ai/skills/acessibilidade-responsivo/SKILL.md).

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Leitor de tela interrompe a leitura ao carregar a página | `role="alert"` em bloco estático | Remover o `role`; live region só para conteúdo que aparece depois |
| Alerta inserido por script não é anunciado | Elemento e `role` inseridos juntos | Contêiner com o `role` já presente e vazio no DOM |
| "Algo deu errado. Tente novamente." | Mensagem sem entidade, causa nem ação | Nomear o que falhou, por quê e o próximo passo |
| Usuário fecha o aviso e o problema continua | Alerta de condição ativa marcado como dispensável | Manter até a condição mudar |
| Ícone sumiu em 320px | `hidden sm:block` no ícone | Manter sempre; encolher o espaçamento, não a informação |
| Ícone centralizado verticalmente em texto de três linhas | Ícone alinhado ao centro do flex | `items-start` e `shrink-0` |
| Página rola na horizontal com identificador longo | Texto sem quebra no alerta | `break-words` na descrição |
| Faixa de quatro alertas no topo da tela | Um alerta por erro encontrado | Um alerta que resume; detalhes no conteúdo |
| Botão de fechar sem nome no leitor de tela | Botão só com ícone e sem `aria-label` | `aria-label` no botão, `aria-hidden` no ícone |
| Alerta de sucesso que o usuário nunca lê | Confirmação efêmera colocada inline | Trocar por toast — ver [toast.md](toast.md) |
