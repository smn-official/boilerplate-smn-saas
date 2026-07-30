# Catálogo de erros

> **Template do boilerplate.** Preencha ao implementar e remova este aviso.

## O que este documento responde

Como o sistema comunica que algo deu errado — e, principalmente, o que ele **não** diz ao fazer isso.
Mensagem de erro é a superfície mais descuidada de qualquer aplicação e uma das mais exploradas:
é por ela que vazam nome de tabela, versão de framework, existência de conta alheia e, no pior caso,
dado pessoal de terceiro.

## As três origens de erro

A distinção decide o status HTTP, a mensagem e o que é logado. Confundi-las é o defeito mais comum:
regra de negócio devolvida como `500` some do radar do produto e polui o alerta de infraestrutura.

| Origem | O que é | Quem detecta | Status típico | Mensagem ao usuário |
|---|---|---|---|---|
| **Validação de entrada** | Requisição malformada: campo ausente, tipo errado, formato inválido | Model binding, no Controller | `400` (ou re-render do formulário) | Específica, por campo, acionável |
| **Regra de negócio** | Entrada bem formada, operação não permitida pelo estado do domínio | Agregado, em `Core` | `409` / `422`, ou re-render com aviso | Em linguagem de domínio, sem jargão técnico |
| **Erro inesperado** | Falha não prevista: integração fora do ar, bug, timeout, exceção não tratada | Middleware de exceção | `500` | Genérica, com identificador de correlação |

Consequências práticas:

- **Regra de negócio nunca vira `500`.** Se está virando, o serviço está deixando `DomainException`
  escapar sem tratamento — corrija ali, não no cliente.
- **Validação de entrada nunca vira `500`.** Entrada malformada é previsível por definição.
- **Erro inesperado nunca ganha mensagem específica.** "Não foi possível conectar ao servidor
  `db-prod-03` na porta 5432" é um mapa da infraestrutura entregue de graça.

## Regra fixa do boilerplate — o que nunca vaza na mensagem

Vale para resposta HTTP, HTML renderizado, JSON, log de front-end e telemetria. Sem exceção de
ambiente que sobreviva ao deploy: o que é aceitável em Development precisa estar atrás de guarda de
ambiente, não de intenção.

| Nunca aparece | Por quê |
|---|---|
| **Stack trace, nome de classe, arquivo, linha** | Revela estrutura interna e versões — insumo direto para exploração |
| **SQL, nome de tabela, coluna ou schema** | Mapeia o banco e facilita injeção |
| **Host, porta, IP interno, nome de servidor, connection string** | Descreve a topologia da infraestrutura |
| **Chave de API, token, segredo, hash** | Comprometimento imediato; se vazou, rotacione antes de corrigir o código |
| **Dado pessoal de qualquer titular** | CPF, e-mail, telefone, endereço, nome completo, dado de cartão |
| **Existência de conta ou recurso alheio** | Permite enumerar usuários e recursos de outros assinantes |
| **Mensagem bruta de exceção de terceiro** | Frequentemente carrega todos os itens acima de uma vez |
| **Identificador `RN-*`** | Rastreamento de requisito vive só na documentação, nunca no runtime |

### LGPD — por que dado pessoal em erro é tratamento indevido

Mensagem de erro e log são **tratamento de dado pessoal** como qualquer outro. Ecoar o valor
recebido ("CPF 123.456.789-00 já cadastrado") viola minimização — a informação necessária ao usuário
é que o documento já existe, não o valor de volta. Pior: essa mensagem confirma a um terceiro que
aquele CPF está na base, o que é vazamento por si só.

- Mensagem de erro **não repete o valor** do campo sensível recebido. Aponta o campo, não o conteúdo.
- Log de erro registra **identificador opaco** (id do registro), nunca e-mail, CPF ou nome.
- Telemetria segue a mesma regra — `EnableSqlCommandTextInstrumentation` fica desligado justamente
  porque o texto do comando pode conter dado pessoal.
- Exceção não é envelope seguro: `ex.Message` de biblioteca de terceiro frequentemente inclui o valor
  que causou a falha.

### Segurança — respostas que não revelam

- **Autenticação:** credencial inválida e usuário inexistente produzem a **mesma** mensagem e o mesmo
  tempo de resposta. Diferenciá-las entrega uma ferramenta de enumeração de contas.
- **Recurso de outro dono:** responder "não encontrado" em vez de "sem permissão" quando revelar a
  existência já é informação. Decida por recurso e registre a decisão — os dois caminhos são
  legítimos em contextos diferentes.
- **Identificador de correlação:** toda resposta de erro inesperado carrega um identificador que
  permite achar o evento na telemetria. É o que substitui o stack trace: o usuário informa o código,
  o time encontra o detalhe do lado de dentro. O identificador é opaco e não carrega significado.
- **Log completo fica do lado de dentro.** Stack trace, SQL e contexto técnico vão para o Application
  Insights, associados ao identificador de correlação — e nada disso atravessa a fronteira da
  resposta.

## Como preencher

*As seções abaixo dependem do projeto. Preencha com decisões, não com intenções.*

### Formato da resposta de erro

*Fixe um formato e use em toda a superfície JSON. Formato variável obriga o consumidor a tratar cada
endpoint como um caso especial. Para as telas Razor, descreva onde o erro aparece — re-render do
formulário com erro por campo, banner de topo, página dedicada — e mantenha consistente entre telas.*

*Se adotar `ProblemDetails` (RFC 9457), registre quais campos são preenchidos e confirme que `detail`
nunca recebe `ex.Message` cru.*

```json
// exemplo — substituir pelo formato real do projeto
{
  "titulo": "Não foi possível concluir a operação",
  "tipo": "regra-de-negocio",
  "erros": [
    { "campo": "documento", "mensagem": "Documento já cadastrado." }
  ],
  "correlacao": "01JQ4X8Z7K3M9N2P"
}
```

### Mapeamento de status HTTP

*Ajuste à superfície real do projeto. O critério: o status é lido por máquina (cliente, monitoramento,
alerta), e a mensagem é lida por pessoa. Um status errado quebra o alerta antes de confundir o
usuário.*

| Status | Quando | Mensagem |
|---|---|---|
| `400` | Requisição malformada, falha de model binding | Específica, por campo |
| `401` | Não autenticado | Genérica; em Razor, redirect para login |
| `403` | Autenticado, sem direito sobre a operação | Genérica, sem detalhar a política |
| `404` | Recurso inexistente — ou existente e de outro dono, quando revelar já é informação | Genérica |
| `409` / `422` | Regra de negócio recusou a operação | Linguagem de domínio, acionável |
| `429` | Limite de tentativas excedido | Genérica; nunca revela o contador restante em fluxo de autenticação |
| `500` | Erro inesperado | Genérica + identificador de correlação |

### Catálogo de erros de negócio

*Uma linha por erro que o domínio produz deliberadamente. É este catálogo que garante mensagem
consistente entre telas: sem ele, o mesmo erro aparece com três redações diferentes.*

*A mensagem exibida vem da **constante pública do agregado** — é ela que o teste asseta, sem duplicar
string. O identificador `RN-*` fica nesta tabela e não na mensagem.*

| Situação | Agregado / constante | Status | Mensagem ao usuário | Regra |
|---|---|---|---|---|
| *(exemplo — substituir)* Assinante inadimplente cria usuário | `Assinante.MsgAssinanteInadimplente` | `409` | "Regularize o pagamento para adicionar usuários." | RN-2 |
| *(exemplo — substituir)* Assinatura em teste expirada | `Assinatura.MsgTesteExpirado` | `409` | "O período de teste terminou." | RN-1 |

### Tratamento de falha de integração externa

*Registre, por integração, o que acontece quando o terceiro falha: a operação é desfeita, fica
pendente de reprocessamento, ou o fallback assume? A decisão é de negócio, não técnica — e o usuário
precisa saber em qual dos três estados ele ficou.*

*Nunca repasse a mensagem do terceiro ao usuário: ela é escrita para desenvolvedor, muda sem aviso e
costuma carregar detalhe de infraestrutura.*

### Verificação antes de entregar

- [ ] Nenhuma mensagem exibida contém stack trace, SQL, host ou nome de classe.
- [ ] Nenhuma mensagem ecoa o valor de um campo com dado pessoal.
- [ ] Nenhum identificador `RN-*` aparece em mensagem, constante ou teste.
- [ ] Regra de negócio devolve `409`/`422`, nunca `500`.
- [ ] Erro inesperado devolve identificador de correlação, e o detalhe está na telemetria.
- [ ] Falha de autenticação não distingue usuário inexistente de senha errada.
- [ ] A página de erro genérica não expõe detalhe fora de Development, e a diferença está atrás de
      guarda de ambiente.
