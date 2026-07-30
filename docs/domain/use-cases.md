# Casos de uso

> **Template do boilerplate.** Preencha ao implementar e remova este aviso.

## O que este documento responde

O que o sistema faz, do ponto de vista de quem o usa — e o que acontece quando dá errado. Um caso de
uso descrito só no caminho feliz é meia especificação: os fluxos alternativos e de falha são onde
mora a maior parte do código e praticamente toda a dúvida de implementação.

## Regra fixa do boilerplate — o fluxo canônico

Todo caso de uso de escrita atravessa as camadas nesta ordem, sem atalho:

```text
Requisição → Controller → Service → Repository → Agregado
Resposta   ← View       ← ViewModel ← DTO      ← Agregado
```

O que isso implica em cada ponta:

| Artefato | Faz | Nunca faz |
|---|---|---|
| **Controller** | Extrai entrada, delega ao serviço, traduz o resultado em resposta HTTP | Regra de negócio, tocar `DbContext`, construir agregado |
| **Service** | Orquestra: carrega, invoca método de domínio, coordena integração, persiste **uma vez** ao final | Conter regra, alterar estado interno (`entidade.Status = …`), conhecer o ORM |
| **Repository** | Localiza e persiste agregados, executando Specifications | Orquestrar caso de uso, retornar DTO, chamar integração |
| **Agregado** | Aplica a regra e recusa estado inválido | Acessar banco, conhecer framework, alterar outro agregado |

Invariantes do fluxo, válidas para todos os casos de uso — não repita em cada seção:

- Uma única persistência por operação, ao final do serviço.
- A decisão de negócio vive no agregado, exposta como propriedade de regra; o serviço consulta e reage.
- Integração externa entra por interface declarada em `Core` e implementada em `Data`.
- `CancellationToken` sempre como último parâmetro, propagado do Controller até o repositório.
- Toda ação de escrita é `POST` com `[ValidateAntiForgeryToken]`.

## Como preencher

*Uma seção por caso de uso, com os sete blocos abaixo. O bloco de falhas é o que separa uma
especificação utilizável de uma lista de desejos — escreva-o antes de codar, não depois de descobrir
os erros em produção.*

| Bloco | O que escrever | Critério |
|---|---|---|
| **Ator** | Quem dispara — papel, não pessoa; inclua ator não-humano (job, webhook) | "Usuário" genérico esconde a decisão de permissão |
| **Pré-condições** | O que precisa ser verdade antes de começar | Se nada precisa ser verdade, provavelmente falta pensar em estado |
| **Fluxo principal** | Passos numerados, do gatilho ao resultado, em linguagem de negócio | Sem nome de classe nem de método; isso é o "o quê", não o "como" |
| **Fluxos alternativos e falhas** | Cada desvio com a condição que o dispara e o desfecho | Um por invariante que o agregado pode recusar, mais os erros de integração |
| **Pós-condições** | O que passou a ser verdade — estado, efeitos externos, telemetria | É o que o teste de integração verifica |
| **Permissões** | Quem pode executar, e o que acontece com quem não pode | Permissão implícita vira IDOR; explicite o dono do recurso |
| **Regras aplicadas** | Os `RN-*` que este caso de uso exercita | Amarra o caso de uso a [business-rules.md](business-rules.md) |

*Sobre permissões: distinga "não autenticado" (401 / redirect para login) de "autenticado sem direito"
(403) de "autenticado, com direito, mas o recurso é de outro" — este último é o caso que mais vaza,
porque parece um 404 e frequentemente é implementado como acesso liberado.*

*Sobre permissão e isolamento entre contratantes — os dois não são a mesma coisa.* O bloco
**Permissões** de um caso de uso responde **"qual papel pode executar isto?"**. Ele **não** é o que
impede o contratante A de ver dado do contratante B: isso vem do schema resolvido no `search_path` da
conexão, decidido no login e fora do alcance de qualquer caso de uso
([ADR-003](../decisions/ADR-003-isolamento-multi-schema.md)). Escrever "apenas os do próprio cliente"
na coluna de permissão é enganoso duas vezes: sugere que existe um filtro de linha a aplicar — não
existe, e escrevê-lo seria a alternativa que o ADR-003 descartou — e faz parecer que esquecê-lo é uma
falha de permissão, quando na verdade o dado do outro contratante está em outro schema e a consulta
simplesmente não o alcança.

*O caso "recurso de outro dono" continua existindo e continua sendo o que mais vaza — só que **dentro
do mesmo contratante**: o vendedor que abre o pedido de outro vendedor da mesma empresa. Esse é
verificação explícita no serviço, e é dele que o bloco Permissões precisa falar.*

## Índice dos casos de uso

*Uma linha por caso de uso. Agrupe por feature quando a lista passar de uma tela.*

| Caso de uso | Ator | Endpoint | Regras |
|---|---|---|---|
| *(exemplo — substituir)* Confirmar pedido | Vendedor | `POST /orders/confirm` | RN-1, RN-3, RN-7 |
| *(exemplo — substituir)* Adicionar item ao pedido | Vendedor | `POST /orders/items/save` | RN-3, RN-4, RN-5, RN-7 |
| *(exemplo — substituir)* Listar pedidos | Vendedor, Supervisor | `GET /orders` | — |

## Exemplo de caso de uso detalhado — substituir

### Confirmar pedido

**Ator.** Vendedor (autenticado, com vínculo ao contratante da sessão). O Supervisor também confirma,
inclusive pedido de outro vendedor — ver Permissões.

**Pré-condições.** O pedido existe no schema do contratante da sessão e está em rascunho. Tem ao menos
um item. Todos os produtos referenciados pelos itens continuam ativos.

**Fluxo principal.**

1. O vendedor abre o pedido em rascunho e aciona a confirmação.
2. O sistema verifica que o pedido tem ao menos um item.
3. O sistema lê o preço de venda vigente de cada produto referenciado.
4. O sistema copia esse preço para cada item, congelando-o.
5. O sistema passa o pedido para confirmado e calcula o total.
6. O sistema exibe o pedido confirmado, com o total e os preços praticados.

**Fluxos alternativos e falhas.**

| Condição | Desfecho |
|---|---|
| Pedido sem itens (RN-1) | Operação recusada pelo agregado; a tela mantém o rascunho e informa que é preciso incluir ao menos um item |
| Pedido já confirmado (RN-1) | Operação recusada; a tela informa a situação atual e nenhuma escrita ocorre — evita duplo clique reconfirmar e reescrever preços |
| Pedido cancelado (RN-3) | Operação recusada; nenhuma escrita ocorre |
| Produto de um item foi inativado (RN-7) | Operação recusada; a tela aponta qual item bloqueia e oferece removê-lo |
| Pedido de outro vendedor, ator sem papel de Supervisor | Mesmo desfecho de "não encontrado"; nenhuma escrita ocorre |
| Pedido inexistente no schema da sessão | "Não encontrado" — indistinguível do caso anterior por decisão, ver Permissões |

**Pós-condições.** O pedido está confirmado, com total calculado e `PrecoPraticado` gravado em cada
item — imutável a partir daqui, mesmo que o catálogo mude. Um marco de negócio foi registrado em log
estruturado com identificador opaco do pedido, nunca dado do comprador.

**Permissões.**

| Ator | Pode | Desfecho quando não pode |
|---|---|---|
| Vendedor, pedido dele | Confirmar | — |
| Vendedor, pedido de outro vendedor | Não | "Não encontrado" (`404`), sem revelar que o pedido existe |
| Supervisor | Confirmar qualquer pedido do contratante | — |
| Autenticado sem papel de venda | Não | `403` |
| Não autenticado | Não | Redirect para login |

*O isolamento entre contratantes **não** aparece nesta tabela, e a ausência é deliberada:* o pedido de
outro contratante está em outro schema e a consulta não o alcança — a resolução acontece no
`search_path` da conexão, a partir da claim emitida no login
([ADR-003](../decisions/ADR-003-isolamento-multi-schema.md)). O que a tabela cobre é o que **é**
responsabilidade do serviço: a verificação de dono **dentro** do mesmo contratante, entre vendedores.
Essa sim é código, e essa sim vira teste.

**Regras aplicadas.** RN-1, RN-3, RN-7.

## Casos de uso de leitura

*Consulta e listagem também são casos de uso, e também têm permissão e estados vazios. Descreva-os de
forma mais curta — ator, filtros disponíveis, o que o usuário vê quando não há resultado e quem pode
ver o quê — mas não os omita: é em listagem que o registro que o ator não deveria ver costuma
aparecer. Entre contratantes, o schema já barra; **dentro** do contratante, quem barra é a
specification, e é por isso que a listagem precisa dizer de quem são as linhas que ela devolve.*

## Estados que toda tela cobre

*Todo caso de uso com interface projeta os quatro estados: carregamento, vazio, erro e permissão. Um
caso de uso que só descreve o caminho feliz não está pronto para virar tela — registre aqui o que a
tela mostra em cada um.*
