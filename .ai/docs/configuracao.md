# Configuração — o que vai onde, e como se escreve

Dois erros comuns, tratados aqui: jogar configuração de aplicação no `.env`, e misturar estilos de
nome de variável. O segundo costuma ser sintoma do primeiro.

## A pergunta que decide o lugar

> **Se esse valor vazasse num print de tela, seria um incidente?**

- **Sim** → é segredo. Vai para `.env` (dev), User Secrets, Key Vault ou App Settings.
- **Não** → é configuração. Vai para `appsettings.json`, **versionada**.

Um segundo corte, para o que não é segredo:

> **Esse valor muda de máquina para máquina, ou é do projeto?**

- Muda por máquina (caminho local, porta de container, URL de serviço local) → `.env`.
- É do projeto (timeout, tamanho de página, nível de log, feature flag) → `appsettings.json`.

## Tabela de decisão

| Valor | Onde | Por quê |
|---|---|---|
| Connection string com senha | `.env` / Key Vault | Segredo |
| Chave de API, token, client secret | `.env` / Key Vault | Segredo |
| Connection string do Application Insights | `.env` / Key Vault | Contém chave de instrumentação |
| Tamanho de página, timeout, retry | `appsettings.json` | Decisão do projeto, igual para todos |
| Nível de log por namespace | `appsettings.json` | Configuração, não segredo |
| Feature flag | `appsettings.json` | Precisa ser revisável em PR |
| URL de API externa (endereço público) | `appsettings.json` | Não é segredo; a **credencial** dela é |
| Nome do ambiente (`Development`) | `.env` (`ASPNETCORE_ENVIRONMENT`) | Varia por máquina |
| Caminho local, porta de container | `.env` | Varia por máquina |
| Cultura, fuso horário padrão | `appsettings.json` | Decisão do projeto |

## Por que não jogar tudo no `.env`

É tentador — "não versiona, não vaza". Os custos, na prática:

1. **Some da revisão.** Mudar timeout de 30s para 5s no `appsettings.json` aparece no diff e alguém
   questiona. No `.env`, muda na máquina de uma pessoa e ninguém vê.
2. **Quebra em quem clona.** Configuração que só existe no `.env` de alguém não chega ao próximo — a
   aplicação sobe com comportamento diferente, ou não sobe.
3. **Perde a tipagem.** `appsettings.json` liga em classe de opções (`IOptions<T>`) com tipo e
   validação. Variável de ambiente é sempre string.
4. **Perde a hierarquia por ambiente.** `appsettings.Production.json` sobrescreve o base
   automaticamente; `.env` não tem esse mecanismo.
5. **Esconde o que é realmente segredo.** Um `.env` com 40 linhas, das quais 3 são senha, faz o
   segredo passar despercebido na hora de rotacionar.

O inverso — segredo no `appsettings.json` — é pior e mais óbvio: vai para o git e vira o incidente
que [`segredos-configuracao`](../skills/segredos-configuracao/SKILL.md) descreve.

## Convenção de nome

O estilo **não é preferência**: decorre de quem lê a variável. Três casos, três formatos.

### 1. `appsettings.json` — PascalCase

```json
{
  "ConnectionStrings": { "Default": "" },
  "Pedidos": {
    "TamanhoPagina": 25,
    "TempoLimiteSegundos": 30
  }
}
```

PascalCase em chave e seção, casando com a classe de opções em C#. Sem prefixo, sem underscore, sem
kebab-case. O domínio segue o idioma do negócio, como manda o [AGENTS.md](../../AGENTS.md); nomes da
plataforma (`ConnectionStrings`, `Logging`, `ApplicationInsights`) ficam como o .NET os define.

### 2. `.env` para o .NET — `Secao__Chave`

Sobrescreve o `appsettings.json` — o nome **espelha a chave**, com `__` (dois underscores) para cada
nível de hierarquia:

```bash
ConnectionStrings__Default=Host=localhost;...
Pedidos__TamanhoPagina=50
```

Partindo deste `appsettings.json`:

```json
{
  "ConnectionStrings": { "Default": "" },
  "Logging": { "LogLevel": { "Default": "Information" } },
  "Pedidos": {
    "TamanhoPagina": 25,
    "Notificacao": { "EmailRemetente": "nao-responda@exemplo.com.br" },
    "StatusVisiveis": [ "Aberto", "Faturado" ]
  }
}
```

as sobrescritas ficam:

| JSON | Variável |
|---|---|
| `ConnectionStrings.Default` | `ConnectionStrings__Default` |
| `Pedidos.TamanhoPagina` | `Pedidos__TamanhoPagina` |
| `Logging.LogLevel.Default` | `Logging__LogLevel__Default` |
| `Pedidos.Notificacao.EmailRemetente` | `Pedidos__Notificacao__EmailRemetente` |
| `Pedidos.StatusVisiveis[0]` | `Pedidos__StatusVisiveis__0` |

Regras:

- **Dois underscores** separam nível — inclusive no terceiro nível, como
  `Logging__LogLevel__Default`. Um underscore só não funciona; `:` funciona no Linux mas não no
  Windows, então use sempre `__`.
- **Maiúsculas e minúsculas seguem o JSON.** `ConnectionStrings__Default`, não
  `CONNECTIONSTRINGS__DEFAULT`.
- **Array usa índice numérico**: `Pedidos__StatusVisiveis__0`, `__1`, e assim por diante. Definir só
  o índice `1` deixa um buraco — a lista resultante não é a que você espera. Para trocar uma lista
  inteira, o `appsettings.{Environment}.json` costuma ser mais legível.
- **Valor com `=` ou `;` não precisa de escape**, mas precisa de aspas no shell:

  ```bash
  # a connection string tem ; e = — sem aspas, o shell quebra na primeira ;
  export ConnectionStrings__Default="Host=localhost;Database=banco;Password=abc"
  ```

- Só entra aqui o que for **segredo**. Se não for, o lugar é o `appsettings.json`.

### 3. `.env` para ferramenta externa — SCREAMING_SNAKE_CASE

Lido por processo que não é o .NET (servidor MCP, CLI, script de build):

```bash
POSTGRES_CONNECTION_STRING=postgresql://...
ASPNETCORE_ENVIRONMENT=Development
```

`SCREAMING_SNAKE_CASE`, underscore simples. É a convenção universal de variável de ambiente, e
ferramenta externa espera exatamente esse nome — `ASPNETCORE_ENVIRONMENT` e
`POSTGRES_CONNECTION_STRING` não são escolha nossa.

### Resumo

| Contexto | Formato | Exemplo |
|---|---|---|
| Chave do `appsettings.json` | PascalCase | `TamanhoPagina` |
| Sobrescrita .NET no `.env` | `Secao__Chave`, igual ao JSON | `Pedidos__TamanhoPagina` |
| Ferramenta externa no `.env` | SCREAMING_SNAKE_CASE | `POSTGRES_CONNECTION_STRING` |

Ver `.env` com os dois últimos estilos convivendo é **correto** — eles têm leitores diferentes. O que
é erro é o mesmo tipo de variável aparecer de duas formas.

## Ordem de precedência

Do menor para o maior — o último vence:

```text
appsettings.json
  └─ appsettings.{Environment}.json
       └─ User Secrets (só em Development)
            └─ variável de ambiente (.env, App Settings, esteira)
                 └─ argumento de linha de comando
```

É isso que permite versionar o `appsettings.json` com a estrutura e valor padrão inofensivo, e
sobrescrever só o segredo por variável de ambiente em cada ambiente.

## Como fica no código

Configuração vira classe de opções tipada, nunca leitura solta de string:

```csharp
// Core — a classe de opções não conhece IConfiguration
public sealed class PedidosOptions
{
    public const string Secao = "Pedidos";

    [Range(1, 200)]
    public int TamanhoPagina { get; init; } = 25;

    [Range(1, 300)]
    public int TempoLimiteSegundos { get; init; } = 30;
}
```

```csharp
// Web/Program.cs — a composição da raiz amarra seção e classe
builder.Services
    .AddOptions<PedidosOptions>()
    .Bind(builder.Configuration.GetSection(PedidosOptions.Secao))
    .ValidateDataAnnotations()
    .ValidateOnStart();
```

Três detalhes que fazem diferença:

- **`const string Secao`** evita a string literal repetida em dois arquivos, que é como o nome da
  seção silenciosamente diverge do JSON.
- **`ValidateDataAnnotations`** transforma `[Range]` em validação real. Sem ela, o atributo é
  decorativo.
- **`ValidateOnStart`** falha na **inicialização**, não no primeiro request. Configuração inválida
  vira erro de deploy, não incidente em produção às três da manhã.

Consumo por injeção, sempre `IOptions<T>` — nunca `IConfiguration` espalhada pelo código:

```csharp
public sealed class PedidoService
{
    private readonly PedidosOptions _opcoes;

    public PedidoService(IOptions<PedidosOptions> opcoes) => _opcoes = opcoes.Value;
}
```

Ler `IConfiguration["Pedidos:TamanhoPagina"]` no meio de um serviço perde tipagem, perde validação e
espalha o nome da chave — se ela mudar, o compilador não avisa.

Segredo continua lido pelo caminho próprio, com falha explícita:

```csharp
var conexao = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("Connection string 'Default' não configurada.");
```

O `throw` é deliberado: subir sem banco e falhar no primeiro request é pior que não subir. E **nunca
logue a connection string**, nem em erro de inicialização — ela contém a senha.

## Conferir na prática

Para provar que uma sobrescrita chega onde deveria, sem adivinhação:

```bash
export Pedidos__Notificacao__EmailRemetente="teste@exemplo.com.br"
dotnet run
```

Um endpoint temporário que injete `IOptions<PedidosOptions>` e devolva o valor resolve a dúvida em
segundos. Se o valor não mudou, o problema costuma ser um destes: nome da seção divergente do JSON,
underscore simples em vez de duplo, ou a variável exportada num shell diferente do que rodou a
aplicação.

Os exemplos deste documento foram compilados e executados em .NET 10 — hierarquia de dois e três
níveis, array por índice, connection string com `;` e `=`, e `ValidateOnStart` barrando valor fora da
faixa.

## Checklist

- [ ] Nenhum segredo no `appsettings.json` ou `appsettings.Development.json` (ambos versionados).
- [ ] Nada que não seja segredo nem específico de máquina no `.env`.
- [ ] Toda variável do `.env` existe no `.env.example`, com placeholder que não parece valor real.
- [ ] Sobrescrita .NET usa `Secao__Chave`, com maiúsculas iguais às do JSON.
- [ ] Variável de ferramenta externa em SCREAMING_SNAKE_CASE.
- [ ] Configuração nova tem classe de opções, `Bind` e `ValidateOnStart`.
- [ ] Connection string nunca é logada.

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Variável de ambiente ignorada | Underscore simples (`Pedidos_TamanhoPagina`) | Dois underscores por nível |
| Variável ignorada, com `__` correto | Nome da seção diverge do JSON | `const string Secao` usado nos dois lados |
| Funciona no Linux, não no Windows | Separador `:` em vez de `__` | Sempre `__` |
| Shell quebra na connection string | `;` não escapado | Aspas em volta do valor |
| Valor inválido só quebra em produção | Sem `ValidateOnStart` | Adicionar `Bind` + validação |
| `[Range]` não faz nada | Falta `ValidateDataAnnotations` | Encadear após o `Bind` |
| Chave mudou e nada avisou | `IConfiguration["..."]` espalhada | Injetar `IOptions<T>` |
| Segredo apareceu no PR | Estava no `appsettings.json` | Mover para `.env`; rotacionar antes |
| Lista com item faltando | Array definido a partir do índice 1 | Índice começa em `0`, sem buraco |
