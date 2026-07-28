# Aparência genérica — o que evitar

Interface gerada sem critério converge para um mesmo visual reconhecível: hero centralizado, degradê
roxo, três cards com ícone em círculo, quatro KPIs que não levam a lugar nenhum. O problema não é
estético. É que essa interface **não diz nada sobre o negócio que ela atende** — poderia ser trocada
pela de qualquer outro produto sem que ninguém percebesse.

Este documento lista os padrões a evitar e o que fazer no lugar. Vale para toda tela, componente e
texto de interface.

A regra que resume todas as outras: **decoração não substitui informação**. Se um elemento não ajuda
o usuário a decidir ou agir, ele não deveria estar na tela.

## Visual

### Efeito de fundo e superfície

- Degradê em roxo, azul ou índigo — cor de destaque virou clichê, e clichê não é identidade.
- Mancha luminosa e desfocada no fundo.
- Brilho ou neon atrás de elemento.
- Glassmorphism: cartão transparente com blur e borda clara. Prejudica contraste sobre fundo variável.
- Borda clara ou brilhante ao redor de card.
- Borda com degradê animado.
- Linha curva, onda e forma abstrata no fundo.
- Grade e ponto decorativo no background.
- Partícula animada no fundo.

**Excesso é a regra que unifica os itens acima:** blur, transparência, degradê, elemento flutuante,
canto arredondado e animação de entrada. Usar neon, glassmorphism, blur, degradê e sombra ao mesmo
tempo é o retrato do visual gerado sem critério.

### Card e superfície

- Card com canto exageradamente arredondado.
- Quantidade excessiva de cards — o card vira papel de parede e perde o sentido de agrupar.
- Card dentro de card: agrupamento dentro de agrupamento não agrupa nada.
- Sombra suave em todos os componentes; sombra deveria indicar elevação real.
- Mesma borda, raio, sombra e espaçamento em tudo — sem contraste, nada se destaca.

### Ícone, badge e botão

- Ícone dentro de quadrado ou círculo colorido — peso visual desproporcional ao que informa.
- Ícone decorativo sem função clara.
- **Emoji como ícone** — o acervo é o Lucide, ver [docs/components/icon.md](../../docs/components/icon.md).
- Badge e pill espalhados pela interface — badge de categoria é **proibido**, ver
  [docs/components/badge.md](../../docs/components/badge.md).
- Botão grande em formato de cápsula.

### Tipografia e composição

- Hero centralizado com selo pequeno, título enorme, palavra em degradê e dois botões: o layout mais
  reproduzido que existe, e não comunica nada específico.
- Título muito grande ocupando quase toda a primeira tela.
- Palavra do título destacada com degradê.
- Texto centralizado em praticamente todas as seções.
- Espaço vazio excessivo entre elementos.
- Sans-serif popular sem hierarquia trabalhada — a fonte não é o problema; a ausência de escala é.
- Falta de contraste entre elemento principal e secundário.

### Ritmo entre seções

- Todas as seções com o mesmo ritmo e a mesma composição.
- Alternância previsível entre fundo claro e escuro.
- Mistura exagerada de estilos visuais modernos.

### Números que se escolhe por caberem

- Seção com exatamente três cards lado a lado — três é o número que se usa quando não se contou.
- Quatro cards de indicador no topo do dashboard.
- Gráfico decorativo ou com dado genérico.
- Barra de progresso sem necessidade.
- Número e métrica grandes demais.

### Imagem e ilustração

- Ilustração 3D flutuante; esfera, cubo e objeto abstrato.
- Mockup de tela inclinado ou flutuando.
- Foto dentro de forma orgânica.
- Pessoa com aparência excessivamente perfeita.
- Avatar genérico agrupado.
- Imagem com estilo, iluminação ou proporção inconsistente — denuncia origem avulsa, sem direção de
  arte.

Ilustração do projeto é desenhada sob os tokens, ver [`ilustracao-svg`](../skills/ilustracao-svg/SKILL.md).

### Prova social fabricada

- Depoimento em carrossel de cards.
- Logo de empresa fictícia em escala de cinza.

Depoimento e logo de cliente **são afirmações sobre o mundo real**. Sem cliente real que autorizou o
uso, não entram — não é questão de estilo, é de não afirmar o que não aconteceu.

A escala tipográfica de 13 tokens e os tokens de cor já existem — usá-los com hierarquia real é o que
separa o produto do genérico. Ver [`tailwind-design`](../skills/tailwind-design/SKILL.md).

## Animação

Microinteração **confirma ação e mudança de estado**. Fora disso, é ruído.

Evitar:

- Card flutuando continuamente.
- Card que sobe e aumenta no hover.
- Brilho acompanhando o cursor.
- Todo elemento crescendo no hover.
- Texto surgindo com o mesmo efeito em todas as seções.
- Excesso de animação de entrada.
- Elemento animado sem relação com uma ação do usuário.
- Partícula animada e borda com degradê animado.
- Parallax aplicado sem necessidade.
- Scroll excessivamente suave ou artificial.

O teste: **essa animação responde a algo que o usuário fez?** Se não, remova.

## Texto de interface

Frases que parecem profissionais e servem para qualquer produto — logo, para nenhum:

> "Transforme sua experiência." · "Potencialize seu negócio." · "Uma solução poderosa e intuitiva." ·
> "Simplifique seu fluxo de trabalho." · "Leve sua produtividade para o próximo nível." ·
> "Experiência perfeita e integrada." · "Revolucione a maneira como você trabalha."

Botão com rótulo vago — "Começar", "Explorar", "Saiba mais" — tem o mesmo problema: não diz o que
acontece ao clicar.

**No lugar:** texto que explica **o que aconteceu, com quem, quando e qual ação é necessária.**

| Genérico | Específico |
|---|---|
| "Saiba mais" | "Ver as 3 medições pendentes" |
| "Algo deu errado" | "Não foi possível salvar: o CNPJ já está cadastrado em outro cliente" |
| "Simplifique seu fluxo" | "Aprove a medição antes do dia 25 para entrar no faturamento do mês" |

Use o **vocabulário real do domínio**. O termo que o usuário fala no telefone é o termo da tela.

## Experiência

Estes são os que mais denunciam interface montada sem uso real:

- Indicador que não leva a nenhuma ação.
- Gráfico criado só para preencher espaço.
- Dado demonstrativo perfeito ou pouco plausível.
- **Ausência de estado de carregamento.**
- **Ausência de estado vazio.**
- **Ausência de tratamento de erro.**
- **Ausência de regra de permissão.**
- Fluxo que mostra apenas o cenário ideal.
- Todas as telas com praticamente a mesma estrutura.

Os quatro em negrito são obrigatórios: **toda tela projeta carregamento, vazio, erro e permissão.**
Tela que só existe no caminho feliz está incompleta e não é entregue.

## Quando o produto começa a parecer genérico

Usar Tailwind, Lucide, card ou canto arredondado **não é problema**. O sinal de alerta é outro:

- Todas as telas usam a mesma sequência de KPIs e cards.
- Ícones aparecem só para ocupar espaço.
- Módulos diferentes — operação, onboarding, clientes, configurações — têm a mesma aparência.
- Os indicadores não representam decisão ou tarefa real.
- Os textos falam só de eficiência e produtividade.
- Os dados exibidos não refletem situação real de cliente.
- Todos os elementos têm o mesmo peso visual.
- A identidade depende apenas de degradê e cor de destaque.

Módulos com propósitos diferentes **devem** parecer diferentes. Uma tela de configuração e um painel
de operação resolvem problemas distintos; espelhar a estrutura dos dois é o atalho que produz o
resultado genérico.

## Como evitar

- Usar o vocabulário real do domínio.
- Apresentar dados, estados, prazos e exceções plausíveis.
- Organizar a interface pela **urgência da tarefa**, não pela simetria da grade.
- Criar componentes adequados a necessidades diferentes, em vez de reaproveitar um só.
- Menos decoração, mais informação operacional.
- Ícone só quando ajuda na identificação ou navegação — ver [docs/components/icon.md](../../docs/components/icon.md).
- Microinteração para confirmar ação e mudança de estado.
- Projetar estado vazio, erro, carregamento e permissão.
- Indicador que conduz a uma ação.
- Hierarquia visual clara — nem tudo dentro de card.

## Checklist antes de entregar uma tela

- [ ] Cada indicador leva a uma ação possível.
- [ ] Estado de carregamento, vazio, erro e sem permissão existem.
- [ ] Os textos citam entidade, prazo ou situação do domínio — não "produtividade".
- [ ] Rótulo de botão diz o que acontece ao clicar.
- [ ] Nada foi adicionado só para preencher espaço.
- [ ] A hierarquia distingue o que é urgente do que é secundário.
- [ ] Esta tela não é a anterior com outros rótulos.
- [ ] Nenhuma animação sem relação com ação do usuário.
- [ ] Os dados de exemplo são plausíveis — incluindo os casos ruins.
- [ ] Nenhum efeito de fundo decorativo: mancha, brilho, partícula, onda, grade de pontos.
- [ ] Sombra e borda indicam elevação real, não enfeitam.
- [ ] Nenhum card dentro de card.
- [ ] Nenhum emoji fazendo papel de ícone.
- [ ] Nenhum depoimento ou logo de cliente que não exista de verdade.
- [ ] Esta seção não tem o mesmo ritmo e composição da anterior.
