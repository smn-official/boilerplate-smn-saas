# Convenções de API

> **Template do boilerplate.** Preencha ao implementar e remova este aviso.

## O que este documento responde

Como uma rota é nomeada, como uma action recebe dados e o que ela devolve. São decisões que só valem
se forem iguais em todo lugar: uma convenção seguida em 90% dos endpoints não é convenção, é
armadilha — quem consome precisa memorizar as exceções.

## Regras fixas do boilerplate

Estas não são preenchíveis. Valem em qualquer projeto nascido deste boilerplate.

### Rota é contrato externo — inglês e kebab-case

A rota é a única parte do sistema que estranhos leem. Por isso vai em **inglês, kebab-case**, mesmo
quando o domínio inteiro está em português. O nome do Controller e das actions acompanha o **idioma
do negócio** — a rota não é o nome da action.

```csharp
[Route("subscriptions")]
[Authorize]
public class AssinaturaController(IAssinaturaService assinaturaService) : Controller
{
    [HttpGet("")]        public Task<IActionResult> Gerenciar(...);
    [HttpGet("new")]     public Task<IActionResult> Novo(...);
    [HttpGet("edit")]    public Task<IActionResult> Editar(...);
    [HttpPost("save")]   [ValidateAntiForgeryToken] public Task<IActionResult> Salvar(...);
    [HttpPost("delete")] [ValidateAntiForgeryToken] public Task<IActionResult> Excluir(...);
}
```

| Elemento | Regra | Exemplo |
|---|---|---|
| Segmento de rota | Inglês, kebab-case, recurso no plural | `/subscription-items` |
| Parâmetro de rota | Inglês, kebab-case | `/subscriptions/{id}/items` |
| Query string | Inglês, kebab-case | `?page-size=20&order-by=created-at` |
| Nome do Controller | Idioma do negócio | `AssinaturaController` |
| Nome da action | Idioma do negócio, verbo de intenção | `Gerenciar`, `Salvar`, `Excluir` |
| ViewModel / DTO | Idioma do negócio | `AssinaturaResumoDto` |

Rota é declarada **por atributo** no Controller, nunca por convenção implícita de roteamento — o
contrato externo fica visível no arquivo, e renomear a classe não muda a URL publicada.

### Verbo HTTP

| Verbo | Uso | Exigências |
|---|---|---|
| `GET` | Leitura. Sem efeito colateral observável | Idempotente; nunca altera estado |
| `POST` | Toda escrita: criar, atualizar, excluir, executar ação | `[ValidateAntiForgeryToken]` obrigatório |

Em aplicação MVC/Razor com formulário e antiforgery, **não** se usa `PUT`, `PATCH` ou `DELETE`:
formulário HTML não os emite, e simulá-los por campo oculto acrescenta indireção sem ganho. Exclusão
é `POST /resources/delete`. Se o projeto expuser uma API JSON consumida por outro sistema, essa
superfície é separada, versionada, e aí sim usa o verbo semântico — documente-a em seção própria.

### Autorização por padrão

Controllers de negócio são `[Authorize]` **na classe**, e a exceção é explícita por action. O
inverso — liberar por padrão e proteger caso a caso — falha silenciosamente no dia em que alguém
esquece o atributo.

Rotas de preview ou diagnóstico ficam `[AllowAnonymous]` **com guarda de ambiente**, retornando `404`
fora de Development. Não basta o atributo: sem a guarda, a rota fica publicada em produção.

### `CancellationToken` sempre como último parâmetro

Em toda action assíncrona, e propagado até o repositório. Requisição abandonada pelo cliente deve
interromper trabalho — sem isso, o banco continua respondendo a uma pergunta que ninguém mais ouve.

```csharp
[HttpPost("save")]
[ValidateAntiForgeryToken]
public async Task<IActionResult> Salvar(SalvarAssinaturaRequest request, CancellationToken cancellationToken)
```

### Model binding

- O tipo que sofre model binding leva sufixo **`Request`** e vive na camada Web. É a **única** exceção
  à regra de propriedades somente leitura.
- O `Request` é convertido em **DTO** (sufixo `Dto`) antes de cruzar para `Core` — o Controller não
  entrega tipo de apresentação ao serviço, e o serviço não conhece model binding.
- Validação de model binding é **técnica** (tipo, obrigatoriedade de campo, formato). Regra de
  negócio não mora em DataAnnotation: ela é garantida no agregado. Ver
  [../domain/business-rules.md](../domain/business-rules.md).
- Método com 3+ parâmetros relacionados recebe um DTO, não uma lista de parâmetros.
- `Url.Action` nunca com string literal — use `nameof` para controller e action, e passe a URL ao
  TypeScript por atributo `data-*`.

## Como preencher

*As seções abaixo dependem de decisões do projeto. Escreva a decisão e o motivo — a decisão sozinha
não sobrevive à primeira discordância.*

### Versionamento

*Decida se existe superfície versionada e como. Se a API é consumida apenas pelas próprias views, o
versionamento é desnecessário e acrescentar `/v1/` é cerimônia vazia — registre isso explicitamente
para ninguém "corrigir" depois.*

*Havendo consumidor externo, fixe: onde a versão aparece (prefixo de rota é o mais legível em log e
cache), o que caracteriza mudança quebrante, e por quanto tempo a versão anterior continua
respondendo. Versão sem prazo de fim é versão eterna.*

| Decisão | Valor | Motivo |
|---|---|---|
| *(exemplo — substituir)* Superfície versionada | Nenhuma | Todo consumo é das próprias views; sem consumidor externo |

### Paginação

*Fixe um formato só e use em toda listagem. Listagem sem paginação é incidente de produção
programado: funciona até o cliente que tem dez mil registros.*

*Decida e registre: nomes dos parâmetros, tamanho padrão, **teto máximo** (sem teto, `page-size=100000`
derruba o servidor), e o que a resposta carrega além dos itens.*

| Item | Convenção | Observação |
|---|---|---|
| *(exemplo — substituir)* Parâmetros | `?page=1&page-size=20` | Inglês, kebab-case |
| *(exemplo — substituir)* Padrão / teto | 20 / 100 | Valor acima do teto é reduzido ao teto, não recusado |
| *(exemplo — substituir)* Ordenação | `?order-by=created-at&direction=desc` | Campos permitidos são lista fechada — nunca nome de coluna vindo do cliente |

### Formato de request e response

*Descreva o formato dominante do projeto e as exceções. Em Razor, o dominante é formulário
`application/x-www-form-urlencoded` de entrada e HTML de saída — registre onde JSON aparece e por quê
(endpoint consumido por TypeScript, webhook, integração).*

*Para respostas JSON, fixe a convenção de nome de campo e mantenha-a: camelCase e snake_case
misturados na mesma API obrigam o consumidor a consultar a doc a cada campo.*

### Cabeçalhos e cache

*Registre o que é obrigatório na resposta e o que nunca deve ser cacheado. Página autenticada com
cache público é vazamento entre usuários — decida isso uma vez, aqui, e não em cada action.*

### Idempotência

*Para operações que podem ser reenviadas (duplo clique, retry de webhook, reprocessamento), registre
como a repetição é detectada. Sem chave de idempotência, o retry vira cobrança dobrada — e o cliente
descobre antes de você.*
