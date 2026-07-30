using Microsoft.AspNetCore.Mvc;

namespace Smn.UiKit.Web.Features.UiKit;

/// <summary>Documentation panel for the design system components.</summary>
[Route("ui-kit")]
public sealed class UiKitController : Controller
{
    private const string ButtonUsage =
        """
        <smn-button variant="Primary">Salvar</smn-button>
        <smn-button variant="Outline" size="Small">Cancelar</smn-button>
        <smn-button variant="Danger" disabled="true">Excluir</smn-button>
        """;

    private const string AlertUsage =
        """
        <smn-alert variant="Success" title="Cadastro concluído">
            O registro foi salvo e já aparece na listagem.
        </smn-alert>
        """;

    private const string CardUsage =
        """
        <smn-card variant="Default">
            <smn-card-header>
                <smn-card-title>Plano Profissional</smn-card-title>
                <smn-card-description>Cobrança mensal.</smn-card-description>
            </smn-card-header>
            <smn-card-content>Usuários ilimitados e suporte prioritário.</smn-card-content>
            <smn-card-footer>
                <smn-button variant="Primary" size="Small">Assinar</smn-button>
            </smn-card-footer>
        </smn-card>
        """;

    private const string ChipUsage =
        """
        <smn-chip color="Success" variant="Soft">Pago</smn-chip>
        <smn-chip color="Warning" variant="Soft">Aguardando</smn-chip>
        <smn-chip color="Danger" variant="Primary" size="Large">Vencido</smn-chip>
        """;

    private const string BadgeUsage =
        """
        <smn-badge color="Danger">8</smn-badge>

        <smn-badge-anchor>
            <smn-avatar initials="VA" color="Accent" variant="Soft"></smn-avatar>
            <smn-badge placement="TopRight" size="Small" color="Danger">5</smn-badge>
        </smn-badge-anchor>
        """;

    private const string AvatarUsage =
        """
        <smn-avatar src="/media/ana.jpg" alt="Foto de Ana Ribeiro" initials="AR"></smn-avatar>
        <smn-avatar initials="BC" color="Success" variant="Soft" size="Large"></smn-avatar>
        """;

    private const string SpinnerUsage =
        """
        <smn-spinner color="Accent" label="Carregando relatório" />

        <smn-button variant="Primary" disabled="true">
            <smn-spinner size="Small" />
            Salvando
        </smn-button>
        """;

    /// <summary>Redirects to the first component of the panel.</summary>
    [HttpGet("")]
    public IActionResult Index()
    {
        return RedirectToAction(nameof(Button));
    }

    /// <summary>Button component page.</summary>
    [HttpGet("button")]
    public IActionResult Button()
    {
        return View(new ComponentViewModel(
            "Button",
            "Dispara uma ação. A variante comunica a importância e o risco da ação.",
            ButtonUsage,
            BuildNavigation(nameof(Button))));
    }

    /// <summary>Alert component page.</summary>
    [HttpGet("alert")]
    public IActionResult Alert()
    {
        return View(new ComponentViewModel(
            "Alert",
            "Exibe mensagem e notificação ao usuário com indicador de estado.",
            AlertUsage,
            BuildNavigation(nameof(Alert))));
    }

    /// <summary>Card component page.</summary>
    [HttpGet("card")]
    public IActionResult Card()
    {
        return View(new ComponentViewModel(
            "Card",
            "Agrupa conteúdo relacionado numa superfície com cabeçalho, corpo e rodapé.",
            CardUsage,
            BuildNavigation(nameof(Card))));
    }

    /// <summary>Chip component page.</summary>
    [HttpGet("chip")]
    public IActionResult Chip()
    {
        return View(new ComponentViewModel(
            "Chip",
            "Rótulo compacto para estado, categoria ou marcador dentro de uma listagem.",
            ChipUsage,
            BuildNavigation(nameof(Chip))));
    }

    /// <summary>Badge component page.</summary>
    [HttpGet("badge")]
    public IActionResult Badge()
    {
        return View(new ComponentViewModel(
            "Badge",
            "Contador ou marcador de status, isolado ou fixado no canto de outro elemento.",
            BadgeUsage,
            BuildNavigation(nameof(Badge))));
    }

    /// <summary>Avatar component page.</summary>
    [HttpGet("avatar")]
    public IActionResult Avatar()
    {
        return View(new ComponentViewModel(
            "Avatar",
            "Representa uma pessoa por foto, caindo para as iniciais quando não há imagem.",
            AvatarUsage,
            BuildNavigation(nameof(Avatar))));
    }

    /// <summary>Spinner component page.</summary>
    [HttpGet("spinner")]
    public IActionResult Spinner()
    {
        return View(new ComponentViewModel(
            "Spinner",
            "Indica que algo está em andamento sem que se saiba quanto falta.",
            SpinnerUsage,
            BuildNavigation(nameof(Spinner))));
    }

    private static IReadOnlyList<NavigationItemViewModel> BuildNavigation(string activeAction)
    {
        return
        [
            new NavigationItemViewModel("Alert", nameof(Alert), activeAction == nameof(Alert)),
            new NavigationItemViewModel("Avatar", nameof(Avatar), activeAction == nameof(Avatar)),
            new NavigationItemViewModel("Badge", nameof(Badge), activeAction == nameof(Badge)),
            new NavigationItemViewModel("Button", nameof(Button), activeAction == nameof(Button)),
            new NavigationItemViewModel("Card", nameof(Card), activeAction == nameof(Card)),
            new NavigationItemViewModel("Chip", nameof(Chip), activeAction == nameof(Chip)),
            new NavigationItemViewModel("Spinner", nameof(Spinner), activeAction == nameof(Spinner)),
        ];
    }
}
