---
name: estrategia-testes
description: Estratégia de cobertura — pirâmide de testes, o que testar em cada artefato da arquitetura em camadas, o que deliberadamente não testar e como conduzir teste de regressão. Use antes de escrever a primeira linha de teste ou ao decidir se um cenário merece cobertura.
agent: tester-agent
---

# Estratégia de testes

## Pirâmide

```text
        ┌───────────────┐
        │      UI       │  poucos, lentos, HTML renderizado
        ├───────────────┤
        │  Integração   │  alguns, banco real, fora do build local
        ├───────────────┤
        │   Unitários   │  muitos, rápidos, sem I/O
        └───────────────┘
```

| Nível | Alvo | Custo | Regra |
|---|---|---|---|
| Unitário | Agregado, serviço, specification, controller | Milissegundos | Roda em todo build |
| Integração | Repositório, migration, query real | Segundos | Suíte separada |
| UI | View renderizada, layout | Segundos | Só o que a estrutura garante |

Quando o mesmo comportamento pode ser coberto em dois níveis, cubra no **mais baixo**. Suba de nível
apenas para validar a integração em si, não para repetir a regra.

## O que testar em cada artefato

| Artefato | Testar | Não testar |
|---|---|---|
| Agregado | Invariantes, transições de estado, propriedades de regra calculadas | Getters triviais |
| Serviço | Orquestração: qual método foi chamado, em que ordem, o que foi persistido | Regra do agregado |
| Specification | Que a expressão resultante filtra exatamente o esperado | Tradução para SQL |
| Repositório | Integração com banco real — **nunca** unitário com mock de `DbContext` | Comportamento do EF |
| Controller | Retorno correto por cenário e ViewModel montada com os dados certos | Regra de negócio |
| View | HTML renderizado: elementos, textos e estrutura responsiva | Estilo visual pixel a pixel |
| Arquitetura | Nomes de assembly e direção de dependência entre camadas | — |

### Agregado

Cada invariante do agregado é um teste. Cada transição de estado válida é um teste; cada transição
**inválida** também — o caminho de exceção é regra de negócio, não borda.

### Serviço

O serviço não tem regra própria: teste que ele chamou o repositório certo, com o argumento certo, e
que traduziu o resultado. Se um teste de serviço está assertando regra, essa regra vazou do agregado.

### Specification

Monte a coleção em memória, aplique a expressão compilada e asserte o conjunto filtrado. Não asserte
a árvore de expressão nem o SQL gerado.

### Controller

Um teste por cenário de retorno: sucesso, entrada inválida, recurso inexistente, sem permissão. A
asserção é sobre o tipo do resultado e sobre a ViewModel — nunca sobre efeito de domínio.

## O que não testar

- **Implementação privada.** Se só se alcança por reflexão, não é comportamento observável.
- **Detalhe de framework.** EF Core, roteamento e model binding já têm suíte própria.
- **Getter trivial.** Propriedade que só devolve o campo não pode falhar sozinha.
- **Estrutura interna sem comportamento associado.** Contagem de campos, ordem de propriedades.
- **Configuração estática** sem lógica: `appsettings`, registro de DI sem condicional.

Teste que não pode falhar por um defeito real é custo de manutenção sem retorno.

## Teste de regressão

Ordem obrigatória, sem atalho:

1. Reproduza o defeito em um teste que **falha** pelo motivo certo — confira a mensagem.
2. Só então corrija o código de produção.
3. Rode de novo: o teste passa e nenhum outro quebrou.

Corrigir antes de reproduzir impede saber se o teste realmente cobre o defeito. O nome segue a
convenção normal: `Metodo_Cenario_ResultadoEsperado`, descrevendo o cenário do defeito.

## Quando parar

Cobertura de linha não é meta. A pergunta é: *existe um defeito plausível neste artefato que nenhum
teste atual detectaria?* Enquanto a resposta for sim e o defeito for plausível, falta teste. Quando a
resposta só produz cenários artificiais, a cobertura está adequada.

## Validação

```powershell
dotnet test <Produto>.slnx -c Release
```

Nunca declare que a suíte passou sem ter executado. Se falhar, reporte a saída real.
