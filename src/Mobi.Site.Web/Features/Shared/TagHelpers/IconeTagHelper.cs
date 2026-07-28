using Microsoft.AspNetCore.Razor.TagHelpers;

namespace Mobi.Site.Web.Features.Shared.TagHelpers;

/// <summary>
/// Renderiza um ícone do Lucide como SVG inline, herdando a cor do texto do elemento pai.
/// </summary>
[HtmlTargetElement("icon", Attributes = "name", TagStructure = TagStructure.WithoutEndTag)]
public sealed class IconeTagHelper : TagHelper
{
    private readonly IconeCache _cache;

    public IconeTagHelper(IconeCache cache)
    {
        _cache = cache;
    }

    /// <summary>
    /// Nome do ícone no acervo do Lucide, em kebab-case.
    /// </summary>
    [HtmlAttributeName("name")]
    public string Name { get; set; } = string.Empty;

    public override void Process(TagHelperContext context, TagHelperOutput output)
    {
        output.TagName = "svg";
        output.TagMode = TagMode.StartTagAndEndTag;

        output.Attributes.SetAttribute("xmlns", "http://www.w3.org/2000/svg");
        output.Attributes.SetAttribute("viewBox", "0 0 24 24");
        output.Attributes.SetAttribute("fill", "none");
        output.Attributes.SetAttribute("stroke", "currentColor");
        output.Attributes.SetAttribute("stroke-width", "2");
        output.Attributes.SetAttribute("stroke-linecap", "round");
        output.Attributes.SetAttribute("stroke-linejoin", "round");

        output.Content.SetHtmlContent(_cache.ObterConteudo(Name));
    }
}
