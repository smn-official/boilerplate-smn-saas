namespace Smn.UiKit.Web.Features.UiKit;

/// <summary>An entry in the panel navigation.</summary>
public sealed class NavigationItemViewModel
{
    /// <summary>Creates the item with its display name and target action.</summary>
    public NavigationItemViewModel(string name, string action, bool active, string group = "Componentes")
    {
        Name = name;
        Action = action;
        Active = active;
        Group = group;
    }

    /// <summary>Heading this item is listed under.</summary>
    public string Group { get; }

    /// <summary>Name shown in the navigation.</summary>
    public string Name { get; }

    /// <summary>Name of the action that renders the component page.</summary>
    public string Action { get; }

    /// <summary>Whether this is the component currently open.</summary>
    public bool Active { get; }
}

/// <summary>Data backing a component page of the panel.</summary>
public sealed class ComponentViewModel
{
    /// <summary>Creates the view model for a component page.</summary>
    public ComponentViewModel(
        string name,
        string description,
        string usageMarkup,
        IReadOnlyList<NavigationItemViewModel> navigation,
        bool showMarkupSection = true)
    {
        Name = name;
        Description = description;
        UsageMarkup = usageMarkup;
        Navigation = navigation;
        ShowMarkupSection = showMarkupSection;
    }

    /// <summary>
    /// Whether the layout renders the markup section. The opening page shows the
    /// snippet inside its own steps, so it would come out twice.
    /// </summary>
    public bool ShowMarkupSection { get; }

    /// <summary>Component name.</summary>
    public string Name { get; }

    /// <summary>One line explaining what the component is for.</summary>
    public string Description { get; }

    /// <summary>Minimal Razor snippet that installs the component in a view.</summary>
    public string UsageMarkup { get; }

    /// <summary>Items of the side navigation.</summary>
    public IReadOnlyList<NavigationItemViewModel> Navigation { get; }
}
