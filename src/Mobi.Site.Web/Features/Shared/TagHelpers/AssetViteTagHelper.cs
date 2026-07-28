using System.Text.Json;
using Microsoft.AspNetCore.Razor.TagHelpers;

namespace Mobi.Site.Web.Features.Shared.TagHelpers;

/// <summary>
/// Resolve o caminho de um asset pelo manifest gerado pelo Vite no build de produção.
/// </summary>
[HtmlTargetElement("vite-asset", Attributes = "src", TagStructure = TagStructure.WithoutEndTag)]
public sealed class AssetViteTagHelper : TagHelper
{
    private static readonly Lazy<JsonDocument?> Manifest = new(CarregarManifest);
    private static string _raizDoConteudo = string.Empty;

    private readonly IWebHostEnvironment _ambiente;

    public AssetViteTagHelper(IWebHostEnvironment ambiente)
    {
        _ambiente = ambiente;
        _raizDoConteudo = ambiente.ContentRootPath;
    }

    /// <summary>
    /// Caminho do asset relativo à raiz do projeto, como declarado no vite.config.ts.
    /// </summary>
    [HtmlAttributeName("src")]
    public string Src { get; set; } = string.Empty;

    public override void Process(TagHelperContext context, TagHelperOutput output)
    {
        var ehEstilo = Src.EndsWith(".css", StringComparison.OrdinalIgnoreCase);
        var caminho = ResolverCaminho();

        if (ehEstilo)
        {
            output.TagName = "link";
            output.Attributes.SetAttribute("rel", "stylesheet");
            output.Attributes.SetAttribute("href", caminho);
        }
        else
        {
            output.TagName = "script";
            output.TagMode = TagMode.StartTagAndEndTag;
            output.Attributes.SetAttribute("type", "module");
            output.Attributes.SetAttribute("src", caminho);
        }

        output.Attributes.RemoveAll("src-resolvido");
    }

    private string ResolverCaminho()
    {
        if (_ambiente.IsDevelopment() && Manifest.Value is null)
        {
            return $"/{Src}";
        }

        if (Manifest.Value?.RootElement.TryGetProperty(Src, out var entrada) == true
            && entrada.TryGetProperty("file", out var arquivo))
        {
            return $"/build/{arquivo.GetString()}";
        }

        return $"/{Src}";
    }

    private static JsonDocument? CarregarManifest()
    {
        var caminho = Path.Combine(_raizDoConteudo, "wwwroot", "build", ".vite", "manifest.json");

        return File.Exists(caminho) ? JsonDocument.Parse(File.ReadAllText(caminho)) : null;
    }
}
