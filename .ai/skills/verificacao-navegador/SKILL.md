---
name: verificacao-navegador
description: Verificação de tela no navegador real com o Playwright MCP — inventário de checagem antes de testar, reconhecimento antes da ação, QA funcional e QA visual separados, checagem obrigatória de recorte de viewport em desktop e mobile, leitura de console e orçamento de screenshot. Use ao validar uma tela depois de implementá-la, reproduzir defeito visual relatado, conferir responsividade de fato ou diagnosticar comportamento que o teste de HTML não pega.
agent: frontend-agent
---

# Verificação no Navegador

`testes-ui` prova comportamento com HtmlAgilityPack sobre o HTML renderizado, e é o que fica
versionado. Esta skill cobre o que só existe **depois** do navegador aplicar CSS e rodar o script:
recorte, contraste real, sobreposição, ordem de pintura, overflow, erro de console.

> Screenshot é inspeção descartável, não artefato de entrega. O que prova comportamento é teste
> automatizado. Se a verificação achar um defeito, o teste que o cobre vai para `testes-ui` —
> a imagem não.

## Antes de abrir o navegador — o inventário

Verificação sem lista vira passeio pelo caminho feliz. Antes da primeira ferramenta, escreva o
inventário do que precisa passar, montado de **três** fontes:

1. O que foi pedido — cada requisito da tarefa.
2. O que você de fato implementou — inclusive o que ninguém pediu.
3. **Toda afirmação que você pretende fazer na resposta final.** Se vai dizer "a tabela vira card no
   mobile", isso é um item do inventário.

Cada item precisa virar uma checagem **observável**, não uma impressão:

| Vago | Observável |
|---|---|
| "Ficou responsivo" | Sem overflow horizontal em 320, 768, 1024 e 1440 |
| "O botão está bom" | Ação primária ocupa a largura disponível abaixo de 640px |
| "Acessível" | Foco visível em todo interativo; navegação completa por teclado |
| "A tela está bonita" | Espaçamento consistente; nenhum texto ilegível ou recortado |

Se durante a verificação aparecer um controle ou estado que não estava na lista, **acrescente e
cubra** antes de assinar embaixo.

## O laço — reconhecer, agir, reconhecer de novo

Nunca clique às cegas. O ciclo é sempre:

```text
browser_snapshot  →  escolher o ref  →  ação  →  browser_snapshot de novo
```

- `browser_snapshot` devolve a árvore de acessibilidade **com refs** — é texto, é barato, e é a
  base de quase toda checagem estrutural.
- Refere-se ao elemento pelo `ref` do snapshot mais recente. Depois de navegação, abertura de modal
  ou troca de aba, o ref anterior está velho: tire outro snapshot.
- `browser_evaluate` serve para **medir** (ver adiante) e inspecionar estado. Não é atalho para
  interagir: clique que vale é `browser_click`, digitação é `browser_type` ou `browser_fill_form`.
- Espere antes de inspecionar. DOM lido antes do script rodar mostra a tela errada — use
  `browser_wait_for` até o elemento ou texto esperado aparecer.

## Servidor de desenvolvimento

A tela precisa estar no ar. Suba o servidor em background e derrube ao final:

```powershell
Set-Location src/<Produto>.<Modulo>.Web
npm run dev        # Vite, para HMR de estilo e TypeScript
dotnet run         # a aplicação
```

Se estiver verificando o **build de produção** (manifest com hash, e não o dev server), rode
`npm run build` antes — o TagHelper resolve caminhos diferentes nos dois modos, conforme
[razor-interop](../razor-interop/SKILL.md). Bug de asset costuma aparecer só num deles.

## QA funcional

Separado do visual, e primeiro. Passar aqui **não** prova nada do visual.

- Percorra o inventário, não o que der na cabeça.
- Pelo menos um fluxo crítico de ponta a ponta, com entrada de usuário de verdade.
- Confirme o **resultado visível**, não o estado interno.
- Todo controle visível é exercitado pelo menos uma vez.
- Controle reversível fecha o ciclo: estado inicial → alterado → de volta ao inicial.
- Depois do roteiro, faça uma passada exploratória curta fora do caminho feliz — campo vazio,
  texto longo demais, dois cliques rápidos, voltar do navegador.
- `browser_console_messages` ao final: erro de console é defeito, mesmo com a tela parecendo certa.
- `browser_network_requests` quando algo não carrega — 404 de asset aparece aí antes de aparecer na
  tela.

## QA visual

- Olhe o **viewport inicial antes de rolar**. Se o que a tela promete não é perceptível ali, é bug.
- **Presença não é implementação.** Elemento que existe no DOM mas está com contraste fraco,
  encoberto, recortado ou instável é falha visual, não sucesso.
- Inspecione o **estado mais denso que conseguir alcançar** — lista cheia, nome longo, valor grande.
  Tela vazia esconde quase todo defeito de layout.
- Verifique pelo menos um estado **pós-interação**: menu aberto, modal, linha selecionada.
- Os quatro estados obrigatórios do repositório — carregamento, vazio, erro e permissão — têm cada
  um a sua olhada.
- Procure especificamente: recorte, overflow, distorção, desalinhamento, espaçamento inconsistente,
  texto ilegível, contraste fraco, empilhamento errado.
- Julgue também a qualidade: a tela precisa parecer intencional e coerente, não só funcionar
  ([design-intencional](../design-intencional/SKILL.md)).

## Recorte de viewport — obrigatório

Antes de assinar, prove que a vista inicial cabe. Em cada breakpoint que importa:

```text
browser_resize 1440x900   →  snapshot  →  medir  →  screenshot se preciso
browser_resize 1024x768   →  ...
browser_resize 768x1024   →  ...
browser_resize 320x640    →  ...
```

A medida, via `browser_evaluate`:

```javascript
() => ({
  innerWidth: window.innerWidth,
  clientWidth: document.documentElement.clientWidth,
  scrollWidth: document.documentElement.scrollWidth,
  temScrollHorizontal:
    document.documentElement.scrollWidth > document.documentElement.clientWidth,
})
```

Duas regras que não se quebram:

1. **O screenshot manda na métrica.** Recorte visível na imagem é defeito a resolver — número
   limpo não anula o que se vê. Quando os dois discordam, investigue antes de assinar.
2. **Métrica de documento não basta.** Contêiner de altura fixa, painel interno e `overflow: hidden`
   recortam a UI com o scroll da página parecendo perfeito. Onde o recorte é risco real, meça a
   região com `getBoundingClientRect()`, não só o documento.

Rolar é aceitável quando a tela foi feita para rolar **e** a vista inicial já comunica o essencial e
expõe a ação primária. Não é aceitável como remédio para conteúdo que deveria caber.

Uma sessão MCP tem um contexto só: desktop e mobile são verificados **em sequência** com
`browser_resize`, não em paralelo. E `browser_resize` não emula toque nem densidade de pixel — alvo
de toque e comportamento de `hover` no mobile não saem daí.

## Orçamento de screenshot

Cada imagem custa contexto. Não capture item a item do inventário.

| Use | Ferramenta |
|---|---|
| Estrutura, texto, presença de elemento, rótulo, aria | `browser_snapshot` — texto, barato |
| Número de layout, overflow, medida de região | `browser_evaluate` |
| Recorte, contraste, sobreposição, ordem de pintura, "está feio" | `browser_take_screenshot` |

Prefira screenshot de **viewport** para o signoff; `full_page` é artefato secundário de depuração.
Se houver animação, espere assentar antes de capturar — imagem no meio da transição não conclui
nada.

**Saída sempre em `.playwright-mcp/`**, que é ignorada pelo git. Passe **só o nome do arquivo**
(`home-mobile.png`) — nunca caminho absoluto, nunca `../`. O `--output-dir` do
[servers.json](../../mcp/servers.json) resolve o resto.

## Signoff

Só declare pronto quando:

- [ ] O inventário foi percorrido inteiro, e o que ficou de fora está dito explicitamente.
- [ ] O fluxo crítico passou com entrada de usuário real.
- [ ] Funcional e visual passaram **cada um por si** — um não implica o outro.
- [ ] O recorte de viewport passou em desktop e no menor breakpoint suportado.
- [ ] Toda afirmação que você vai escrever na resposta foi verificada no estado em que ela vale.
- [ ] A passada exploratória aconteceu, e você diz o que ela cobriu.
- [ ] `browser_console_messages` sem erro.
- [ ] `browser_close` ao final, ou a sessão fica viva de propósito.

E feche com **confirmação negativa**: diga quais classes de defeito você procurou e não encontrou.
"Verifiquei overflow nos quatro breakpoints, foco em todos os interativos e os quatro estados; não
achei recorte nem erro de console" vale muito mais que "está tudo certo".

Se algo falhou, reporte a saída real. Nunca declare sucesso sem ter verificado.

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| "Testei e está ok" sem detalhe | Sem inventário; passeio pelo caminho feliz | Escrever a lista antes de abrir o navegador |
| Clique em elemento errado | `ref` de snapshot velho | Novo `browser_snapshot` após navegação ou modal |
| DOM lido antes da hora | Inspeção sem espera | `browser_wait_for` no elemento esperado |
| Overflow "não existe" mas a tela corta | Só mediu o documento | `getBoundingClientRect()` na região |
| Contexto estourado de imagens | Screenshot por item | Snapshot para estrutura; imagem só para o visual |
| Screenshot na raiz do repositório | Caminho absoluto passado à ferramenta | Só o nome do arquivo; `.playwright-mcp/` cuida do resto |
| Defeito volta depois de corrigido | Verificação virou o teste | Cobrir em `testes-ui`; screenshot não versiona |
