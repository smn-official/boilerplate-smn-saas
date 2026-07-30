# Estrutura do projeto

> **Template do boilerplate.** Preencha ao implementar e remova este aviso.

Onde cada artefato mora, e por quê. A estrutura não é organização estética: ela **materializa a
direção de dependência**. Um arquivo na pasta errada é, quase sempre, uma responsabilidade na camada
errada.

Referência normativa completa em
[.ai/docs/estrutura-arquitetura.md](../../.ai/docs/estrutura-arquitetura.md).

## A regra que decide tudo

```text
Web ──► Data ──► Core
  └──────────────► Core
```

**Norma inviolável:**

- `Core` não referencia **nenhum** projeto da solução. Sem EF, sem HTTP, sem Razor.
- `Data` referencia somente `Core`.
- `Web` referencia `Core` e `Data`, e faz a composição.

A referência direta `Web → Core` existe para composição — o controller injeta interfaces declaradas
em `Core.Interfaces.Services` — **nunca** para pular a camada de dados.

Toda vez que uma tarefa parecer exigir violar isso, o desenho está errado. Pare e reveja.

## Árvore da solução

```text
<Produto>.slnx
└── src/
    ├── <Produto>.<Modulo>/
    │   ├── Core/     <Produto>.<Modulo>.Core.csproj    domínio
    │   ├── Data/     <Produto>.<Modulo>.Data.csproj    persistência e integrações
    │   └── Tests/    <Produto>.<Modulo>.Tests.csproj   testes de Core e Data
    └── <Produto>.<Modulo>.Web/
        ├── <Produto>.<Modulo>.Web.csproj               apresentação e composição
        └── Tests/    <Produto>.<Modulo>.Web.Tests.csproj  testes da apresentação
```

| Projeto | Responsabilidade | Proibido conter |
|---|---|---|
| `.Core` | Agregados, regras, DTOs, enums, specifications, contratos, serviços de domínio, `Settings` | EF Core, HTTP, Razor, referência a Data ou Web |
| `.Data` | `DbContext`, configurations, migrations, repositórios, clientes de integração, extensão de DI | Regra de negócio, apresentação |
| `.Web` | Controllers, ViewModels, Views, TypeScript, Tailwind, autenticação, composição da raiz | Regra de domínio, acesso direto ao `DbContext` |
| `.Tests` | Testes de Core e Data, espelhando os caminhos testados | Código de produção |
| `.Web.Tests` | Testes de apresentação (excluídos do csproj Web via `DefaultItemExcludes`) | Código de produção |

Namespaces **espelham as pastas**: `<Produto>.<Modulo>.Core.*`, `<Produto>.<Modulo>.Data.*`,
`<Produto>.<Modulo>.Web.*`. Um teste de arquitetura carrega cada assembly por nome e trava o padrão
contra renomeação acidental.

*Se este projeto tiver mais de um módulo, liste-os aqui com a fronteira funcional de cada um.*

## Core — domínio

```text
src/<Produto>.<Modulo>/Core/
├── Common/                    AggregateRoot<TId>, ISpecification<T>, Specification<T>
├── Constants/<Contexto>/      constantes agrupadas por contexto
├── DTOs/<Contexto>/           contratos de entrada e saída dos serviços (sufixo Dto)
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

O detalhe que mais confunde: **o contrato de integração externa mora aqui**, em
`Interfaces/Services`. É `Core` quem declara `I<Servico>Client`; `Data` apenas implementa. É isso que
mantém o domínio ignorante de HTTP.

*Preencha aqui os agregados reais do projeto e a fronteira de cada contexto.*

## Data — persistência e integrações

```text
src/<Produto>.<Modulo>/Data/
├── Configurations/     IEntityTypeConfiguration por entidade
├── Context/            DbContexts, DbContextFactory, SchemaConsts
├── Extensions/         Servicos<Modulo>Extensions (registro de DI)
├── Integracoes/        clientes de APIs externas
├── Migrations/         apenas dos contextos dos quais o projeto é dono
└── Repositories/       implementações + SpecificationEvaluator
```

`Extensions/` é o **ponto único de registro** de repositórios, serviços de domínio e integrações. O
`Program.cs` não conhece implementação concreta de nenhum dos três.

## Web — apresentação

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
├── wwwroot/dist/       saída do Vite (gerada; fora do controle de versão)
├── Program.cs          composição da raiz
├── vite.config.ts
└── tsconfig.json       strict, noUnusedLocals, noUnusedParameters
```

### Feature vertical

A apresentação é organizada por **fatia vertical**, não por tipo de arquivo. Tudo que uma tela
precisa fica junto:

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

O ganho é de manutenção: alterar uma tela toca uma pasta, não seis diretórios espalhados por tipo. O
custo é disciplina — o que é compartilhado precisa **mesmo** ir para `Features/Shared`, e não ser
duplicado na feature seguinte.

Um `IViewLocationExpander` prepende os padrões de feature aos nativos do Razor:

```csharp
var featureLocations = new[]
{
    "/Features/{1}/Views/{0}.cshtml",
    "/Features/{1}/Views/Shared/{0}.cshtml",
    "/Features/Shared/{0}.cshtml",
};

return featureLocations.Concat(viewLocations);
```

*Liste aqui as features reais do projeto, com a fronteira de cada uma.*

## Onde mora cada artefato

| Artefato | Caminho | Responde |
|---|---|---|
| Agregado | `Core/Models/Aggregates/<Nome>/` | "como isso funciona?" |
| Specification | `Core/Specs/<Entidade>/` | "quais critérios de busca?" |
| Serviço de domínio | `Core/Services/` | "o que deve acontecer?" |
| Contrato de repositório | `Core/Interfaces/Repositories/` | "o que a persistência precisa oferecer?" |
| Contrato de integração | `Core/Interfaces/Services/` | "o que o terceiro precisa oferecer?" |
| DTO | `Core/DTOs/<Contexto>/` | "quais dados trafegam?" |
| Classe de opções | `Core/Settings/` | "o que é configurável?" |
| Configuration do EF | `Data/Configurations/` | "como isso é mapeado?" |
| Repositório concreto | `Data/Repositories/` | "onde está / como persistir?" |
| Cliente de integração | `Data/Integracoes/` | "como falo com o terceiro?" |
| Migration | `Data/Migrations/` | "como o schema evoluiu?" |
| Registro de DI | `Data/Extensions/` | "quem implementa o quê?" |
| Controller | `Web/Features/<Feature>/Controllers/` | "quem chamou, o que responder?" |
| ViewModel | `Web/Features/<Feature>/ViewModels/` | "como a tela enxerga?" |
| View | `Web/Features/<Feature>/Views/` | "como apresentar?" |
| TypeScript da feature | `Web/Features/<Feature>/Scripts/` | "qual comportamento no cliente?" |
| Layout e tokens | `Web/Features/Shared/` | "o que é comum a todas as telas?" |

## Convenção de nomes de arquivo

**Norma:** o arquivo tem o nome do tipo que contém, um tipo público por arquivo.

| Tipo | Arquivo | Observação |
|---|---|---|
| Agregado | `<Entidade>.cs` | Idioma do negócio |
| Interface | `I<Entidade>Repository.cs` | Prefixo `I` |
| DTO | `Salvar<Entidade>Dto.cs` | **Sufixo `Dto` também no arquivo** |
| Model binding | `<Entidade>Request.cs` | Sufixo `Request` |
| ViewModel | `<Entidade>ViewModel.cs` | — |
| Specification | `<Entidade>Por<Filtro>Spec.cs` | Uma spec por filtro |
| Configuration | `<Entidade>Configuration.cs` | — |
| Controller | `<Entidade>Controller.cs` | — |
| View | `<Acao>.cshtml` | Nome da action |
| Partial | `_<Nome>.cshtml` | Underscore inicial |
| TypeScript | `<feature>.ts` | Minúsculo, kebab-case |
| Teste | `<TipoTestado>Tests.cs` | Espelha o caminho do testado |

Método de teste: `Metodo_QuandoCondicao_DeveResultado`.

## Pasta nasce com o primeiro artefato real

**Norma, e ela é levada a sério.** Nenhuma pasta vazia é criada antecipadamente — nem
`Integracoes/`, nem `Helpers/`, nem `Specs/`.

O motivo não é limpeza. Pasta vazia é uma **afirmação falsa sobre o sistema**: quem chega lê a árvore
como mapa do que existe e conclui que há integrações onde não há nenhuma. Pior, ela convida ao
preenchimento — alguém cria um helper só porque a pasta está ali esperando.

O corolário vale para o código: não crie abstração para um uso único, não introduza CQRS, MediatR ou
event sourcing sem problema concreto que os justifique.

## Fronteiras

- **Escopo do módulo.** Cada repositório tem fronteira funcional explícita; o que está fora pertence
  a outro repositório.
- **Sem acoplamento binário entre sistemas.** Não referencie assemblies internos de outro
  repositório. Por isso o projeto mantém a própria `AggregateRoot`, as próprias `Specification` e os
  próprios enums, mesmo que pareçam duplicados.
- **Propriedade de dados.** Cada sistema é dono do seu schema. Dado de outro sistema entra por
  contrato, sem replicar a fonte de verdade.
- **Documentação acompanha o código.** Mudança de convenção, responsabilidade ou estrutura atualiza
  a documentação **na mesma entrega**.

## Estrutura de documentação e apoio

São duas árvores com propósitos distintos: `docs/` responde "o que construir e por quê"; `.ai/docs/`
responde "como construir".

- **[docs/README.md](../README.md)** lista e comenta cada um dos sete diretórios de `docs/` —
  `architecture/`, `domain/`, `development/`, `infrastructure/`, `api/`, `decisions/` e
  `features/<feature>/`. É a lista canônica; consulte-a lá em vez de reproduzi-la aqui, para que não
  volte a divergir do disco.
- **[.ai/docs/README.md](../../.ai/docs/README.md)** é o índice da documentação de execução para
  agentes, ao lado de `.ai/skills/` (uma `SKILL.md` por assunto) e `.ai/agents/` (uma definição por
  agente).
