# Componentes

Catálogo dos componentes de interface do projeto. Cada arquivo descreve um componente: quando usar,
como usar e o que não fazer.

## Regra obrigatória — todo componente é responsivo

**Nenhum componente entra no projeto sem funcionar em mobile, tablet e desktop.** Não existe
componente "só de desktop", nem versão mobile adiada para depois. Um componente que só funciona em
uma faixa de largura está incompleto e não é entregue.

Isso vale para todo artefato desta pasta e para qualquer partial, view ou trecho de Razor que
componha tela.

### As três faixas

| Faixa | Referência | O que precisa estar resolvido |
|---|---|---|
| Mobile | 320–767px | Uma coluna, ação primária em largura total, alvo de toque de ~44px |
| Tablet | 768–1023px | Grade intermediária, sem espremer duas colunas de desktop |
| Desktop | 1024px+ | Layout pleno, largura máxima limitada para não esticar a linha de texto |

**Mobile-first, sempre.** O estilo base é o da tela estreita; os breakpoints do Tailwind adicionam a
partir dele — `grid-cols-1 md:grid-cols-2`, nunca o caminho inverso.

### Validação antes de entregar

Toda alteração visual é conferida nas quatro larguras: **320px, 768px, 1024px e 1440px**.

Em nenhuma delas pode haver:

- rolagem horizontal na página;
- texto ou controle cortado, sobreposto ou fora da viewport;
- alvo de toque menor que ~44px de altura efetiva no mobile;
- foco de teclado invisível.

A técnica de cada caso — tabela extensa, grade de formulário, modal, menu, overflow — está em
[`acessibilidade-responsivo`](../../.ai/skills/acessibilidade-responsivo/SKILL.md), que é normativa.
Este README fixa a obrigação; a skill diz como cumprir.

### Responsivo e acessível andam juntos

A mesma passagem que valida largura valida contraste, `aria`, navegação por teclado e foco visível.
Não se entrega um sem o outro — a checagem é uma só, na mesma skill.

## Nada de visual genérico

Componente não carrega decoração: sem degradê de fundo, glassmorphism, sombra sem elevação real,
borda brilhante, card dentro de card ou ícone só para ocupar espaço. Cada componente projeta seus
estados de carregamento, vazio, erro e sem permissão.

A lista completa do que evitar, e o checklist antes de entregar uma tela, está em
[.ai/docs/aparencia-generica.md](../../.ai/docs/aparencia-generica.md).

## Catálogo

| Componente | Arquivo |
|---|---|
| Alerta | [alert.md](alert.md) |
| Badge | [badge.md](badge.md) — **proibido**: badge de categoria e dot indicator |
| Botão | [button.md](button.md) |
| Card | [card.md](card.md) |
| Cabeçalho | [header.md](header.md) |
| Estado vazio | [empty-state.md](empty-state.md) |
| Ícone | [icon.md](icon.md) |
| Input | [input.md](input.md) |
| Menu | [menu.md](menu.md) |
| Multi-select | [multi-select.md](multi-select.md) |
| Página | [page.md](page.md) |
| Paginação | [pagination.md](pagination.md) |
| Indicador | [stat.md](stat.md) |
| Select | [select.md](select.md) |
| Tabela | [table.md](table.md) |
| Tabs | [tabs.md](tabs.md) |
| Toast | [toast.md](toast.md) |
| Menu do usuário | [user-menu.md](user-menu.md) |
