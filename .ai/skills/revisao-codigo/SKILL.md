---
name: revisao-codigo
description: Checklist de revisão de código .NET 10 — convenções, Clean Code, SOLID, KISS, formatação, null safety e violações de camada. Use ao revisar um diff, PR ou antes de entregar uma alteração.
agent: net10-agent
---

# Revisão de código

Revise **apenas o que foi adicionado ou modificado no diff**. Não aponte problema em código
preexistente de outro autor.

## 1. Violações de arquitetura (bloqueiam a entrega)

- [ ] `Core` referenciando EF, HTTP, Razor, `Data` ou `Web`.
- [ ] Controller tocando `DbContext` ou repositório.
- [ ] Regra de negócio fora do agregado (em serviço, controller ou view).
- [ ] Repositório orquestrando caso de uso ou retornando DTO.
- [ ] `DbContext`/`DbSet` vazando para a camada de serviço.
- [ ] Migration ou `EnsureCreated` sobre schema de outro sistema.
- [ ] Referência a assembly interno de outro repositório.
- [ ] ViewModel dependendo de service ou repository.
- [ ] View com regra de negócio, `if/else` derivando classe, ou injetando service.

## 2. Convenções gerais

- [ ] **Sem comentários** no código, exceto `<summary>` XML em tipo/operação pública.
- [ ] **Sem sigla de rastreamento de requisito** (`RN-*`) em mensagem, constante, view, `.ts` ou
      assert. Números de documento, norma externa e centro de custo **não** são violação.
- [ ] DTO/Model/ViewModel instanciado por **construtor**, não object initializer.
- [ ] `CancellationToken` como **último** parâmetro.
- [ ] Método com 3+ parâmetros relacionados recebe DTO.
- [ ] Classe nova com propriedades somente leitura (exceto DTO de model binding); construtor
      primário quando só atribui.
- [ ] Sufixo `Dto` na classe **e** no arquivo.
- [ ] Enum persistido com `HasConversion<string>()`.
- [ ] `Url.Action` com `nameof`, sem string literal.
- [ ] Sem URL hardcoded no TypeScript — vem do Razor por `data-*`.
- [ ] Sem `style=""` no HTML — classe utilitária do Tailwind.
- [ ] Pipe `|` como separador em string, não traço.

## 3. Clean Code

- [ ] Nomes revelam intenção — sem `x`, `temp`, `data`, `item`, `obj`, `val`, `res`, `ret`.
- [ ] Método faz uma coisa; acima de ~20 linhas ou com operações distintas, extrair.
- [ ] Sem número mágico — constante, enum ou variável nomeada.
- [ ] Early return e guard clause em vez de `if` aninhado.
- [ ] DRY quando a duplicação é **real** (mesma intenção), não apenas sintática.
- [ ] LINQ legível — query complexa quebrada em etapas nomeadas.

## 4. SOLID e KISS

- [ ] SRP: classe não mistura regra + acesso a dado + formatação.
- [ ] DIP: depende de interface; sem `new` de dependência em classe de alto nível.
- [ ] OCP: comportamento novo por extensão, não inchando `switch` existente.
- [ ] Sem over-engineering: nenhuma abstração, factory ou wrapper para algo usado uma vez.

## 5. Specifications

- [ ] **Uma spec por filtro** — nenhuma spec guarda-chuva com `propriedade == null || …` dentro da
      expressão. Composição com `.And(...)` no serviço, só quando o filtro tem valor.
- [ ] Spec carrega os `Include` necessários.

## 6. Null safety

- [ ] Valor possivelmente nulo é **validado antes** de ser repassado a outra função.
- [ ] Quando nulo, o tratamento produz mensagem compreensível ao usuário (exceção de domínio ou
      resultado de falha), não `NullReferenceException`.

## 7. Logging

- [ ] `ILogger<T>` injetado, não API do SDK de telemetria.
- [ ] Logging **estruturado** com placeholder nomeado, nunca interpolação de string.
- [ ] **Nenhum segredo ou dado pessoal** no log.
- [ ] Não loga e relança a mesma exceção.

## 8. Formatação

- [ ] Linhas de ~120 caracteres.
- [ ] Um parâmetro por linha quando a assinatura excede o limite.
- [ ] Cada `.Metodo()` encadeado em sua própria linha.
- [ ] Operador no início da linha em condição composta.
- [ ] Trailing comma em enum e em objeto/destructuring TypeScript.
- [ ] Sem linha em branco entre propriedades; sem linha em branco entre membros de enum.
- [ ] Linha em branco após `namespace` file-scoped e entre blocos de controle consecutivos
      (guard clauses curtas podem ficar agrupadas).
- [ ] Sem alinhamento de `=` por colunas.
- [ ] Sem trailing whitespace; indentação consistente.
- [ ] Construtor/método vazio em linha única: `protected <Entidade>() {}`.
- [ ] Newline no final do arquivo.
- [ ] `nameof` nas configurations do EF.

## 9. Testes

- [ ] Caminho do teste espelha o do artefato testado.
- [ ] Nome no padrão `Metodo_Cenario_ResultadoEsperado`.
- [ ] Agregado testado pela API pública; assert pela constante de mensagem.
- [ ] Comportamento novo tem teste; correção de defeito reproduz o defeito primeiro.

## 10. Entrega

- [ ] `npm run typecheck` passa.
- [ ] `dotnet build -c Release` passa **sem avisos**.
- [ ] `dotnet test -c Release --no-build` passa.
- [ ] UI validada em desktop e mobile, sem overflow horizontal.
- [ ] Documentação atualizada se convenção, responsabilidade ou estrutura mudou.

## Formato do reporte

```
**<Categoria> — <Regra>**
📍 `<Arquivo>` linha <N>
❌ Atual:
```csharp
// trecho problemático
```
✅ Sugestão:
```csharp
// versão corrigida
```
```

Ordene por severidade: violação de arquitetura primeiro, formatação por último.
