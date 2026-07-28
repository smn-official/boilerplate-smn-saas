---
name: testes-procedures
description: Testes de stored procedures PostgreSQL — validação de compilação, casos de borda, idempotência, teste transacional com rollback, dados de fixture e verificação de concorrência. Use antes de entregar qualquer procedure.
agent: pgproc-agent
---

# Testes de procedures

Procedure sem teste é código não verificado rodando com privilégio de banco. O ciclo mínimo é:
compila → faz o que promete nos casos de borda → é idempotente → aguenta o volume real.

## 1. Compilação

O PL/pgSQL só valida a **sintaxe** no `CREATE`. Erro semântico — coluna inexistente, tipo
incompatível — só aparece em tempo de execução, e apenas no caminho que for percorrido.

```sql
CREATE OR REPLACE PROCEDURE ... ;   -- pega erro de sintaxe apenas
```

Para checagem mais profunda, habilite as verificações adicionais na sessão de desenvolvimento:

```sql
SET plpgsql.extra_warnings TO 'all';
SET plpgsql.extra_errors TO 'all';
```

Isso captura, entre outros, o caso clássico de **variável sombreando coluna** — o bug silencioso
mais caro da linguagem. Rode com essas flags antes de entregar.

## 2. Teste transacional com rollback

O padrão mais prático: executar dentro de transação e desfazer no fim. Não suja a base e é
repetível.

```sql
BEGIN;

-- Arrange
INSERT INTO <schema>.<tabela> (<coluna_natural>, <outra_coluna>)
VALUES ('<valor_teste>', <valor>);

-- Act
CALL <schema>.<verbo>_<substantivo>(<argumentos>);

-- Assert
DO $$
DECLARE
    v_quantidade_encontrada integer;
BEGIN
    SELECT count(*) INTO v_quantidade_encontrada
      FROM <schema>.<tabela>
     WHERE <condicao_esperada>;

    IF v_quantidade_encontrada <> 1 THEN
        RAISE EXCEPTION 'Esperado 1 registro, encontrado %.', v_quantidade_encontrada;
    END IF;
END;
$$;

ROLLBACK;
```

**Limitação importante:** procedure que faz `COMMIT` interno não pode ser testada assim — o `COMMIT`
falha dentro da transação do teste. Para essas, use base descartável (container efêmero) e
`TRUNCATE` entre casos.

## 3. Casos obrigatórios

Toda procedure precisa de teste para:

| Caso | O que verificar |
|---|---|
| **Caminho feliz** | Efeito esperado ocorre; `INOUT` traz o valor certo |
| **Entrada nula** | Levanta exceção com `ERRCODE` correto, não `NullReference` silencioso |
| **Entrada inválida** | Validação do topo dispara antes de qualquer escrita |
| **Registro inexistente** | `no_data_found` ou comportamento documentado, não sucesso falso |
| **Conjunto vazio** | Não falha; não escreve; retorna zero |
| **Duplicidade** | `unique_violation` tratada com mensagem de negócio |
| **Segunda execução** | Idempotência — sem efeito duplicado |

### Testando a exceção esperada

```sql
DO $$
BEGIN
    CALL <schema>.<nome>(NULL);
    RAISE EXCEPTION 'Deveria ter falhado com entrada nula.';
EXCEPTION
    WHEN invalid_parameter_value THEN
        RAISE NOTICE 'OK — validação de entrada funcionou.';
END;
$$;
```

O `RAISE EXCEPTION` após o `CALL` é o que faz o teste falhar caso a procedure **não** rejeite a
entrada.

## 4. Idempotência

Rode duas vezes seguidas e compare:

```sql
BEGIN;

CALL <schema>.<nome>(<argumentos>);

CREATE TEMP TABLE estado_primeira_execucao ON COMMIT DROP AS
SELECT * FROM <schema>.<tabela> WHERE <condicao>;

CALL <schema>.<nome>(<argumentos>);   -- mesma chamada

DO $$
DECLARE
    v_diferencas integer;
BEGIN
    SELECT count(*) INTO v_diferencas
      FROM (
          SELECT * FROM <schema>.<tabela> WHERE <condicao>
          EXCEPT
          SELECT * FROM estado_primeira_execucao
      ) AS divergencia;

    IF v_diferencas > 0 THEN
        RAISE EXCEPTION 'Procedure não é idempotente: % divergência(s).', v_diferencas;
    END IF;
END;
$$;

ROLLBACK;
```

## 5. Volume

Teste em base vazia não diz nada sobre produção. Gere massa representativa:

```sql
INSERT INTO <schema>.<tabela> (<coluna>, <outra_coluna>)
SELECT 'registro_' || numero_sequencial,
       (random() * 1000)::numeric(18,2)
  FROM generate_series(1, 1000000) AS numero_sequencial;

ANALYZE <schema>.<tabela>;   -- sem isso, o plano é irreal

\timing on
CALL <schema>.<nome>(<argumentos>);
```

`ANALYZE` depois da carga é obrigatório — sem estatística, o planejador escolhe plano que não
corresponde ao de produção e a medição engana.

Compare o tempo com o requisito. Se a rotina roda em janela de manutenção, verifique se cabe nela.

## 6. Concorrência

Para rotina que pode rodar em paralelo (fila, lote com `SKIP LOCKED`), abra **duas sessões** e
dispare simultaneamente. Verifique:

- Nenhum registro processado duas vezes.
- Nenhum deadlock.
- O total processado pelas duas somado bate com o esperado.

Se a procedure usa `pg_try_advisory_xact_lock`, confirme que a segunda sessão recebe a exceção de
"já em execução" em vez de duplicar trabalho.

## 7. Automação a partir do .NET

Testes de procedure são **de integração**, não unitários — exigem banco real. Container efêmero por
execução:

```csharp
[Fact]
public async Task ProcessarFechamento_QuandoExistemPendencias_DeveProcessarTodas()
{
    await using var connection = new NpgsqlConnection(connectionStringTeste);
    await connection.OpenAsync();
    await using var transaction = await connection.BeginTransactionAsync();

    await InserirMassaDeTesteAsync(connection, transaction);

    await using var command = new NpgsqlCommand(
        "CALL <schema>.<nome>($1)", connection, transaction);
    command.Parameters.AddWithValue(<argumento>);
    await command.ExecuteNonQueryAsync();

    var totalProcessado = await ContarProcessadosAsync(connection, transaction);
    totalProcessado.Should().Be(<esperado>);

    await transaction.RollbackAsync();
}
```

Mantenha esses testes **separados dos unitários** — são mais lentos e exigem infraestrutura. Não os
coloque no mesmo projeto que roda em cada build local.

## Checklist antes de entregar

- [ ] `plpgsql.extra_errors = 'all'` ativo ao compilar; nenhum aviso de sombreamento.
- [ ] Caminho feliz testado com dado real.
- [ ] Entrada nula e inválida testadas; exceção com `ERRCODE` correto.
- [ ] Conjunto vazio não quebra nem escreve.
- [ ] Executada duas vezes — sem efeito duplicado.
- [ ] Testada em volume representativo, com `ANALYZE` antes da medição.
- [ ] `EXPLAIN (ANALYZE, BUFFERS)` das consultas internas revisado.
- [ ] Concorrência verificada, se a rotina admite execução paralela.
- [ ] Nunca declare que funciona sem ter executado. Se não deu para executar, diga o que falta.
