# Glossário do domínio

> **Template do boilerplate.** Preencha ao implementar e remova este aviso.

## Por que existe um glossário

Sinônimo divergente é a forma mais barata de introduzir defeito. Quando o negócio diz "pedido", o
código diz `Order`, o banco diz `venda` e a tela diz "solicitação", ninguém consegue afirmar com
certeza se são o mesmo conceito — e a resposta muda de conversa para conversa. O prejuízo não é
estético: um refactor deixa metade dos casos para trás, uma regra é aplicada em um dos nomes e não no
outro, e a pergunta "isso já está implementado?" passa a exigir arqueologia.

Neste produto o glossário tem uma segunda função, mais séria: **ele é onde a fronteira de isolamento
entre contratantes fica declarada em vocabulário.** Um termo cujo lado da fronteira ninguém sabe dizer
é um termo que vai ser mapeado errado — ver a seção sobre o homônimo "Cliente", adiante.

O glossário resolve isso fixando **um nome por conceito** e proibindo os demais. Ele é o contrato de
vocabulário entre negócio, documentação e código.

## Regra fixa do boilerplate

**O termo do negócio é o nome no código.** Identificadores de domínio, pastas de feature,
controllers, actions, ViewModels e DTOs ficam no idioma do negócio — sem tradução, sem abreviação e
sem "versão técnica" do termo. Não existe `OrderAggregate` para o que o negócio chama de "Pedido".

O que **não** acompanha o idioma do negócio, por serem contrato externo ou de infraestrutura:

| Elemento | Idioma | Observação |
|---|---|---|
| Identificadores de domínio, pastas, controllers, actions, ViewModels, DTOs | Idioma do negócio | O termo desta tabela, literal |
| Rotas HTTP | Inglês, kebab-case | Contrato externo — ver [../api/conventions.md](../api/conventions.md) |
| Chaves de configuração e variáveis de ambiente | Inglês | `Secao__Chave` |
| Documentação, `<summary>` e textos de interface | Idioma do negócio | Mesmo termo da tabela |

Consequência prática: um termo renomeado aqui é um refactor no código, não uma nota de rodapé. Se o
negócio abandona uma palavra, ela sai do glossário **e** sai do código na mesma entrega.

## Como preencher

*Uma linha por conceito que o negócio nomeia. Só entra o que tem significado próprio — se a definição
é "um cliente, mas do outro tipo", provavelmente é um estado ou um enum, não um termo.*

*A coluna "Como aparece no código" é o que amarra o glossário à implementação: aponte o artefato real
(classe, enum, propriedade), não uma paráfrase. Se ainda não existe código, escreva o nome planejado
e volte para corrigir quando existir.*

*Registre os termos proibidos junto da definição — é o que impede o sinônimo de voltar pela porta dos
fundos.*

*A coluna "Categoria" repete a distinção do [ADR-003](../decisions/ADR-003-isolamento-multi-schema.md)
porque ela é vocabulário antes de ser infraestrutura: dizer "Pedido" e dizer "Cliente" são falas sobre
lados diferentes da fronteira de isolamento, e confundir os dois é o defeito mais caro que este
produto admite.*

| Termo | Categoria | Definição | Como aparece no código |
|---|---|---|---|
| *(exemplo — substituir)* Pedido | `Cliente (schema próprio)` | Intenção de compra registrada por um Usuário, composta de Itens, que percorre rascunho → confirmado → faturado. **Não usar:** ordem, order, venda, OS. | `Core/Models/Aggregates/Pedido/Pedido.cs` |
| *(exemplo — substituir)* Item do pedido | `Cliente (schema próprio)` | Linha de um Pedido: um Produto, uma quantidade e o preço praticado no momento da confirmação. Não existe fora de um Pedido. **Não usar:** linha, item de venda, line item. | `Core/Models/Aggregates/Pedido/ItemPedido.cs` |
| *(exemplo — substituir)* Produto | `Cliente (schema próprio)` | Item do catálogo do contratante, com código único, preço de venda e situação. **Não usar:** SKU, mercadoria, artigo. | `Core/Models/Aggregates/Produto/Produto.cs` |
| *(exemplo — substituir)* Preço praticado | `Cliente (schema próprio)` | Valor efetivamente cobrado por um Item, copiado do Produto na confirmação e imutável depois. Distinto do preço de catálogo, que muda. **Não usar:** valor unitário, preço final. | `ItemPedido.PrecoPraticado`, tipo `Dinheiro` |
| *(exemplo — substituir)* Situação do pedido | `Cliente (schema próprio)` | Estado do Pedido no seu ciclo: em rascunho, confirmado, faturado, concluído, cancelado. | `Core/Enums/SituacaoPedido.cs`, persistido como string |
| *(exemplo — substituir)* Cliente | `Global (schema compartilhado)` | Empresa contratante do produto. **É o dono de um schema** — o próprio limite de isolamento, não uma linha filtrada. **Não usar:** assinante, tenant, locatário, conta. | `Core/Models/Aggregates/Cliente/Cliente.cs`, schema explícito via `SchemaConsts.Compartilhado` |
| *(exemplo — substituir)* Usuário | `Global (schema compartilhado)` | Pessoa física que autentica no sistema, vinculada a um ou mais Clientes. O vínculo é o que define qual schema a sessão alcança. **Não usar:** login, conta, membro. | `Core/Models/Aggregates/Cliente/Usuario.cs`, schema explícito |

## Termos ambíguos e homônimos

*Liste aqui as palavras que o negócio usa com mais de um significado dependendo da área, e diga qual
significado o código adota. Homônimo não resolvido vira bug de interpretação — alguém implementa o
outro sentido.*

*Quando os dois sentidos são legítimos, o correto não é escolher um: é qualificar ambos ("Contrato
comercial" vs. "Contrato de serviço") e registrar os dois no glossário como termos distintos.*

### "Cliente" — o homônimo que precisa estar resolvido antes da primeira entidade

*(exemplo — substituir, mas **a resolução é fixa pelo boilerplate**)*

A palavra "cliente" tem dois sentidos legítimos em qualquer SaaS B2B, e trocá-los é a origem do
vazamento entre contratantes que o [ADR-003](../decisions/ADR-003-isolamento-multi-schema.md) chama de
"o pior incidente possível neste produto":

| Sentido | Quem fala assim | Como o código nomeia | Onde vive |
|---|---|---|---|
| A empresa que **contrata o nosso produto** | Nosso time comercial, nosso financeiro | `Cliente` | Schema compartilhado |
| A pessoa ou empresa que **compra do nosso contratante** | O usuário do produto, dentro da tela dele | *(exemplo — substituir)* `Comprador` | Schema do cliente |

**A regra:** `Cliente`, sem qualificação, é sempre o **contratante** — o dono do schema. O cliente do
nosso cliente recebe **outro nome** (`Comprador`, `Sacado`, `Paciente`, o que o negócio usar), nunca
`ClienteFinal` nem `Cliente` com um `TipoCliente` distinguindo os dois.

O motivo é concreto: se as duas coisas dividem o nome, alguém eventualmente escreve
`Pedido.IdCliente` querendo dizer "o comprador" e, na revisão seguinte, outra pessoa lê aquilo como
"o contratante" e conclui que existe uma coluna discriminadora de tenant. A partir daí o isolamento
passa a parecer opcional. Um nome por conceito não é preciosismo aqui — é a barreira que impede a
alternativa descartada de voltar por engano.

## Termos deliberadamente fora do domínio

*Vocabulário que aparece em conversa mas não vira código — jargão de mercado, nome de ferramenta,
apelido interno. Registrar o que foi rejeitado evita que a discussão se repita a cada sprint.*

## Manutenção

- Termo novo entra no glossário **na mesma entrega** que o código que o usa.
- Termo renomeado pelo negócio é renomeado no código; a linha antiga vira "**Não usar**" na definição
  do termo novo, por pelo menos um ciclo, para quem ler documentação antiga se reencontrar.
- Divergência entre glossário e código é defeito do código ou do glossário — nunca "as duas coisas
  estão certas".
