# Visão geral da arquitetura

> **Template do boilerplate.** Preencha ao implementar e remova este aviso.

Este documento responde "**o que este sistema é**" para quem chega agora — pessoa ou agente. Ele não
repete a norma: a referência normativa completa é
[../../.ai/docs/estrutura-arquitetura.md](../../.ai/docs/estrutura-arquitetura.md), e as regras que
valem sempre estão no [AGENTS.md](../../AGENTS.md) da raiz.

Duas coisas convivem aqui, e vale distinguir para não editar o que não se deve:

| Marca | Significado |
|---|---|
| **Fixo pelo boilerplate** | Norma. Não é decisão deste projeto; alterar exige mudar o boilerplate. |
| *Preencher* | Decisão deste projeto. É o que você escreve ao implementar. |

## O que o sistema faz

*Uma a três frases descrevendo a finalidade do sistema em linguagem de negócio, não de tecnologia.
Se a frase só faz sentido para quem já conhece o código, está errada. O critério: alguém de fora do
time entende o que o produto entrega depois de ler isso.*

## Contexto

*Onde este sistema se encaixa: quem usa, que problema resolve, com que sistemas conversa e de quem
depende para funcionar. Cite os atores por nome do negócio, não por role técnica.*

### Quem usa

*Os perfis de usuário e o que cada um faz aqui. Um perfil que não executa nenhuma tarefa nesta
aplicação não pertence a esta lista.*

### Sistemas vizinhos

*Cada sistema com que este troca dados, em que direção e por qual contrato. Marque quem é dono da
fonte de verdade de cada conjunto de dados — essa é a informação que evita duplicação de schema
mais tarde.*

| Sistema | Direção | Contrato | Dono da fonte de verdade |
|---|---|---|---|
| *`<Sistema>`* | *entrada / saída / bidirecional* | *HTTP, schema compartilhado, fila* | *quem* |

## Stack — fixa pelo boilerplate

Esta tabela **não é decisão do projeto**. Trocar qualquer linha significa sair do boilerplate, e a
justificativa vai na seção de exceções, não aqui.

| Item | Valor |
|---|---|
| Plataforma | .NET 10 (`net10.0`), ASP.NET Core MVC + Razor |
| Banco | PostgreSQL (Npgsql) |
| ORM | Entity Framework Core 10 |
| Front-end | TypeScript (última estável) + Tailwind CSS 4, compilados por Vite |
| Testes | xUnit v3, Moq, FluentAssertions; HtmlAgilityPack na camada Web |
| Configuração | `IOptions` + `.env` / variáveis de ambiente |
| Observabilidade | Azure Application Insights — obrigatório |
| CI/CD | Pipeline com stages Build → Test → Deploy, com `Deploy` dependendo de `Test` |

O motivo de a stack ser fixa: cada escolha acima já carrega skills, agentes e convenções escritas em
cima dela. Trocar o ORM ou o bundler não invalida um arquivo — invalida a documentação inteira.

### Estilo arquitetural — fixo pelo boilerplate

Três padrões, cada um em um eixo diferente:

- **Camadas com dependência unidirecional** (`Web → Data → Core`), no eixo dos projetos. Detalhe em
  [dependencies.md](dependencies.md).
- **Vertical Slice / Feature Folders**, no eixo da apresentação: Controller, ViewModels, Views,
  Scripts e Styles de uma feature moram na mesma pasta.
- **DDD tático leve** no domínio: agregados com invariantes no construtor, Specifications para
  consulta, repositórios por contrato e serviços orquestrando.

## Fronteiras do sistema

*O que está dentro da fronteira funcional deste repositório. Uma funcionalidade fora dela pertence a
outro repositório — registre aqui a linha que separa, porque é ela que responde "isso é nosso?"
quando surgir demanda ambígua.*

Restrições fixas que valem em qualquer projeto do boilerplate:

- **Sem acoplamento binário entre sistemas.** Não referencie assemblies internos de outro
  repositório. Por isso cada projeto mantém a própria `AggregateRoot`, as próprias `Specification` e
  os próprios enums, mesmo que pareçam duplicados de outro sistema.
- **Propriedade de dados.** Cada sistema é dono do seu schema. Dado de outro sistema entra por
  contrato explícito, sem replicar a fonte de verdade e sem dependência entre bancos.
- **Migrations apenas sobre o que se é dono.** Nada de `EnsureCreated` ou migration sobre schema
  externo.

### O que está dentro

*Liste os domínios e capacidades que este sistema implementa e mantém.*

### O que está fora de escopo

*Liste o que deliberadamente não é feito aqui e para onde vai. Esta seção vale mais que a anterior:
"está fora" com destino explícito encerra discussão; ausência de menção convida alguém a implementar
no lugar errado.*

Fora de escopo **por norma do boilerplate**, independente do projeto:

| Não usar | Por quê |
|---|---|
| CQRS, MediatR, event sourcing | Abstração sem problema concreto que a justifique |
| Camada de aplicação separada de `Core` | O serviço de domínio já é a porta de entrada de escrita |
| Framework SPA (React, Vue, Angular) | A apresentação é Razor no servidor; TS entra para comportamento pontual |
| Bootstrap, UIkit, Foundation e afins | Impõem design system próprio e trazem CSS morto — Tailwind é o padrão |
| jQuery, Webpack, Gulp, PostCSS avulso | Substituídos pelo DOM moderno e pelo Vite |

Introduzir qualquer um deles exige um problema concreto documentado — ver o critério em
[dependencies.md](dependencies.md).

## Decisões de arquitetura deste projeto

*Registre aqui as escolhas que o boilerplate deixou em aberto e este projeto fechou: separação em
domínios, integrações escolhidas, estratégia de autenticação, multi-tenant ou não. Uma linha por
decisão, com o motivo. Decisão sem motivo registrado é revertida por engano no primeiro refactor.*

| Decisão | Alternativa descartada | Por quê |
|---|---|---|
| *…* | *…* | *…* |

## Onde ler mais

| Assunto | Documento |
|---|---|
| As três camadas e o que mora em cada uma | [layers.md](layers.md) |
| Direção de dependência e critério para pacote novo | [dependencies.md](dependencies.md) |
| Caminho de uma requisição pelas camadas | [data-flow.md](data-flow.md) |
| Diagramas | [diagrams.md](diagrams.md) |
| Norma completa | [../../.ai/docs/estrutura-arquitetura.md](../../.ai/docs/estrutura-arquitetura.md) |
