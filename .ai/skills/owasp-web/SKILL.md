---
name: owasp-web
description: OWASP Top 10 aplicado a ASP.NET Core MVC e EF Core — broken access control e IDOR, injeção com FromSqlRaw, XSS via Html.Raw e innerHTML, CSRF com antiforgery, SSRF, desserialização insegura, security misconfiguration e redirect aberto. Use ao auditar controller, rota, view, query, upload, redirect ou endpoint novo.
agent: security-agent
---

# OWASP Top 10 em ASP.NET Core MVC

## A01 — Broken Access Control

A categoria de maior incidência, e a que o framework **não** resolve sozinho. `[Authorize]` responde
"quem é você"; não responde "este recurso é seu".

### IDOR — nunca confie no id vindo do cliente

```csharp
// ❌ Qualquer usuário autenticado lê o recurso de qualquer outro trocando o id da rota.
[HttpGet("<entidade>/{id:guid}")]
[Authorize]
public async Task<IActionResult> Detalhe(Guid id, CancellationToken cancellationToken)
{
    var registro = await _repositorio.ObterPorIdAsync(id, cancellationToken);
    return View(new DetalheViewModel(registro));
}

// ✅ A propriedade faz parte da consulta, não de um if depois.
[HttpGet("<entidade>/{id:guid}")]
[Authorize]
public async Task<IActionResult> Detalhe(Guid id, CancellationToken cancellationToken)
{
    var registro = await _repositorio.ObterDoUsuarioAsync(
        id, UsuarioAtual.Id, cancellationToken);

    if (registro is null) return NotFound();

    return View(new DetalheViewModel(registro));
}
```

Filtrar na consulta é melhor que validar depois: elimina a classe inteira de erro em que alguém
esquece o `if`. Uma specification de propriedade composta em todas as consultas da entidade
transforma isso em padrão em vez de disciplina.

Devolva **`NotFound`, não `Forbid`**, quando a existência do recurso já é informação — `Forbid`
confirma que o id existe e pertence a outra pessoa.

### Vazamento entre schemas — isolamento multi-tenant

O isolamento entre clientes é por **schema do PostgreSQL**: a conexão executa
`SET search_path = <schema>, public` na abertura, e o nome do schema vem de uma claim emitida no
login a partir do vínculo usuário→cliente persistido no schema compartilhado. Isso move a fronteira
de segurança para dentro da string de conexão — e cria uma classe de falha que nenhum `[Authorize]`
detecta.

#### O schema nunca vem de input do usuário

Aceitar o schema por query string, header, campo de formulário ou rota é o equivalente multi-schema
do IDOR: o atacante troca o valor e lê a base inteira de outro cliente.

```csharp
// ❌ O cliente escolhe de qual empresa vai ler. Um header basta para atravessar o isolamento.
var schema = Request.Headers["X-Tenant"].ToString();
await _resolvedorDeSchema.DefinirAsync(schema, cancellationToken);

// ❌ Mesma falha por query string, mesmo "só em ambiente interno".
var schema = Request.Query["schema"].ToString();

// ✅ O schema vem da claim emitida no login, a partir do vínculo persistido.
var schema = User.FindFirstValue(ClaimsCliente.Schema)
    ?? throw new AcessoNegadoException(MensagensAcesso.ClienteNaoResolvido);
```

A claim é confiável porque foi emitida pelo servidor no login, não porque chegou na requisição.
Claim ausente é erro, **não** motivo para cair num schema padrão: `?? "public"` transforma falha de
autenticação em acesso silencioso ao schema compartilhado.

Troca de cliente (usuário com vínculo em mais de um) reemite a identidade após reconferir o vínculo
no banco — nunca aceita o novo schema direto da requisição.

#### Nome de schema não é concatenado em SQL

Identificador não é parametrizável. Schema vindo de string, mesmo de fonte confiável, precisa de
lista branca ou quoting de identificador — a defesa em profundidade é o que impede que um dia o
valor mude de origem sem ninguém revisar o interceptor.

```csharp
// ❌ Injeção direta. `schema` fecha o comando e emenda o próximo.
await using var comando = new NpgsqlCommand($"SET search_path = {schema}, public", conexao);

// ✅ Validado contra o catálogo de clientes e quotado como identificador.
if (!_catalogoDeClientes.SchemaConhecido(schema))
    throw new AcessoNegadoException(MensagensAcesso.SchemaDesconhecido);

await using var comando = new NpgsqlCommand(
    "SELECT set_config('search_path', quote_ident($1) || ', public', false)", conexao);
comando.Parameters.Add(new NpgsqlParameter { Value = schema });
```

O catálogo de clientes (schema compartilhado) é a lista branca natural: se o nome não está lá, não é
schema — é tentativa.

#### `AcessoNegadoException`

Falha de isolamento **não é violação de invariante de negócio**: `DomainException` (de
[`dominio-agregados`](../dominio-agregados/SKILL.md)) vira `400` — "seu pedido estava inválido" — e
usar o mesmo tipo aqui devolveria `400` para tentativa de atravessar cliente, escondendo o incidente
no meio dos erros de formulário. Tipo próprio, que o middleware mapeia para **`403`** e o
Application Insights trata como evento de segurança:

```csharp
namespace <Produto>.<Modulo>.Core.Common;

/// <summary>Acesso barrado por falta de vínculo, claim ausente ou schema não reconhecido.</summary>
public class AcessoNegadoException : Exception
{
    /// <summary>Cria a exceção com o motivo da negativa.</summary>
    public AcessoNegadoException(string mensagem)
        : base(mensagem)
    {
    }

    /// <summary>Cria a exceção preservando a falha de origem.</summary>
    public AcessoNegadoException(string mensagem, Exception excecaoInterna)
        : base(mensagem, excecaoInterna)
    {
    }
}
```

A mensagem vem de constante em `MensagensAcesso` e é **genérica para o usuário** — `ClienteNaoResolvido`
não conta qual schema existe nem se o cliente é válido. O detalhe fica no log, nunca na resposta:
mensagem de erro que diferencia "schema inexistente" de "schema sem seu acesso" é oráculo de
enumeração.

```csharp
namespace <Produto>.<Modulo>.Core.Common;

/// <summary>Mensagens de negativa de acesso, sem revelar estrutura interna.</summary>
public static class MensagensAcesso
{
    public const string ClienteNaoResolvido = "Não foi possível identificar seu acesso.";
    public const string SchemaDesconhecido = "Não foi possível identificar seu acesso.";
}
```

Duas constantes com o mesmo texto é **intencional**: o código distingue as causas para o log e a
telemetria, o usuário vê a mesma frase nos dois casos.

#### Toda conexão precisa do SET antes da primeira query

Esta é a falha mais perigosa do modelo porque **é silenciosa**. Conexão reusada do pool sem o
`SET search_path` executa a query no schema que sobrou da requisição anterior: retorna dado de outro
cliente, com sucesso, sem exceção, sem log de erro. Nada quebra — e é exatamente por isso que passa
despercebido até virar incidente.

```csharp
// ❌ SET aplicado no primeiro uso do DbContext. A segunda conexão do pool sai sem search_path.
if (!_jaConfigurado)
{
    await DefinirSearchPathAsync(conexao, cancellationToken);
    _jaConfigurado = true;
}

// ✅ Interceptor no evento de abertura da conexão: toda conexão, sempre, antes de qualquer query.
public sealed class SearchPathInterceptor : DbConnectionInterceptor
{
    public override async Task ConnectionOpenedAsync(DbConnection conexao,
        ConnectionEndEventData dados, CancellationToken cancellationToken = default)
    {
        await DefinirSearchPathAsync(conexao, _contextoDoCliente.Schema, cancellationToken);
    }
}
```

Verificações do interceptor:

- Roda em **toda** abertura, inclusive nas reabertas pelo pool e nas de retry por falha transitória.
- Falha em resolver o schema **aborta a conexão**; nunca segue com o search_path anterior.
- `NpgsqlDataSource` com pool compartilhado entre clientes exige o SET por abertura; pool por cliente
  é a alternativa que remove a classe de erro, ao custo de conexões.
- `EnlistedTransaction` e conexão externa passada ao `DbContext` fogem do interceptor — audite.

#### Query bruta e procedure

```sql
-- ❌ Depende do search_path da conexão estar certo neste instante. Se não estiver, lê outro cliente.
SELECT * FROM pedido WHERE identificador = $1;

-- ✅ Qualificado, quando o schema é conhecido no ponto de uso.
SELECT * FROM compartilhado.cliente WHERE identificador = $1;
```

Objeto do schema compartilhado (catálogo de clientes, vínculo usuário→cliente, trilha de auditoria)
é **sempre** qualificado — depender do `public` no fim do search_path é apostar na ordem de resolução.

Sem conflito com `seguranca-sql`: o search_path da **conexão** é dinâmico, resolvido por requisição a
partir de fonte confiável; dentro da **procedure** ele continua fixo e literal no `SET search_path =
<schema>, pg_temp` do `CREATE PROCEDURE`, como defesa contra shadowing. São camadas diferentes, e
procedure que precise operar no schema do cliente recebe o nome como parâmetro validado, com `%I`.

#### Schema isola cliente, não usuário

Estar no schema certo não substitui o IDOR acima. Dentro de um mesmo cliente continuam existindo
usuários com escopos distintos, e o id de um recurso segue exigindo verificação de propriedade na
consulta. As duas verificações são independentes e ambas obrigatórias: o schema responde "de qual
cliente é este dado", a specification de propriedade responde "deste cliente, é seu".

### Outras falhas da categoria

| Falha | Verificação |
|---|---|
| Id sequencial exposto | Prefira GUID v7; id sequencial permite enumerar a base |
| Verificação só na UI | Botão escondido não é controle; a rota continua acessível |
| Elevação por parâmetro | `PerfilId` vindo do formulário; papel vem da sessão, nunca do cliente |
| Over-posting em massa | `Titular.Perfil` alterado por model binding — use DTO de entrada específico |
| Endpoint auxiliar sem `[Authorize]` | Rota de export, healthcheck detalhado ou webhook esquecida |
| Autorização no controller mas não na API | Ambas as superfícies precisam da verificação |

Over-posting é frequente e discreto:

```csharp
// ❌ O binder preenche qualquer propriedade pública que chegue no form, inclusive Perfil.
public async Task<IActionResult> Salvar(Titular titular, CancellationToken cancellationToken)

// ✅ DTO com exatamente os campos editáveis pela tela.
public async Task<IActionResult> Salvar(AtualizarTitularDto dados,
    CancellationToken cancellationToken)
```

## A03 — Injection

### SQL

EF Core parametriza LINQ. O risco está no SQL cru.

```csharp
// ❌ Injeção. `FromSqlRaw` com string montada não parametriza nada.
var filtro = Request.Query["filtro"].ToString();
var lista = await _context.<Entidade>
    .FromSqlRaw($"SELECT * FROM <schema>.<tabela> WHERE nome LIKE '%{filtro}%'")
    .ToListAsync(cancellationToken);

// ✅ FromSql com string interpolada é parametrizado pelo EF (vira FormattableString).
var lista = await _context.<Entidade>
    .FromSql($"SELECT * FROM <schema>.<tabela> WHERE nome LIKE {padrao}")
    .ToListAsync(cancellationToken);

// ✅ Ou FromSqlRaw com parâmetro explícito.
var lista = await _context.<Entidade>
    .FromSqlRaw("SELECT * FROM <schema>.<tabela> WHERE nome LIKE {0}", padrao)
    .ToListAsync(cancellationToken);
```

Ponto que engana muita revisão: `FromSql`/`ExecuteSql` (interpolados) **parametrizam**;
`FromSqlRaw`/`ExecuteSqlRaw` **não**. Uma interpolação `$"..."` dentro de `FromSqlRaw` é injeção
direta, e a diferença entre os dois é uma palavra no nome do método.

Nome de tabela, coluna e direção de ordenação **não** são parametrizáveis. Valide contra lista
branca:

```csharp
private static readonly FrozenSet<string> ColunasOrdenaveis =
    new[] { "Nome", "CriadoEm", "Situacao" }.ToFrozenSet();

if (!ColunasOrdenaveis.Contains(ordenacao))
    throw new DomainException(MensagensValidacao.OrdenacaoInvalida);
```

Antes de recorrer a SQL dinâmico, pergunte se LINQ resolve — quase sempre resolve.

### Outras injeções

| Tipo | Onde aparece | Mitigação |
|---|---|---|
| Comando de SO | `Process.Start` com entrada do usuário | Evite; se inevitável, lista branca e argumentos separados |
| LDAP | Filtro montado por concatenação | Escape do filtro |
| Path traversal | Nome de arquivo vindo do upload (`../../`) | `Path.GetFileName` + validação contra diretório base resolvido |
| Log forging | `\n` na entrada quebrando a linha do log | Log estruturado já resolve; nunca concatene entrada na mensagem |
| Header injection | Valor do usuário em header de resposta | Valide; rejeite CR/LF |

## A03 — XSS

Razor codifica por padrão com `@modelo.Propriedade`. O risco está nas saídas de escape.

```cshtml
@* ❌ Renderiza HTML cru. Se o conteúdo veio do usuário, é XSS armazenado. *@
@Html.Raw(Model.Descricao)

@* ✅ Codificado. *@
@Model.Descricao
```

`@Html.Raw` só é aceitável sobre conteúdo que **você** gerou e que passou por sanitização com
biblioteca dedicada. "Só o administrador edita esse campo" não é mitigação: conta de administrador
comprometida é justamente o cenário de ataque.

### TypeScript

```ts
// ❌ innerHTML com conteúdo de origem externa executa script.
container.innerHTML = resposta.descricao;

// ✅ textContent nunca interpreta markup.
container.textContent = resposta.descricao;

// ✅ Quando precisa de estrutura, construa elementos.
const item = document.createElement("li");
item.textContent = resposta.descricao;
container.appendChild(item);
```

Também verifique: `insertAdjacentHTML`, `document.write`, `eval`, `new Function`,
`element.setAttribute("href", valorExterno)` — `javascript:` em href é XSS.

### Dado do Razor para o TypeScript

```cshtml
@* ❌ Interpolação dentro de bloco script: quebra o contexto de escape do Razor. *@
<script>const nome = "@Model.Nome";</script>

@* ✅ Atributo data-*, lido pelo TypeScript. *@
<div id="painel" data-titular-id="@Model.TitularId"></div>
```

```ts
const painel = document.querySelector<HTMLElement>("#painel");
const titularId = painel?.dataset.titularId ?? "";
```

Isso também atende à convenção de não ter URL nem estado hardcoded no TypeScript.

## A01 — CSRF

Todo endpoint que altera estado precisa de token antiforgery. O `form` do Razor emite o campo
automaticamente; o controller precisa validar.

```csharp
[HttpPost]
[Authorize]
[ValidateAntiForgeryToken]
public async Task<IActionResult> Salvar(AtualizarTitularDto dados, CancellationToken ct)
```

Melhor que atributo em cada ação — política global, com exceção consciente:

```csharp
builder.Services.AddControllersWithViews(opcoes =>
{
    opcoes.Filters.Add(new AutoValidateAntiforgeryTokenAttribute());
});
```

Checagens:

- `SameSite=Lax` ou `Strict` no cookie de sessão é defesa em profundidade, não substituto.
- Requisição AJAX precisa enviar o token no header; leia-o de um campo emitido pelo Razor.
- Webhook de terceiro não usa antiforgery: autentique por assinatura HMAC do payload, e marque
  `[IgnoreAntiforgeryToken]` explicitamente na rota.
- `[HttpGet]` **nunca** altera estado. Ação destrutiva por GET é CSRF trivial.

## A10 — SSRF

Requisição do servidor para URL controlada pelo usuário alcança a rede interna e, no Azure, o
endpoint de metadados da instância.

```csharp
// ❌ O usuário escolhe o destino da requisição feita pelo servidor.
var conteudo = await _httpClient.GetStringAsync(model.UrlInformada, cancellationToken);
```

Mitigações, em ordem de preferência:

1. Não aceite URL do usuário.
2. Lista branca de hosts permitidos.
3. Se precisa aceitar: valide esquema (`https` apenas), resolva o DNS e rejeite endereço privado,
   loopback, link-local e metadados; proíba redirect automático (`AllowAutoRedirect = false`) e
   revalide o destino a cada salto.

```csharp
private static bool DestinoPermitido(Uri uri, IPAddress endereco) =>
    uri.Scheme == Uri.UriSchemeHttps
    && !IPAddress.IsLoopback(endereco)
    && !endereco.IsApipa()
    && !EnderecoPrivado(endereco);
```

Aplique também a upload por URL, geração de PDF a partir de HTML remoto, preview de link e proxy
de imagem.

## A08 — Desserialização insegura

```csharp
// ❌ TypeNameHandling permite instanciar tipo arbitrário indicado no JSON.
var opcoes = new JsonSerializerSettings { TypeNameHandling = TypeNameHandling.All };

// ❌ BinaryFormatter é inseguro por design e removido nas versões atuais do .NET.
```

`System.Text.Json` com configuração padrão é a escolha segura. Não habilite resolução polimórfica
por nome de tipo sobre entrada externa. Limite profundidade e tamanho do payload
(`MaxDepth`, limite de body).

## A05 — Security Misconfiguration

| Item | Errado | Certo |
|---|---|---|
| Página de erro | `UseDeveloperExceptionPage()` sem guarda | Só em `IsDevelopment()` |
| `DetailedErrors` | `true` em produção | `false` ou ausente |
| Header `Server` | Expõe o servidor | `AddServerHeader = false` no Kestrel |
| `X-Powered-By` / `X-AspNet-Version` | Presentes | Removidos |
| Swagger / endpoint de diagnóstico | Público em produção | Restrito ou desabilitado |
| Diretório de listagem | `UseDirectoryBrowser()` | Não usar |
| CORS | `AllowAnyOrigin` com credencial | Origens explícitas |
| Compilação | `DEBUG` em produção | `Release` |

```csharp
builder.WebHost.ConfigureKestrel(opcoes => opcoes.AddServerHeader = false);
```

CORS permissivo com credencial é combinação inválida e o navegador rejeita — mas o padrão
`AllowAnyOrigin` sem credencial ainda expõe API que deveria ser interna.

## A01 — Redirect aberto

```csharp
// ❌ O atacante hospeda a URL e usa seu domínio como trampolim de phishing.
return Redirect(returnUrl);

// ✅ LocalRedirect rejeita destino externo.
return LocalRedirect(returnUrl);

// ✅ Ou valide explicitamente.
if (!Url.IsLocalUrl(returnUrl)) return RedirectToAction(nameof(Index));
return Redirect(returnUrl);
```

Cuidado com validação por prefixo: `startsWith("/")` aceita `//evil.example`, que o navegador trata
como protocolo relativo e resolve para host externo. `Url.IsLocalUrl` trata esse caso.

O fluxo de login é o alvo clássico — `returnUrl` chega por query string, o usuário autentica e é
redirecionado para o domínio do atacante já confiando na sessão.

## Checklist

- [ ] Todo acesso por id valida propriedade na própria consulta, não em `if` posterior.
- [ ] `NotFound` em vez de `Forbid` quando a existência do recurso é informação.
- [ ] Papel e permissão vêm da sessão, nunca de campo do formulário.
- [ ] Entrada por DTO específico; nenhuma entidade de domínio em model binding.
- [ ] Schema do cliente vem da claim emitida no login; nunca de query string, header, form ou rota.
- [ ] Claim de schema ausente é erro; nenhum fallback para schema padrão.
- [ ] Nome de schema validado contra o catálogo de clientes e quotado; nunca concatenado em SQL.
- [ ] `SET search_path` aplicado na abertura de **toda** conexão, antes da primeira query.
- [ ] Objeto do schema compartilhado qualificado explicitamente em query bruta e procedure.
- [ ] Verificação de propriedade mantida dentro do schema — schema isola cliente, não usuário.
- [ ] Nenhum `FromSqlRaw`/`ExecuteSqlRaw` com interpolação ou concatenação.
- [ ] Coluna e direção de ordenação validadas por lista branca.
- [ ] Nenhum `@Html.Raw` sobre conteúdo de origem externa.
- [ ] Nenhum `innerHTML`, `insertAdjacentHTML`, `eval` ou `document.write` com dado externo.
- [ ] Dado do Razor para o TypeScript por `data-*`, não por interpolação em `<script>`.
- [ ] Antiforgery global; `[IgnoreAntiforgeryToken]` só em webhook com assinatura validada.
- [ ] Nenhum `[HttpGet]` alterando estado.
- [ ] URL fornecida pelo usuário não vira requisição do servidor sem lista branca.
- [ ] Serialização sem resolução polimórfica por nome de tipo sobre entrada externa.
- [ ] Página de erro detalhada e endpoints de diagnóstico restritos a desenvolvimento.
- [ ] Headers de versão removidos; CORS com origens explícitas.
- [ ] `LocalRedirect` ou `Url.IsLocalUrl` em todo redirect com destino do cliente.
