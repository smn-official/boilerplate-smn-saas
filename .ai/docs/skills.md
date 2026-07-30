# Mapa de skills

As 50 skills vivem num namespace plano em [../skills/](../skills/) — exigência do
`.claude/skills/`. Este arquivo registra a qual agente cada uma pertence; a mesma informação
está no campo `agent:` do frontmatter de cada `SKILL.md`.

Um agente carrega a skill correspondente **antes** de executar a tarefa.

## net10-agent — 9 skills

| Skill | O que cobre | Quando usar |
|---|---|---|
| [`arquitetura-camadas`](../skills/arquitetura-camadas/SKILL.md) | Estrutura de solução .NET 10 em camadas — criar projetos, decidir onde um artefato mora, validar direção de dependência, configurar composição da raiz e dependências essenciais | ao iniciar um projeto, adicionar um projeto novo, mover código entre camadas ou avaliar se uma dependência é permitida |
| [`dominio-agregados`](../skills/dominio-agregados/SKILL.md) | Modelagem de domínio em .NET — criar agregados com invariantes, serviços de domínio, DTOs, enums e specifications; decidir quando separar um domínio novo | ao criar ou alterar qualquer artefato dentro da camada Core |
| [`feature-web`](../skills/feature-web/SKILL.md) | Camada de apresentação ASP.NET Core MVC — criar feature vertical (Controller, ViewModel, View) e definir rotas | ao criar ou alterar tela, rota ou feature da camada Web |
| [`multi-schema`](../skills/multi-schema/SKILL.md) | Isolamento de dados por schema do PostgreSQL — resolver o schema do cliente em runtime com `SET search_path` na abertura da conexão, separar o que é do cliente do que é compartilhado, rodar migrations em N schemas, provisionar cliente novo e testar o isolamento | ao criar entidade que guarda dado de cliente, configurar DbContext e interceptor, escrever migration, provisionar cliente ou diagnosticar dado aparecendo no schema errado |
| [`observabilidade`](../skills/observabilidade/SKILL.md) | Logging e telemetria com Azure Application Insights em .NET 10 — registro do SDK, ILogger estruturado, níveis, enriquecimento por usuário, amostragem e custo | ao configurar telemetria, adicionar log ou diagnosticar comportamento em produção |
| [`persistencia-ef`](../skills/persistencia-ef/SKILL.md) | Persistência com EF Core 10 e PostgreSQL — DbContext, IEntityTypeConfiguration, migrations, repositórios com specifications, propriedade de schema e integrações externas com fallback | ao mexer em qualquer coisa da camada Data |
| [`revisao-codigo`](../skills/revisao-codigo/SKILL.md) | Checklist de revisão de código .NET 10 — convenções, Clean Code, SOLID, KISS, formatação, null safety e violações de camada | ao revisar um diff, PR ou antes de entregar uma alteração |
| [`setup-projeto`](../skills/setup-projeto/SKILL.md) | Parametrização inicial do boilerplate — substitui `<Produto>` e `<Modulo>`, preservando a notação didática das skills, e cria a solução .NET | uma única vez, ao iniciar projeto novo a partir deste boilerplate |
| [`testes-dotnet`](../skills/testes-dotnet/SKILL.md) | Testes automatizados em .NET 10 com xUnit v3, Moq e FluentAssertions — organização espelhando o código, nomenclatura, o que testar em agregado e serviço, e comandos de validação | ao escrever, revisar ou executar testes |

## pgproc-agent — 9 skills

| Skill | O que cobre | Quando usar |
|---|---|---|
| [`escrita-procedures`](../skills/escrita-procedures/SKILL.md) | Estrutura e assinatura de stored procedures PostgreSQL — CREATE PROCEDURE, parâmetros IN/INOUT, nomenclatura, retorno via refcursor, idempotência e template completo | ao criar ou alterar qualquer procedure |
| [`integracao-dotnet`](../skills/integracao-dotnet/SKILL.md) | Chamada de procedures PostgreSQL a partir de .NET 10 — Npgsql, EF Core ExecuteSqlRawAsync, parâmetros nomeados, INOUT, refcursor, autocommit para procedures com COMMIT, timeout e tratamento de PostgresException | ao expor uma procedure para a aplicação |
| [`nomenclatura`](../skills/nomenclatura/SKILL.md) | Regras obrigatórias de nomenclatura em procedures PostgreSQL — nomes de coluna, parâmetro, variável e procedure escritos por extenso, sem abreviação, sigla ou diminutivo | SEMPRE que nomear qualquer identificador, e ao revisar procedure existente |
| [`performance-sql`](../skills/performance-sql/SKILL.md) | Performance de procedures PostgreSQL — EXPLAIN ANALYZE, SQL de conjunto vs laço, índices, cache de plano, processamento em lote, UPSERT e diagnóstico de lentidão | quando uma procedure estiver lenta ou ao escrever rotina que processa volume alto |
| [`plpgsql-fundamentos`](../skills/plpgsql-fundamentos/SKILL.md) | Sintaxe e semântica de PL/pgSQL — declaração de variáveis, tipos ancorados, controle de fluxo, laços, cursores, arrays, JSONB, SELECT INTO e armadilhas de escopo | ao escrever o corpo de uma procedure |
| [`seguranca-sql`](../skills/seguranca-sql/SKILL.md) | Segurança em procedures PostgreSQL — SQL dinâmico seguro com format() e EXECUTE USING, SECURITY DEFINER vs INVOKER, search_path, privilégios GRANT/REVOKE e proteção de dado sensível | ao escrever SQL dinâmico, definir privilégios ou revisar procedure quanto a injeção |
| [`testes-procedures`](../skills/testes-procedures/SKILL.md) | Testes de stored procedures PostgreSQL — validação de compilação, casos de borda, idempotência, teste transacional com rollback, dados de fixture e verificação de concorrência | antes de entregar qualquer procedure |
| [`transacoes-erros`](../skills/transacoes-erros/SKILL.md) | Controle transacional e tratamento de erro em procedures PostgreSQL — COMMIT/ROLLBACK no corpo, blocos EXCEPTION, SQLSTATE, savepoints implícitos, processamento em lote e locks | ao escrever procedure que grava dados, processa lote ou precisa tratar falha |
| [`versionamento-deploy`](../skills/versionamento-deploy/SKILL.md) | Versionamento e deploy de procedures PostgreSQL — organização de arquivos .sql, idempotência do script, rollback, mudança de assinatura, integração com migration do EF Core e revisão | ao criar arquivo de procedure, alterar assinatura ou preparar deploy |

## frontend-agent — 4 skills

| Skill | O que cobre | Quando usar |
|---|---|---|
| [`acessibilidade-responsivo`](../skills/acessibilidade-responsivo/SKILL.md) | Responsividade e acessibilidade — eliminar overflow horizontal, adaptar tabela extensa, colapsar grade de formulário, garantir foco visível, contraste, aria e navegação por teclado | ao criar ou alterar layout, tabela, formulário, modal, menu ou ao revisar uma tela antes de entregar |
| [`razor-interop`](../skills/razor-interop/SKILL.md) | Contrato entre Razor e TypeScript — passar dados e URLs por atributos `data-*`, gerar rota com `Url.Action`, resolver assets pelo TagHelper do Vite e garantir progressive enhancement | ao ligar comportamento a uma view, incluir script numa página ou revisar acoplamento entre `.cshtml` e `.ts` |
| [`typescript-estrito`](../skills/typescript-estrito/SKILL.md) | TypeScript moderno em modo estrito — fixar a versão, configurar tsconfig com `strict`/`noUnusedLocals`/`noUnusedParameters`, tipar DOM sem `any` e organizar módulos de feature | ao criar ou alterar `.ts`, `tsconfig.json`, atualizar o compilador ou revisar tipagem |
| [`vite-build`](../skills/vite-build/SKILL.md) | Pipeline de assets com Vite — configurar `vite.config.ts`, declarar entry points por feature, gerar manifest com hash, definir scripts npm e amarrar o build ao `.csproj` | ao criar feature com script próprio, alterar build, dev server ou saída de assets |

## tester-agent — 5 skills

| Skill | O que cobre | Quando usar |
|---|---|---|
| [`dados-teste`](../skills/dados-teste/SKILL.md) | Construção de dados de teste — builders e object mothers, determinismo sem random ou relógio real, fixtures mínimas e quando compartilhar dado entre testes | ao criar massa de teste, reduzir repetição de construção ou diagnosticar teste intermitente |
| [`estrategia-testes`](../skills/estrategia-testes/SKILL.md) | Estratégia de cobertura — pirâmide de testes, o que testar em cada artefato da arquitetura em camadas, o que deliberadamente não testar e como conduzir teste de regressão | antes de escrever a primeira linha de teste ou ao decidir se um cenário merece cobertura |
| [`testes-integracao`](../skills/testes-integracao/SKILL.md) | Testes de integração com banco real em container efêmero, isolamento por transação com rollback e suíte separada da unitária por ser lenta | ao testar repositório, migration, query ou qualquer fluxo que atravesse a fronteira de persistência |
| [`testes-ui`](../skills/testes-ui/SKILL.md) | Testes da camada de apresentação com HtmlAgilityPack — asserção sobre o HTML efetivamente renderizado, validação de desktop e mobile e garantia de ausência de overflow horizontal | ao testar View, partial, ViewModel renderizada ou estrutura responsiva |
| [`testes-unitarios`](../skills/testes-unitarios/SKILL.md) | Testes unitários em xUnit v3 com FluentAssertions e Moq — agregado testado pela API pública, asserção por constante de mensagem, mock só nos limites, factory privada e um comportamento observável por teste | ao escrever ou revisar teste de agregado, serviço, specification ou controller |

## github-agent — 4 skills

| Skill | O que cobre | Quando usar |
|---|---|---|
| [`fluxo-branches`](../skills/fluxo-branches/SKILL.md) | Fluxo de branches — criação sempre a partir de main atualizada, nomenclatura <tipo>/<escopo-kebab-case>, cadeia de ambientes main → staging → homolog e proibição de commit direto em main | ao iniciar trabalho novo, decidir de onde partir ou para onde promover uma alteração |
| [`merge-pullrequest`](../skills/merge-pullrequest/SKILL.md) | Abertura e integração de pull request — descrição com problema e solução, checklist de build, testes e typecheck sem avisos, revisão do próprio diff e merge apenas com CI verde, preferindo merge commit | ao preparar, revisar ou integrar um PR |
| [`padrao-commits`](../skills/padrao-commits/SKILL.md) | Conventional Commits em português brasileiro — tipos permitidos, descrição no imperativo com ~72 caracteres, corpo que explica o porquê e granularidade por intenção | ao redigir mensagem de commit, revisar histórico ou dividir um trabalho em commits |
| [`recuperacao-git`](../skills/recuperacao-git/SKILL.md) | Recuperação de estado no Git — reflog como rede de segurança, revert versus reset, recuperar commit perdido, desfazer merge, stash e a proibição de force push em branch compartilhada | ao desfazer uma operação, recuperar trabalho aparentemente perdido ou avaliar o risco de um comando destrutivo |

## codegraph-agent — 3 skills

| Skill | O que cobre | Quando usar |
|---|---|---|
| [`codegraph-instalacao`](../skills/codegraph-instalacao/SKILL.md) | Instalação do CodeGraph e indexação de um projeto — instalar a CLI por script ou npm, registrar o servidor MCP nos agentes, rodar `codegraph init` na raiz, confirmar o índice com `status` e manter `.codegraph/` fora do git | ao preparar um projeto novo a partir deste boilerplate, quando não existir `.codegraph/` na raiz, ou quando o MCP `codegraph_explore` não aparecer nas ferramentas |
| [`codegraph-consulta`](../skills/codegraph-consulta/SKILL.md) | Consulta ao grafo — escolher entre `explore`, `query`, `node`, `callers`, `callees` e `impact`, formular a pergunta que devolve contexto útil em uma chamada, ler a saída de blast radius e saber quando o `grep` ainda é a ferramenta certa | ao investigar como um trecho funciona, localizar um símbolo, medir o efeito de uma alteração ou substituir um laço de `grep`/`Read` que está gastando contexto |
| [`codegraph-manutencao`](../skills/codegraph-manutencao/SKILL.md) | Manutenção do índice — sync incremental, reindexação completa com `index --force`, leitura do `status`, daemon de watcher, lock preso, upgrade da CLI e remoção com `uninit` | quando a consulta devolver código que não existe mais, quando o índice parecer vazio ou defasado, após rebase ou troca de branch com muitas mudanças, ou ao atualizar a versão do CodeGraph |

## lgpd-agent — 5 skills

| Skill | O que cobre | Quando usar |
|---|---|---|
| [`consentimento-auditoria`](../skills/consentimento-auditoria/SKILL.md) | Coleta e registro de consentimento válido sob a LGPD (art. 8 e 9), revogação, trilha de auditoria imutável de acesso a dado pessoal, relatório de impacto (RIPD) e registro das operações de tratamento do art. 37 | ao implementar aceite de termos, versionar política de privacidade, construir log de auditoria ou preparar evidência de conformidade |
| [`dados-pessoais-modelagem`](../skills/dados-pessoais-modelagem/SKILL.md) | Modelagem de dado pessoal com EF Core e PostgreSQL sob a LGPD — minimização, proibição de dado pessoal em telemetria e log, criptografia em repouso, hash com salt, pseudonimização, separação em tabela própria e cuidados com índice, backup e ambiente de homologação | ao criar entidade que guarda dado de pessoa, definir o que logar ou revisar schema |
| [`direitos-titular`](../skills/direitos-titular/SKILL.md) | Os nove direitos do titular do art. 18 da LGPD implementados em código — confirmação, acesso, correção, anonimização/bloqueio/eliminação, portabilidade, informação sobre compartilhamento, revogação e revisão de decisão automatizada, com prazos e o que a aplicação precisa guardar para conseguir responder | ao implementar exclusão de conta, exportação de dados, correção cadastral ou canal de atendimento ao titular |
| [`principios-lgpd`](../skills/principios-lgpd/SKILL.md) | Os dez princípios do art. 6 e as dez bases legais do art. 7 da LGPD traduzidos em decisão de código, mais a distinção dado pessoal vs dado sensível (art. 5, II) e o regime do art. 11 | ao justificar um tratamento, escolher base legal, avaliar se uma coleta cabe na finalidade ou revisar feature nova quanto a fundamento legal |
| [`retencao-descarte`](../skills/retencao-descarte/SKILL.md) | Política de retenção e descarte sob a LGPD — art. 15 e art. 16, as hipóteses que permitem conservar o dado após o término do tratamento, por que soft delete não é eliminação, anonimização irreversível, expurgo automático e o problema de backup e réplica | ao definir prazo de guarda, implementar exclusão de conta, desenhar rotina de expurgo ou revisar política de backup |

## security-agent — 5 skills

| Skill | O que cobre | Quando usar |
|---|---|---|
| [`auditoria-implementacao`](../skills/auditoria-implementacao/SKILL.md) | Roteiro de auditoria de segurança de um diff — ordenação por severidade, rastreio do dado sensível da entrada até a saída (entrada, validação, persistência, log, resposta, telemetria) e catálogo dos pontos de vazamento comuns em ASP.NET Core | como passo inicial de toda auditoria de PR, antes das skills específicas |
| [`autenticacao-autorizacao`](../skills/autenticacao-autorizacao/SKILL.md) | Segurança de autenticação por cookie e OTP por e-mail — expiração deslizante, código de uso único com validade curta e limite de tentativas, hash do OTP com pepper, comparação em tempo constante contra timing attack, prevenção de enumeração de usuário, [Authorize] por padrão e privilégio mínimo na role do banco | ao auditar login, sessão, fluxo de OTP, atributo de autorização ou permissão de banco |
| [`dependencias-vulneraveis`](../skills/dependencias-vulneraveis/SKILL.md) | Verificação de dependência vulnerável em .NET e npm — dotnet list package --vulnerable --include-transitive, npm audit, pin de dependência transitiva no .csproj com justificativa, Dependabot/Renovate, avaliação de severidade CVSS e alcançabilidade do caminho vulnerável, e risco de pacote abandonado | ao auditar alteração em .csproj, package.json ou lockfile, e periodicamente sobre a esteira |
| [`owasp-web`](../skills/owasp-web/SKILL.md) | OWASP Top 10 aplicado a ASP.NET Core MVC e EF Core — broken access control e IDOR, injeção com FromSqlRaw, XSS via Html.Raw e innerHTML, CSRF com antiforgery, SSRF, desserialização insegura, security misconfiguration e redirect aberto | ao auditar controller, rota, view, query, upload, redirect ou endpoint novo |
| [`segredos-configuracao`](../skills/segredos-configuracao/SKILL.md) | Gestão de segredo e configuração segura — .env fora do git, resposta a segredo commitado (rotacionar primeiro), Azure Key Vault e App Settings, connection string, HTTPS obrigatório e HSTS, headers de segurança (CSP, X-Content-Type-Options, Referrer-Policy) e cookie com HttpOnly, Secure e SameSite | ao auditar appsettings, .env, pipeline, Program.cs ou configuração de cookie e header |

## stripe-agent — 6 skills

| Skill | O que cobre | Quando usar |
|---|---|---|
| [`stripe-credenciais`](../skills/stripe-credenciais/SKILL.md) | Tutoria das ações manuais — chaves no dashboard, Stripe CLI, `whsec_` local e de produção, produtos e preços, `.env` e diagnóstico | ao iniciar a integração, quando faltar chave ou der erro de autenticação |
| [`stripe-descoberta`](../skills/stripe-descoberta/SKILL.md) | Levantamento do modelo de cobrança — planos, preços, ciclo, add-ons, métodos de pagamento, moeda, imposto, proration, inadimplência e cupom | **SEMPRE** como primeiro passo, antes de modelar ou codar |
| [`stripe-checkout`](../skills/stripe-checkout/SKILL.md) | Checkout Session, valor em centavos, idempotency key, `IPagamentoGateway` e métodos assíncronos (Pix, boleto) | ao implementar pagamento avulso ou tela de checkout |
| [`stripe-assinaturas`](../skills/stripe-assinaturas/SKILL.md) | `Product`/`Price`/`Subscription`, trial, add-on como item, upgrade com proration, cancelamento, dunning e Customer Portal | ao implementar plano recorrente, mudança de plano ou cancelamento |
| [`stripe-webhooks`](../skills/stripe-webhooks/SKILL.md) | Verificação de assinatura, corpo bruto, idempotência por `event.id`, responder 2xx antes de processar e ausência de ordem | ao criar ou revisar endpoint de webhook |
| [`stripe-modelagem`](../skills/stripe-modelagem/SKILL.md) | O que persistir, agregado `Assinatura`, tabela de idempotência, EF Core e LGPD do dado de pagamento | ao criar schema de cobrança ou migration de billing |

## Adicionar uma skill

1. Crie `../skills/<nome>/SKILL.md` com frontmatter `name`, `description` e `agent`.
2. Confirme que `<nome>` não colide com nenhuma skill já listada acima.
3. Registre-a na tabela do agente dono, aqui e na seção Skills do arquivo do agente em
   [../agents/](../agents/).
