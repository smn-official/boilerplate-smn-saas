---
name: segredos-configuracao
description: Gestão de segredo e configuração segura — .env fora do git, resposta a segredo commitado (rotacionar primeiro), Azure Key Vault e App Settings, connection string, HTTPS obrigatório e HSTS, headers de segurança (CSP, X-Content-Type-Options, Referrer-Policy) e cookie com HttpOnly, Secure e SameSite. Use ao auditar appsettings, .env, pipeline, Program.cs ou configuração de cookie e header.
agent: security-agent
---

# Segredos e configuração

## Segredo nunca vai para o repositório

| Local | Pode conter segredo? |
|---|---|
| `appsettings.json` | **Não** — versionado |
| `appsettings.Development.json` | **Não** — versionado |
| `.env` | Não versionado; local apenas |
| `.env.example` | Só placeholder, nunca valor real |
| User Secrets (`dotnet user-secrets`) | Sim — fora da árvore do projeto, desenvolvimento |
| Azure Key Vault | Sim — produção |
| App Service Application Settings | Sim — aceitável; referencie o Key Vault quando possível |
| Variável de ambiente da esteira | Sim, marcada como secreta |
| Comentário no código | **Nunca** |
| Massa de teste / fixture | **Nunca** valor real |

`.gitignore` mínimo:

```gitignore
.env
.env.local
.env.*.local
appsettings.Production.json
*.pfx
*.p12
```

`.env.example` versionado, com placeholder que não parece valor:

```dotenv
DATABASE_CONNECTION=Host=<host>;Database=<db>;Username=<user>;Password=<senha>
SMTP_PASSWORD=<preencher>
APPLICATIONINSIGHTS_CONNECTION_STRING=<preencher>
```

Placeholder que parece real (`Password=admin123`) acaba copiado para produção. Use delimitadores
que quebram se não forem substituídos.

## Segredo commitado — a ordem importa

Se um segredo entrou no histórico, ele está **comprometido**. O repositório foi clonado, indexado,
espelhado em fork, cacheado em CI e possivelmente varrido por bot em minutos.

```text
1. ROTACIONE o segredo.        ← isto é o que resolve
2. Verifique uso indevido nos logs de acesso do recurso.
3. Limpe o histórico (filter-repo, force-push, invalidar caches, avisar quem clonou).
4. Adicione ao .gitignore e a um verificador automático de segredo.
```

**A rotação é o passo que importa.** Limpar o histórico sem rotacionar é teatro: o valor já vazou,
e reescrever o git não o retira de onde ele já foi copiado. Se só houver tempo para uma coisa,
rotacione.

Ordem inversa — limpar primeiro, rotacionar "depois" — é o erro clássico: consome o tempo da
resposta na parte cosmética enquanto a credencial válida continua circulando.

Verificação de rotina no diff:

```bash
git diff origin/main...HEAD | grep -nEi \
  '(password|senha|secret|api[_-]?key|token|bearer |connectionstring|BEGIN [A-Z ]*PRIVATE KEY)'
```

Adote um scanner de segredo na esteira (gitleaks, o scanner nativo da plataforma) e um hook de
pré-commit. Verificação humana falha justamente no commit apressado.

## Configuração em produção

Encadeamento típico, do menos para o mais prioritário:

```csharp
builder.Configuration
    .AddJsonFile("appsettings.json", optional: false)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true)
    .AddEnvironmentVariables();

if (!builder.Environment.IsDevelopment())
{
    builder.Configuration.AddAzureKeyVault(
        new Uri(builder.Configuration["KeyVault:Uri"]!),
        new DefaultAzureCredential());
}
```

`DefaultAzureCredential` com identidade gerenciada elimina a credencial de acesso ao próprio cofre
— sem ela, você guarda um segredo para buscar segredos.

No App Service, referência direta ao cofre no Application Setting evita duplicar o valor:

```text
@Microsoft.KeyVault(SecretUri=https://<cofre>.vault.azure.net/secrets/<segredo>/)
```

**Falhe rápido** quando faltar configuração obrigatória. Aplicação que sobe com string de conexão
vazia e quebra na primeira requisição transforma erro de configuração em incidente de produção:

```csharp
var conexao = builder.Configuration.GetConnectionString("<Produto>")
    ?? throw new InvalidOperationException("Connection string não configurada.");
```

## Connection string

- Nunca no repositório, em nenhum ambiente.
- Usuário do banco com **privilégio mínimo**: a aplicação não precisa de `SUPERUSER`, `CREATE
  DATABASE` nem `DROP`. Ver `autenticacao-autorizacao`.
- Migration roda com credencial separada, de maior privilégio, usada só na esteira de deploy.
- `SSL Mode=Require` (ou `VerifyFull`) no PostgreSQL — sem isso a conexão pode cair para texto
  claro.
- Nunca logue a connection string, nem em erro de inicialização: ela contém a senha.

```csharp
// ❌ A exceção carrega a senha para o log e para a telemetria.
_logger.LogError(ex, "Falha ao conectar em {Conexao}", conexao);

// ✅ Identifique o alvo sem expor a credencial.
_logger.LogError(ex, "Falha ao conectar | Servidor: {Servidor}", construtor.Host);
```

## HTTPS e HSTS

```csharp
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseHttpsRedirection();
```

```csharp
builder.Services.AddHsts(opcoes =>
{
    opcoes.MaxAge = TimeSpan.FromDays(365);
    opcoes.IncludeSubDomains = true;
});
```

Cuidados:

- HSTS só em produção — em desenvolvimento o navegador guarda a política para `localhost` e passa a
  recusar HTTP em outros projetos locais.
- `MaxAge` curto no primeiro deploy, ampliado depois: HSTS é difícil de reverter, o navegador
  lembra.
- `IncludeSubDomains` só quando **todos** os subdomínios servem HTTPS.
- No App Service, ative também "HTTPS Only" e a versão mínima de TLS na plataforma — não dependa
  apenas do redirect da aplicação.

## Headers de segurança

| Header | Valor | Protege contra |
|---|---|---|
| `Content-Security-Policy` | Política restritiva por origem | XSS, injeção de recurso externo |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Vazamento de URL (e do que ela carrega) para terceiro |
| `X-Frame-Options` | `DENY` ou `SAMEORIGIN` | Clickjacking (ou `frame-ancestors` na CSP) |
| `Permissions-Policy` | Desabilite o que não usa | Acesso indevido a câmera, microfone, geolocalização |
| `Cache-Control` | `no-store` em página autenticada | Dado pessoal em cache compartilhado |

```csharp
app.Use(async (contexto, proximo) =>
{
    var cabecalhos = contexto.Response.Headers;
    cabecalhos["X-Content-Type-Options"] = "nosniff";
    cabecalhos["Referrer-Policy"] = "strict-origin-when-cross-origin";
    cabecalhos["X-Frame-Options"] = "DENY";
    cabecalhos["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";

    await proximo();
});
```

Middleware de header vem **cedo** no pipeline, antes de qualquer coisa que produza resposta —
depois de `UseStaticFiles`, arquivos estáticos saem sem os headers.

### CSP

CSP é o header de maior valor e o mais fácil de neutralizar sem perceber. `'unsafe-inline'` em
`script-src` derruba boa parte da proteção contra XSS.

```csharp
cabecalhos["Content-Security-Policy"] =
    "default-src 'self'; "
    + "script-src 'self'; "
    + "style-src 'self'; "
    + "img-src 'self' data:; "
    + "font-src 'self'; "
    + "connect-src 'self'; "
    + "frame-ancestors 'none'; "
    + "base-uri 'self'; "
    + "form-action 'self'";
```

Com Vite gerando bundles próprios e Tailwind compilado em arquivo, `'self'` é suficiente — não há
motivo para inline. Se um script inline for inevitável, use nonce por requisição, nunca
`'unsafe-inline'`.

`frame-ancestors 'none'` e `base-uri 'self'` são frequentemente esquecidos: o primeiro substitui o
`X-Frame-Options` com mais precisão, o segundo impede que uma injeção reescreva a base das URLs
relativas da página.

## Cookie

```csharp
builder.Services.ConfigureApplicationCookie(opcoes =>
{
    opcoes.Cookie.HttpOnly = true;
    opcoes.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    opcoes.Cookie.SameSite = SameSiteMode.Lax;
    opcoes.Cookie.Name = "__Host-<Produto>.Sessao";
});
```

| Atributo | Valor | Motivo |
|---|---|---|
| `HttpOnly` | `true` | JavaScript não lê o cookie; XSS não rouba a sessão diretamente |
| `Secure` | `Always` | Nunca trafega em HTTP |
| `SameSite` | `Lax` (ou `Strict`) | Defesa em profundidade contra CSRF |
| Prefixo `__Host-` | Quando aplicável | Fixa o cookie ao host, sem `Domain`, exigindo `Secure` e `Path=/` |
| Expiração | Curta, com renovação deslizante | Ver `autenticacao-autorizacao` |

`SameSite=None` exige `Secure` e abre o cookie para requisição cross-site — só com justificativa
concreta (integração em iframe de terceiro), nunca por conveniência de teste.

Cookie que não é de sessão de autenticação segue a mesma régua: nenhum dado pessoal em cookie, e
nada de confiança em cookie não assinado para decisão de autorização.

## Checklist

- [ ] Nenhum segredo no diff: código, comentário, configuração, migration, fixture ou pipeline.
- [ ] `.env` e configuração de produção no `.gitignore`; `.env.example` só com placeholder óbvio.
- [ ] Scanner de segredo na esteira e hook de pré-commit ativos.
- [ ] Segredo commitado: rotacionado **antes** de qualquer limpeza de histórico.
- [ ] Produção lê segredo do Key Vault ou App Settings, com identidade gerenciada.
- [ ] Configuração obrigatória ausente derruba a inicialização, não a primeira requisição.
- [ ] Connection string com privilégio mínimo, `SSL Mode` exigido e nunca logada.
- [ ] Credencial de migration separada da credencial de runtime.
- [ ] `UseHttpsRedirection` e `UseHsts` (só em produção), com HTTPS Only na plataforma.
- [ ] Headers de segurança aplicados cedo no pipeline, cobrindo arquivos estáticos.
- [ ] CSP sem `'unsafe-inline'` em `script-src`; `frame-ancestors` e `base-uri` definidos.
- [ ] Cookie de sessão com `HttpOnly`, `Secure`, `SameSite` e nome com prefixo quando aplicável.
- [ ] Página autenticada com `Cache-Control: no-store`.
