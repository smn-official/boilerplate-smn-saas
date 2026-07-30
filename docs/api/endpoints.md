# Inventário de endpoints

> **Template do boilerplate.** Preencha ao implementar e remova este aviso.

## O que este documento responde

Toda a superfície HTTP publicada, num lugar só. Serve a duas perguntas que aparecem sempre: "existe
rota para isso?" e — mais importante — "quem consegue chamar isso?". A segunda é a razão de o
inventário existir: rota sem dono declarado é a forma mais comum de broken access control, e ela só
fica visível quando todas as rotas estão listadas lado a lado.

Convenções de rota, verbo e model binding estão em [conventions.md](conventions.md); formato e
mapeamento de erro, em [errors.md](errors.md). Aqui vai apenas o inventário.

## Regras fixas que a tabela pressupõe

Não repita estas linhas em cada endpoint — elas valem para todos:

- Rota em **inglês, kebab-case**; nome de Controller e action no **idioma do negócio**.
- Controllers de negócio são **`[Authorize]` por padrão**; a coluna "Permissão" registra o que
  restringe **além** disso, e `Anônimo` é sempre exceção explícita.
- Toda ação de escrita é `POST` com **`[ValidateAntiForgeryToken]`**.
- `CancellationToken` é o último parâmetro de toda action assíncrona.
- Rota de preview ou diagnóstico é `[AllowAnonymous]` **com guarda de ambiente** retornando `404`
  fora de Development — e aparece na tabela marcada como tal.

## Como preencher

*Uma linha por endpoint, agrupado por feature. A tabela é gerada por leitura dos Controllers, não de
memória — endpoint que existe no código e não está aqui é exatamente o que este documento deveria ter
pego.*

| Coluna | O que escrever | Critério |
|---|---|---|
| **Método** | `GET` ou `POST` | Leitura nunca é `POST`; escrita nunca é `GET` |
| **Rota** | O caminho completo publicado, com parâmetros | Copiado do atributo, não reconstruído mentalmente |
| **O que faz** | Uma frase, em linguagem de negócio | Se precisa de duas frases, provavelmente são dois endpoints |
| **Permissão** | O **papel** exigido, e o vínculo com o dono do recurso **dentro** do contratante | "Autenticado" sozinho não é permissão — qual papel, e vale para recurso de qualquer colega? |
| **Regras aplicadas** | Os `RN-*` exercitados | Vazio é resposta válida para leitura simples; suspeito em escrita |

*Sobre a coluna Permissão: ela registra **autorização** — quem pode chamar —, não filtro de linha. O
item que mais escapa é o **vínculo dentro do contratante**: "Vendedor" não diz se aquele vendedor pode
abrir o pedido de outro vendedor da mesma empresa, e essa é a verificação que precisa existir no
serviço.*

### O isolamento entre contratantes não é responsabilidade da query

**Nenhuma linha desta tabela precisa dizer "apenas os do próprio cliente", e escrever isso é defeito.**

Dado de outro contratante não é filtrado: ele está em **outro schema do PostgreSQL**, e a conexão da
requisição resolve o `search_path` a partir da claim emitida no login — decisão do
[ADR-003](../decisions/ADR-003-isolamento-multi-schema.md), detalhada na skill
[multi-schema](../../.ai/skills/multi-schema/SKILL.md). A consulta não alcança o dado do outro
contratante nem se quiser; ela nem encontra a tabela.

Por que a distinção importa nesta tabela, e não é preciosismo de redação:

- **"Apenas os do próprio cliente" descreve a alternativa que o ADR-003 descartou** — coluna
  discriminadora com filtro global de consulta. Quem lê o inventário e implementa o que está escrito
  constrói justamente o modo de falha que a decisão existe para evitar: um `IgnoreQueryFilters()` ou
  um `FromSql` esquecido vaza dado entre contratantes **sem erro algum**.
- **Confunde onde a auditoria deve olhar.** Se a coluna sugere que o isolamento é da query, revisar o
  isolamento passa a significar reler toda consulta do sistema. Com schema, a pergunta "o contratante
  A alcança dado do B?" se responde olhando `GRANT` e o interceptor — em um lugar, não em quarenta.
- **Esconde a permissão que realmente falta ser escrita.** O que a coluna precisa registrar é o papel
  e o vínculo **intra**-contratante. É aí que existe IDOR de verdade neste produto, e é o que fica
  invisível quando a célula se gasta declarando um filtro que não existe.

O que **ainda** vale escrever na coluna: `Anônimo`, papel exigido (`Supervisor`), e o vínculo com o
dono quando ele restringe dentro do contratante ("o pedido deve ser do próprio vendedor").

## Inventário

### Pedidos *(exemplo — substituir)*

| Método | Rota | O que faz | Permissão | Regras aplicadas |
|---|---|---|---|---|
| `GET` | `/orders` | Lista os pedidos | Vendedor (vê os próprios); Supervisor (vê todos) | — |
| `GET` | `/orders/new` | Abre o formulário de novo pedido | Vendedor | — |
| `GET` | `/orders/edit?id={id}` | Abre o pedido em rascunho para edição | Vendedor, apenas o próprio pedido; Supervisor, qualquer um | — |
| `POST` | `/orders/items/save` | Inclui ou altera um item do pedido | Vendedor, apenas o próprio pedido; Supervisor, qualquer um | RN-3, RN-4, RN-5, RN-7 |
| `POST` | `/orders/confirm` | Confirma o pedido e congela os preços praticados | Vendedor, apenas o próprio pedido; Supervisor, qualquer um | RN-1, RN-3, RN-7 |
| `POST` | `/orders/cancel` | Cancela o pedido | Supervisor | RN-3 |

### Produtos *(exemplo — substituir)*

| Método | Rota | O que faz | Permissão | Regras aplicadas |
|---|---|---|---|---|
| `GET` | `/products` | Lista o catálogo do contratante | Vendedor, Supervisor | — |
| `POST` | `/products/save` | Cria ou atualiza um produto do catálogo | Supervisor | RN-4, RN-6 |
| `POST` | `/products/deactivate` | Inativa o produto, sem removê-lo do histórico | Supervisor | RN-7 |

*Repare que nenhuma célula de Permissão menciona contratante, cliente, tenant ou schema — pela razão
da seção anterior. As duas tabelas são de entidades que vivem no **schema do cliente**
(`Cliente (schema próprio)` em [../domain/aggregates.md](../domain/aggregates.md)), e é a conexão que
as delimita.*

## Endpoints anônimos

*Seção separada de propósito. Toda rota sem autenticação é decisão consciente e precisa de
justificativa escrita — é a lista que uma auditoria lê primeiro. Inclua aqui login, callback de
integração, webhook, health check e páginas públicas.*

| Método | Rota | O que faz | Por que é anônima | Proteção que substitui a autenticação |
|---|---|---|---|---|
| *(exemplo — substituir)* `POST` | `/auth/sign-in` | Autentica por e-mail e código de uso único | Precede a sessão | Limite de tentativas; resposta idêntica para usuário inexistente |
| *(exemplo — substituir)* `POST` | `/webhooks/payments` | Recebe eventos do provedor de pagamento | Chamado por terceiro | Verificação de assinatura do payload; idempotência por id do evento; sem antiforgery, por não ser formulário |

*Webhook é o caso que mais foge do padrão: não tem antiforgery, não tem sessão, e a autenticidade vem
da assinatura criptográfica do corpo. Registre isso explicitamente para ninguém "consertar"
adicionando `[Authorize]` e derrubar a integração.*

## Endpoints restritos a Development

*Rotas de preview, diagnóstico ou seed. Cada uma precisa de guarda de ambiente no código — o atributo
`[AllowAnonymous]` sozinho publica a rota em produção. Se a lista estiver vazia, escreva "nenhuma":
seção vazia é ambígua.*

## Manutenção

- Endpoint novo entra na tabela **na mesma entrega** que o Controller.
- Rota removida sai daqui e some do código junto — inventário com rota morta faz duvidar do resto.
- Mudança de permissão é mudança de inventário, mesmo quando o código muda uma linha só: é
  exatamente essa linha que a auditoria procura.
- Célula de Permissão que fale de "próprio cliente", "próprio contratante", "tenant" ou schema é sinal
  de que alguém está descrevendo filtro de linha onde deveria descrever papel — corrija a célula e
  confira se o código não implementou o filtro de fato.
