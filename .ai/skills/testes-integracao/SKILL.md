---
name: testes-integracao
description: Testes de integração com banco real em container efêmero, isolamento por transação com rollback e suíte separada da unitária por ser lenta. Use ao testar repositório, migration, query ou qualquer fluxo que atravesse a fronteira de persistência.
agent: tester-agent
---

# Testes de integração

## Quando usar este nível

Repositório **não se testa unitariamente**. Mock de `DbContext` valida a expectativa do autor sobre o
EF Core, não o comportamento real — tradução de expressão, tracking, mapeamento de enum e constraint
de banco só aparecem contra um banco de verdade.

| Cubra por integração | Cubra por unitário |
|---|---|
| Repositório: consulta, gravação, filtro por specification | Invariante de agregado |
| Migration: aplica e reverte sem erro | Orquestração do serviço |
| Constraint, índice único, cascade | Expressão da specification em memória |
| Mapeamento de enum para string | Regra calculada |

## Banco real em container efêmero

O banco é subido em container por execução da suíte e descartado ao fim. Nunca aponte testes para um
banco compartilhado, de desenvolvimento ou de homologação — a suíte passa a depender de estado alheio
e falha de forma não reproduzível.

| Regra | Motivo |
|---|---|
| Container criado pela suíte, não pelo desenvolvedor | Roda igual na máquina local e na esteira |
| Porta atribuída dinamicamente | Duas execuções simultâneas não colidem |
| Migrations aplicadas uma vez, no setup da fixture | Custo pago uma vez, não por teste |
| Container destruído no teardown | Sem resíduo entre execuções |

A fixture de banco é compartilhada pela classe ou coleção de testes; o **isolamento** vem da
transação, não de recriar o container.

## Isolamento por transação com rollback

Cada teste abre uma transação no setup e faz **rollback** no teardown. Nenhum teste enxerga o dado do
outro e a ordem de execução deixa de importar.

```csharp
public sealed class <Entidade>RepositoryTests : IClassFixture<BancoFixture>, IAsyncLifetime
{
    private readonly BancoFixture _fixture;
    private IDbContextTransaction _transacao = null!;

    public <Entidade>RepositoryTests(BancoFixture fixture) => _fixture = fixture;

    public async ValueTask InitializeAsync() =>
        _transacao = await _fixture.Contexto.Database.BeginTransactionAsync();

    public async ValueTask DisposeAsync() => await _transacao.RollbackAsync();
}
```

Regras:

- **Rollback sempre**, inclusive quando o teste falha — o teardown roda de qualquer forma.
- Nada de `Commit` no teste; se o cenário exige commit, ele mesmo controla a transação interna.
- Não limpe tabelas com `DELETE` ou `TRUNCATE` entre testes: o rollback já faz isso, e mais barato.
- Dados de apoio criados dentro da transação do próprio teste, nunca em seed global mutável.

## Separação da suíte unitária

Testes de integração são **lentos** — container, migration e I/O real. Por isso **não** rodam a cada
build local; ficam em projeto ou categoria separada, executada sob demanda e na esteira.

```powershell
dotnet test <Produto>.slnx -c Release --filter "Category!=Integracao"
dotnet test <Produto>.slnx -c Release --filter "Category=Integracao"
```

```csharp
[Fact]
[Trait("Category", "Integracao")]
public async Task ObterPorCodigoAsync_QuandoExiste_DeveRetornar<Entidade>()
```

Uma suíte unitária que leva minutos deixa de ser executada. Mantenha a separação mesmo quando parecer
burocrática.

## O que assertar

- O dado **voltou do banco** com os valores gravados, incluindo enum convertido para string.
- A specification aplicada no repositório filtra o mesmo conjunto que filtra em memória.
- Violação de constraint sobe o erro esperado, não é silenciosamente engolida.
- A migration aplica sobre banco vazio **e** sobre a versão anterior.

Não asserte SQL gerado nem plano de execução: são detalhe de implementação do provider.

## Checklist de revisão

- [ ] Nenhum mock de `DbContext` — banco real.
- [ ] Container efêmero, nunca banco compartilhado.
- [ ] Transação aberta no setup e revertida no teardown.
- [ ] Teste independente de ordem e de dado deixado por outro teste.
- [ ] Marcado com a categoria de integração e fora do ciclo de build local.
- [ ] Suíte executada e saída conferida.

## Execução

```powershell
dotnet build <Produto>.slnx -c Release
dotnet test <Produto>.slnx -c Release --no-build --filter "Category=Integracao"
```

Sem erros e sem avisos. Nunca declare que passou sem ter executado; se falhou, reporte a saída real —
inclusive falha de subida do container, que é resultado de teste como qualquer outro.
