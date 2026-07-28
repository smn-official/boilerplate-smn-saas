---
name: plpgsql-fundamentos
description: Sintaxe e semântica de PL/pgSQL — declaração de variáveis, tipos ancorados, controle de fluxo, laços, cursores, arrays, JSONB, SELECT INTO e armadilhas de escopo. Use ao escrever o corpo de uma procedure.
agent: pgproc-agent
---

# Fundamentos de PL/pgSQL

## Declaração de variáveis

```sql
DECLARE
    v_texto         text;
    v_total         numeric(18,2) := 0;
    v_criado_em     timestamptz := now();
    v_id            <schema>.<tabela>.id%TYPE;        -- tipo ancorado à coluna
    v_registro      <schema>.<tabela>%ROWTYPE;        -- linha inteira
    v_generico      record;                            -- estrutura definida em runtime
    c_limite        constant integer := 1000;
BEGIN
```

**Prefira tipos ancorados** (`%TYPE`, `%ROWTYPE`): se a coluna mudar de `integer` para `bigint`, a
procedure acompanha sem edição. Hardcodar o tipo cria divergência silenciosa.

`record` só recebe estrutura ao ser atribuído — não dá para referenciar campo antes disso.

## Tipos que importam

| Tipo | Use para | Evite |
|---|---|---|
| `timestamptz` | Qualquer instante no tempo | `timestamp` sem fuso — fonte de bug em produção |
| `numeric(p,s)` | Dinheiro, quantidade exata | `float`/`real` para valor monetário |
| `text` | Qualquer string | `varchar(n)` sem motivo — em PG não há ganho de performance |
| `bigint` | Chave de tabela que cresce | `integer` em tabela de alto volume |
| `jsonb` | Documento consultável | `json` (não indexa nem normaliza) |
| `uuid` | Identificador distribuído | `text` guardando UUID |

`now()` retorna o início da transação — estável dentro dela. Para o instante real de cada chamada,
use `clock_timestamp()`.

## SELECT INTO

```sql
SELECT <coluna1>, <coluna2>
  INTO v_<var1>, v_<var2>
  FROM <schema>.<tabela>
 WHERE id = p_id;

IF NOT FOUND THEN
    RAISE EXCEPTION '<Entidade> % não encontrada.', p_id
        USING ERRCODE = 'no_data_found';
END IF;
```

- `SELECT INTO` **não falha** se não achar linha — apenas deixa as variáveis nulas. Sempre cheque
  `FOUND` ou `IS NULL`.
- Se retornar várias linhas, pega a **primeira arbitrariamente**, sem erro. Use `STRICT` para exigir
  exatamente uma:

```sql
SELECT <coluna> INTO STRICT v_<var> FROM <schema>.<tabela> WHERE id = p_id;
-- lança NO_DATA_FOUND ou TOO_MANY_ROWS
```

`STRICT` é quase sempre o que você quer quando espera uma linha só.

## Controle de fluxo

```sql
IF <condicao> THEN
    ...
ELSIF <condicao> THEN
    ...
ELSE
    ...
END IF;

CASE p_<tipo>
    WHEN '<valor1>' THEN v_<var> := <x>;
    WHEN '<valor2>' THEN v_<var> := <y>;
    ELSE RAISE EXCEPTION 'Tipo não suportado: %', p_<tipo>;
END CASE;
```

`CASE` sem `ELSE` **lança exceção** se nada casar (`CASE_NOT_FOUND`). Muitas vezes é o desejado —
mas seja deliberado.

Em SQL (não PL/pgSQL), lembre que `NULL = NULL` é `NULL`, não `true`. Use `IS DISTINCT FROM` para
comparar valores que podem ser nulos:

```sql
IF v_novo IS DISTINCT FROM v_antigo THEN
```

## Laços

```sql
-- Sobre resultado de query
FOR v_registro IN
    SELECT id, <coluna> FROM <schema>.<tabela> WHERE <condicao>
LOOP
    ...
END LOOP;

-- Numérico
FOR v_i IN 1..10 LOOP ... END LOOP;
FOR v_i IN REVERSE 10..1 BY 2 LOOP ... END LOOP;

-- Condicional
WHILE <condicao> LOOP ... END LOOP;

-- Infinito com saída explícita
LOOP
    EXIT WHEN <condicao>;
    CONTINUE WHEN <outra_condicao>;
END LOOP;
```

**Antes de escrever um laço, pergunte se um comando de conjunto resolve.** Laço em PL/pgSQL sobre
volume alto costuma ser ordens de magnitude mais lento que o `UPDATE ... FROM` equivalente.

Laço legítimo: processamento em lote com commit intermediário, ou lógica sequencial genuína
(saldo acumulado que depende da linha anterior de forma não expressável em window function).

## Cursores

Para conjuntos grandes que não cabem confortavelmente em memória, ou para devolver resultado:

```sql
DECLARE
    cur_<entidade> CURSOR FOR
        SELECT id, <coluna> FROM <schema>.<tabela> WHERE <condicao>;
    v_registro record;
BEGIN
    OPEN cur_<entidade>;

    LOOP
        FETCH cur_<entidade> INTO v_registro;
        EXIT WHEN NOT FOUND;
        ...
    END LOOP;

    CLOSE cur_<entidade>;
END;
```

`FOR ... IN SELECT` já usa cursor internamente e é mais legível — prefira-o, salvo quando precisar
de controle explícito (`FETCH` em lote, `refcursor` de saída).

## Arrays

```sql
DECLARE
    v_ids bigint[];
BEGIN
    SELECT array_agg(id) INTO v_ids FROM <schema>.<tabela> WHERE <condicao>;

    IF v_ids IS NULL OR cardinality(v_ids) = 0 THEN
        RETURN;
    END IF;

    UPDATE <schema>.<outra> SET <coluna> = <valor> WHERE id = ANY(v_ids);

    FOREACH v_id IN ARRAY v_ids LOOP ... END LOOP;
END;
```

`= ANY(array)` costuma render melhor que `IN` com lista construída dinamicamente, e aceita
parâmetro — evitando SQL dinâmico.

`array_agg` de conjunto vazio retorna `NULL`, não array vazio. Sempre cheque.

## JSONB

```sql
v_valor := p_dados ->> '<chave>';              -- extrai como text
v_objeto := p_dados -> '<chave>';              -- extrai como jsonb
v_profundo := p_dados #>> '{<nivel1>,<nivel2>}';

IF p_dados ? '<chave>' THEN ...                -- chave existe?

p_resultado := jsonb_build_object(
    'total', v_total,
    'processados', v_afetadas
);

FOR v_item IN SELECT * FROM jsonb_array_elements(p_dados -> '<lista>') LOOP ... END LOOP;
```

Útil para devolver resultado estruturado por `INOUT p_resultado jsonb`, evitando múltiplos `INOUT`.

## Diagnóstico

```sql
GET DIAGNOSTICS v_afetadas = ROW_COUNT;        -- linhas do último comando

IF FOUND THEN ...                              -- último SELECT/UPDATE afetou algo?

RAISE NOTICE 'Processadas % linhas.', v_afetadas;
RAISE WARNING 'Situação atípica: %', v_detalhe;
```

`RAISE NOTICE` é a ferramenta de depuração — visível no log e no cliente, sem afetar o fluxo.
Remova ou rebaixe os que forem ruidosos antes de entregar.

## Armadilhas

| Armadilha | Consequência | Correção |
|---|---|---|
| Variável com nome de coluna | Filtro sempre verdadeiro; atualiza tudo | Prefixo `p_`/`v_` |
| `SELECT INTO` sem checar `FOUND` | Segue com `NULL` silenciosamente | `IF NOT FOUND` ou `STRICT` |
| `timestamp` sem fuso | Erro de horário em produção | `timestamptz` |
| Laço onde caberia SQL de conjunto | Lentidão de ordem de magnitude | `UPDATE ... FROM` |
| `array_agg` de vazio | `NULL` inesperado | Checar `IS NULL` |
| `NULL = NULL` | Comparação nunca verdadeira | `IS DISTINCT FROM` |
| `EXCEPTION` em laço quente | Cria savepoint por iteração; lento | Tratar fora do laço |
| Concatenar string em SQL | Injeção | `format()` + `USING` |
