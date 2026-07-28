---
name: seguranca-sql
description: Segurança em procedures PostgreSQL — SQL dinâmico seguro com format() e EXECUTE USING, SECURITY DEFINER vs INVOKER, search_path, privilégios GRANT/REVOKE e proteção de dado sensível. Use ao escrever SQL dinâmico, definir privilégios ou revisar procedure quanto a injeção.
agent: pgproc-agent
---

# Segurança em procedures

## SQL dinâmico

**Nunca concatene entrada em SQL.** É injeção, sem exceção:

```sql
-- ❌ Injeção. p_ordenacao = "id; DROP TABLE ..." executa.
EXECUTE 'SELECT * FROM <schema>.<tabela> ORDER BY ' || p_ordenacao;

-- ❌ Também injeção, mesmo com aspas manuais.
EXECUTE 'SELECT * FROM <schema>.<tabela> WHERE <coluna> = ''' || p_valor || '''';
```

### O jeito correto

**Valor** → parâmetro com `USING`, nunca interpolado:

```sql
EXECUTE 'SELECT id FROM <schema>.<tabela> WHERE <coluna> = $1'
   INTO v_id
  USING p_valor;
```

**Identificador** (tabela, coluna) → `format()` com `%I`, que faz o quoting correto:

```sql
EXECUTE format('SELECT count(*) FROM %I.%I WHERE %I = $1',
               p_schema, p_tabela, p_coluna)
   INTO v_total
  USING p_valor;
```

| Placeholder | Para | Efeito |
|---|---|---|
| `%I` | Identificador | Quota como identificador; rejeita injeção estrutural |
| `%L` | Literal | Quota como literal; `NULL` vira `NULL` sem aspas |
| `%s` | String crua | **Sem escape — só para fragmento que você controla** |

`%s` com entrada externa é injeção. Use apenas para pedaço fixo montado no próprio código.

### Lista branca para o que não é parametrizável

Direção de ordenação e nome de coluna não aceitam parâmetro. Valide contra conjunto fechado:

```sql
IF p_ordenacao NOT IN ('<coluna1>', '<coluna2>', '<coluna3>') THEN
    RAISE EXCEPTION 'Ordenação inválida: %', p_ordenacao
        USING ERRCODE = 'invalid_parameter_value';
END IF;

IF upper(p_direcao) NOT IN ('ASC', 'DESC') THEN
    RAISE EXCEPTION 'Direção inválida: %', p_direcao
        USING ERRCODE = 'invalid_parameter_value';
END IF;

EXECUTE format('SELECT id FROM <schema>.<tabela> ORDER BY %I %s',
               p_ordenacao, upper(p_direcao));
```

**Antes de recorrer a SQL dinâmico, pergunte se dá para evitá-lo.** Um `CASE` sobre colunas conhecidas
costuma ser mais seguro e mais rápido (plano em cache):

```sql
ORDER BY
    CASE WHEN p_ordenacao = '<coluna1>' THEN <coluna1> END,
    CASE WHEN p_ordenacao = '<coluna2>' THEN <coluna2> END
```

## SECURITY INVOKER vs DEFINER

| | `INVOKER` (default) | `DEFINER` |
|---|---|---|
| Executa como | Quem chamou | Quem criou |
| Uso | Padrão para tudo | Só quando precisa elevar privilégio de forma controlada |
| Risco | Baixo | Escalada de privilégio se mal configurada |

Use `SECURITY DEFINER` apenas quando a procedure precisa acessar objeto ao qual o chamador não tem
permissão direta — e nesse caso ela vira **fronteira de segurança**: valide toda entrada como se
viesse de fora.

### search_path é obrigatório

Sem `search_path` fixo, um usuário pode criar objeto homônimo em schema que ele controla e fazer sua
procedure `DEFINER` executar código dele com privilégio elevado:

```sql
CREATE OR REPLACE PROCEDURE <schema>.<nome>()
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = <schema>, pg_temp    -- obrigatório
AS $$ ... $$;
```

Regras:

- **`pg_temp` sempre por último** — se vier antes, objeto temporário do chamador tem precedência.
- **Nunca inclua schema gravável por outros** (como `public` com permissão ampla).
- **Qualifique nomes** com schema no corpo, mesmo com `search_path` definido.
- Declare `SET search_path` também em `INVOKER` — torna a resolução determinística.

### Ao usar DEFINER

- [ ] `SET search_path = <schema>, pg_temp` presente.
- [ ] `REVOKE EXECUTE ... FROM PUBLIC` e `GRANT` só para a role certa.
- [ ] Toda entrada validada — a procedure é a fronteira.
- [ ] Sem SQL dinâmico com identificador vindo de parâmetro.
- [ ] Justificativa registrada no `COMMENT ON PROCEDURE`.

## Privilégios

`CREATE PROCEDURE` concede `EXECUTE` a `PUBLIC` por padrão. Sempre revogue e conceda
explicitamente:

```sql
REVOKE EXECUTE ON PROCEDURE <schema>.<nome>(<tipos>) FROM PUBLIC;
GRANT  EXECUTE ON PROCEDURE <schema>.<nome>(<tipos>) TO <role_aplicacao>;
```

A assinatura de tipos faz parte da identidade — com sobrecarga, `GRANT` sem tipos é ambíguo.

Princípio: a role da aplicação recebe `EXECUTE` na procedure, **não** `INSERT`/`UPDATE` direto nas
tabelas que ela manipula. Assim a procedure é o único caminho de escrita para aquela operação.

## Dado sensível

- **Nunca** logue senha, token, chave, documento ou cartão em `RAISE NOTICE`/`WARNING` — vai para o
  log do servidor em texto claro.
- Mensagem de exceção não deve vazar valor sensível: `'Credencial inválida para usuário %'` com id,
  nunca com a credencial.
- Ao mascarar em `SELECT`, faça no banco, não confie no cliente.
- `RAISE NOTICE` de depuração deve ser removido ou rebaixado antes de ir a produção.

## Checklist

- [ ] Nenhuma concatenação de string para montar SQL.
- [ ] `EXECUTE ... USING` para valores; `format()` + `%I` para identificadores.
- [ ] `%s` apenas com fragmento controlado pelo próprio código.
- [ ] Lista branca para ordenação/coluna dinâmica.
- [ ] `SET search_path` explícito, com `pg_temp` por último.
- [ ] `SECURITY DEFINER` só com justificativa; caso contrário `INVOKER`.
- [ ] `REVOKE ... FROM PUBLIC` + `GRANT` para a role específica.
- [ ] Nenhum dado sensível em log ou mensagem de erro.
