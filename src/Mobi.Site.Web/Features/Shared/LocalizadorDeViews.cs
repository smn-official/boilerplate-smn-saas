using Microsoft.AspNetCore.Mvc.Razor;

namespace Mobi.Site.Web.Features.Shared;

/// <summary>
/// Faz o Razor procurar views em Features/&lt;Feature&gt;/ em vez de Views/&lt;Controller&gt;/.
/// </summary>
public sealed class LocalizadorDeViews : IViewLocationExpander
{
    public void PopulateValues(ViewLocationExpanderContext context)
    {
    }

    public IEnumerable<string> ExpandViewLocations(
        ViewLocationExpanderContext context,
        IEnumerable<string> viewLocations)
    {
        return
        [
            "/Features/{1}/{0}.cshtml",
            "/Features/Shared/{0}.cshtml",
        ];
    }
}
