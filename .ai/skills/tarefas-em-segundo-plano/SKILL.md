---
name: tarefas-em-segundo-plano
description: Trabalho fora do request com BackgroundService e IHostedService do ASP.NET Core — escopo por IServiceScopeFactory em vez de DbContext injetado, shutdown gracioso com o CancellationToken do host, exceção que derruba o worker em silêncio, idempotência, execução duplicada em deploy com múltiplas instâncias e resolução explícita do schema do cliente. Use ao processar webhook fora do request, agendar expurgo de retenção, despachar e-mail ou criar qualquer worker.
agent: net10-agent
---

# Tarefas em segundo plano

Três lugares deste repositório terminam a frase "…e o resto acontece fora do request":
[`stripe-webhooks`](../stripe-webhooks/SKILL.md) responde 2xx e processa depois,
[`retencao-descarte`](../retencao-descarte/SKILL.md) define uma rotina de expurgo sem dizer quem a
agenda, e [`email-transacional`](../email-transacional/SKILL.md) enfileira o despacho. Esta skill é
o mecanismo comum aos três.

**Use o `BackgroundService` do próprio ASP.NET Core.** Hangfire, Quartz e afins são dependência nova
sem problema concreto que as justifique — o AGENTS.md proíbe. Se um dia houver esse problema
(agendamento visual, cron distribuído com coordenação), a decisão vira ADR, não escolha de quem
implementa a tarefa.

## A regra que não se quebra

**`BackgroundService` é singleton; `DbContext`, repositório e serviço são scoped.** Injetar um
scoped no construtor de um worker faz o container promovê-lo a singleton de fato: o mesmo
`DbContext` vive o processo inteiro, acumula rastreamento e devolve dado obsoleto até morrer.

```csharp
// ❌ DbContext capturado pelo singleton. Vaza memória, serve cache velho e falha por concorrência.
public sealed class ExpurgoWorker(<Modulo>DbContext contexto) : BackgroundService

// ✅ Um escopo por ciclo, exatamente como um request.
public sealed class ExpurgoWorker(
    IServiceScopeFactory fabricaDeEscopo,
    ILogger<ExpurgoWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var temporizador = new PeriodicTimer(TimeSpan.FromHours(1));

        while (await temporizador.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await using var escopo = fabricaDeEscopo.CreateAsyncScope();

                var servico = escopo.ServiceProvider.GetRequiredService<IExpurgoService>();
                await servico.ExecutarAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception excecao)
            {
                logger.LogError(excecao, "Ciclo de expurgo falhou; o worker continua.");
            }
        }
    }
}
```

Esse trecho contém as quatro decisões que fazem um worker sobreviver em produção: escopo por ciclo,
`stoppingToken` propagado, cancelamento distinguido de falha, e `try` **dentro** do laço.

## Quando usar

| Situação | Por quê fora do request |
|---|---|
| Webhook que precisa responder 2xx rápido | Processamento lento vira reenvio e duplicidade |
| Expurgo por retenção | Roda por tempo, não por ação de usuário |
| Despacho de e-mail | Provedor externo falha; o caso de uso não pode falhar junto |
| Relatório pesado, exportação, reprocessamento em lote | Estoura o timeout do request |

Quando **não** usar: qualquer coisa que o usuário espera ver concluída na resposta. Trabalho de
fundo não tem `HttpContext`, não tem para quem devolver erro, e o usuário só descobre a falha se
alguém tiver desenhado o retorno.

## O escopo — o erro nº 1

O padrão está no bloco acima. O que fecha o assunto:

- `CreateAsyncScope` (não `CreateScope`) quando há `DbContext` — o descarte assíncrono importa.
- O escopo nasce e morre **dentro** do ciclo. Escopo criado uma vez fora do laço é o mesmo defeito
  do singleton, com passo extra.
- Resolva **serviços**, nunca `DbContext` direto no worker: o worker orquestra, o serviço mantém a
  regra. Vale a fronteira de sempre, `Controller → Service → Repository`, com o worker no papel do
  controller.
- Singletons de verdade (`IOptions`, `ILogger`, `IServiceScopeFactory`) continuam no construtor.

## Shutdown gracioso

O host cancela o `stoppingToken` no shutdown e espera um tempo limitado antes de matar o processo.
Ignorar o token é ser derrubado no meio de uma transação.

```csharp
builder.Services.Configure<HostOptions>(opcoes =>
{
    opcoes.ShutdownTimeout = TimeSpan.FromSeconds(30);
    opcoes.BackgroundServiceExceptionBehavior = BackgroundServiceExceptionBehavior.Ignore;
});
```

- Propague o `stoppingToken` até o último `await` — `CancellationToken` sempre como último parâmetro.
- Processe em **lotes pequenos**, verificando o token entre eles. Lote de 100 mil registros não tem
  como parar em 30 segundos.
- `OperationCanceledException` durante shutdown é comportamento esperado: trate como saída limpa, não
  como erro, senão todo deploy gera alerta falso.
- `StopAsync` só espera o `Task` de `ExecuteAsync`. Um `ExecuteAsync` que nunca observa o token
  segura o shutdown até o timeout e depois morre no meio.

## Exceção não tratada derruba o worker em silêncio

Este é o segundo erro mais caro. Exceção que escapa de `ExecuteAsync` encerra aquele
`BackgroundService` — e, no padrão do host, pode derrubar a aplicação inteira. Com
`BackgroundServiceExceptionBehavior.Ignore` a aplicação continua de pé, mas **o worker não volta**:
o expurgo simplesmente para de rodar, sem erro na tela, sem ninguém perceber por meses.

Por isso o `try/catch` fica **dentro** do laço, com log estruturado, e nunca engole em silêncio:

```csharp
// ❌ O primeiro erro encerra o laço para sempre.
while (await temporizador.WaitForNextTickAsync(stoppingToken))
    await servico.ExecutarAsync(stoppingToken);

// ❌ Pior: falha invisível.
catch { }
```

Uma rotina de fundo precisa de sinal de vida: registre início e fim de cada ciclo com contagem, e
alerte pela **ausência** de execução, não só pela exceção. Rotina que falha calada é o achado de
[`retencao-descarte`](../retencao-descarte/SKILL.md) — política aplicada só na aparência.

## Idempotência

Toda tarefa de fundo roda mais de uma vez: retry após falha, reinício de processo no meio do lote,
deploy durante a execução, duas instâncias simultâneas. Projete para reexecução, não para o caminho
único.

- A unidade de trabalho é marcada como concluída **na mesma transação** do efeito — o mesmo raciocínio
  do `event.id` em [`stripe-webhooks`](../stripe-webhooks/SKILL.md).
- Reprocessar item já concluído é **no-op**, não exceção.
- Ordem determinística e progresso registrado: retomar depois de falhar no item 4.000 de 100.000 não
  pode recomeçar do zero.

## Múltiplas instâncias executam a mesma tarefa

O ponto que só aparece em produção: com dois nós (escala horizontal, deploy azul-verde, slot de
staging aquecido), **o worker roda em ambos**. O expurgo executa duas vezes, o e-mail sai duplicado.

Ordem de preferência:

1. **Tornar a tarefa idempotente e concorrente-segura.** Resolve o caso sem coordenação nenhuma e é a
   opção certa na maioria das vezes.
2. **Lock no banco.** `SELECT ... FOR UPDATE SKIP LOCKED` faz cada instância pegar itens distintos da
   fila sem bloquear a outra; para rotina única, um advisory lock (`pg_try_advisory_lock`) faz a
   segunda instância desistir do ciclo em vez de esperar.
3. **Concentrar em uma instância.** Flag de configuração ligada em um único nó, ou o worker num
   processo à parte. Simples, mas cria ponto único de falha — documente.

```csharp
var obteveOLock = await contexto.Database
    .SqlQuery<bool>($"SELECT pg_try_advisory_lock({ChaveDoLock})")
    .SingleAsync(cancellationToken);

if (!obteveOLock)
    return;
```

O que **não** funciona: confiar que só existe uma instância. Isso é verdade até o primeiro deploy sem
downtime, e a falha aparece como duplicidade intermitente que ninguém reproduz localmente.

## Schema do cliente — tarefa de fundo não tem claim

Vínculo direto com [`multi-schema`](../multi-schema/SKILL.md): o `search_path` é resolvido a partir
da **claim do usuário autenticado**. Um worker não tem usuário, não tem `HttpContext` e não tem
claim — o interceptor lança "schema do cliente não resolvido", que é exatamente o comportamento
correto.

A tarefa precisa resolver o schema **explicitamente, um cliente por vez**, iterando o catálogo do
schema compartilhado:

```csharp
protected override async Task ExecuteAsync(CancellationToken stoppingToken)
{
    await using var escopoDoCatalogo = fabricaDeEscopo.CreateAsyncScope();

    var catalogo = escopoDoCatalogo.ServiceProvider.GetRequiredService<ICatalogoDeClientesRepository>();
    var clientes = await catalogo.ObterAtivosAsync(stoppingToken);

    foreach (var cliente in clientes)
    {
        stoppingToken.ThrowIfCancellationRequested();

        await using var escopo = fabricaDeEscopo.CreateAsyncScope();

        escopo.ServiceProvider.GetRequiredService<IContextoDoCliente>().DefinirSchema(cliente.Schema);

        var servico = escopo.ServiceProvider.GetRequiredService<IExpurgoService>();
        await servico.ExecutarAsync(stoppingToken);
    }
}
```

Regras que não são estilo:

- **Um escopo por cliente.** Reaproveitar o escopo entre clientes mantém a conexão do pool com o
  `search_path` anterior e mistura dados — a falha mais cara do modelo multi-schema.
- O schema vem **do catálogo**, nunca de configuração digitada ou de nome montado em string.
- Falha em um cliente não pode abortar os demais: capture por cliente, registre e siga.
- Nunca use um schema padrão como fallback. Sem cliente resolvido, a tarefa não roda.

## Registro e teste

```csharp
builder.Services.AddHostedService<ExpurgoWorker>();
```

`BackgroundService` para trabalho contínuo ou periódico; `IHostedService` direto quando o que se quer
é só um gancho de `StartAsync`/`StopAsync` (aquecer cache, aplicar migration no startup).

Para testar, mantenha o worker **fino**: ele resolve escopo, itera e trata erro. Toda a regra fica no
serviço, que é testável sem host — ver [`testes-unitarios`](../testes-unitarios/SKILL.md). Cubra
explicitamente: reexecução sobre item já processado é no-op, e cancelamento no meio do lote encerra
sem deixar estado parcial.

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Memória cresce até reiniciar | `DbContext` injetado no worker singleton | `IServiceScopeFactory` com escopo por ciclo |
| Worker parou e ninguém viu | Exceção escapou de `ExecuteAsync` | `try/catch` dentro do laço, com log e alerta por ausência |
| Deploy demora e mata o processo | `stoppingToken` ignorado | Propagar o token e processar em lotes pequenos |
| Alerta de erro a cada deploy | `OperationCanceledException` tratada como falha | Distinguir cancelamento de erro real |
| E-mail duplicado depois de escalar | Duas instâncias rodando o mesmo worker | Idempotência, `SKIP LOCKED` ou advisory lock |
| "Schema do cliente não resolvido" no worker | Tarefa de fundo não tem claim | Iterar o catálogo e definir o schema por cliente |
| Dado de um cliente aparece no schema de outro | Escopo reaproveitado entre clientes | Um escopo (e uma conexão) por cliente |
| Lote reprocessa do zero após falha | Sem registro de progresso | Ordem determinística e conclusão marcada por item |
