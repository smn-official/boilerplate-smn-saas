---
name: integracao-dotnet
description: Chamada de procedures PostgreSQL a partir de .NET 10 — Npgsql, EF Core ExecuteSqlRawAsync, parâmetros nomeados, INOUT, refcursor, autocommit para procedures com COMMIT, timeout e tratamento de PostgresException. Use ao expor uma procedure para a aplicação.
agent: pgproc-agent
---

# Integração com .NET

A procedure é chamada a partir da camada **Data**, dentro de um repositório ou de um serviço de
infraestrutura dedicado. O domínio (`Core`) declara o contrato; nunca vê SQL.

## Onde a chamada mora

```text
Core/Interfaces/Repositories/I<Entidade>ProcedureRepository.cs   contrato
Data/Repositories/<Entidade>ProcedureRepository.cs               implementação com o CALL
```

O contrato em `Core` expõe uma operação de negócio (`ProcessarFechamentoAsync`), não a procedure —
se amanhã a rotina virar C#, o domínio não muda.

## Chamada simples

```csharp
await dbContext.Database.ExecuteSqlRawAsync(
    "CALL <schema>.<verbo>_<substantivo>(@p_data_inicio, @p_data_fim)",
    [
        new NpgsqlParameter("p_data_inicio", NpgsqlDbType.Date) { Value = dataInicio },
        new NpgsqlParameter("p_data_fim", NpgsqlDbType.Date) { Value = dataFim },
    ],
    cancellationToken);
```

**Sempre parâmetro nomeado.** Nunca interpole valor na string — a regra de injeção vale aqui tanto
quanto dentro da procedure. `ExecuteSqlInterpolatedAsync` também parametriza corretamente, mas
`ExecuteSqlRawAsync` com `NpgsqlParameter` deixa o tipo explícito, o que evita inferência errada em
`date`/`timestamptz`/`numeric`.

## Recuperando valor de INOUT

`ExecuteSqlRawAsync` descarta a saída. Para ler `INOUT`, use `NpgsqlCommand` direto:

```csharp
await using var connection = new NpgsqlConnection(connectionString);
await connection.OpenAsync(cancellationToken);

await using var command = new NpgsqlCommand(
    "CALL <schema>.<verbo>_<substantivo>($1, $2)", connection);

command.Parameters.Add(new NpgsqlParameter
{
    NpgsqlDbType = NpgsqlDbType.Bigint,
    Value = idEntidade,
    Direction = ParameterDirection.Input,
});

var totalProcessado = new NpgsqlParameter
{
    NpgsqlDbType = NpgsqlDbType.Bigint,
    Direction = ParameterDirection.InputOutput,
    Value = DBNull.Value,
};
command.Parameters.Add(totalProcessado);

await command.ExecuteNonQueryAsync(cancellationToken);

return Convert.ToInt64(totalProcessado.Value);
```

Todo parâmetro `INOUT` da procedure precisa de posição correspondente na chamada, mesmo com
`DEFAULT`.

## Procedure com COMMIT interno

Se a procedure faz `COMMIT`, ela **não pode** ser chamada dentro de transação. Falha com
`invalid_transaction_termination` (SQLSTATE `2D000`).

Cuidados:

- **Não** envolver em `dbContext.Database.BeginTransactionAsync()` nem em `TransactionScope`.
- Usar conexão dedicada, fora de qualquer transação aberta pelo EF.
- Se houver estratégia de execução com retry (`EnableRetryOnFailure`), ela **abre transação
  implícita** — desabilite para essa chamada ou use conexão própria:

```csharp
await using var connection = new NpgsqlConnection(connectionString);
await connection.OpenAsync(cancellationToken);   // autocommit; sem BeginTransaction

await using var command = new NpgsqlCommand("CALL <schema>.<nome>($1)", connection);
```

Rotina de lote longa quase sempre se encaixa aqui.

## Lendo refcursor

Cursor só vive dentro da transação que o abriu — aqui a transação **é** necessária:

```csharp
await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

await using (var command = new NpgsqlCommand(
    "CALL <schema>.listar_<entidade>($1, $2)", connection, transaction))
{
    command.Parameters.AddWithValue(filtro);
    command.Parameters.AddWithValue("<entidade>_cursor");
    await command.ExecuteNonQueryAsync(cancellationToken);
}

await using var fetch = new NpgsqlCommand(
    "FETCH ALL IN \"<entidade>_cursor\"", connection, transaction);

await using var reader = await fetch.ExecuteReaderAsync(cancellationToken);

while (await reader.ReadAsync(cancellationToken))
{
    // materializar
}

await transaction.CommitAsync(cancellationToken);
```

Para leitura, considere se uma consulta comum do EF não resolve melhor — `refcursor` só se paga em
conjunto muito grande ou lógica de seleção complexa que já vive no banco.

## Timeout

O padrão do Npgsql é 30 segundos — insuficiente para rotina de lote:

```csharp
command.CommandTimeout = 600;   // segundos; 0 = sem limite
```

`CommandTimeout = 0` só em rotina de manutenção que roda fora de requisição HTTP. **Nunca** em
código servido por requisição de usuário.

Timeout do lado do banco, por sessão:

```csharp
await using var setTimeout = new NpgsqlCommand("SET statement_timeout = '10min'", connection);
await setTimeout.ExecuteNonQueryAsync(cancellationToken);
```

Propague sempre o `CancellationToken` — ele cancela a consulta no servidor.

## Tratamento de erro

`PostgresException.SqlState` carrega o `ERRCODE` que a procedure levantou:

```csharp
try
{
    await ExecutarProcedureAsync(cancellationToken);
}
catch (PostgresException excecao) when (excecao.SqlState == PostgresErrorCodes.UniqueViolation)
{
    throw new DomainException("<Entidade> já existe.", excecao);
}
catch (PostgresException excecao) when (excecao.SqlState == PostgresErrorCodes.RaiseException)
{
    // P0001 — erro de negócio levantado por RAISE EXCEPTION na procedure
    throw new DomainException(excecao.MessageText, excecao);
}
```

Por isso a procedure deve usar `ERRCODE` deliberado (ver `transacoes-erros`): é o que permite ao
.NET distinguir erro de negócio de falha de infraestrutura.

`excecao.MessageText` traz a mensagem sem o prefixo do servidor — é o que se mostra ao usuário,
desde que a procedure não vaze dado sensível na mensagem.

### Retry

`serialization_failure` (`40001`) e `deadlock_detected` (`40P01`) são transitórios e merecem retry
**no chamador**, com nova transação:

```csharp
catch (PostgresException excecao) when (
    excecao.SqlState is PostgresErrorCodes.SerializationFailure
                     or PostgresErrorCodes.DeadlockDetected)
{
    // retry com backoff
}
```

## Logging

Registre a chamada com logging estruturado, sem parâmetro sensível:

```csharp
logger.LogInformation(
    "Executando procedure {Procedure} para {IdEntidade}.",
    "<schema>.<nome>",
    idEntidade);
```

Chamada a procedure aparece no Application Insights como **dependência** — a correlação já vem de
graça. Meça a duração; rotina que degrada aparece antes de virar incidente.

## Checklist

- [ ] Contrato em `Core` expressa a operação de negócio, não a procedure.
- [ ] Chamada isolada na camada `Data`.
- [ ] Parâmetros nomeados e tipados; nenhuma interpolação.
- [ ] Procedure com `COMMIT` chamada **fora** de transação e sem retry do EF.
- [ ] `CommandTimeout` compatível com a duração real.
- [ ] `CancellationToken` propagado.
- [ ] `PostgresException.SqlState` traduzido em exceção de domínio.
- [ ] Retry para `40001`/`40P01` quando aplicável.
