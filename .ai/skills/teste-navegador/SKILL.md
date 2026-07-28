---
name: teste-navegador
description: Verificação de tela no navegador real com o Playwright MCP — reconhecimento antes da ação, checagem dos quatro estados, varredura de overflow nos quatro breakpoints, leitura de erro de console e captura de screenshot. Use ao validar uma tela depois de implementá-la, reproduzir defeito visual relatado, conferir responsividade de fato ou diagnosticar comportamento que o teste de HTML não pega.
agent: tester-agent
---

# Teste no navegador

Complementa [`testes-ui`](../testes-ui/SKILL.md), não substitui. A divisão é simples:

| Pergunta | Ferramenta |
|---|---|
| O HTML saiu com a estrutura certa? | `testes-ui` (HtmlAgilityPack, roda na suíte, é regressão) |
| A tela **funciona** no navegador? | esta skill (Playwright MCP, inspeção manual, não é regressão) |

Nada aqui vira artefato de entrega. Screenshot é descartável, ninguém commita e nenhum CI executa.
Se o comportamento merece proteção permanente, ele vira teste em `testes-ui` ou
[`testes-integracao`](../testes-integracao/SKILL.md).

## Regra de saída

Toda saída — screenshot, trace, PDF, download — vai para `.playwright-mcp/`, ignorada pelo git.
O diretório já é o `--output-dir` do servidor em [`servers.json`](../../mcp/servers.json), então
**passe só o nome do arquivo**: `home-mobile.png`, nunca `../home.png` nem caminho absoluto.
Caminho relativo com `../` escapa do diretório e suja a raiz.

## Reconhecimento antes da ação

O erro que mais custa tempo é escrever interação contra um seletor imaginado. A página renderizada
é a fonte da verdade — o `.cshtml` é só a intenção.

1. `browser_navigate` na URL.
2. `browser_snapshot` — devolve a árvore de acessibilidade com os refs de cada elemento.
3. Só então clique, digite ou afirme, usando os refs que o snapshot devolveu.

Prefira `browser_snapshot` a `browser_take_screenshot` para descobrir estrutura: o snapshot é texto,
custa pouco contexto e traz o nome acessível de cada controle. Screenshot serve para julgar
*aparência* — espaçamento, alinhamento, sobreposição — não para achar seletor.

Se um elemento não aparece no snapshot, ele não está acessível por teclado nem por leitor de tela.
Isso é defeito de acessibilidade, não obstáculo de teste — trate pela
[`acessibilidade-responsivo`](../acessibilidade-responsivo/SKILL.md).

## Os quatro estados

O AGENTS.md exige que toda tela projete carregamento, vazio, erro e permissão. O navegador é onde
isso se prova, porque o caminho feliz é o único que aparece sozinho.

| Estado | Como provocar |
|---|---|
| Carregamento | Estrangule a rede antes de navegar, ou pause a resposta do endpoint |
| Vazio | Usuário sem registro, filtro que não casa com nada, busca sem resultado |
| Erro | Derrube a dependência, force 500, envie formulário inválido |
| Permissão | Sessão sem a role exigida, ou acesso direto à URL sem estar autenticado |

Tela que você só conseguiu ver no caminho feliz não foi verificada — foi visitada.

## Responsividade de verdade

`testes-ui` prova ausência de overflow no HTML. O navegador prova no layout calculado, que é onde
a barra horizontal realmente nasce. Os quatro breakpoints do AGENTS.md, nessa ordem:

```text
browser_resize 320  x 800   → mobile estreito, onde tudo quebra primeiro
browser_resize 768  x 1024  → tablet
browser_resize 1024 x 768   → desktop pequeno
browser_resize 1440 x 900   → desktop
```

Em cada largura, o teste objetivo é uma linha só, via `browser_evaluate`:

```js
() => document.documentElement.scrollWidth - document.documentElement.clientWidth
```

Zero passa. Qualquer positivo é overflow — e o culpado costuma ser tabela larga, palavra sem quebra,
`min-width` esquecido ou imagem sem `max-width`.

Comece sempre por 320px. Corrigir do estreito para o largo é ordem natural do mobile-first;
o contrário obriga a refazer.

## Console e rede

Depois de exercitar a tela, leia o que ela reclamou:

- `browser_console_messages` — erro de JS, aviso de acessibilidade, falha de módulo do Vite.
- `browser_network_requests` — 404 de asset, chamada duplicada, endpoint respondendo 500.

Erro de console não é ruído. Numa aplicação renderizada no servidor com progressive enhancement,
JS quebrado significa que o comportamento adicional morreu silenciosamente e a página *parece* certa.

## Roteiro para reproduzir defeito relatado

Antes de corrigir, reproduza. Corrigir sem reproduzir é adivinhar.

1. Navegue até a tela e reproduza o passo a passo do relato.
2. Confirme o sintoma — screenshot ou o valor que `browser_evaluate` devolveu.
3. Registre a largura, o estado e o caminho exatos que provocam o problema.
4. Corrija.
5. Repita os mesmos passos e prove que sumiu.
6. Escreva o teste automatizado que impede a volta.

O passo 6 é o que transforma inspeção em rede de proteção. Sem ele, o mesmo defeito volta na
próxima alteração e ninguém percebe.

## O que não fazer aqui

- Não use o navegador para conferir regra de negócio — isso é teste unitário de agregado.
- Não substitua a suíte por inspeção manual: o que o MCP faz não roda no CI.
- Não deixe screenshot como evidência de entrega. Se precisa provar, prove com teste.
- Não teste contra produção. Suba o ambiente local.

## Antes de considerar a tela verificada

- [ ] Os quatro estados foram vistos, não presumidos
- [ ] Overflow zero nas quatro larguras
- [ ] Console sem erro
- [ ] Foco visível ao navegar por `Tab`, e a ordem faz sentido
- [ ] O comportamento novo virou teste automatizado
