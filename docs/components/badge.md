# Badge

**Badge de categoria não é usado neste projeto.** Nem a pílula de rótulo, nem a variante com dot
colorido. Não existe TagHelper, partial ou classe utilitária para ela — a ausência é deliberada.

Isto vale para o padrão abaixo, em qualquer tela:

```text
┌──────────────────────────┐
│ ● ORÇAMENTO · PILAR 1    │   ← não fazer
└──────────────────────────┘
   Catálogo de Insumos
   Materiais, mão-de-obra e equipamentos…
```

Os dois formatos estão proibidos:

| Formato | Exemplo | Situação |
|---|---|---|
| Badge de categoria | `ORÇAMENTO · PILAR 1` em pílula | Proibido |
| Badge com dot indicator | o mesmo, com `●` colorido antes | Proibido |

Sinônimos que aparecem em referência de design e valem a mesma regra: *pill*, *chip*, *tag*,
*eyebrow*, *kicker*, *category label*, *status dot*.

## Por que

- **Ruído acima do título.** A pílula compete com o `<h*>` pela primeira fixação do olho e atrasa a
  leitura do que a tela realmente é.
- **Redundância.** A categoria quase sempre já está no menu lateral, no breadcrumb ou no próprio
  título. Repetir em pílula não informa — decora.
- **Cor sem significado.** O dot colorido sugere estado (ativo, erro, pendente) onde só existe
  agrupamento. Quem lê aprende a ignorar a cor, e aí ela deixa de funcionar onde importa de verdade.
- **Maiúscula com espaçamento.** O tratamento típico (`uppercase` + `tracking-wide` + corpo pequeno)
  é o pior caso de legibilidade da escala tipográfica e o primeiro a quebrar em tela estreita.
- **Fuga da escala.** A pílula precisa de tamanho, peso e cor próprios que não existem nos 13 tokens
  tipográficos, e cada tela acaba inventando o seu.

## O que fazer no lugar

| Intenção | Solução |
|---|---|
| Dizer onde o usuário está | Breadcrumb e item ativo no menu — [`page.md`](page.md) |
| Dar contexto ao título | Uma linha de descrição abaixo do `<h*>`, em `text-neutral-500` |
| Indicar ordem (`Pilar 1`) | Numeração no próprio título: `1. Catálogo de Insumos` |
| Agrupar cards afins | Um `<section>` com cabeçalho único, não uma pílula repetida por card |

## Estado é outra coisa

Estado real de um registro — *Ativo*, *Vencido*, *Aguardando pagamento* — continua permitido e
**não** é badge de categoria. Ele varia por linha, muda com o tempo e a cor carrega significado.
Mora na coluna de status da tabela ([`table.md`](table.md)) e segue o contraste e o texto alternativo
exigidos em
[`acessibilidade-responsivo`](../../.ai/skills/acessibilidade-responsivo/SKILL.md) — cor nunca é o único
portador da informação.

Se a dúvida for "isso é estado ou rótulo?", o teste é: **o valor pode mudar sozinho amanhã?** Se não
pode, é categoria — e não entra.
