# Configuração

> **Template do boilerplate.** Preencha ao implementar e remova este aviso.

Onde cada valor mora, como se escreve o nome dele, e o que fazer quando um segredo escapa. As regras
abaixo são norma do boilerplate; o detalhamento completo, com exemplos compilados, está em
[.ai/docs/configuracao.md](../../.ai/docs/configuracao.md). Este documento não pode contradizê-lo.

## A pergunta que decide o lugar

> **Se esse valor vazasse num print de tela, seria um incidente?**

- **Sim** → é segredo. Vai para `.env` (dev), User Secrets, Key Vault ou App Settings.
- **Não** → é configuração. Vai para `appsettings.json`, **versionada**.

Um segundo corte, para o que não é segredo:

> **Esse valor muda de máquina para máquina, ou é do projeto?**

- Muda por máquina (caminho local, porta de container, URL de serviço local) → `.env`.
- É do projeto (timeout, tamanho de página, nível de log, feature flag) → `appsettings.json`.

## Tabela de decisão — norma

| Valor | Onde | Por quê |
|---|---|---|
| Connection string com senha | `.env` / Key Vault | Segredo |
| Chave de API, token, client secret | `.env` / Key Vault | Segredo |
| Connection string do Application Insights | `.env` / Key Vault | Contém chave de instrumentação |
| Tamanho de página, timeout, retry | `appsettings.json` | Decisão do projeto, igual para todos |
| Nível de log por namespace | `appsettings.json` | Configuração, não segredo |
| Feature flag | `appsettings.json` | Precisa ser revisável em PR |
| URL de API externa (endereço público) | `appsettings.json` | Não é segredo; a **credencial** dela é |
| Nome do ambiente | `.env` (`ASPNETCORE_ENVIRONMENT`) | Varia por máquina |
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

O inverso — segredo no `appsettings.json` — é pior e mais óbvio: vai para o git e vira incidente.

## Convenção de nome — norma

O estilo **não é preferência**: decorre de quem lê a variável. Três casos, três formatos.

| Contexto | Formato | Exemplo |
|---|---|---|
| Chave do `appsettings.json` | PascalCase | `TamanhoPagina` |
| Sobrescrita .NET no `.env` | `Secao__Chave`, igual ao JSON | `Pedidos__TamanhoPagina` |
| Ferramenta externa no `.env` | SCREAMING_SNAKE_CASE | `POSTGRES_CONNECTION_STRING` |

Ver os dois últimos estilos convivendo no mesmo `.env` é **correto** — eles têm leitores diferentes.
O que é erro é o mesmo tipo de variável aparecer de duas formas.

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
kebab-case. O domínio segue o idioma do negócio; nomes da plataforma (`ConnectionStrings`, `Logging`,
`ApplicationInsights`) ficam como o .NET os define.

### 2. `.env` para o .NET — `Secao__Chave`

O nome **espelha a chave** do JSON, com `__` (dois underscores) por nível de hierarquia:

| JSON | Variável |
|---|---|
| `ConnectionStrings.Default` | `ConnectionStrings__Default` |
| `Pedidos.TamanhoPagina` | `Pedidos__TamanhoPagina` |
| `Logging.LogLevel.Default` | `Logging__LogLevel__Default` |
| `Pedidos.StatusVisiveis[0]` | `Pedidos__StatusVisiveis__0` |

Regras:

- **Dois underscores** separam nível, inclusive no terceiro. Um underscore só não funciona; `:`
  funciona no Linux mas não no Windows — use sempre `__`.
- **Maiúsculas e minúsculas seguem o JSON.** `ConnectionStrings__Default`, não
  `CONNECTIONSTRINGS__DEFAULT`.
- **Array usa índice numérico**, começando em `0`, sem buraco.
- Valor com `=` ou `;` precisa de aspas no shell:

  ```bash
  export ConnectionStrings__Default="Host=localhost;Database=banco;Password=abc"
  ```

- **Só entra aqui o que for segredo.** Se não for, o lugar é o `appsettings.json`.

### 3. `.env` para ferramenta externa — SCREAMING_SNAKE_CASE

Lido por processo que **não é o .NET** — servidor MCP, CLI, script de build:

```bash
POSTGRES_CONNECTION_STRING=postgresql://usuario:senha@localhost:5432/banco
ASPNETCORE_ENVIRONMENT=Development
```

Underscore simples. É a convenção universal de variável de ambiente, e a ferramenta externa espera
exatamente esse nome — `ASPNETCORE_ENVIRONMENT` e `POSTGRES_CONNECTION_STRING` não são escolha nossa.

## `.env` e `.env.example`

**Norma:** o `.env` fica **fora do git**; o `.env.example` é versionado e serve de contrato.

| Arquivo | Versionado | Contém |
|---|---|---|
| `.env.example` | Sim | A **forma** esperada — placeholder que não parece valor real |
| `.env` | **Não** | Os valores reais da máquina de quem desenvolve |

Toda variável do `.env` existe no `.env.example`. Variável que só existe na máquina de alguém é a
que quebra o onboarding do próximo — e ninguém descobre por semanas.

O `.env.example` deste repositório já traz o esqueleto: bloco de ferramenta externa
(`POSTGRES_CONNECTION_STRING`), bloco de runtime .NET (`ASPNETCORE_ENVIRONMENT`) e bloco de
configuração .NET (`ConnectionStrings__Default`, `ApplicationInsights__ConnectionString`, chaves de
integração). Mantenha essa separação por comentário — ela é o que ensina o formato correto a quem
adiciona a próxima variável.

**Norma do MCP postgres:** `POSTGRES_CONNECTION_STRING` aponta **sempre** para banco de
desenvolvimento ou cópia anonimizada — **nunca** para produção. Servidor remoto exige TLS
(`?sslmode=require`).

**Norma do Stripe:** em desenvolvimento, use **sempre** chave de teste (`sk_test_`/`pk_test_`).
`sk_live_` num `.env` local gera cobrança real.

## Ordem de precedência

Do menor para o maior — o último vence:

```text
appsettings.json
  └─ appsettings.{Environment}.json
       └─ User Secrets (só em Development)
            └─ variável de ambiente (.env, App Settings, esteira)
                 └─ argumento de linha de comando
```

É isso que permite versionar o `appsettings.json` com a estrutura e um valor padrão inofensivo, e
sobrescrever só o segredo por variável de ambiente em cada ambiente.

## Como fica no código

Configuração vira **classe de opções tipada**, nunca leitura solta de string.

```csharp
// Core/Settings — a classe de opções não conhece IConfiguration
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

| Detalhe | Efeito |
|---|---|
| `const string Secao` | Evita a string literal repetida em dois arquivos, que é como o nome da seção diverge do JSON em silêncio |
| `ValidateDataAnnotations` | Transforma `[Range]` em validação real; sem ela, o atributo é decorativo |
| `ValidateOnStart` | Falha na **inicialização**, não no primeiro request — configuração inválida vira erro de deploy, não incidente às três da manhã |

Consumo por injeção, sempre `IOptions<T>` — nunca `IConfiguration` espalhada pelo código. Ler
`IConfiguration["Pedidos:TamanhoPagina"]` no meio de um serviço perde tipagem, perde validação e
espalha o nome da chave: se ela mudar, o compilador não avisa.

Segredo continua lido pelo caminho próprio, com falha explícita:

```csharp
var conexao = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("Connection string 'Default' não configurada.");
```

O `throw` é deliberado: subir sem banco e falhar no primeiro request é pior que não subir. E **nunca
logue a connection string**, nem em erro de inicialização — ela contém a senha.

## Se um segredo for commitado — norma

**Rotacione primeiro.** Reescrever o histórico vem depois, e sozinho não resolve nada.

A ordem importa porque, no instante do push, o valor precisa ser tratado como **público**: ele já
está no clone de quem sincronizou, no cache do provedor, em fork, em CI, em qualquer indexador que
tenha passado por ali. Remover do histórico não recolhe nenhuma dessas cópias.

1. **Rotacione o segredo** no provedor — gere um novo, invalide o antigo. Este é o passo que
   efetivamente encerra o incidente.
2. **Atualize os ambientes** com o valor novo: `.env` local, Key Vault, App Settings, esteira.
3. **Remova o valor do código**, mova para o lugar correto e atualize o `.env.example` com a forma.
4. **Reescreva o histórico** se a exposição justificar, combinando com todo mundo que tenha clone —
   force push em branch compartilhada quebra a cópia de quem já partiu daquele histórico.
5. **Registre o incidente**: qual segredo, quando entrou, quando saiu, quando foi rotacionado.
6. **Verifique o uso** entre a exposição e a rotação — houve acesso indevido?

Se um segredo chegar por chat ou por qualquer canal não previsto, o tratamento é o mesmo: considere-o
comprometido e rotacione. Ver
[`segredos-configuracao`](../../.ai/skills/segredos-configuracao/SKILL.md).

## Configuração deste projeto

*Preencha com as seções reais do `appsettings.json` e as variáveis reais do `.env`. Registre a
**forma** e a **origem**, nunca o valor.*

| Seção / variável | Onde | Classe de opções | Para que serve |
|---|---|---|---|
| `ConnectionStrings__Default` | `.env` / Key Vault | — | Conexão do PostgreSQL |
| `ApplicationInsights__ConnectionString` | `.env` / Key Vault | — | Telemetria do ambiente |
| `POSTGRES_CONNECTION_STRING` | `.env` | — | Servidor MCP postgres |
| `ASPNETCORE_ENVIRONMENT` | `.env` / App Settings | — | Nome do ambiente |
| | | | |

Distribuição por ambiente: ver [deployment.md](deployment.md).

## Conferir na prática

Para provar que uma sobrescrita chega onde deveria, sem adivinhação:

```bash
export Pedidos__Notificacao__EmailRemetente="teste@exemplo.com.br"
dotnet run
```

Um endpoint temporário que injete `IOptions<PedidosOptions>` e devolva o valor resolve a dúvida em
segundos — desde que seja temporário e nunca chegue a um ambiente publicado.

## Checklist

- [ ] Nenhum segredo no `appsettings.json` ou `appsettings.Development.json` (ambos versionados).
- [ ] Nada que não seja segredo nem específico de máquina no `.env`.
- [ ] Toda variável do `.env` existe no `.env.example`, com placeholder que não parece valor real.
- [ ] Sobrescrita .NET usa `Secao__Chave`, com maiúsculas iguais às do JSON.
- [ ] Variável de ferramenta externa em SCREAMING_SNAKE_CASE.
- [ ] Configuração nova tem classe de opções, `Bind`, `ValidateDataAnnotations` e `ValidateOnStart`.
- [ ] Nenhum `IConfiguration["..."]` espalhado fora da composição da raiz.
- [ ] Connection string nunca é logada.
- [ ] `.env` fora do git — conferido com `git status`.

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
| Segredo apareceu no PR | Estava no `appsettings.json` | Mover para `.env`; **rotacionar antes** |
| Lista com item faltando | Array definido a partir do índice 1 | Índice começa em `0`, sem buraco |
