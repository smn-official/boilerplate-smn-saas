# Esqueleto de arquitetura — template de projeto

Documento **autossuficiente** de referência para iniciar um projeto novo. Contém tudo o que é
necessário para entender e aplicar o padrão: estilo arquitetural, camadas, regras de dependência,
organização de pastas, dependências, observabilidade, convenções de código, responsabilidade de cada
artefato, design system e critérios de separação de domínio.

Não depende de nenhum outro arquivo — referenciar este documento é suficiente.

Substitua os marcadores `<Produto>`, `<Modulo>`, `<Feature>`, `<Entidade>`, `<Contexto>` e
`<Servico>` pelos nomes reais do projeto.

## Índice

| # | Seção | Quando ler |
|---|---|---|
| 1–3 | Visão geral, estilo arquitetural, mapa de projetos | Antes de qualquer coisa |
| 4–6 | Camadas Core, Data e Web | Ao implementar em cada camada |
| 7 | Dependências essenciais | Ao montar o projeto ou avaliar um pacote novo |
| 8–9 | Composição da raiz e observabilidade | Ao configurar o startup |
| 10 | Fluxo de uma requisição | Para entender como as camadas se conectam |
| 11–12 | Testes, build, CI e deploy | Antes de entregar |
| 13 | Convenções de código | Sempre — é o que revisão de código cobra |
| 14 | Fronteiras e restrições | Ao integrar com outro sistema |
| 15 | Checklist de projeto novo | Ao criar o repositório |
| 16 | Responsabilidades por artefato | Sempre que criar um artefato novo |
| 17 | Design system e tipografia | Ao mexer em UI |
| 18 | Quando criar ou separar um domínio | Ao modelar um domínio novo |
| 19 | Documentação do projeto | Ao evoluir a própria documentação |

---

## 1. Visão geral

Aplicação web ASP.NET Core MVC/Razor implantável de forma independente, com domínio próprio,
persistência própria e integrações externas isoladas por contrato.

| Item | Valor de referência |
|---|---|
| Plataforma | .NET 10 (`net10.0`), ASP.NET Core MVC + Razor |
| Banco | PostgreSQL (Npgsql) |
| ORM | Entity Framework Core 10 |
| Front-end | **TypeScript (versão estável mais recente) + Tailwind CSS, compilados por Vite** |
| Testes | xUnit v3, Moq, FluentAssertions; HtmlAgilityPack na camada Web |
| Configuração | `IOptions` + `.env` / variáveis de ambiente |
| Observabilidade | **Azure Application Insights** (obrigatório) — logging, métricas e rastreamento distribuído |
| CI/CD | Pipeline com stages Build → Test → Deploy |

---

## 2. Estilo arquitetural

O esqueleto combina três padrões, cada um atuando em um eixo diferente:

- **Arquitetura em camadas com dependência unidirecional** (`Web → Data → Core`), no eixo dos
  projetos. `Core` é o centro e não referencia nenhum outro projeto da solução.
- **Vertical Slice / Feature Folders**, no eixo da apresentação. Cada feature agrupa Controller,
  ViewModels, Views, Scripts e Styles na mesma pasta.
- **DDD tático leve** no domínio: raízes de agregado com invariantes no construtor, Specifications
  para consulta, repositórios por contrato e serviços de domínio orquestrando.

**Deliberadamente fora do escopo:** CQRS, MediatR, event sourcing e camada de aplicação separada.
A diretriz é Clean Code + SOLID + KISS, sem abstrações prematuras. Introduza qualquer um desses
padrões apenas quando houver um problema concreto que os justifique.

---

## 3. Mapa de projetos

```text
<Produto>.slnx
└── src/
    ├── <Produto>.<Modulo>/
    │   ├── Core/     <Produto>.<Modulo>.Core.csproj    (domínio)
    │   ├── Data/     <Produto>.<Modulo>.Data.csproj    (persistência e integrações)
    │   └── Tests/    <Produto>.<Modulo>.Tests.csproj   (testes de Core e Data)
    └── <Produto>.<Modulo>.Web/
        ├── <Produto>.<Modulo>.Web.csproj               (apresentação e composição)
        └── Tests/ <Produto>.<Modulo>.Web.Tests.csproj  (testes da apresentação)
```

| Projeto | Responsabilidade | Proibido conter |
|---|---|---|
| `.Core` | Agregados, regras de negócio, DTOs, enums, specifications, contratos (interfaces) e serviços de domínio, classes de `Settings` | EF Core, HTTP, Razor, referência a Data ou Web |
| `.Data` | `DbContext`, `IEntityTypeConfiguration`, migrations, repositórios concretos, clientes de integração externa, extensão de DI | Regra de negócio, apresentação |
| `.Web` | Controllers, ViewModels, Views, TypeScript, Tailwind, autenticação/autorização, composição da raiz | Regra de domínio, acesso direto ao `DbContext` |
| `.Tests` | Testes de Core e Data, espelhando os caminhos testados | Código de produção |
| `.Web.Tests` | Testes de apresentação (excluídos do csproj Web via `DefaultItemExcludes`) | Código de produção |

### Regra de dependência

```text
Web ──► Data ──► Core
  └──────────────► Core
```

- `Core` não referencia nenhum projeto da solução.
- `Data` referencia somente `Core`.
- `Web` referencia `Core` e `Data`, e é responsável pela composição.
- `Tests` referencia apenas os projetos necessários ao cenário testado.

A referência direta `Web → Core` existe para composição (o Controller injeta interfaces declaradas
em `Core.Interfaces.Services`), **nunca** para pular a camada de dados.

### Namespaces

Espelham a estrutura de pastas: `<Produto>.<Modulo>.Core.*`, `<Produto>.<Modulo>.Data.*`,
`<Produto>.<Modulo>.Web.*`, `<Produto>.<Modulo>.Tests.*`.

Recomenda-se um **teste de arquitetura** que carregue cada assembly por nome e valide a
nomenclatura, travando o padrão contra renomeações acidentais.

---

## 4. Camada Core — domínio

```text
src/<Produto>.<Modulo>/Core/
├── Common/                    AggregateRoot<TId>, ISpecification<T>, Specification<T>
├── Constants/<Contexto>/      constantes agrupadas por contexto
├── DTOs/<Contexto>/           contratos de entrada/saída dos serviços (sufixo Dto)
├── Enums/                     enums de domínio
├── Interfaces/
│   ├── Repositories/          I<Entidade>Repository
│   └── Services/              I<Entidade>Service, contratos de integração externa
├── Models/
│   ├── Aggregates/<Nome>/     raízes de agregado e entidades filhas
│   └── <Contexto>/            projeções somente leitura
├── Services/                  serviços de domínio
├── Settings/                  classes de configuração vinculadas por IOptions
└── Specs/<Entidade>/          specifications de consulta
```

### Agregados

Herdam de uma `AggregateRoot<TId>` própria do projeto (não de um assembly externo), que expõe
apenas `Id` com `protected init`:

```csharp
public abstract class AggregateRoot<TId>
{
    public TId Id { get; protected init; }
}
```

Regras aplicadas a todo agregado:

- Propriedades com **setter privado**; mutação apenas por métodos de intenção (`Atualizar`,
  `Excluir`, `Vincular…`, `Desvincular…`).
- **Invariantes validadas no construtor** e em cada mutação.
- Mensagens de validação em **constantes públicas** (`<Entidade>.MsgCampoObrigatorio`), permitindo
  testá-las sem duplicar strings.
- Construtor `protected` sem parâmetros apenas para o ORM materializar.
- Coleções filhas expostas como somente leitura sobre uma lista privada.

### Specifications

Classe abstrata que encapsula predicado, `Includes` e ordenação — consultas vivem no domínio, não em
LINQ solto dentro dos repositórios:

```csharp
public abstract class Specification<T> : ISpecification<T>
{
    private readonly List<Expression<Func<T, object>>> _includes = [];

    public abstract Expression<Func<T, bool>> ToExpression();
    public IReadOnlyList<Expression<Func<T, object>>> Includes => _includes.AsReadOnly();
    public Expression<Func<T, object>> OrderBy { get; private set; }
    public bool OrdemDescendente { get; private set; }

    protected void AdicionarInclude(Expression<Func<T, object>> include) => _includes.Add(include);

    protected void OrdenarPor(Expression<Func<T, object>> ordenacao, bool descendente = false)
    {
        OrderBy = ordenacao;
        OrdemDescendente = descendente;
    }
}
```

### Serviços de domínio

Orquestram repositório + integração externa e são a **única porta de entrada para escrita**. O
serviço coordena; a regra de negócio permanece no agregado. Sequência típica de um `SalvarAsync`:

1. Busca a entidade existente por specification (resolve criação vs. edição).
2. Garante invariantes de unicidade que dependem do repositório.
3. Constrói ou atualiza o agregado — as invariantes internas são responsabilidade dele.
4. Consulta uma propriedade de regra do próprio agregado para decidir o caminho.
5. Sincroniza a integração externa pelo contrato declarado em `Core`.
6. Persiste uma única vez, ao final.

### Settings

Classes de configuração ficam em `Core` (dependendo apenas de `Microsoft.Extensions.Options`) e são
vinculadas por `IOptions` na camada `Data`. Cada uma expõe a constante da própria seção
(`<Nome>Settings.SecaoConfiguracao`), evitando strings mágicas na composição.

---

## 5. Camada Data — persistência e integrações

```text
src/<Produto>.<Modulo>/Data/
├── Configurations/     IEntityTypeConfiguration por entidade
├── Context/            DbContexts, DbContextFactory, SchemaConsts
├── Extensions/         Servicos<Modulo>Extensions (registro de DI)
├── Integracoes/        clientes de APIs externas (pagamento, e-mail, etc.)
├── Migrations/         apenas dos contextos dos quais o projeto é dono
└── Repositories/       implementações + SpecificationEvaluator
```

### 5.1 Propriedade de schema — contexto consumidor vs. proprietário

Quando o projeto compartilha banco com outro sistema, separe os papéis em **contextos distintos** e
documente-os em `<summary>`:

| Papel | Descrição | Migrations |
|---|---|---|
| **Proprietário** | É dono das tabelas do próprio schema | Sim — migrations próprias, aplicadas no startup |
| **Consumidor** | Mapeia tabelas cuja fonte de verdade pertence a outro sistema | **Nenhuma.** Nunca cria, migra ou apaga tabela; sem `EnsureCreated` |

Centralize os nomes de schema em uma classe de constantes, com o papel de cada um documentado:

```csharp
public static class SchemaConsts
{
    /// <summary>Schema próprio do projeto, evoluído por migrations. Leitura e escrita.</summary>
    public const string <Proprio> = "<Proprio>";

    /// <summary>Schema de outro sistema. Consumido; o projeto não é dono.</summary>
    public const string <Externo> = "<Externo>";
}
```

Consumir a mesma fonte de verdade de outro sistema **não é duplicá-la** — o antipadrão seria
replicar os dados e criar uma segunda fonte. Adicione um `IDesignTimeDbContextFactory` para cada
contexto proprietário, de modo que o tooling do EF funcione fora do host.

**Segundo eixo — schema do cliente vs. compartilhado.** Proprietário/consumidor responde *"quem é
dono destas tabelas?"*. Independente disso, o isolamento entre clientes é feito por **schema do
PostgreSQL**, resolvido em runtime por `SET search_path` na abertura da conexão, a partir de uma
claim do usuário autenticado ([ADR-003](../../docs/decisions/ADR-003-isolamento-multi-schema.md)).
Os dois eixos coexistem: um mesmo sistema pode consumir schema de terceiro **e** isolar clientes por
schema.

| Eixo | Pergunta | Efeito no mapeamento |
|---|---|---|
| Proprietário / consumidor | Quem é dono destas tabelas? | Define se o contexto tem migrations |
| Cliente / compartilhado | Estas linhas são de um cliente ou de todos? | Define se o `ToTable` leva schema |

Entidade **do cliente** é mapeada **sem schema explícito** — o `search_path` da conexão resolve.
Entidade **compartilhada** ou de outro sistema mantém o schema explícito via `SchemaConsts`, como
acima; a classe de constantes continua valendo integralmente para todo schema fixo. Execução —
interceptor, migrations em N schemas, provisionamento e teste de isolamento — na skill
[multi-schema](../skills/multi-schema/SKILL.md).

### 5.2 Repositórios e Specifications

Todo repositório recebe uma `ISpecification<T>` e delega a tradução para um `SpecificationEvaluator`
compartilhado, que aplica `Where`, os `Include` e a ordenação sobre o `IQueryable`:

```csharp
public static IQueryable<T> AplicarSpecification<T>(IQueryable<T> consulta, ISpecification<T> specification)
    where T : class
{
    var consultaComFiltro = consulta.Where(specification.ToExpression());

    foreach (var include in specification.Includes)
        consultaComFiltro = consultaComFiltro.Include(include);

    if (specification.OrderBy is null)
        return consultaComFiltro;

    return specification.OrdemDescendente
        ? consultaComFiltro.OrderByDescending(specification.OrderBy)
        : consultaComFiltro.OrderBy(specification.OrderBy);
}
```

Resultado: nenhum repositório contém regra de filtro própria e nenhuma consulta escapa do domínio.

**Unit of Work implícito:** `AdicionarAsync` apenas rastreia a entidade; `SalvarAlteracoesAsync`
(chamado pelo serviço, **uma vez**, ao final) executa o `SaveChangesAsync`.

### 5.3 Integrações externas com fallback

Padrão obrigatório para toda integração externa — **um contrato em `Core`, duas implementações em
`Data`, escolha na composição**:

| Contrato (Core) | Implementação real | Fallback | Critério de escolha |
|---|---|---|---|
| `I<Servico>Client` | `<Servico>Client` | `<Servico>ClientDesabilitado` | Flag `Enabled` + credencial preenchida |

O fallback é uma implementação inerte (no-op, ou que apenas registra em log quando em Development).
Isso permite rodar o projeto localmente sem credenciais de nenhum serviço externo. A decisão fica
**na extensão de DI**, nunca espalhada em `if` dentro do domínio:

```csharp
private static void Adicionar<Servico>(IServiceCollection services, IConfiguration configuration)
{
    var secao = configuration.GetSection(<Servico>Settings.SecaoConfiguracao);
    services.Configure<<Servico>Settings>(secao);

    var settings = secao.Get<<Servico>Settings>();
    var habilitado = settings is { Enabled: true } && !string.IsNullOrWhiteSpace(settings.SecretKey);

    if (habilitado)
    {
        services.AddScoped<I<Servico>Client, <Servico>Client>();

        return;
    }

    services.AddScoped<I<Servico>Client, <Servico>ClientDesabilitado>();
}
```

### 5.4 Configurations do EF

Uma classe `IEntityTypeConfiguration<T>` por entidade, aplicada explicitamente em `OnModelCreating`.
Convenções:

- `ToTable(nameof(<Entidade>), SchemaConsts.<Schema>)` — schema sempre explícito.
- **Enums persistidos com `HasConversion<string>()`** e `HasMaxLength`, nunca como inteiro.
- Valores monetários e decimais com `HasPrecision`.
- Flags booleanas com `HasDefaultValue`.
- Soft delete por propriedade `Excluido` com `HasDefaultValue(false)`.

---

## 6. Camada Web — apresentação

```text
src/<Produto>.<Modulo>.Web/
├── Configurations/     FeatureViewLocationExpander e afins
├── Extensions/         extensions de Razor, ClaimsPrincipal, rotas
├── Features/
│   ├── _ViewImports.cshtml, _ViewStart.cshtml
│   ├── <Feature>/
│   └── Shared/         layout, app.css (@theme com os tokens), componentes reutilizáveis
├── Properties/         launchSettings.json
├── Services/           serviços exclusivos da apresentação
├── Tests/              projeto de testes da apresentação
├── wwwroot/            saída do build de assets (gerada)
├── Program.cs          composição da raiz
├── vite.config.ts      compilador de assets (TypeScript + Tailwind)
└── tsconfig.json       strict, noUnusedLocals, noUnusedParameters
```

### 6.1 Anatomia de uma feature

```text
Features/<Feature>/
├── Controllers/   coordena entrada, serviço e resposta — sem regra de negócio
├── ViewModels/    apresentação; nunca vira entidade de persistência
├── Views/         Razor, sem regra de negócio e sem style=""
├── Scripts/       TypeScript da feature
├── Styles/        CSS/Tailwind da feature (opcional)
├── Services/      opcional
└── Helpers/       opcional — formatação e mapeamento Request → Dto
```

Responsabilidades:

- **Controller** — injeta apenas interfaces de `Core.Interfaces.Services`; monta ViewModel e retorna.
- **Helpers** — concentram formatação (rótulos, datas, moeda) e o mapeamento `Request → Dto`,
  mantendo o Controller enxuto.
- **ViewModels** — records de leitura. Sufixo `Request` para os que sofrem model binding (única
  exceção à regra de propriedades somente leitura).
- Elementos visuais compartilhados ficam em `Features/Shared` e **não devem ser duplicados**.
- `Services` e `Helpers` são opcionais; pastas nascem com o primeiro artefato real.

### 6.2 Localização de views

Um `IViewLocationExpander` prepende os padrões de feature aos padrões nativos do Razor, tornando a
estrutura vertical possível:

```csharp
var featureLocations = new[]
{
    "/Features/{1}/Views/{0}.cshtml",
    "/Features/{1}/Views/Shared/{0}.cshtml",
    "/Features/Shared/{0}.cshtml",
};

return featureLocations.Concat(viewLocations);
```

O layout padrão é definido em `Features/_ViewStart.cshtml`.

### 6.3 Rotas

Rotas são **contrato externo: inglês e kebab-case**, declaradas por atributo no Controller, enquanto
o nome do Controller e das actions acompanha o idioma do domínio:

```csharp
[Route("resources")]
[Authorize]
public class RecursoController(IRecursoService recursoService) : Controller
{
    [HttpGet("")]        public Task<IActionResult> Gerenciar(...);
    [HttpGet("new")]     public Task<IActionResult> Novo(...);
    [HttpGet("edit")]    public Task<IActionResult> Editar(...);
    [HttpPost("save")]   [ValidateAntiForgeryToken] public Task<IActionResult> Salvar(...);
    [HttpPost("delete")] [ValidateAntiForgeryToken] public Task<IActionResult> Excluir(...);
}
```

Convenções:

- Controllers de negócio são `[Authorize]` por padrão.
- Toda action `POST` exige `[ValidateAntiForgeryToken]`.
- `CancellationToken` sempre como **último parâmetro**.
- Rotas auxiliares de preview/diagnóstico ficam `[AllowAnonymous]`, mas com **guarda de ambiente**
  retornando `404` fora de Development.

### 6.4 Pipeline de assets — Vite + Tailwind CSS

**Vite é o compilador obrigatório** dos assets de front-end. Não use scripts Node artesanais, Gulp,
Webpack ou o bundler do próprio ASP.NET: o Vite compila e recarrega em ordens de grandeza menos
tempo (esbuild para transpilação, HMR incremental em desenvolvimento) e entrega build de produção
com tree-shaking, minificação e hashing de conteúdo sem configuração adicional.

**Tailwind CSS é o framework de estilo obrigatório.** **Não usar UIkit**, Bootstrap, Foundation ou
qualquer biblioteca de componentes pré-estilizados. O motivo é arquitetural, não estético:
bibliotecas de componentes impõem seu próprio design system, exigem sobrescrita por especificidade
para se adequar à identidade visual do produto, e trazem CSS que nunca será usado. Tailwind é
utilitário — o CSS final contém apenas as classes efetivamente presentes no markup.

#### Estrutura

```text
src/<Produto>.<Modulo>.Web/
├── Features/<Feature>/
│   ├── Scripts/<feature>.ts      entry point da feature
│   └── Styles/<feature>.css      camadas Tailwind específicas da feature (opcional)
├── Features/Shared/
│   ├── Scripts/                  módulos compartilhados
│   └── Styles/app.css            @import "tailwindcss" + @theme + componentes compartilhados
├── wwwroot/dist/                 saída do Vite (gerada; fora do controle de versão)
├── vite.config.ts
├── tailwind.config.ts            opcional no Tailwind 4 (config via CSS)
├── tsconfig.json
└── package.json
```

#### Configuração do Vite

Um entry point por feature, saída com manifest para o Razor resolver os arquivos versionados:

```ts
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

export default defineConfig({
    plugins: [tailwindcss()],
    build: {
        outDir: "wwwroot/dist",
        emptyOutDir: true,
        manifest: true,
        rollupOptions: {
            input: {
                app: resolve(__dirname, "Features/Shared/Styles/app.css"),
                <feature>: resolve(__dirname, "Features/<Feature>/Scripts/<feature>.ts"),
            },
        },
    },
    server: {
        port: 5173,
        strictPort: true,
    },
});
```

#### Tailwind

A partir do Tailwind 4, a configuração vive no próprio CSS e o plugin oficial do Vite substitui o
PostCSS:

```css
/* Features/Shared/Styles/app.css */
@import "tailwindcss";

@theme {
    --color-primaria: #<hex>;
    --font-sans: "<Fonte>", sans-serif;
}
```

Os **design tokens ficam no bloco `@theme`** — é ele que cumpre o papel dos antigos arquivos de
tokens. Cores, tipografia e espaçamentos são declarados uma vez e consumidos como classes
utilitárias. Não declarar valores paralelos fora do tema.

#### Integração com o Razor

Em desenvolvimento, o Razor aponta para o dev server (HMR); em produção, resolve o `manifest.json`
gerado pelo Vite, obtendo o arquivo com hash de conteúdo. Encapsule isso em um **TagHelper**, para
que nenhuma view precise conhecer o mecanismo:

```html
<vite-asset src="Features/<Feature>/Scripts/<feature>.ts"></vite-asset>
```

#### Scripts npm

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "typecheck": "tsc --noEmit"
  }
}
```

A **checagem de tipos permanece separada da emissão** — o esbuild (dentro do Vite) transpila sem
verificar tipos, então `tsc --noEmit` roda antes do `vite build` e é o que efetivamente falha o
build diante de erro de tipo.

O `.csproj` Web amarra `npm install` e `npm run build` a targets `BeforeBuild`, de modo que
`dotnet build` continue produzindo os assets sem passo manual.

#### Regras de UI

- **Nada de `style=""` em Razor** — estilizar por classes utilitárias do Tailwind.
- Usar os tokens declarados em `@theme`; não introduzir cores ou tamanhos avulsos no markup
  (`text-[#ff0000]` e afins são exceção justificada, não regra).
- Padrões repetidos viram **componente Razor (partial/view component)**, não `@apply` — a duplicação
  de classes utilitárias em um componente único é aceitável; espalhada por dez views, não.
- URLs são geradas no Razor e passadas ao TypeScript por atributos `data-*`.
- Mudanças visuais exigem validação desktop e mobile, sem overflow horizontal.

---

## 7. Dependências essenciais

O princípio é **mínimo viável, sempre atualizado**: cada dependência abaixo cumpre um papel que não
vale reimplementar. Nada além disso entra sem justificativa — biblioteca a mais é superfície de
ataque, atrito de atualização e acoplamento a mais.

### 7.1 TypeScript e front-end

Use a **versão estável mais recente do TypeScript**, e mantenha-a atualizada — versões novas trazem
inferência melhor e regras de checagem que capturam erros antes do runtime. Fixe a versão exata (sem
`^`) para que o build seja reprodutível, e atualize deliberadamente.

```json
{
  "devDependencies": {
    "typescript": "<versao-estavel-mais-recente>",
    "vite": "<versao-estavel-mais-recente>",
    "tailwindcss": "<versao-estavel-mais-recente>",
    "@tailwindcss/vite": "<versao-estavel-mais-recente>",
    "@types/node": "<versao-estavel-mais-recente>"
  }
}
```

| Pacote | Papel | Por que é essencial |
|---|---|---|
| `typescript` | Checagem de tipos | Contrato do front-end; `tsc --noEmit` é o portão do build |
| `vite` | Compilador e dev server | Build rápido, HMR, tree-shaking e hashing sem configuração |
| `tailwindcss` | Framework de estilo | Utilitário, sem CSS morto e sem design system imposto |
| `@tailwindcss/vite` | Plugin oficial | Integra Tailwind ao Vite sem passo PostCSS |
| `@types/node` | Tipos de Node | Necessário para tipar `vite.config.ts` |

**Deliberadamente ausentes:** UIkit, Bootstrap e afins (ver 6.4); jQuery — o DOM moderno cobre o
caso de uso; Webpack, Gulp e PostCSS avulso — substituídos pelo Vite; framework SPA (React, Vue,
Angular) — a apresentação é Razor renderizado no servidor, e TypeScript entra para
**comportamento pontual**, não para reconstruir a camada de view.

`tsconfig.json` estrito é obrigatório: `strict`, `noImplicitAny`, `noUnusedLocals`,
`noUnusedParameters`, `forceConsistentCasingInFileNames`.

### 7.2 .NET por camada

Dependências mínimas de cada projeto — a lista reforça a regra de dependência da seção 3:

| Camada | Pacote | Papel |
|---|---|---|
| **Core** | `Microsoft.Extensions.Options` | Vincular classes de `Settings` |
| **Core** | `Microsoft.Extensions.Logging.Abstractions` | `ILogger<T>` sem acoplar a um provider |
| **Data** | `Microsoft.EntityFrameworkCore` | ORM |
| **Data** | `Npgsql.EntityFrameworkCore.PostgreSQL` | Provider do banco |
| **Data** | `Microsoft.EntityFrameworkCore.Design` (`PrivateAssets=all`) | Tooling de migration; não vai para runtime |
| **Data** | `Microsoft.Extensions.Options.ConfigurationExtensions` | Binding de seções de configuração |
| **Web** | `Microsoft.ApplicationInsights.AspNetCore` | Telemetria (seção 9) |
| **Web** | `DotNetEnv` | Carregar `.env` em desenvolvimento |
| **Testes** | `Microsoft.NET.Test.Sdk`, `xunit.v3`, `xunit.runner.visualstudio` | Execução |
| **Testes** | `Moq`, `FluentAssertions` | Dublês e asserções |
| **Testes (Web)** | `HtmlAgilityPack` | Asserção sobre HTML renderizado |

`Core` **não** recebe pacote de EF, HTTP ou serialização — se um deles parecer necessário ali, o
desenho está errado.

### 7.3 Política de versões

- **Fixe versões exatas** em `package.json` e `.csproj`; atualizações são deliberadas, nunca
  implícitas.
- Mantenha o **runtime .NET e o TypeScript nas versões estáveis mais recentes**, revisando a cada
  release. Ficar para trás transforma atualização em migração.
- Diante de vulnerabilidade em pacote transitivo, **fixe a versão corrigida com comentário
  explicando o motivo** (ver seção 12).
- Toda nova dependência precisa de justificativa: qual problema resolve e por que não vale
  implementar. Na dúvida, não adicione.

---

## 8. Composição da raiz (`Program.cs`)

Ordem de inicialização:

1. **Carregar variáveis de ambiente** — sobe a árvore de diretórios procurando um `.env`.
2. **Observabilidade** — Application Insights registrado cedo, para capturar falhas do próprio
   startup (ver seção 9).
3. **Extensão de DI da camada Data** — registra `DbContext`s, repositórios, serviços de domínio e
   integrações externas em uma única chamada.
4. **Serviços exclusivos da apresentação**.
5. **Autenticação e autorização**.
6. **MVC + expander de views por feature**.
7. **Migrations** — apenas dos contextos dos quais o projeto é dono.
8. **Middleware**: exception handler + HSTS (fora de Development), HTTPS redirect, static files,
   routing, authentication, authorization, endpoints.

Todo o registro de dependências de domínio e persistência fica concentrado na extensão de DI — o
`Program.cs` **não conhece implementações concretas** de repositório ou serviço de domínio.

### Configuração

- Chaves de configuração e variáveis de ambiente em **inglês**, com `__` separando níveis.
- Um `.env.example` versionado serve como contrato; o `.env` real fica fora do controle de versão.
- Cada seção mapeia para uma classe em `Core/Settings`, vinculada por `IOptions`.
- Segredos nunca são commitados nem lidos diretamente por `IConfiguration` no domínio.

---

## 9. Observabilidade — Azure Application Insights

Todo projeto que segue este esqueleto **deve** enviar logging, métricas e rastreamento para o
**Azure Application Insights**. Não é opcional: sem telemetria centralizada não há diagnóstico de
produção, e `Console.WriteLine` ou log em arquivo não sobrevivem a um App Service reiniciado ou
escalado horizontalmente.

### 9.1 Pacote e registro

Registre o Application Insights **cedo** no `Program.cs` — antes das demais dependências — para que
exceções do próprio startup (falha de conexão, configuração ausente) cheguem à telemetria:

```xml
<PackageReference Include="Microsoft.ApplicationInsights.AspNetCore" Version="<versao>" />
```

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplicationInsightsTelemetry(options =>
{
    options.ConnectionString = builder.Configuration["ApplicationInsights:ConnectionString"];
});

builder.Services.ConfigureTelemetryModule<DependencyTrackingTelemetryModule>(
    (module, _) => module.EnableSqlCommandTextInstrumentation = false);
```

Use sempre **`ConnectionString`**, nunca `InstrumentationKey` — a chave de instrumentação está
descontinuada e não suporta os endpoints regionais.

`EnableSqlCommandTextInstrumentation` fica **desligado**: o texto do comando SQL pode conter dados
pessoais e não deve sair da aplicação.

### 9.2 Configuração

A conexão segue as mesmas regras da seção 8 — chave em inglês, `__` separando níveis:

```bash
# .env.example
# Connection string do recurso Application Insights do ambiente.
# Em Azure App Service, prefira injetar via App Settings do próprio serviço.
ApplicationInsights__ConnectionString=InstrumentationKey=<guid>;IngestionEndpoint=https://<regiao>.in.applicationinsights.azure.com/
```

```json
// appsettings.json — níveis mínimos por provider
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.EntityFrameworkCore.Database.Command": "Warning"
    },
    "ApplicationInsights": {
      "LogLevel": {
        "Default": "Information"
      }
    }
  }
}
```

Quando a connection string está **vazia**, o SDK simplesmente não envia telemetria — o mesmo
princípio de fallback da seção 5.3. O projeto roda localmente sem recurso Azure provisionado, e os
logs continuam visíveis no console. **Nunca** falhe o startup por ausência de Application Insights.

Cada ambiente (produção, homologação, desenvolvimento) usa um **recurso próprio** — telemetria de
homologação não pode poluir os alertas de produção.

### 9.3 Como logar

Use **`ILogger<T>` injetado**, nunca a API do SDK diretamente. Isso mantém o domínio livre de
dependência de infraestrutura de telemetria — `Core` depende apenas de
`Microsoft.Extensions.Logging.Abstractions`, e o destino é decidido na composição.

```csharp
public class <Entidade>Service(
    I<Entidade>Repository repository,
    ILogger<<Entidade>Service> logger) : I<Entidade>Service
{
    public async Task SalvarAsync(Salvar<Entidade>Dto dto, CancellationToken cancellationToken)
    {
        logger.LogInformation(
            "Salvando <entidade> {Codigo} no contexto {IdContexto}.",
            dto.Codigo,
            dto.IdContexto);
    }
}
```

Regras:

- **Sempre logging estruturado** — placeholders nomeados (`{Codigo}`), nunca interpolação de string.
  A interpolação destrói a possibilidade de consultar por dimensão no Kusto.
- **Nunca logar segredo ou dado pessoal** — senha, token, código de acesso, chave de API, documento,
  cartão. Em Development, um código de uso único pode ir ao log; em produção, jamais.
- **Não logar e relançar a mesma exceção.** Registre no ponto onde ela é tratada, uma única vez.
- Exceções não tratadas já são capturadas automaticamente pelo SDK — não duplique com `try/catch`
  que apenas loga.

### 9.4 Níveis

| Nível | Uso |
|---|---|
| `Critical` | Aplicação inutilizável; exige ação imediata |
| `Error` | Operação falhou e o usuário foi afetado; exceções não previstas |
| `Warning` | Situação recuperável ou degradada — fallback acionado, integração indisponível |
| `Information` | Marcos de negócio: entidade criada, integração sincronizada, login efetuado |
| `Debug` / `Trace` | Somente Development; nunca habilitados em produção |

### 9.5 Enriquecimento de telemetria

Para correlacionar telemetria ao usuário e à operação, registre um `ITelemetryInitializer` na camada
Web — é o lugar certo, pois depende de `HttpContext`:

```csharp
public class UsuarioTelemetryInitializer(IHttpContextAccessor httpContextAccessor) : ITelemetryInitializer
{
    public void Initialize(ITelemetry telemetry)
    {
        var usuario = httpContextAccessor.HttpContext?.User;

        if (usuario?.Identity?.IsAuthenticated != true)
            return;

        telemetry.Context.User.AuthenticatedUserId = usuario.ObterIdentificador();
    }
}
```

```csharp
builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<ITelemetryInitializer, UsuarioTelemetryInitializer>();
```

Use um **identificador opaco** (id do usuário), nunca e-mail, CPF ou nome — o Application Insights
não é um repositório de dados pessoais.

### 9.6 O que se obtém automaticamente

Registrado o SDK, passam a ser coletados sem código adicional:

- Requisições HTTP (rota, status, duração) e exceções não tratadas.
- Dependências: chamadas ao banco, HTTP de saída, integrações externas.
- Contadores de performance e disponibilidade.
- **Correlação distribuída** — um `operation_Id` amarra requisição, consultas ao banco e chamadas
  externas em uma única linha do tempo.

### 9.7 Amostragem e custo

Application Insights é cobrado por volume ingerido. Em produção, mantenha a **amostragem adaptativa**
(padrão do SDK) e ajuste o teto conforme o tráfego:

```csharp
builder.Services.AddApplicationInsightsTelemetry(options =>
{
    options.ConnectionString = builder.Configuration["ApplicationInsights:ConnectionString"];
    options.EnableAdaptiveSampling = true;
});
```

A amostragem preserva a correlação: se uma requisição é amostrada, suas dependências e exceções
acompanham. Desligue-a apenas em investigações pontuais, e configure **alertas** sobre taxa de
erro e latência — telemetria que ninguém observa não é observabilidade.

---

## 10. Fluxo de uma requisição

Exemplo de escrita atravessando as três camadas:

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

Invariantes do fluxo:

- O Controller **nunca** toca o `DbContext`.
- A decisão de negócio vive no **agregado**, exposta como propriedade de regra; o serviço apenas a
  consulta e reage.
- Integração externa entra por **interface declarada em `Core`** e implementada em `Data`.
- Uma única persistência por operação, no final do serviço.

---

## 11. Testes

```text
src/<Produto>.<Modulo>/Tests/     espelha os caminhos de Core e Data
├── Arquitetura/                  nomes de assembly e regras estruturais
└── Core/
    ├── Models/Aggregates/…       invariantes dos agregados
    └── Services/                 orquestração, com repositórios e integrações mockados

src/<Produto>.<Modulo>.Web/Tests/ testes da apresentação
└── Arquitetura/
```

Convenções:

- xUnit v3 + Moq + FluentAssertions. `TreatWarningsAsErrors` vem do `Directory.Build.props` da raiz
  e vale para todos os projetos, inclusive os de teste — ver 12.2.
- O projeto Web exclui `Tests\**` do próprio csproj (`DefaultItemExcludes`) para não compilar os
  testes dentro da aplicação.
- Nomenclatura `Metodo_QuandoCondicao_DeveResultado`.
- A estrutura de pastas dos testes **espelha** a do código testado.
- Testes de agregado validam invariantes comparando com as **constantes de mensagem** públicas.

---

## 12. Build, CI e deploy

### 12.1 Validação local

Ordem obrigatória antes de entregar: **typecheck → build → test**. Em PowerShell:

```powershell
Set-Location src/<Produto>.<Modulo>.Web
npm run typecheck
Set-Location ../..
dotnet build <Produto>.slnx -c Release
dotnet test <Produto>.slnx -c Release --no-build
```

Em bash ou zsh (macOS e Linux), onde `Set-Location` não existe:

```bash
npm --prefix src/<Produto>.<Modulo>.Web run typecheck
dotnet build <Produto>.slnx -c Release
dotnet test <Produto>.slnx -c Release --no-build
```

Build e testes devem terminar **sem erros e sem avisos**. Se algo falhar, reporte a saída real —
nunca declare sucesso sem executar.

### 12.2 O que torna "sem avisos" verificável

Duas peças na **raiz** do repositório sustentam a regra; nenhuma das duas é opcional e nenhuma deve
ser removida do projeto derivado.

| Arquivo | Papel |
|---|---|
| `Directory.Build.props` | Herdado por **todo** projeto da solução: `TreatWarningsAsErrors`, `Nullable`, `LangVersion=latest`, `EnforceCodeStyleInBuild`, `AnalysisLevel=latest-recommended`, `GenerateDocumentationFile` |
| `.editorconfig` | Traduz as convenções do `AGENTS.md` em regra de analisador — `CA1068` (`CancellationToken` por último) é `error` |

`TreatWarningsAsErrors` vale para **todos** os projetos, não apenas os de teste — o código que vai
para produção é justamente o que não pode acumular aviso. `EnforceCodeStyleInBuild` faz o
`.editorconfig` valer no build, e não só na IDE de quem tem o plugin instalado: convenção que só a
IDE cobra é recomendação, não norma.

`CS1591` está em `NoWarn` porque a convenção do repositório é `<summary>` em tipos e operações
públicas, não em cada propriedade. Suprimir qualquer outro diagnóstico exige justificativa escrita no
próprio arquivo.

### 12.3 Pipeline de referência — Azure Pipelines

Os projetos derivados rodam em **Azure DevOps**. Este repositório não versiona um
`azure-pipelines.yml` executável porque não tem código .NET — o YAML abaixo é a **referência a
copiar** para a raiz do projeto derivado.

| Stage | O que faz | Depende de |
|---|---|---|
| `Build` | SDK → restore → auditoria de dependências → `npm ci` + typecheck + build de assets → publish do Web → artefato | — |
| `Test` | `dotnet test` da solution em Release, com publicação de resultados | `Build` |
| `Deploy` | Publica no ambiente conforme a branch de origem | **`Test`** |

**Ponto de atenção:** faça o stage `Deploy` depender de **`Test`**, não apenas de `Build` — caso
contrário uma falha de teste não bloqueia o deploy, e o pipeline fica verde onde importa.

```yaml
trigger:
  branches:
    include:
      - main
      - staging
      - homolog

variables:
  solution: <Produto>.slnx
  projetoWeb: src/<Produto>.<Modulo>.Web
  buildConfiguration: Release

stages:
  - stage: Build
    displayName: Build
    jobs:
      - job: Compilar
        pool:
          vmImage: ubuntu-latest
        steps:
          - task: UseDotNet@2
            displayName: Instalar SDK .NET 10
            inputs:
              packageType: sdk
              version: 10.0.x

          - task: NodeTool@0
            displayName: Instalar Node
            inputs:
              versionSpec: 22.x

          - script: dotnet restore $(solution)
            displayName: Restore

          - script: |
              dotnet list $(solution) package --vulnerable --include-transitive 2>&1 | tee auditoria.txt
              if grep -q "has the following vulnerable packages" auditoria.txt; then
                echo "Dependência vulnerável encontrada"
                exit 1
              fi
            displayName: Auditoria de dependências .NET

          - script: npm ci
            workingDirectory: $(projetoWeb)
            displayName: npm ci

          - script: npm audit --audit-level=high
            workingDirectory: $(projetoWeb)
            displayName: Auditoria de dependências npm

          - script: npm run typecheck
            workingDirectory: $(projetoWeb)
            displayName: Typecheck

          - script: npm run build
            workingDirectory: $(projetoWeb)
            displayName: Build de assets

          - script: dotnet build $(solution) -c $(buildConfiguration) --no-restore
            displayName: Build da solution

          - script: >-
              dotnet publish $(projetoWeb) -c $(buildConfiguration) --no-build
              -o $(Build.ArtifactStagingDirectory)/web
            displayName: Publish do Web

          - publish: $(Build.ArtifactStagingDirectory)/web
            artifact: web

  - stage: Test
    displayName: Test
    dependsOn: Build
    jobs:
      - job: Testar
        pool:
          vmImage: ubuntu-latest
        steps:
          - task: UseDotNet@2
            displayName: Instalar SDK .NET 10
            inputs:
              packageType: sdk
              version: 10.0.x

          - script: dotnet restore $(solution)
            displayName: Restore

          - script: >-
              dotnet test $(solution) -c $(buildConfiguration)
              --logger trx --results-directory $(Agent.TempDirectory)/testes
            displayName: Testes

          - task: PublishTestResults@2
            displayName: Publicar resultados
            condition: succeededOrFailed()
            inputs:
              testResultsFormat: VSTest
              testResultsFiles: '**/*.trx'
              searchFolder: $(Agent.TempDirectory)/testes
              failTaskOnFailedTests: true

  - stage: Deploy
    displayName: Deploy
    dependsOn: Test
    condition: and(succeeded(), in(variables['Build.SourceBranch'], 'refs/heads/main', 'refs/heads/staging', 'refs/heads/homolog'))
    jobs:
      - deployment: Publicar
        pool:
          vmImage: ubuntu-latest
        environment: <ambiente-conforme-a-branch>
        strategy:
          runOnce:
            deploy:
              steps:
                - download: current
                  artifact: web
                - task: AzureWebApp@1
                  displayName: Publicar no App Service
                  inputs:
                    azureSubscription: <service-connection>
                    appName: <nome-do-app-service>
                    package: $(Pipeline.Workspace)/web
```

Notas normativas sobre o YAML:

- A auditoria de dependência **falha o build**; aviso que não quebra o build é aviso que ninguém lê.
  Detalhe e tratamento de exceção datada em
  [`dependencias-vulneraveis`](../skills/dependencias-vulneraveis/SKILL.md).
- `npm ci`, nunca `npm install`, na esteira: `ci` respeita o lockfile e falha se ele divergir do
  `package.json`.
- `dotnet build` sem `--no-restore` refaria o restore e mascararia divergência de pacote.
- O artefato publicado por `Build` é o **mesmo binário** promovido entre ambientes. O que varia por
  ambiente é configuração, não build.

**Segurança de dependências:** quando um pacote transitivo tiver vulnerabilidade conhecida, adicione
um `PackageReference` fixando a versão corrigida e **comente o motivo** no `.csproj`:

```xml
<!-- Pin transitivo: <PacoteOrigem> puxa <PacoteVulneravel> <versao> vulnerável
     (<identificador do aviso>). Fixa a versão corrigida. -->
<PackageReference Include="<PacoteVulneravel>" Version="<versao-corrigida>" />
```

---

## 13. Convenções de código

### 13.1 Princípios

Clean Code, SOLID e KISS, **sem abstrações prematuras**.

- **Nomes revelam intenção.** Evitar `x`, `temp`, `data`, `item`, `obj`, `val`, `res`, `ret` e
  abreviações obscuras.
- **Métodos pequenos, responsabilidade única.** Acima de ~20 linhas ou fazendo operações distintas,
  extrair em métodos menores com nomes descritivos.
- **Sem números mágicos.** Extrair para constantes, enums ou variáveis nomeadas.
- **Early return e cláusulas de guarda** em vez de `if` aninhados.
- **DRY quando a duplicação é real** (mesma intenção), não apenas sintática. Três linhas duplicadas
  são melhores que uma abstração prematura.
- **Depender de abstrações** (DIP): nada de `new` em dependência dentro de classe de alto nível.
- **Open/Closed:** ao adicionar comportamento, preferir extensão a inchar `switch`/`if` existentes.
- **LINQ legível:** query difícil de ler é quebrada em etapas com variáveis intermediárias nomeadas.
- **Não criar** helper, util ou wrapper para algo usado uma única vez.

### 13.2 Regras gerais

- **Sem comentários no código**, exceto `<summary>` XML em tipos e operações públicas — usados para
  registrar decisões não óbvias (papel de um contexto, motivo de um fallback). O código se explica
  por nomenclatura.
- **Sem códigos de rastreamento de requisito no runtime** (`RN-<MÓDULO>-<N>` e similares) em
  mensagens, constantes, views, TypeScript ou asserts. São artefatos da documentação e criam
  acoplamento frágil. A mensagem descreve **o quê** e **por quê** em linguagem de domínio; o teste
  asserta pela constante de mensagem exposta pelo agregado. Não confundir com dados reais de domínio
  (nº de contrato, norma externa, código de centro de custo), que devem ser preservados.
- **Instanciar via construtor**, nunca object initializer. Se a classe não tem construtor com
  parâmetros, criar um.
- **`CancellationToken` sempre como último parâmetro.**
- **Métodos com 3+ parâmetros relacionados recebem um DTO.**
- **Propriedades somente leitura** em classes novas, inicializadas por construtor. Exceções: classe
  preexistente com `set` público (não quebrar outros fluxos) e DTO de model binding.
  Preferir construtor primário quando o construtor apenas atribui.
- **Sufixo `Dto`** em todo objeto de transporte, no nome da classe e do arquivo.
- **Enums persistidos convertidos para string.**
- **Validar nulidade antes de repassar** um valor a outra função; se nulo, tratar com mensagem
  compreensível ao usuário.
- **Pipe `|` como separador em strings**, nunca traço `-`. Exceções: contexto preexistente e títulos
  de UI.
- **`Url.Action` sem string hardcoded** — usar `nameof` para controller e action.
- **Sem URL hardcoded no TypeScript.** Rotas são geradas no Razor e passadas por `data-*`.

### 13.3 Specifications — uma por filtro

Não criar spec "guarda-chuva" que recebe vários filtros opcionais e faz `null check` dentro da
expressão: o EF traduz o `OR NULL` literalmente e gera SQL pior, além de misturar responsabilidades.
Criar **uma spec por filtro** e compor no serviço apenas quando o filtro tem valor:

```csharp
Specification<<Entidade>> spec = new <Entidade>Por<Chave>Spec(<chave>);

if (filtro.<Colecao>?.Count > 0)
    spec = spec.And(new <Entidade>Por<Colecao>Spec(filtro.<Colecao>));
```

Ganhos: SQL enxuto, responsabilidade única por spec, reuso entre fluxos e testabilidade individual.

### 13.4 Formatação

- Linhas de **~120 caracteres**; acima disso, quebrar.
- **Um parâmetro por linha** quando a assinatura excede o limite.
- **Chamadas encadeadas** — cada `.Metodo()` em sua própria linha, indentado um nível.
- **Condições compostas** com o operador no início da nova linha.
- **Trailing comma** em enums e em objetos/destructuring de TypeScript.
- **Sem linha em branco entre propriedades** de uma mesma classe; linha em branco separa
  propriedades de construtores e métodos.
- **Sem linha em branco entre membros de enum**, mesmo com atributos.
- **Linha em branco após o `namespace`** file-scoped e entre blocos de controle consecutivos
  (exceto guard clauses curtas e consecutivas).
- **Não alinhar atribuições por colunas** — polui diffs.
- **Sem trailing whitespace**; indentação consistente com o arquivo.
- **Construtores e métodos vazios em linha única:** `protected <Entidade>() {}`.
- **Newline no final de todo arquivo.**
- **`nameof` nas configurações de EF** para nomes de tabela e coluna.

### 13.5 Idioma

| Elemento | Idioma |
|---|---|
| Identificadores de domínio, pastas de feature, controllers, actions, ViewModels, DTOs | Idioma do negócio |
| Chaves de configuração e variáveis de ambiente | Inglês |
| Rotas HTTP (contrato externo) | Inglês, kebab-case |
| Documentação, comentários `<summary>` e textos de interface | Idioma do negócio |

---

## 14. Fronteiras e restrições

- **Escopo do módulo.** Cada repositório tem uma fronteira funcional explícita; funcionalidades fora
  dela pertencem a outro repositório.
- **Sem acoplamento binário entre sistemas.** Não referenciar assemblies internos de outro
  repositório. Por isso o projeto mantém a própria `AggregateRoot`, as próprias `Specification` e os
  próprios enums, mesmo que pareçam duplicados.
- **Propriedade de dados.** Cada sistema é dono do seu schema. Dados de outro sistema entram por
  contrato explícito, sem replicar a fonte de verdade e sem dependência entre bancos.
- **Migrations apenas sobre o que se é dono.** Nada de `EnsureCreated` ou migration sobre schema
  externo.
- **Pastas nascem com o primeiro artefato real** — nenhuma pasta vazia criada antecipadamente.
- **Documentação acompanha o código.** Se uma mudança altera convenção, responsabilidade ou
  estrutura, a documentação é atualizada na mesma entrega.

---

## 15. Checklist para um projeto novo

1. Criar a solution e os cinco projetos com as referências da seção 3.
2. Adicionar `AggregateRoot<TId>`, `ISpecification<T>`, `Specification<T>` em `Core/Common`.
3. Adicionar `SpecificationEvaluator` em `Data/Repositories`.
4. Definir `SchemaConsts` documentando o papel de cada schema.
5. Criar a extensão de DI em `Data/Extensions` como ponto único de registro.
6. Configurar `FeatureViewLocationExpander`, `_ViewImports.cshtml` e `_ViewStart.cshtml`.
7. Configurar `vite.config.ts`, `tsconfig.json` estrito e as dependências da seção 7, amarrando
   `npm install` e `npm run build` aos targets do `.csproj`.
8. Criar `Features/Shared/Styles/app.css` com `@import "tailwindcss"` e o bloco `@theme` de tokens,
   além do layout, antes da primeira feature de negócio.
9. Implementar o TagHelper de resolução de assets do Vite (dev server vs. manifest).
10. Registrar o Application Insights e definir os níveis de log por provider (seção 9).
11. Criar `.env.example` como contrato de configuração.
12. Escrever os testes de arquitetura que travam os nomes de assembly.
13. Configurar a pipeline com `Deploy` dependendo de `Test`.
14. Registrar as regras de contribuição em um `AGENTS.md` na raiz.

---

## 16. Responsabilidades por artefato

Referência normativa de **quem faz o quê**. A maior parte dos defeitos de arquitetura vem de um
artefato assumindo responsabilidade alheia — regra de negócio no Controller, formatação no agregado,
orquestração no repositório.

**Fluxo canônico:**

```text
Requisição → Controller → Service → Repository → Agregado
Resposta   ← View       ← ViewModel ← DTO      ← Agregado
```

### 16.1 Agregado

Conjunto de objetos de domínio tratado como **unidade de consistência**, com uma raiz por onde tudo
passa. Responsabilidade única: **proteger invariantes e manter o próprio estado válido**,
independentemente de quem o utilize. Responde "**como isso funciona?**".

**Deve:**

- Impedir qualquer estado inválido, em toda operação pública.
- Expor métodos de comportamento (`Aprovar()`, `Cancelar()`, `Adicionar<Filha>()`) como **único**
  caminho de alteração de estado.
- Aplicar as regras de negócio: quando uma transição é permitida, como calcular, como validar.
- Garantir consistência interna das entidades filhas após cada operação (ex.: recalcular totais).
- Encapsular coleções: campo privado exposto como `IReadOnlyCollection<T>`.
- Expor decisões de regra como **propriedade calculada** (ex.: `Eh<Condicao>`), para o serviço
  consultar sem reimplementar a regra.
- Concentrar comportamento — se só tem `get/set`, não é agregado, é DTO disfarçado.
- Manter-se pequeno: se uma operação exige carregar dezenas de entidades associadas, está grande
  demais.

**Não deve:**

- Acessar banco ou chamar repositório.
- Chamar API externa ou serviço de infraestrutura (e-mail, cache, storage, fila).
- Depender de framework: `DbContext`, `HttpClient`, `ILogger`, `IHttpContextAccessor`.
- Converter-se em DTO ou conhecer contratos de transporte.
- Expor propriedade com `set` público ou coleção mutável.
- Alterar diretamente outro agregado — a coordenação entre agregados é do serviço.

```csharp
public void <Acao>()
{
    if (!_<filhas>.Any())
        throw new DomainException(Msg<Entidade>Sem<Filhas>);

    if (Status == <Entidade>Status.Cancelado)
        throw new DomainException(Msg<Entidade>Cancelado);

    Status = <Entidade>Status.<Novo>;
}
```

### 16.2 Service (serviço de domínio / aplicação)

Camada que **orquestra casos de uso**. Responde "**o que deve acontecer?**", nunca "como acontece".

**Deve:**

- Orquestrar o caso de uso: carregar agregado → invocar método de domínio → persistir.
- Controlar a transação, persistindo **uma única vez** ao final.
- Coordenar múltiplos agregados, já que nenhum agregado modifica outro.
- Integrar com infraestrutura (e-mail, storage, fila) sempre por **abstração injetada**.
- Autorizar a execução do caso de uso.
- Converter DTO ↔ domínio na entrada e na saída.
- Aplicar políticas operacionais da aplicação (feature flags), que não são regra de negócio.
- Manter métodos curtos e legíveis de cima para baixo: muito fluxo, poucos `if`.

**Não deve:**

- Conter regra de negócio, cálculo de domínio ou validação de invariante — isso é do agregado.
- Alterar estado interno de entidade diretamente (`entidade.Status = ...`).
- Conhecer o ORM: `.Include`, `ChangeTracker`, `EntityState` ou SQL embutido.
- Instanciar infraestrutura manualmente (`new HttpClient()`).
- Acumular dependências até o construtor virar lista telefônica — divida em serviços por caso de uso.

### 16.3 Repository

Abstração da persistência dos agregados, funcionando como **coleção de agregados**. Responde "onde
está? como recuperar? como persistir?" sem que a aplicação conheça banco, ORM ou SQL.

**Deve:**

- Buscar, adicionar, remover agregados e salvar alterações.
- Encapsular totalmente o mecanismo de armazenamento — para o serviço é indiferente se é SQL, NoSQL
  ou API externa.
- Executar Specifications: a spec define os critérios, o repositório apenas aplica.
- Carregar os `Include` necessários ao agregado completo.
- Retornar **sempre agregados/entidades de domínio**, nunca DTOs.
- Ser consumido apenas através do contrato `I<Entidade>Repository`.

**Não deve:**

- Conter regra de negócio, validação ou qualquer decisão de domínio.
- Orquestrar caso de uso (criar + notificar + auditar) — isso é do serviço.
- Registrar auditoria, enviar e-mail ou chamar integração externa.
- Retornar DTO, relatório ou read model — isso pertence a um Query Service.
- Vazar `DbContext`, `DbSet` ou tipos do ORM para a camada de serviço.

### 16.4 DTO / Record

Objeto de **transporte de dados entre camadas**. Responde "**quais dados trafegam?**" — nunca
representa um conceito de domínio.

**Deve:**

- Apenas transportar dados de entrada e saída, definindo o contrato da operação.
- Ter tipos distintos para entrada (`Salvar<Entidade>Dto`) e saída (`<Entidade>ResumoDto`).
- Usar `record` quando for imutável, só dados e sem identidade própria.
- Ser convertido para o domínio **fora dele** — no serviço, via construtor ou factory do agregado.
- Usar sufixo `Dto` na classe e no arquivo.

**Não deve:**

- Conter regra de negócio ou validação de domínio.
- Expor comportamento de domínio (`Aprovar()`) ou controlar invariantes.
- Acessar banco ou realizar integração externa.
- Depender de repositório ou serviço.
- Ser usado como entidade — nem a entidade exposta diretamente como contrato de saída.

> Nem todo `record` é DTO: records também modelam Commands, Queries, Value Objects e eventos de
> domínio, que são conceitos distintos.

### 16.5 Controller

**Porta de entrada** da aplicação: recebe a requisição, valida aspectos técnicos, delega e traduz o
resultado em resposta HTTP. Responde "quem chamou, o que foi enviado, qual resposta devolver".

**Deve:**

- Extrair dados de rota, query, body, headers e usuário autenticado.
- Validar apenas **aspectos técnicos** (model binding), retornando erro de requisição malformada.
- Delegar toda execução ao serviço da camada de aplicação.
- Traduzir o resultado em resposta HTTP (sucesso, erro, não encontrado, redirect).
- Definir o contrato externo: rotas, verbos, status codes, DTOs.
- Propagar o `CancellationToken` recebido.
- Permanecer fino — idealmente uma chamada de serviço e um retorno.

**Não deve:**

- Conter regra de negócio ou decisão de domínio.
- Acessar `DbContext`, repositório ou SQL.
- Manipular agregado diretamente, nem construí-lo a partir do DTO.
- Executar auditoria, e-mail, notificação ou integração externa.
- Encadear múltiplos passos de negócio — se faz isso, o comportamento pertence ao serviço.

### 16.6 ViewModel

Modelo criado para **uma tela específica** — exatamente os dados que aquela interface precisa.
Responde "**como a tela precisa enxergar esses dados?**".

**Deve:**

- Conter apenas o que aquela tela exibe.
- Trazer dados **já formatados** para apresentação (datas, valores, documentos, telefones).
- Consolidar informações de múltiplas fontes em um único modelo de tela.
- Expor campos de renderização prontos (classe CSS, cor, ícone, texto de estado).
- Expor decisões visuais como booleanos já resolvidos (`ExibirBotao<Acao>`, `PodeAprovar`).
- Ser específica por caso de uso — uma para listagem, outra para detalhe, outra para formulário.
- Permanecer na camada Web; o domínio nunca depende dela.

**Não deve:**

- Conter regra de negócio ou método de decisão de domínio.
- Depender de serviço, repositório ou contexto de dados.
- Executar integração externa ou chamada de rede.
- Expor método de persistência.
- Virar modelo único de 80 propriedades reutilizado por todas as telas.
- Ser confundida com DTO (transporte entre camadas) ou com entidade (comportamento de domínio).

### 16.7 View

Transforma uma ViewModel em **marcação**. Responde "**como apresentar esses dados?**".

**Deve:**

- Receber dados prontos e apenas renderizá-los.
- Ser burra: predominantemente marcação, com o mínimo de lógica.
- Usar condicional apenas para controle visual simples, sobre flags **já resolvidas** na ViewModel.
- Aplicar classes e estados fornecidos pela ViewModel, em vez de calculá-los.
- Extrair para partial ou componente qualquer trecho repetido entre telas.
- Iterar sobre coleções que já chegam filtradas e ordenadas.

**Não deve:**

- Reproduzir regra de negócio em condicional composta.
- Injetar repositório, serviço, contexto de dados ou cliente HTTP.
- Chamar API, criar entidade, alterar estado ou persistir.
- Derivar classes/estados por cadeias de `if/else` — isso pertence à ViewModel.
- Filtrar, ordenar ou consultar coleções dentro da marcação.
- Declarar helpers extensos no arquivo — mover para ViewModel, TagHelper ou partial.

---

## 17. Design system e tipografia

As regras abaixo independem de ferramenta. Com Tailwind, os tokens são declarados uma única vez no
bloco `@theme` (seção 6.4) e consumidos como classes utilitárias.

### 17.1 Escala tipográfica

| Token | Tamanho | Peso | Tracking | Uso |
|---|---|---|---|---|
| `display-xl` | 56px | 700 | -0.025em | Hero de landing, lado de marca |
| `display-lg` | 44px | 700 | -0.025em | Headline de tela cheia |
| `display-md` | 34px | 700 | -0.025em | Wordmark, número de KPI gigante |
| `h1` | 26–28px | 700 | -0.02em | Título de página ou card principal |
| `h2` | 22–24px | 700 | -0.02em | Seção da página, KPI grande |
| `h3` | 18px | 600 | -0.01em | Subseção, título de card |
| `h4` | 16px | 600 | 0 | Bloco de formulário, item destacado |
| `body-lg` | 16px | 400 | 0 | Subtítulo de hero, parágrafo de apresentação |
| `body` | 14px | 400 | 0 | Texto padrão: inputs, parágrafos, células |
| `body-sm` | 13px | 400–500 | 0 | Label de formulário, link e botão secundário |
| `caption` | 12px | 500 | 0 | Rodapé, texto de ajuda, metadado |
| `micro` | 11px | 600 | 0.08em | Eyebrow, label de indicador, tag — **sempre uppercase** |
| `nano` | 10–11px | 600 | 0.32em | Tagline, divisor tipográfico — **sempre uppercase** |

### 17.2 Princípios de tipografia

- Toda declaração de tamanho, peso ou tracking **escolhe um token da escala**. Valor arbitrário fora
  da tabela é proibido; um caso real que não caiba exige **alterar a escala antes de codar a
  exceção**.
- Pesos seguem a escala: 700 em display e headings altos, 600 em `h3`/`h4`/`micro`/`nano`, 500 para
  ênfase em `body-sm`/`caption`, 400 para texto corrido.
- Tracking negativo existe **apenas** em display e heading; de `body` para baixo é `0`.
- `micro` e `nano` só funcionam em caixa alta — o tracking está calibrado para uppercase.
- Tipografia mora na camada de estilo, nunca em atributo `style`.
- Nomes de classe referenciam o **token semântico**, nunca o valor em pixels.

### 17.3 Layout e componentes

- Tokens, superfícies e componentes compartilhados vivem em **um único lugar central**. Classes de
  feature representam apenas o que é específico daquela feature e nunca redefinem o sistema base.
- Trecho repetido entre features vira componente ou partial compartilhado.
- Conteúdo com largura máxima única; navegação lateral fixa no desktop e em offcanvas abaixo de
  ~960px; barra superior aderente.
- A rolagem vertical pertence à **área principal de conteúdo**, nunca ao contêiner centralizado.
- Um contêiner de página padrão controla a pilha vertical e o espaçamento entre blocos — não
  redefinir caso a caso.
- Estados visuais de um mesmo componente são consistentes em todas as telas.

### 17.4 Responsividade e acessibilidade

- **Nunca** pode existir overflow horizontal na página.
- Tabelas extensas viram cards ou recebem scroll interno **dentro do próprio contêiner**.
- Grades de formulário colapsam para uma coluna no mobile.
- Ações primárias ocupam a largura disponível em telas estreitas.
- **Tipografia nunca é reduzida abaixo da escala** para fazer conteúdo caber — reorganize o layout.
- Em telas estreitas, elementos puramente decorativos são removidos, preservando marca e conteúdo
  funcional.

---

## 18. Quando criar ou separar um domínio

Separar demais gera complexidade desnecessária; separar de menos cria acoplamento e modelos
confusos. Um **domínio** é uma área de conhecimento do negócio, com linguagem e regras próprias; um
**subdomínio** é uma divisão interna dele.

### 18.1 Perguntas de decisão

| Pergunta | Mesmo domínio | Domínios distintos |
|---|---|---|
| As regras de negócio são as mesmas? | Sim | Não têm praticamente nada em comum |
| A área de negócio usa a mesma linguagem? | Mesmo vocabulário | Vocabulários distintos |
| As mudanças acontecem juntas? | Evoluem juntos | Evoluem de forma independente |
| Há dependência constante entre os modelos? | Poucos pontos de integração | Tudo depende de tudo (sinal de mistura) |

### 18.2 Sinais de que um domínio está grande demais

- Um mesmo modelo virou o centro do sistema, com responsabilidades de várias áreas penduradas nele.
- Muitos serviços de contextos diferentes acessam a **mesma entidade** de formas diferentes.
- Proliferação de condicionais por tipo (`if (tipo == A) … if (tipo == B) …`) — normalmente há mais
  de um domínio escondido em um só agregado.
- A classe tem **vários motivos distintos para mudar** (fiscal, financeiro, operacional, RH).

### 18.3 Comunicação entre domínios

Domínios **não compartilham entidades diretamente**. Evite navegar pelo objeto de outro domínio
(`<entidadeA>.<EntidadeB>.Nome` espalhado pelo sistema); referencie por identificador
(`<entidadeA>.Id<EntidadeB>`) e mantenha modelos próprios em cada domínio.

### 18.4 Checklist antes de criar um domínio novo

- [ ] Existe linguagem própria?
- [ ] Existem regras de negócio próprias?
- [ ] Tem ciclo de vida independente?
- [ ] Tem poucos pontos de integração com outros domínios?
- [ ] Pode evoluir sem impactar fortemente outros módulos?
- [ ] Existe uma área de negócio responsável por ele?
- [ ] Tem entidades centrais próprias?
- [ ] Resolveria problemas de acoplamento atuais?
- [ ] Reduziria a quantidade de regras condicionais?
- [ ] O negócio reconhece claramente esse limite?

Maioria de "sim" indica um novo domínio ou Bounded Context.

**Regra de ouro:** *se a pergunta que o negócio faz muda, o domínio provavelmente muda.* "Quem é o
cliente e qual contrato assinou?" é uma pergunta comercial; "quanto deve e qual o saldo?" é
financeira; "quem pode acessar?" é de segurança. Cada conjunto de perguntas é um domínio.

---

## 19. Documentação do projeto

Este documento é **autossuficiente**: contém arquitetura, convenções, responsabilidades, design
system e critérios de domínio. Um projeto novo pode ser iniciado referenciando apenas ele.

Conforme o projeto cresce, desdobre em documentos específicos apenas quando uma seção ficar grande
demais para conviver aqui — mantendo este arquivo como índice e fonte da visão geral:

```text
docs/
├── gerais/
│   ├── arquitetura.md            este esqueleto, adaptado ao projeto
│   ├── convencoes-codigo.md      expansão da seção 13, com exemplos do projeto
│   ├── guia-dominios.md          expansão da seção 18
│   └── testes.md                 expansão da seção 11
└── responsabilidades/            um arquivo por artefato, expandindo a seção 16
```

Regra permanente: **se uma mudança altera convenção, responsabilidade ou estrutura, a documentação é
atualizada na mesma entrega.** Um `AGENTS.md` na raiz consolida as regras de contribuição e aponta
qual seção ler antes de cada tipo de tarefa.
