---
name: setup-projeto
description: Parametriza este boilerplate com o nome real do projeto — substitui os marcadores <Produto> e <Modulo> em AGENTS.md, agentes e skills, e cria a solução .NET em camadas. Use uma única vez, ao iniciar um projeto novo a partir deste boilerplate, ou quando alguém perguntar como começar, como renomear o produto ou por que ainda aparece <Produto> nos caminhos.
agent: net10-agent
---

# setup-projeto — parametrização inicial

Executado **uma vez**, no início de um projeto novo. A stack deste boilerplate é fixa e opinativa
(.NET 10 em camadas, PostgreSQL, Tailwind + Vite, xUnit v3) — o setup **não** liga nem desliga
tecnologia. Ele só troca a identidade do projeto.

## A distinção que importa

O repositório tem dois tipos de marcador `<...>`, e confundi-los destrói as skills:

| Tipo | Marcadores | O que fazer |
|---|---|---|
| **Identidade do projeto** | `<Produto>`, `<Modulo>` | Substituir pelos nomes reais, uma vez |
| **Notação didática** | `<Entidade>`, `<Feature>`, `<schema>`, `<tabela>`, `<Contexto>`, `<coluna>`… | **Nunca substituir** |

`<Entidade>` aparece 119 vezes e significa "o agregado que você está escrevendo agora" — é parte da
linguagem das skills, não um campo a preencher. Um find-and-replace cego sobre `<...>` transformaria
as 40 skills em lixo. O script já conhece essa fronteira: sua lista de marcadores é exatamente
`Produto` e `Modulo`, e nada deve ser acrescentado a ela.

## Procedimento

**1. Colher os nomes.** Pergunte ao usuário, se ainda não souber:

- **Produto** — o nome do sistema, em PascalCase. Vira o nome da solução (`Contoso.slnx`).
- **Módulo** — o primeiro módulo/contexto, em PascalCase. Vira `Contoso.Vendas.Web`.

Ambos precisam ser PascalCase sem espaço, hífen, ponto ou acento; não podem ser iguais entre si nem
colidir com `System`, `Microsoft`, `Core`, `Data`, `Web`, `Tests`, `Program`, `Startup`. O script
valida e recusa com mensagem explícita — não tente contornar a validação.

**2. Pré-visualizar.** Sempre antes de aplicar:

```bash
node .ai/scripts/init.mjs --produto Contoso --modulo Vendas --dry-run
```

Mostra as ocorrências por arquivo sem gravar nada. Confirme com o usuário.

**3. Aplicar.**

```bash
node .ai/scripts/init.mjs --produto Contoso --modulo Vendas
```

Reescreve `AGENTS.md`, os agentes, as skills afetadas e `.ai/docs/estrutura-arquitetura.md`. Os
symlinks (`CLAUDE.md`, `GEMINI.md`, `.mcp.json`, `.claude/*`) não são seguidos nem tocados —
refletem a mudança automaticamente por serem links.

Rodar de novo é seguro: sem marcadores nem exemplos restantes, o script informa que já foi
parametrizado e não faz nada.

**A documentação de exemplo é removida.** `docs/features/feature-example/` serve ao boilerplate, não
ao produto — ficar num projeto real vira ruído que alguém acaba tomando por feature de verdade. Ao
removê-la, o script:

- cria `docs/features/README.md` registrando o formato esperado do documento de feature e do
  arquivo de regra, para o molde não se perder junto com a pasta;
- reescreve os trechos de `docs/README.md` que apontavam para a pasta, evitando link morto e
  instrução para copiar algo inexistente.

`docs/context/general-vision.md` **não** é removido: é o arquivo que o projeto deve preencher, e o
setup o mantém com o template dentro.

Use `--manter-exemplos` para preservar a pasta — útil apenas se este repositório continuar sendo o
boilerplate.

**4. Definir a paleta.** Os tokens de cor do design system são `#<hex>` — marcador didático, não
paleta real. Enquanto não forem preenchidos, [`tailwind-design`](../tailwind-design/SKILL.md) e os
tokens de ilustração não têm de onde derivar.

Pergunte ao usuário: **já existe cor de marca?**

- **Tem a cor** — ancore a sugestão nela:

  ```bash
  node .ai/scripts/paleta.mjs --marca "#2563EB"
  ```

- **Não tem** — **acione o [`cor-agent`](../../agents/cor-agent.md)**. Ele escolhe a partir do que o
  produto é: setor, público, personalidade da marca e o que os concorrentes usam. Cor escolhida sem
  contexto é chute, e trocar depois custa retrabalho em tokens, ilustração e material de marca.

  Se o usuário preferir resolver rápido, as prontas atendem:

  ```bash
  node .ai/scripts/paleta.mjs --sem-api      # lista azul, verde, violeta, grafite
  node .ai/scripts/paleta.mjs --pronta azul
  ```

- **Quer explorar** — sugestão gerada, sem âncora:

  ```bash
  node .ai/scripts/paleta.mjs
  ```

O script consulta a API do colormind.io e **corrige o contraste**: paleta crua de gerador reprova em
WCAG com frequência, e aplicá-la direto produz design system inacessível. O ajuste mexe na
**luminosidade, nunca no matiz** — matiz é a identidade da marca.

A saída já vem no formato do `@theme`, pronta para colar em
`Features/Shared/Styles/app.css`. Sem rede, `--sem-api` resolve com as paletas prontas.

Para conferir uma paleta que o usuário trouxe pronta:

```bash
node .ai/scripts/paleta.mjs --validar "#2563EB,#FFFFFF,#8C9CB0,#0F172A,#64748B"
```

**5. Criar a solução.** O script imprime os comandos ao final:

```bash
dotnet new sln -n Contoso --format slnx
dotnet new classlib -o src/Contoso.Vendas/Core
dotnet new classlib -o src/Contoso.Vendas/Data
dotnet new mvc      -o src/Contoso.Vendas.Web
```

A partir daqui, a estrutura de pastas e as referências entre projetos são responsabilidade da skill
[`arquitetura-camadas`](../arquitetura-camadas/SKILL.md) — carregue-a para montar as camadas
respeitando `Web → Data → Core`. Não crie pastas vazias antecipadamente: elas nascem com o primeiro
artefato real.

## Depois do setup

Remova esta skill e `.ai/scripts/init.mjs` do projeto gerado — servem ao boilerplate, não ao produto.
Mantenha-os apenas se este repositório continuar sendo o boilerplate.

## Se alguém pedir para escolher tecnologias

Este boilerplate não é um menu. A stack está declarada no [AGENTS.md](../../../AGENTS.md) e sustentada
pelos 7 agentes e 40 skills; desligar uma tecnologia exigiria podar agentes e skills e regenerar a
documentação, e skill sobrevivente desatualizada passa a orientar contra o padrão vigente — pior do
que não ter agente. Se a mudança de stack for real, ela é uma decisão de arquitetura: atualize
`AGENTS.md`, `.ai/docs/estrutura-arquitetura.md` e as skills afetadas na mesma entrega.
