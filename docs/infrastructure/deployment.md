# Deploy

> **Template do boilerplate.** Preencha ao implementar e remova este aviso.

Como o código chega a cada ambiente, o que roda antes de chegar, e o que fazer quando o que chegou
está errado. A parte mais importante do documento é a última: **rollback ensaiado**. Deploy que não
tem caminho de volta não é deploy, é aposta.

## Alvo

*Preencha com a plataforma real deste projeto — Azure App Service, container em Kubernetes, VM,
outro. Registre região, SKU e quem provisiona.*

| Item | Valor |
|---|---|
| Plataforma de hospedagem | |
| Região | |
| Runtime | .NET 10 (`net10.0`) |
| Banco | PostgreSQL — ver [database.md](database.md) |
| Telemetria | Azure Application Insights (obrigatório) |

## Cadeia de ambientes

```text
main (produção) ──► staging ──► homolog
```

| Branch | Ambiente | Regra |
|---|---|---|
| `main` | Produção | Origem de toda branch nova. **Nunca** recebe commit direto |
| `staging` | Integração | Recebe merge das branches de feature |
| `homolog` | Homologação | Recebe o que está validado em staging |

**Norma:** branch nova nasce de `origin/main`, mesmo que vá ser integrada primeiro em `staging` —
partir de `staging` traz para o PR trabalho de terceiros ainda não promovido. Commit direto em `main`
está proibido sem exceção, inclusive correção urgente, que segue o mesmo fluxo por branch
`fix/<escopo>` e PR. Detalhes em [`fluxo-branches`](../../.ai/skills/fluxo-branches/SKILL.md).

*Registre aqui a URL de cada ambiente, quem aprova a promoção e qual é a janela de deploy acordada.*

| Ambiente | URL | Quem aprova | Janela |
|---|---|---|---|
| | | | |

## Build de release

O mesmo bloco que roda antes de qualquer entrega roda na esteira — **norma**, literal do
[AGENTS.md](../../AGENTS.md). Em PowerShell:

```powershell
Set-Location src/<Produto>.<Modulo>.Web
npm run typecheck
Set-Location ../..
dotnet build <Produto>.slnx -c Release
dotnet test <Produto>.slnx -c Release --no-build
```

Em bash ou zsh (macOS, Linux e os agentes `ubuntu-latest` da esteira):

```bash
npm --prefix src/<Produto>.<Modulo>.Web run typecheck
dotnet build <Produto>.slnx -c Release
dotnet test <Produto>.slnx -c Release --no-build
```

Sem erros **e sem avisos**.

**"Sem avisos" só é verificável porque dois arquivos da raiz vêm do boilerplate — não os remova:**

| Arquivo | Papel |
|---|---|
| `Directory.Build.props` | Aplica `TreatWarningsAsErrors`, `Nullable`, `EnforceCodeStyleInBuild` e `AnalysisLevel` a **todos** os projetos, não só aos de teste |
| `.editorconfig` | Converte as convenções do `AGENTS.md` em regra de analisador que quebra o build |

Sem eles, "sem avisos" volta a depender de disciplina manual — e a esteira passa a aprovar código que
a norma reprova.

Publicação do artefato:

```bash
dotnet publish src/<Produto>.<Modulo>.Web -c Release -o <saida>
```

O `.csproj` da Web amarra `npm install` e `npm run build` a targets `BeforeBuild` — os assets do Vite
saem do mesmo comando, com hash de conteúdo e `manifest.json` para o Razor resolver.

**Norma:** o artefato promovido entre ambientes é **o mesmo binário**. Recompilar por ambiente
introduz a possibilidade de que o que foi testado em homologação não seja o que foi para produção. O
que varia por ambiente é **configuração**, não build.

## Pipeline

**A esteira é Azure DevOps / Azure Pipelines**, definida em YAML versionado no próprio repositório.
O YAML de referência completo — pronto para copiar e ajustar — está na seção
**12.3 Pipeline de referência** de
[estrutura-arquitetura.md](../../.ai/docs/estrutura-arquitetura.md#123-pipeline-de-referência--azure-pipelines).
O boilerplate não versiona um `azure-pipelines.yml` executável porque não tem código .NET; o projeto
derivado copia o de referência para a raiz.

| Item | Valor |
|---|---|
| Plataforma de CI/CD | Azure DevOps (Azure Pipelines) |
| Arquivo de definição | `azure-pipelines.yml` na raiz do repositório |
| Origem | Seção 12.3 de [estrutura-arquitetura.md](../../.ai/docs/estrutura-arquitetura.md) |

| Stage | O que faz | Depende de |
|---|---|---|
| `Build` | SDK .NET 10 → restore → auditoria de dependências → `npm ci` + typecheck + build de assets → publish do Web → artefato | — |
| `Test` | Restore da solution → `dotnet test` em Release com publicação de resultados | `Build` |
| `Deploy` | Publica no ambiente conforme a branch de origem | **`Test`** |

**Ponto de atenção que já custou caro:** faça o stage `Deploy` depender de **`Test`**, não apenas de
`Build`. Com a dependência apenas em `Build`, uma falha de teste **não bloqueia o deploy** — o
pipeline fica verde onde importa e vermelho onde ninguém olha.

A auditoria de dependência (`dotnet list package --vulnerable --include-transitive` e `npm audit`)
**falha o stage**, não apenas registra aviso — ver
[`dependencias-vulneraveis`](../../.ai/skills/dependencias-vulneraveis/SKILL.md).

*Registre a organização e o projeto no Azure DevOps, o nome do pipeline, a service connection usada
no deploy, os environments configurados e qualquer stage adicional deste projeto — análise estática,
smoke test, aprovação manual antes de produção.*

| Item | Valor |
|---|---|
| Organização / projeto no Azure DevOps | |
| Nome do pipeline | |
| Service connection do deploy | |
| Environments configurados | |
| Aprovação manual antes de produção | |

## Variáveis por ambiente

**Norma:** configuração vai no `appsettings.json` (versionada); apenas segredo e o que varia por
máquina/ambiente vem por variável de ambiente. Formato e precedência em
[configuration.md](configuration.md).

Ordem de precedência, do menor para o maior:

```text
appsettings.json
  └─ appsettings.{Environment}.json
       └─ User Secrets (só em Development)
            └─ variável de ambiente (App Settings, esteira)
                 └─ argumento de linha de comando
```

Em produção, o segredo vem de **Key Vault ou App Settings do próprio serviço** — nunca de `.env`
implantado junto do artefato.

| Variável | Dev | Homolog | Staging | Produção |
|---|---|---|---|---|
| `ASPNETCORE_ENVIRONMENT` | `Development` | | | `Production` |
| `ConnectionStrings__Default` | `.env` local | Key Vault | Key Vault | Key Vault |
| `ApplicationInsights__ConnectionString` | vazio | recurso próprio | recurso próprio | recurso próprio |

**Cada ambiente usa recurso próprio de Application Insights.** Telemetria de homologação poluindo os
alertas de produção é como desligar os alertas — mais lentamente.

*Complete a tabela com as variáveis deste projeto. Registre a **origem** de cada valor, nunca o
valor.*

## Migrations no deploy

*Decisão do projeto. Registre qual das duas estratégias foi adotada e por quê.*

| Estratégia | Como | Quando faz sentido |
|---|---|---|
| Aplicação no startup | O host aplica as migrations dos contextos próprios ao subir | Instância única, equipe pequena, janela curta |
| Script na esteira | `dotnet ef migrations script --idempotent`, aplicado em stage próprio | Múltiplas instâncias, revisão do DDL antes de rodar, privilégio separado |

O startup automático tem um custo que só aparece na escala: com múltiplas instâncias subindo em
paralelo, duas tentam migrar ao mesmo tempo. E a role da aplicação passa a precisar de DDL, o que
contraria o privilégio mínimo de [authentication.md](authentication.md).

Regras que valem nas duas estratégias:

- **Migration só para contexto do qual o projeto é dono.** Schema alheio é consumido, nunca migrado.
- **Migration compatível com a versão anterior do código** quando houver deploy sem downtime — a
  instância antiga ainda está atendendo enquanto a nova sobe.
- **Mudança destrutiva em duas etapas.** Deploy 1 para de usar a coluna; deploy 2 a remove. `DROP
  COLUMN` junto com o código que parou de usá-la não tem volta se o rollback for necessário.
- **Backup confirmado antes de migration destrutiva** — ver [database.md](database.md).

## Health check

*Registre o endpoint, o que ele verifica e quem o consome.*

| Item | Valor |
|---|---|
| Endpoint | `/health` |
| Verifica | Banco alcançável, dependências essenciais |
| Consumido por | Load balancer, monitoramento externo |
| Autenticação | Superficial público; **detalhado exige autorização** |

O health check detalhado — que expõe nome de dependência, versão e string de erro — é uma superfície
esquecida com frequência: ele descreve a topologia interna para quem estiver perguntando. Deixe
público apenas o suficiente para o balanceador decidir se roteia.

Health check que só responde "estou vivo" sem tocar o banco tem valor limitado: o processo continua
respondendo enquanto o banco está fora, e o balanceador mantém tráfego numa instância que não
funciona.

## Rollback

*Preencha com o procedimento real, testado. "Voltar o deploy anterior" não é procedimento — é
esperança.*

| Pergunta | Resposta |
|---|---|
| Como se reverte o código? | |
| Quanto tempo leva? | |
| Quem pode executar? | |
| Precisa de aprovação? | |
| O que acontece com as migrations já aplicadas? | |
| Qual o critério para acionar? | |

O ponto difícil é sempre o banco. **Reverter o código é barato; reverter o schema, não.** É por isso
que a mudança destrutiva vai em duas etapas: entre o deploy 1 e o deploy 2 existe uma janela em que o
rollback do código funciona sem tocar no banco.

No Git, dentro de branch compartilhada, a reversão é `git revert` — nunca `reset` com force push, que
quebra a cópia de todo mundo que já partiu daquele histórico. Ver
[`recuperacao-git`](../../.ai/skills/recuperacao-git/SKILL.md).

**Ensaie o rollback fora do incidente.** Um procedimento executado pela primeira vez às três da manhã
com produção fora não é procedimento.

## Observabilidade — obrigatória

**Norma:** todo projeto envia logging, métricas e rastreamento para o **Azure Application Insights**.
Não é opcional: sem telemetria centralizada não há diagnóstico de produção, e `Console.WriteLine` ou
log em arquivo não sobrevivem a um serviço reiniciado ou escalado horizontalmente.

Registre o SDK **cedo** no `Program.cs`, antes das demais dependências, para capturar exceções do
próprio startup:

```csharp
builder.Services.AddApplicationInsightsTelemetry(options =>
{
    options.ConnectionString = builder.Configuration["ApplicationInsights:ConnectionString"];
    options.EnableAdaptiveSampling = true;
});

builder.Services.ConfigureTelemetryModule<DependencyTrackingTelemetryModule>(
    (module, _) => module.EnableSqlCommandTextInstrumentation = false);
```

Três decisões que não são detalhe:

| Decisão | Motivo |
|---|---|
| **`ConnectionString`, nunca `InstrumentationKey`** | A chave está descontinuada e não suporta endpoints regionais |
| **`EnableSqlCommandTextInstrumentation = false`** | O texto do SQL pode conter dado pessoal e não deve sair da aplicação |
| **Connection string vazia não falha o startup** | O projeto roda localmente sem recurso Azure provisionado |

### Como logar

`ILogger<T>` injetado, **sempre estruturado** — placeholders nomeados, nunca interpolação de string.
A interpolação destrói a possibilidade de consultar por dimensão.

```csharp
logger.LogInformation(
    "Salvando <entidade> {Codigo} no contexto {IdContexto}.",
    dto.Codigo,
    dto.IdContexto);
```

| Nível | Uso |
|---|---|
| `Critical` | Aplicação inutilizável; exige ação imediata |
| `Error` | Operação falhou e o usuário foi afetado |
| `Warning` | Situação recuperável ou degradada — fallback acionado, integração indisponível |
| `Information` | Marcos de negócio: entidade criada, integração sincronizada, login efetuado |
| `Debug` / `Trace` | Somente Development; nunca em produção |

Regras: **nunca logar segredo ou dado pessoal**; não logar e relançar a mesma exceção; não duplicar
com `try/catch` que apenas loga, já que exceção não tratada é capturada automaticamente.

O `AuthenticatedUserId` recebe **identificador opaco**, nunca e-mail, CPF ou nome.

### Alertas

**Telemetria que ninguém observa não é observabilidade.** Configure alertas sobre taxa de erro,
latência e disponibilidade, e defina quem os recebe.

*Preencha aqui os alertas configurados, o limiar de cada um e para quem vão.*

| Alerta | Limiar | Destinatário | Ação esperada |
|---|---|---|---|
| | | | |

Amostragem adaptativa fica ligada em produção — Application Insights é cobrado por volume ingerido, e
a amostragem preserva a correlação: se uma requisição é amostrada, suas dependências e exceções
acompanham. Desligue apenas em investigação pontual.

## Segurança no ambiente implantado

- HTTPS obrigatório e HSTS fora de Development.
- Headers de segurança configurados (CSP, `X-Content-Type-Options`, `Referrer-Policy`).
- Cookie com `HttpOnly`, `Secure` e `SameSite` — ver [authentication.md](authentication.md).
- `ForwardedHeadersOptions` com proxies conhecidos, para que o IP real chegue ao rate limit.
- Página de erro detalhada **apenas** em Development.
- Nenhum segredo no artefato publicado.

Ver [`segredos-configuracao`](../../.ai/skills/segredos-configuracao/SKILL.md).

## Checklist de deploy

- [ ] Build e testes em Release, sem erros e sem avisos.
- [ ] Stage `Deploy` dependendo de `Test`.
- [ ] Artefato promovido é o mesmo binário entre ambientes.
- [ ] Variáveis do ambiente de destino conferidas; nenhum segredo no artefato.
- [ ] Estratégia de migration definida; mudança destrutiva em duas etapas.
- [ ] Backup confirmado antes de migration destrutiva.
- [ ] Health check respondendo após o deploy.
- [ ] Telemetria chegando ao recurso **daquele** ambiente.
- [ ] Procedimento de rollback conhecido, com tempo estimado.
- [ ] Taxa de erro observada na janela seguinte ao deploy.
