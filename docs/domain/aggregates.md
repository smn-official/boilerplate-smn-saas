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
- **Referência entre agregados é por identificador** (`Pedido.IdAssinante`), não por navegação de
  objeto.
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

| Agregado | Raiz | Fronteira transacional | Referencia |
|---|---|---|---|
| *(exemplo — substituir)* Assinatura | `Assinatura` | Assinatura + itens de cobrança | `IdAssinante` |
| *(exemplo — substituir)* Assinante | `Assinante` | Assinante + usuários | — |

## Exemplo de agregado detalhado — substituir

### Assinatura

**Raiz.** `Assinatura : AggregateRoot<int>`, em `Core/Models/Aggregates/Assinatura/`.

**Invariantes.**

| Invariante | Onde é recusada | Regra |
|---|---|---|
| Toda assinatura tem exatamente um plano vigente | Construtor e `TrocarPlano` | RN-3 |
| Assinatura cancelada não muda de plano nem aceita item novo | `TrocarPlano`, `AdicionarItem` | RN-4 |
| Assinatura em teste expira em 14 dias corridos | `EhTesteExpirado`, consultada por `RegistrarAcesso` | RN-1 |

**Entidades e Value Objects internos.** `ItemCobranca` (entidade, sem sentido fora da assinatura);
`Periodo` (VO, início e fim validados na construção).

**Fronteira transacional.** Assinatura e seus itens de cobrança são salvos numa única persistência —
um item órfão ou um total desatualizado seriam estado inválido observável. O `Assinante` fica **fora**
da fronteira: é referenciado por `IdAssinante` e coordenado pelo serviço.

**Eventos.** Nenhum por enquanto. Quando existir, listar nome, o que carrega e quem reage.

**Ciclo de vida.** `EmTeste` → `Ativa` → (`Inadimplente` ↔ `Ativa`) → `Cancelada`. `Cancelada` é
terminal; reativar cria uma assinatura nova, porque o histórico de cobrança do período anterior não
pode ser reescrito. `SituacaoAssinatura` é persistida como string.

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
