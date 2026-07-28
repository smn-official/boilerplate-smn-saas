---
name: autenticacao-autorizacao
description: Segurança de autenticação por cookie e OTP por e-mail — expiração deslizante, código de uso único com validade curta e limite de tentativas, hash do OTP com pepper, comparação em tempo constante contra timing attack, prevenção de enumeração de usuário, [Authorize] por padrão e privilégio mínimo na role do banco. Use ao auditar login, sessão, fluxo de OTP, atributo de autorização ou permissão de banco.
agent: security-agent
---

# Autenticação e autorização

## Sessão por cookie

```csharp
builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(opcoes =>
    {
        opcoes.Cookie.HttpOnly = true;
        opcoes.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        opcoes.Cookie.SameSite = SameSiteMode.Lax;
        opcoes.ExpireTimeSpan = TimeSpan.FromMinutes(30);
        opcoes.SlidingExpiration = true;
        opcoes.LoginPath = "/entrar";
        opcoes.AccessDeniedPath = "/acesso-negado";
    });
```

| Decisão | Recomendação | Motivo |
|---|---|---|
| `ExpireTimeSpan` | 30 min para painel administrativo | Janela curta limita o dano de sessão sequestrada |
| `SlidingExpiration` | `true` | Renova enquanto há uso; expira no abandono |
| Expiração absoluta | Teto independente do uso | Sessão deslizante sem teto nunca expira |
| Cookie persistente | Só com opção explícita do usuário | "Lembrar-me" é escolha, não padrão |
| Rotação após elevação | Emitir cookie novo ao autenticar | Previne fixação de sessão |

Ao concluir a autenticação, **emita identidade nova** em vez de reaproveitar a anterior — é o que
neutraliza fixação de sessão. `SignInAsync` após `SignOutAsync` cumpre o papel.

Logout precisa invalidar do lado do servidor quando houver estado de sessão persistido: apagar o
cookie no cliente não impede o reuso de um cookie já capturado.

## OTP por e-mail

O OTP é frequentemente o elo mais fraco: é curto, chega por canal não confiável e costuma ser
implementado com pressa.

| Requisito | Valor de referência | Motivo |
|---|---|---|
| Comprimento | 6 dígitos ou mais | 6 dígitos = 10⁶; só é seguro **com** limite de tentativas |
| Geração | Gerador criptográfico | `Random` é previsível a partir da semente |
| Validade | 5 a 10 minutos | Janela de ataque curta |
| Uso | **Único** — invalidar no primeiro uso, sucesso ou falha final | Reuso permite replay |
| Tentativas | 3 a 5 por código, depois invalida | Sem isso, 6 dígitos caem por força bruta |
| Emissão | Limite por conta e por IP | Impede uso do sistema como spammer e o desgaste do canal |
| Armazenamento | Hash com salt e pepper | Banco comprometido não entrega códigos válidos |
| Vínculo | Ao identificador da solicitação, não só ao e-mail | Impede usar código emitido para outro fluxo |

### Geração

```csharp
public static string GerarCodigo()
{
    Span<byte> bytes = stackalloc byte[4];
    RandomNumberGenerator.Fill(bytes);

    var valor = BinaryPrimitives.ReadUInt32BigEndian(bytes) % 1_000_000;

    return valor.ToString("D6", CultureInfo.InvariantCulture);
}
```

```csharp
// ❌ Previsível. Random não é criptográfico.
var codigo = new Random().Next(100000, 999999).ToString();

// ❌ Pior ainda: derivado do relógio.
var codigo = DateTime.Now.Ticks.ToString()[^6..];
```

### Armazenamento com hash

```csharp
public sealed class CodigoAcesso
{
    private CodigoAcesso() { }

    public CodigoAcesso(Guid solicitacaoId, byte[] hash, byte[] salt, DateTimeOffset expiraEm)
    {
        Id = Guid.CreateVersion7();
        SolicitacaoId = solicitacaoId;
        Hash = hash;
        Salt = salt;
        ExpiraEm = expiraEm;
        TentativasRestantes = MaximoTentativas;
    }

    private const int MaximoTentativas = 5;

    public Guid Id { get; }
    public Guid SolicitacaoId { get; }
    public byte[] Hash { get; }
    public byte[] Salt { get; }
    public DateTimeOffset ExpiraEm { get; }
    public int TentativasRestantes { get; private set; }
    public DateTimeOffset? UtilizadoEm { get; private set; }

    public bool EstaUtilizavel(DateTimeOffset agora) =>
        UtilizadoEm is null && TentativasRestantes > 0 && agora < ExpiraEm;

    public void RegistrarTentativaInvalida() => TentativasRestantes--;

    public void MarcarUtilizado(DateTimeOffset agora) => UtilizadoEm = agora;
}
```

O código **nunca** é persistido em claro. Se o banco vazar, um OTP em claro dentro da janela de
validade é acesso imediato à conta.

O pepper (segredo da aplicação, vindo do Key Vault) soma-se ao salt por registro: o salt impede
tabela pré-computada, o pepper impede que vazamento **só** do banco seja suficiente.

## Timing attack

Comparação de segredo com `==`, `SequenceEqual` ou `string.Equals` retorna cedo na primeira
diferença. O tempo de resposta vaza quantos bytes iniciais estão corretos, e um atacante recupera o
segredo byte a byte.

```csharp
// ❌ Curto-circuito no primeiro byte diferente.
if (hashInformado.SequenceEqual(codigo.Hash))

// ❌ Mesmo problema.
if (tokenInformado == tokenArmazenado)

// ✅ Tempo constante.
if (CryptographicOperations.FixedTimeEquals(hashInformado, codigo.Hash))
```

Vale para **todo** segredo comparado: OTP, token de redefinição, assinatura de webhook, chave de
API. Bibliotecas de hash de senha (`PasswordHasher<T>`, Argon2, bcrypt) já fazem a comparação
correta internamente — não reimplemente.

Timing também vaza pelo **caminho de execução**: se o código sai cedo quando o e-mail não existe e
tarde quando existe, isso é enumeração medida por cronômetro. Execute o mesmo trabalho nos dois
ramos.

## Enumeração de usuário

A resposta não pode revelar se um e-mail está cadastrado. É o insumo do phishing direcionado e do
credential stuffing.

| Superfície | Vazamento | Correção |
|---|---|---|
| Login | "E-mail não cadastrado" vs "Senha incorreta" | Mensagem única para ambos |
| Solicitação de OTP | "Enviamos o código" vs "E-mail não encontrado" | Mensagem única; não envie nada se não existe |
| Cadastro | "E-mail já em uso" | Confirme por e-mail em vez de responder na tela |
| Recuperação de senha | Mensagens distintas | Mensagem única |
| Código HTTP | `404` vs `200` | Mesmo status |
| Tempo de resposta | Rápido quando não existe | Trabalho equivalente nos dois caminhos |
| Rate limit | Aplicado só a conta existente | Aplique antes de consultar a base |

```csharp
// ❌ Duas mensagens, dois tempos, duas rotas — a base inteira é enumerável.
var titular = await _repositorio.ObterPorEmailAsync(email, cancellationToken);
if (titular is null) return View("Erro", "E-mail não cadastrado.");

await _servicoOtp.EnviarAsync(titular, cancellationToken);
return View("CodigoEnviado");

// ✅ Uma mensagem, um caminho.
var titular = await _repositorio.ObterPorEmailAsync(email, cancellationToken);

if (titular is not null)
{
    await _servicoOtp.EnviarAsync(titular, cancellationToken);
}

return View("CodigoEnviado", MensagensAutenticacao.SeExistirEnviamosOCodigo);
```

A mensagem correta é do tipo "se este e-mail estiver cadastrado, enviamos um código". Ela é honesta
com o usuário legítimo e inútil para o atacante.

## Limitação de tentativas e bloqueio

| Alvo | Limite | Efeito ao estourar |
|---|---|---|
| Tentativas por código | 3 a 5 | Invalida o código; exige nova solicitação |
| Solicitações de OTP por conta | Poucas por janela curta | Recusa temporária |
| Solicitações por IP | Janela curta | Recusa temporária |
| Tentativas de login por conta | Progressivo | Atraso crescente ou bloqueio temporário |

Cuidados de desenho:

- Bloqueio **por conta** sem limite por IP permite negação de serviço direcionada: o atacante
  bloqueia a conta da vítima de propósito. Prefira atraso progressivo a bloqueio duro, e combine
  com limite por IP.
- Bloqueio **só por IP** é contornável com rotação de endereço. Use os dois eixos.
- Atrás de proxy/App Service, o IP real vem de `X-Forwarded-For`: configure
  `ForwardedHeadersOptions` com proxies conhecidos, senão o atacante forja o header e escapa do
  limite — ou bloqueia terceiros.
- A resposta do rate limit não deve revelar se a conta existe.
- Registre bloqueios na trilha de auditoria: são sinal de ataque em andamento.

```csharp
builder.Services.AddRateLimiter(opcoes =>
{
    opcoes.AddFixedWindowLimiter("otp", limitador =>
    {
        limitador.PermitLimit = 5;
        limitador.Window = TimeSpan.FromMinutes(15);
        limitador.QueueLimit = 0;
    });
});
```

## Autorização por padrão

`[Authorize]` esquecido em uma rota é falha silenciosa: nada quebra, e o endpoint fica público.
Inverta o padrão — exija autenticação globalmente e torne a exceção explícita:

```csharp
builder.Services.AddAuthorization(opcoes =>
{
    opcoes.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});
```

Com a política de fallback, `[AllowAnonymous]` passa a ser decisão consciente e visível na
auditoria: cada ocorrência no diff é um item a justificar.

Lembretes:

- `[Authorize]` responde "quem é você", não "este recurso é seu". Autorização de recurso é o A01 do
  `owasp-web`.
- Papel e permissão vêm da sessão, nunca de campo do formulário ou da query string.
- Verifique **todas** as superfícies: controller MVC, endpoints minimal API, Razor Pages, SignalR,
  healthcheck detalhado e rota de arquivo estático gerado.
- Autorização baseada em política (`RequireClaim`, requirement) é preferível a `if` de papel
  espalhado pelo código.

## Privilégio mínimo no banco

A role da aplicação não precisa poder destruir o schema.

```sql
REVOKE ALL ON SCHEMA <schema> FROM <role_aplicacao>;
GRANT USAGE ON SCHEMA <schema> TO <role_aplicacao>;

GRANT SELECT, INSERT, UPDATE, DELETE
   ON ALL TABLES IN SCHEMA <schema>
   TO <role_aplicacao>;

ALTER DEFAULT PRIVILEGES IN SCHEMA <schema>
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO <role_aplicacao>;
```

| Role | Privilégios | Onde é usada |
|---|---|---|
| Aplicação | DML nas tabelas do próprio schema | Runtime |
| Migration | DDL, dono do schema | Só na esteira de deploy |
| Leitura / relatório | `SELECT` restrito | Consulta analítica |
| Auditoria | `INSERT` e `SELECT` na tabela de trilha; **sem** `UPDATE`/`DELETE` | Trilha imutável |

Rodar a aplicação com a mesma credencial da migration significa que uma injeção bem-sucedida pode
executar DDL. Separar as roles reduz o impacto de uma falha em outro ponto — que é exatamente o
papel do privilégio mínimo.

## Checklist

- [ ] Cookie de sessão com `HttpOnly`, `Secure`, `SameSite` e expiração curta com deslizamento.
- [ ] Teto absoluto de sessão além da expiração deslizante.
- [ ] Identidade reemitida na autenticação (sem fixação de sessão); logout invalida no servidor.
- [ ] OTP gerado por gerador criptográfico, nunca por `Random` ou relógio.
- [ ] OTP de uso único, validade curta, com limite de tentativas que invalida o código.
- [ ] OTP persistido com hash, salt por registro e pepper fora do banco.
- [ ] Comparação de segredo com `CryptographicOperations.FixedTimeEquals`.
- [ ] Caminhos de execução equivalentes para conta existente e inexistente.
- [ ] Nenhuma mensagem, status ou tempo revela se o e-mail está cadastrado.
- [ ] Rate limit por conta **e** por IP, com `X-Forwarded-For` configurado corretamente.
- [ ] Bloqueio não permite negação de serviço direcionada contra a conta da vítima.
- [ ] Bloqueios registrados na trilha de auditoria.
- [ ] `FallbackPolicy` exigindo autenticação; cada `[AllowAnonymous]` justificado no diff.
- [ ] Papel e permissão sempre da sessão, nunca do cliente.
- [ ] Roles de banco separadas: aplicação sem DDL, migration só na esteira, auditoria sem `UPDATE`.
