# Fluxo de dados

> **Template do boilerplate.** Preencha ao implementar e remova este aviso.

Como uma requisição atravessa as camadas, o que muda de forma em cada fronteira e onde a transação
começa e termina. O fluxo é **fixo**: o que o projeto preenche são os casos de uso concretos que o
percorrem.

Referência normativa: [../../.ai/docs/estrutura-arquitetura.md](../../.ai/docs/estrutura-arquitetura.md),
seções 10 e 16.

| Marca | Significado |
|---|---|
| **Fixo pelo boilerplate** | Norma. Vale para toda requisição, em qualquer projeto. |
| *Preencher* | Decisão deste projeto. |

## Fluxo canônico — fixo pelo boilerplate

```text
Requisição → Controller → Service → Repository → Agregado
Resposta   ← View       ← ViewModel ← DTO      ← Agregado
```

A ida e a volta usam artefatos **diferentes** de propósito. Na ida, o dado converge para o domínio e
perde formatação; na volta, diverge para a tela e ganha formatação. Reutilizar o mesmo tipo nos dois
sentidos é o atalho que faz agregado virar contrato de API e ViewModel virar entidade.

### O que cada passo faz

| Passo | Camada | Faz | Não faz |
|---|---|---|---|
| Controller | Web | Valida antiforgery e model binding, extrai usuário e rota, delega, traduz em resposta HTTP | Regra de negócio, tocar `DbContext`, construir agregado |
| Helper / Mapper | Web | Converte `Request` (ViewModel) → `Dto` | Decidir regra |
| Service | Core | Orquestra o caso de uso, coordena agregados e integrações, persiste **uma vez** ao final | Conter regra, conhecer `.Include` / `ChangeTracker` |
| Specification | Core | Define critério de consulta, includes e ordenação | Executar consulta |
| Agregado | Core | Aplica invariantes e a regra de negócio; expõe decisão como propriedade calculada | Acessar banco ou API |
| Repository | Core (contrato) / Data | Busca, rastreia e salva agregados; aplica a specification | Orquestrar, retornar DTO |
| DTO | Core | Transporta dados entre serviço e apresentação | Ter comportamento |
| ViewModel | Web | Entrega à tela dados já formatados e decisões já resolvidas em booleano | Depender de service ou repository |
| View | Web | Renderiza marcação | Decidir regra, injetar service |

### Exemplo de escrita — fixo pelo boilerplate

```text
POST /resources/save
  │
  ▼
<Entidade>Controller.Salvar (Web)               valida antiforgery, resolve dependências de entrada
  │  <Entidade>FormularioMapper.ParaDto         Request (ViewModel) → Salvar<Entidade>Dto
  ▼
I<Entidade>Service.SalvarAsync (Core)           orquestração
  │  <Entidade>PorCodigoSpec                    busca existente / garante unicidade
  │  new <Entidade>(...) | .Atualizar(...)      INVARIANTES no agregado
  │  agregado.<PropriedadeDeRegra> ?            REGRA DE NEGÓCIO no agregado
  │     ├── caminho A → agregado.Desvincular…
  │     └── caminho B → I<Servico>Client        integração externa por contrato
  ▼
I<Entidade>Repository (Core, contrato)
  │
  ▼
<Entidade>Repository → <Contexto>DbContext      SaveChangesAsync único, ao final
  │
  ▼
RedirectToAction(...)
```

Invariantes do fluxo, que valem sempre:

- O Controller **nunca** toca o `DbContext`.
- A decisão de negócio vive no **agregado**, exposta como propriedade de regra; o serviço apenas a
  consulta e reage.
- Integração externa entra por **interface declarada em `Core`** e implementada em `Data`.
- Uma única persistência por operação, no final do serviço.
- `CancellationToken` atravessa o fluxo inteiro, sempre como último parâmetro.

### Leitura

Leitura segue o mesmo caminho sem a etapa de mutação: Controller → Service → Repository (com
specification) → agregado ou projeção somente leitura → DTO → ViewModel → View. Nenhuma consulta é
escrita em LINQ solto dentro do repositório — o critério fica na specification, no domínio.

## Transação — fixo pelo boilerplate

**Unit of Work implícito.** Não há `BeginTransaction` espalhado:

- `AdicionarAsync` no repositório **apenas rastreia** a entidade; não grava nada.
- `SalvarAlteracoesAsync` executa o `SaveChangesAsync` — chamado pelo **serviço**, **uma única vez**,
  ao final do caso de uso.
- Escopo da transação = escopo do `SaveChangesAsync`. Tudo que foi rastreado no caso de uso entra
  junto, ou nada entra.

Consequências que valem entender antes de "otimizar":

| Prática | Efeito |
|---|---|
| Salvar no meio do caso de uso | Quebra a atomicidade; um erro depois deixa estado parcial gravado |
| Salvar dentro de laço | Uma transação por item, com o mesmo problema multiplicado |
| Salvar dentro do repositório a cada operação | O serviço perde o controle transacional |

### Integração externa dentro da transação

Chamada a sistema externo **não** participa da transação do banco — ela não faz rollback. Ordene o
caso de uso para que a operação irreversível seja a última possível, e trate a falha explicitamente:
o que fazer se o banco gravou e a integração falhou é decisão de negócio, não detalhe técnico.

*Registre abaixo, por caso de uso, qual é essa decisão neste projeto.*

## Tratamento de erro — fixo pelo boilerplate

| Origem | Quem lança | Quem trata | Resposta |
|---|---|---|---|
| Invariante de domínio violada | Agregado, com constante de mensagem pública | Serviço ou Controller | Erro de validação exibido na tela |
| Requisição malformada | Model binding | Controller | Retorno de requisição inválida, sem chamar o serviço |
| Recurso inexistente | Serviço, após consulta | Controller | Not found |
| Falta de permissão | Autorização / serviço | Middleware ou Controller | Forbid / redirect de login |
| Falha de infraestrutura (banco, rede) | Data | Middleware de exception handling | Página de erro genérica + telemetria |

Regras que não se quebram:

- **Mensagem de erro de domínio vem de constante pública do agregado** (`<Entidade>.MsgCampoObrigatorio`),
  para o teste comparar contra a constante em vez de duplicar a string.
- **Nunca embutir sigla de rastreamento de requisito (`RN-*`)** em mensagem, constante ou teste.
- **Nada de dado pessoal ou segredo em mensagem de erro, log ou telemetria.** Critério em
  [.ai/skills/dados-pessoais-modelagem](../../.ai/skills/dados-pessoais-modelagem/SKILL.md).
- Exceção de infraestrutura não vaza detalhe de banco para a tela; ela vai íntegra para o
  Application Insights e genérica para o usuário.
- **Toda tela projeta carregamento, vazio, erro e permissão.** Tela que só existe no caminho feliz
  está incompleta e não é entregue.

## O que atravessa cada fronteira — fixo pelo boilerplate

| Fronteira | Entra | Sai | Nunca atravessa |
|---|---|---|---|
| HTTP → Web | Form, query, rota, claims | — | — |
| Web → Core | `Dto` de entrada, `CancellationToken` | `Dto` de saída ou agregado | ViewModel, `HttpContext`, `ClaimsPrincipal` cru |
| Core → Data | Contrato de repositório, `ISpecification<T>` | Agregado / entidade de domínio | DTO como retorno de repositório |
| Data → banco | SQL gerado pelo EF a partir da specification | Entidade materializada | — |
| Core → integração externa | Contrato declarado em `Core` | Resultado tipado do contrato | `HttpClient`, tipo do SDK do terceiro |
| Web → View | ViewModel com dados formatados e flags resolvidas | HTML | Agregado, DTO, service, repository |

A regra que resume: **cada fronteira estreita o contrato**. Se um tipo atravessa três camadas
intacto, ou a camada do meio é inútil, ou o tipo está fazendo trabalho de três.

## Casos de uso deste projeto

*Um por linha, com a entrada, o agregado que decide e o efeito colateral externo, se houver. É a
tabela que responde "onde mexo?" sem abrir o código — e a que revela caso de uso com dois agregados
decidindo, que é sempre suspeito.*

| Caso de uso | Rota | Agregado que decide | Efeito externo | Diagrama |
|---|---|---|---|---|
| *`Salvar <Entidade>`* | *`POST /resources/save`* | *`<Entidade>`* | *`I<Servico>Client`* | *[diagrams.md](diagrams.md)* |

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Estado parcial após erro | `SaveChangesAsync` chamado no meio do caso de uso | Persistir uma única vez, no fim do serviço |
| `if` de regra repetido em Controller e View | Decisão não exposta pelo agregado | Criar propriedade calculada (`Eh<Condicao>`) e consumi-la |
| View com `foreach` filtrando coleção | Ordenação/filtro fora da specification | Mover o critério para a specification |
| Teste de serviço precisa de banco | Repositório retornando tipo do ORM | Repositório devolve agregado; mockar o contrato |
| Mensagem de validação divergente do teste | String duplicada em vez de constante | Referenciar a constante pública do agregado |
