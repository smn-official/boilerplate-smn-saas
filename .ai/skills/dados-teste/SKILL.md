---
name: dados-teste
description: Construção de dados de teste — builders e object mothers, determinismo sem random ou relógio real, fixtures mínimas e quando compartilhar dado entre testes. Use ao criar massa de teste, reduzir repetição de construção ou diagnosticar teste intermitente.
agent: tester-agent
---

# Dados de teste

## Progressão

Comece pelo mais simples e suba só quando a repetição for real:

| Situação | Solução |
|---|---|
| Uma classe de teste, construção curta | Construtor direto no arrange |
| Uma classe de teste, construção repetida | Factory privada estática na própria classe |
| Várias classes, mesma entidade, variações pontuais | Builder |
| Cenário nomeado e recorrente do domínio | Object mother |
| Recurso caro compartilhado (banco, container) | Fixture |

Não crie builder para a primeira entidade que aparece. Três linhas duplicadas são melhores que uma
infraestrutura de dados usada uma vez.

## Factory privada

```csharp
private static <Entidade> Criar<Entidade>(string codigo = "<codigo-valido>") =>
    new(codigo, <outros>);
```

Privada, estática, sem condicional, sem estado. Serve enquanto a variação couber em parâmetros
opcionais da mesma classe de teste.

## Builder

Quando várias classes precisam da mesma entidade com variações diferentes:

```csharp
internal sealed class <Entidade>Builder
{
    private string _codigo = "<codigo-valido>";
    private <Status> _status = <Status>.<Padrao>;

    internal <Entidade>Builder ComCodigo(string codigo)
    {
        _codigo = codigo;
        return this;
    }

    internal <Entidade>Builder Com<Status>(<Status> status)
    {
        _status = status;
        return this;
    }

    internal <Entidade> Construir() => new(_codigo, _status);
}
```

Regras:

- Defaults **sempre válidos**: `new <Entidade>Builder().Construir()` produz entidade consistente.
- O teste sobrescreve **somente o que o cenário exige** — o resto é ruído que esconde a intenção.
- O builder monta pela API pública do agregado. Se não consegue, o problema é no desenho do agregado.
- Um builder por agregado, no projeto de testes, `internal`. Nunca em código de produção.

```csharp
var <entidade> = new <Entidade>Builder().Com<Status>(<Status>.<Inativo>).Construir();
```

## Object mother

Para cenários nomeados do domínio que aparecem repetidamente:

```csharp
internal static class <Entidade>Mother
{
    internal static <Entidade> Ativa() => new <Entidade>Builder().Construir();

    internal static <Entidade> Inativa() =>
        new <Entidade>Builder().Com<Status>(<Status>.<Inativo>).Construir();
}
```

O nome do método é vocabulário do negócio. Se precisar de parâmetro para expressar a variação, use o
builder direto — object mother com cinco parâmetros é um builder pior.

## Determinismo

Teste intermitente é pior que teste ausente: treina a equipe a reexecutar até passar.

| Nunca | Use |
|---|---|
| `new Random()` | `new Random(<seed-fixa>)`, ou valores literais |
| `Guid.NewGuid()` em asserção | Guid literal fixo por cenário |
| `DateTime.Now` / `UtcNow` | Data literal fixa, ou relógio injetado e mockado |
| Dado dependente de fuso ou cultura da máquina | `DateTimeOffset` explícito, cultura invariante |
| Ordem de coleção não garantida | Asserção sem ordem, ou `OrderBy` explícito |

```csharp
private static readonly DateTimeOffset ReferenciaFixa = new(2024, 1, 15, 12, 0, 0, TimeSpan.Zero);
```

Quando o comportamento depende do tempo, injete o relógio no serviço e mocke-o — não faça o teste
esperar nem tolerar diferença de milissegundos.

Valores de fronteira (vazio, limite, negativo) entram como literais explícitos no teste: eles **são**
o cenário e devem estar visíveis no arrange, não escondidos no builder.

## Fixtures

Fixture existe para recurso **caro**, não para dado de negócio. Mantenha mínima:

- Só o que o teste realmente usa; nenhum registro "por precaução".
- Sem estado mutável compartilhado entre testes.
- Isolamento em integração vem da transação com rollback, não da fixture — veja `testes-integracao`.

## Dado compartilhado

Compartilhe **apenas quando a repetição for real** — a mesma construção, com o mesmo significado, em
vários lugares. Compartilhamento prematuro produz o pior acoplamento de suíte: mudar o dado para
atender um teste quebra outros três sem relação.

| Compartilhe | Mantenha local |
|---|---|
| Builder do agregado usado por várias classes | Valor de fronteira específico do cenário |
| Cenário nomeado do domínio, repetido de fato | Dado usado por um único teste |
| Recurso caro de infraestrutura | Qualquer coisa que o teste precise ajustar |

Na dúvida, mantenha local e duplique. Consolidar depois é barato; desfazer acoplamento não é.

## Checklist de revisão

- [ ] Nenhum `Random`, `Guid.NewGuid()` ou `DateTime.Now` sem seed ou fixação.
- [ ] Builder com defaults válidos; teste sobrescreve só o que o cenário exige.
- [ ] Valor de fronteira visível no arrange, não escondido no builder.
- [ ] Nenhum estado mutável compartilhado entre testes.
- [ ] Builder e mother `internal`, apenas no projeto de testes.
- [ ] Suíte executada duas vezes seguidas, com o mesmo resultado.

## Execução

```powershell
dotnet test <Produto>.slnx -c Release
```

Sem erros e sem avisos. Nunca declare que passou sem ter executado; se falhou, reporte a saída real.
