# Documentação do projeto

> **Template do boilerplate.** Preencha ao implementar e remova este aviso.

Esta pasta responde **"o que construir e por quê"** — domínio, regras, decisões e operação do
produto. O **"como construir"** (convenções que valem para qualquer projeto deste boilerplate) fica
em [.ai/docs/](../.ai/docs/), e o que vale sempre está no [AGENTS.md](../AGENTS.md) da raiz.

A divisão importa: `.ai/` acompanha o boilerplate e raramente muda; `docs/` é do produto e muda a
cada entrega.

## Por onde começar

| Se você quer… | Leia |
|---|---|
| Rodar o projeto pela primeira vez | [development/getting-started.md](development/getting-started.md) |
| Entender a arquitetura | [architecture/overview.md](architecture/overview.md) |
| Saber o que um termo significa no negócio | [domain/glossary.md](domain/glossary.md) |
| Achar uma regra de negócio | [domain/business-rules.md](domain/business-rules.md) |
| Saber por que algo foi decidido assim | [decisions/README.md](decisions/README.md) |
| Conferir um comando do dia a dia | [development/commands.md](development/commands.md) |
| Entender uma feature específica | [features/](features/) |

## As pastas

### [architecture/](architecture/)

Como o sistema é montado: visão geral, as três camadas, direção de dependência, fluxo de uma
requisição e diagramas. A direção `Web → Data → Core` e o fluxo canônico são **norma do
boilerplate**, não escolha do projeto — estão escritos por extenso, não como lacuna.

### [domain/](domain/)

O negócio: glossário, regras, agregados e casos de uso. É a pasta que envelhece pior quando ninguém
atualiza, e a que mais custa caro quando está errada — regra documentada divergente da implementada
faz todo mundo confiar na versão errada.

### [development/](development/)

O trabalho diário: primeiros passos, convenções de código, estrutura de pastas, testes e comandos.
As convenções fixas do `AGENTS.md` aparecem aqui por extenso, com o motivo de cada uma.

### [infrastructure/](infrastructure/)

O que sustenta o sistema: banco, autenticação, integrações externas, deploy e configuração. Inclui
a fronteira entre `appsettings.json` e `.env`, e o que fazer quando um segredo vaza.

### [api/](api/)

O contrato HTTP: convenções de rota, catálogo de erros e inventário de endpoints. Rota é sempre em
inglês kebab-case, mesmo com o domínio no idioma do negócio.

### [decisions/](decisions/)

Os ADRs — decisões arquiteturais com contexto e consequência. Existem para que ninguém "corrija"
depois uma escolha deliberada sem saber por que ela foi feita. ADR aceito não se edita: cria-se
outro que o substitui.

### [features/](features/)

Uma pasta por feature, com fluxos e `rules/`. O formato está em
[features/README.md](features/README.md); preencha **antes** de implementar — escrever o fluxo
revela ambiguidade enquanto ela ainda é barata de resolver.

## Convenções desta documentação

- **Explique o porquê, não só o quê.** Regra sem motivo é ignorada na primeira vez que incomodar.
- **Marque o que é fixo e o que é do projeto.** O leitor precisa saber o que pode mudar.
- **Exemplos usam o domínio real**, não `foo`/`bar`.
- **Marcadores didáticos permanecem**: `<Entidade>`, `<Feature>`, `<schema>` significam "o artefato
  que você está escrevendo agora" e nunca são substituídos. Só `<Produto>` e `<Modulo>` são
  identidade do projeto, trocados uma vez pelo `setup-projeto`.
- Identificador de regra (`RN-1`) é estável e vive **só aqui** — nunca em mensagem, constante ou
  teste.

## Manutenção

Ao mudar comportamento, atualize a documentação **na mesma entrega**. Documentação desatualizada é
pior que ausente: ela é lida com confiança e orienta contra o sistema real.
