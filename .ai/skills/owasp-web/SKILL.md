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
    throw new DominioException(MensagensValidacao.OrdenacaoInvalida);
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
