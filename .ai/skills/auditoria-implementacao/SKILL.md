---
name: auditoria-implementacao
description: Roteiro de auditoria de segurança de um diff — ordenação por severidade, rastreio do dado sensível da entrada até a saída (entrada, validação, persistência, log, resposta, telemetria) e catálogo dos pontos de vazamento comuns em ASP.NET Core. Use como passo inicial de toda auditoria de PR, antes das skills específicas.
agent: security-agent
---

# Auditoria de implementação

## Escopo

Audite **apenas o diff**. Código preexistente de outro autor só entra quando está no caminho direto
do dado que o diff toca, ou quando o diff agrava um problema latente — e nesses casos diga que o
achado é preexistente.

```bash
git diff origin/main...HEAD --stat
git diff origin/main...HEAD -- '*.cs' '*.cshtml' '*.ts'
git diff origin/main...HEAD -- '*.csproj' 'package.json' '*.json' '*.yml' '.env*'
```

Comece pelo `--stat`: arquivo de configuração, `.csproj`, pipeline e migration alterados merecem
olhar antes do código de aplicação, porque neles um erro tem alcance maior.

## Passagem 1 — varredura de alto risco (2 minutos)

Antes de ler o diff com calma, procure o que bloqueia sozinho:

```bash
git diff origin/main...HEAD | grep -nEi \
  '(password|senha|secret|api[_-]?key|token|connectionstring|private[_-]?key|BEGIN .*PRIVATE)'

git diff origin/main...HEAD | grep -nE \
  '(FromSqlRaw|ExecuteSqlRaw|Html\.Raw|innerHTML|AllowAnonymous|DetailedErrors|eval\()'
```

Cada acerto vira candidato a achado. Nenhum acerto é presunção de segurança — só de que o pior
padrão não está textualmente presente.

## Passagem 2 — rastreio do dado sensível

O núcleo da auditoria. Para **cada** dado sensível que o diff introduz ou movimenta, siga o caminho
inteiro e pergunte em cada etapa "para onde isso pode escapar daqui?".

```text
entrada → validação → persistência → log → resposta → telemetria
```

### O que conta como dado sensível

| Categoria | Exemplos |
|---|---|
| Credencial | Senha, código OTP, token de sessão, chave de API, connection string |
| Dado pessoal | Nome, e-mail, telefone, documento, endereço, IP associado a pessoa |
| Dado sensível (LGPD art. 5, II) | Saúde, biometria, convicção religiosa, opinião política |
| Financeiro | Dado de pagamento, saldo, extrato |
| Interno | Estrutura de rede, versão de componente, caminho absoluto, nome de host |

### As seis etapas

| Etapa | Pergunta de auditoria | Falha típica |
|---|---|---|
| **Entrada** | De onde vem? Query string, rota, body, header, upload, integração? | Dado pessoal em query string — vai para o log de requisição do App Service |
| **Validação** | É validado no servidor? O tipo é o esperado? Tamanho limitado? | Confiar na validação do TypeScript; `[Bind]` amplo permitindo over-posting |
| **Persistência** | Coluna certa? Criptografado ou com hash quando devia? Índice replica o valor? | Senha em coluna de texto; documento indexado em claro |
| **Log** | Alguma chamada de `ILogger` recebe esse valor, direta ou dentro de um objeto? | `LogInformation("Dados: {@Titular}", titular)` serializa a entidade inteira |
| **Resposta** | O DTO devolve mais campos do que a tela usa? A view exibe algo além do necessário? | DTO reaproveitado de outro endpoint carregando campos a mais |
| **Telemetria** | Vira propriedade, dimensão, nome de operação ou exceção no Application Insights? | Exceção com o valor na mensagem, capturada pelo SDK |

Ao encontrar o ponto de fuga, reporte **onde** o dado escapa e **quem** consegue lê-lo — quem tem
acesso ao workspace de telemetria não é o mesmo conjunto de quem tem acesso ao banco.

### Rastreio na prática

```csharp
// Diff introduz este método. Rastreie o CPF.
public async Task<ResultadoDto> ValidarAsync(SolicitacaoDto solicitacao, CancellationToken ct)
{
    _logger.LogInformation("Validando solicitação {@Solicitacao}", solicitacao);   // ⛔ fuga: log
    var titular = await _repositorio.ObterPorDocumentoAsync(solicitacao.Cpf, ct);

    if (titular is null)
        throw new InvalidOperationException($"Titular {solicitacao.Cpf} não existe");
        //                                   ⛔ fuga: mensagem de exceção → telemetria → tela

    return new ResultadoDto(titular);   // ⛔ fuga: DTO carrega a entidade inteira
}
```

Três fugas do mesmo dado em oito linhas — e nenhuma delas aparece no `grep` da passagem 1.

## Passagem 3 — catálogo de pontos de vazamento

| # | Ponto | Como se manifesta | Verificação |
|---|---|---|---|
| 1 | **Log** | `{@Objeto}` serializa a entidade; interpolação de string | Toda chamada de `ILogger` no diff, campo a campo |
| 2 | **Mensagem de erro ao usuário** | Exceção de infraestrutura repassada à view | A mensagem exibida é genérica e a técnica fica só no log? |
| 3 | **Resposta com campo demais** | DTO reaproveitado, `return Ok(entidade)` | Cada campo do DTO é usado pela tela? |
| 4 | **Telemetria** | Propriedade customizada, nome de operação, dimensão de métrica | Nenhum dado pessoal em nenhuma superfície do Application Insights |
| 5 | **Stack trace em produção** | `DetailedErrors`, `UseDeveloperExceptionPage` sem guarda de ambiente | Página de erro só em `IsDevelopment()` |
| 6 | **Comentário com credencial** | `// senha do ambiente: ...`, exemplo com token real | `grep` na passagem 1 + leitura dos comentários adicionados |
| 7 | **Configuração commitada** | `.env`, `appsettings.Production.json` com valor real | Arquivo está no `.gitignore`? O valor é placeholder? |
| 8 | **Query string** | `?documento=...`, `?token=...` | Identificador na rota; segredo nunca na URL |
| 9 | **Anexo e nome de arquivo** | `documento-<numero>.pdf` no storage | Nome opaco |
| 10 | **Cache e header** | Resposta com dado pessoal sem `Cache-Control: no-store` | Página autenticada não é cacheável |
| 11 | **Fixture e seed de teste** | Dado real de produção usado como massa | Massa sintética |
| 12 | **Migration** | `UPDATE` com valor real; dado de exemplo no `Up()` | Migration não carrega dado de pessoa |

### 1. Log

```csharp
// ❌ Serializa a entidade inteira, incluindo o que você nem lembra que existe lá.
_logger.LogInformation("Titular carregado {@Titular}", titular);

// ❌ Interpolação: vaza e ainda destrói o log estruturado.
_logger.LogWarning($"Falha ao autenticar {email}");

// ✅ Identificador opaco e campos explícitos.
_logger.LogInformation("Titular carregado | TitularId: {TitularId}", titular.Id);
```

Regra: **nunca `{@Objeto}` sobre entidade de domínio ou DTO de entrada.** Você não controla o que
alguém adiciona à classe seis meses depois.

### 2. Mensagem de erro

```csharp
// ❌ Repassa detalhe de infraestrutura para a tela.
catch (NpgsqlException ex)
{
    return View("Erro", new ErroViewModel(ex.Message));
}

// ✅ Genérico para o usuário, detalhado só no log, com correlação.
catch (NpgsqlException ex)
{
    var correlacao = HttpContext.TraceIdentifier;
    _logger.LogError(ex, "Falha ao persistir | Correlacao: {Correlacao}", correlacao);
    return View("Erro", new ErroViewModel(MensagensErro.FalhaGenerica, correlacao));
}
```

O identificador de correlação dá suporte ao atendimento sem entregar o detalhe técnico ao atacante.

### 3. Over-fetching de DTO

O vazamento mais silencioso: ninguém vê, porque a tela não exibe — mas o payload chega ao
navegador e a qualquer proxy no caminho.

```csharp
// ❌ Devolve a entidade: todo campo mapeado vai junto.
return Ok(titular);

// ❌ DTO reaproveitado de outro contexto, com campos que esta tela não usa.
return Ok(new TitularCompletoDto(titular));

// ✅ DTO específico da tela, com exatamente o que ela mostra.
return Ok(new TitularResumoDto(titular.Id, titular.NomeExibicao, titular.Situacao));
```

Verificação: abra a view/TypeScript consumidor e confira campo a campo. Campo que a tela não usa é
campo que não devia trafegar.

### 5. Stack trace em produção

```csharp
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}
else
{
    app.UseExceptionHandler("/erro");
    app.UseHsts();
}
```

Confirme também que `DetailedErrors` não está `true` em configuração de produção e que a página de
erro customizada não exibe `Exception.ToString()`.

## Passagem 4 — dependências e configuração

Se o diff toca `.csproj`, `package.json` ou lockfile, execute `dependencias-vulneraveis`. Se toca
`appsettings*`, `.env`, pipeline ou `Program.cs`, execute `segredos-configuracao`. Se toca
controller, view, rota ou query, execute `owasp-web`. Se toca login, sessão ou permissão, execute
`autenticacao-autorizacao`.

## Ordem do reporte

```text
🔴 Crítico  → segredo exposto, bypass de autenticação, RCE, injeção sem pré-condição
🟠 Alto     → vazamento de dado pessoal, IDOR, XSS armazenado, CVE alcançável
🟡 Médio    → header ausente, erro verboso, CVE não alcançável, validação fraca
🔵 Baixo    → endurecimento recomendável, pacote sem manutenção
```

Encerre com o veredito: `APROVADO`, `APROVADO COM RESSALVAS` ou `BLOQUEADO`.

## Checklist

- [ ] Diff obtido e lido; escopo restrito ao que mudou.
- [ ] Varredura de padrões de alto risco executada.
- [ ] Cada dado sensível do diff rastreado nas seis etapas.
- [ ] Nenhuma chamada de log com `{@Objeto}` ou interpolação sobre dado pessoal.
- [ ] Mensagem de erro ao usuário genérica, com correlação; detalhe só no log.
- [ ] DTO de resposta com exatamente os campos que a tela consome.
- [ ] Nenhum dado pessoal em telemetria, query string ou nome de arquivo.
- [ ] Página de erro detalhada restrita a desenvolvimento.
- [ ] Nenhum segredo em código, comentário, configuração, migration ou massa de teste.
- [ ] Skills específicas acionadas conforme os arquivos tocados.
- [ ] Achados ordenados por severidade, com impacto concreto e correção aplicável.
- [ ] Veredito emitido.
