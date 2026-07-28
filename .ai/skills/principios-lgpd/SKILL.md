---
name: principios-lgpd
description: Os dez princípios do art. 6 e as dez bases legais do art. 7 da LGPD traduzidos em decisão de código, mais a distinção dado pessoal vs dado sensível (art. 5, II) e o regime do art. 11. Use ao justificar um tratamento, escolher base legal, avaliar se uma coleta cabe na finalidade ou revisar feature nova quanto a fundamento legal.
agent: lgpd-agent
---

# Princípios e bases legais

Antes de escrever a primeira propriedade da entidade, responda três perguntas:

1. **Qual a finalidade?** Em uma frase, específica e explícita.
2. **Qual a base legal?** Um dos incisos do art. 7 — ou do art. 11, se o dado for sensível.
3. **O dado é necessário para essa finalidade?** Se não é, ele não entra.

Sem as três respostas, o campo não vai para o schema.

## Os dez princípios do art. 6 em decisão de código

| # | Princípio | O que isso obriga no código |
|---|---|---|
| I | Finalidade | Cada campo pessoal mapeia para uma finalidade declarada; reuso para outro fim exige nova análise |
| II | Adequação | O tratamento é compatível com o que foi informado ao titular — não use e-mail de cadastro para marketing sem base própria |
| III | Necessidade | Colete o mínimo; campo "que pode ser útil depois" é violação, não previdência |
| IV | Livre acesso | Existe consulta que devolve ao titular tudo que você guarda dele, sem depender de intervenção manual de engenharia |
| V | Qualidade dos dados | Há caminho de correção e o dado desatualizado não é propagado como verdade |
| VI | Transparência | A política de privacidade descreve o que o código realmente faz; divergência é o problema |
| VII | Segurança | Criptografia, controle de acesso, hash de credencial — ver `dados-pessoais-modelagem` |
| VIII | Prevenção | Medidas antes do incidente: revisão de acesso, expurgo automático, ambiente segregado |
| IX | Não discriminação | Nenhum tratamento para fim discriminatório ilícito ou abusivo — atenção a regra automatizada que usa proxy de dado sensível |
| X | Responsabilização e prestação de contas | Você precisa **demonstrar** a conformidade: registro, trilha, versionamento de texto |

O inciso X é o que transforma os outros nove em obrigação de guardar evidência. Sem registro,
"nós cumprimos" é afirmação indemonstrável.

## As dez bases legais do art. 7

| # | Base legal | Quando é a escolha certa |
|---|---|---|
| I | Consentimento do titular | Só quando nenhuma outra base cabe e a escolha do titular é genuinamente livre |
| II | Cumprimento de obrigação legal ou regulatória pelo controlador | Retenção fiscal, obrigação setorial, resposta a autoridade |
| III | Execução de política pública pela administração pública | Contexto de órgão público |
| IV | Realização de estudos por órgão de pesquisa, com anonimização sempre que possível | Pesquisa formal |
| V | Execução de contrato ou de procedimentos preliminares a pedido do titular | **A base mais comum em produto**: cadastro, faturamento, entrega do serviço |
| VI | Exercício regular de direitos em processo judicial, administrativo ou arbitral | Retenção para defesa em litígio |
| VII | Proteção da vida ou da incolumidade física do titular ou de terceiro | Emergência |
| VIII | Tutela da saúde, em procedimento por profissional/serviço de saúde ou autoridade sanitária | Contexto de saúde |
| IX | Legítimo interesse do controlador ou de terceiro, observados os direitos do titular | Segurança, prevenção a fraude, melhoria do serviço — exige teste de balanceamento |
| X | Proteção do crédito | Análise creditícia |

### Consentimento não é a base preferencial

Erro recorrente: tratar consentimento como o caminho padrão. Ele é o **mais frágil** para o
controlador, porque é revogável a qualquer momento (art. 8, § 5) e obriga a interromper o
tratamento quando revogado.

| Tratamento | Base errada (frágil) | Base adequada |
|---|---|---|
| Guardar e-mail para o titular fazer login | Consentimento | Art. 7, V — execução de contrato |
| Emitir documento fiscal com dados do titular | Consentimento | Art. 7, II — obrigação legal |
| Registrar IP e user-agent para detectar fraude | Consentimento | Art. 7, IX — legítimo interesse |
| Enviar comunicação de marketing não relacionada | Legítimo interesse | Art. 7, I — consentimento |
| Compartilhar dado com parceiro para oferta dele | Legítimo interesse | Art. 7, I — consentimento |

Regra prática: **se o titular disser "não" e mesmo assim o serviço tiver de continuar prestado,
consentimento é a base errada.** Consentimento pressupõe escolha real; consentimento obrigatório
para usar o produto não é livre e, portanto, não é válido.

### Legítimo interesse tem requisitos (art. 10)

Não é base coringa. Exige:

- Finalidade legítima e concreta (segurança, prevenção a fraude, suporte ao serviço).
- Tratamento **limitado ao necessário** para aquela finalidade.
- Consideração das legítimas expectativas do titular e de seus direitos fundamentais.
- Transparência sobre o tratamento.
- Registro do teste de balanceamento — a ANPD pode solicitar relatório de impacto (art. 10, § 3).

Dado sensível **não** se sustenta em legítimo interesse — essa base não existe no art. 11.

## Dado pessoal vs dado sensível

Dado sensível (art. 5, II) é lista fechada: origem racial ou étnica, convicção religiosa, opinião
política, filiação a sindicato ou a organização de caráter religioso, filosófico ou político, dado
referente à saúde ou à vida sexual, dado genético e dado biométrico.

CPF, e-mail, telefone e endereço são dados pessoais **comuns**, não sensíveis — o que não os torna
livres: seguem o art. 7 e todos os princípios.

Cuidado com o dado que **revela** dado sensível por inferência: foto usada para reconhecimento
facial vira biométrico; campo "restrição alimentar" pode revelar convicção religiosa ou saúde.
O regime segue a informação revelada, não o nome da coluna.

### Regime do art. 11 — mais rígido

| | Dado comum (art. 7) | Dado sensível (art. 11) |
|---|---|---|
| Consentimento | Livre, informado, inequívoco | **Específico e destacado**, para finalidades específicas |
| Legítimo interesse | Disponível (art. 7, IX) | **Indisponível** |
| Execução de contrato | Disponível (art. 7, V) | Indisponível como hipótese autônoma |
| Hipóteses sem consentimento | Dez incisos | Lista menor: obrigação legal, política pública, estudo por órgão de pesquisa com anonimização sempre que possível, exercício regular de direitos, proteção da vida, tutela da saúde por profissional/serviço de saúde ou autoridade sanitária, prevenção à fraude e à segurança do titular em processos de identificação e autenticação |

Consequência de engenharia: se a feature toca dado sensível, **assuma o caminho mais restritivo** —
consentimento destacado, criptografia em repouso, acesso segregado por papel e trilha de auditoria
obrigatória. Se o produto não precisa daquele dado, a decisão mais barata é não coletá-lo.

## Materializando a base legal no código

A base legal não pode viver só no documento. Deixe-a explícita e consultável:

```csharp
namespace <Produto>.Core.Privacidade;

/// <summary>Base legal do art. 7 da Lei 13.709/2018 que fundamenta um tratamento.</summary>
public enum BaseLegal
{
    Consentimento,
    ObrigacaoLegal,
    PoliticaPublica,
    EstudoPorOrgaoDePesquisa,
    ExecucaoDeContrato,
    ExercicioRegularDeDireitos,
    ProtecaoDaVida,
    TutelaDaSaude,
    LegitimoInteresse,
    ProtecaoDoCredito,
}
```

```csharp
/// <summary>Finalidade declarada para a qual um conjunto de dados do titular é tratado.</summary>
public sealed class FinalidadeTratamento
{
    private FinalidadeTratamento() { }

    public FinalidadeTratamento(string codigo, string descricao, BaseLegal baseLegal,
        TimeSpan prazoRetencao)
    {
        if (string.IsNullOrWhiteSpace(codigo))
            throw new DominioException(MensagensPrivacidade.FinalidadeSemCodigo);
        if (string.IsNullOrWhiteSpace(descricao))
            throw new DominioException(MensagensPrivacidade.FinalidadeSemDescricao);
        if (prazoRetencao <= TimeSpan.Zero)
            throw new DominioException(MensagensPrivacidade.PrazoRetencaoInvalido);

        Codigo = codigo;
        Descricao = descricao;
        BaseLegal = baseLegal;
        PrazoRetencao = prazoRetencao;
    }

    public string Codigo { get; }
    public string Descricao { get; }
    public BaseLegal BaseLegal { get; }
    public TimeSpan PrazoRetencao { get; }
}
```

Enum persistido como string (`HasConversion<string>()`) — o valor precisa continuar legível numa
consulta de auditoria feita anos depois, e ordinal de enum muda quando alguém reordena a lista.

Essa tabela é o embrião do registro de operações de tratamento do art. 37: mantê-la viva custa
pouco e é a diferença entre demonstrar conformidade e reconstruí-la sob pressão.

## Mudança de finalidade

Reusar dado coletado para a finalidade A na finalidade B **não** é automático:

- Se B é compatível com A e com a legítima expectativa do titular, avalie a mesma base legal.
- Se B é incompatível, é tratamento novo: nova finalidade, nova base legal e, quando a base for
  consentimento, nova coleta de consentimento.
- Registre a decisão. "Sempre usamos assim" não é fundamento.

Exemplo concreto: e-mail coletado para autenticação (art. 7, V) não migra sozinho para disparo de
comunicação promocional — a finalidade é outra e a base provável é o art. 7, I.

## Checklist

- [ ] Cada campo pessoal tem finalidade declarada em uma frase específica.
- [ ] Cada finalidade tem base legal do art. 7 (ou art. 11 para sensível) registrada em código.
- [ ] Consentimento só onde a escolha do titular é realmente livre e o serviço sobrevive ao "não".
- [ ] Legítimo interesse com teste de balanceamento registrado, nunca sobre dado sensível.
- [ ] Dado sensível identificado, inclusive o revelado por inferência, e tratado sob o art. 11.
- [ ] Minimização verificada campo a campo — nenhum "pode ser útil depois".
- [ ] Reuso de dado para finalidade nova passou por análise, não por conveniência.
- [ ] Política de privacidade descreve o que o código faz, sem divergência.
- [ ] Enum de base legal persistido como string.
