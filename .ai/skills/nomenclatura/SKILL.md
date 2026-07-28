---
name: nomenclatura
description: Regras obrigatórias de nomenclatura em procedures PostgreSQL — nomes de coluna, parâmetro, variável e procedure escritos por extenso, sem abreviação, sigla ou diminutivo. Use SEMPRE que nomear qualquer identificador, e ao revisar procedure existente.
agent: pgproc-agent
---

# Nomenclatura — nomes por extenso, sempre

**Regra central: o nome é escrito por extenso, na íntegra, como se fala.** Abreviação, sigla,
diminutivo e truncamento são proibidos.

Quem escreve a procedure a lê uma vez. Quem faz a manutenção — daqui a dois anos, às três da manhã,
durante um incidente — lê dezenas de vezes e não tem acesso ao contexto que estava na sua cabeça.
`dt_venc_ctr` obriga essa pessoa a adivinhar. `data_vencimento_contrato` não obriga nada. O custo de
digitar dezessete caracteres a mais é pago uma vez; o custo de decifrar é pago para sempre.

O PostgreSQL aceita até 63 bytes por identificador. Não há ganho de performance, espaço ou
legibilidade em abreviar. **A economia é ilusória e o prejuízo é real.**

## O que é proibido

| Proibido | Por quê | Escreva |
|---|---|---|
| `dt_venc` | Abreviação dupla | `data_vencimento` |
| `vl_tot` | Abreviação dupla | `valor_total` |
| `qtd` | Abreviação | `quantidade` |
| `desc` | Ambíguo (descrição? desconto? descendente?) e é palavra reservada | `descricao` ou `desconto` |
| `nm_cli` | Sigla + abreviação | `nome_cliente` |
| `cod` | Abreviação | `codigo` |
| `num` | Abreviação | `numero` |
| `end` | Abreviação e palavra reservada | `endereco` |
| `obs` | Abreviação | `observacao` |
| `usr`, `usu` | Abreviação | `usuario` |
| `tp`, `tipo_reg` | Abreviação | `tipo_registro` |
| `st`, `sit` | Abreviação | `status`, `situacao` |
| `fl_ativo` | Notação húngara | `ativo` |
| `id_ent` | Abreviação | `id_entidade` |
| `x`, `aux`, `tmp`, `temp` | Não diz nada | o que a variável representa |
| `data1`, `valor2` | Numeração sem semântica | `data_inicio`, `data_fim` |
| `proc_dados` | Nome de procedure vago | `processar_fechamento_mensal` |

## O que é permitido

**Siglas consagradas do domínio**, que o negócio usa em voz alta e ninguém expande ao falar:

- Documentos e identificadores oficiais: `cpf`, `cnpj`, `cep`, `pix`, `nfe`.
- Termos técnicos universais: `id`, `url`, `uuid`, `ip`, `json`, `html`.

O teste: **se uma pessoa da área de negócio fala a sigla em uma reunião sem expandir, ela é o nome
real da coisa.** `cpf` passa. `dt_venc` não — ninguém diz "dê-tê-vênc".

Mesmo assim, componha por extenso ao redor: `numero_documento_cpf` é melhor que `nr_cpf`.

## Padrões por tipo de identificador

| Elemento | Padrão | Exemplo |
|---|---|---|
| Procedure | `<verbo_infinitivo>_<substantivo_completo>` | `processar_fechamento_mensal` |
| Parâmetro | `p_` + nome por extenso | `p_data_vencimento` |
| Variável | `v_` + nome por extenso | `v_valor_total_calculado` |
| Constante | `c_` + nome por extenso | `c_limite_registros_lote` |
| Cursor | `cursor_` + nome por extenso | `cursor_contratos_pendentes` |
| Coluna | substantivo por extenso, snake_case | `data_criacao` |
| Booleano | adjetivo/particípio afirmativo | `ativo`, `processado`, `cancelado` |
| Data/hora | `data_<evento>` ou `<evento>_em` | `data_vencimento`, `processado_em` |
| Chave estrangeira | `id_<entidade_por_extenso>` | `id_cliente`, `id_contrato` |
| Contador | `total_<coisa>` ou `quantidade_<coisa>` | `total_registros_processados` |

Os prefixos `p_`, `v_`, `c_` não são abreviação decorativa: evitam a colisão entre variável e coluna
que causa o bug silencioso mais comum do PL/pgSQL (`WHERE id = id` filtra tudo). Eles marcam
**escopo**, não abreviam significado.

## Booleanos

Nomeie na **afirmativa**, sem prefixo húngaro. Negação dupla é onde o bug se esconde:

```sql
-- ❌ `IF NOT v_fl_nao_ativo` — quem consegue ler isso sem errar?
v_fl_nao_ativo boolean;

-- ✅
v_ativo boolean;
```

Prefira o particípio ao verbo modal: `processado` em vez de `deve_processar`; `cancelado` em vez de
`is_cancelled`.

## Comparação

```sql
-- ❌ Ninguém entende sem abrir o dicionário mental
CREATE OR REPLACE PROCEDURE fin.proc_fech(
    p_dt_ini date,
    p_dt_fim date,
    p_id_ctr bigint,
    INOUT p_vl_tot numeric
)
...
DECLARE
    v_qtd int;
    v_aux numeric;
    v_tmp record;
BEGIN
    SELECT count(*), sum(vl_prc) INTO v_qtd, v_aux
      FROM fin.ctr_itn
     WHERE id_ctr = p_id_ctr
       AND dt_ref BETWEEN p_dt_ini AND p_dt_fim
       AND fl_can = false;
```

```sql
-- ✅ Lê-se como uma frase; manutenção não exige arqueologia
CREATE OR REPLACE PROCEDURE financeiro.processar_fechamento_contrato(
    p_data_inicio           date,
    p_data_fim              date,
    p_id_contrato           bigint,
    INOUT p_valor_total     numeric
)
...
DECLARE
    v_quantidade_itens      integer;
    v_soma_valores          numeric;
BEGIN
    SELECT count(*), sum(valor_parcela)
      INTO v_quantidade_itens, v_soma_valores
      FROM financeiro.contrato_item
     WHERE id_contrato = p_id_contrato
       AND data_referencia BETWEEN p_data_inicio AND p_data_fim
       AND cancelado = false;
```

Mesmo comportamento. A segunda dispensa documentação para ser entendida.

## Ao encontrar nomes ruins em código existente

Colunas com nome ruim em tabela legada **não se renomeiam de dentro de uma procedure** — renomear
coluna é mudança de schema, quebra contrato e está fora do escopo deste agente.

O que fazer:

1. **Use o nome real da coluna** no SQL — ele é o que existe.
2. **Dê alias por extenso** ao projetar, para o resto da procedure ler bem:

```sql
SELECT ctr.dt_venc AS data_vencimento,
       ctr.vl_tot  AS valor_total
  INTO v_data_vencimento, v_valor_total
  FROM <schema>.contrato AS ctr
 WHERE ctr.id = p_id_contrato;
```

3. **Nomeie por extenso tudo que você cria** — parâmetros, variáveis, aliases, tabelas temporárias.
4. **Registre a recomendação** de renomear a coluna, sem fazê-lo: é decisão de quem cuida do schema.

Código novo nunca herda o vício do código velho.

## Idioma

Siga o idioma de domínio do projeto e **não misture** dentro do mesmo identificador.
`data_criacao` ou `created_at` — nunca `data_created` ou `dt_criacao_at`.

## Checklist

- [ ] Nenhum identificador abreviado, truncado ou em sigla não consagrada.
- [ ] Procedure nomeada `<verbo>_<substantivo>` por extenso.
- [ ] Parâmetros com `p_`, variáveis com `v_`, constantes com `c_` — e o resto do nome completo.
- [ ] Booleanos na afirmativa, sem prefixo húngaro.
- [ ] Nenhum `aux`, `tmp`, `x`, `dado`, `valor1`.
- [ ] Coluna legada com nome ruim recebeu alias por extenso.
- [ ] Idioma consistente dentro de cada identificador.
- [ ] Um colega que nunca viu a procedure entende cada nome sem perguntar.
