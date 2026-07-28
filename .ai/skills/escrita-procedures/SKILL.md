---
name: escrita-procedures
description: Estrutura e assinatura de stored procedures PostgreSQL — CREATE PROCEDURE, parâmetros IN/INOUT, nomenclatura, retorno via refcursor, idempotência e template completo. Use ao criar ou alterar qualquer procedure.
agent: pgproc-agent
---

# Escrita de procedures

## Template

```sql
CREATE OR REPLACE PROCEDURE <schema>.<verbo>_<substantivo>(
    IN  p_<parametro>      <tipo>,
    IN  p_<opcional>       <tipo> DEFAULT NULL,
    INOUT p_<retorno>      <tipo> DEFAULT NULL
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = <schema>, pg_temp
AS $$
DECLARE
    v_<variavel>    <tipo>;
    v_afetadas      integer := 0;
BEGIN
    IF p_<parametro> IS NULL THEN
        RAISE EXCEPTION '<parametro> é obrigatório.'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    UPDATE <schema>.<tabela>
       SET <coluna> = p_<parametro>
     WHERE <condicao>;

    GET DIAGNOSTICS v_afetadas = ROW_COUNT;

    p_<retorno> := v_afetadas;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Falha em <verbo>_<substantivo>: %', SQLERRM
            USING ERRCODE = SQLSTATE;
END;
$$;

COMMENT ON PROCEDURE <schema>.<verbo>_<substantivo> IS
    '<Propósito em uma frase — o quê e por quê, não como.>';
```

## Assinatura

### Nomenclatura

**Nomes sempre por extenso.** Sem abreviação, sigla não consagrada ou diminutivo — regra completa na
skill `nomenclatura`.

| Elemento | Padrão | Exemplo | Nunca |
|---|---|---|---|
| Procedure | `<verbo>_<substantivo>` completo, snake_case | `processar_fechamento_mensal` | `proc_fech_mes` |
| Parâmetro | `p_` + nome completo | `p_data_vencimento` | `p_dt_venc` |
| Variável | `v_` + nome completo | `v_quantidade_itens` | `v_qtd`, `v_aux` |
| Constante | `c_` + nome completo | `c_limite_registros_lote` | `c_lim` |
| Cursor | `cursor_` + nome completo | `cursor_contratos_pendentes` | `cur_ctr` |

**O prefixo não é estética nem abreviação — marca escopo.** Sem ele, um parâmetro chamado `id`
colide com a coluna `id` dentro do `WHERE`, e o PL/pgSQL resolve a favor da variável — filtrando
tudo, silenciosamente. É o bug mais comum e mais difícil de ver da linguagem.

```sql
-- ❌ Bug silencioso: `id` refere-se ao parâmetro, não à coluna. Atualiza a tabela inteira.
CREATE OR REPLACE PROCEDURE atualizar(id integer) ... 
    UPDATE <tabela> SET <coluna> = 1 WHERE id = id;

-- ✅ Sem ambiguidade
CREATE OR REPLACE PROCEDURE atualizar(p_id integer) ...
    UPDATE <tabela> SET <coluna> = 1 WHERE id = p_id;
```

### Modos de parâmetro

| Modo | Uso |
|---|---|
| `IN` | Entrada. É o default; declare explicitamente para ficar legível |
| `INOUT` | **Único** jeito de devolver valor de uma procedure |
| `OUT` | Aceito no PostgreSQL 14+, equivalente a `INOUT` sem entrada |

Procedures **não têm `RETURNS`**. Para devolver:

- **Valor escalar** — `INOUT p_resultado <tipo>`.
- **Conjunto de linhas** — `INOUT p_cursor refcursor`, aberto no corpo.
- **Vários valores** — múltiplos `INOUT` ou um `INOUT p_resultado jsonb`.

```sql
CREATE OR REPLACE PROCEDURE <schema>.listar_<entidade>(
    IN    p_<filtro> <tipo>,
    INOUT p_cursor   refcursor DEFAULT '<entidade>_cursor'
)
LANGUAGE plpgsql
SET search_path = <schema>, pg_temp
AS $$
BEGIN
    OPEN p_cursor FOR
        SELECT <colunas>
          FROM <schema>.<tabela>
         WHERE <coluna> = p_<filtro>;
END;
$$;
```

O cursor só é válido **dentro da transação** que o abriu — quem chama precisa consumir antes do
commit.

### Parâmetros opcionais

`DEFAULT` sempre por último. Cuidado: adicionar parâmetro com default **cria uma sobrecarga** em vez
de substituir a procedure — deixando duas versões ativas. Ao mudar assinatura, faça `DROP PROCEDURE`
da versão antiga explicitamente.

## Estrutura do corpo

Ordem canônica:

1. **Validação de entrada** — falhe cedo, com `RAISE EXCEPTION` e `ERRCODE` apropriado.
2. **Resolução de dependências** — carregar o que a lógica precisa.
3. **Operação principal** — preferindo SQL de conjunto.
4. **Diagnóstico** — `GET DIAGNOSTICS ... = ROW_COUNT` para saber o efeito real.
5. **Atribuição dos `INOUT`**.
6. **`EXCEPTION`** — tratar e relançar com contexto.

## Idempotência

Rotina que roda duas vezes não pode duplicar efeito. Quando a semântica permitir:

```sql
INSERT INTO <schema>.<tabela> (<chave>, <coluna>)
VALUES (p_<chave>, p_<valor>)
ON CONFLICT (<chave>) DO UPDATE
    SET <coluna> = EXCLUDED.<coluna>;
```

Para rotinas de processamento, marque o que já foi processado e filtre por isso — nunca dependa de
"rodou uma vez só".

## SQL de conjunto, não laço

O erro estrutural mais caro em PL/pgSQL é iterar linha a linha o que o SQL faz de uma vez:

```sql
-- ❌ Um round-trip de plano por linha
FOR v_registro IN SELECT id FROM <schema>.<tabela> WHERE <condicao> LOOP
    UPDATE <schema>.<outra> SET <coluna> = v_registro.<valor> WHERE id = v_registro.id;
END LOOP;

-- ✅ Uma única operação
UPDATE <schema>.<outra> AS destino
   SET <coluna> = origem.<valor>
  FROM <schema>.<tabela> AS origem
 WHERE destino.id = origem.id
   AND <condicao>;
```

Laço só se justifica quando há **commit por lote** (ver `transacoes-erros`) ou lógica sequencial
genuína que não se expressa em conjunto.

## Checklist

- [ ] **Todos os nomes por extenso** — nenhuma abreviação, sigla não consagrada ou diminutivo.
- [ ] Nome no padrão `<verbo>_<substantivo>`, snake_case.
- [ ] Parâmetros com `p_`, variáveis com `v_` — prefixo + nome completo.
- [ ] `LANGUAGE plpgsql` e `SET search_path` explícitos.
- [ ] `SECURITY INVOKER` (ou `DEFINER` justificado).
- [ ] Validação de entrada no topo, com `ERRCODE`.
- [ ] SQL de conjunto onde possível.
- [ ] `EXCEPTION` relançando com contexto.
- [ ] `COMMENT ON PROCEDURE` preenchido.
- [ ] Idempotente, quando a semântica permitir.
- [ ] `DROP` explícito da versão antiga se a assinatura mudou.
