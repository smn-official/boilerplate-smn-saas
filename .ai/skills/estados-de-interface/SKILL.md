---
name: estados-de-interface
description: Os cinco estados que toda superfície de dados precisa renderizar — carregando, vazio, erro, populado e extremo — com composição de estado vazio e de erro, limiares de indicador de carregamento, estados de formulário durante o submit, retry com backoff e anúncio de mudança de estado por ARIA e foco. Use ao criar listagem, tabela, formulário, painel ou busca, ao revisar tela que só mostra o caminho feliz, ou ao diagnosticar spinner infinito e formulário que apaga o que o usuário digitou.
agent: frontend-agent
---

# Estados de Interface

A falha mais confiável de tela gerada por IA é entregar **apenas o estado populado** — a tela que o
design imaginou, sem a tela que o usuário encontra no primeiro acesso, na busca sem resultado ou na
falha de rede. Estado não é exceção do layout: é parte do layout.

Nesta arquitetura a view é renderizada no servidor: a maioria dos estados nasce na **View**, decidida
por flag já resolvida na ViewModel (convenção do [feature-web](../feature-web/SKILL.md)). O estado de
carregamento se aplica ao que o TypeScript enriquece — submit de formulário, busca dinâmica, painel
que atualiza — nunca à montagem da página, que já chega pronta do servidor.

## Os cinco estados obrigatórios

Toda superfície que exibe, transforma ou aceita dados renderiza os cinco:

| Estado | Quando | Precisa conter |
|---|---|---|
| **Carregando** | Requisição em andamento (submit, AJAX) | Indicador conforme a [tabela de limiares](#carregando--indicador-conforme-a-duração); aviso "demorando mais que o esperado" aos 15s |
| **Vazio** | Sem registros ainda, ou busca sem resultado | Título, explicação simples, ação primária |
| **Erro** | Falha de requisição ou validação rejeitada | Causa em linguagem clara, ação de recuperação, entrada do usuário preservada |
| **Populado** | Dados presentes — o caso primário | A tela que foi de fato desenhada |
| **Extremo** | Volume alto, texto longo, campo opcional ausente | Layout que não quebra |

Cenários extremos concretos que a superfície precisa sobreviver antes de entregar:

| Superfície | Cenário |
|---|---|
| Tabela / listagem | Milhares de linhas paginadas, ordenação e filtro aplicados ao mesmo tempo |
| Card / lista mobile | Título de 200 caracteres, imagem ausente, ação secundária ausente |
| Formulário | Todos os opcionais vazios; todos os obrigatórios no tamanho máximo |
| Busca | Consulta de um caractere, só caracteres especiais, milhares de resultados |
| Detalhe | Todos os metadados opcionais ausentes |

## Vazio — um estado com trabalho próprio

Vazio não é ausência de conteúdo; cada variante tem um trabalho:

| Variante | Trabalho | Composição |
|---|---|---|
| **Primeiro uso** | É o momento de onboarding | Título + frase de valor + ação primária |
| **Busca sem resultado** | Destravar a próxima tentativa | Ecoar o termo buscado + sugerir alternativa — nunca um branco literal |
| **Tudo concluído** | Reconhecer o progresso | Frase de conclusão + próxima ação opcional |

**Erro nunca vira vazio.** "Nenhum resultado" quando a requisição falhou mente para o usuário — erro
tem estado próprio, com informação de recuperação.

A decisão de qual variante exibir é da ViewModel, nunca da View:

```html
@if (Model.ExibirEstadoVazio)
{
    <section class="mx-auto max-w-md py-16 text-center">
        <h2 class="text-lg font-semibold">Nenhum cliente ainda</h2>
        <p class="mt-2 text-texto-suave">Cadastre o primeiro cliente para começar a faturar.</p>
        <a href="@Url.Action(nameof(<Entidade>Controller.Novo))"
           class="mt-6 inline-block rounded-md bg-acento px-4 py-2 text-superficie">
            Cadastrar cliente
        </a>
    </section>
}
```

## Erro — três perguntas, nesta ordem

Toda mensagem de erro responde:

1. **O que aconteceu.** "O pagamento foi recusado." — nunca "Algo deu errado."
2. **Por quê, se souber.** "Saldo insuficiente." ou "Sem conexão — verifique a rede."
3. **O que o usuário pode fazer.** Botão de repetir, caminho alternativo ou contato de suporte.

A severidade define a superfície — nunca use uma acima do necessário:

| Nível | Apresentação |
|---|---|
| Campo | Borda de erro + mensagem inline + foco movido para o campo |
| Formulário | Resumo no topo + marcação por campo |
| Seção | Painel inline com repetir; o resto da tela continua funcional |
| Página | Estado de erro completo com ação de recuperação |

- **A entrada do usuário sobrevive ao erro.** No MVC isso é devolver a View com o model preenchido
  quando `ModelState` é inválido — padrão do [validacao-entrada](../validacao-entrada/SKILL.md). O
  formulário que limpa os campos no erro força redigitação e perde o usuário.
- Mapeamento de exceção, página `/erro` e identificador de correlação são do
  [tratamento-erro-global](../tratamento-erro-global/SKILL.md) — esta skill cuida só da composição
  visual do estado.
- **Disciplina de repetição** em requisição AJAX: primeira tentativa imediata no clique; segunda e
  terceira com backoff (2s, 4s); após 3 falhas, trocar "Repetir" por contato de suporte com o
  identificador de correlação copiável.

## Carregando — indicador conforme a duração

Escolha o indicador pela duração esperada, não pelo que é fácil de fazer:

| Duração esperada | Indicador |
|---|---|
| 0–300ms | Nenhum — o usuário não percebe o atraso |
| 300ms–2s | Spinner discreto ou skeleton |
| 2–10s | Skeleton com o formato do conteúdo esperado, ou spinner rotulado ("Carregando pagamentos…") |
| 10s+ | Barra de progresso com opção de cancelar |
| 60s+ | Parar a animação e exibir erro com repetir |

- **Nenhum spinner roda para sempre.** Toda requisição do TypeScript nasce com timeout; aos 15s
  aparece o aviso de demora, aos 60s vira erro.
- Skeleton pulsa até o conteúdo chegar — nunca indefinidamente.
- Carregamento de uma seção não bloqueia a página: o chrome e as demais seções continuam usáveis.

## Formulário durante o submit

Três estados além dos cinco:

| Estado | Quando | Comportamento |
|---|---|---|
| **Intocado** | Campo nunca recebeu foco | Estilo padrão, nenhuma mensagem de validação |
| **Alterado válido** | Usuário digitou e o campo passa | Texto de ajuda permanece; sem pintar de verde |
| **Submit pendente** | Enviado, aguardando o servidor | Botão em estado de carregamento e desabilitado contra duplo clique |

Validação no cliente é **melhoria progressiva** sobre a validação do servidor, nunca substituta
(regra do [validacao-entrada](../validacao-entrada/SKILL.md)). Quando o TypeScript a adicionar:
validar no `blur`, não a cada tecla; após o primeiro `blur`, revalidar a cada tecla e remover a
mensagem no instante em que a entrada ficar válida.

## ARIA e foco na mudança de estado

Mudança de estado precisa ser anunciada e focada — o detalhamento de foco e navegação é do
[acessibilidade-responsivo](../acessibilidade-responsivo/SKILL.md); esta tabela cobre o recorte de
estados:

| Mudança | ARIA | Foco |
|---|---|---|
| Erro inline no submit | `role="alert"` na mensagem | Move para o primeiro campo com erro |
| Confirmação não urgente (toast) | `role="status"` | Não move |
| Erro crítico ou confirmação destrutiva | `role="alertdialog"` | Move para o diálogo |
| Início de carregamento | `role="status"` ("Carregando…") | Não move para o spinner |
| Conteúdo carregado por ação do usuário | — | Move para o conteúdo novo |

O contêiner de live region **existe no DOM antes** de receber conteúdo — injetar `aria-live` junto
com a mensagem não dispara o anúncio.

## Antes de entregar

- [ ] Toda listagem, tabela, formulário e painel renderiza os cinco estados — teste trocando as
      flags da ViewModel.
- [ ] O estado vazio tem título, explicação e ação; a variante certa para o contexto.
- [ ] Toda mensagem de erro responde às três perguntas; nenhuma diz só "algo deu errado".
- [ ] Formulário preserva a entrada do usuário após erro de validação.
- [ ] Nenhum spinner sem timeout; aviso de demora aos 15s.
- [ ] Submit desabilita o botão contra duplo envio.
- [ ] Erro não é comunicado só por cor — tem ícone ou texto junto.
- [ ] Mudanças de estado anunciadas conforme a tabela de ARIA e foco.
