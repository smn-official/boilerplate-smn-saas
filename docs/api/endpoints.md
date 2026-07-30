# Inventário de endpoints

> **Template do boilerplate.** Preencha ao implementar e remova este aviso.

## O que este documento responde

Toda a superfície HTTP publicada, num lugar só. Serve a duas perguntas que aparecem sempre: "existe
rota para isso?" e — mais importante — "quem consegue chamar isso?". A segunda é a razão de o
inventário existir: rota sem dono declarado é a forma mais comum de broken access control, e ela só
fica visível quando todas as rotas estão listadas lado a lado.

Convenções de rota, verbo e model binding estão em [conventions.md](conventions.md); formato e
mapeamento de erro, em [errors.md](errors.md). Aqui vai apenas o inventário.

## Regras fixas que a tabela pressupõe

Não repita estas linhas em cada endpoint — elas valem para todos:

- Rota em **inglês, kebab-case**; nome de Controller e action no **idioma do negócio**.
- Controllers de negócio são **`[Authorize]` por padrão**; a coluna "Permissão" registra o que
  restringe **além** disso, e `Anônimo` é sempre exceção explícita.
- Toda ação de escrita é `POST` com **`[ValidateAntiForgeryToken]`**.
- `CancellationToken` é o último parâmetro de toda action assíncrona.
- Rota de preview ou diagnóstico é `[AllowAnonymous]` **com guarda de ambiente** retornando `404`
  fora de Development — e aparece na tabela marcada como tal.

## Como preencher

*Uma linha por endpoint, agrupado por feature. A tabela é gerada por leitura dos Controllers, não de
memória — endpoint que existe no código e não está aqui é exatamente o que este documento deveria ter
pego.*

| Coluna | O que escrever | Critério |
|---|---|---|
| **Método** | `GET` ou `POST` | Leitura nunca é `POST`; escrita nunca é `GET` |
| **Rota** | O caminho completo publicado, com parâmetros | Copiado do atributo, não reconstruído mentalmente |
| **O que faz** | Uma frase, em linguagem de negócio | Se precisa de duas frases, provavelmente são dois endpoints |
| **Permissão** | Papel exigido **e** o vínculo com o dono do recurso | "Autenticado" sozinho não é permissão — quem é o dono? |
| **Regras aplicadas** | Os `RN-*` exercitados | Vazio é resposta válida para leitura simples; suspeito em escrita |

*Sobre a coluna Permissão: o item que mais escapa não é o papel, é o **vínculo**. "Administrador" não
impede um administrador do assinante A de abrir o recurso do assinante B — o vínculo com o dono
precisa estar escrito, porque é ele que vira verificação no serviço.*

## Inventário

### Assinaturas *(exemplo — substituir)*

| Método | Rota | O que faz | Permissão | Regras aplicadas |
|---|---|---|---|---|
| `GET` | `/subscriptions` | Lista as assinaturas do assinante autenticado | Autenticado; **apenas** as do próprio assinante | — |
| `GET` | `/subscriptions/new` | Abre o formulário de contratação | Administrador do assinante | — |
| `GET` | `/subscriptions/edit?id={id}` | Abre o formulário de edição | Administrador; a assinatura deve pertencer ao assinante autenticado | — |
| `POST` | `/subscriptions/save` | Cria ou atualiza a assinatura | Administrador do assinante dono | RN-1, RN-3 |
| `POST` | `/subscriptions/delete` | Cancela a assinatura | Administrador do assinante dono | RN-4 |

### Usuários *(exemplo — substituir)*

| Método | Rota | O que faz | Permissão | Regras aplicadas |
|---|---|---|---|---|
| `GET` | `/users` | Lista os usuários da conta | Administrador do assinante | — |
| `POST` | `/users/save` | Cadastra usuário e dispara o convite | Administrador do assinante | RN-2 |

## Endpoints anônimos

*Seção separada de propósito. Toda rota sem autenticação é decisão consciente e precisa de
justificativa escrita — é a lista que uma auditoria lê primeiro. Inclua aqui login, callback de
integração, webhook, health check e páginas públicas.*

| Método | Rota | O que faz | Por que é anônima | Proteção que substitui a autenticação |
|---|---|---|---|---|
| *(exemplo — substituir)* `POST` | `/auth/sign-in` | Autentica por e-mail e código de uso único | Precede a sessão | Limite de tentativas; resposta idêntica para usuário inexistente |
| *(exemplo — substituir)* `POST` | `/webhooks/payments` | Recebe eventos do provedor de pagamento | Chamado por terceiro | Verificação de assinatura do payload; idempotência por id do evento; sem antiforgery, por não ser formulário |

*Webhook é o caso que mais foge do padrão: não tem antiforgery, não tem sessão, e a autenticidade vem
da assinatura criptográfica do corpo. Registre isso explicitamente para ninguém "consertar"
adicionando `[Authorize]` e derrubar a integração.*

## Endpoints restritos a Development

*Rotas de preview, diagnóstico ou seed. Cada uma precisa de guarda de ambiente no código — o atributo
`[AllowAnonymous]` sozinho publica a rota em produção. Se a lista estiver vazia, escreva "nenhuma":
seção vazia é ambígua.*

## Manutenção

- Endpoint novo entra na tabela **na mesma entrega** que o Controller.
- Rota removida sai daqui e some do código junto — inventário com rota morta faz duvidar do resto.
- Mudança de permissão é mudança de inventário, mesmo quando o código muda uma linha só: é
  exatamente essa linha que a auditoria procura.
