---
name: arquitetura-camadas
description: Estrutura de solução .NET 10 em camadas — criar projetos, decidir onde um artefato mora, validar direção de dependência, configurar composição da raiz e dependências essenciais. Use ao iniciar um projeto, adicionar um projeto novo, mover código entre camadas ou avaliar se uma dependência é permitida.
agent: net10-agent
---

# Arquitetura em camadas

## Mapa de projetos

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

## Direção de dependência — inviolável

```text
Web ──► Data ──► Core
  └──────────────► Core
```

| Projeto | Contém | Proibido conter |
|---|---|---|
| `.Core` | Agregados, regras, DTOs, enums, specs, interfaces, serviços de domínio, `Settings` | EF Core, HTTP, Razor, referência a Data ou Web |
| `.Data` | `DbContext`, configurations, migrations, repositórios, clientes externos, extensão de DI | Regra de negócio, apresentação |
| `.Web` | Controllers, ViewModels, Views, TypeScript, Tailwind, auth, composição | Regra de domínio, `DbContext` direto |

A referência `Web → Core` existe **para composição** (injetar `I<Entidade>Service`), nunca para
pular a camada de dados.

## Onde mora cada coisa

| Preciso criar… | Vai em |
|---|---|
| Base do domínio (`AggregateRoot<TId>`, `DomainException`, `Specification<T>`) | `Core/Common/` |
| Regra de negócio, invariante | `Core/Models/Aggregates/<Nome>/` |
| Contrato de repositório ou serviço | `Core/Interfaces/{Repositories,Services}/` |
| Consulta reutilizável | `Core/Specs/<Entidade>/` |
| Objeto de transporte | `Core/DTOs/<Contexto>/` |
| Classe de configuração | `Core/Settings/` |
| Mapeamento de tabela | `Data/Configurations/` |
| Implementação de repositório | `Data/Repositories/` |
| Cliente de API externa | `Data/Integracoes/` |
| Registro de DI | `Data/Extensions/Servicos<Modulo>Extensions.cs` |
| Tela (controller + view + assets) | `Web/Features/<Feature>/` |
| Componente visual compartilhado | `Web/Features/Shared/` |

Pastas nascem com o primeiro artefato real. Não crie estrutura vazia.

## Namespaces

Espelham a pasta: `<Produto>.<Modulo>.Core.*`, `.Data.*`, `.Web.*`, `.Tests.*`. Trave com um teste
de arquitetura que carrega cada assembly por nome.

## Dependências essenciais

Mínimo viável, sempre atualizado. Nada entra sem justificativa.

| Camada | Pacote | Papel |
|---|---|---|
| Core | `Microsoft.Extensions.Options` | Vincular `Settings` |
| Core | `Microsoft.Extensions.Logging.Abstractions` | `ILogger<T>` sem acoplar provider |
| Data | `Microsoft.EntityFrameworkCore` | ORM |
| Data | `Npgsql.EntityFrameworkCore.PostgreSQL` | Provider |
| Data | `Microsoft.EntityFrameworkCore.Design` (`PrivateAssets=all`) | Tooling de migration |
| Data | `Microsoft.Extensions.Options.ConfigurationExtensions` | Binding de seções |
| Web | `Microsoft.ApplicationInsights.AspNetCore` | Telemetria |
| Web | `DotNetEnv` | Carregar `.env` |
| Testes | `Microsoft.NET.Test.Sdk`, `xunit.v3`, `xunit.runner.visualstudio`, `Moq`, `FluentAssertions` | Execução, dublês, asserções |
| Testes Web | `HtmlAgilityPack` | Asserção sobre HTML |

`Core` **não** recebe pacote de EF, HTTP ou serialização. Se parecer necessário, o desenho está
errado.

**Versões:** fixe exatas (sem `^`); mantenha .NET e TypeScript nas estáveis mais recentes; ao achar
vulnerabilidade transitiva, fixe a corrigida com comentário explicando o motivo no `.csproj`.

## Composição da raiz (`Program.cs`)

Ordem:

1. Carregar `.env` (subindo a árvore de diretórios).
2. **Application Insights** — cedo, para capturar falha do próprio startup.
3. Extensão de DI da camada Data (`Adicionar<Modulo>(configuration)`).
4. Serviços exclusivos da apresentação.
5. Autenticação e autorização.
6. MVC + `FeatureViewLocationExpander`.
7. Migrations — **apenas** dos contextos dos quais o projeto é dono.
8. Middleware: exception handler + HSTS (fora de Development), HTTPS redirect, static files,
   routing, authentication, authorization, endpoints.

Todo registro de repositório e serviço de domínio fica na extensão de DI — o `Program.cs` não
conhece implementação concreta.

## Configuração

- Chaves em **inglês**, `__` separando níveis nas variáveis de ambiente.
- `.env.example` versionado como contrato; `.env` real fora do git.
- Cada seção mapeia para uma classe em `Core/Settings`, com a constante da própria seção.
- Segredo nunca é commitado nem lido por `IConfiguration` dentro do domínio.

## Fronteiras entre sistemas

- Não referenciar assembly interno de outro repositório. Mantenha `AggregateRoot`, `Specification` e
  enums próprios, mesmo que pareçam duplicados.
- Cada sistema é dono do seu schema. Dado de outro sistema entra por contrato explícito, sem
  replicar a fonte de verdade.
- Migration só sobre o que se é dono. Nada de `EnsureCreated` em schema externo.

## Checklist de projeto novo

1. Solution e cinco projetos com as referências acima.
2. `AggregateRoot<TId>`, `DomainException`, `ISpecification<T>`, `Specification<T>` (com o
   `ParameterReplacer` do `And`) em `Core/Common` — ver
   [`dominio-agregados`](../dominio-agregados/SKILL.md).
3. `SpecificationEvaluator` em `Data/Repositories`.
4. `SchemaConsts` documentando o papel de cada schema.
5. Extensão de DI em `Data/Extensions` como ponto único de registro.
6. `FeatureViewLocationExpander`, `_ViewImports.cshtml`, `_ViewStart.cshtml`.
7. `vite.config.ts` + `tsconfig.json` estrito, amarrados aos targets do `.csproj`.
8. `Features/Shared/Styles/app.css` com `@import "tailwindcss"` e `@theme`.
9. TagHelper de assets do Vite (dev server vs. manifest).
10. Application Insights e níveis de log por provider.
11. `.env.example`.
12. Testes de arquitetura travando nomes de assembly.
13. Pipeline com `Deploy` dependendo de `Test` — o YAML de referência a copiar está na seção 12.3 de
    [estrutura-arquitetura.md](../../docs/estrutura-arquitetura.md). Não o escreva do zero: `Deploy`
    que depende só de `Build` deixa teste falhando passar para produção.
14. `AGENTS.md` na raiz.
