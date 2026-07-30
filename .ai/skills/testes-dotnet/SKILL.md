---
name: testes-dotnet
description: Índice das skills de teste e a disciplina que vale em todas — organização dos projetos de teste espelhando o código, nomenclatura do método de teste, e os comandos de validação antes de entregar. Roteia para a skill do nível certo: estrategia-testes (o que cobrir e o que deliberadamente não cobrir), testes-unitarios (agregado, serviço, specification, controller), testes-integracao (repositório, migration, query real) e testes-ui (HTML renderizado). Use quando a tarefa menciona teste e você ainda não sabe qual nível se aplica, ao criar o projeto de teste, ao nomear um teste, ou para rodar a validação completa.
agent: net10-agent
---

# Testes automatizados — índice e disciplina comum

Esta skill não ensina a escrever teste: ela diz **qual skill ensina** e fixa o que vale em todos os
níveis. Se você já sabe o nível, vá direto para a skill dona.

## Qual skill para qual teste

| Você precisa | Skill | Dono |
|---|---|---|
| Decidir **o que** cobrir, e o que deliberadamente não cobrir | [`estrategia-testes`](../estrategia-testes/SKILL.md) | `tester-agent` |
| Testar agregado, serviço de domínio, specification, controller | [`testes-unitarios`](../testes-unitarios/SKILL.md) | `tester-agent` |
| Testar repositório, migration ou query contra banco real | [`testes-integracao`](../testes-integracao/SKILL.md) | `tester-agent` |
| Assertar sobre o HTML efetivamente renderizado | [`testes-ui`](../testes-ui/SKILL.md) | `tester-agent` |
| Construir massa de teste determinística, builder, object mother | [`dados-teste`](../dados-teste/SKILL.md) | `tester-agent` |

Na dúvida entre unitário e integração, o critério é a **fronteira de persistência**: se o teste
atravessa o `DbContext` de verdade, é integração e mora na suíte separada.

## Organização

Os testes **espelham o caminho** do artefato de produção:

```text
src/<Produto>.<Modulo>/Core/<Dominio>/<Entidade>.cs
tests/<Produto>.<Modulo>.Core.Tests/<Dominio>/<Entidade>Tests.cs
```

Um projeto de teste por projeto de produção. A suíte de integração é **separada** da unitária: ela é
lenta por natureza, e misturá-las faz a suíte rápida deixar de ser rodada.

## Ferramentas

| Ferramenta | Papel |
|---|---|
| xUnit v3 | Runner e atributos (`[Fact]`, `[Theory]`) |
| FluentAssertions | Asserção legível, com mensagem de falha útil |
| Moq | Dublê apenas nos limites da unidade |
| HtmlAgilityPack | Asserção sobre HTML renderizado (só na Web) |

## Nomenclatura

```text
<Metodo>_<Cenario>_<ResultadoEsperado>
```

`Aprovar_QuandoCancelado_DeveLancarDomainException`. O nome é o enunciado do caso: quem lê a saída da
suíte falhando entende o defeito sem abrir o arquivo.

## Regras que valem em todos os níveis

- Cada teste valida **um comportamento observável**.
- Agregados são testados pela **API pública** — nunca expor setter para facilitar o teste.
- Testes de agregado assertam pela **constante de mensagem** exposta pelo agregado, nunca por string
  literal duplicada e nunca por sigla de requisito (`RN-*`).
- A exceção esperada de invariante violada é `DomainException`, definida em
  [`dominio-agregados`](../dominio-agregados/SKILL.md). Não asserte `ArgumentException` nem
  `InvalidOperationException` para regra de domínio — o agregado não as lança.
- Serviços recebem dependências por construtor; mocks apenas nos limites necessários.
- **Não testar** implementação privada, detalhe de framework ou estrutura interna sem comportamento
  associado.
- Factory privada dentro da classe de teste pode reduzir repetição de construção.
- Teste de regressão **reproduz primeiro o defeito** observado, depois corrige.

## O que testar em cada artefato

O detalhamento, com o critério de "quando parar", está em
[`estrategia-testes`](../estrategia-testes/SKILL.md) — esta tabela é o resumo.

| Artefato | Testar | Não testar |
|---|---|---|
| Agregado | Invariantes, transições de estado, propriedades de regra calculadas | Getters triviais |
| Serviço | Orquestração: qual método foi chamado, em que ordem, o que foi persistido | Regra que pertence ao agregado |
| Specification | A expressão resultante filtra o esperado | Tradução para SQL |
| Repositório | Integração com banco real — **nunca** unitário com mock de `DbContext` | Comportamento do EF |
| Controller | Retorno correto por cenário; ViewModel montada | Regra de negócio |
| Arquitetura | Nomes de assembly, direção de dependência | — |

Mock de `DbContext` é proibido e não "geralmente evitado": ele testa o dublê, não o mapeamento, e
passa verde enquanto a query real falha. O caminho é
[`testes-integracao`](../testes-integracao/SKILL.md).

## Execução

```bash
dotnet test <Produto>.slnx -c Release
```

Validação completa antes de entregar:

```bash
npm --prefix src/<Produto>.<Modulo>.Web run typecheck
dotnet build <Produto>.slnx -c Release
dotnet test <Produto>.slnx -c Release --no-build
```

Uma entrega só é válida quando build, testes e typecheck passam **sem erros e sem avisos**. Se algo
falhar, reporte a saída real — nunca declare sucesso sem ter executado.

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Teste de agregado passa, a aplicação quebra | Asserção em `ArgumentException` enquanto o agregado lança `DomainException` | Asserte `DomainException` e a constante `Msg*` |
| Suíte rápida deixou de ser rodada | Teste de integração na mesma suíte que a unitária | Separe os projetos; a de integração roda à parte |
| Teste de repositório verde e query real falhando | `DbContext` mockado | Banco real em container, por [`testes-integracao`](../testes-integracao/SKILL.md) |
| Mensagem mudou e o teste continuou passando | String literal duplicada no teste | Asserte pela constante pública do agregado |
| Teste intermitente | Relógio real, `Random`, ou dado compartilhado entre testes | [`dados-teste`](../dados-teste/SKILL.md): relógio injetado e massa determinística |
