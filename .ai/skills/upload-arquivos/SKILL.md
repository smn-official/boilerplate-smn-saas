---
name: upload-arquivos
description: Upload e download de arquivo em ASP.NET Core — receber IFormFile com limite de tamanho no C# e no servidor, validar em três camadas (extensão em allowlist, content-type declarado e magic bytes reais), bloquear path traversal, gravar com nome opaco guardando o nome original só como metadado, contrato IArmazenamentoDeArquivos em Core com implementação em Data, servir de volta com autorização por cliente e Content-Disposition attachment. Use ao permitir anexo, envio de foto, documento, PDF, imagem ou planilha, ao gravar em disco ou Azure Blob Storage, ao criar rota de download, ou ao revisar upload existente.
agent: security-agent
---

# Upload de arquivos

Upload é a operação em que o sistema aceita **bytes arbitrários escolhidos por quem está do outro
lado** e os guarda com seu próprio nome, no seu disco, para servir de volta depois. Nenhuma outra
entrada tem essa combinação, e é por isso que ela é auditada por camadas em vez de por um `if`.

A implementação é código .NET comum ([`net10-agent`](../../agents/net10-agent.md) escreve), mas a
superfície de ataque é o que decide o desenho — por isso esta skill pertence ao `security-agent`, e
[`owasp-web`](../owasp-web/SKILL.md) referencia daqui o que só menciona numa linha.

## A regra que não se quebra

**Nome de arquivo vindo do cliente é entrada hostil; o que se guarda é um nome que o sistema gerou.**

O campo `FileName` do `IFormFile` é uma string que o navegador — ou o `curl` de quem ataca —
escolheu. Ele pode conter `../`, caminho absoluto, `.aspx`, byte nulo, 300 caracteres, ou o nome de
um arquivo que já existe.

```csharp
// ❌ Três falhas numa linha: caminho controlado pelo atacante, extensão controlada
//    pelo atacante, e sobrescrita do arquivo de outro usuário com o mesmo nome.
var destino = Path.Combine(_diretorioBase, arquivo.FileName);

// ✅ O sistema nomeia. O nome original vira metadado no banco, nunca caminho.
var nomeArmazenado = $"{Guid.CreateVersion7()}{extensaoValidada}";
var destino = Path.Combine(_diretorioBase, nomeArmazenado);
```

O nome original **não se perde** — ele é exibido ao usuário no download. Só deixa de ser caminho.

## Recebimento

Exemplo completo, com os três limites que precisam existir juntos:

```csharp
namespace <Produto>.<Modulo>.Web.Controllers;

[Authorize]
[Route("<feature>")]
public sealed class <Feature>Controller(I<Feature>Service servico) : Controller
{
    private const long TamanhoMaximoEmBytes = 10 * 1024 * 1024;

    /// <summary>Recebe o anexo enviado pelo formulário e devolve à listagem da <Feature>.</summary>
    [HttpPost("anexos")]
    [ValidateAntiForgeryToken]
    [RequestSizeLimit(TamanhoMaximoEmBytes)]
    public async Task<IActionResult> Enviar(
        EnviarAnexoDto dados,
        CancellationToken cancellationToken)
    {
        if (dados.Arquivo is null || dados.Arquivo.Length == 0)
        {
            ModelState.AddModelError(nameof(dados.Arquivo), MensagensDeAnexo.ArquivoVazio);

            return View("Index", await servico.MontarListagemAsync(cancellationToken));
        }

        if (dados.Arquivo.Length > TamanhoMaximoEmBytes)
        {
            ModelState.AddModelError(nameof(dados.Arquivo), MensagensDeAnexo.ArquivoGrandeDemais);

            return View("Index", await servico.MontarListagemAsync(cancellationToken));
        }

        await using var conteudo = dados.Arquivo.OpenReadStream();

        var anexo = new ArquivoRecebidoDto(
            dados.Arquivo.FileName,
            dados.Arquivo.ContentType,
            dados.Arquivo.Length,
            conteudo);

        await servico.AnexarAsync(dados.<Entidade>Id, anexo, cancellationToken);

        return RedirectToAction(nameof(Index));
    }
}
```

```csharp
public sealed class EnviarAnexoDto
{
    public Guid <Entidade>Id { get; set; }

    public IFormFile? Arquivo { get; set; }
}
```

### O limite precisa existir em três lugares

**Limite só no C# não protege**: quando a action executa, o corpo inteiro já atravessou a rede e o
servidor. Um upload de 4 GB consome banda, disco temporário e memória antes da primeira linha do seu
código rodar — negação de serviço sem exploit nenhum.

```csharp
builder.WebHost.ConfigureKestrel(opcoes =>
{
    opcoes.Limits.MaxRequestBodySize = 10 * 1024 * 1024;
});

builder.Services.Configure<FormOptions>(opcoes =>
{
    opcoes.MultipartBodyLengthLimit = 10 * 1024 * 1024;
    opcoes.MultipartHeadersLengthLimit = 16 * 1024;
});
```

| Camada | Limite | Se faltar |
|---|---|---|
| Kestrel / IIS / App Service | `MaxRequestBodySize` | O corpo inteiro chega antes de qualquer verificação |
| Model binding multipart | `MultipartBodyLengthLimit` | O binder materializa o formulário sem teto |
| Action | `[RequestSizeLimit]` e checagem de `Length` | Sem mensagem de erro decente para o usuário |

`[RequestSizeLimit]` por rota permite que a rota de anexo aceite 10 MB sem que todo o resto da
aplicação aceite. Teto global folgado é o padrão que só se descobre errado sob ataque.

Para arquivo grande, prefira **streaming** com `MultipartReader` e `[DisableFormValueModelBinding]`:
`IFormFile` acima do limite de buffer materializa em arquivo temporário, e o `Length` só é confiável
depois disso. Abaixo de alguns megabytes, `IFormFile` está certo.

## Validação em três camadas

Cada camada existe porque a anterior é falsificável.

| Camada | O que é | Confiança |
|---|---|---|
| Extensão do nome | String escolhida pelo cliente | Nenhuma isolada; serve para **recusar cedo** e nomear o arquivo gravado |
| `ContentType` declarado | Header `Content-Type` da parte multipart | Nenhuma — o cliente escreve o que quiser |
| **Assinatura real (magic bytes)** | Primeiros bytes do conteúdo | É o que de fato vale |

**Allowlist, nunca denylist.** Uma lista do que é proibido erra por omissão: `.aspx`, `.cshtml`,
`.config`, `.svg`, `.html`, `.htm`, `.phtml`, `.jsp`, `.exe`, `.ps1`, `.lnk`, nome com dupla
extensão (`nota.pdf.aspx`), extensão em maiúscula, extensão com espaço no fim. Uma lista do que é
permitido erra por excesso de rigor, o que o usuário reclama e você conserta.

```csharp
namespace <Produto>.<Modulo>.Core.Arquivos;

/// <summary>Formatos aceitos para anexo, com a assinatura que prova o conteúdo real.</summary>
public static class FormatosDeArquivoPermitidos
{
    private static readonly Dictionary<string, byte[][]> PorExtensao = new(StringComparer.OrdinalIgnoreCase)
    {
        [".pdf"] = [[0x25, 0x50, 0x44, 0x46]],
        [".png"] = [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
        [".jpg"] = [[0xFF, 0xD8, 0xFF]],
        [".jpeg"] = [[0xFF, 0xD8, 0xFF]],
        [".xlsx"] = [[0x50, 0x4B, 0x03, 0x04], [0x50, 0x4B, 0x05, 0x06]],
    };

    /// <summary>Diz se a extensão está na allowlist e o conteúdo começa com a assinatura dela.</summary>
    public static bool Aceita(string extensao, ReadOnlySpan<byte> inicioDoConteudo)
    {
        if (!PorExtensao.TryGetValue(extensao, out var assinaturas))
            return false;

        foreach (var assinatura in assinaturas)
        {
            if (inicioDoConteudo.StartsWith(assinatura))
                return true;
        }

        return false;
    }
}
```

```csharp
namespace <Produto>.<Modulo>.Core.Arquivos;

/// <summary>Valida um arquivo recebido antes de qualquer gravação.</summary>
public sealed class ValidadorDeArquivoRecebido
{
    private const int BytesDeAssinatura = 16;

    /// <summary>Confere extensão, assinatura real e devolve a extensão normalizada.</summary>
    public async Task<string> ValidarAsync(
        ArquivoRecebidoDto arquivo,
        CancellationToken cancellationToken)
    {
        var extensao = Path.GetExtension(Path.GetFileName(arquivo.NomeOriginal)).ToLowerInvariant();

        if (string.IsNullOrEmpty(extensao))
            throw new DomainException(MensagensDeAnexo.FormatoNaoPermitido);

        var cabecalho = new byte[BytesDeAssinatura];
        var lidos = await arquivo.Conteudo.ReadAtLeastAsync(
            cabecalho,
            BytesDeAssinatura,
            throwOnEndOfStream: false,
            cancellationToken);

        arquivo.Conteudo.Position = 0;

        if (!FormatosDeArquivoPermitidos.Aceita(extensao, cabecalho.AsSpan(0, lidos)))
            throw new DomainException(MensagensDeAnexo.FormatoNaoPermitido);

        return extensao;
    }
}
```

Detalhes que decidem se isso funciona:

- `Position = 0` depois de ler o cabeçalho. Esquecer grava o arquivo sem os primeiros bytes — defeito
  que só aparece quando alguém tenta abrir o anexo.
- A mensagem é **a mesma** para extensão fora da lista e para assinatura divergente. Distinguir
  entrega ao atacante um oráculo do que é aceito.
- `DomainException` e não exceção nova: é entrada inválida do usuário, mapeada para `400` pelo
  middleware — ver [`dominio-agregados`](../dominio-agregados/SKILL.md).
- Assinatura **não é garantia de inocuidade**: um PDF válido pode conter JavaScript, um `.xlsx` é um
  ZIP com macro. Ela garante que o arquivo é do tipo declarado, não que é seguro abrir. Antivírus,
  quando exigido, é decisão de ADR.
- Documento do Office e `.zip` compartilham a assinatura `PK` — a extensão desempata, e é por isso
  que as duas camadas existem juntas.

## Path traversal

Este é o item que [`owasp-web`](../owasp-web/SKILL.md) só menciona. Aqui ele tem código.

```csharp
// ❌ `../../../home/site/wwwroot/appsettings.json` escapa do diretório base.
//    Vale para gravar e, pior ainda, para ler no download.
var destino = Path.Combine(_diretorioBase, nomeVindoDoCliente);

// ✅ Descarta o caminho, resolve o absoluto e confirma que continua dentro da base.
var seguro = CaminhoDentroDaBase(_diretorioBase, nomeVindoDoCliente);
```

```csharp
namespace <Produto>.<Modulo>.Data.Arquivos;

/// <summary>Resolve um caminho garantindo que ele não escapa do diretório base.</summary>
public static class CaminhoDeArquivo
{
    /// <summary>Devolve o caminho absoluto do arquivo dentro da base, ou lança se escapar.</summary>
    public static string Resolver(string diretorioBase, string nome)
    {
        var baseResolvida = Path.GetFullPath(diretorioBase);
        var somenteNome = Path.GetFileName(nome);

        if (string.IsNullOrWhiteSpace(somenteNome))
            throw new AcessoNegadoException(MensagensDeAnexo.CaminhoInvalido);

        var completo = Path.GetFullPath(Path.Combine(baseResolvida, somenteNome));

        var baseComSeparador = baseResolvida.EndsWith(Path.DirectorySeparatorChar)
            ? baseResolvida
            : baseResolvida + Path.DirectorySeparatorChar;

        if (!completo.StartsWith(baseComSeparador, StringComparison.Ordinal))
            throw new AcessoNegadoException(MensagensDeAnexo.CaminhoInvalido);

        return completo;
    }
}
```

Cada linha responde a um bypass conhecido:

- `Path.GetFileName` descarta diretório **e** caminho absoluto — `Path.Combine` com segundo argumento
  absoluto ignora o primeiro e devolve `/etc/passwd` sem reclamar. Só ele já resolve o caso comum.
- `Path.GetFullPath` normaliza `..`, `.`, separador duplicado e forma curta do Windows **antes** da
  comparação. Comparar string sem normalizar é o bypass clássico.
- O separador ao fim da base impede que `/dados/anexos-publicos` passe na verificação de
  `/dados/anexos`.
- `StringComparison.Ordinal`: comparação sensível a cultura tem casos de equivalência inesperada.

`AcessoNegadoException` aqui, não `DomainException`: um caminho com `../` não é formulário mal
preenchido, é tentativa — precisa virar `403` e evento de segurança na telemetria.

## Nome opaco e metadado no banco

```csharp
namespace <Produto>.<Modulo>.Core.<Feature>;

/// <summary>Anexo de uma <Entidade>: o arquivo mora no storage, os metadados aqui.</summary>
public sealed class Anexo
{
    private Anexo()
    {
    }

    public Guid Id { get; private init; }

    public Guid <Entidade>Id { get; private init; }

    public string NomeArmazenado { get; private init; } = null!;

    public string NomeOriginal { get; private init; } = null!;

    public string TipoDeConteudo { get; private init; } = null!;

    public long TamanhoEmBytes { get; private init; }

    public DateTimeOffset EnviadoEm { get; private init; }

    /// <summary>Cria o anexo com nome de armazenamento gerado pelo sistema.</summary>
    public static Anexo Criar(Guid <entidade>Id, string nomeOriginal, string extensao, string tipoDeConteudo,
        long tamanhoEmBytes, TimeProvider relogio)
    {
        if (tamanhoEmBytes <= 0)
            throw new DomainException(MensagensDeAnexo.ArquivoVazio);

        return new Anexo
        {
            Id = Guid.CreateVersion7(),
            <Entidade>Id = <entidade>Id,
            NomeArmazenado = $"{Guid.CreateVersion7():n}{extensao}",
            NomeOriginal = Path.GetFileName(nomeOriginal),
            TipoDeConteudo = tipoDeConteudo,
            TamanhoEmBytes = tamanhoEmBytes,
            EnviadoEm = relogio.GetUtcNow(),
        };
    }
}
```

Por que o nome armazenado é opaco:

- **Não colide.** Dois usuários enviando `contrato.pdf` não se sobrescrevem.
- **Não é adivinhável.** Nome sequencial ou derivado do original permite enumerar arquivos de outros
  clientes tentando URLs.
- **Não carrega dado pessoal.** `cpf-11122233344.pdf` grava dado pessoal no nome do blob, visível em
  log de storage e listagem de container.
- **Não executa.** A extensão é a validada, e o nome não contém nada além de hexadecimal.

O `NomeOriginal` é guardado **sanitizado** (`Path.GetFileName`) e usado só na exibição e no download.
Ele é entrada do usuário: em Razor, `@anexo.NomeOriginal` já escapa; `@Html.Raw` nele é XSS.

O anexo é **dado do cliente**: a entidade é mapeada **sem schema explícito**, e o `search_path`
resolve — [`multi-schema`](../multi-schema/SKILL.md).

## Onde o arquivo mora

Storage é **integração externa**, e vale o mesmo padrão de
[`email-transacional`](../email-transacional/SKILL.md): contrato em `Core`, implementação real e
implementação alternativa em `Data`, escolha por flag na composição em `Web`.

```csharp
namespace <Produto>.<Modulo>.Core.Arquivos;

/// <summary>Guarda e recupera o conteúdo de arquivos, sem expor o meio de armazenamento.</summary>
public interface IArmazenamentoDeArquivos
{
    /// <summary>Grava o conteúdo sob o nome informado e devolve o identificador do storage.</summary>
    Task<string> GravarAsync(string nomeArmazenado, Stream conteudo, CancellationToken cancellationToken);

    /// <summary>Abre o conteúdo para leitura, ou devolve nulo se não existir.</summary>
    Task<Stream?> AbrirAsync(string nomeArmazenado, CancellationToken cancellationToken);

    /// <summary>Elimina o conteúdo. Reexecutar sobre item inexistente é no-op.</summary>
    Task RemoverAsync(string nomeArmazenado, CancellationToken cancellationToken);
}
```

`Core` não conhece `BlobClient`, caminho de disco nem connection string. Se `Core` compila com o
pacote do Azure removido, o contrato está certo.

```csharp
private static void AdicionarArmazenamento(IServiceCollection services, IConfiguration configuration)
{
    var secao = configuration.GetSection(ArmazenamentoSettings.SecaoConfiguracao);
    services.Configure<ArmazenamentoSettings>(secao);

    var settings = secao.Get<ArmazenamentoSettings>();

    if (!string.IsNullOrWhiteSpace(settings?.ConnectionString))
    {
        services.AddScoped<IArmazenamentoDeArquivos, ArmazenamentoEmBlob>();

        return;
    }

    services.AddScoped<IArmazenamentoDeArquivos, ArmazenamentoEmDisco>();
}
```

Consequência que fecha o requisito de ambiente local, igual ao e-mail: **clonar o repositório e rodar
`dotnet run` sem credencial de storage precisa funcionar** — o disco entra no lugar do blob. Nome do
container e flag no `appsettings.json`; só a connection string no `.env`
([`segredos-configuracao`](../segredos-configuracao/SKILL.md)).

| Critério | Disco local | Azure Blob |
|---|---|---|
| Múltiplas instâncias | Não serve: cada nó vê o próprio disco | Serve |
| Deploy do App Service | Conteúdo do `wwwroot` é substituído | Independente do deploy |
| Ambiente local sem credencial | É a única opção | Precisa de connection string |

Duas regras de disco, se ele for usado além do local: o diretório fica **fora do `wwwroot`** — dentro
dele o arquivo é servido diretamente pelo static files, sem passar por autorização nenhuma — e o
nome do diretório vem de configuração, nunca montado com entrada do usuário.

## Servir de volta com autorização

Upload sem download seguro é meio caminho. **Um arquivo do cliente A não pode ser baixado pelo
cliente B**, e o único jeito de garantir isso é a rota carregar o metadado do banco e o banco estar
sob o `search_path` do cliente da sessão.

```csharp
[HttpGet("anexos/{id:guid}")]
public async Task<IActionResult> Baixar(Guid id, CancellationToken cancellationToken)
{
    var anexo = await servico.ObterAnexoAsync(id, cancellationToken);

    if (anexo is null)
        return NotFound();

    var conteudo = await armazenamento.AbrirAsync(anexo.NomeArmazenado, cancellationToken);

    if (conteudo is null)
        return NotFound();

    return File(conteudo, "application/octet-stream", anexo.NomeOriginal);
}
```

O que faz isso ser seguro, e o que faria não ser:

- **A rota recebe o `Id` do anexo, nunca o caminho nem o nome armazenado.** Rota que aceita nome de
  arquivo é path traversal esperando acontecer, mesmo com validação — não dê a superfície.
- **O nome armazenado vem do banco**, e o banco só devolve linhas do schema do cliente da sessão.
  Esse é o mesmo mecanismo do ADR-003: o arquivo de outro cliente não é "negado", ele **não existe**
  para aquela consulta.
- **`NotFound` para inexistente e para alheio.** Devolver `403` no segundo caso confirma que o id
  existe — oráculo de enumeração. Mesma resposta para os dois.
- Se o anexo pertence a um usuário específico dentro do cliente, a verificação de propriedade também
  é obrigatória: multi-schema separa clientes, não usuários do mesmo cliente
  ([`owasp-web`](../owasp-web/SKILL.md), IDOR).
- Rota de download **nunca** é `[AllowAnonymous]` por conveniência.

### `Content-Disposition: attachment` e o que nunca vai inline

`File(stream, contentType, nomeDoArquivo)` com nome definido emite
`Content-Disposition: attachment` — o navegador baixa em vez de renderizar. Sem o nome, ele emite
`inline`, e o conteúdo executa **na origem da sua aplicação**.

```csharp
// ❌ SVG renderizado inline: <svg><script>…</script></svg> executa no seu domínio,
//    com o cookie de sessão da vítima. XSS armazenado, persistente, com URL própria.
return File(conteudo, anexo.TipoDeConteudo);

// ✅ Tipo genérico e download forçado. O navegador não interpreta nada.
return File(conteudo, "application/octet-stream", anexo.NomeOriginal);
```

- **Nunca devolva o `ContentType` que o cliente enviou.** Ele é entrada; `text/html` faz o navegador
  renderizar o upload como página do seu site.
- **HTML e SVG nunca são servidos inline.** SVG é o caso que passa despercebido: parece imagem, é
  documento XML com script. Se precisar exibir imagem inline, restrinja a PNG/JPEG **validados por
  assinatura**, e sirva de um domínio ou subdomínio separado.
- `X-Content-Type-Options: nosniff` é obrigatório em toda a aplicação, e aqui em particular: sem ele
  o navegador adivinha o tipo pelo conteúdo e ignora o seu `application/octet-stream`
  ([`segredos-configuracao`](../segredos-configuracao/SKILL.md)).
- Nome no `Content-Disposition` é sanitizado — aspas e quebra de linha no nome permitem injetar
  header.

## Dado pessoal em arquivo

Documento de identidade, comprovante, foto de rosto e atestado são **dado pessoal**, e foto de rosto
e atestado são **dado sensível** sob o art. 11 — [`principios-lgpd`](../principios-lgpd/SKILL.md).
Estar num blob em vez de numa coluna não muda nada disso.

O que muda na prática:

- **Base legal e finalidade antes de aceitar o upload.** Pedir "uma foto do documento" sem saber por
  quê e por quanto tempo é coleta sem finalidade — [`dados-pessoais-modelagem`](../dados-pessoais-modelagem/SKILL.md).
- **O arquivo tem prazo de retenção**, igual à linha do banco, e precisa ser **eliminável de fato** —
  [`retencao-descarte`](../retencao-descarte/SKILL.md). Soft delete no metadado com o blob intacto
  não é eliminação: o conteúdo continua lá, recuperável.
- **Eliminar é remover os dois**, e nesta ordem: apague o conteúdo no storage e só então o metadado.
  Invertido, uma falha no meio deixa um blob órfão que ninguém sabe mais que existe nem a quem
  pertence — o pior resultado possível.
- **Metadado não é lugar de dado pessoal extra.** Nome armazenado opaco, e nenhum `Descricao` livre
  que vire depósito de CPF.
- **Versionamento e soft delete do storage contam.** Container do Azure com versionamento ou
  *soft delete* habilitado guarda a cópia depois do `Delete` — é o mesmo ponto cego de backup que a
  skill de retenção levanta. Verifique a configuração, não só o código.
- Exportação de dados do titular (art. 18) precisa **incluir os arquivos** —
  [`direitos-titular`](../direitos-titular/SKILL.md).

Excluir o cliente inteiro é `DROP SCHEMA ... CASCADE` no banco, mas **isso não toca o storage**. A
rotina de exclusão precisa varrer e remover os blobs do cliente explicitamente, e o prefixo do
container por cliente é o que torna isso possível.

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Arquivo gravado fora do diretório esperado | `Path.Combine` com `FileName` do cliente | `Path.GetFileName` + `GetFullPath` + `StartsWith` na base resolvida |
| Anexo de um usuário sobrescreveu o de outro | Nome original usado como nome de arquivo | Nome opaco (`Guid`); original só como metadado |
| `.aspx` ou `.svg` aceito | Denylist de extensões | Allowlist, mais conferência de magic bytes |
| Arquivo aceito e ilegível ao abrir | Stream não rebobinado após ler a assinatura | `Position = 0` antes de gravar |
| XSS ao abrir um anexo | `ContentType` do cliente devolvido, sem `attachment` | `application/octet-stream` com nome, mais `nosniff` |
| Servidor sob carga com upload gigante | Limite só no `[RequestSizeLimit]` | `MaxRequestBodySize` no Kestrel e `MultipartBodyLengthLimit` |
| Cliente B baixa o anexo do cliente A | Rota recebendo caminho ou nome do arquivo | Rota por `Id`; nome vem do banco sob o `search_path` do cliente |
| Atacante descobre quais ids existem | `403` para alheio e `404` para inexistente | Mesma resposta `404` nos dois casos |
| Anexo acessível sem login pela URL direta | Diretório dentro do `wwwroot` | Diretório fora da raiz web; toda leitura passa pela action |
| Documento pessoal ainda existe após exclusão | Metadado apagado e blob intacto | Remover o conteúdo primeiro, depois o metadado |
| `Core` não compila sem o SDK do Azure | Contrato na linguagem do fornecedor | `IArmazenamentoDeArquivos` em `Core`; `BlobClient` só em `Data` |
| Projeto novo não roda sem credencial de storage | Sem implementação alternativa | `ArmazenamentoEmDisco` escolhido pela flag na DI |
