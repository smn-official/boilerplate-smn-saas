# Confirmação de pedido

*(exemplo — substituir; esta pasta inteira é molde)*

**Status:** entregue
**Atualizado em:** 2026-07-30

> **Molde do boilerplate.** Esta pasta existe para ser copiada e reescrita, não para ser lida como
> especificação de um produto real. O domínio — `Pedido`, `ItemPedido`, `Produto` — é o mesmo exemplo
> de [../../domain/aggregates.md](../../domain/aggregates.md), para que o molde e o resto da
> documentação contem a mesma história. Ao criar a sua primeira feature: copie a pasta, renomeie,
> apague este bloco e o marcador do título.

## O que é

A transição de um pedido de rascunho para confirmado, que congela o preço de cada item no valor
vigente do catálogo naquele instante.

## Por que existe

Quem sofre é o **vendedor**, e depois o **supervisor** que precisa explicar a diferença ao comprador.

Hoje, sem a confirmação como passo próprio, o pedido é uma lista viva: o vendedor monta o pedido com o
comprador ao telefone, combina um total, e o supervisor reajusta o catálogo à tarde. Quando alguém abre
aquele pedido no dia seguinte, o total é outro — e ninguém sabe qual dos dois valores foi o combinado.
A prática atual é o vendedor anotar o total num caderno ou tirar um print da tela, o que só transfere o
problema para um lugar onde ele não pode ser auditado.

A confirmação resolve criando um instante em que o preço deixa de ser "o do catálogo" e passa a ser "o
que foi combinado". É por isso que a feature existe, e é o que qualquer refactor precisa preservar:
**pedido confirmado não muda de valor.**

## Fluxo principal

1. O vendedor abre um pedido em rascunho, com seus itens já incluídos.
2. O vendedor aciona a confirmação.
3. O sistema verifica que o pedido tem ao menos um item.
4. O sistema verifica que todos os produtos referenciados continuam disponíveis para venda.
5. O sistema copia o preço de venda vigente de cada produto para o item correspondente.
6. O sistema passa o pedido para confirmado e calcula o total a partir dos preços copiados.
7. O sistema exibe o pedido confirmado, com o total e a data da confirmação.

## Fluxos alternativos e falhas

| Condição | Desfecho |
|---|---|
| Pedido sem nenhum item (`RN-PEDIDO-1`) | Recusado; o pedido permanece em rascunho e a tela informa que é preciso incluir ao menos um item |
| Pedido já confirmado (`RN-PEDIDO-1`) | Recusado; a tela informa a situação atual. Nenhuma escrita ocorre — é o que impede um duplo clique de reescrever os preços já congelados |
| Pedido cancelado (`RN-PEDIDO-3`) | Recusado; nenhuma escrita ocorre |
| Produto de algum item foi inativado desde a inclusão (`RN-PEDIDO-2`) | Recusado; a tela aponta **qual** item bloqueia e oferece removê-lo. Recusar sem dizer qual item obriga o vendedor a adivinhar |
| Preço do produto mudou entre a inclusão do item e a confirmação | **Não é falha.** O pedido confirma com o preço novo — o congelamento é na confirmação, não na inclusão. A tela mostra o total recalculado antes de pedir a confirmação |
| Pedido de outro vendedor, ator sem papel de Supervisor | "Não encontrado"; nenhuma escrita ocorre |
| Falha ao gravar (indisponibilidade do banco) | Nada é confirmado; o pedido continua em rascunho, íntegro. A tela mostra erro genérico com identificador de correlação |

*A penúltima linha é a que mais falta em documento de feature: o caso que **parece** falha e não é. Sem
ela, alguém "corrige" a feature travando a confirmação quando o preço mudou, e quebra o fluxo normal
de todo pedido que passou a noite em rascunho.*

## Regras de negócio

| Id | Enunciado resumido | Arquivo |
|---|---|---|
| `RN-PEDIDO-1` | Pedido confirmado tem ao menos um item, e o preço é congelado na confirmação | [rules/regra-pedido-1.md](rules/regra-pedido-1.md) |
| `RN-PEDIDO-2` | Produto inativo não entra em pedido novo nem permite confirmação | [rules/regra-pedido-2.md](rules/regra-pedido-2.md) |
| `RN-PEDIDO-3` | Pedido cancelado não recebe item novo nem é confirmado nem é faturado | [rules/regra-pedido-3.md](rules/regra-pedido-3.md) |

*As três estão indexadas em [../../domain/business-rules.md](../../domain/business-rules.md), que é a
autoridade da numeração. O `<n>` do arquivo é o número do id — a regra está em
[../README.md](../README.md).*

## Dados

| Entidade | Categoria | Papel nesta feature | Dado pessoal |
|---|---|---|---|
| `Pedido` | `Cliente (schema próprio)` | Raiz alterada: situação, data de confirmação e total | Não |
| `ItemPedido` | `Cliente (schema próprio)` | Entidade interna: recebe `PrecoPraticado` na confirmação | Não |
| `Produto` | `Cliente (schema próprio)` | Apenas lido, para obter o preço vigente e a situação | Não |
| `Usuario` | `Global (schema compartilhado)` | Apenas o identificador, registrado como autor da confirmação | Sim — nome e e-mail, **fora** desta feature |

**Sobre a última linha.** `Pedido` guarda `IdUsuarioConfirmou`, um identificador puro — sem navegação
e sem cópia de nome ou e-mail. Duas razões que se somam:

- **Fronteira de schema.** `Usuario` vive no schema compartilhado e `Pedido` no schema do cliente. Uma
  navegação exigiria `JOIN` entre schemas, e o schema do lado do cliente varia por requisição — o
  modelo do EF Core deixaria de ser único ([ADR-003](../../decisions/ADR-003-isolamento-multi-schema.md)).
- **Minimização.** Copiar nome e e-mail para dentro do pedido cria uma segunda cópia de dado pessoal,
  com prazo de retenção próprio e um dever de correção que ninguém vai cumprir. Exibir "confirmado por
  Maria" é consulta ao contexto compartilhado no momento da leitura, não dado gravado no pedido.

**Isolamento.** Nenhuma entidade desta feature tem coluna de contratante, e nenhuma consulta filtra
por ele. Os dados do contratante são os que estão no schema resolvido pela conexão. Se esta feature
parecer precisar de um `IdCliente`, a leitura correta é
[o ADR-003](../../decisions/ADR-003-isolamento-multi-schema.md), não uma coluna nova.

## Permissões

| Ator | Pode | Desfecho quando não pode |
|---|---|---|
| Vendedor, no próprio pedido | Confirmar | — |
| Vendedor, em pedido de outro vendedor | Não | `404` "não encontrado", sem revelar que o pedido existe |
| Supervisor | Confirmar qualquer pedido do contratante | — |
| Autenticado sem papel de venda | Não | `403` |
| Não autenticado | Não | Redirect para login |

*A verificação que vira teste é a segunda linha* — vendedor contra pedido de colega, dentro do mesmo
contratante. É a única barreira desta lista que é código do serviço. Papel vem do atributo de
autorização; isolamento entre contratantes vem do schema e não aparece aqui, por decisão
([ADR-003](../../decisions/ADR-003-isolamento-multi-schema.md), e
[../../api/endpoints.md](../../api/endpoints.md) sobre por que a palavra "contratante" não entra na
coluna de permissão).

## Fora de escopo

- **Editar pedido confirmado.** Corrigir é cancelar e criar outro, preservando o rastro do primeiro.
  Custa mais ao vendedor, e é deliberado: pedido confirmado editável derruba a razão de a feature
  existir.
- **Desconto no item ou no pedido.** O preço praticado é o do catálogo, sem exceção. Desconto exige
  política de alçada — quem pode dar quanto — e isso é uma feature própria, não um campo a mais aqui.
- **Reserva de estoque na confirmação.** Confirmar não reserva nada. A decisão dói: dois vendedores
  podem confirmar o mesmo item escasso. Foi aceita porque estoque ainda não é modelado, e resolver
  isso pela metade seria pior que não resolver.
- **Faturamento.** Confirmar e faturar são transições distintas, com atores e regras distintos.

## Decisões em aberto

| Pergunta | Dono | Suposição em uso |
|---|---|---|
| Confirmação de pedido acima de um valor limite exige aprovação de supervisor? | Dono do produto | **Não exige.** Qualquer vendedor confirma qualquer valor. Se passar a exigir, é `RN-PEDIDO-4`, não alteração da `RN-PEDIDO-1` |
| O comprador recebe e-mail na confirmação? | Dono do produto | **Não recebe.** Nenhum e-mail é disparado. Se passar a receber, a falha de envio não desfaz a confirmação — ver a skill [email-transacional](../../../.ai/skills/email-transacional/SKILL.md) |
