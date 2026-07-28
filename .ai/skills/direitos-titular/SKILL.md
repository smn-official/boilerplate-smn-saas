---
name: direitos-titular
description: Os nove direitos do titular do art. 18 da LGPD implementados em código — confirmação, acesso, correção, anonimização/bloqueio/eliminação, portabilidade, informação sobre compartilhamento, revogação e revisão de decisão automatizada, com prazos e o que a aplicação precisa guardar para conseguir responder. Use ao implementar exclusão de conta, exportação de dados, correção cadastral ou canal de atendimento ao titular.
agent: lgpd-agent
---

# Direitos do titular

## Regra que antecede todas as outras

**A aplicação precisa guardar hoje o que será necessário para responder ao titular amanhã.**

É o erro estrutural mais caro em conformidade: apagar o histórico de consentimento, não registrar a
finalidade de cada campo, não saber com quem o dado foi compartilhado. Quando o pedido chega, não
há como respondê-lo — e, pior, não há como **demonstrar** conformidade, que é obrigação autônoma do
controlador (art. 6, X).

| Direito solicitado | Só é atendível se você tiver guardado |
|---|---|
| Confirmação e acesso | Inventário de onde o dado do titular está, consultável por identificador |
| Informação sobre finalidades | Finalidade + base legal registradas por campo/tratamento |
| Informação sobre compartilhamento (VII) | Registro de cada envio a operador ou terceiro, com data e finalidade |
| Revogação de consentimento (IX) | Histórico de consentimentos: quando, como, texto e versão aceitos |
| Revisão de decisão automatizada (art. 20) | Log da decisão: entradas, regra/versão do modelo, resultado |
| Eliminação | Mapa completo das tabelas, réplicas, backups e exportações que contêm o dado |

Ou seja: **minimizar o dado pessoal e maximizar o metadado de tratamento.** São coisas opostas, e
confundi-las produz os dois erros ao mesmo tempo — guarda-se dado demais e evidência de menos.

## Os nove direitos do art. 18

| # | Direito | O que a aplicação precisa oferecer |
|---|---|---|
| I | Confirmação da existência de tratamento | Resposta objetiva: "sim, tratamos dados seus" |
| II | Acesso aos dados | Cópia completa e legível de tudo que se guarda do titular |
| III | Correção de dados incompletos, inexatos ou desatualizados | Fluxo de edição ou canal de solicitação |
| IV | Anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade | Caminho técnico de anonimização e de bloqueio (suspensão do tratamento) |
| V | Portabilidade a outro fornecedor, mediante requisição expressa | Exportação em formato estruturado e interoperável |
| VI | Eliminação dos dados tratados com consentimento, ressalvadas as hipóteses do art. 16 | Expurgo com preservação do que a lei obriga reter |
| VII | Informação sobre entidades públicas e privadas com as quais houve uso compartilhado | Registro de compartilhamento consultável |
| VIII | Informação sobre a possibilidade de não fornecer consentimento e sobre as consequências da negativa | Texto na interface de coleta, versionado |
| IX | Revogação do consentimento, nos termos do art. 8, § 5 | Revogação tão simples quanto foi conceder |

O art. 20 acrescenta o direito à revisão de decisão automatizada que afete interesses do titular,
com direito a informações sobre os critérios e procedimentos utilizados.

## Prazos

| Situação | Prazo | Base |
|---|---|---|
| Acesso em formato simplificado | **15 dias** contados da requisição | Art. 19, I |
| Declaração clara e completa (origem, critérios, finalidade) | 15 dias, prorrogáveis nos termos do regulamento | Art. 19, II |
| Confirmação de existência ou acesso | Imediata, em formato simplificado | Art. 19, § 3 |
| Resposta ao titular sobre providências | Prazo e forma definidos em regulamentação | Art. 18, § 4 |

Desenhe o atendimento para responder em dias, não em semanas. Se a resposta depende de um
engenheiro escrever SQL sob demanda, o prazo será perdido no primeiro pico de pedidos.

## Implementação

### Acesso (I, II) — uma consulta, não uma caça ao tesouro

```csharp
public sealed class DadosTitularDto(
    Guid titularId,
    IReadOnlyCollection<CampoPessoalDto> cadastro,
    IReadOnlyCollection<ConsentimentoDto> consentimentos,
    IReadOnlyCollection<CompartilhamentoDto> compartilhamentos,
    IReadOnlyCollection<TratamentoDto> tratamentos,
    DateTimeOffset geradoEm)
{
    public Guid TitularId { get; } = titularId;
    public IReadOnlyCollection<CampoPessoalDto> Cadastro { get; } = cadastro;
    public IReadOnlyCollection<ConsentimentoDto> Consentimentos { get; } = consentimentos;
    public IReadOnlyCollection<CompartilhamentoDto> Compartilhamentos { get; } = compartilhamentos;
    public IReadOnlyCollection<TratamentoDto> Tratamentos { get; } = tratamentos;
    public DateTimeOffset GeradoEm { get; } = geradoEm;
}
```

O `TratamentoDto` carrega finalidade e base legal por conjunto de dados — é ele que responde à
"declaração clara e completa" do art. 19, II. Sem a tabela de finalidades da skill
`principios-lgpd`, esse campo não tem como ser preenchido.

Cada feature nova que persiste dado do titular precisa **entrar nessa consulta na mesma entrega**.
Feature que guarda dado e não aparece no acesso é não conformidade silenciosa.

### Portabilidade (V) — estruturado e interoperável

PDF não é portabilidade: não é interoperável. Use JSON ou CSV, com nomes de campo estáveis e
documentados.

```csharp
[HttpGet("portabilidade")]
[Authorize]
public async Task<IActionResult> Exportar(CancellationToken cancellationToken)
{
    var dados = await _servicoTitular.ObterDadosAsync(UsuarioAtual.TitularId, cancellationToken);
    var conteudo = JsonSerializer.SerializeToUtf8Bytes(dados, _opcoesSerializacao);

    return File(conteudo, "application/json",
        $"dados-titular-{DateTimeOffset.UtcNow:yyyyMMdd}.json");
}
```

Cuidados:

- A exportação **não** inclui dado de terceiro (art. 18, § 7 ressalva o segredo comercial e
  industrial; e dado de outra pessoa nunca é do titular solicitante).
- O download precisa de autenticação forte — exportação é o alvo perfeito para sequestro de conta.
- O arquivo gerado é uma cópia nova do dado: entregue por link com expiração curta e não o deixe
  residente em storage.
- Registre a exportação na trilha de auditoria.

### Correção (III)

Correção mudou o dado — a versão antiga não deve continuar circulando. Verifique caches,
projeções, índices de busca e sistemas para os quais o dado foi enviado. Se houve compartilhamento
com terceiro, a correção precisa ser comunicada (art. 18, § 6).

### Eliminação (IV, VI) — e o que sobrevive a ela

Eliminação não é `Ativo = false`. Detalhes em `retencao-descarte`; o essencial:

- Dado que a lei obriga reter **permanece**, com base legal registrada (art. 16, I).
- O restante é eliminado ou anonimizado de forma irreversível.
- O titular é informado do que permaneceu e por quê — resposta parcial fundamentada, não silêncio.

```csharp
public async Task AnonimizarAsync(Guid titularId, CancellationToken cancellationToken)
{
    var titular = await _repositorio.ObterPorIdAsync(titularId, cancellationToken)
        ?? throw new DominioException(MensagensPrivacidade.TitularNaoEncontrado);

    titular.Anonimizar(_relogio.Agora);

    await _repositorio.SalvarAsync(titular, cancellationToken);
    await _auditoria.RegistrarAsync(
        new EventoAuditoria(titularId, TipoEvento.Anonimizacao, _relogio.Agora),
        cancellationToken);
}
```

```csharp
public void Anonimizar(DateTimeOffset agora)
{
    if (AnonimizadoEm is not null)
        throw new DominioException(MensagensPrivacidade.TitularJaAnonimizado);

    Nome = MensagensPrivacidade.ValorAnonimizado;
    Email = $"anonimizado-{Id:N}@invalid";
    Telefone = null;
    Documento = null;
    AnonimizadoEm = agora;
}
```

O registro de auditoria da anonimização **não** é dado pessoal do titular anonimizado: guarda o
identificador interno e o evento, e é justamente ele que prova o atendimento.

### Bloqueio (IV) — o direito esquecido

Bloqueio é suspender o tratamento mantendo o dado. Serve quando a eliminação não é possível
(retenção legal) mas o tratamento precisa parar. Implemente como estado, e faça as consultas de
negócio respeitarem-no:

```csharp
public enum SituacaoTitular
{
    Ativo,
    Bloqueado,
    Anonimizado,
}
```

Uma specification global evita que alguém esqueça o filtro em uma consulta nova.

### Informação sobre compartilhamento (VII)

Impossível de responder sem registro contemporâneo. Toda vez que dado do titular sai para um
operador ou terceiro, grave destinatário, finalidade, base legal, campos enviados e data.
Reconstruir isso depois, lendo código de integração, é adivinhação.

### Revisão de decisão automatizada (art. 20)

Se alguma regra automatizada afeta o titular (aprovação, classificação, priorização), guarde as
entradas usadas, a versão da regra e o resultado. Sem isso não há revisão possível, e o titular tem
direito a informações sobre os critérios utilizados.

## Autenticação do solicitante

Atender pedido sem verificar identidade **é** vazamento — e vazamento que você mesmo executou.

- Exija sessão autenticada; para pedido por canal externo, valide por OTP no e-mail cadastrado.
- Nunca aceite prova de identidade por dado que a própria base expõe.
- Cuidado com enumeração: a resposta a "existe tratamento sobre este e-mail?" vinda de quem não é o
  titular revela que a pessoa é cliente. Confirme sempre pelo canal do titular autenticado.
- Registre quem pediu, quando, o que foi entregue e por qual canal.

## Checklist

- [ ] Existe consulta única que devolve tudo que se guarda do titular, por identificador.
- [ ] Feature nova que persiste dado do titular entrou na consulta de acesso na mesma entrega.
- [ ] Finalidade e base legal por tratamento são recuperáveis (art. 19, II).
- [ ] Exportação em formato estruturado e interoperável, sem dado de terceiro.
- [ ] Correção propaga para caches, projeções e terceiros que receberam o dado.
- [ ] Eliminação anonimiza de forma irreversível; retenção obrigatória documentada e informada.
- [ ] Estado de bloqueio existe e é respeitado pelas consultas de negócio.
- [ ] Compartilhamento com terceiro registrado no momento em que ocorre.
- [ ] Decisão automatizada registra entradas, versão da regra e resultado.
- [ ] Histórico de consentimento preservado mesmo após revogação.
- [ ] Solicitante autenticado antes de qualquer entrega de dado.
- [ ] Atendimento cabe no prazo de 15 dias sem intervenção manual de engenharia.
