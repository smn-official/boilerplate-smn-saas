---
name: transacoes-erros
description: Controle transacional e tratamento de erro em procedures PostgreSQL — COMMIT/ROLLBACK no corpo, blocos EXCEPTION, SQLSTATE, savepoints implícitos, processamento em lote e locks. Use ao escrever procedure que grava dados, processa lote ou precisa tratar falha.
agent: pgproc-agent
---

# Transações e tratamento de erro

## O diferencial da procedure

Procedure é o **único** objeto de rotina do PostgreSQL que pode controlar a própria transação:

```sql
CREATE OR REPLACE PROCEDURE <schema>.<nome>()
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE ...;
    COMMIT;          -- válido em PROCEDURE; erro em FUNCTION

    UPDATE ...;
    COMMIT;
END;
$$;
```

### Condições para o COMMIT funcionar

`COMMIT` dentro da procedure **só é permitido quando ela não está numa transação externa**. Se o
chamador abriu transação, lança `invalid_transaction_termination`.

Consequências práticas:

- `CALL` fora de transação explícita → `COMMIT` funciona.
- `CALL` dentro de `BEGIN ... COMMIT` do cliente → **falha**.
- `CALL` dentro de transação do EF Core / `TransactionScope` → **falha**.

Procedure com commit interno precisa ser chamada com autocommit — ver `integracao-dotnet`.

**Não é possível `COMMIT` dentro de um bloco com `EXCEPTION`.** O bloco de exceção cria um savepoint
implícito, e savepoint impede terminação de transação. Se precisar de commit por lote **e**
tratamento de erro, separe: laço externo com commit, tratamento em bloco interno sem commit.

## Processamento em lote

Padrão para volume alto sem segurar lock nem estourar WAL:

```sql
CREATE OR REPLACE PROCEDURE <schema>.processar_<entidade>(
    IN    p_tamanho_lote integer DEFAULT 1000,
    INOUT p_total        bigint  DEFAULT 0
)
LANGUAGE plpgsql
SET search_path = <schema>, pg_temp
AS $$
DECLARE
    v_afetadas integer;
BEGIN
    LOOP
        UPDATE <schema>.<tabela>
           SET processado_em = now()
         WHERE id IN (
             SELECT id
               FROM <schema>.<tabela>
              WHERE processado_em IS NULL
              ORDER BY id
              LIMIT p_tamanho_lote
              FOR UPDATE SKIP LOCKED
         );

        GET DIAGNOSTICS v_afetadas = ROW_COUNT;
        EXIT WHEN v_afetadas = 0;

        p_total := p_total + v_afetadas;
        COMMIT;

        RAISE NOTICE 'Processadas % linhas (total %).', v_afetadas, p_total;
    END LOOP;
END;
$$;
```

O que faz esse padrão funcionar:

- **`FOR UPDATE SKIP LOCKED`** — permite execução concorrente sem bloqueio mútuo.
- **`ORDER BY id`** — ordem estável evita deadlock entre instâncias.
- **Marca de progresso** (`processado_em`) — torna a rotina retomável e idempotente.
- **`COMMIT` por lote** — libera locks e deixa o autovacuum trabalhar.
- **`EXIT WHEN v_afetadas = 0`** — parada por efeito real, não por contador.

Depois do `COMMIT` a transação seguinte começa automaticamente — não escreva `BEGIN`.

## Tratamento de erro

```sql
BEGIN
    <operacao>;

EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION '<Entidade> % já existe.', p_<chave>
            USING ERRCODE = 'unique_violation';

    WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS
            v_estado   = RETURNED_SQLSTATE,
            v_mensagem = MESSAGE_TEXT,
            v_contexto = PG_EXCEPTION_CONTEXT;

        RAISE EXCEPTION 'Falha em <nome>: % (SQLSTATE %)', v_mensagem, v_estado
            USING ERRCODE = v_estado,
                  DETAIL  = v_contexto;
END;
```

### Regras

- **Nunca engolir erro.** `WHEN OTHERS THEN NULL` transforma falha em corrupção silenciosa. Para
  ignorar um caso específico, trate a condição nomeada e registre `RAISE WARNING`.
- **Sempre relançar com contexto** — `GET STACKED DIAGNOSTICS` preserva SQLSTATE e ponto da falha.
- **Condição específica antes de `OTHERS`.** O primeiro `WHEN` que casar vence.
- **`EXCEPTION` custa caro** — cada bloco cria savepoint. Nunca dentro de laço quente.
- Erro não tratado **aborta a transação inteira**. Dentro de bloco com `EXCEPTION`, o rollback vai
  só até o savepoint do bloco.

### SQLSTATEs úteis

| Código | Condição | Quando usar |
|---|---|---|
| `23505` | `unique_violation` | Chave duplicada |
| `23503` | `foreign_key_violation` | Referência inexistente |
| `23514` | `check_violation` | Constraint de domínio |
| `23502` | `not_null_violation` | Campo obrigatório nulo |
| `22023` | `invalid_parameter_value` | Validação de entrada da procedure |
| `P0002` | `no_data_found` | Registro esperado não existe |
| `P0003` | `too_many_rows` | `SELECT INTO STRICT` com múltiplas linhas |
| `40001` | `serialization_failure` | Conflito de isolamento — candidato a retry |
| `40P01` | `deadlock_detected` | Deadlock — candidato a retry |
| `P0001` | `raise_exception` | Erro de negócio genérico (default do `RAISE`) |

Prefira `P0001`/`22023` para erro de negócio, deixando os `23xxx` para violação real de constraint —
assim o .NET distingue a causa por `PostgresException.SqlState`.

## Locks

```sql
SELECT * FROM <schema>.<tabela> WHERE id = p_id FOR UPDATE;              -- espera liberar
SELECT * FROM <schema>.<tabela> WHERE id = p_id FOR UPDATE NOWAIT;       -- falha imediatamente
SELECT * FROM <schema>.<tabela> WHERE id = p_id FOR UPDATE SKIP LOCKED;  -- ignora bloqueadas
```

- **Acesse recursos sempre na mesma ordem** entre procedures — ordem divergente causa deadlock.
- **Lock advisory** para impedir execução concorrente da mesma rotina:

```sql
IF NOT pg_try_advisory_xact_lock(<chave_numerica>) THEN
    RAISE EXCEPTION 'Rotina já em execução.'
        USING ERRCODE = 'lock_not_available';
END IF;
```

Libera no fim da transação, sem unlock manual. Atenção ao combinar com `COMMIT` em lote — o lock cai
no commit.

- Evite `LOCK TABLE`: bloqueia leitura concorrente e escala mal.

## Retry

Procedure **não** implementa o próprio laço de retry para `serialization_failure` /
`deadlock_detected` — retry pertence ao chamador, que pode reabrir a transação. Sinalize com o
SQLSTATE correto e deixe o .NET decidir.

## Checklist

- [ ] Se usa `COMMIT`, o chamador não abre transação externa.
- [ ] Nenhum `COMMIT` dentro de bloco com `EXCEPTION`.
- [ ] Nenhum `WHEN OTHERS THEN NULL`.
- [ ] Relança com `GET STACKED DIAGNOSTICS`, preservando SQLSTATE.
- [ ] `EXCEPTION` fora de laço quente.
- [ ] Lote com `SKIP LOCKED`, `ORDER BY` estável e marca de progresso.
- [ ] Acesso a recursos em ordem consistente entre procedures.
