# Autenticação e autorização

> **Template do boilerplate.** Preencha ao implementar e remova este aviso.

Como o sistema sabe **quem** está falando (autenticação) e **o que** essa pessoa pode fazer
(autorização). São perguntas distintas: `[Authorize]` responde a primeira e não diz nada sobre a
segunda.

Norma técnica completa em
[`autenticacao-autorizacao`](../../.ai/skills/autenticacao-autorizacao/SKILL.md). Este documento
registra as decisões **deste projeto** e repete o que é fixo.

## Modelo adotado

*Preencha com o que este projeto usa e por quê. O boilerplate traz suporte de primeira classe a
sessão por cookie e a OTP por e-mail; qualquer outro mecanismo (OAuth, SSO corporativo, senha) é
decisão do projeto e precisa ser justificada aqui.*

| Decisão | Valor | Justificativa |
|---|---|---|
| Mecanismo de identificação | | |
| Transporte da sessão | | |
| Provedor de identidade | | |
| Papéis existentes | | |

Credencial de provedor externo (OAuth, SSO) **só o usuário cria** — ver
[integrations.md](integrations.md).

## Sessão por cookie

Configuração de referência, com os valores que o boilerplate considera padrão:

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
| Expiração absoluta | Teto independente do uso | Sessão deslizante sem teto **nunca** expira |
| Cookie persistente | Só com opção explícita do usuário | "Lembrar-me" é escolha, não padrão |
| Rotação após elevação | Emitir cookie novo ao autenticar | Previne fixação de sessão |

Dois pontos que costumam ser esquecidos:

- Ao concluir a autenticação, **emita identidade nova** em vez de reaproveitar a anterior —
  `SignInAsync` após `SignOutAsync`. É isso que neutraliza fixação de sessão.
- Logout precisa **invalidar do lado do servidor** quando houver estado de sessão persistido. Apagar
  o cookie no cliente não impede o reuso de um cookie já capturado.

*Registre aqui os valores efetivos deste projeto, se divergirem, com o motivo da divergência.*

## OTP por e-mail

O OTP é frequentemente o elo mais fraco: é curto, chega por canal não confiável e costuma ser
implementado com pressa. Valores de referência — **norma**:

| Requisito | Valor | Motivo |
|---|---|---|
| Comprimento | 6 dígitos ou mais | 10⁶ só é seguro **com** limite de tentativas |
| Geração | Gerador criptográfico | `Random` é previsível a partir da semente |
| Validade | 5 a 10 minutos | Janela de ataque curta |
| Uso | **Único** — invalidar no primeiro uso | Reuso permite replay |
| Tentativas | 3 a 5 por código, depois invalida | Sem isso, 6 dígitos caem por força bruta |
| Emissão | Limite por conta **e** por IP | Impede uso do sistema como spammer |
| Armazenamento | Hash com salt e pepper | Banco comprometido não entrega códigos válidos |
| Vínculo | Ao identificador da solicitação, não só ao e-mail | Impede usar código de outro fluxo |

```csharp
public static string GerarCodigo()
{
    Span<byte> bytes = stackalloc byte[4];
    RandomNumberGenerator.Fill(bytes);

    var valor = BinaryPrimitives.ReadUInt32BigEndian(bytes) % 1_000_000;

    return valor.ToString("D6", CultureInfo.InvariantCulture);
}
```

O código **nunca** é persistido em claro. Se o banco vazar, um OTP em claro dentro da janela de
validade é acesso imediato à conta. O salt impede tabela pré-computada; o pepper — segredo da
aplicação, fora do banco — impede que vazamento **só** do banco seja suficiente.

### Comparação em tempo constante

`==`, `SequenceEqual` e `string.Equals` retornam na primeira diferença. O tempo de resposta vaza
quantos bytes iniciais estão corretos, e o segredo é recuperado byte a byte.

```csharp
// ❌ Curto-circuito no primeiro byte diferente.
if (hashInformado.SequenceEqual(codigo.Hash))

// ✅ Tempo constante.
if (CryptographicOperations.FixedTimeEquals(hashInformado, codigo.Hash))
```

Vale para **todo** segredo comparado: OTP, token de redefinição, assinatura de webhook, chave de API.

### Enumeração de usuário

A resposta não pode revelar se um e-mail está cadastrado — é o insumo do phishing direcionado e do
credential stuffing. Mensagem única, status HTTP único, tempo equivalente nos dois caminhos:

```csharp
var titular = await _repositorio.ObterPorEmailAsync(email, cancellationToken);

if (titular is not null)
{
    await _servicoOtp.EnviarAsync(titular, cancellationToken);
}

return View("CodigoEnviado", MensagensAutenticacao.SeExistirEnviamosOCodigo);
```

A mensagem correta é do tipo "se este e-mail estiver cadastrado, enviamos um código": honesta com o
usuário legítimo, inútil para o atacante.

## `[Authorize]` por padrão

**Norma.** `[Authorize]` esquecido em uma rota é falha silenciosa — nada quebra e o endpoint fica
público. Inverta o padrão: exija autenticação globalmente e torne a exceção explícita.

```csharp
builder.Services.AddAuthorization(opcoes =>
{
    opcoes.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});
```

Com a política de fallback, cada `[AllowAnonymous]` vira decisão consciente e **visível no diff** —
um item a justificar na revisão.

Lembretes:

- Papel e permissão vêm **da sessão**, nunca de campo do formulário ou da query string.
- Verifique todas as superfícies: controller MVC, minimal API, Razor Pages, SignalR, health check
  detalhado, rota de arquivo estático gerado.
- Autorização por política (`RequireClaim`, requirement) é preferível a `if` de papel espalhado.
- Rota auxiliar de preview/diagnóstico fica `[AllowAnonymous]`, mas com **guarda de ambiente**
  retornando `404` fora de Development.
- Toda action `POST` exige `[ValidateAntiForgeryToken]`.

## Privilégio mínimo

`[Authorize]` responde "quem é você", **não** "este recurso é seu". Autorização de recurso — o
registro pertence a este usuário, a este cliente, a este contexto — é verificação separada, e é o
vetor mais comum de falha (IDOR).

```csharp
// ❌ Autenticado é diferente de dono. Trocar o id na URL acessa o registro alheio.
var pedido = await _repositorio.ObterAsync(id, cancellationToken);

// ✅ O escopo do usuário entra na consulta, não numa checagem posterior fácil de esquecer.
var pedido = await _repositorio.ObterDoContextoAsync(id, usuario.IdContexto, cancellationToken);
```

*Documente aqui a matriz de permissões do projeto: quais papéis existem, o que cada um pode fazer, e
qual é o escopo de dados de cada um.*

| Papel | Pode | Não pode | Escopo de dados |
|---|---|---|---|
| | | | |

## Limitação de tentativas

| Alvo | Limite | Efeito ao estourar |
|---|---|---|
| Tentativas por código | 3 a 5 | Invalida o código; exige nova solicitação |
| Solicitações de OTP por conta | Poucas por janela curta | Recusa temporária |
| Solicitações por IP | Janela curta | Recusa temporária |
| Tentativas de login por conta | Progressivo | Atraso crescente ou bloqueio temporário |

Cuidados de desenho:

- Bloqueio **por conta** sem limite por IP permite negação de serviço direcionada — o atacante
  bloqueia a conta da vítima de propósito. Prefira atraso progressivo e combine os dois eixos.
- Bloqueio **só por IP** é contornável com rotação de endereço.
- Atrás de proxy ou App Service, o IP real vem de `X-Forwarded-For`: configure
  `ForwardedHeadersOptions` com proxies conhecidos, senão o header é forjado e o limite é inútil.
- A resposta do rate limit não pode revelar se a conta existe.

## O que guardar, o que nunca logar

**Norma.**

| Guardar | Como |
|---|---|
| Identificador opaco do usuário | Chave técnica, não e-mail |
| Hash do OTP | Com salt por registro e pepper fora do banco |
| Momento e resultado das tentativas | Trilha de auditoria |
| Bloqueios acionados | Sinal de ataque em andamento |

**Nunca logar, em nenhum nível, em nenhum ambiente de produção:**

- Senha, em claro ou hash.
- Código OTP.
- Token de sessão, cookie, `Authorization` header.
- Chave de API, `client secret`, connection string.
- Dado pessoal identificável — e-mail, CPF, telefone, nome — em telemetria.

No Application Insights, o `AuthenticatedUserId` recebe um **identificador opaco**, nunca e-mail ou
documento: telemetria não é repositório de dado pessoal. Ver
[deployment.md](deployment.md) e
[`dados-pessoais-modelagem`](../../.ai/skills/dados-pessoais-modelagem/SKILL.md).

Em Development, um código de uso único pode ir ao log. Em produção, jamais — e a diferença precisa
ser garantida por configuração, não por lembrança.

## Sessão e expiração — decisões deste projeto

*Preencha com os valores efetivos e o raciocínio por trás de cada um. Números sem justificativa
viram folclore e ninguém ousa mudá-los depois.*

| Parâmetro | Valor | Por quê |
|---|---|---|
| Expiração deslizante | | |
| Teto absoluto de sessão | | |
| Validade do OTP | | |
| Tentativas por OTP | | |
| "Lembrar-me" | | |

## Checklist de revisão

- [ ] Cookie com `HttpOnly`, `Secure`, `SameSite` e expiração curta com deslizamento.
- [ ] Teto absoluto de sessão além da expiração deslizante.
- [ ] Identidade reemitida na autenticação; logout invalida no servidor.
- [ ] OTP por gerador criptográfico, uso único, validade curta, tentativas limitadas.
- [ ] OTP persistido com hash, salt por registro e pepper fora do banco.
- [ ] Comparação de segredo com `CryptographicOperations.FixedTimeEquals`.
- [ ] Nenhuma mensagem, status ou tempo revela se o e-mail está cadastrado.
- [ ] Rate limit por conta **e** por IP, com `X-Forwarded-For` configurado.
- [ ] `FallbackPolicy` exigindo autenticação; cada `[AllowAnonymous]` justificado no diff.
- [ ] Autorização de **recurso** verificada, não só autenticação.
- [ ] Papel e permissão sempre da sessão, nunca do cliente.
- [ ] Nenhum segredo, token ou dado pessoal em log ou telemetria.
- [ ] Roles de banco separadas: aplicação sem DDL, auditoria sem `UPDATE`.
