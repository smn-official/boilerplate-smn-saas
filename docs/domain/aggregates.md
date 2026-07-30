# Agregados

> **Template do boilerplate.** Preencha ao implementar e remova este aviso.

## O que este documento responde

Quais são as unidades de consistência do domínio, o que cada uma protege e até onde vai a sua
fronteira. É o mapa que impede duas decisões caras: modelar um agregado gigante que precisa carregar
meio banco para executar uma operação, e espalhar a mesma invariante por três serviços porque nenhum
agregado assumiu a responsabilidade.

## Regras fixas do boilerplate

Valem para todo agregado, sem exceção. Não repita estas linhas em cada seção — elas são pressupostas.

- **O agregado não acessa banco nem conhece framework.** Sem repositório, sem `DbContext`, sem
  `HttpClient`, sem `ILogger`, sem `IHttpContextAccessor`. Vive em `Core`, que não referencia nenhum
  outro projeto da solução.
- **A invariante é garantida na API pública.** Construtor e cada método de mutação validam antes de
  alterar estado; não existe caminho público que produza estado inválido. Validação de tela é
  conveniência, nunca a garantia — ver [business-rules.md](business-rules.md).
- **Mutação só por método de intenção** (`Aprovar`, `Cancelar`, `Vincular…`). Propriedades com setter
  privado; coleções filhas em campo privado exposto como `IReadOnlyCollection<T>`.
- **Mensagens de validação em constantes públicas** (`Msg<Campo>Obrigatorio`), para o teste asseverar
  sem duplicar string. Nenhum identificador `RN-*` dentro dessas mensagens.
- **Construtor `protected` sem parâmetros** apenas para o ORM materializar.
- **Decisão de regra vira propriedade calculada** (`Eh<Condicao>`), para o serviço consultar sem
  reimplementar a regra.
- **Um agregado nunca altera outro.** Coordenação entre agregados é do serviço de domínio.
- **Referência entre agregados é por identificador** (`Pedido.IdProduto` em `ItemPedido`), não por
  navegação de objeto.
- **Referência que atravessa a fronteira de schema é obrigatoriamente por identificador.** Agregado
  do schema do cliente não navega para agregado do schema compartilhado — a navegação exigiria uma
  `JOIN` entre schemas e transformaria o modelo do EF Core em algo específico de um cliente. Ver
  [ADR-003](../decisions/ADR-003-isolamento-multi-schema.md) e a coluna **Categoria** do mapa
  abaixo.
- **Enum persistido é convertido para string** (`HasConversion<string>()`), na configuração de EF em
  `Data` — nunca como inteiro, para o dado do banco continuar legível e resistir a reordenação do
  enum.
- **Sinal de agregado grande demais:** uma operação exige carregar dezenas de entidades associadas,
  ou a classe tem vários motivos distintos para mudar.

## Como preencher

*Uma seção por agregado, sempre com os mesmos seis blocos. A ordem importa: raiz e fronteira primeiro
— são elas que justificam tudo o mais.*

| Bloco | O que escrever | Critério |
|---|---|---|
| **Raiz** | A classe por onde toda operação passa, e o tipo do `Id` | Se há dois pontos de entrada, há dois agregados |
| **Invariantes** | O que é sempre verdade sobre este agregado, com o `RN-*` correspondente | Cada invariante mapeia para um método que a recusa; se ninguém a recusa, ela não existe |
| **Entidades e Value Objects internos** | O que só faz sentido dentro desta fronteira | Entidade com ciclo de vida próprio não é interna — é outro agregado |
| **Fronteira transacional** | O que é salvo junto, numa única persistência | É a pergunta decisiva: "isso precisa ser consistente no mesmo instante?" |
| **Eventos** | O que o agregado comunica ao resto do sistema, e quem reage | Só liste eventos que existem; evento planejado é ruído |
| **Ciclo de vida** | Como nasce, quais estados assume, como termina | Estado sem transição de saída é vazamento de memória do negócio |

*Sobre a fronteira transacional: o critério não é "o que aparece junto na tela", é "o que precisa
estar consistente no mesmo instante". Se dois dados podem divergir por alguns segundos sem prejuízo,
provavelmente são agregados distintos e a coordenação é do serviço.*

## Mapa dos agregados

*Visão de uma linha por agregado, para localizar. Detalhe fica na seção de cada um.*

*A coluna **Categoria** não é rótulo informativo: ela declara em qual lado da fronteira de isolamento
o agregado vive, e essa declaração tem consequência direta no mapeamento de EF Core. Só há dois
valores possíveis, fixados pelo [ADR-003](../decisions/ADR-003-isolamento-multi-schema.md):*

| Categoria | Onde vive | Mapeamento em `Data` |
|---|---|---|
| `Cliente (schema próprio)` | No schema do cliente da sessão | **Sem** schema explícito — resolvido pelo `search_path` da conexão |
| `Global (schema compartilhado)` | No schema compartilhado, uma única cópia para todos | **Com** schema explícito, via `SchemaConsts.Compartilhado` |

*Não existe terceira categoria. Agregado sem categoria definida é agregado cujo mapeamento ninguém
sabe escrever.*

| Agregado | Categoria | Raiz | Fronteira transacional | Referencia |
|---|---|---|---|---|
| *(exemplo — substituir)* Pedido | `Cliente (schema próprio)` | `Pedido` | Pedido + itens do pedido | `IdProduto` (por item) |
| *(exemplo — substituir)* Produto | `Cliente (schema próprio)` | `Produto` | Produto | — |
| *(exemplo — substituir)* Cliente | `Global (schema compartilhado)` | `Cliente` | Cliente + vínculos de usuário | — |

*O `Cliente` aparece no mapa por ser um agregado real do produto — é o catálogo de contratantes e a
lista branca de schemas válidos. Ele **não** é o exemplo didático de agregado de negócio, e nenhum
agregado de negócio deve imitá-lo: ele é a única coisa que sabe que existem outros clientes.*

## Exemplo de agregado detalhado — substituir

### Pedido

**Categoria.** `Cliente (schema próprio)`. Mapeado **sem** schema explícito em
`Data/Configurations/PedidoConfiguration.cs`.

**Raiz.** `Pedido : AggregateRoot<int>`, em `Core/Models/Aggregates/Pedido/`.

**Invariantes.**

| Invariante | Onde é recusada | Regra |
|---|---|---|
| Pedido confirmado tem ao menos um item | `Confirmar` | RN-1 |
| Pedido cancelado não recebe item nem é faturado | `AdicionarItem`, `Faturar` | RN-3 |
| Quantidade de item é inteiro maior que zero | Construtor de `ItemPedido`, `AlterarQuantidade` | RN-4 |
| O mesmo produto não aparece em dois itens do pedido | `AdicionarItem` | RN-5 |

**Entidades e Value Objects internos.** `ItemPedido` (entidade — tem identidade dentro do pedido,
mas nenhum sentido fora dele: item órfão não é nada); `Dinheiro` (VO, valor e moeda validados na
construção, aritmética que recusa somar moedas diferentes).

**Fronteira transacional.** Pedido e seus itens são salvos numa única persistência — um item órfão ou
um total divergente da soma dos itens seriam estado inválido observável. `Produto` fica **fora** da
fronteira: é referenciado por `IdProduto` e coordenado pelo serviço. O critério é o de sempre —
alterar o preço de catálogo de um produto não pode exigir reescrever pedidos já confirmados, logo os
ciclos de vida são independentes.

**Referência que atravessa a fronteira de schema.** `Pedido` vive no schema do cliente; o `Cliente`
contratante que o "possui" vive no schema **compartilhado**. Repare no que o `Pedido` **não** tem:
nenhuma propriedade `IdCliente`, nenhuma navegação `Cliente`. E não é esquecimento — é a decisão do
[ADR-003](../decisions/ADR-003-isolamento-multi-schema.md):

- **O vínculo com o contratante não é dado do agregado, é a conexão.** O pedido está no schema do
  cliente; perguntar "de quem é este pedido?" se responde pelo schema em que ele está, não por uma
  coluna. Uma coluna discriminadora seria a alternativa que o ADR-003 descartou explicitamente,
  porque ela transforma o isolamento em filtro que alguém pode esquecer de aplicar.
- **Quando um agregado do schema do cliente precisa apontar para algo global** — o `Usuario` que
  registrou o pedido, por exemplo — a referência é **por identificador puro** (`IdUsuarioRegistrou`),
  nunca por navegação. Navegação exigiria uma `JOIN` entre schemas, e o schema do lado do cliente
  varia por requisição: o modelo do EF Core deixaria de ser único e passaria a existir um por cliente.
- **A consequência prática:** carregar o nome de quem registrou é uma consulta separada, ao contexto
  do schema compartilhado, coordenada pelo serviço. Parece trabalho a mais e é exatamente o preço do
  isolamento estrutural.

**Eventos.** Nenhum por enquanto. Quando existir, listar nome, o que carrega e quem reage.

**Ciclo de vida.** `EmRascunho` → `Confirmado` → (`Faturado`) → `Concluido`, com `Cancelado`
alcançável de `EmRascunho` e de `Confirmado`. `Cancelado` e `Concluido` são terminais; "reabrir" um
pedido cancelado cria um pedido novo, porque o histórico de faturamento do anterior não pode ser
reescrito. `SituacaoPedido` é persistida como string.

### Produto

**Categoria.** `Cliente (schema próprio)` — o catálogo de produtos é de cada contratante, não do
produto SaaS. Cliente excluído leva os produtos dele junto, que é o teste decisivo da skill
[multi-schema](../../.ai/skills/multi-schema/SKILL.md): *"se este cliente for excluído, este
registro vai junto?"*

**Raiz.** `Produto : AggregateRoot<int>`, em `Core/Models/Aggregates/Produto/`.

**Invariantes.**

| Invariante | Onde é recusada | Regra |
|---|---|---|
| Código do produto é único no catálogo do cliente | `ProdutoService`, via specification — unicidade não é invariante de instância | RN-6 |
| Preço de venda é maior que zero | Construtor, `AlterarPreco` | RN-4 |
| Produto inativo não entra em pedido novo | `EhDisponivelParaVenda`, consultada por `Pedido.AdicionarItem` | RN-7 |

*Repare no primeiro caso: unicidade entre irmãos **não** é invariante que um agregado consiga
garantir, porque ele não conhece os outros. Ela vive no serviço, apoiada numa specification e num
índice único no banco — o índice é a garantia real, o serviço é a mensagem decente.*

**Entidades e Value Objects internos.** `Dinheiro` (VO, o mesmo de `Pedido`).

**Fronteira transacional.** Produto sozinho.

**Eventos.** Nenhum.

**Ciclo de vida.** `Ativo` ↔ `Inativo`. Nenhum estado terminal: produto não é excluído, é inativado,
porque pedidos históricos referenciam o `IdProduto` e um catálogo com buracos torna o histórico
ilegível.

## Quando separar um agregado — e quando não

*Registre aqui as decisões de fronteira que foram discutidas, com o motivo. É a seção que mais economiza
tempo no futuro: sem ela, a mesma discussão recomeça a cada refactor.*

Critérios que valem sempre:

- **Regras próprias e vocabulário próprio** apontam para agregados (ou domínios) distintos.
- **Ciclos de vida independentes** apontam para separação; nascer e morrer junto aponta para uma
  fronteira só.
- **Condicional por tipo proliferando** (`if (tipo == A) … if (tipo == B) …`) costuma esconder mais de
  um agregado dentro de um só.
- **Tudo depende de tudo** é sinal de que a separação foi feita no lugar errado, não de que ela é
  desnecessária.
- **Categorias diferentes obrigam a agregados diferentes.** Um agregado do schema do cliente e um do
  schema compartilhado nunca compartilham fronteira transacional — não há transação que os salve
  juntos com a mesma garantia, porque o `search_path` da conexão resolve um deles e não o outro.
  Quando a modelagem parece exigir isso, a fronteira está errada; ver
  [ADR-003](../decisions/ADR-003-isolamento-multi-schema.md).
