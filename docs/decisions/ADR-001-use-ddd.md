# ADR-001 — DDD tático com arquitetura em camadas Web → Data → Core

**Status:** aceito
**Data:** 2026-07-30

## Contexto

Aplicação de linha de negócio acumula regra ao longo de anos, e o custo dominante não é escrever a
regra — é **descobrir onde ela está** quando o negócio muda. Em ASP.NET Core MVC, o caminho de menor
resistência leva a regra para dentro do `Controller` ou de uma classe de serviço que já conhece o
`DbContext`. O resultado é previsível:

- A regra vira efeito colateral de uma query. Ninguém consegue afirmar, lendo o domínio, quais
  estados são válidos.
- Testar exige banco. Um caso de borda que deveria custar dez linhas de teste unitário passa a
  custar container, migration e fixture.
- Trocar ORM, provedor de banco ou camada de apresentação vira reescrita, porque a regra está
  ancorada em tipos de infraestrutura.
- Duas telas que aplicam a mesma regra divergem, porque cada uma reimplementou a validação.

A força do outro lado é real: separar em camadas custa arquivos, indireção e curva de aprendizado.
Para um CRUD descartável, não compensa. Para um SaaS que pretende viver anos e receber contribuição
de agentes e de pessoas diferentes, compensa.

## Decisão

Adotar **DDD tático** — agregado, serviço de domínio, repositório, DTO, specification — sobre uma
arquitetura em três camadas, com a direção de dependência tratada como regra inviolável:

```text
Web ──► Data ──► Core
  └──────────────► Core
```

- **`Core` não referencia nenhum projeto da solução.** Sem EF Core, sem HTTP, sem Razor, sem
  `DbContext`. É C# puro mais a regra do negócio.
- **`Data` referencia somente `Core`.** Implementa os contratos de persistência que o `Core` declara.
- **`Web` referencia `Core` e `Data`** e é a única camada que faz composição (injeção de dependência,
  configuração, rotas).

Sobre isso valem as responsabilidades já fixadas no `AGENTS.md`:

| Artefato | Responde | Nunca faz |
|---|---|---|
| Agregado | "como isso funciona?" | acessar banco, chamar API, conhecer framework |
| Service | "o que deve acontecer?" | conter regra de negócio, conhecer o ORM |
| Repository | "onde está / como persistir?" | orquestrar caso de uso, retornar DTO |
| DTO | "quais dados trafegam?" | ter comportamento de domínio |
| Controller | "quem chamou, o que responder?" | regra de negócio, tocar `DbContext` |
| ViewModel | "como a tela enxerga?" | depender de service ou repository |
| View | "como apresentar?" | decidir regra, injetar service |

Fluxo canônico: `Controller → Service → Repository → Agregado`, retornando
`Agregado → DTO → ViewModel → View`.

**O agregado é a fronteira de consistência.** Ele guarda a invariante e a garante na própria API
pública: construtor e métodos recusam transição inválida em vez de expor setters que a permitam.
Validação de tela é conveniência para quem usa; invariante de agregado é a garantia do sistema.

Quando uma tarefa parecer exigir violar a direção de dependência, o desenho está errado — a resposta
é revisar o desenho, nunca adicionar a referência.

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| CRUD anêmico: entidade só com propriedades, regra no `Controller` ou no serviço de aplicação | É exatamente o problema descrito no contexto. A regra fica espalhada, testar exige banco e nenhum tipo do sistema consegue afirmar o que é um estado válido. Barato no primeiro mês, caro em todos os seguintes |
| CQRS com leitura e escrita separadas | Resolve um problema de escala de leitura que este produto ainda não tem. Duplica modelo e introduz consistência eventual sem contrapartida. O `AGENTS.md` proíbe explicitamente introduzir sem problema concreto |
| MediatR como barramento interno | Substitui chamada de método direta e rastreável por despacho dinâmico. Perde-se navegação estática ("quem chama isto?") em troca de desacoplamento que a injeção de dependência já dá |
| Event sourcing | Custo de projeção, versionamento de evento e replay é alto e permanente. Só se paga com auditoria temporal como requisito de negócio real, que aqui não existe |
| Camada única com pastas por feature | Pasta não impede referência. Sem projeto separado, a primeira pressa injeta `DbContext` no domínio e o compilador não reclama. A fronteira precisa ser verificável pelo build |

CQRS, MediatR e event sourcing continuam disponíveis se aparecer o problema que os justifique — mas
aí a justificativa vira um novo ADR, com o problema concreto descrito.

## Consequências

**Positivas**

- A fronteira é verificada pelo compilador, não pela boa vontade de quem escreve. Violar exige
  adicionar uma referência de projeto — mudança visível em diff e barrada em revisão.
- Regra de negócio testável sem banco, sem HTTP e sem container: teste unitário de agregado roda em
  milissegundos e cobre caso de borda que ninguém testaria se exigisse infraestrutura.
- Trocar ORM, provedor de banco ou camada de apresentação toca `Data` ou `Web`, nunca a regra.
- "Onde isso mora?" tem resposta única, o que torna o repositório previsível para pessoas novas e
  para agentes.

**Negativas**

- Mais arquivos e mais indireção. Um campo novo pode atravessar agregado, configuração de EF Core,
  DTO e ViewModel.
- Curva de aprendizado: quem vem de MVC com `DbContext` no `Controller` estranha o mapeamento
  explícito entre camadas e tende a atalhar.
- Mapeamento manual `Agregado → DTO → ViewModel` é trabalho repetitivo e sem graça — e é justamente
  o que impede o tipo de persistência de vazar para a tela.

**Passa a ser obrigatório**

- Nenhum `using` de EF Core, `Microsoft.AspNetCore.*` ou Razor dentro de `Core`.
- Toda invariante de negócio garantida no agregado, não apenas validada na `View`.
- `Controller` nunca toca `DbContext`; `Repository` nunca retorna DTO; `ViewModel` nunca depende de
  service ou repository.
- Objeto de transporte com sufixo `Dto`, na classe e no arquivo.
- `CancellationToken` como último parâmetro em toda operação assíncrona que atravessa camada.
- Domínio e pastas no idioma do negócio; configuração e rotas HTTP em inglês kebab-case.

## Referências

- [AGENTS.md](../../AGENTS.md) — regra inviolável de dependência e tabela de responsabilidades
- [.ai/docs/estrutura-arquitetura.md](../../.ai/docs/estrutura-arquitetura.md) — detalhamento
  normativo completo
- [.ai/skills/arquitetura-camadas](../../.ai/skills/arquitetura-camadas/SKILL.md)
- [.ai/skills/dominio-agregados](../../.ai/skills/dominio-agregados/SKILL.md)
- [ADR-002](ADR-002-database-strategy.md) — estratégia de banco, que depende desta separação
