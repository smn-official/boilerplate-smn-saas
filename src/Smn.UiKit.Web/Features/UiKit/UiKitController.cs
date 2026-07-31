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

    private const string SeparatorUsage =
        """
        <smn-separator />
        <smn-separator orientation="Vertical" />
        <smn-separator variant="Secondary">ou</smn-separator>
        """;

    private const string KbdUsage =
        """
        <smn-kbd>K</smn-kbd>
        <smn-kbd keys="command">K</smn-kbd>
        <smn-kbd keys="command shift" variant="Light">P</smn-kbd>
        """;

    private const string SkeletonUsage =
        """
        <smn-skeleton class="h-4 w-full" />
        <smn-skeleton animation="Pulse" class="size-10 rounded-3xl" />
        """;

    private const string InputUsage =
        """
        <smn-input name="email"
                   type="email"
                   label="E-mail"
                   placeholder="voce@empresa.com.br"
                   description="Usamos só para enviar o recibo."
                   required="true" />

        <smn-input name="cpf" label="CPF" error="CPF inválido." />

        <smn-textarea name="observacao" label="Observação" rows="4" />
        """;

    private const string CheckboxUsage =
        """
        <smn-checkbox name="termos" label="Aceito os termos de uso" required="true" />

        <smn-radio-group legend="Ciclo de cobrança">
            <smn-radio name="ciclo" value="mensal" label="Mensal" checked="true" />
            <smn-radio name="ciclo" value="anual" label="Anual" />
        </smn-radio-group>
        """;

    private const string SwitchUsage =
        """
        <smn-switch name="dois-fatores"
                    label="Verificação em duas etapas"
                    description="Pedimos um código a cada novo acesso."
                    checked="true" />
        """;

    private const string LinkUsage =
        """
        <smn-link href="/faturas">Ver faturas</smn-link>
        <smn-link href="https://heroui.com" external="true">Documentação</smn-link>
        <smn-link href="#" variant="Muted" disabled="true">Indisponível</smn-link>
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

    /// <summary>Separator component page.</summary>
    [HttpGet("separator")]
    public IActionResult Separator()
    {
        return View(new ComponentViewModel(
            "Separator",
            "Divide seções de conteúdo, com ou sem rótulo no meio da linha.",
            SeparatorUsage,
            BuildNavigation(nameof(Separator))));
    }

    /// <summary>Checkbox and radio component page.</summary>
    [HttpGet("checkbox")]
    public IActionResult Checkbox()
    {
        return View(new ComponentViewModel(
            "Checkbox",
            "Marca uma ou várias opções; o radio escolhe uma só dentro do grupo.",
            CheckboxUsage,
            BuildNavigation(nameof(Checkbox))));
    }

    /// <summary>Switch component page.</summary>
    [HttpGet("switch")]
    public IActionResult Switch()
    {
        return View(new ComponentViewModel(
            "Switch",
            "Liga e desliga uma opção que vale na hora, sem esperar o submit.",
            SwitchUsage,
            BuildNavigation(nameof(Switch))));
    }

    /// <summary>Input component page.</summary>
    [HttpGet("input")]
    public IActionResult Input()
    {
        return View(new ComponentViewModel(
            "Input",
            "Recebe texto do usuário, com rótulo, descrição e erro já amarrados por aria.",
            InputUsage,
            BuildNavigation(nameof(Input))));
    }

    /// <summary>Kbd component page.</summary>
    [HttpGet("kbd")]
    public IActionResult Kbd()
    {
        return View(new ComponentViewModel(
            "Kbd",
            "Mostra a tecla ou o atalho que dispara uma ação.",
            KbdUsage,
            BuildNavigation(nameof(Kbd))));
    }

    /// <summary>Skeleton component page.</summary>
    [HttpGet("skeleton")]
    public IActionResult Skeleton()
    {
        return View(new ComponentViewModel(
            "Skeleton",
            "Ocupa o lugar do conteúdo que ainda está carregando, sem deixar o layout pular.",
            SkeletonUsage,
            BuildNavigation(nameof(Skeleton))));
    }

    /// <summary>Link component page.</summary>
    [HttpGet("link")]
    public IActionResult Link()
    {
        return View(new ComponentViewModel(
            "Link",
            "Leva o usuário a outro lugar, sinalizando quando o destino é externo.",
            LinkUsage,
            BuildNavigation(nameof(Link))));
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
            new NavigationItemViewModel("Checkbox", nameof(Checkbox), activeAction == nameof(Checkbox)),
            new NavigationItemViewModel("Chip", nameof(Chip), activeAction == nameof(Chip)),
            new NavigationItemViewModel("Input", nameof(Input), activeAction == nameof(Input)),
            new NavigationItemViewModel("Kbd", nameof(Kbd), activeAction == nameof(Kbd)),
            new NavigationItemViewModel("Link", nameof(Link), activeAction == nameof(Link)),
            new NavigationItemViewModel("Separator", nameof(Separator), activeAction == nameof(Separator)),
            new NavigationItemViewModel("Skeleton", nameof(Skeleton), activeAction == nameof(Skeleton)),
            new NavigationItemViewModel("Spinner", nameof(Spinner), activeAction == nameof(Spinner)),
            new NavigationItemViewModel("Switch", nameof(Switch), activeAction == nameof(Switch)),
        ];
    }
}
