# Regras de negócio

> **Template do boilerplate.** Preencha ao implementar e remova este aviso.

## O que é uma regra de negócio aqui

Uma afirmação do negócio que o sistema precisa garantir **sempre**, independentemente de por onde a
operação entrou. Se a afirmação só vale "quando o usuário usa a tela", não é regra de negócio: é
conveniência de interface.

Essa distinção decide onde a regra mora.

## Regra fixa do boilerplate — a regra é garantida no domínio

**Toda regra de negócio é garantida no `Core`, no agregado, e não apenas validada na tela.**

A validação de tela existe e é bem-vinda — ela dá feedback rápido e evita ida ao servidor. Mas ela é
**redundância de conveniência**, nunca a garantia. Formulário pode ser burlado, importação em lote
não passa por tela, job de madrugada não tem usuário, e a próxima integração vai chamar o serviço
direto. A única barreira que resiste a todos esses caminhos é o construtor e os métodos de mutação do
agregado, que se recusam a produzir estado inválido.

Consequência de desenho: se a regra é impossível de expressar no agregado, quase sempre a fronteira
do agregado está errada — não é motivo para movê-la para o Controller.

O agregado expõe a regra de duas formas:

- **Invariante** — lançada como exceção de domínio na operação que a violaria, com a mensagem em
  constante pública (`Msg<Campo>Obrigatorio`), para o teste asseverar sem duplicar string.
- **Propriedade de decisão** — `Eh<Condicao>` calculada, para o serviço consultar sem reimplementar
  a regra.

## Regra fixa do boilerplate — o identificador `RN-*` vive só na documentação

O identificador (`RN-1`, `RN-COBRANCA-4`) existe para **rastreabilidade entre documentos e
conversas**: permite dizer "quebrei a RN-7" sem repetir o enunciado inteiro.

Ele **nunca** aparece em código, mensagem de erro, constante, view, TypeScript, log ou nome/assert de
teste. Mensagem de erro descreve o quê e o porquê em linguagem de domínio — o usuário não conhece a
numeração da nossa documentação, e o identificador cria acoplamento frágil entre a numeração da doc
e o runtime.

O identificador é **estável**: uma vez atribuído, não é reaproveitado nem renumerado. Regra revogada
fica registrada como revogada, com data e motivo — nunca some da lista, senão a referência histórica
em PRs e commits antigos aponta para outra coisa.

Não confundir com dados reais do negócio (número de contrato, código de norma externa, centro de
custo), que são domínio legítimo e devem ser preservados no código.

### Um identificador, dois lugares

`RN-*` neste documento e `regra-<feature>-<n>.md` em [../features/](../features/README.md) são **o
mesmo sistema de identificação**, com papéis distintos: aqui fica o índice e a autoridade da
numeração; lá fica o texto completo da regra, onde ela nasce junto da feature. O `<n>` do nome do
arquivo é o número do id.

Nunca crie uma numeração paralela por feature. Duas listas de regra com numerações independentes
tornam impossível responder "a RN-4 é qual?" — que é a única coisa que o identificador existe para
resolver. A regra completa do vínculo está em [../features/README.md](../features/README.md).

## Formato de uma regra

*Cada regra recebe uma seção própria com os seis blocos abaixo. Bloco vazio é sinal de que a regra
não foi entendida, não de que "não se aplica" — escreva "nenhuma" explicitamente quando for o caso.*

| Bloco | O que escrever | Critério |
|---|---|---|
| **Enunciado** | Uma frase imperativa, no presente, sem condicional vago | Alguém do negócio lê e concorda ou discorda; "deve ser adequado" não é enunciado |
| **Por quê / origem** | A razão e a fonte: decisão comercial, exigência legal, limitação operacional | Sem origem, ninguém consegue julgar se a regra ainda vale daqui a um ano |
| **Casos que viram teste** | Entradas concretas e o resultado esperado, **incluindo os dois lados do limite** | Se o limite é 30 dias, tem caso de 30 e caso de 31; um lado só não prova a fronteira |
| **Exceções** | Quem escapa da regra e sob qual condição | Exceção não escrita vira `if` inexplicado no código seis meses depois |
| **Impacto** | Qual agregado garante a invariante, e qual método a aplica | É o que liga a regra ao código — sem isso a regra é literatura |
| **Situação** | Vigente, planejada ou revogada (com data e motivo) | Regra revogada permanece na lista; o identificador nunca é reaproveitado |

## Índice das regras

*Uma linha por regra vigente ou revogada. Ordene pelo identificador, não por relevância — a lista
serve para localizar, e a numeração é o que se cita em PR e commit.*

**Este índice é a autoridade da numeração, e o texto completo da regra vive no `rules/` da feature.**
Não são dois sistemas de identificador: `RN-7` aqui e `regra-pedido-2.md` na feature são a mesma regra,
e o `<n>` do nome do arquivo é o número do id dentro da feature. A coluna "Detalhe" torna o vínculo
navegável nas duas direções; a regra completa desse acoplamento está em
[../features/README.md](../features/README.md). Regra que não pertence a nenhuma feature — invariante
de cadastro global, por exemplo — é detalhada aqui mesmo, e a coluna fica com "neste documento".

| Id | Enunciado resumido | Agregado que garante | Detalhe | Situação |
|---|---|---|---|---|
| *(exemplo — substituir)* RN-1 | Pedido confirmado tem ao menos um item e congela o preço praticado | `Pedido` | [regra-pedido-1](../features/confirmacao-pedido/rules/regra-pedido-1.md) e neste documento | Vigente |
| *(exemplo — substituir)* RN-3 | Pedido cancelado não recebe item novo, não é confirmado nem faturado | `Pedido` | [regra-pedido-3](../features/confirmacao-pedido/rules/regra-pedido-3.md) | Vigente |
| *(exemplo — substituir)* RN-4 | Quantidade de item e preço de produto são maiores que zero | `Pedido`, `Produto` | neste documento | Vigente |
| *(exemplo — substituir)* RN-5 | O mesmo produto não aparece em dois itens do mesmo pedido | `Pedido` | neste documento | Vigente |
| *(exemplo — substituir)* RN-6 | Código de produto é único no catálogo do contratante | `Produto` | neste documento | Vigente |
| *(exemplo — substituir)* RN-7 | Produto inativo não entra em pedido novo nem permite confirmação | `Produto`, `Pedido` | [regra-pedido-2](../features/confirmacao-pedido/rules/regra-pedido-2.md) | Vigente |

## Exemplo de regra detalhada — substituir

### RN-1 — Pedido confirmado tem ao menos um item, e o preço é congelado na confirmação

*Esta é a **mesma** regra de
[../features/confirmacao-pedido/rules/regra-pedido-1.md](../features/confirmacao-pedido/rules/regra-pedido-1.md),
reproduzida aqui porque este documento também precisa de um exemplo detalhado do formato. **Num
projeto real, escolha um lugar:** regra que pertence a uma feature é detalhada no `rules/` dela, e
esta seção fica só para regra que não tem feature. Duas cópias do mesmo texto divergem — é questão de
tempo.*

**Enunciado.** A confirmação de um pedido exige ao menos um item, e copia para cada item o preço de
venda vigente do produto naquele instante. Alteração posterior do preço de catálogo não altera pedido
já confirmado.

**Por quê / origem.** Decisão comercial de 2026-03, registrada na ata de definição do fluxo de vendas.
São duas exigências com a mesma origem e o mesmo momento de aplicação, por isso uma regra só: o
contratante precisa poder reajustar o catálogo sem que o histórico de pedidos mude de valor
retroativamente — o que seria, na prática, reescrever o que já foi combinado com o comprador. Pedido
confirmado sem item é o outro lado da mesma decisão: o instante da confirmação é o único em que o
sistema tem o que congelar.

**Casos que viram teste.**

| Cenário | Entrada | Resultado esperado |
|---|---|---|
| Sem itens | Pedido em rascunho, zero itens, `Confirmar` | Recusado, `MsgPedidoSemItem`; permanece em rascunho |
| No limite | Pedido em rascunho, **exatamente um** item, `Confirmar` | Confirmado — um item já satisfaz a regra |
| Vários itens | Pedido com três itens, `Confirmar` | Confirmado; os três recebem o preço vigente |
| Preço congelado | Item confirmado a 10,00; produto reajustado para 12,00 | O item continua 10,00; o total do pedido não muda |
| Preço do rascunho não congela | Item adicionado a 10,00; produto vai a 12,00; **depois** `Confirmar` | O item vale 12,00 — o congelamento é na confirmação, não na inclusão |
| Todos os itens removidos | Pedido em rascunho com um item; item removido; `Confirmar` | Recusado, `MsgPedidoSemItem` |
| Já confirmado | Pedido confirmado, `Confirmar` de novo | Recusado; confirmação não é idempotente por decisão — repetição indica erro de fluxo |

*O quinto caso é o que separa esta regra de uma versão ingênua dela. "O preço é o do produto" e "o
preço é congelado" só divergem no rascunho de vida longa — e é lá que o defeito aparece em produção.*

**Exceções.** Nenhuma. Não há pedido confirmado sem item, e não há recálculo retroativo de preço nem
por operação administrativa: corrigir um pedido confirmado é cancelá-lo e criar outro, preservando o
rastro do primeiro.

**Impacto.** `Pedido` garante a invariante. `Pedido.Confirmar` recusa a operação sem itens, com a
mensagem em `Pedido.MsgPedidoSemItem`, e é o único caminho que grava `ItemPedido.PrecoPraticado`.
`Pedido.EhConfirmavel` expõe a decisão para a tela habilitar ou não o botão, sem reimplementar a
regra. `PrecoPraticado` tem apenas setter privado e nenhum método público o altera — a imutabilidade
é estrutural, não uma convenção de uso.

O preço de origem vem de `Produto.PrecoDeVenda`, e `Produto` é agregado **distinto**: quem lê o preço
e o repassa é o serviço, não o `Pedido`. Ambos vivem no schema do cliente, então nenhuma fronteira de
schema é atravessada aqui — ver [aggregates.md](aggregates.md).

**Situação.** Vigente.

## Manutenção

- Regra alterada é alterada aqui **e** no agregado, na mesma entrega — doc e código divergentes
  significam que ninguém sabe qual vale.
- Regra sem teste correspondente é uma intenção, não uma garantia; o caso de limite é o teste que
  mais frequentemente falta.
- Ao revogar, mantenha a seção com `Situação: Revogada em <data> — <motivo>` e remova o código que a
  aplicava na mesma entrega.
- Regra nova de uma feature entra **no `rules/` da feature e nesta tabela**, na mesma entrega. Arquivo
  em `rules/` que não está no índice é regra que ninguém encontra; linha no índice sem arquivo (nem
  seção detalhada aqui) é enunciado resumido sem casos de teste, que não é regra.
