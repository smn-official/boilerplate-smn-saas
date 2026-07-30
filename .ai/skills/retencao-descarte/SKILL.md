---
name: retencao-descarte
description: Política de retenção e descarte sob a LGPD — art. 15 e art. 16, as hipóteses que permitem conservar o dado após o término do tratamento, por que soft delete não é eliminação, anonimização irreversível, expurgo automático e o problema de backup e réplica. Use ao definir prazo de guarda, implementar exclusão de conta, desenhar rotina de expurgo ou revisar política de backup.
agent: lgpd-agent
---

# Retenção e descarte

## O princípio

O tratamento tem fim. O art. 15 define quando termina: alcançada a finalidade ou quando os dados
deixarem de ser necessários; fim do período de tratamento; comunicação do titular no exercício do
direito de revogação; ou determinação da autoridade nacional quando houver violação da lei.

O art. 16 é a consequência: **os dados devem ser eliminados após o término do tratamento** — com
exceções taxativas.

## As exceções do art. 16 — o que você PODE conservar

| # | Hipótese | Uso típico |
|---|---|---|
| I | Cumprimento de obrigação legal ou regulatória pelo controlador | Documento fiscal, registro contábil, obrigação trabalhista |
| II | Estudo por órgão de pesquisa, garantida, sempre que possível, a anonimização | Pesquisa formal |
| III | Transferência a terceiro, respeitados os requisitos de tratamento da lei | Cessão legítima e documentada |
| IV | Uso exclusivo do controlador, vedado o acesso por terceiro, desde que **anonimizados** os dados | Métrica agregada, série histórica |

Leia o inciso IV com atenção: ele **não** autoriza guardar o dado identificável "para uso interno".
Exige anonimização. Guardar histórico completo de um titular eliminado, com nome e e-mail, "porque
é só nosso", não cabe em nenhum dos quatro incisos.

O inciso I é a resposta ao caso mais comum: pedido de exclusão quando existe obrigação de retenção.
Você retém **o mínimo exigido pela obrigação**, elimina o resto e informa o titular do que
permaneceu e por quê. Reter a conta inteira porque uma nota fiscal exige o CPF é excesso.

## Soft delete NÃO é eliminação

O erro mais comum. `Ativo = false` ou `ExcluidoEm = agora` mantém o dado pessoal íntegro no banco,
acessível a quem tem acesso ao banco, presente no backup e restaurável. Para a LGPD isso é
**tratamento continuado**, não eliminação.

| Operação | O que faz | Vale como eliminação (art. 16)? |
|---|---|---|
| Soft delete | Marca flag; dado íntegro | **Não** |
| Hard delete | Remove a linha | Sim, se réplicas e backups forem tratados |
| Anonimização irreversível | Sobrescreve os identificadores | Sim (art. 12) — o dado sai do escopo da lei |
| Pseudonimização | Move a correlação para outro lugar | **Não** — continua dado pessoal |
| Criptografia da coluna | Protege, não elimina | **Não** — você tem a chave |

Soft delete continua útil para integridade referencial e para o negócio. Só não confunda os papéis:
ele resolve consistência, não conformidade.

**Na prática, anonimização costuma ser a melhor escolha** porque preserva o histórico operacional
(quantidades, datas, agregados) sem preservar identidade. Hard delete de um titular com histórico
frequentemente quebra integridade referencial e destrói informação que não é pessoal.

### Anonimização precisa ser irreversível

```csharp
// ❌ Não é anonimização: o valor original está a um decrypt de distância.
titular.Nome = _cripto.Criptografar(titular.Nome);

// ❌ Não é anonimização: hash determinístico de CPF é reidentificável por força bruta —
//    o espaço de CPFs válidos é pequeno.
titular.Documento = Convert.ToHexString(SHA256.HashData(bytesDocumento));

// ✅ Sobrescrita destrutiva. Não há caminho de volta.
titular.Anonimizar(_relogio.Agora);
```

Teste de sanidade: **existe alguma informação sob seu controle que reverte isso?** Chave de
criptografia, tabela de correlação, log de auditoria com o valor antigo, backup recente. Se sim,
não anonimizou — pseudonimizou.

Cuidado com reidentificação por combinação: remover o nome mas manter data de nascimento + CEP +
gênero identifica boa parte da população. Anonimização de conjunto exige generalizar ou suprimir os
quase-identificadores, não só apagar o nome.

## Definindo o prazo

O prazo sai da finalidade ou de obrigação legal — nunca de "achamos razoável".

| Origem do prazo | Como determinar |
|---|---|
| Finalidade cumprida | O dado deixou de ser necessário; elimine |
| Obrigação legal ou regulatória | Prazo da norma específica do setor; cite a norma |
| Prazo prescricional para defesa em processo | Art. 7, VI / art. 16, I — justifique o prazo aplicável |
| Consentimento revogado | Elimine, salvo as hipóteses do art. 16 |
| Conta inativa | Prazo definido em política, comunicado ao titular |

Nunca invente número de artigo ou prazo. Se o prazo depende de norma fiscal, trabalhista ou
setorial, **consulte o jurídico e registre a fonte** junto da política. A skill entrega a estrutura;
o prazo concreto é decisão documentada do produto.

Materialize o prazo onde o código consegue aplicá-lo:

```csharp
public sealed record PoliticaRetencao(
    string CodigoFinalidade,
    TimeSpan Prazo,
    BaseLegal BaseLegal,
    string FundamentoDocumentado,
    AcaoAoVencer AcaoAoVencer);

public enum AcaoAoVencer
{
    Anonimizar,
    Eliminar,
}
```

Prazo em constante espalhada pelo código não é política: é folclore. Centralize.

## Expurgo automático

Política sem rotina que a execute é intenção. Uma tarefa recorrente aplica o vencimento:

```csharp
public async Task ExecutarAsync(CancellationToken cancellationToken)
{
    var vencidos = await _repositorio.ObterVencidosAsync(_relogio.Agora, cancellationToken);

    foreach (var titular in vencidos)
    {
        titular.Anonimizar(_relogio.Agora);
        await _auditoria.RegistrarAsync(
            new EventoAuditoria(titular.Id, TipoEvento.ExpurgoPorRetencao, _relogio.Agora),
            cancellationToken);
    }

    await _repositorio.SalvarAsync(cancellationToken);

    _logger.LogInformation("Expurgo por retenção concluído | Titulares: {Total}", vencidos.Count);
}
```

Regras da rotina:

- Processa em lotes, com `CancellationToken` — a primeira execução pode encontrar anos de acúmulo.
- Registra o que fez na trilha de auditoria: o expurgo é evidência de conformidade.
- **Nunca** loga qual titular foi expurgado por nome ou e-mail; conta e identificador bastam.
- Idempotente: reexecutar não deve falhar sobre registro já anonimizado.
- Monitorada. Rotina de expurgo que falha silenciosamente por meses produz retenção indevida com
  aparência de política aplicada.

O log de conclusão acima é o resultado do **lote**, nunca um por titular — expurgo é decisão
automática que o titular pode contestar, e a linha do laço não acrescenta dimensão alguma. Critério
de quando emitir log em [`observabilidade`](../observabilidade/SKILL.md); trilha de auditoria é
outra coisa e continua sendo por titular, em [`consentimento-auditoria`](../consentimento-auditoria/SKILL.md).

## Backup e réplica — o ponto cego

Eliminação no banco primário não alcança backup, réplica de leitura, data warehouse, índice de
busca, cache, fila e arquivo exportado. Todos podem conter o dado.

Postura defensável:

| Superfície | Providência |
|---|---|
| Backup | Retenção curta e **documentada**; o dado expira com o ciclo do backup |
| Restauração | Procedimento obrigatório de reaplicar expurgos posteriores ao ponto restaurado |
| Réplica de leitura | Recebe a eliminação por replicação; verifique o lag |
| Data warehouse / analytics | Deve receber dado já anonimizado, ou entrar no ciclo de expurgo |
| Índice de busca | Remoção explícita — não some sozinho |
| Cache e fila | TTL curto; nunca guarde dado pessoal por tempo indeterminado |
| Exportação gerada | Link com expiração; nada residente em storage |

Não é obrigatório reescrever backup para atender a um pedido de eliminação — o defensável é ter
política de retenção curta, procedimento de reaplicação de expurgo após restauração, e tudo isso
**documentado antes** de o pedido chegar.

## Quando a retenção legal conflita com o pedido de exclusão

Fluxo correto:

1. Identifique quais dados estão sob obrigação legal de retenção.
2. Elimine ou anonimize **tudo o que não está**.
3. Bloqueie o tratamento do que permaneceu — retido não significa em uso.
4. Registre a base legal e o prazo para cada item retido.
5. Informe o titular: o que foi eliminado, o que permaneceu, por quê e até quando.
6. Ao vencer o prazo legal, o expurgo do remanescente acontece automaticamente.

O passo 6 é o mais esquecido. Dado retido por obrigação legal que nunca vence vira retenção
indeterminada — exatamente o que o art. 16 proíbe.

## Checklist

- [ ] Cada finalidade tem prazo de retenção definido e fundamento documentado.
- [ ] Prazo derivado de norma concreta ou da finalidade; nenhum número inventado.
- [ ] Soft delete não é usado como resposta a pedido de eliminação.
- [ ] Anonimização é irreversível — nenhuma chave, tabela de correlação ou log reverte.
- [ ] Quase-identificadores tratados; anonimização resiste a reidentificação por combinação.
- [ ] Rotina de expurgo existe, é idempotente, monitorada e registrada em auditoria.
- [ ] Expurgo não loga dado pessoal.
- [ ] Retenção de backup documentada e curta; procedimento de reaplicação após restore.
- [ ] Réplica, warehouse, índice de busca, cache e exportações incluídos no ciclo.
- [ ] Dado retido por obrigação legal está bloqueado para uso e tem prazo de vencimento.
- [ ] Titular é informado do que permaneceu, sob qual base e por quanto tempo.
