using System.Collections.Concurrent;

namespace Mobi.Site.Web.Features.Shared.TagHelpers;

/// <summary>
/// Cache em memória do conteúdo SVG dos ícones do Lucide, lido do disco uma vez por ícone.
/// </summary>
public sealed class IconeCache
{
    private readonly ConcurrentDictionary<string, string> _conteudoPorNome = new();
    private readonly string _diretorioDeIcones;

    public IconeCache(IWebHostEnvironment ambiente)
    {
        _diretorioDeIcones = Path.Combine(ambiente.ContentRootPath, "node_modules", "lucide-static", "icons");
    }

    /// <summary>
    /// Devolve o conteúdo interno do SVG do ícone informado, sem o elemento raiz.
    /// </summary>
    public string ObterConteudo(string nome)
    {
        return _conteudoPorNome.GetOrAdd(nome, LerDoDisco);
    }

    private string LerDoDisco(string nome)
    {
        var caminho = Path.Combine(_diretorioDeIcones, $"{nome}.svg");

        if (!File.Exists(caminho))
        {
            throw new FileNotFoundException($"Ícone '{nome}' não existe em lucide-static.", caminho);
        }

        var svg = File.ReadAllText(caminho);
        var inicio = svg.IndexOf('>', svg.IndexOf("<svg", StringComparison.Ordinal)) + 1;
        var fim = svg.LastIndexOf("</svg>", StringComparison.Ordinal);

        return svg[inicio..fim].Trim();
    }
}
