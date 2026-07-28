---
name: consentimento-auditoria
description: Coleta e registro de consentimento válido sob a LGPD (art. 8 e 9), revogação, trilha de auditoria imutável de acesso a dado pessoal, relatório de impacto (RIPD) e registro das operações de tratamento do art. 37. Use ao implementar aceite de termos, versionar política de privacidade, construir log de auditoria ou preparar evidência de conformidade.
agent: lgpd-agent
---

# Consentimento e auditoria

## O que torna um consentimento válido

O art. 5, XII define consentimento como manifestação **livre, informada e inequívoca** pela qual o
titular concorda com o tratamento para **finalidade determinada**. O art. 8 acrescenta forma e ônus.

| Requisito | Significa | Falha típica no código |
|---|---|---|
| Livre | Sem coação; recusar não pode inviabilizar o serviço não relacionado | Checkbox obrigatório para concluir o cadastro |
| Informado | O titular sabe o que aceitou | Link para política que mudou depois, sem versionamento |
| Inequívoco | Ação afirmativa | Checkbox pré-marcado; consentimento por inação |
| Finalidade determinada | Específico, não genérico | Um aceite para "tratamento de dados" em geral |
| Destacado | Cláusula em evidência, separada das demais | Consentimento escondido nos termos de uso |
| Por finalidade | Um consentimento por finalidade distinta | Aceite único cobrindo cadastro, marketing e compartilhamento |

Regras que decorrem do art. 8:

- **§ 2** — cabe ao controlador o ônus de provar que o consentimento foi obtido conforme a lei.
  Sem registro, você não prova.
- **§ 3** — consentimento para finalidades genéricas é **nulo**.
- **§ 4** — deve referir-se a finalidades determinadas.
- **§ 5** — pode ser revogado a qualquer momento, por manifestação expressa do titular, mediante
  **procedimento gratuito e facilitado**.
- **§ 6** — mudança de finalidade incompatível exige nova informação ao titular, que pode revogar.

O art. 9 detalha a informação devida (finalidade específica, forma e duração, identificação do
controlador, uso compartilhado e finalidade, responsabilidades, direitos do titular), e o § 1
determina que informação com conteúdo enganoso, abusivo ou não fornecida previamente torna o
consentimento **nulo**.

Dado sensível segue o art. 11, I: consentimento **específico e destacado**, para finalidades
específicas. Um aceite genérico não sustenta tratamento de dado sensível.

## O que registrar — e por que o registro é o produto

Consentimento sem registro não existe juridicamente: o ônus da prova é seu (art. 8, § 2). Registre:

| Campo | Por quê |
|---|---|
| Identificador do titular | Correlação |
| Código da finalidade | Consentimento é por finalidade |
| Versão do texto aceito | Provar **o que** foi aceito, não apenas que houve aceite |
| Data e hora | Delimitar o período de validade |
| Canal / como foi obtido | Formulário web, aceite em fluxo, importação |
| IP e user-agent | Evidência da manifestação (base: art. 7, IX) |
| Situação | Concedido / revogado |
| Data da revogação | Delimitar o fim do tratamento consentido |

```csharp
public sealed class RegistroConsentimento
{
    private RegistroConsentimento() { }

    public RegistroConsentimento(Guid titularId, string codigoFinalidade, string versaoTexto,
        CanalConsentimento canal, string origemIp, DateTimeOffset concedidoEm)
    {
        if (string.IsNullOrWhiteSpace(codigoFinalidade))
            throw new DominioException(MensagensPrivacidade.ConsentimentoSemFinalidade);
        if (string.IsNullOrWhiteSpace(versaoTexto))
            throw new DominioException(MensagensPrivacidade.ConsentimentoSemVersaoTexto);

        Id = Guid.CreateVersion7();
        TitularId = titularId;
        CodigoFinalidade = codigoFinalidade;
        VersaoTexto = versaoTexto;
        Canal = canal;
        OrigemIp = origemIp;
        ConcedidoEm = concedidoEm;
    }

    public Guid Id { get; }
    public Guid TitularId { get; }
    public string CodigoFinalidade { get; }
    public string VersaoTexto { get; }
    public CanalConsentimento Canal { get; }
    public string OrigemIp { get; }
    public DateTimeOffset ConcedidoEm { get; }
    public DateTimeOffset? RevogadoEm { get; private set; }

    public bool EstaVigente => RevogadoEm is null;

    public void Revogar(DateTimeOffset agora)
    {
        if (RevogadoEm is not null)
            throw new DominioException(MensagensPrivacidade.ConsentimentoJaRevogado);

        RevogadoEm = agora;
    }
}
```

### Registro é append-only

Revogar **não** apaga a linha: marca `RevogadoEm`. O histórico prova que, no período em que o
tratamento ocorreu, havia consentimento vigente. Deletar o registro destrói exatamente a evidência
de que você precisa.

O mesmo vale para nova concessão: cria linha nova, não sobrescreve a anterior. A sequência
concedido → revogado → concedido é informação, não ruído.

### Versionar o texto, não só referenciá-lo

Guardar apenas `versaoTexto = "v3"` sem preservar o conteúdo de "v3" é registro incompleto:
quando questionado sobre o que o titular aceitou, você precisa exibir o texto.

```csharp
public sealed record TextoConsentimento(
    string CodigoFinalidade,
    string Versao,
    string Conteudo,
    DateTimeOffset VigenteDesde);
```

Textos são imutáveis. Correção de texto gera versão nova; alterar o conteúdo de uma versão já
aceita reescreve a história.

### Mudança de texto exige nova coleta?

| Mudança | Ação |
|---|---|
| Correção de redação, sem alterar finalidade nem escopo | Nova versão; consentimento anterior permanece válido |
| Nova finalidade ou ampliação do escopo | **Nova coleta** — o titular não consentiu com isso |
| Novo destinatário de compartilhamento | Nova coleta (art. 9, V e art. 8, § 6) |
| Redução de escopo | Nova versão; sem nova coleta |

## Revogação tão fácil quanto a concessão

O art. 8, § 5 exige procedimento **gratuito e facilitado**. Se conceder levou um clique, revogar
não pode exigir e-mail para o suporte e três dias úteis.

```csharp
[HttpPost("consentimentos/{codigoFinalidade}/revogar")]
[Authorize]
[ValidateAntiForgeryToken]
public async Task<IActionResult> Revogar(string codigoFinalidade,
    CancellationToken cancellationToken)
{
    await _servicoConsentimento.RevogarAsync(
        UsuarioAtual.TitularId, codigoFinalidade, cancellationToken);

    return RedirectToAction(nameof(Privacidade));
}
```

Após a revogação, o tratamento fundado naquele consentimento **para imediatamente**. Se a única
base era consentimento, o dado entra no ciclo de eliminação do art. 16. Revogação que não muda o
comportamento do sistema é revogação de fachada.

Atenção: revogação de consentimento **não** derruba tratamento fundado em outra base legal. Se o
e-mail é tratado sob execução de contrato (art. 7, V), revogar o consentimento de marketing não
apaga a conta. Por isso a finalidade precisa ser granular.

## Trilha de auditoria de acesso a dado pessoal

Registre quem acessou qual dado pessoal e quando. Sustenta o art. 6, X (responsabilização), o
art. 46 (segurança) e a investigação de incidente.

| Campo | Conteúdo |
|---|---|
| Quem | Identificador do operador/usuário interno, nunca o nome |
| O quê | Titular acessado e categoria do dado — **não o valor** |
| Quando | Timestamp com fuso |
| Onde | Rota/operação |
| Por quê | Contexto: atendimento, exportação, expurgo |
| Resultado | Sucesso ou negado |

```csharp
public sealed record EventoAuditoria(
    Guid TitularId,
    Guid OperadorId,
    TipoEvento Tipo,
    string Operacao,
    DateTimeOffset OcorridoEm);
```

Regras:

- **Imutável**: sem `UPDATE`, sem `DELETE`. No PostgreSQL, a role da aplicação recebe `INSERT` e
  `SELECT` na tabela de auditoria, nunca `UPDATE`/`DELETE`.
- **Não guarde o valor do dado pessoal acessado** — a trilha viraria uma segunda cópia da base.
  Guarde a categoria ("documento", "contato"), não o conteúdo.
- Retenção própria e documentada; a trilha também vence.
- Acesso à trilha é privilegiado e ele mesmo auditado.
- Eventos mínimos: leitura de dado sensível, exportação, correção, anonimização, expurgo,
  concessão e revogação de consentimento, acesso administrativo a dado de titular.

## Relatório de impacto (RIPD)

O art. 5, XVII define o relatório de impacto à proteção de dados pessoais; o art. 38 permite que a
ANPD determine ao controlador que o elabore, inclusive quando o tratamento se fundar em legítimo
interesse (art. 10, § 3).

Elabore preventivamente quando houver alto risco:

- Tratamento em larga escala de dado sensível.
- Monitoramento sistemático de titulares.
- Decisão automatizada com efeito relevante sobre o titular.
- Uso de nova tecnologia sobre dado pessoal.
- Tratamento de dado de criança ou adolescente (art. 14).
- Compartilhamento com terceiros em volume ou sensibilidade relevantes.

O relatório descreve os tipos de dados coletados, a metodologia de coleta e de segurança, e a
análise do controlador sobre medidas, salvaguardas e mecanismos de mitigação de risco.

## Registro das operações de tratamento (art. 37)

Controlador e operador devem manter registro das operações de tratamento que realizarem,
especialmente quando fundado em legítimo interesse. Não é documento opcional, e não deveria ser
mantido à mão em planilha desatualizada.

Se a tabela de finalidades da skill `principios-lgpd` estiver viva, o registro é gerado dela:

| Coluna do registro | Origem no código |
|---|---|
| Finalidade | `FinalidadeTratamento.Descricao` |
| Base legal | `FinalidadeTratamento.BaseLegal` |
| Categorias de dados | Metadado das colunas mapeadas |
| Categorias de titulares | Configuração da finalidade |
| Destinatários / compartilhamento | Registro de compartilhamento |
| Prazo de retenção | `PoliticaRetencao.Prazo` |
| Medidas de segurança | Documentação de arquitetura |

Registro derivado do código diverge menos que registro mantido em paralelo.

## Encarregado (DPO)

O art. 41 exige a indicação de encarregado, com identidade e informações de contato divulgadas
publicamente, de forma clara e objetiva, preferencialmente no sítio eletrônico do controlador.
Garanta que o canal exista na interface e que os pedidos recebidos por ele cheguem ao fluxo
implementado em `direitos-titular` — canal que termina numa caixa de e-mail sem processo é o
caminho mais curto para estourar o prazo de 15 dias.

## Checklist

- [ ] Um consentimento por finalidade; nenhum aceite genérico (art. 8, § 3 — nulidade).
- [ ] Checkbox nunca pré-marcado; ação afirmativa exigida.
- [ ] Consentimento não é condição para serviço que independe dele.
- [ ] Dado sensível com consentimento específico e destacado (art. 11, I).
- [ ] Registro guarda titular, finalidade, versão do texto, data, canal e origem.
- [ ] Texto do consentimento versionado e imutável, com conteúdo preservado.
- [ ] Registro append-only: revogação marca data, nunca apaga a linha.
- [ ] Revogação disponível na interface, gratuita e com o mesmo esforço da concessão.
- [ ] Revogação interrompe de fato o tratamento fundado naquele consentimento.
- [ ] Trilha de auditoria imutável, sem valor de dado pessoal, com retenção própria.
- [ ] Privilégio da aplicação na tabela de auditoria limitado a `INSERT` e `SELECT`.
- [ ] RIPD elaborado quando o tratamento é de alto risco.
- [ ] Registro das operações de tratamento (art. 37) atualizado e derivado do código.
- [ ] Contato do encarregado publicado e ligado ao fluxo de atendimento ao titular.
