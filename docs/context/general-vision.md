# Visão Geral

> **Template.** Substitua o conteúdo abaixo pela visão do produto real. Este arquivo responde
> "que sistema é este?" para quem — pessoa ou IA — chega sem contexto nenhum.
>
> Escreva em prosa curta, não em bullets soltos. Duas a quatro frases por seção bastam: o que não
> couber aqui provavelmente pertence a uma feature em [../features/](../features/).

## O produto

<Produto> é <o que o sistema é, em uma frase> para <quem usa>. O domínio cobre <as grandes áreas
de negócio>.

Exemplo do nível de detalhe esperado:

> Almoxarifado é uma plataforma de gestão de estoque para indústrias de médio porte. O domínio
> cobre entrada de materiais, requisição interna, inventário cíclico e relatórios de consumo.

## Problema que resolve

Qual dor concreta existe hoje, e por que as alternativas atuais não bastam. Sem isso, decisões de
escopo viram preferência pessoal — e ninguém consegue avaliar se uma feature nova pertence ao
produto.

## Quem usa

| Perfil | O que faz no sistema | O que nunca deveria conseguir fazer |
|---|---|---|
| <Perfil> | <ações principais> | <limite de permissão> |

A última coluna é a que mais economiza tempo depois: ela é a origem das regras de autorização.

## Linguagem do domínio

Os termos do negócio, com o significado exato que têm **aqui**. É o vocabulário que aparece em
agregado, tabela, rota e conversa — divergência entre eles é onde nasce a maior parte dos bugs de
entendimento.

| Termo | Significado neste domínio |
|---|---|
| <Termo> | <definição sem ambiguidade> |

Registre também os **falsos amigos**: palavras que significam coisa diferente do uso comum, ou dois
termos que parecem sinônimos e não são.

## Fronteiras

O que este sistema **não** faz, e de quem é a responsabilidade. Delimitar isso evita que uma feature
cresça para fora do produto sem ninguém perceber.

- <Fora de escopo> — pertence a <sistema/equipe>.

## Integrações externas

| Sistema | Para quê | O que acontece se ficar indisponível |
|---|---|---|
| <Sistema> | <finalidade> | <degradação aceitável ou falha> |

A terceira coluna é requisito, não detalhe de infraestrutura: define se a integração precisa de
fallback, fila ou apenas mensagem de erro.

## Restrições que valem sempre

Regras não negociáveis do negócio: obrigação legal, prazo regulatório, limite operacional. Não
inclua aqui decisão técnica — arquitetura vive no [AGENTS.md](../../AGENTS.md) e em
[estrutura-arquitetura.md](../../.ai/docs/estrutura-arquitetura.md).

Se o produto trata dado pessoal, diga **quais categorias** e por quê. Isso aciona o
[`lgpd-agent`](../../.ai/agents/lgpd-agent.md) antes de qualquer schema.
