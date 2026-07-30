---
name: cache
description: Cache em memória e distribuído em .NET 10 — chave que carrega o schema do cliente para não vazar dado entre clientes, escolha entre IMemoryCache, IDistributedCache e HybridCache, onde o cache mora nas camadas Web/Data/Core, invalidação e TTL curto, o que nunca cachear (dado pessoal, autorização, segredo) e OutputCache em página autenticada. Use quando a tela estiver lenta ou pesada, quando a mesma consulta repetir a cada request, ao guardar algo em memória, ao decidir se vale Redis, ao invalidar ou expirar cache, ou ao investigar dado de um cliente aparecendo para outro.
agent: net10-agent
---

# Cache

Cache é a única otimização deste boilerplate que pode **vazar dado de um cliente para outro sem
lançar erro**. Por isso ela tem skill própria, e por isso a primeira seção não é sobre performance.

Antes de cachear, meça: consulta lenta por falta de índice, listagem sem paginação
([`paginacao`](../paginacao/SKILL.md)) e `N+1` de `Include` esquecido se resolvem na origem. Cache
sobre consulta mal escrita esconde o defeito e adiciona um segundo problema — invalidação.

## A regra que não se quebra

**A chave de cache carrega o cliente, ou o cache vaza entre clientes.**

O isolamento deste produto é o `search_path` da conexão
([`multi-schema`](../multi-schema/SKILL.md), [ADR-003](../../../docs/decisions/ADR-003-isolamento-multi-schema.md)).
Esse mecanismo protege o **banco**. O cache vive na memória do processo ou num Redis compartilhado —
**fora** dele. Nenhum `SET search_path` alcança um dicionário em memória.

```csharp
// ❌ Vaza. O primeiro cliente que consultar o pedido 42 popula a entrada;
//    todos os outros clientes recebem o pedido 42 DELE.
var chave = $"pedido:{id}";

// ✅ Isola. Cliente distinto, chave distinta, entrada distinta.
var chave = $"{contexto.SchemaAtual}:pedido:{id}";
```

Por que este é o pior modo de falha do modelo: uma query no schema errado quebra com
`relation "pedido" does not exist` — a falha é barulhenta e aparece em desenvolvimento. O cache
devolve o objeto do vizinho, com o tipo certo, sem exceção, com HTTP 200. Ninguém percebe até o
cliente reclamar.

Torne isso mecânico em vez de disciplina, com um único ponto que monta a chave:

```csharp
namespace <Produto>.<Modulo>.Data.Cache;

/// <summary>Monta chave de cache já qualificada pelo schema do cliente da sessão.</summary>
public sealed class ChaveDeCacheDoCliente(IContextoDoCliente contexto)
{
    /// <summary>Prefixa a chave com o schema resolvido; falha se não houver cliente na sessão.</summary>
    public string Para(string chave)
    {
        var schema = contexto.SchemaAtual
            ?? throw new AcessoNegadoException(MensagensAcesso.ClienteNaoResolvido);

        return $"{schema}:{chave}";
    }
}
```

Três decisões deliberadas nesse trecho:

- **Falha em vez de fallback.** Sem cliente resolvido não existe chave global de consolo. O mesmo
  raciocínio do interceptor: `?? "public"` transforma falha de autenticação em acesso indevido.
- `AcessoNegadoException` (de [`owasp-web`](../owasp-web/SKILL.md)) e não `DomainException`: é falha
  de isolamento, mapeada para `403`, não pedido inválido do usuário.
- O prefixo vem do **contexto**, nunca de parâmetro passado pelo chamador — parâmetro se esquece, e
  esquecer aqui é o vazamento.

Dado do schema compartilhado (catálogo de clientes, tabela de referência global) pode usar chave sem
prefixo, mas **explicitamente**: `compartilhado:catalogo-de-clientes`. Chave sem prefixo nenhum é
ambígua, e ambiguidade aqui é a origem do defeito.

## Onde o cache mora nas camadas

```text
Web ──► Data ──► Core
```

| Camada | O que pode | O que não pode |
|---|---|---|
| `Core` | Declarar contrato próprio, se e somente se um serviço de domínio precisar | Referenciar `IMemoryCache`, `IDistributedCache`, `HybridCache` |
| `Data` | Cachear leitura dentro do repositório; é o lugar natural | Decidir regra sobre o valor cacheado |
| `Web` | `OutputCache`, `ResponseCache`, cache de ViewModel montada | Cachear contornando o service |

**O agregado nunca toca cache** — [`dominio-agregados`](../dominio-agregados/SKILL.md) já proíbe. Ele
responde "como isso funciona" a partir do próprio estado; nada nele sabe que existe uma segunda
cópia dos dados em outro lugar. O cache mora **antes** dele, no repositório que o carrega.

O lugar canônico é o repositório, porque cache responde a mesma pergunta que ele: "onde está".

```csharp
namespace <Produto>.<Modulo>.Data.Repositories;

public sealed class <Entidade>Repository(
    <Modulo>DbContext contexto,
    HybridCache cache,
    ChaveDeCacheDoCliente chaves) : I<Entidade>Repository
{
    private static readonly HybridCacheEntryOptions Opcoes = new()
    {
        Expiration = TimeSpan.FromMinutes(5),
        LocalCacheExpiration = TimeSpan.FromMinutes(1),
    };

    public async Task<<Entidade>?> ObterPorIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return await cache.GetOrCreateAsync(
            chaves.Para($"<entidade>:{id}"),
            id,
            async (chaveDeEstado, token) => await contexto.<Entidade>
                .AsNoTracking()
                .SingleOrDefaultAsync(item => item.Id == chaveDeEstado, token),
            Opcoes,
            cancellationToken: cancellationToken);
    }

    public async Task RemoverDoCacheAsync(Guid id, CancellationToken cancellationToken)
    {
        await cache.RemoveAsync(chaves.Para($"<entidade>:{id}"), cancellationToken);
    }
}
```

O que esse trecho decide: `AsNoTracking` porque entidade cacheada não pertence mais a um
`DbContext` — devolver instância rastreada por um contexto já descartado é `ObjectDisposedException`
intermitente. O estado (`id`) vai por parâmetro em vez de captura em closure, que é o que permite ao
`HybridCache` reaproveitar o delegate sem alocar por chamada.

Serviço continua sem saber que existe cache: ele pede ao repositório, o repositório decide de onde
vem. Isso mantém a fronteira da tabela de responsabilidades intacta.

## Qual das três usar

| Implementação | Onde vive | Escolha quando |
|---|---|---|
| `IMemoryCache` | Heap do processo | Instância única, valor pequeno, invalidação irrelevante ou por TTL |
| `IDistributedCache` | Fora do processo (Redis, SQL) | Múltiplas instâncias precisam **ver a mesma** entrada |
| `HybridCache` | Memória + distribuído, em dois níveis | O caso geral em .NET 10: quer a latência da memória e a coerência do distribuído |

**Comece com `HybridCache`.** Ele é o tipo do .NET 10 para isso e resolve dois problemas que
`IMemoryCache` não resolve: *stampede* (cem requests simultâneos ao expirar a entrada disparam cem
consultas — o `HybridCache` deixa uma passar e as outras esperam) e serialização, que no
`IDistributedCache` é responsabilidade sua a cada chamada. Configurado **sem** backend distribuído,
ele funciona só em memória — então adotá-lo não é adotar Redis.

```csharp
builder.Services.AddHybridCache(opcoes =>
{
    opcoes.DefaultEntryOptions = new HybridCacheEntryOptions
    {
        Expiration = TimeSpan.FromMinutes(5),
        LocalCacheExpiration = TimeSpan.FromMinutes(1),
    };
    opcoes.MaximumPayloadBytes = 1024 * 512;
});
```

O teto de payload existe porque cache sem limite é vazamento de memória com outro nome: o processo
cresce até o App Service reciclar, e o sintoma aparece como reinício aleatório.

### O problema concreto que justificaria Redis

A "Postura" do AGENTS.md proíbe dependência sem problema concreto. Para cache distribuído, o
problema é este e nenhum outro: **a aplicação roda em mais de uma instância e a entrada precisa ser
coerente entre elas.** Isso é fato, não hipótese, quando houver scale-out no App Service, deploy
azul-verde ou slot de staging aquecido — o mesmo cenário que
[`tarefas-em-segundo-plano`](../tarefas-em-segundo-plano/SKILL.md) trata em "múltiplas instâncias
executam a mesma tarefa".

Sem coerência entre instâncias, a consequência é: o usuário salva, o load balancer manda o próximo
request para o outro nó, e ele vê o valor antigo. Aparece como "às vezes a alteração não aparece" —
irreproduzível localmente, onde há uma instância só.

Até existir esse fato, `HybridCache` em memória basta, e a decisão de adicionar Redis vira **ADR**,
com custo (mais um recurso a provisionar, monitorar, versionar e faturar) e o novo modo de falha
declarado: cache indisponível não pode derrubar o caso de uso — a leitura cai para o banco.

## Invalidação

Duas formas de uma entrada morrer. Prefira a primeira.

| Forma | Custo do erro |
|---|---|
| **Expirar** por TTL | Dado obsoleto por no máximo o TTL |
| **Remover** na escrita | Dado obsoleto **para sempre**, se alguém esquecer um caminho de escrita |

**TTL curto é mais seguro que invalidação manual esquecida.** Invalidação manual exige que todo
caminho que altera o dado remova a entrada — o service, o worker, a migration de correção, o script
manual do suporte, o endpoint novo que alguém escreveu seis meses depois. Basta um esquecer para o
sistema servir dado errado indefinidamente, sem erro e sem expiração que o corrija.

TTL de 1 a 5 minutos resolve a esmagadora maioria dos casos: reduz a carga em duas ordens de
grandeza e o pior caso é um dado alguns minutos velho. Se poucos minutos de defasagem são
inaceitáveis, o dado provavelmente não deveria estar em cache.

Quando remover explicitamente for necessário mesmo assim:

```csharp
public async Task AtualizarAsync(<Entidade> entidade, CancellationToken cancellationToken)
{
    await _repositorio.SalvarAlteracoesAsync(cancellationToken);
    await _repositorio.RemoverDoCacheAsync(entidade.Id, cancellationToken);
}
```

- Remova **depois** de a transação confirmar. Remover antes reabre a janela em que outro request
  recarrega o valor antigo, ainda não commitado, e o recacheia.
- A remoção usa a **mesma** função de chave da escrita. Chave montada à mão nos dois lados divergem,
  e a entrada órfã sobrevive até o TTL.
- Nunca cacheie **coleção paginada** e item individual sob invalidações independentes: alterar um
  item obriga a invalidar toda página que o contém, o que ninguém acerta. Cacheie o item; monte a
  página a partir dos ids.
- `HybridCache` aceita tags (`RemoveByTagAsync`), úteis para derrubar um grupo. Use a **tag também
  qualificada pelo schema** — tag global derruba (ou pior, vaza entre) todos os clientes.

## O que nunca vai para o cache

| Nunca | Por quê |
|---|---|
| Resultado de autorização — "pode ver o pedido X" | Permissão revogada continua valendo até expirar; é bypass com atraso |
| Claim, cookie, token de sessão, chave de API, segredo | Sai do escopo do request, entra em memória compartilhada e no Redis, em claro |
| Dado pessoal sem base legal e prazo definidos | Cache é tratamento; ver [`principios-lgpd`](../principios-lgpd/SKILL.md) |
| Dado sensível (art. 11) | Não há como aplicar a proteção de repouso exigida em [`dados-pessoais-modelagem`](../dados-pessoais-modelagem/SKILL.md) |
| Entidade rastreada pelo `DbContext` | O contexto morre com o request; a instância cacheada fica inválida |
| Objeto mutável compartilhado | Um request altera, todos veem; corrompe sem rastro |

Sobre autorização: **decisão de acesso se recalcula sempre.** É baratíssima comparada ao que ela
protege, e cacheá-la significa que revogar um vínculo não tem efeito imediato. Pode-se cachear o
**dado** que alimenta a decisão (a lista de vínculos do usuário, com TTL curto); a decisão em si,
nunca.

Sobre dado pessoal: cache é tratamento sob a LGPD, com as mesmas exigências de finalidade e prazo.
Duas consequências práticas — o TTL passa a ser prazo de retenção, e o expurgo de
[`retencao-descarte`](../retencao-descarte/SKILL.md) precisa alcançar o cache. Eliminar a linha do
banco e deixar a entrada viva não é eliminação. TTL curto resolve isso quase de graça; cache
"perpétuo" com dado pessoal não tem resposta boa.

E o mesmo vale para a **chave**: `usuario:cpf:11122233344` grava dado pessoal no nome da entrada,
que aparece no Redis, em métrica e em dump de diagnóstico. Chave leva id opaco, nunca identificador
de pessoa.

## `OutputCache` e `ResponseCache` em página autenticada

Cache de resposta HTTP é o mesmo risco, um nível acima: em vez de vazar um objeto, vaza a **página
inteira** de um cliente para outro — com nome, saldo e listagem renderizados.

```csharp
// ❌ Serve a página do primeiro cliente que a pediu para todos os demais.
[Authorize]
[OutputCache(Duration = 60)]
public async Task<IActionResult> Index(CancellationToken cancellationToken)

// ❌ Pior: `Location = Any` autoriza proxy e CDN a guardar e redistribuir conteúdo autenticado.
[ResponseCache(Duration = 60, Location = ResponseCacheLocation.Any)]
public async Task<IActionResult> Index(CancellationToken cancellationToken)

// ✅ Conteúdo autenticado não é cacheado por ninguém no caminho.
[Authorize]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public async Task<IActionResult> Index(CancellationToken cancellationToken)
```

A regra: **página autenticada não entra em cache compartilhado.** Faça o `NoStore` valer para toda a
área autenticada de uma vez, em vez de confiar que ninguém esquecerá o atributo:

```csharp
public sealed class SemCacheEmPaginaAutenticadaAttribute : ActionFilterAttribute
{
    public override void OnResultExecuting(ResultExecutingContext contexto)
    {
        if (contexto.HttpContext.User.Identity?.IsAuthenticated != true)
            return;

        contexto.HttpContext.Response.Headers.CacheControl = "no-store, no-cache, must-revalidate";
        contexto.HttpContext.Response.Headers.Pragma = "no-cache";
    }
}
```

Se ainda assim houver ganho real em cachear resposta autenticada — página pesada, idêntica dentro do
mesmo cliente — então `OutputCache` com política que **varia por cliente e por usuário**, e nunca
`Location.Any`:

```csharp
builder.Services.AddOutputCache(opcoes =>
{
    opcoes.AddPolicy("PorCliente", politica => politica
        .SetVaryByHeader("Cookie")
        .VaryByValue(contexto => new KeyValuePair<string, string>(
            "schema",
            contexto.User.FindFirstValue(ClaimsDoCliente.Schema) ?? string.Empty))
        .Expire(TimeSpan.FromSeconds(30)));
});
```

Ativo estático (`.js`, `.css` com hash do Vite) é o caso oposto e legítimo: imutável, público, TTL
longo — ver [`vite-build`](../vite-build/SKILL.md).

## Testar

O teste que não pode faltar é o gêmeo do teste de isolamento de
[`multi-schema`](../multi-schema/SKILL.md): **dois clientes, o mesmo id.** Leia como cliente A
(popula o cache), leia como B, exija o dado de B. Sem esse teste, o vazamento só aparece em
produção, porque em desenvolvimento quase sempre existe um cliente só.

Cubra também: sem cliente resolvido, a montagem da chave **lança** em vez de devolver chave global;
e a segunda leitura não vai ao banco (prove com um duplo espião no repositório, não com cronômetro —
asserção por tempo é teste intermitente).

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Cliente vê dado de outro cliente, sem erro | Chave sem o schema na composição | Prefixar pelo `IContextoDoCliente`, num único ponto |
| Vazamento voltou numa feature nova | Chave montada à mão em vez da função central | `ChaveDeCacheDoCliente.Para` obrigatório; chave literal não passa na revisão |
| Alteração "às vezes não aparece" | Duas instâncias com cache local divergente | `HybridCache` com backend distribuído, ou TTL curto |
| `ObjectDisposedException` intermitente na leitura | Entidade rastreada guardada em cache | `AsNoTracking` antes de cachear |
| Memória cresce até o App Service reciclar | Cache sem TTL nem limite de tamanho | `Expiration` sempre, mais `MaximumPayloadBytes` |
| Cem consultas idênticas quando a entrada expira | Stampede sem coalescência | `HybridCache.GetOrCreateAsync` em vez de checar e preencher à mão |
| Permissão revogada e usuário ainda acessa | Decisão de autorização cacheada | Recalcular sempre; cachear no máximo os dados de entrada |
| Página de um cliente servida para outro | `OutputCache`/`ResponseCache` em rota autenticada | `NoStore` na área autenticada; se cachear, variar por claim de schema |
| Dado excluído continua aparecendo | Expurgo de retenção não alcança o cache | TTL curto como prazo, e remoção explícita no expurgo |
| CPF ou e-mail visível no Redis | Dado pessoal usado como chave | Chave com id opaco |
