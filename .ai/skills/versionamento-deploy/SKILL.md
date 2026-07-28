---
name: versionamento-deploy
description: Versionamento e deploy de procedures PostgreSQL — organização de arquivos .sql, idempotência do script, rollback, mudança de assinatura, integração com migration do EF Core e revisão. Use ao criar arquivo de procedure, alterar assinatura ou preparar deploy.
agent: pgproc-agent
---

# Versionamento e deploy

Procedure é **código de produção** e vive no controle de versão com o mesmo rigor do C#. Procedure
que só existe no banco é dívida: ninguém sabe quem alterou, quando, nem como voltar atrás.

## Organização

```text
db/
├── procedures/
│   ├── <schema>.<verbo>_<substantivo>.sql      um arquivo por procedure
│   └── ...
├── migrations/
│   └── <timestamp>_<descricao>.sql             aplicação versionada
└── rollback/
    └── <timestamp>_<descricao>_rollback.sql
```

**Um arquivo por procedure**, nomeado igual ao objeto. O arquivo é a fonte de verdade — o estado
atual do banco deve ser reproduzível a partir dele.

## Arquivo de procedure

Sempre `CREATE OR REPLACE`, para o script ser reexecutável:

```sql
-- <schema>.<verbo>_<substantivo>
-- Propósito: <uma frase>
-- Chamada por: <serviço/rotina que usa>
-- Última alteração: <AAAA-MM-DD> — <o que mudou>

CREATE OR REPLACE PROCEDURE <schema>.<verbo>_<substantivo>(
    IN p_<parametro> <tipo>
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = <schema>, pg_temp
AS $$
BEGIN
    ...
END;
$$;

COMMENT ON PROCEDURE <schema>.<verbo>_<substantivo>(<tipos>) IS
    '<Propósito em uma frase.>';

REVOKE EXECUTE ON PROCEDURE <schema>.<verbo>_<substantivo>(<tipos>) FROM PUBLIC;
GRANT  EXECUTE ON PROCEDURE <schema>.<verbo>_<substantivo>(<tipos>) TO <role_aplicacao>;
```

O bloco de cabeçalho responde o que a leitura do corpo não responde: **quem chama** e **por quê**.

## Mudança de assinatura — a armadilha

`CREATE OR REPLACE` **não** substitui uma procedure cuja assinatura mudou: cria uma **sobrecarga**.
Ficam duas versões ativas, e o PostgreSQL escolhe pela aridade e tipos — normalmente não a que você
espera.

Ao alterar parâmetros:

```sql
DROP PROCEDURE IF EXISTS <schema>.<verbo>_<substantivo>(<tipos_antigos>);

CREATE OR REPLACE PROCEDURE <schema>.<verbo>_<substantivo>(<parametros_novos>)
...
```

**Assinatura é contrato.** Antes de alterar:

1. Levante quem chama — código .NET, jobs, outras procedures.
2. Se houver chamador que você não controla, adicione parâmetro com `DEFAULT` em vez de mudar os
   existentes.
3. Renomear parâmetro quebra chamada nomeada (`CALL p(p_x => 1)`) — trate como breaking change.

Para achar dependentes:

```sql
SELECT p.proname, pg_get_functiondef(p.oid)
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = '<schema>'
   AND pg_get_functiondef(p.oid) ILIKE '%<nome_procedure>%';
```

## Migration

O projeto usa EF Core, mas **o EF não gerencia procedure**. Duas opções:

**1. Migration do EF executando o SQL** — mantém a ordem junto do resto do schema:

```csharp
public partial class <Nome> : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
        => migrationBuilder.Sql(<sql da procedure>);

    protected override void Down(MigrationBuilder migrationBuilder)
        => migrationBuilder.Sql("DROP PROCEDURE IF EXISTS <schema>.<nome>(<tipos>);");
}
```

**2. Script versionado aplicado por ferramenta de migration SQL**, quando o time preferir manter
banco e aplicação desacoplados.

Em qualquer caso: **se o projeto não é dono do schema, não crie procedure nele.** Procedure só em
schema próprio — mesma regra de propriedade que vale para tabela.

## Rollback

Todo deploy precisa de caminho de volta escrito **antes** de aplicar:

- Procedure nova → `DROP PROCEDURE IF EXISTS <schema>.<nome>(<tipos>);`
- Procedure alterada → o arquivo `.sql` da **versão anterior**, íntegro. Por isso o histórico do git
  importa: `git show <commit>:db/procedures/<arquivo>.sql` é o rollback.

Se a procedure alterou dados de forma não reversível, o rollback do código não desfaz o efeito —
avise isso explicitamente e planeje a correção de dados à parte.

## Deploy

Ordem segura:

1. Aplicar em ambiente de desenvolvimento; validar compilação e testes.
2. Aplicar em homologação com volume representativo; medir tempo.
3. Em produção, aplicar **fora do pico** se a procedure for chamada por rotina concorrente.
4. `CREATE OR REPLACE` pega um lock leve na procedure — chamadas em andamento terminam com a versão
   antiga; novas usam a nova. Não há downtime, mas há janela de versões misturadas: garanta que as
   duas versões sejam compatíveis com o schema vigente.

Deploy que exige mudança de tabela **e** de procedure: aplique a mudança de schema
retrocompatível primeiro, depois a procedure, depois remova o que ficou obsoleto. Nunca as duas de
uma vez em direção incompatível.

## Revisão

Antes de aprovar uma procedure em PR:

- [ ] Arquivo `.sql` versionado, com cabeçalho preenchido.
- [ ] `CREATE OR REPLACE` + `DROP` explícito se a assinatura mudou.
- [ ] `COMMENT ON PROCEDURE` descrevendo propósito.
- [ ] `REVOKE`/`GRANT` presentes.
- [ ] `SET search_path` explícito.
- [ ] Rollback escrito e testado.
- [ ] Chamadores identificados e compatíveis.
- [ ] `EXPLAIN` anexado quando a rotina processa volume.
- [ ] Nomes de coluna e parâmetro por extenso, sem abreviação (ver `nomenclatura`).
