# Regras de negócio

> **Template do boilerplate.** Preencha ao implementar e remova este aviso.

## O que é uma regra de negócio aqui

Uma afirmação do negócio que o sistema precisa garantir **sempre**, independentemente de por onde a
operação entrou. Se a afirmação só vale "quando o usuário usa a tela", não é regra de negócio: é
conveniência de interface.

Essa distinção decide onde a regra mora.

## Regra fixa do boilerplate — a regra é garantida no domínio

**Toda regra de negócio é garantida no `Core`, no agregado, e não apenas validada na tela.**

A validação de tela existe e é bem-vinda — ela dá feedback rápido e evita ida ao servidor. Mas ela é
**redundância de conveniência**, nunca a garantia. Formulário pode ser burlado, importação em lote
não passa por tela, job de madrugada não tem usuário, e a próxima integração vai chamar o serviço
direto. A única barreira que resiste a todos esses caminhos é o construtor e os métodos de mutação do
agregado, que se recusam a produzir estado inválido.

Consequência de desenho: se a regra é impossível de expressar no agregado, quase sempre a fronteira
do agregado está errada — não é motivo para movê-la para o Controller.

O agregado expõe a regra de duas formas:

- **Invariante** — lançada como exceção de domínio na operação que a violaria, com a mensagem em
  constante pública (`Msg<Campo>Obrigatorio`), para o teste asseverar sem duplicar string.
- **Propriedade de decisão** — `Eh<Condicao>` calculada, para o serviço consultar sem reimplementar
  a regra.

## Regra fixa do boilerplate — o identificador `RN-*` vive só na documentação

O identificador (`RN-1`, `RN-COBRANCA-4`) existe para **rastreabilidade entre documentos e
conversas**: permite dizer "quebrei a RN-7" sem repetir o enunciado inteiro.

Ele **nunca** aparece em código, mensagem de erro, constante, view, TypeScript, log ou nome/assert de
teste. Mensagem de erro descreve o quê e o porquê em linguagem de domínio — o usuário não conhece a
numeração da nossa documentação, e o identificador cria acoplamento frágil entre a numeração da doc
e o runtime.

O identificador é **estável**: uma vez atribuído, não é reaproveitado nem renumerado. Regra revogada
fica registrada como revogada, com data e motivo — nunca some da lista, senão a referência histórica
em PRs e commits antigos aponta para outra coisa.

Não confundir com dados reais do negócio (número de contrato, código de norma externa, centro de
custo), que são domínio legítimo e devem ser preservados no código.

## Formato de uma regra

*Cada regra recebe uma seção própria com os seis blocos abaixo. Bloco vazio é sinal de que a regra
não foi entendida, não de que "não se aplica" — escreva "nenhuma" explicitamente quando for o caso.*

| Bloco | O que escrever | Critério |
|---|---|---|
| **Enunciado** | Uma frase imperativa, no presente, sem condicional vago | Alguém do negócio lê e concorda ou discorda; "deve ser adequado" não é enunciado |
| **Por quê / origem** | A razão e a fonte: decisão comercial, exigência legal, limitação operacional | Sem origem, ninguém consegue julgar se a regra ainda vale daqui a um ano |
| **Casos que viram teste** | Entradas concretas e o resultado esperado, **incluindo os dois lados do limite** | Se o limite é 30 dias, tem caso de 30 e caso de 31; um lado só não prova a fronteira |
| **Exceções** | Quem escapa da regra e sob qual condição | Exceção não escrita vira `if` inexplicado no código seis meses depois |
| **Impacto** | Qual agregado garante a invariante, e qual método a aplica | É o que liga a regra ao código — sem isso a regra é literatura |
| **Situação** | Vigente, planejada ou revogada (com data e motivo) | Regra revogada permanece na lista; o identificador nunca é reaproveitado |

## Índice das regras

*Uma linha por regra vigente ou revogada. Ordene pelo identificador, não por relevância — a lista
serve para localizar, e a numeração é o que se cita em PR e commit.*

| Id | Enunciado resumido | Agregado que garante | Situação |
|---|---|---|---|
| *(exemplo — substituir)* RN-1 | Assinatura em teste expira em 14 dias corridos a partir da criação | `Assinatura` | Vigente |
| *(exemplo — substituir)* RN-2 | Assinante inadimplente não cria novos Usuários | `Assinante` | Vigente |

## Exemplo de regra detalhada — substituir

### RN-1 — Assinatura em teste expira em 14 dias corridos

**Enunciado.** A assinatura criada em modalidade de teste expira 14 dias corridos após a data de
criação, e a partir da expiração não permite acesso às funcionalidades pagas.

**Por quê / origem.** Decisão comercial de 2026-02, registrada na ata de definição do plano de
entrada. Prazo escolhido para cobrir dois ciclos semanais de uso sem exigir cartão na entrada.

**Casos que viram teste.**

| Cenário | Entrada | Resultado esperado |
|---|---|---|
| Dentro do prazo | Criada há 13 dias | Acesso permitido |
| No limite | Criada há exatamente 14 dias | Acesso permitido — o 14º dia ainda é de teste |
| Fora do prazo | Criada há 15 dias | Acesso negado, expirada |
| Convertida antes de expirar | Criada há 10 dias, pagamento confirmado | Deixa de ser teste; a regra não se aplica |

**Exceções.** Assinatura de conta interna de demonstração não expira. A exceção é uma propriedade do
próprio agregado, não um `if` no serviço.

**Impacto.** `Assinatura` garante a invariante. `Assinatura.EhTesteExpirado` calcula a decisão e
`Assinatura.RegistrarAcesso` recusa a operação quando expirada, com a mensagem em
`Assinatura.MsgTesteExpirado`. Contagem em dias corridos sobre `DateTimeOffset` em UTC.

**Situação.** Vigente.

## Manutenção

- Regra alterada é alterada aqui **e** no agregado, na mesma entrega — doc e código divergentes
  significam que ninguém sabe qual vale.
- Regra sem teste correspondente é uma intenção, não uma garantia; o caso de limite é o teste que
  mais frequentemente falta.
- Ao revogar, mantenha a seção com `Situação: Revogada em <data> — <motivo>` e remova o código que a
  aplicava na mesma entrega.
