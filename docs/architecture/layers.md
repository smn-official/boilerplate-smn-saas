# Camadas

> **Template do boilerplate.** Preencha ao implementar e remova este aviso.

Três camadas, uma direção. A separação existe para uma coisa só: **manter a regra de negócio
testável sem banco, sem HTTP e sem framework**. Toda vez que uma tarefa parecer exigir furar isso, o
desenho está errado — pare e reveja.

Referência normativa: [../../.ai/docs/estrutura-arquitetura.md](../../.ai/docs/estrutura-arquitetura.md),
seções 3 a 6 e 16.

| Marca | Significado |
|---|---|
| **Fixo pelo boilerplate** | Norma. Vale em qualquer projeto; não se edita por projeto. |
| *Preencher* | Decisão deste projeto. |

## Mapa de projetos — fixo pelo boilerplate

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
| `.Core` | Agregados, regras de negócio, DTOs, enums, specifications, contratos, serviços de domínio, `Settings` | EF Core, HTTP, Razor, referência a Data ou Web |
| `.Data` | `DbContext`, `IEntityTypeConfiguration`, migrations, repositórios concretos, clientes de integração, extensão de DI | Regra de negócio, apresentação |
| `.Web` | Controllers, ViewModels, Views, TypeScript, Tailwind, autenticação/autorização, composição da raiz | Regra de domínio, acesso direto ao `DbContext` |
| `.Tests` | Testes de Core e Data, espelhando os caminhos testados | Código de produção |
| `.Web.Tests` | Testes de apresentação, excluídos do csproj Web via `DefaultItemExcludes` | Código de produção |

*Preencha abaixo os módulos reais deste projeto, se houver mais de um, e o que separa cada um.*

## Core — o domínio

Responde "**como isso funciona?**". É o centro: não referencia nenhum outro projeto da solução e não
conhece framework. É o que se testa sem subir nada.

### Nunca faz — fixo

- Acessar banco, ORM ou `DbContext`.
- Chamar HTTP, e-mail, fila, storage ou cache diretamente — só por interface declarada nele mesmo.
- Conhecer Razor, `HttpContext` ou qualquer tipo de ASP.NET.
- Receber pacote de EF, HTTP ou serialização. Se um deles parecer necessário ali, o desenho está
  errado.

### Onde cada artefato mora — fixo

```text
src/<Produto>.<Modulo>/Core/
├── Common/                    AggregateRoot<TId>, ISpecification<T>, Specification<T>
├── Constants/<Contexto>/      constantes agrupadas por contexto
├── DTOs/<Contexto>/           contratos de entrada/saída dos serviços (sufixo Dto)
├── Enums/                     enums de domínio
├── Interfaces/
│   ├── Repositories/          I<Entidade>Repository
│   └── Services/              I<Entidade>Service e contratos de integração externa
├── Models/
│   ├── Aggregates/<Nome>/     raízes de agregado e entidades filhas
│   └── <Contexto>/            projeções somente leitura
├── Services/                  serviços de domínio
├── Settings/                  classes de configuração vinculadas por IOptions
└── Specs/<Entidade>/          specifications de consulta
```

Pastas nascem com o primeiro artefato real — não crie a estrutura vazia antecipadamente.

### Agregados deste projeto

*Liste os agregados existentes e a invariante central de cada um — a regra que ele existe para
proteger. Se a coluna da invariante ficar vazia, provavelmente é um DTO disfarçado de agregado.*

| Agregado | Invariante central | Onde |
|---|---|---|
| *`<Entidade>`* | *…* | *`Core/Models/Aggregates/<Nome>/`* |

## Data — persistência e integrações

Responde "**onde está e como persistir?**". Referencia somente `Core`. Traduz contrato de domínio em
SQL, HTTP e configuração — e nada além disso.

### Nunca faz — fixo

- Conter regra de negócio ou validação de domínio: quem decide é o agregado.
- Orquestrar caso de uso (criar + notificar + auditar): isso é do serviço.
- Retornar DTO, relatório ou read model a partir de repositório — repositório devolve agregado.
- Vazar `DbContext`, `DbSet` ou tipos do ORM para a camada de serviço.
- Criar, migrar ou apagar tabela de schema do qual o projeto **não** é dono.

### Onde cada artefato mora — fixo

```text
src/<Produto>.<Modulo>/Data/
├── Configurations/     IEntityTypeConfiguration por entidade
├── Context/            DbContexts, DbContextFactory, SchemaConsts
├── Extensions/         Servicos<Modulo>Extensions (ponto único de registro de DI)
├── Integracoes/        clientes de APIs externas
├── Migrations/         apenas dos contextos dos quais o projeto é dono
└── Repositories/       implementações + SpecificationEvaluator
```

### Schemas deste projeto

*Uma linha por schema, com o papel. Proprietário tem migrations próprias; consumidor mapeia tabela
de outro sistema e nunca cria nem migra nada. Confundir os dois é como se cria uma segunda fonte de
verdade sem perceber.*

| Schema | Papel | Migrations |
|---|---|---|
| *`<proprio>`* | *proprietário* | *sim* |
| *`<externo>`* | *consumidor* | *nenhuma* |

### Integrações externas deste projeto

*Toda integração externa segue o padrão fixo: um contrato em `Core`, duas implementações em `Data`
(real e desabilitada), escolha na extensão de DI por flag `Enabled` + credencial preenchida. O
fallback existe para o projeto rodar localmente sem credencial de nada.*

| Contrato (Core) | Implementação real | Fallback | Critério |
|---|---|---|---|
| *`I<Servico>Client`* | *`<Servico>Client`* | *`<Servico>ClientDesabilitado`* | *`Enabled` + chave preenchida* |

## Web — apresentação e composição

Responde "**quem chamou e o que responder?**". Referencia `Core` e `Data`, e é a única camada que
faz composição. A referência direta `Web → Core` existe para injetar interfaces de
`Core.Interfaces.Services` — **nunca** para pular a camada de dados.

### Nunca faz — fixo

- Conter regra de negócio ou decisão de domínio.
- Tocar `DbContext`, repositório ou SQL a partir do Controller.
- Construir agregado a partir de DTO no Controller.
- Injetar serviço, repositório ou contexto dentro de uma View.

### Onde cada artefato mora — fixo

```text
src/<Produto>.<Modulo>.Web/
├── Configurations/     FeatureViewLocationExpander e afins
├── Extensions/         extensions de Razor, ClaimsPrincipal, rotas
├── Features/
│   ├── _ViewImports.cshtml, _ViewStart.cshtml
│   ├── <Feature>/
│   │   ├── Controllers/   coordena entrada, serviço e resposta
│   │   ├── ViewModels/    apresentação; sufixo Request quando sofre model binding
│   │   ├── Views/         Razor, sem regra de negócio e sem style=""
│   │   ├── Scripts/       TypeScript da feature
│   │   ├── Styles/        CSS/Tailwind da feature (opcional)
│   │   ├── Services/      opcional
│   │   └── Helpers/       opcional — formatação e mapeamento Request → Dto
│   └── Shared/         layout, app.css (@theme com os tokens), componentes reutilizáveis
├── Properties/         launchSettings.json
├── Tests/              projeto de testes da apresentação
├── wwwroot/            saída do build de assets (gerada)
├── Program.cs          composição da raiz
├── vite.config.ts      compilador de assets
└── tsconfig.json       strict, noUnusedLocals, noUnusedParameters
```

### Features deste projeto

*Uma linha por feature, com a rota base e a única tarefa que a tela resolve. Feature sem tarefa
única definida vira tela genérica.*

| Feature | Rota base | Tarefa da tela |
|---|---|---|
| *`<Feature>`* | *`/resources`* | *…* |

## Responsabilidade por artefato — fixa pelo boilerplate

Esta tabela é norma. A maior parte dos defeitos de arquitetura vem de um artefato assumindo
responsabilidade alheia — regra de negócio no Controller, formatação no agregado, orquestração no
repositório.

| Artefato | Responde | Nunca faz | Camada |
|---|---|---|---|
| Agregado | "como isso funciona?" | acessar banco, chamar API, conhecer framework | Core |
| Service | "o que deve acontecer?" | conter regra de negócio, conhecer o ORM | Core |
| Repository | "onde está / como persistir?" | orquestrar caso de uso, retornar DTO | Core (contrato) / Data (implementação) |
| DTO | "quais dados trafegam?" | ter comportamento de domínio | Core |
| Controller | "quem chamou, o que responder?" | regra de negócio, tocar `DbContext` | Web |
| ViewModel | "como a tela enxerga?" | depender de service ou repository | Web |
| View | "como apresentar?" | decidir regra, injetar service | Web |

O detalhamento de cada artefato — o que deve e o que não deve fazer, item a item — está na seção 16
de [../../.ai/docs/estrutura-arquitetura.md](../../.ai/docs/estrutura-arquitetura.md).

## Onde colocar uma dúvida comum

| Preciso de… | Vai em | Por quê |
|---|---|---|
| Regra que decide se algo é permitido | Agregado (`Core`) | É invariante, não orquestração |
| Consulta com filtro reaproveitável | Specification (`Core/Specs`) | Consulta vive no domínio, não em LINQ solto no repositório |
| Chamada a API de terceiro | Interface em `Core`, cliente em `Data/Integracoes` | Mantém o domínio livre de HTTP |
| Formatação de data, moeda, documento | ViewModel ou Helper (`Web`) | É apresentação, não domínio |
| Flag que liga/desliga comportamento | `Settings` em `Core`, binding em `Data` | Configuração é dado, não `if` espalhado |
| Constante de mensagem de validação | Agregado (`Core`) | Permite testar sem duplicar string |
