# Decisões de arquitetura (ADR)

Um **ADR** (*Architecture Decision Record*) é o registro curto de uma decisão estrutural: o problema
que a forçou, o que se decidiu, o que se descartou e o que isso passou a custar.

## Por que este projeto usa

Código mostra **o que** foi feito, nunca **por que** — e o porquê é justamente o que se perde. Meses
depois, alguém encontra uma escolha deliberada que parece estranha, conclui que é descuido e a
"corrige". Nesse momento não se derruba uma linha de código: derruba-se a razão de ela existir, sem
que ninguém saiba que havia uma.

Isso vale em dobro num repositório trabalhado por agentes de IA. Um agente lê a estrutura, não a
história do time. Sem o registro, ele reproduz o que parece idiomático — e o que parece idiomático
quase nunca é a decisão difícil que alguém tomou por um motivo concreto.

O ADR também vale pela recusa. Registrar por que **não** se adotou CQRS ou Dapper puro encerra a
discussão que voltaria a cada semestre, ou a transforma em algo produtivo: quem discordar precisa
apresentar o problema concreto que a alternativa resolve, não a preferência.

Regra prática: se a escolha atravessa features, é cara de reverter e alguém razoável poderia ter
decidido diferente, vira ADR. Se cabe num arquivo e se desfaz numa tarde, não vira.

## Índice

| ADR | Decisão | Status |
|---|---|---|
| [ADR-001](ADR-001-use-ddd.md) | DDD tático com arquitetura em camadas Web → Data → Core | aceito |
| [ADR-002](ADR-002-database-strategy.md) | PostgreSQL com EF Core 10, procedure só quando justificada | aceito |
| [ADR-003](ADR-003-isolamento-multi-schema.md) | Isolamento de dados por schema do PostgreSQL, resolvido por `search_path` na conexão | aceito |

## Convenções

**Numeração sequencial** `ADR-NNN`, três dígitos, atribuída na criação e nunca reaproveitada. Número
de ADR obsoleto ou substituído continua queimado — o histórico precisa continuar navegável.

**Nome do arquivo** em kebab-case, `ADR-NNN-assunto-curto.md`, descrevendo o assunto e não o
resultado: `ADR-002-database-strategy.md`, não `ADR-002-escolhemos-postgres.md`. O nome sobrevive à
troca de decisão.

**Status**, no cabeçalho, um destes:

| Status | Significado |
|---|---|
| proposto | Escrito, em discussão. Ainda não vale como regra |
| aceito | Vale agora. É o comportamento esperado do repositório |
| substituído por ADR-NNN | Continua no lugar, com o ponteiro para quem o sucedeu |
| obsoleto | O contexto deixou de existir e nada o substituiu |

**ADR aceito não se edita.** Mudou a decisão? Escreve-se um novo, que explica o que mudou no contexto,
e o antigo passa a `substituído por ADR-NNN`. Reescrever o registro original apaga exatamente a
informação que o ADR existe para preservar: que naquele momento, com aquelas restrições, aquela era a
escolha certa. Correção de digitação, link quebrado ou formatação continuam permitidas — o que não se
altera é contexto, decisão ou consequência.

## Como criar um

1. Copie [ADR-000-template.md](ADR-000-template.md) para `ADR-NNN-assunto-curto.md`.
2. Preencha começando pelo **Contexto**. Se as forças em jogo não produzirem tensão real entre
   alternativas, provavelmente não há ADR a escrever.
3. Registre as **alternativas com o motivo do descarte** — alternativa listada sem motivo reabre a
   discussão em seis meses.
4. Declare as **consequências negativas**. ADR que só tem vantagem está incompleto ou é propaganda.
5. Adicione a linha no índice acima, na mesma entrega.

Decisão de escopo de uma única feature não é ADR: mora no documento da feature, em
[../features/](../features/README.md).
