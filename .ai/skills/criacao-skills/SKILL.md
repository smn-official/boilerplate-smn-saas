---
name: criacao-skills
description: Como escrever, revisar e testar uma skill deste repositório — anatomia do SKILL.md, frontmatter que dispara na hora certa, divulgação progressiva, escrever o porquê em vez de proibição, e o teste de gaveta que prova se a skill funciona. Use ao criar skill nova, revisar skill existente, quando uma skill não estiver sendo acionada, ou quando um agente errar sempre do mesmo jeito e a correção precisar virar instrução permanente.
---

# Criação de skills

Adaptado do [`skill-creator`](https://github.com/anthropics/skills) da Anthropic, reduzido ao que
se aplica aqui: sem scripts Python, sem viewer de benchmark, sem harness de eval — este repositório
não tem Python no stack. O que sobrou é o núcleo, que é onde estava o valor.

## Quando uma skill se justifica

Uma skill existe para transformar uma correção repetida em instrução permanente. O gatilho honesto
é: **você já explicou isso três vezes**.

| Situação | Vira skill? |
|---|---|
| O agente erra sempre do mesmo jeito | Sim — é exatamente o caso |
| Decisão tomada uma vez e registrada | Não — é documentação, vai em `docs/` ou `.ai/docs/` |
| Regra que vale em toda tarefa, sempre | Não — é o AGENTS.md |
| Procedimento longo que só interessa numa tarefa específica | Sim — é o caso clássico |

Skill que nunca é carregada custa manutenção e não rende nada. Antes de criar, confira se uma das
existentes já cobre — o mapa está em [`skills.md`](../../docs/skills.md). Ampliar uma skill boa
quase sempre vence criar a décima primeira parecida.

## Anatomia

```text
.ai/skills/<nome-kebab-case>/
└── SKILL.md          frontmatter + instruções
```

Namespace plano, uma pasta por skill, exigência do `.claude/skills/`. As skills daqui vivem inteiras
no `SKILL.md`; se a sua estiver pedindo `scripts/` ou `references/`, primeiro pergunte se não está
tentando fazer duas coisas.

### Frontmatter

```yaml
---
name: nome-kebab-case          # igual ao nome da pasta
description: O que cobre — tópico, tópico, tópico. Use ao <situação>, <situação> ou <situação>.
agent: <agente>-agent          # omita se não pertencer a nenhum dos dez
---
```

`name` idêntico ao diretório. Divergência quebra o carregamento.

`agent` amarra a skill ao dono. O mapa em [`skills.md`](../../docs/skills.md) precisa refletir o
mesmo valor — os dois se contradizerem é defeito.

### A description é o que dispara

É o único texto sempre em contexto. O modelo decide carregar a skill lendo **só isso** — o corpo
ele nunca viu na hora de decidir. Então ela carrega duas cargas:

- **o que a skill cobre** — os tópicos concretos, não a categoria abstrata;
- **quando usar** — as situações reais, com as palavras que a pessoa vai digitar.

Toda informação de "quando usar" mora aqui, nunca no corpo. No corpo ela chega tarde demais.

O padrão do repositório, que funciona:

> `Tópico principal — item, item, item, item. Use ao <situação>, <situação> ou <situação>.`

A falha comum é **subdisparar**: a skill existe, seria útil, e não é carregada. Contra isso, seja
concreto e um pouco insistente. Prefira listar situações demais a listar de menos.

| | |
|---|---|
| Fraco | `description: Regras de teste.` |
| Bom | `description: Testes unitários em xUnit v3 com FluentAssertions e Moq — agregado testado pela API pública, asserção por constante de mensagem, mock só nos limites. Use ao escrever ou revisar teste de agregado, serviço, specification ou controller.` |

O fraco não diz nem o que cobre nem quando serve, e perde para qualquer skill vizinha.

## Divulgação progressiva

Três níveis de carregamento, e a decisão de o que colocar em cada um:

1. **`name` + `description`** — sempre em contexto. Escreva pensando em disparo.
2. **corpo do `SKILL.md`** — entra quando a skill dispara. Mire em menos de 500 linhas.
3. **links para outros arquivos** — lidos só se a tarefa exigir.

Quando o corpo passar de ~500 linhas, o problema raramente é tamanho: é escopo. Uma skill que cobre
tudo dispara para tudo e ajuda em nada. Divida por eixo real de decisão — foi o que fez
`stripe-descoberta` / `stripe-checkout` / `stripe-webhooks` funcionarem melhor que uma `stripe` só.

## Como escrever

### Explique o porquê, não só o proibido

É a diferença entre uma skill que o modelo aplica e uma que ele contorna. Uma proibição sem motivo
é uma parede: o modelo desvia dela e cai em outro lugar errado, porque não sabia o que a parede
protegia.

Vale especialmente aqui, onde o histórico do repositório mostra o padrão inverso — regra bem
proibida e mal especificada, com o agente preenchendo o vazio por conta própria.

| Em vez de | Escreva |
|---|---|
| `NUNCA use badge de categoria.` | `Badge de categoria compete com o título pela atenção e não informa nada que a hierarquia visual já não diga. Use um subtítulo, ou agrupe por seção. Badge de estado de registro continua válido — esse informa.` |

Toda proibição carrega três coisas: o que não fazer, **por quê**, e **o que fazer no lugar**.
Faltando a terceira, você criou um beco sem saída — e o modelo vai inventar a saída.

`SEMPRE` e `NUNCA` em caixa alta são sinal de alerta. Às vezes são certos — `nomenclatura` usa e
está correto, porque ali a regra é absoluta e o motivo já foi dado. Mas se você está escrevendo o
terceiro caixa-alta da mesma seção, provavelmente está compensando uma explicação que faltou.

### Imperativo, e específico

Escreva instrução, não descrição: "declare o token em `@theme`", não "os tokens costumam ser
declarados em `@theme`". A segunda forma deixa margem, e margem vira invenção.

### Exemplo completo, nunca no meio

Exemplo de código é copiado literalmente — inclusive o que estava faltando nele. Fragmento que
começa no meio produz saída que começa no meio, por mais que a prosa acima explique o contexto.

Se mostrar markup, mostre do elemento raiz até o fechamento. Se mostrar um método, inclua a
assinatura. O modelo copia o bloco, não o parágrafo anterior.

### Em skill de escolha, exemplo vira resposta

Numa skill cujo trabalho é **decidir** — que cor, que nome, que abordagem — o exemplo concreto deixa
de ilustrar e passa a responder. Todo valor citado no meio de um roteiro de decisão é candidato a
virar a decisão de todo mundo.

Caso real deste repositório: a `cor-contexto` sugeria "verde-petróleo" como saída para diferenciar
num mercado de azuis, dava três hex azuis na tabela de calibragem, e trazia um exemplo de registro
também azul. O `cor-agent` recomendava azul-petróleo em qualquer produto — ERP, marketplace, o que
fosse. Ninguém tinha escrito "use azul sempre"; a soma dos exemplos escreveu por eles.

Como escapar:

| Em vez de | Escreva |
|---|---|
| `#1E3A8A` escuro e dessaturado lê como institucional | escuro e dessaturado lê como institucional |
| "verde-petróleo distingue sem perder seriedade" | "saia da norma sem sair do tom do setor" |
| Um exemplo de registro, sempre o mesmo | Dois de famílias opostas, ou nenhum |

E acrescente o **sinal de convergência**: se a recomendação cai na mesma família em contextos
diferentes, é hábito, não análise — descarte a primeira resposta e refaça. Skill de decisão precisa
dizer explicitamente que repetição é defeito, senão o caminho mais curto vence sempre.

### Comando de exemplo é o comando que será rodado

Se a skill documenta uma única invocação de um script, é essa que o agente vai usar — as outras
flags não existem para ele. Documente a invocação **na ordem do fluxo real**, não a mais curta.

Mesmo caso da `cor-contexto`: ela só mostrava `paleta.mjs --marca "#1D4ED8"`, e `--marca` **devolve
a cor recebida** em vez de gerar. O passo virou carimbo do que o agente já havia decidido sozinho,
e a fase de exploração nunca aconteceu — não porque alguém a proibiu, mas porque nenhum comando a
representava.

Antes de publicar, rode você mesmo o que a skill manda rodar e confira se o comando faz o que a
prosa promete. Skill que descreve uma etapa sem mostrar o comando dela descreve uma etapa que não
vai acontecer.

### Tabela decide melhor que parágrafo

Quando a instrução for "nesta situação, faça isto", tabela vence prosa: ela força você a enumerar
os casos e expõe o que ficou de fora. Boa parte das skills daqui é tabela por esse motivo.

### Faixa com piso e teto

Ao especificar um intervalo aceitável, diga os dois lados. Um validador que só verifica o piso
aprova o extremo oposto — e "ALTO" vira elogio quando devia ser defeito. Se o alvo é uma faixa,
escreva a faixa: mínimo, máximo e o que fazer fora dela em cada direção.

## Testar a skill

Sem harness de eval aqui, o teste é direto e vale mais do que parece.

### Teste de disparo

Escreva 3 pedidos que um usuário deste projeto digitaria de verdade — com nome de arquivo, contexto,
jeito informal. Depois responda: lendo **só a `description`**, essa skill seria carregada?

Inclua um caso de fronteira: um pedido que *parece* dessa skill mas pertence a outra. Se as duas
disparariam, as descriptions estão se sobrepondo e uma precisa ficar mais específica.

### Teste de gaveta

O verdadeiro: peça a um subagente que execute a tarefa com a skill carregada, e compare com o que
ele faria sem ela. Se o resultado for igual, a skill não está pagando o próprio custo — ou repete
o que o modelo já sabia, ou está vaga demais para mudar decisão.

O útil não é o acerto: é onde ele errou **mesmo com a skill**. Todo erro desses aponta uma lacuna
específica, e a lacuna é o que você escreve na próxima versão. Generalize a correção — a skill vai
rodar em cem tarefas, não só naquela.

## Revisar skill existente

- [ ] `name` bate com o nome da pasta
- [ ] `description` diz o que cobre **e** quando usar, com situações concretas
- [ ] `agent` presente e igual ao registrado em [`skills.md`](../../docs/skills.md)
- [ ] Nenhuma informação de "quando usar" presa no corpo
- [ ] Toda proibição tem motivo e alternativa
- [ ] Exemplos completos, do início ao fim
- [ ] Faixas com piso e teto
- [ ] Em skill de decisão: exemplos não convergem para uma única resposta, e há sinal de
      convergência escrito
- [ ] Todo comando documentado foi executado e faz o que a prosa promete
- [ ] Links relativos resolvem
- [ ] Não duplica skill existente
- [ ] Cabe em ~500 linhas; se não, o escopo é que está errado

## Ao entregar uma skill nova

O AGENTS.md exige atualizar a documentação na mesma entrega. Para skill, são três lugares:

1. `.ai/skills/<nome>/SKILL.md` — a skill.
2. [`.ai/docs/skills.md`](../../docs/skills.md) — a linha no mapa, sob o agente dono, e a contagem
   no cabeçalho da seção.
3. `.ai/agents/<agente>-agent.md` — se o agente lista as skills que carrega.

Skill fora do mapa é skill que ninguém acha.
