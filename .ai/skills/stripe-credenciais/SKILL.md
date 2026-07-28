---
name: stripe-credenciais
description: Tutoria passo a passo das ações manuais no Stripe que só o usuário pode fazer — criar conta, achar as chaves no dashboard, instalar e autenticar a Stripe CLI, obter o whsec_ local e o de produção, criar produtos e preços, preencher o .env e validar que funcionou. Use ao iniciar a integração, quando faltar chave, quando der erro de autenticação ou assinatura inválida, ou quando o usuário perguntar onde conseguir algum token.
agent: stripe-agent
---

# Credenciais e ações manuais no Stripe

Parte da integração **não pode ser feita por você**: criar conta, aceitar termos, gerar chave, criar
produto no dashboard. Esta skill é o roteiro para guiar o usuário nessas etapas.

## Como conduzir

- **Uma etapa por vez.** Peça a confirmação antes de seguir. Despejar dez passos de uma vez faz a
  pessoa se perder e pular o que importa.
- **Diga onde clicar**, não só o que fazer. "Dashboard → Developers → API keys" resolve; "pegue sua
  chave" não.
- **Nunca peça a chave secreta no chat.** Peça para o usuário colar no `.env` dele. Se ele colar
  mesmo assim, avise que a chave deve ser considerada comprometida e rotacionada.
- **Confirme o formato, não o valor.** "Começa com `sk_test_`?" é verificação suficiente.
- Se algo falhar, vá para a tabela de diagnóstico no fim desta skill antes de teorizar.

## Etapa 1 — Conta e modo de teste

1. Criar conta em <https://dashboard.stripe.com/register> (ou entrar numa existente).
2. Confirmar que está em **modo de teste**: há um seletor de ambiente no topo do dashboard. Em teste,
   nenhum cartão é cobrado de verdade.
3. Ativar a conta para produção **só quando for cobrar de verdade** — exige dados da empresa, conta
   bancária e verificação de identidade, e leva tempo. Desenvolvimento inteiro roda em modo de teste.

**Não é preciso ativar a conta para começar a desenvolver.** Se o usuário estiver travado na
verificação, siga em modo de teste.

## Etapa 2 — Chaves da API

**Dashboard → Developers → API keys** (<https://dashboard.stripe.com/test/apikeys>)

Duas chaves interessam:

| Chave | Formato | Onde vive | Pode aparecer no cliente? |
|---|---|---|---|
| Publicável | `pk_test_…` | Front-end | **Sim** — é feita para isso |
| Secreta | `sk_test_…` | Servidor, variável de ambiente | **Nunca** |

Peça ao usuário para copiar a **secreta** e colar no `.env` dele:

```bash
Stripe__SecretKey=sk_test_...
Stripe__PublishableKey=pk_test_...
```

Formato `Secao__Chave` porque o .NET lê como configuração — ver
[`configuracao.md`](../../docs/configuracao.md).

**Diferença que importa entre teste e produção:**

- Em **teste**, todas as chaves ficam visíveis no dashboard o tempo todo.
- Em **produção**, a chave secreta é exibida **uma única vez**, no momento da criação. Se perder,
  não há como recuperar — só rotacionar. Avise isso **antes** de o usuário fechar a tela.

Se a política de segurança exigir, prefira **chave restrita** (`rk_…`), com apenas as permissões
necessárias, em vez da secreta irrestrita. É o que o Stripe recomenda hoje.

## Etapa 3 — Stripe CLI

Necessária para testar webhook local. Sem ela, não há como o Stripe alcançar `localhost`.

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Qualquer sistema, via npm
npm install -g @stripe/cli

# Autenticar (abre o navegador para confirmar)
stripe login

# Conferir
stripe --version
```

Se o `brew` falhar ou o usuário estiver no Windows sem scoop, o `npm` resolve em qualquer sistema.

## Etapa 4 — Segredo do webhook local

Este é o passo que mais gera confusão. **São dois segredos diferentes** com o mesmo prefixo.

Com a aplicação rodando, num terminal separado:

```bash
stripe listen --forward-to https://localhost:5001/webhooks/stripe
```

A saída traz o segredo **desta sessão**:

```text
> Ready! Your webhook signing secret is whsec_a1b2c3...
```

Vai para o `.env`:

```bash
Stripe__WebhookSecret=whsec_a1b2c3...
```

**Deixe o `stripe listen` rodando** enquanto desenvolve — fechar o terminal interrompe a entrega dos
eventos. E o segredo **muda a cada nova sessão** em algumas versões: se a assinatura começar a
falhar do nada, confira se o `whsec_` do `.env` ainda é o que o CLI está mostrando.

## Etapa 5 — Testar que funciona

Com a aplicação e o `stripe listen` rodando, em outro terminal:

```bash
stripe trigger checkout.session.completed
stripe trigger invoice.payment_failed
```

O que deve acontecer: o terminal do `listen` mostra o evento e a resposta `200` do seu endpoint; a
aplicação registra o processamento.

**Teste também a idempotência** — reenvie o mesmo evento e confirme que nada acontece duas vezes:

```bash
stripe events resend <evt_id>
```

Cartões de teste, no checkout:

| Número | Resultado |
|---|---|
| `4242 4242 4242 4242` | Aprovado |
| `4000 0000 0000 0002` | Recusado |
| `4000 0025 0000 3155` | Exige autenticação 3-D Secure |

Qualquer validade futura e qualquer CVC. Lista completa: <https://docs.stripe.com/testing>.

## Etapa 6 — Produtos e preços

Preço é decisão de negócio e muda sem deploy: crie no dashboard, não em código.

**Dashboard → Product catalog → Add product**

Para cada plano definido na [`stripe-descoberta`](../stripe-descoberta/SKILL.md):

1. Nome e descrição do produto.
2. Um preço por ciclo: mensal e anual são **dois preços** do mesmo produto.
3. Recorrente, com o intervalo correto.
4. Copiar o `price_…` de cada um.

No `.env` ou `appsettings.json` — como não é segredo, pode ir versionado:

```json
{
  "Stripe": {
    "Precos": {
      "ProMensal": "price_1AbC...",
      "ProAnual": "price_1DeF..."
    }
  }
}
```

Os identificadores de teste e de produção **são diferentes**. Cada ambiente tem os seus.

## Etapa 7 — Webhook de produção

Só quando for para o ar, e a URL precisa ser pública (não `localhost`).

**Dashboard → Developers → Webhooks → Add endpoint**

1. URL: `https://seudominio.com/webhooks/stripe`
2. Selecionar **apenas** os eventos tratados — a lista está em
   [`stripe-webhooks`](../stripe-webhooks/SKILL.md).
3. Após criar, abrir o endpoint e revelar o **signing secret**.

Esse `whsec_` é **diferente** do que o `stripe listen` gera. Ele vai para a variável de ambiente do
servidor de produção — App Service Application Settings, Key Vault ou equivalente. Nunca no
`appsettings.json`.

## Resumo do que o usuário precisa obter

| Valor | Onde | Segredo? |
|---|---|---|
| `pk_test_…` | Developers → API keys | Não |
| `sk_test_…` | Developers → API keys | **Sim** |
| `whsec_…` local | Saída do `stripe listen` | **Sim** |
| `whsec_…` produção | Developers → Webhooks → endpoint | **Sim** |
| `price_…` | Product catalog | Não |

## Se a chave vazar

Ordem correta, sem inverter:

1. **Rotacione primeiro**, em Developers → API keys → Roll key. A chave antiga segue válida por até
   7 dias, então dá para migrar sem derrubar o serviço.
2. Atualize a variável de ambiente em todos os ambientes.
3. Confirme nos logs de requisição do dashboard que o uso da chave antiga zerou.
4. Expire a antiga.
5. Só então limpe o histórico do git, se ela foi commitada.

Limpar o histórico antes de rotacionar é ordem errada: a chave já esteve exposta e pode ter sido
copiada. Ver [`segredos-configuracao`](../segredos-configuracao/SKILL.md).

## Diagnóstico

| Sintoma | Causa provável | Verificação |
|---|---|---|
| `Invalid API Key provided` | Chave errada ou de outro ambiente | Começa com `sk_test_`? É da conta certa? |
| Assinatura de webhook inválida | `whsec_` do CLI vs. do dashboard | O `.env` tem o que o `stripe listen` mostrou? |
| Assinatura falha só em produção | Segredo local usado em produção | Produção usa o `whsec_` do endpoint |
| Webhook não chega | `stripe listen` não está rodando | Terminal aberto? URL e porta corretas? |
| `No such price` | `price_…` de outro ambiente | Teste e produção têm ids distintos |
| Cobrança real em desenvolvimento | Chave `sk_live_` no `.env` | Trocar para `sk_test_` **imediatamente** |
| Chave secreta sumiu do dashboard | Produção só exibe uma vez | Rotacionar e guardar a nova |

## Checklist

- [ ] Conta criada; modo de teste ativo.
- [ ] `sk_test_` e `pk_test_` no `.env`, nunca commitados.
- [ ] Stripe CLI instalada e autenticada (`stripe login`).
- [ ] `stripe listen` rodando; `whsec_` no `.env`.
- [ ] `stripe trigger` entrega evento e o endpoint responde 200.
- [ ] Reenvio do mesmo evento não duplica efeito.
- [ ] Produtos e preços criados; `price_…` na configuração.
- [ ] Produção: endpoint criado, `whsec_` próprio, chave live só no servidor.
