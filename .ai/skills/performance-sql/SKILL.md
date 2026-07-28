---
name: performance-sql
description: Performance de procedures PostgreSQL — EXPLAIN ANALYZE, SQL de conjunto vs laço, índices, cache de plano, processamento em lote, UPSERT e diagnóstico de lentidão. Use quando uma procedure estiver lenta ou ao escrever rotina que processa volume alto.
agent: pgproc-agent
---

# Performance

## Meça antes de otimizar

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT ...;
```

O que procurar na saída:

| Sinal | Significado | Ação |
|---|---|---|
| `Seq Scan` em tabela grande | Sem índice utilizável | Avaliar índice na coluna do filtro |
| `rows=1` estimado vs `rows=50000` real | Estatística desatualizada | `ANALYZE <tabela>` |
| `Nested Loop` com muitas iterações | Join ruim para o volume | Revisar filtro; conferir se há índice |
| `external merge Disk` | Ordenação estourou memória | Reduzir conjunto; avaliar `work_mem` |
| `Rows Removed by Filter` alto | Lê muito e descarta | Índice mais seletivo ou parcial |
| Tempo concentrado num nó | Gargalo localizado | Atacar só esse nó |

`BUFFERS` mostra leitura de disco vs cache — `shared read` alto indica dado fora do cache.

Para procedure inteira, meça a chamada:

```sql
\timing on
CALL <schema>.<nome>(<args>);
```

## SQL de conjunto vence laço

O ganho mais comum em PL/pgSQL não vem de índice, mas de eliminar iteração:

```sql
-- ❌ N execuções, N planos, N round-trips internos
FOR v_reg IN SELECT id, <valor> FROM <schema>.<origem> LOOP
    UPDATE <schema>.<destino> SET <coluna> = v_reg.<valor> WHERE id = v_reg.id;
END LOOP;

-- ✅ Uma operação
UPDATE <schema>.<destino> AS d
   SET <coluna> = o.<valor>
  FROM <schema>.<origem> AS o
 WHERE d.id = o.id;
```

Mesmo raciocínio para inserção em massa:

```sql
INSERT INTO <schema>.<destino> (<colunas>)
SELECT <colunas> FROM <schema>.<origem> WHERE <condicao>;
```

## UPSERT

```sql
INSERT INTO <schema>.<tabela> AS t (<chave>, <coluna>, atualizado_em)
SELECT <chave>, <coluna>, now() FROM <schema>.<origem>
ON CONFLICT (<chave>) DO UPDATE
    SET <coluna>     = EXCLUDED.<coluna>,
        atualizado_em = now()
 WHERE t.<coluna> IS DISTINCT FROM EXCLUDED.<coluna>;
```

O `WHERE` no `DO UPDATE` evita escrita quando nada mudou — poupa WAL, bloat e trabalho do
autovacuum. Costuma ser o ganho mais barato numa rotina de sincronização.

`ON CONFLICT` exige índice único na coluna de conflito.

## Índices

Para procedure, os que mais importam:

```sql
-- Filtro simples
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_<tabela>_<coluna>
    ON <schema>.<tabela> (<coluna>);

-- Parcial: só o subconjunto que a rotina varre — muito menor e mais rápido
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_<tabela>_pendente
    ON <schema>.<tabela> (id)
 WHERE processado_em IS NULL;

-- Composto: ordem = igualdade primeiro, depois range/ordenação
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_<tabela>_<a>_<b>
    ON <schema>.<tabela> (<coluna_igualdade>, <coluna_ordenacao>);
```

- **`CONCURRENTLY`** em produção — sem ele, `CREATE INDEX` bloqueia escrita na tabela. Não pode
  rodar dentro de transação, portanto **não** vai dentro de procedure com bloco transacional.
- **Índice parcial** é a melhor arma para rotina de fila/pendência.
- Índice não usado custa escrita e espaço: confira em `pg_stat_user_indexes`.
- Função no filtro invalida o índice — `WHERE lower(<coluna>) = ...` precisa de índice de expressão.

Criar índice **não é escopo da procedure**: recomende o `CREATE INDEX` como script separado de
migration, com o `EXPLAIN` que o justifica.

## Cache de plano

PL/pgSQL guarda plano preparado a partir da ~6ª execução na mesma sessão. Consequências:

- Consulta com parâmetro muito seletivo em uma chamada e pouco seletivo em outra pode receber plano
  genérico ruim.
- SQL dinâmico via `EXECUTE` **não** usa plano em cache — replaneja sempre. Custa mais por chamada,
  mas evita plano genérico. É um trade-off deliberado.

Para forçar replanejamento em caso patológico, `EXECUTE` com `format()` é a saída.

## Volume alto

- **Processe em lote com commit**, conforme `transacoes-erros` — evita transação gigante, lock longo
  e WAL inflado.
- **`ANALYZE` após carga grande** — sem estatística nova, as consultas seguintes escolhem plano
  ruim:

```sql
ANALYZE <schema>.<tabela>;
```

- **Tabela temporária** para resultado intermediário reutilizado:

```sql
CREATE TEMP TABLE tmp_<nome> ON COMMIT DROP AS
SELECT ... ;

ANALYZE tmp_<nome>;   -- temp table não tem estatística automática
```

`ON COMMIT DROP` evita vazamento entre chamadas. Sem `ANALYZE`, o planejador assume valores default
e erra feio.

- **`TRUNCATE` em vez de `DELETE`** quando apaga a tabela inteira — não gera tupla morta.
- **Desativar índice durante carga massiva** (drop + recreate) só quando a janela justificar.

## Diagnóstico em produção

```sql
-- Consultas em execução agora
SELECT pid, now() - query_start AS duracao, state, query
  FROM pg_stat_activity
 WHERE state <> 'idle'
 ORDER BY duracao DESC;

-- Bloqueios
SELECT blocked.pid AS bloqueado, blocking.pid AS bloqueador, blocked.query
  FROM pg_stat_activity blocked
  JOIN pg_stat_activity blocking ON blocking.pid = ANY(pg_blocking_pids(blocked.pid));

-- Uso de índice
SELECT relname, indexrelname, idx_scan
  FROM pg_stat_user_indexes
 WHERE schemaname = '<schema>'
 ORDER BY idx_scan;
```

Com `pg_stat_statements` habilitado, as consultas mais custosas:

```sql
SELECT calls, total_exec_time, mean_exec_time, query
  FROM pg_stat_statements
 ORDER BY total_exec_time DESC
 LIMIT 20;
```

## Checklist

- [ ] `EXPLAIN (ANALYZE, BUFFERS)` executado em volume representativo — não em base vazia.
- [ ] Nenhum laço fazendo o que um comando de conjunto faria.
- [ ] `ON CONFLICT ... WHERE ... IS DISTINCT FROM` para evitar escrita inútil.
- [ ] Lote com commit em rotina de volume alto.
- [ ] `ANALYZE` após carga grande e em tabela temporária.
- [ ] Índice proposto vem acompanhado do `EXPLAIN` que o justifica.
- [ ] `CREATE INDEX CONCURRENTLY` fora de bloco transacional.
