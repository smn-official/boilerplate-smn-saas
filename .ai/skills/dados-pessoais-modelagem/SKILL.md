---
name: dados-pessoais-modelagem
description: Modelagem de dado pessoal com EF Core e PostgreSQL sob a LGPD — minimização, proibição de dado pessoal em telemetria e log, criptografia em repouso, hash com salt, pseudonimização, separação em tabela própria e cuidados com índice, backup e ambiente de homologação. Use ao criar entidade que guarda dado de pessoa, definir o que logar ou revisar schema.
agent: lgpd-agent
---

# Modelagem de dado pessoal

## Minimização é decisão de schema

Cada coluna pessoal é passivo: precisa ser protegida, exportada quando o titular pedir, expurgada
no fim da retenção e explicada numa fiscalização. Colete só o que a finalidade exige.

| Sinal de excesso | Correção |
|---|---|
| Campo coletado "porque o formulário já tinha" | Remova |
| Data de nascimento completa quando só importa maioridade | Guarde `bool MaiorDeIdade` ou faixa etária |
| CPF guardado sem finalidade fiscal ou de identificação unívoca | Remova ou substitua por id interno |
| Endereço completo quando só a cidade é usada | Guarde apenas cidade/UF |
| Nome completo em tabela de métrica | Use identificador opaco |
| Cópia de documento anexada sem necessidade | Guarde só o resultado da verificação, não a imagem |

Minimização também é temporal: campo necessário durante o cadastro pode ser desnecessário depois.
Descarte o intermediário.

## Nunca logue dado pessoal em telemetria

Application Insights é armazenamento de terceiro, com retenção própria, consultável por qualquer
pessoa com acesso ao workspace e frequentemente exportado para outro sistema. Dado pessoal que
entra lá **saiu do seu controle de expurgo** — e vai quebrar o atendimento a um pedido de
eliminação, porque você não consegue apagá-lo de forma confiável.

```csharp
// ❌ E-mail, nome e CPF viajam para a telemetria e ficam fora do seu ciclo de expurgo.
_logger.LogInformation("Titular {Email} atualizou o cadastro de {Nome}, CPF {Cpf}",
    titular.Email, titular.Nome, titular.Cpf);

// ❌ Interpolação: além de vazar, quebra o log estruturado.
_logger.LogInformation($"Autenticando {email}");

// ✅ Identificador opaco. Correlaciona sem identificar.
_logger.LogInformation("Cadastro atualizado | TitularId: {TitularId} | Campos: {Campos}",
    titular.Id, camposAlterados);
```

Regras:

- **Nunca** e-mail, CPF, nome, telefone, endereço, data de nascimento ou qualquer dado sensível.
- Identificador opaco (GUID interno) é aceitável: é pseudonimizado, não anônimo — continua exigindo
  controle de acesso ao workspace, mas é reversível apenas por quem tem a tabela de correlação.
- Vale para **toda** superfície: mensagem, propriedade customizada, nome de operação/span, métrica,
  dimensão, exceção e `TelemetryClient.TrackEvent`.
- Vale também para query string: `?email=...` aparece em log de requisição do App Service. Passe
  identificador na rota, nunca dado pessoal.

### Barreira ativa, não disciplina

Um processador de telemetria remove o que escapou da revisão:

```csharp
public sealed class RemocaoDadoPessoalProcessor(ITelemetryProcessor proximo) : ITelemetryProcessor
{
    private static readonly string[] ChavesProibidas =
    [
        "email",
        "cpf",
        "nome",
        "telefone",
        "senha",
        "token",
    ];

    public void Process(ITelemetry item)
    {
        if (item is ISupportProperties comPropriedades)
        {
            foreach (var chave in ChavesProibidas)
            {
                comPropriedades.Properties.Remove(chave);
            }
        }

        if (item is RequestTelemetry requisicao && requisicao.Url is not null)
        {
            requisicao.Url = new Uri(requisicao.Url.GetLeftPart(UriPartial.Path));
        }

        proximo.Process(item);
    }
}
```

Isso é rede de proteção, não licença para relaxar na revisão.

## Proteção em repouso

| Dado | Tratamento | Motivo |
|---|---|---|
| Senha | Hash com salt por registro e algoritmo de derivação lento | **Nunca** precisa ser recuperada |
| Código OTP | Hash com salt/pepper, validade curta | Mesmo raciocínio da senha |
| Token de sessão persistido | Hash | Comparação por hash basta |
| Dado sensível (art. 11) | Criptografia em repouso, chave no cofre | Regime mais rígido |
| CPF | Criptografia ou pelo menos coluna segregada com acesso restrito | Identificador unívoco, alto valor para fraude |
| E-mail, telefone | Coluna comum com controle de acesso; mascarar na exibição | Necessário em claro para o serviço funcionar |

**Regra decisiva:** se você nunca precisa ler o valor original, use hash — irreversível. Se precisa
ler, use criptografia com chave gerenciada fora do banco (Key Vault). Nunca "criptografia" caseira
por Base64 ou XOR: isso é codificação, não proteção.

```csharp
// ❌ Reversível e sem custo para o atacante — não é proteção.
entidade.Senha = Convert.ToBase64String(Encoding.UTF8.GetBytes(senha));

// ❌ Hash rápido e sem salt: rainbow table resolve.
entidade.Senha = Convert.ToHexString(MD5.HashData(Encoding.UTF8.GetBytes(senha)));

// ✅ Derivação lenta, salt por registro, parâmetros persistidos junto do hash.
entidade.DefinirSenha(_hasher.Gerar(senha));
```

Mascare na saída, no servidor — nunca envie o valor completo ao cliente e esconda no CSS:

```csharp
public static string MascararEmail(string email)
{
    var separador = email.IndexOf('@');
    if (separador <= 1) return "***";

    return $"{email[0]}***{email[(separador - 1)..]}";
}
```

## Pseudonimização

Substituir o identificador direto por referência mantida em separado (art. 13, § 4). Reduz o
impacto de um vazamento parcial, **mas o dado continua pessoal** — não dispensa base legal, nem
direitos do titular, nem retenção.

Só a anonimização irreversível tira o dado do escopo da lei (art. 12). E ela precisa resistir a
reidentificação por meios razoáveis: remover o nome mas manter CEP + data de nascimento + gênero
frequentemente reidentifica. Se você consegue reverter, não anonimizou.

## Separe dado pessoal em tabela própria

Concentrar o dado pessoal do titular numa tabela dedicada, referenciada pelas demais por
identificador, resolve quatro problemas de uma vez:

1. **Expurgo**: eliminar ou anonimizar afeta um lugar, não quinze.
2. **Portabilidade**: a exportação do art. 18, V tem origem óbvia.
3. **Controle de acesso**: privilégio restrito só naquela tabela.
4. **Auditoria**: a trilha observa um alvo definido.

```csharp
public sealed class TitularConfiguration : IEntityTypeConfiguration<Titular>
{
    public void Configure(EntityTypeBuilder<Titular> builder)
    {
        builder.ToTable("titular", "<schema>");
        builder.HasKey(titular => titular.Id);

        builder.Property(titular => titular.Nome)
            .HasColumnName(nameof(Titular.Nome))
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(titular => titular.Email)
            .HasColumnName(nameof(Titular.Email))
            .HasMaxLength(320)
            .IsRequired();

        builder.Property(titular => titular.Situacao)
            .HasColumnName(nameof(Titular.Situacao))
            .HasConversion<string>()
            .HasMaxLength(30)
            .IsRequired();

        builder.Property(titular => titular.AnonimizadoEm)
            .HasColumnName(nameof(Titular.AnonimizadoEm));
    }
}
```

As entidades de negócio referenciam `TitularId`. Ao anonimizar, o histórico operacional sobrevive
sem carregar identidade.

## Onde o dado pessoal vaza sem ninguém notar

| Superfície | Risco | Mitigação |
|---|---|---|
| Índice | Índice sobre e-mail/CPF replica o valor; índice parcial em coluna sensível expõe padrão | Indexe o identificador interno; se precisar buscar por e-mail, considere índice sobre hash determinístico |
| Log de auditoria | Trilha que guarda o valor antigo e o novo vira segunda cópia do dado pessoal | Guarde **qual campo** mudou, não o conteúdo — ou aplique a mesma retenção da tabela original |
| Backup | Continua com o dado depois da eliminação | Política de retenção de backup documentada e prazo curto; expurgo lógico ao restaurar |
| Réplica de leitura | Mesmo problema, sem ninguém lembrar | Inclua a réplica no procedimento de expurgo |
| Homologação | Cópia de produção é vazamento de escala | **Nunca** copie produção sem anonimizar |
| Coluna de texto livre | Titular digita CPF no campo "observação" | Valide, ou trate o campo com o mesmo rigor |
| Exportação CSV/relatório | Arquivo sobrevive fora do ciclo de expurgo | Gere sob demanda, com expiração |
| Mensagem de erro | `"E-mail joao@... já cadastrado"` vaza a base | Mensagem genérica |
| Nome de arquivo anexado | `cpf-12345678900.pdf` no blob | Renomeie para identificador opaco |

### Homologação com dado de produção

Cópia de produção em ambiente com controle de acesso mais frouxo e sem a mesma auditoria é
tratamento sem base legal. Se precisa de volume realista, anonimize **antes** de o dump sair de
produção:

```sql
UPDATE <schema>.titular
   SET "Nome"     = 'Titular ' || id,
       "Email"    = 'titular' || id || '@exemplo.invalid',
       "Telefone" = NULL,
       "Cpf"      = NULL;
```

Anonimize no pipeline de cópia, nunca "depois que der tempo" — entre o restore e o script existe
uma janela em que o dado real está no ambiente errado.

## Checklist

- [ ] Cada coluna pessoal tem finalidade; nenhuma coletada por conveniência.
- [ ] Granularidade mínima (faixa em vez de data exata, cidade em vez de endereço completo).
- [ ] Nenhum dado pessoal em log, telemetria, métrica, span, exceção ou query string.
- [ ] Processador de telemetria removendo propriedades proibidas e query string.
- [ ] Credencial e OTP com hash e salt; nunca reversíveis.
- [ ] Dado sensível criptografado em repouso, chave fora do banco.
- [ ] Dado pessoal concentrado em tabela própria, referenciada por identificador.
- [ ] Índice não replica dado pessoal desnecessariamente.
- [ ] Trilha de auditoria guarda o campo alterado, não o conteúdo pessoal.
- [ ] Retenção de backup e réplica documentada e incluída no procedimento de expurgo.
- [ ] Homologação sem cópia não anonimizada de produção.
- [ ] Exibição mascarada no servidor; nunca ocultação apenas no front-end.
