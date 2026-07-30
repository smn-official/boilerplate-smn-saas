using Microsoft.AspNetCore.Mvc.Razor;

namespace Smn.UiKit.Web.Infrastructure;

/// <summary>Makes Razor look for views under <c>Features/&lt;Feature&gt;/Views</c>.</summary>
public sealed class FeatureViewLocationExpander : IViewLocationExpander
{
    private static readonly string[] Locations =
    [
        "/Features/{1}/Views/{0}.cshtml",
        "/Features/Shared/Views/{0}.cshtml",
    ];

    /// <inheritdoc />
    public IEnumerable<string> ExpandViewLocations(
        ViewLocationExpanderContext context,
        IEnumerable<string> viewLocations)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(viewLocations);

        return Locations.Concat(viewLocations);
    }

    /// <inheritdoc />
    public void PopulateValues(ViewLocationExpanderContext context)
    {
    }
}
