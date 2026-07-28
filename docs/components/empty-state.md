# Estado vazio

O que ocupa o lugar do conteúdo quando não há conteúdo. Obrigatório em toda superfície que exibe
dados — tabela, card de análise, lista, painel.

**Vazio não é erro, e vazio não é zero.** São três situações diferentes, com respostas diferentes, e
confundi-las faz o usuário decidir sobre um fato que não existe:

| Situação | O que significa | O que renderizar |
|---|---|---|
| **Vazio legítimo** | A consulta funcionou e não há registros | Frase que explica **por que** está vazio |
| **Vazio por filtro** | Há dados, mas nenhum satisfaz o recorte | Frase + ação de limpar o filtro |
| **Zero** | Há dados e o valor apurado é `0` | O número `0`, não um estado vazio |
| **Erro** | A consulta falhou; não se sabe se há dados | Mensagem de erro e recarregar — ver [alert.md](alert.md) |

Exibir "sem dados" quando a consulta falhou afirma algo falso. Exibir vazio quando o valor é
legitimamente zero esconde uma informação real.

## As duas escalas

Empty state não é um componente só. O tamanho vem do que ficou vazio:

| Escala | Onde | Composição |
|---|---|---|
| **Compacto** | Dentro de um card, painel de análise, bloco de uma grade | Ícone em superfície neutra + uma frase |
| **De tela** | A página inteira sem conteúdo, primeiro acesso, onboarding | Ilustração + título + frase + ação primária |

O de tela usa ilustração desenhada sob os tokens, e vale a regra de **uma ilustração por tela** de
[`ilustracao-svg`](../../.ai/skills/ilustracao-svg/SKILL.md). Quatro cards vazios lado a lado com
quatro ilustrações viram um mosaico — ali o certo é o compacto.

## Compacto — dentro de card

```text
┌──────────────────────────────┐
│ <Título do bloco>            │  ← cabeçalho permanece
├──────────────────────────────┤
│                              │
│           ┌────┐             │  ← ícone em superfície neutra, size-5
│           │ ic │             │     container ~size-10, rounded-lg
│           └────┘             │
│      Sem <dados> no período  │  ← text-body-sm text-texto-suave
│                              │
└──────────────────────────────┘
```

```razor
<div class="flex min-h-48 flex-col items-center justify-center gap-3 p-6 text-center">
    <span class="flex size-10 items-center justify-center rounded-lg bg-borda/40">
        <icon name="&lt;icone&gt;" class="size-5 text-texto-suave" aria-hidden="true" />
    </span>
    <p class="text-body-sm text-texto-suave">@Model.MensagemVazio</p>
</div>
```

Três regras que essa composição precisa cumprir:

- **O cabeçalho do bloco permanece.** Quem olha precisa saber *o que* está vazio. Card que some
  inteiro deixa um buraco na grade e uma pergunta sem resposta.
- **A altura é preservada** (`min-h-*` na altura aproximada do conteúdo cheio). Sem isso a grade
  colapsa quando não há dados e salta quando eles chegam — e o layout muda debaixo do cursor.
- **O ícone é decorativo**: `aria-hidden`, em superfície neutra, nunca em círculo colorido. Ele
  ocupa o vazio, não anuncia nada — quem anuncia é a frase.

## A frase

**Diga por que está vazio, no vocabulário do domínio.** "Sem dados disponíveis" é a versão genérica
de todas as frases possíveis: serve para qualquer bloco de qualquer produto, logo não informa nada.

| Genérico | Específico |
|---|---|
| "Sem dados disponíveis" | "Nenhuma &lt;Entidade&gt; registrada hoje" |
| "Nada aqui" | "Nenhuma &lt;Entidade&gt; neste período — tente ampliar o recorte" |
| "Lista vazia" | "Nenhuma &lt;Entidade&gt; corresponde aos filtros aplicados" |
| "Sem resultados" | "Nenhum resultado para \"&lt;termo&gt;\"" |

Quando o vazio depende de um recorte selecionado — período, filtro, busca — **a frase cita o
recorte**. É o que diz ao usuário que a tela funciona e que basta mudar o critério.

## Vazio por filtro preserva o caminho de volta

Vazio causado por filtro **mantém os filtros visíveis** e oferece limpá-los. Trocar a tela inteira
por um estado vazio faz o usuário achar que perdeu o trabalho.

```razor
<p class="text-body-sm text-texto-suave">Nenhuma &lt;Entidade&gt; corresponde aos filtros.</p>
<a asp-action="@nameof(&lt;Controller&gt;.Index)" class="text-body-sm text-texto underline">
    Limpar filtros
</a>
```

Mesma regra na tabela — ver [table.md](table.md).

## Vazio com ação

Quando existe algo que o usuário pode fazer **agora** para sair do vazio, o estado leva a ação. É o
caso de primeiro acesso: a lista não tem registros porque nenhum foi criado ainda.

- **Uma ação, a primária daquele contexto** — ver [button.md](button.md).
- O rótulo diz o que será criado: "&lt;Verbo&gt; &lt;Entidade&gt;", nunca "Começar".
- **Sem ação quando não há o que fazer.** Vazio por período sem movimento não tem botão; o usuário
  não pode inventar registros. Botão que não resolve o vazio é decoração.

## Estado vazio não é lugar de decoração

- Sem ilustração no compacto — ela pertence ao de tela, uma por tela.
- Sem animação de entrada, sem elemento flutuando.
- Sem frase motivacional. "Comece sua jornada" não diz por que a tela está vazia.
- Sem dado de exemplo desenhado para "mostrar como ficaria". Dado falso na tela é o pior caso: o
  usuário não distingue amostra de fato.

## Comportamento por faixa

| Faixa | Ajuste |
|---|---|
| Mobile 320–767 | Altura mínima menor; frase em até duas linhas; ação em largura total |
| Tablet 768–1023 | Igual ao desktop; em grade de dois blocos, a altura dos dois se iguala |
| Desktop 1024+ | Altura mínima próxima à do conteúdo cheio, para a grade não saltar |

A frase **quebra em duas linhas em vez de truncar**. Reticências num texto de vazio escondem
justamente a explicação que ele existe para dar.

## Acessibilidade

- O vazio que **substitui conteúdo carregado dinamicamente** é anunciado: a região recebe
  `aria-live="polite"`, ou a contagem de resultados é atualizada em região viva. Troca silenciosa
  deixa quem usa leitor de tela sem saber que o filtro zerou a lista.
- O ícone é `aria-hidden="true"`; a frase é o conteúdo real.
- Contraste do texto de vazio segue o mínimo de
  [`acessibilidade-responsivo`](../../.ai/skills/acessibilidade-responsivo/SKILL.md). `text-texto-suave`
  é suave, não ilegível.

## Regras

- **Toda superfície de dados tem vazio projetado.** Sem exceção.
- **Vazio, zero e erro são distintos** e nunca se substituem.
- **A frase explica a causa** e cita o recorte quando há um.
- **O cabeçalho do bloco permanece**; o card não desaparece.
- **A altura é preservada** para a grade não colapsar.
- **Vazio por filtro preserva os filtros** e oferece limpá-los.
- **Ação só quando o usuário pode resolver** o vazio agora.
- **Ilustração só no de tela**, uma por tela.
- **Sem dado de exemplo**, sem frase motivacional, sem decoração.

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| "Sem dados disponíveis" em todos os blocos | Frase genérica reaproveitada | Frase que cita entidade e recorte |
| Grade salta quando os dados chegam | Vazio sem altura mínima | `min-h-*` próximo à altura cheia |
| Card some por inteiro quando vazio | Cabeçalho renderizado só com dados | Cabeçalho sempre; só o corpo troca |
| Usuário acha que perdeu os dados ao filtrar | Filtros escondidos no vazio | Filtros visíveis + limpar |
| `0` exibido quando a consulta falhou | Erro tratado como vazio | Erro é erro — ver [stat.md](stat.md) |
| Quatro ilustrações numa grade de quatro cards | Escala errada de empty state | Compacto no card, ilustrado só na tela |
| Leitor de tela não percebe que a lista zerou | Troca sem região viva | `aria-live` na região ou na contagem |
| Botão "Começar" num vazio sem saída | Ação que não resolve o vazio | Sem ação, ou ação que cria a entidade |
