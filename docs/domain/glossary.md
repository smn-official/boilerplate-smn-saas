# Glossário do domínio

> **Template do boilerplate.** Preencha ao implementar e remova este aviso.

## Por que existe um glossário

Sinônimo divergente é a forma mais barata de introduzir defeito. Quando o negócio diz "assinante", o
código diz `Cliente`, o banco diz `usuario_pagante` e a tela diz "membro", ninguém consegue afirmar
com certeza se são o mesmo conceito — e a resposta muda de conversa para conversa. O prejuízo não é
estético: um refactor deixa metade dos casos para trás, uma regra é aplicada em um dos nomes e não no
outro, e a pergunta "isso já está implementado?" passa a exigir arqueologia.

O glossário resolve isso fixando **um nome por conceito** e proibindo os demais. Ele é o contrato de
vocabulário entre negócio, documentação e código.

## Regra fixa do boilerplate

**O termo do negócio é o nome no código.** Identificadores de domínio, pastas de feature,
controllers, actions, ViewModels e DTOs ficam no idioma do negócio — sem tradução, sem abreviação e
sem "versão técnica" do termo. Não existe `CustomerAggregate` para o que o negócio chama de
"Assinante".

O que **não** acompanha o idioma do negócio, por serem contrato externo ou de infraestrutura:

| Elemento | Idioma | Observação |
|---|---|---|
| Identificadores de domínio, pastas, controllers, actions, ViewModels, DTOs | Idioma do negócio | O termo desta tabela, literal |
| Rotas HTTP | Inglês, kebab-case | Contrato externo — ver [../api/conventions.md](../api/conventions.md) |
| Chaves de configuração e variáveis de ambiente | Inglês | `Secao__Chave` |
| Documentação, `<summary>` e textos de interface | Idioma do negócio | Mesmo termo da tabela |

Consequência prática: um termo renomeado aqui é um refactor no código, não uma nota de rodapé. Se o
negócio abandona uma palavra, ela sai do glossário **e** sai do código na mesma entrega.

## Como preencher

*Uma linha por conceito que o negócio nomeia. Só entra o que tem significado próprio — se a definição
é "um cliente, mas do outro tipo", provavelmente é um estado ou um enum, não um termo.*

*A coluna "Como aparece no código" é o que amarra o glossário à implementação: aponte o artefato real
(classe, enum, propriedade), não uma paráfrase. Se ainda não existe código, escreva o nome planejado
e volte para corrigir quando existir.*

*Registre os termos proibidos junto da definição — é o que impede o sinônimo de voltar pela porta dos
fundos.*

| Termo | Definição | Como aparece no código |
|---|---|---|
| *(exemplo — substituir)* Assinante | Pessoa ou empresa com contrato ativo e cobrança recorrente vigente. Não confundir com Usuário: um Assinante pode ter vários Usuários. **Não usar:** cliente, membro, subscriber. | `Core/Models/Aggregates/Assinante/Assinante.cs` |
| *(exemplo — substituir)* Usuário | Pessoa física que autentica no sistema, sempre vinculada a um Assinante. **Não usar:** login, conta. | `Core/Models/Aggregates/Assinante/Usuario.cs` |
| *(exemplo — substituir)* Situação da assinatura | Estado do contrato no ciclo de cobrança: em teste, ativa, inadimplente, cancelada. | `Core/Enums/SituacaoAssinatura.cs`, persistido como string |

## Termos ambíguos e homônimos

*Liste aqui as palavras que o negócio usa com mais de um significado dependendo da área, e diga qual
significado o código adota. Homônimo não resolvido vira bug de interpretação — alguém implementa o
outro sentido.*

*Quando os dois sentidos são legítimos, o correto não é escolher um: é qualificar ambos ("Contrato
comercial" vs. "Contrato de serviço") e registrar os dois no glossário como termos distintos.*

## Termos deliberadamente fora do domínio

*Vocabulário que aparece em conversa mas não vira código — jargão de mercado, nome de ferramenta,
apelido interno. Registrar o que foi rejeitado evita que a discussão se repita a cada sprint.*

## Manutenção

- Termo novo entra no glossário **na mesma entrega** que o código que o usa.
- Termo renomeado pelo negócio é renomeado no código; a linha antiga vira "**Não usar**" na definição
  do termo novo, por pelo menos um ciclo, para quem ler documentação antiga se reencontrar.
- Divergência entre glossário e código é defeito do código ou do glossário — nunca "as duas coisas
  estão certas".
