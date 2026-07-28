# <Feature>

> **Template.** Copie a pasta `feature-example/` para `<nome-da-feature>/`, renomeie este arquivo
> para `<nome-da-feature>.md` e preencha. Uma pasta por feature; as regras de negócio ficam em
> [rules/](rules/), uma por arquivo.
>
> Nome da pasta em kebab-case, no idioma do negócio: `requisicao-material`, não `MaterialRequest`.

**Status:** rascunho · em implementação · entregue
**Atualizado em:** <AAAA-MM-DD>

## O que é

Uma ou duas frases: o que essa feature permite fazer, e para quem. Se não couber em duas frases,
provavelmente são duas features.

## Por que existe

O problema concreto que ela resolve. Sem isso, quem for mexer daqui a seis meses não consegue julgar
se uma mudança preserva ou trai a intenção original — e a feature vira código que ninguém ousa
alterar.

## Fluxo principal

O caminho feliz, em passos numerados, do ponto de vista de quem usa. Sem detalhe de implementação:
"o usuário confirma a requisição", não "o `POST /requisicoes` chama o `RequisicaoService`".

1. <ator> faz <ação>
2. O sistema <reação observável>
3. <resultado final>

## Fluxos alternativos e falhas

O que mais acontece na prática. Esta seção costuma ser a mais valiosa do documento — e a mais
esquecida.

| Situação | Comportamento esperado |
|---|---|
| <condição fora do caminho feliz> | <o que o sistema faz> |
| <falha de integração externa> | <degradação ou erro> |

## Regras de negócio

As regras vivem em [rules/](rules/), uma por arquivo, para poderem ser referenciadas e revisadas
isoladamente. Liste-as aqui com o resumo de uma linha:

| Regra | Resumo |
|---|---|
| [rule-feature-example-1](rules/rule-feature-example-1.md) | <uma linha> |
| [rule-feature-example-2](rules/rule-feature-example-2.md) | <uma linha> |

## Dados

O que essa feature cria, lê ou altera — em termos de domínio, não de tabela.

| Entidade | O que a feature faz | Contém dado pessoal? |
|---|---|---|
| <Entidade> | cria · lê · altera · remove | sim/não — se sim, qual categoria |

Havendo dado pessoal, o [`lgpd-agent`](../../../.ai/agents/lgpd-agent.md) define finalidade e base
legal **antes** do schema.

## Permissões

Quem pode o quê. Cada linha aqui deveria virar teste.

| Perfil | Pode | Não pode |
|---|---|---|
| <Perfil> | <ações> | <limites> |

## Fora de escopo

O que **não** entra nesta feature, e por quê. Delimitar isso evita a expansão silenciosa que
transforma uma entrega de três dias em três semanas.

## Decisões em aberto

Perguntas ainda sem resposta, com o dono da decisão. Suposição assumida vale registro explícito —
suposição não escrita vira bug de requisito.

| Pergunta | Quem decide | Suposição em uso |
|---|---|---|
| <pergunta> | <quem> | <o que estamos assumindo até lá> |
