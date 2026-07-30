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

## Índice dos casos de uso

*Uma linha por caso de uso. Agrupe por feature quando a lista passar de uma tela.*

| Caso de uso | Ator | Endpoint | Regras |
|---|---|---|---|
| *(exemplo — substituir)* Contratar assinatura | Visitante | `POST /subscriptions/save` | RN-1, RN-3 |
| *(exemplo — substituir)* Cadastrar usuário na conta | Administrador do assinante | `POST /users/save` | RN-2 |

## Exemplo de caso de uso detalhado — substituir

### Cadastrar usuário na conta

**Ator.** Administrador do assinante (autenticado, vinculado ao assinante dono da conta).

**Pré-condições.** O assinante existe e sua assinatura não está cancelada. O e-mail informado ainda
não pertence a outro usuário do mesmo assinante.

**Fluxo principal.**

1. O administrador informa nome e e-mail do novo usuário.
2. O sistema verifica que o assinante está adimplente.
3. O sistema cria o usuário vinculado ao assinante, em situação "convite pendente".
4. O sistema envia o convite por e-mail.
5. O sistema confirma o cadastro e exibe o usuário na lista da conta.

**Fluxos alternativos e falhas.**

| Condição | Desfecho |
|---|---|
| Assinante inadimplente (RN-2) | Operação recusada pelo agregado; a tela informa a pendência de pagamento e oferece o caminho de regularização |
| E-mail já cadastrado no mesmo assinante | Operação recusada; a tela aponta o campo e-mail |
| Falha no envio do convite | Usuário permanece criado; o convite entra em reenvio e a tela informa que o e-mail será reenviado — a persistência não é desfeita por falha de integração |
| Assinatura cancelada | Operação recusada; nenhuma escrita ocorre |

**Pós-condições.** Existe um usuário em "convite pendente" vinculado ao assinante. Um marco de
negócio foi registrado em log estruturado, com identificador opaco — nunca e-mail ou nome.

**Permissões.** Apenas administrador do próprio assinante. Administrador de outro assinante recebe o
mesmo desfecho de "não encontrado", sem revelar a existência do recurso. Usuário comum recebe 403.

**Regras aplicadas.** RN-2.

## Casos de uso de leitura

*Consulta e listagem também são casos de uso, e também têm permissão e estados vazios. Descreva-os de
forma mais curta — ator, filtros disponíveis, o que o usuário vê quando não há resultado e quem pode
ver o quê — mas não os omita: é em listagem que o vazamento de dado de outro assinante costuma
aparecer.*

## Estados que toda tela cobre

*Todo caso de uso com interface projeta os quatro estados: carregamento, vazio, erro e permissão. Um
caso de uso que só descreve o caminho feliz não está pronto para virar tela — registre aqui o que a
tela mostra em cada um.*
