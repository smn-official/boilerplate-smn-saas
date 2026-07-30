# Documentação

Referência de apoio ao [AGENTS.md](../../AGENTS.md), que é a fonte única da verdade. O que está aqui
é o detalhamento: o `AGENTS.md` carrega o que vale sempre, e aponta para cá quando o assunto exige
profundidade.

## Por onde começar

| Se você quer… | Leia |
|---|---|
| Entender a arquitetura do projeto | [estrutura-arquitetura.md](estrutura-arquitetura.md) |
| Saber qual agente usar numa tarefa | [agentes.md](agentes.md) |
| Achar a skill certa | [skills.md](skills.md) |
| Decidir entre `.env` e `appsettings.json` | [configuracao.md](configuracao.md) |
| Saber o que versionar no git | [gitignore.md](gitignore.md) |
| Entender os servidores MCP | [mcp.md](mcp.md) |
| Conferir se a documentação está íntegra | `node .ai/scripts/verificar.mjs` |

## Os arquivos

### [estrutura-arquitetura.md](estrutura-arquitetura.md)

A referência normativa completa: camadas, responsabilidade de cada artefato, estrutura de pastas,
dependências, composição da raiz, observabilidade e testes. É o documento mais longo e o mais
citado pelas skills.

Fica separado do `AGENTS.md` de propósito: `CLAUDE.md` é lido a cada sessão, e carregar 60 KB de
detalhe em toda conversa desperdiça contexto. O `AGENTS.md` traz o essencial; aqui está o resto.

### [agentes.md](agentes.md)

Os nove agentes, qual usar para cada tarefa, as fronteiras entre eles (quem faz o quê quando dois
parecem caber) e a ordem sugerida numa entrega.

### [skills.md](skills.md)

As 57 skills agrupadas por agente dono, com o que cada uma cobre e quando usar. Existe porque
`.ai/skills/` é um namespace plano — exigência do `.claude/skills/` — e a relação skill → agente se
perderia sem registro. A mesma informação está no campo `agent:` de cada `SKILL.md`.

Manter os dois em dia é trabalho manual, e é exatamente o que o `verificar.mjs` cobra: ele reprova a
skill que existe no disco sem registro aqui, o registro que aponta para skill inexistente e o
subtotal por agente que não bate com o frontmatter.

### [configuracao.md](configuracao.md)

O que vai no `appsettings.json` e o que vai no `.env`, e como se escreve o nome de cada variável.
Trata dois erros comuns: jogar configuração de aplicação no `.env`, e misturar estilos de nome.

### [gitignore.md](gitignore.md)

O que versionar e o que ignorar, com o raciocínio por trás. Explica por que `.mcp.json` e `.ai/`
**são** versionados — decisão que parece contraintuitiva e que alguém tentaria "corrigir" errado.

### [mcp.md](mcp.md)

Os servidores MCP configurados, o que cada um destrava, e o critério para adicionar outro. Inclui as
ressalvas do servidor postgres (licença AGPL e peso em contexto).

## Convenções destes documentos

- **Explique o porquê, não só o quê.** Uma regra sem motivo é ignorada na primeira vez que
  incomodar. Toda decisão contraintuitiva registra o raciocínio.
- **Exemplos usam o domínio do projeto**, não `foo`/`bar`. `Pedidos__TamanhoPagina` ensina o formato
  *e* a convenção de nome; `Secao__Chave` só ensina metade.
- **Marcadores didáticos permanecem**: `<Entidade>`, `<Feature>`, `<schema>` significam "o artefato
  que você está escrevendo agora" e **nunca** são substituídos. Só `<Produto>` e `<Modulo>` são
  identidade do projeto, trocados uma vez pelo `setup-projeto`.
- **Tabela de erros comuns** ao final, quando couber: sintoma → causa → correção. É o formato que
  mais economiza tempo de quem está travado.

## Manutenção

Ao mudar uma convenção, atualize na mesma entrega: o documento aqui, a skill correspondente e o
`AGENTS.md` se a regra valer sempre. Documentação desatualizada faz o agente orientar contra o padrão
vigente — pior que não ter documentação.

Ao adicionar um documento, registre-o na tabela acima e aponte a partir do `AGENTS.md`.

Quem confere se isso de fato aconteceu é o script:

```bash
node .ai/scripts/verificar.mjs
```

Ele valida as contagens de agentes e skills afirmadas em prosa contra o disco, os links markdown
relativos, o frontmatter de skills e agentes, o registro em [skills.md](skills.md) nos dois sentidos
e as referências em crase a `.ai/skills/…` e `.ai/agents/…` — que escapam de qualquer checador de
link. Sai com código 1 quando acha problema, então cabe na esteira ao lado do build.

A razão de existir é a mesma do parágrafo acima: acrescentar uma skill exige tocar seis arquivos, e
esquecer um deles não quebra nada visivelmente — apenas faz o agente orientar contra o padrão
vigente. Numa única sessão de manutenção as contagens ficaram defasadas quatro vezes, e um link para
uma skill removida sobreviveu a uma limpeza inteira por estar em crase. Rode o script antes de
entregar qualquer alteração nesta pasta, em `.ai/skills/` ou em `.ai/agents/`.
