---
name: dependencias-vulneraveis
description: Verificação de dependência vulnerável em .NET e npm — dotnet list package --vulnerable --include-transitive, npm audit, pin de dependência transitiva no .csproj com justificativa, Dependabot/Renovate, avaliação de severidade CVSS e alcançabilidade do caminho vulnerável, e risco de pacote abandonado. Use ao auditar alteração em .csproj, package.json ou lockfile, e periodicamente sobre a esteira.
agent: security-agent
---

# Dependências vulneráveis

Biblioteca desatualizada é o vetor que não aparece no diff de código: o `.csproj` mudou uma linha e
a superfície de ataque mudou junto. Ela é um dos dois alvos primários da auditoria.

## Comandos de verificação

```bash
# .NET — o --include-transitive é obrigatório: a maioria das vulnerabilidades chega por transitiva
dotnet restore <Produto>.slnx
dotnet list <Produto>.slnx package --vulnerable --include-transitive
dotnet list <Produto>.slnx package --deprecated
dotnet list <Produto>.slnx package --outdated
```

```bash
# npm — no diretório do projeto Web
npm audit
npm audit --production          # ignora devDependencies, que não vão para produção
npm outdated
```

Rode `restore` antes: sem grafo restaurado, `--vulnerable` reporta menos do que existe.

`--deprecated` importa tanto quanto `--vulnerable`: pacote depreciado não recebe correção, então
a próxima vulnerabilidade nele não terá versão corrigida.

## Interpretando o resultado

Nem todo achado é urgente, e nem todo achado é ignorável. Avalie em três eixos:

| Eixo | Pergunta | Efeito na prioridade |
|---|---|---|
| **Severidade** | Qual a nota CVSS e o vetor? | Base da classificação |
| **Alcançabilidade** | O código chama o caminho vulnerável? | Reduz ou confirma |
| **Exposição** | O caminho recebe entrada externa não autenticada? | Eleva |

O eixo de alcançabilidade é o que separa auditoria de alarme automatizado:

| Situação | Severidade efetiva |
|---|---|
| Vulnerabilidade de parser XML, e o produto nunca desserializa XML de origem externa | Rebaixe |
| Vulnerabilidade em `devDependency` que só roda no build local | Rebaixe |
| Vulnerabilidade em biblioteca de serialização usada no endpoint público | Mantenha ou eleve |
| RCE não autenticado em componente na borda da requisição | 🔴 Crítico, sem discussão |
| Vulnerabilidade em ferramenta da esteira com acesso a segredo de deploy | Eleve — compromete o pipeline |

Registre a avaliação por escrito. "Não é alcançável" sem justificativa vira desculpa permanente.

**Nunca invente identificador de CVE, versão corrigida ou nota CVSS.** Reporte o que a ferramenta
devolveu, com o link do aviso; se não puder consultar a fonte, descreva o risco sem atribuir número.
CVE inventado é pior que nenhum: manda o time corrigir a coisa errada.

## Pin de dependência transitiva

Quando a vulnerabilidade está numa transitiva e o pacote direto ainda não publicou versão que a
resolva, force a versão no `.csproj`. O .NET respeita a referência direta sobre a resolução
transitiva.

Padrão obrigatório — **com comentário do motivo**, único caso em que comentário é exigido no
`.csproj`:

```xml
<ItemGroup>
  <!-- Pin transitivo: <Pacote.Direto> traz <Pacote.Transitivo> 1.2.3, com aviso de segurança.
       Remover quando <Pacote.Direto> >= 5.0.0 passar a resolver 1.4.0 sozinho.
       Aviso: <link do advisory>. Revisar em <AAAA-MM>. -->
  <PackageReference Include="<Pacote.Transitivo>" Version="1.4.0" />
</ItemGroup>
```

O comentário responde três perguntas que o próximo leitor terá: **por que** existe, **quando** pode
sair e **onde** conferir. Pin sem essas respostas vira entulho permanente — ninguém remove o que
não entende, e o pin acaba segurando a dependência numa versão antiga por anos.

Em solução com `Directory.Packages.props` (versionamento central), o pin vai lá, não em cada
`.csproj`, e o comentário acompanha.

No npm, o equivalente é `overrides` no `package.json`:

```json
{
  "overrides": {
    "<pacote-transitivo>": "1.4.0"
  }
}
```

`overrides` não aceita comentário — registre a justificativa num arquivo de decisões da esteira e
referencie a data de revisão.

## Automação

| Ferramenta | Papel |
|---|---|
| Dependabot | Abre PR por atualização; nativo no GitHub, configurável por ecossistema |
| Renovate | Mais configurável: agrupamento, agendamento, auto-merge de patch |
| `dotnet list --vulnerable` na esteira | Falha o build quando aparece vulnerabilidade |
| `npm audit` na esteira | Idem para o front-end |

Faça a verificação **falhar o pipeline**, não apenas registrar aviso:

```yaml
- script: |
    dotnet restore $(solution)
    dotnet list $(solution) package --vulnerable --include-transitive 2>&1 | tee auditoria.txt
    if grep -q "has the following vulnerable packages" auditoria.txt; then
      echo "Dependência vulnerável encontrada"
      exit 1
    fi
  displayName: Auditoria de dependências .NET
```

Aviso que não quebra o build é aviso que ninguém lê. Se um achado precisa ser tolerado
temporariamente, a exceção é explícita e datada — nunca a ausência de verificação.

Cuidados com automação:

- PR automático de atualização **precisa de revisão**: pacote comprometido chega por atualização
  legítima, e auto-merge sem revisão é o cenário de ataque à cadeia de suprimentos.
- Auto-merge, quando existir, só para patch, com suíte de testes verde e em pacote de origem
  confiável.
- Agrupe atualizações de patch para reduzir ruído; mantenha major separado, com revisão dedicada.

## Runtime e SDK

Dependência não é só pacote. O runtime .NET e o Node também recebem correção de segurança.

- Fixe a versão do runtime no App Service e acompanhe o ciclo de suporte da versão em uso.
- Rodar em versão **fora de suporte** significa não receber correção — é vulnerabilidade por
  definição, mesmo sem CVE aberto naquele momento.
- `global.json` fixa o SDK: revise-o junto com as dependências, senão a esteira congela numa versão
  antiga sem que ninguém perceba.
- Imagem base de container também é dependência: reconstrua periodicamente, não só quando o código
  muda.

## Pacote abandonado

Risco silencioso: nenhuma ferramenta acusa, porque não há CVE — ainda.

| Sinal | Como verificar |
|---|---|
| Último release há muito tempo | Página do pacote no registro |
| Issues de segurança abertas sem resposta | Repositório de origem |
| Mantenedor único, sem sucessão | Histórico de commits |
| Marcado como deprecated | `dotnet list --deprecated`, `npm outdated` |
| Repositório arquivado | Aviso no GitHub |
| Download de pacote com nome parecido com um popular | Typosquatting — confira o nome caractere a caractere |

Ao avaliar dependência **nova** no diff, some ao exame de vulnerabilidade:

- O problema resolvido justifica a superfície adicionada? Pacote de 200 linhas que você escreveria
  em 30 é risco desnecessário.
- Quantas transitivas ele arrasta? Uma dependência direta pode significar quarenta indiretas.
- É mantido? Tem licença compatível?
- O nome está correto? Typosquatting acerta principalmente em revisão apressada.

## Reporte de achado

```
🟠 **Dependência — Pacote com vulnerabilidade conhecida**
📍 `src/<Produto>.<Modulo>.Web/<Produto>.<Modulo>.Web.csproj` linha <N>
🎯 Impacto: <o que a vulnerabilidade permite, conforme o aviso>
🔍 Alcançabilidade: <o caminho vulnerável é chamado? por qual rota? com entrada externa?>
📦 Origem: transitiva via `<Pacote.Direto>` <versão>
✅ Correção: atualizar `<Pacote.Direto>` para <versão>, ou pin transitivo com justificativa
🔗 Aviso: <link retornado pela ferramenta>
```

## Checklist

- [ ] `dotnet list package --vulnerable --include-transitive` executado após `restore`.
- [ ] `dotnet list package --deprecated` executado.
- [ ] `npm audit` executado no projeto Web.
- [ ] Cada achado avaliado por severidade **e** alcançabilidade, com justificativa registrada.
- [ ] Nenhum CVE, versão ou nota CVSS inventado; toda referência tem link.
- [ ] Pin transitivo com comentário de motivo, condição de remoção e data de revisão.
- [ ] Verificação de dependências falha o pipeline, não apenas avisa.
- [ ] Atualização automática passa por revisão humana; auto-merge só em patch com testes verdes.
- [ ] Runtime, SDK e imagem base dentro do período de suporte.
- [ ] Dependência nova justificada: problema real, manutenção ativa, transitivas contadas, nome
      conferido contra typosquatting.
