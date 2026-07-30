# Dependências

> **Template do boilerplate.** Preencha ao implementar e remova este aviso.

Dois assuntos diferentes convivem aqui: **para onde as camadas podem apontar** (regra inviolável, não
negociável) e **quais pacotes externos entram** (decisão do projeto, com critério fixo).

Referência normativa: [../../.ai/docs/estrutura-arquitetura.md](../../.ai/docs/estrutura-arquitetura.md),
seções 3 e 7.

| Marca | Significado |
|---|---|
| **Fixo pelo boilerplate** | Norma. Não se altera por projeto. |
| *Preencher* | Decisão deste projeto. |

## Regra inviolável de direção — fixa pelo boilerplate

```text
Web ──► Data ──► Core
  └──────────────► Core
```

- `Core` não referencia **nenhum** projeto da solução. Sem EF, sem HTTP, sem Razor.
- `Data` referencia somente `Core`.
- `Web` referencia `Core` e `Data`, e faz a composição.
- `Tests` referencia apenas os projetos necessários ao cenário testado.

A seta direta `Web → Core` existe **para composição** — o Controller injeta interfaces declaradas em
`Core.Interfaces.Services`. Ela **nunca** serve para pular a camada de dados: Controller que instancia
repositório concreto ou toca `DbContext` viola a regra mesmo compilando.

**Toda vez que uma tarefa parecer exigir violar isso, o desenho está errado — pare e reveja.** Não
existe exceção justificada; existe modelagem que ainda não foi corrigida.

Por que a direção importa mais que a organização em pastas: é ela que garante que a regra de negócio
seja testável sem banco, sem HTTP e sem framework. Uma seta invertida não quebra o build hoje — ela
transforma o teste unitário de amanhã em teste de integração.

### Como detectar violação

- **Teste de arquitetura** carregando cada assembly por nome e validando as referências, travando o
  padrão contra renomeação acidental. É o item 12 do checklist de projeto novo.
- **Revisão de `.csproj`**: um `ProjectReference` novo em `Core` é sempre erro.
- **Pacote em `Core`**: EF, `HttpClient` ou serializador ali significa que o desenho vazou.

## Diagrama

Ver [diagrams.md](diagrams.md) para a versão Mermaid da direção de dependência e do fluxo de
requisição.

## Dependências externas por camada — fixas pelo boilerplate

O princípio é **mínimo viável, sempre atualizado**: cada pacote abaixo cumpre um papel que não vale
reimplementar. Nada além disso entra sem justificativa — biblioteca a mais é superfície de ataque,
atrito de atualização e acoplamento a mais.

| Camada | Pacote | Papel |
|---|---|---|
| **Core** | `Microsoft.Extensions.Options` | Vincular classes de `Settings` |
| **Core** | `Microsoft.Extensions.Logging.Abstractions` | `ILogger<T>` sem acoplar a um provider |
| **Data** | `Microsoft.EntityFrameworkCore` | ORM |
| **Data** | `Npgsql.EntityFrameworkCore.PostgreSQL` | Provider do banco |
| **Data** | `Microsoft.EntityFrameworkCore.Design` (`PrivateAssets=all`) | Tooling de migration; fora do runtime |
| **Data** | `Microsoft.Extensions.Options.ConfigurationExtensions` | Binding de seções de configuração |
| **Web** | `Microsoft.ApplicationInsights.AspNetCore` | Telemetria — obrigatória |
| **Web** | `DotNetEnv` | Carregar `.env` em desenvolvimento |
| **Testes** | `Microsoft.NET.Test.Sdk`, `xunit.v3`, `xunit.runner.visualstudio` | Execução |
| **Testes** | `Moq`, `FluentAssertions` | Dublês e asserções |
| **Testes (Web)** | `HtmlAgilityPack` | Asserção sobre HTML renderizado |

`Core` **não** recebe pacote de EF, HTTP ou serialização.

### Front-end — fixas pelo boilerplate

| Pacote | Papel | Por que é essencial |
|---|---|---|
| `typescript` | Checagem de tipos | Contrato do front-end; `tsc --noEmit` é o portão do build |
| `vite` | Compilador e dev server | Build rápido, HMR, tree-shaking e hashing sem configuração |
| `tailwindcss` | Framework de estilo | Utilitário, sem CSS morto e sem design system imposto |
| `@tailwindcss/vite` | Plugin oficial | Integra Tailwind ao Vite sem passo PostCSS |
| `@types/node` | Tipos de Node | Necessário para tipar `vite.config.ts` |
| `lucide-static` | Acervo de ícones | Fonte única de ícone, SVG inline; nenhum outro acervo é permitido |

**Deliberadamente ausentes:** Bootstrap, UIkit, Foundation e afins; jQuery; Webpack, Gulp e PostCSS
avulso; framework SPA. O motivo está em [overview.md](overview.md).

`tsconfig.json` estrito é obrigatório: `strict`, `noImplicitAny`, `noUnusedLocals`,
`noUnusedParameters`, `forceConsistentCasingInFileNames`.

## Dependências adicionais deste projeto

*Todo pacote que este projeto acrescentou além da lista fixa acima, com a justificativa que passou
pelo critério da próxima seção. Pacote sem linha aqui é pacote que ninguém sabe por que existe — e
que ninguém remove por medo.*

| Pacote | Camada | Versão | Problema que resolve | Por que não vale implementar |
|---|---|---|---|---|
| *`<Pacote>`* | *Data* | *`<x.y.z>`* | *…* | *…* |

## Critério para adicionar dependência nova — fixo pelo boilerplate

Responda às quatro perguntas **antes** de rodar `dotnet add package` ou `npm install`. Se qualquer
resposta for fraca, não adicione.

1. **Qual problema concreto resolve?** Problema hipotético ("pode ser útil") não conta.
2. **Por que não vale implementar?** Se cabe em algumas dezenas de linhas de código próprio e não
   envolve criptografia, protocolo ou parsing complexo, implemente.
3. **Em qual camada entra?** Se a resposta for `Core` e o pacote for de EF, HTTP ou serialização, a
   resposta certa é: não entra — o desenho está errado.
4. **Qual o custo de sair?** Pacote que se espalha por assinatura pública de tipos do domínio é
   acoplamento, não dependência. Prefira isolá-lo atrás de um contrato em `Core`.

Verificações obrigatórias no mesmo momento:

- Manutenção ativa: último release, issues abertas, número de mantenedores. Pacote abandonado é
  dívida com data marcada.
- Licença compatível com o uso do produto.
- Vulnerabilidades conhecidas: `dotnet list package --vulnerable --include-transitive` e
  `npm audit`. Detalhe em [.ai/skills/dependencias-vulneraveis](../../.ai/skills/dependencias-vulneraveis/SKILL.md).
- Peso no bundle, no caso de pacote de front-end.

## Como justificar

Uma dependência nova aparece em **três lugares**, na mesma entrega:

1. **A tabela "Dependências adicionais deste projeto"**, acima — problema resolvido e alternativa
   descartada.
2. **A mensagem de commit**, explicando o porquê no corpo. O tipo é `chore` ou `feat`, conforme a
   entrega; padrão em [.ai/skills/padrao-commits](../../.ai/skills/padrao-commits/SKILL.md).
3. **A descrição do PR**, para a revisão poder discordar antes do merge — que é o único momento em
   que discordar é barato.

## Política de versões — fixa pelo boilerplate

- **Fixe versões exatas** em `package.json` (sem `^`) e no `.csproj`. Atualização é deliberada,
  nunca implícita: build reprodutível vale mais que patch automático.
- Mantenha runtime .NET e TypeScript nas versões estáveis mais recentes, revisando a cada release.
  Ficar para trás transforma atualização em migração.
- Diante de vulnerabilidade em **pacote transitivo**, fixe a versão corrigida com um
  `PackageReference` direto e comente o motivo no `.csproj`:

```xml
<!-- Pin transitivo: <PacoteOrigem> puxa <PacoteVulneravel> <versao> vulnerável
     (<identificador do aviso>). Fixa a versão corrigida. -->
<PackageReference Include="<PacoteVulneravel>" Version="<versao-corrigida>" />
```

Este é o **único** comentário permitido no código-fonte além de `<summary>` XML — porque a
informação não cabe em nome de identificador e some do histórico quando o pin for removido sem
contexto.

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| `Core` não compila sem referenciar EF | Agregado ou spec usando tipo do ORM | Mover o tipo para `Data`; `Core` só conhece o contrato |
| Controller com `DbContext` injetado | Camada Data pulada | Injetar `I<Entidade>Service` e mover a lógica para o serviço |
| `Web` com regra replicada de `Core` | ViewModel decidindo em vez de exibir | Expor a decisão como propriedade calculada do agregado |
| Pacote transitivo vulnerável reaparece | Pin removido sem entender o motivo | Manter o comentário do pin; ele é o motivo |
| `npm ci` instala versão diferente da esperada | Range `^` no `package.json` | Fixar versão exata e recompor o lockfile |
