# <RN-1> — <Nome curto da regra>

> **Template.** Uma regra por arquivo. Nomeie como `rule-<feature>-<n>.md` e mantenha o identificador
> (`RN-1`) estável: ele é referenciado do documento da feature e das revisões.
>
> **Atenção:** o identificador vive **aqui, na documentação**. Nunca o embuta em mensagem de erro,
> constante, nome de teste ou comentário de código — é regra do [AGENTS.md](../../../../AGENTS.md).
> O código expressa a regra; a rastreabilidade mora neste arquivo.

**Feature:** [<feature>](../feature-example.md)
**Status:** vigente · revogada · substituída por <RN-x>

## Enunciado

A regra em uma frase, no imperativo e sem ambiguidade. Se precisar de "geralmente", "normalmente" ou
"na maioria dos casos", a regra ainda não está pronta — falta descobrir a exceção e escrevê-la.

> <Condição> ⇒ <consequência obrigatória>.

## Por quê

De onde a regra vem: exigência legal, decisão comercial, limitação operacional. Regra sem origem
conhecida é a que ninguém consegue mudar depois, porque ninguém sabe o que quebra ao removê-la.

## Casos

A tabela que vira teste. Inclua o limite exato e os dois lados dele — é onde mora o bug.

| Entrada | Resultado esperado |
|---|---|
| <caso típico> | <resultado> |
| <exatamente no limite> | <resultado> |
| <um passo além do limite> | <resultado> |
| <caso que parece violar, mas não viola> | <resultado> |

## Exceções

Quando a regra **não** se aplica, e quem pode autorizar a exceção. "Não há exceções" também é uma
resposta válida — e vale escrever, porque evita a pergunta de novo.

## Impacto

Onde a regra se manifesta: qual agregado a garante como invariante, qual tela a comunica ao usuário,
qual mensagem o usuário vê ao violá-la.

A regra deve ser garantida no **domínio** (`Core`), não apenas validada na tela. Validação de
interface é conveniência; invariante de agregado é garantia.
