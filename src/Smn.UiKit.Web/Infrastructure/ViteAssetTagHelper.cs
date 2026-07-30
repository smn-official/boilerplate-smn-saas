using Microsoft.AspNetCore.Razor.TagHelpers;

namespace Smn.UiKit.Web.Infrastructure;

/// <summary>Resolves a Vite asset: dev server in development, manifest in production.</summary>
[HtmlTargetElement("vite-asset", Attributes = "src")]
public sealed class ViteAssetTagHelper : TagHelper
{
    private const string DevServerAddress = "http://localhost:5173";

    private readonly IWebHostEnvironment _environment;
    private readonly ViteManifestReader _manifest;

    /// <summary>Creates the TagHelper with the environment and the manifest reader.</summary>
    public ViteAssetTagHelper(IWebHostEnvironment environment, ViteManifestReader manifest)
    {
        _environment = environment;
        _manifest = manifest;
    }

    /// <summary>Entry point path relative to the Web project root.</summary>
    public string Src { get; set; } = string.Empty;

    /// <inheritdoc />
    public override void Process(TagHelperContext context, TagHelperOutput output)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(output);

        output.TagName = null;

        if (_environment.IsDevelopment())
        {
            EmitForDevServer(output);
            return;
        }

        EmitForProduction(output);
    }

    private void EmitForDevServer(TagHelperOutput output)
    {
        output.Content.AppendHtml(
            $"""<script type="module" src="{DevServerAddress}/@vite/client"></script>""");

        if (Src.EndsWith(".css", StringComparison.OrdinalIgnoreCase))
        {
            output.Content.AppendHtml(
                $"""<link rel="stylesheet" href="{DevServerAddress}/{Src}">""");
            return;
        }

        output.Content.AppendHtml(
            $"""<script type="module" src="{DevServerAddress}/{Src}"></script>""");
    }

    private void EmitForProduction(TagHelperOutput output)
    {
        var entry = _manifest.GetEntry(Src);

        if (entry is null)
        {
            return;
        }

        foreach (var stylesheet in entry.Css)
        {
            output.Content.AppendHtml($"""<link rel="stylesheet" href="/dist/{stylesheet}">""");
        }

        if (entry.File.EndsWith(".css", StringComparison.OrdinalIgnoreCase))
        {
            output.Content.AppendHtml($"""<link rel="stylesheet" href="/dist/{entry.File}">""");
            return;
        }

        output.Content.AppendHtml($"""<script type="module" src="/dist/{entry.File}"></script>""");
    }
}
