# Convenções de código

> **Template do boilerplate.** Preencha ao implementar e remova este aviso.

As convenções abaixo **não são preferência de estilo** — são norma do boilerplate, herdadas do
[AGENTS.md](../../AGENTS.md) e detalhadas em
[.ai/docs/estrutura-arquitetura.md](../../.ai/docs/estrutura-arquitetura.md). Revisão de código
cobra cada uma delas. O que o projeto acrescentar entra na seção final, nunca sobrescrevendo o que
está aqui.

O princípio por trás de todas: **Clean Code, SOLID e KISS, sem abstração prematura.** Três linhas
duplicadas são melhores que um wrapper usado uma vez.

## Sem comentário no código

**Norma.** Não há comentário no código de produção, com uma exceção: `<summary>` XML em tipos e
operações públicas, para registrar decisão não óbvia — o papel de um contexto, o motivo de um
fallback, a fronteira de propriedade de um schema.

O motivo é prático: comentário não compila, ninguém o revisa e ele envelhece em silêncio. Nomeação é
o que sobrevive à refatoração.

```csharp
// ❌ O comentário explica o que o nome deveria explicar.
// verifica se o pedido pode ser faturado
if (p.St == 2 && p.Itens.Count > 0)

// ✅ O nome carrega a intenção; o comentário some.
if (pedido.PodeSerFaturado)
```

```csharp
/// <summary>
/// Schema de outro sistema. O projeto consome, não é dono — nenhuma migration incide sobre ele.
/// </summary>
public const string <Externo> = "<Externo>";
```

Quando um trecho realmente exige explicação, extraia um método com nome descritivo. Se nem assim o
código se explica, o desenho é o problema — não a ausência do comentário.

## `CancellationToken` sempre como último parâmetro

**Norma, sem exceção.** Vale para método de serviço, repositório, integração e action de controller.
A posição fixa elimina a dúvida na chamada e torna a ausência do token visível na assinatura.

```csharp
Task<<Entidade>Dto> ObterAsync(Guid id, CancellationToken cancellationToken);

Task SalvarAsync(Salvar<Entidade>Dto dto, CancellationToken cancellationToken);
```

O controller **propaga** o token que recebe; não cria um novo e não passa `default` para descartar o
cancelamento do cliente.

## Métodos com 3+ parâmetros relacionados recebem um DTO

**Norma.** Três ou mais parâmetros que descrevem a mesma coisa viram um objeto de transporte.
Parâmetros posicionais do mesmo tipo são a origem clássica do defeito silencioso: trocar dois
`string` de lugar compila e passa.

```csharp
// ❌ Quatro parâmetros do mesmo grupo; a ordem é uma armadilha.
Task SalvarAsync(string codigo, string nome, string descricao, decimal valor, CancellationToken ct);

// ✅ Um contrato nomeado — e o CancellationToken continua por último.
Task SalvarAsync(Salvar<Entidade>Dto dto, CancellationToken cancellationToken);
```

O critério é **relacionados**, não a contagem crua: `ObterAsync(Guid id, bool incluirExcluidos,
CancellationToken ct)` não precisa de DTO.

## Propriedades somente leitura

**Norma em classes novas**, inicializadas por construtor. Setter público em classe nova é permissão
para o objeto entrar em estado inválido de fora — exatamente o que o agregado existe para impedir.

```csharp
public sealed class <Entidade>ResumoDto
{
    public <Entidade>ResumoDto(Guid id, string nome)
    {
        Id = id;
        Nome = nome;
    }

    public Guid Id { get; }
    public string Nome { get; }
}
```

Duas exceções, ambas explícitas:

| Exceção | Por quê |
|---|---|
| DTO de model binding (sufixo `Request`) | O binder do MVC precisa de setter |
| Classe preexistente com `set` público | Alterar quebraria fluxos que não estão no escopo |

Instancie **via construtor**, nunca por object initializer. Se a classe não tem construtor com
parâmetros, crie um. Prefira construtor primário quando ele apenas atribui.

## Sufixo `Dto` em todo objeto de transporte

**Norma**, na classe **e** no arquivo: `Salvar<Entidade>Dto` mora em `Salvar<Entidade>Dto.cs`.

O sufixo é o que distingue, a olho nu, transporte de domínio. Sem ele, um DTO acaba usado como
entidade e uma entidade acaba exposta como contrato externo — os dois erros mais caros de desfazer.

| Tipo | Sufixo | Camada |
|---|---|---|
| Entrada de serviço | `Salvar<Entidade>Dto` | `Core/DTOs/<Contexto>` |
| Saída de serviço | `<Entidade>ResumoDto` | `Core/DTOs/<Contexto>` |
| Model binding da Web | `<Entidade>Request` | `Features/<Feature>/ViewModels` |

Nem todo `record` é DTO — records também modelam Value Objects e eventos, que são conceitos
distintos e não levam o sufixo.

## Enum persistido convertido para string

**Norma.** Toda configuração de EF Core que mapeia enum usa `HasConversion<string>()`, com
`HasMaxLength`. Nunca inteiro.

```csharp
builder.Property(entidade => entidade.Status)
    .HasConversion<string>()
    .HasMaxLength(30)
    .IsRequired();
```

O motivo é operacional: inteiro no banco é ilegível em consulta ad hoc, e **reordenar os membros do
enum reescreve silenciosamente o significado de cada linha já gravada**. String sobrevive à
reordenação e ao `select` manual às três da manhã.

## Early return em vez de `if` aninhado

**Norma.** Cláusula de guarda no topo, caminho feliz sem indentação.

```csharp
// ❌ A regra fica soterrada em três níveis.
public void Aprovar()
{
    if (Status != <Entidade>Status.Cancelado)
    {
        if (_itens.Count > 0)
        {
            Status = <Entidade>Status.Aprovado;
        }
    }
}

// ✅ Cada impedimento é uma linha explícita; o resultado é a última.
public void Aprovar()
{
    if (Status == <Entidade>Status.Cancelado)
        throw new DomainException(Msg<Entidade>Cancelado);

    if (_itens.Count == 0)
        throw new DomainException(Msg<Entidade>SemItens);

    Status = <Entidade>Status.Aprovado;
}
```

Além da leitura, o ganho é de teste: cada guarda é um cenário nomeável, com mensagem própria em
constante pública.

## Formatação

**Norma:**

- Linhas de **~120 caracteres**; acima disso, quebrar.
- **Um parâmetro por linha** quando a assinatura excede o limite.
- **Chamadas encadeadas** — cada `.Metodo()` na própria linha, indentado um nível.
- **Condições compostas** com o operador no início da nova linha.
- **Trailing comma** em enums e em objetos/destructuring de TypeScript.
- Sem linha em branco entre propriedades da mesma classe; linha em branco separa propriedades de
  construtores e métodos.
- Sem linha em branco entre membros de enum, mesmo com atributos.
- Linha em branco após o `namespace` file-scoped.
- **Não alinhar atribuições por colunas** — polui diff.
- Sem trailing whitespace.
- Construtor e método vazios em linha única: `protected <Entidade>() {}`.
- **Newline no final de todo arquivo.**

O limite de ~120 é sobre revisão, não sobre monitor: diff lado a lado e comentário de PR ficam
legíveis; linha de 200 caracteres esconde a alteração no scroll horizontal.

## Idioma

**Norma**, e a fronteira é entre o que é **do negócio** e o que é **contrato técnico**.

| Elemento | Idioma | Exemplo |
|---|---|---|
| Agregado, serviço, DTO, ViewModel, controller, action | Idioma do negócio | `PedidoService`, `SalvarPedidoDto` |
| Pasta de feature | Idioma do negócio | `Features/Pedidos/` |
| Documentação, `<summary>`, texto de interface | Idioma do negócio | — |
| Chave de configuração e variável de ambiente | Inglês | `ConnectionStrings__Default` |
| **Rota HTTP** | **Inglês, kebab-case** | `[Route("purchase-orders")]` |

Rota é contrato externo e entra em URL, log e integração de terceiro — por isso inglês e kebab-case,
mesmo quando o controller que a serve tem nome em português:

```csharp
[Route("resources")]
[Authorize]
public class RecursoController(IRecursoService recursoService) : Controller
{
    [HttpGet("")]        public Task<IActionResult> Gerenciar(...);
    [HttpGet("new")]     public Task<IActionResult> Novo(...);
    [HttpPost("save")]   [ValidateAntiForgeryToken] public Task<IActionResult> Salvar(...);
}
```

## Identificadores PostgreSQL por extenso

**Norma.** Tabela, coluna, parâmetro, variável e procedure escritos por extenso — **sem abreviação,
sigla ou diminutivo**.

| Correto | Errado | Por quê |
|---|---|---|
| `quantidade_disponivel` | `qtd_disp` | Abreviação exige decodificação |
| `data_vencimento` | `dt_venc` | Idem |
| `identificador_cliente` | `id_cli` | Diminutivo é ambíguo |
| `numero_documento` | `nr_doc` | Sigla local não é vocabulário |

O motivo é que o banco é lido por quem não escreveu o código — analista, DBA, relatório, consulta de
incidente. Abreviação economiza segundos na digitação e custa minutos em cada leitura futura. Regra
completa em [`nomenclatura`](../../.ai/skills/nomenclatura/SKILL.md).

Nas configurações de EF Core, use `nameof` para nome de tabela e coluna.

## `RN-*` nunca aparece no código

**Norma.** Sigla de rastreamento de requisito (`RN-<MÓDULO>-<N>` e variantes) **não entra** em
mensagem, constante, view, TypeScript, teste ou log.

São artefatos da documentação e criam acoplamento frágil: a numeração muda no documento e o código
passa a mentir, sem que nada quebre. A mensagem descreve **o quê** e **por quê** em linguagem de
domínio; o teste asserta pela constante de mensagem exposta pelo agregado.

```csharp
// ❌ Acopla o runtime à numeração de um documento.
throw new DomainException("RN-PED-014: pedido cancelado não pode ser faturado.");

// ✅ A regra em linguagem de domínio, testável pela constante.
public const string MsgPedidoCancelado = "Pedido cancelado não pode ser faturado.";
```

Não confundir com dado real de domínio — número de contrato, norma externa, código de centro de
custo — que deve ser preservado.

## Demais regras herdadas

- **Nomes revelam intenção.** Nada de `x`, `temp`, `data`, `item`, `obj`, `val`, `res`, `ret`.
- **Métodos pequenos.** Acima de ~20 linhas ou fazendo coisas distintas, extrair.
- **Sem número mágico** — constante, enum ou variável nomeada.
- **DRY quando a duplicação é real** (mesma intenção), não apenas sintática.
- **Depender de abstração** — nada de `new` em dependência dentro de classe de alto nível.
- **Validar nulidade antes de repassar** valor a outra função.
- **Pipe `|` como separador em string**, nunca traço `-`.
- **`Url.Action` sem string hardcoded** — `nameof` para controller e action.
- **Sem URL hardcoded no TypeScript** — rota gerada no Razor, passada por `data-*`.
- **Uma specification por filtro**, composta no serviço; nada de spec guarda-chuva com `null check`
  dentro da expressão.
- **Nada de `style=""` em Razor** — classes utilitárias do Tailwind, sobre os tokens de `@theme`.

## Convenções específicas deste projeto

*Registre aqui apenas o que este projeto acrescentou — um analisador habilitado, uma regra de
`.editorconfig`, um padrão de nomeação de feature. Nada nesta seção pode contradizer o que está
acima; se for necessário mudar uma norma, altere o [AGENTS.md](../../AGENTS.md) na mesma entrega.*

## Como isso é cobrado

Boa parte das normas acima **não depende de revisão humana** — o build recusa. Dois arquivos na raiz
fazem isso, e ambos são herdados automaticamente por todo projeto da solução:

| Arquivo | O que garante |
|---|---|
| [`Directory.Build.props`](../../Directory.Build.props) | `TreatWarningsAsErrors` em **todos** os projetos, não só nos de teste; `Nullable`, `LangVersion=latest`, `EnforceCodeStyleInBuild` e `AnalysisLevel` |
| [`.editorconfig`](../../.editorconfig) | ~120 caracteres, indentação, newline final, `using` fora do namespace, namespace file-scoped, nomenclatura — e a severidade de cada analisador |

`CA1068` — `CancellationToken` como último parâmetro — está marcado como **erro**: violá-lo não
gera aviso, quebra o build. O mesmo vale para nulidade (`CS8603` e família), que o `Nullable`
transforma em falha de compilação em vez de exceção em produção.

A formatação isolada pode ser conferida sem compilar:

```bash
dotnet format --verify-no-changes
```

Nada disso substitui revisão. Continuam humanas as normas que exigem julgamento: se o nome revela
intenção, se a duplicação é real ou apenas sintática, se um DTO era mesmo necessário, se a guarda
cobre o cenário certo e se o `<summary>` registra decisão não óbvia em vez de repetir o nome do
método.

*Se este projeto acrescentar cobrança automática — teste de arquitetura validando `Web → Data →
Core`, analisador extra, verificação no pipeline —, registre aqui.*

O portão fixo é o de "Antes de entregar", em [commands.md](commands.md): build e testes em Release,
**sem erros e sem avisos**. Aviso ignorado hoje é a convenção que ninguém cobra amanhã.
