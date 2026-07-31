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

    private const string ProgressUsage =
        """
        <smn-progress-bar value="60" label="Processando" show-value="true" />
        <smn-progress-bar label="Sincronizando" />

        <smn-meter value="3.2" maximum="10" label="Armazenamento" value-text="3,2 de 10 GB" />
        """;

    private const string BreadcrumbsUsage =
        """
        <smn-breadcrumbs>
            <smn-breadcrumb href="/">Início</smn-breadcrumb>
            <smn-breadcrumb href="/clientes">Clientes</smn-breadcrumb>
            <smn-breadcrumb current="true">Acme Ltda</smn-breadcrumb>
        </smn-breadcrumbs>

        <smn-empty-state title="Nenhuma fatura por aqui">
            As faturas aparecem assim que a primeira cobrança for gerada.
        </smn-empty-state>
        """;

    private const string TableUsage =
        """
        <smn-table caption="Faturas" hide-caption="true">
            <smn-table-header>
                <smn-table-row>
                    <smn-table-column>Cliente</smn-table-column>
                    <smn-table-column numeric="true">Valor</smn-table-column>
                </smn-table-row>
            </smn-table-header>
            <smn-table-body>
                <smn-table-row>
                    <smn-table-cell>Acme Ltda</smn-table-cell>
                    <smn-table-cell numeric="true">R$ 1.240,00</smn-table-cell>
                </smn-table-row>
            </smn-table-body>
        </smn-table>
        """;

    private const string TabsUsage =
        """
        <smn-tabs id="conta" aria-label="Seções da conta">
            <smn-tab key="perfil" label="Perfil">
                Nome, foto e como você aparece para a equipe.
            </smn-tab>
            <smn-tab key="seguranca" label="Segurança" selected="true">
                Senha e verificação em duas etapas.
            </smn-tab>
        </smn-tabs>
        """;

    private const string AccordionUsage =
        """
        <smn-accordion variant="Surface" name="faq">
            <smn-accordion-item title="Como funciona a cobrança?" open="true">
                A cobrança é mensal, no mesmo dia da contratação.
            </smn-accordion-item>
            <smn-accordion-item title="Posso cancelar quando quiser?">
                Pode, sem multa.
            </smn-accordion-item>
        </smn-accordion>

        <smn-tooltip id="dica-exportar" text="Gera um CSV com as linhas filtradas">
            <smn-button aria-describedby="dica-exportar">Exportar</smn-button>
        </smn-tooltip>
        """;

    private const string ModalUsage =
        """
        <smn-button data-modal-open="modal-excluir">Excluir conta</smn-button>

        <smn-modal id="modal-excluir"
                   title="Excluir a conta?"
                   description="Some tudo. Não dá para desfazer.">
            <smn-modal-body>
                Digite o nome da empresa para confirmar.
            </smn-modal-body>
            <smn-modal-footer>
                <smn-button variant="Ghost" data-modal-close="true">Cancelar</smn-button>
                <smn-button variant="Danger" data-modal-close="true">Excluir</smn-button>
            </smn-modal-footer>
        </smn-modal>
        """;

    private const string SelectUsage =
        """
        <smn-select name="estado" label="Estado" required="true">
            <option value="">Selecione…</option>
            <option value="sp">São Paulo</option>
            <option value="rj">Rio de Janeiro</option>
        </smn-select>

        <smn-pagination current="5"
                        total="10"
                        href-template="?pagina={page}"
                        summary="Mostrando 81 a 100 de 195" />
        """;

    private const string ToastUsage =
        """
        <smn-toast-region placement="BottomEnd">
            <smn-toast variant="Success" title="Pagamento confirmado">
                A fatura de agosto foi baixada.
            </smn-toast>
        </smn-toast-region>

        <smn-input-otp name="codigo"
                       label="Código enviado por e-mail"
                       description="Seis dígitos, válidos por 10 minutos." />
        """;

    private const string DrawerUsage =
        """
        <smn-button data-modal-open="drawer-filtros">Filtros</smn-button>

        <smn-drawer id="drawer-filtros" placement="Right" title="Filtros">
            <smn-drawer-body>
                <smn-select name="situacao" label="Situação">
                    <option value="">Todas</option>
                </smn-select>
            </smn-drawer-body>
            <smn-drawer-footer>
                <smn-button variant="Primary" data-modal-close="true">Aplicar</smn-button>
            </smn-drawer-footer>
        </smn-drawer>

        <smn-slider name="volume" label="Volume" value="60" value-text="60%" />

        <smn-toggle-button pressed="true">Negrito</smn-toggle-button>
        """;

    private const string DropdownUsage =
        """
        <smn-dropdown>
            <smn-button variant="Outline" popovertarget="menu-acoes" aria-haspopup="menu">
                Ações
            </smn-button>
            <smn-menu id="menu-acoes" aria-label="Ações da fatura">
                <smn-menu-item>Ver detalhes</smn-menu-item>
                <smn-menu-item href="/faturas/1.pdf">Baixar PDF</smn-menu-item>
                <smn-menu-separator />
                <smn-menu-item danger="true">Cancelar fatura</smn-menu-item>
            </smn-menu>
        </smn-dropdown>

        <smn-scroll-shadow class="max-h-48">
            <!-- lista longa -->
        </smn-scroll-shadow>
        """;

    private const string NumberFieldUsage =
        """
        <smn-number-field name="quantidade"
                          label="Quantidade"
                          value="1"
                          minimum="1"
                          maximum="99" />

        <smn-search-field name="busca" placeholder="Buscar faturas…" />

        <smn-fieldset legend="Endereço de cobrança">
            <smn-input name="logradouro" label="Logradouro" />
        </smn-fieldset>
        """;

    private const string PopoverUsage =
        """
        <smn-popover-anchor>
            <smn-button popovertarget="pop-calculo">Como calculamos?</smn-button>
            <smn-popover id="pop-calculo" title="Cálculo do valor">
                Consideramos os usuários ativos no fechamento do ciclo.
            </smn-popover>
        </smn-popover-anchor>

        <smn-disclosure title="Detalhes da cobrança">
            Valor proporcional aos dias usados.
        </smn-disclosure>

        <smn-prose>
            <!-- texto longo vindo de CMS ou Markdown -->
        </smn-prose>
        """;

    private const string LinkUsage =
        """
        <smn-link href="/faturas">Ver faturas</smn-link>
        <smn-link href="https://heroui.com" external="true">Documentação</smn-link>
        <smn-link href="#" variant="Muted" disabled="true">Indisponível</smn-link>
        """;

    private const string GetStartedUsage =
        """
        <smn-button variant="Primary">Salvar</smn-button>
        <smn-button variant="Outline" size="Small">Cancelar</smn-button>
        <smn-chip color="Success" variant="Soft">Funcionando</smn-chip>
        """;

    /// <summary>Redirects to the opening page of the panel.</summary>
    [HttpGet("")]
    public IActionResult Index()
    {
        return RedirectToAction(nameof(GetStarted));
    }

    /// <summary>Installation and first use of the design system.</summary>
    [HttpGet("get-started")]
    public IActionResult GetStarted()
    {
        return View(new ComponentViewModel(
            "Get started",
            "Instalar, registrar e usar o design system em quatro passos.",
            GetStartedUsage,
            BuildNavigation(nameof(GetStarted)),
            showMarkupSection: false));
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

    /// <summary>Accordion and tooltip component page.</summary>
    [HttpGet("accordion")]
    public IActionResult Accordion()
    {
        return View(new ComponentViewModel(
            "Accordion",
            "Recolhe seções longas; o tooltip dá a dica curta no hover e no foco.",
            AccordionUsage,
            BuildNavigation(nameof(Accordion))));
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

    /// <summary>Breadcrumbs and empty state component page.</summary>
    [HttpGet("breadcrumbs")]
    public IActionResult Breadcrumbs()
    {
        return View(new ComponentViewModel(
            "Breadcrumbs",
            "Mostra onde o usuário está e o caminho de volta.",
            BreadcrumbsUsage,
            BuildNavigation(nameof(Breadcrumbs))));
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

    /// <summary>Modal component page.</summary>
    [HttpGet("modal")]
    public IActionResult Modal()
    {
        return View(new ComponentViewModel(
            "Modal",
            "Interrompe o fluxo para uma decisão, sobre o dialog nativo do navegador.",
            ModalUsage,
            BuildNavigation(nameof(Modal))));
    }

    /// <summary>Number field, search field and fieldset component page.</summary>
    [HttpGet("number-field")]
    public IActionResult NumberField()
    {
        return View(new ComponentViewModel(
            "NumberField",
            "Recebe número com botões de passo; traz junto o campo de busca e o fieldset.",
            NumberFieldUsage,
            BuildNavigation(nameof(NumberField))));
    }

    /// <summary>Popover, disclosure and prose component page.</summary>
    [HttpGet("popover")]
    public IActionResult Popover()
    {
        return View(new ComponentViewModel(
            "Popover",
            "Painel com conteúdo interativo; traz junto o disclosure e o estilo de texto longo.",
            PopoverUsage,
            BuildNavigation(nameof(Popover))));
    }

    /// <summary>Progress bar and meter component page.</summary>
    [HttpGet("progress")]
    public IActionResult Progress()
    {
        return View(new ComponentViewModel(
            "Progress",
            "Acompanha uma tarefa em andamento; o meter mede quantidade numa faixa conhecida.",
            ProgressUsage,
            BuildNavigation(nameof(Progress))));
    }

    /// <summary>Select and pagination component page.</summary>
    [HttpGet("select")]
    public IActionResult Select()
    {
        return View(new ComponentViewModel(
            "Select",
            "Escolhe uma opção de uma lista; a paginação percorre resultados por link.",
            SelectUsage,
            BuildNavigation(nameof(Select))));
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

    /// <summary>Drawer, slider and toggle button component page.</summary>
    [HttpGet("drawer")]
    public IActionResult Drawer()
    {
        return View(new ComponentViewModel(
            "Drawer",
            "Painel ancorado numa borda; traz junto o slider e o botão de alternar.",
            DrawerUsage,
            BuildNavigation(nameof(Drawer))));
    }

    /// <summary>Dropdown, menu and scroll shadow component page.</summary>
    [HttpGet("dropdown")]
    public IActionResult Dropdown()
    {
        return View(new ComponentViewModel(
            "Dropdown",
            "Abre um menu de opções sobre o popover nativo, sem briga de z-index.",
            DropdownUsage,
            BuildNavigation(nameof(Dropdown))));
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

    /// <summary>Toast and one-time code component page.</summary>
    [HttpGet("toast")]
    public IActionResult Toast()
    {
        return View(new ComponentViewModel(
            "Toast",
            "Avisa o que já aconteceu e some; o input de código recebe OTP dígito a dígito.",
            ToastUsage,
            BuildNavigation(nameof(Toast))));
    }

    /// <summary>Table component page.</summary>
    [HttpGet("table")]
    public IActionResult Table()
    {
        return View(new ComponentViewModel(
            "Table",
            "Apresenta dado tabular, rolando na horizontal sem empurrar a página.",
            TableUsage,
            BuildNavigation(nameof(Table))));
    }

    /// <summary>Tabs component page.</summary>
    [HttpGet("tabs")]
    public IActionResult Tabs()
    {
        return View(new ComponentViewModel(
            "Tabs",
            "Alterna entre seções de um mesmo contexto, seguindo o padrão ARIA de abas.",
            TabsUsage,
            BuildNavigation(nameof(Tabs))));
    }

    private static IReadOnlyList<NavigationItemViewModel> BuildNavigation(string activeAction)
    {
        return
        [
            new NavigationItemViewModel(
                "Get started",
                nameof(GetStarted),
                activeAction == nameof(GetStarted),
                "Começar"),
            new NavigationItemViewModel("Accordion", nameof(Accordion), activeAction == nameof(Accordion)),
            new NavigationItemViewModel("Alert", nameof(Alert), activeAction == nameof(Alert)),
            new NavigationItemViewModel("Avatar", nameof(Avatar), activeAction == nameof(Avatar)),
            new NavigationItemViewModel("Badge", nameof(Badge), activeAction == nameof(Badge)),
            new NavigationItemViewModel("Breadcrumbs", nameof(Breadcrumbs), activeAction == nameof(Breadcrumbs)),
            new NavigationItemViewModel("Button", nameof(Button), activeAction == nameof(Button)),
            new NavigationItemViewModel("Card", nameof(Card), activeAction == nameof(Card)),
            new NavigationItemViewModel("Checkbox", nameof(Checkbox), activeAction == nameof(Checkbox)),
            new NavigationItemViewModel("Chip", nameof(Chip), activeAction == nameof(Chip)),
            new NavigationItemViewModel("Drawer", nameof(Drawer), activeAction == nameof(Drawer)),
            new NavigationItemViewModel("Dropdown", nameof(Dropdown), activeAction == nameof(Dropdown)),
            new NavigationItemViewModel("Input", nameof(Input), activeAction == nameof(Input)),
            new NavigationItemViewModel("Kbd", nameof(Kbd), activeAction == nameof(Kbd)),
            new NavigationItemViewModel("Link", nameof(Link), activeAction == nameof(Link)),
            new NavigationItemViewModel("Modal", nameof(Modal), activeAction == nameof(Modal)),
            new NavigationItemViewModel("NumberField", nameof(NumberField), activeAction == nameof(NumberField)),
            new NavigationItemViewModel("Popover", nameof(Popover), activeAction == nameof(Popover)),
            new NavigationItemViewModel("Progress", nameof(Progress), activeAction == nameof(Progress)),
            new NavigationItemViewModel("Select", nameof(Select), activeAction == nameof(Select)),
            new NavigationItemViewModel("Separator", nameof(Separator), activeAction == nameof(Separator)),
            new NavigationItemViewModel("Skeleton", nameof(Skeleton), activeAction == nameof(Skeleton)),
            new NavigationItemViewModel("Spinner", nameof(Spinner), activeAction == nameof(Spinner)),
            new NavigationItemViewModel("Switch", nameof(Switch), activeAction == nameof(Switch)),
            new NavigationItemViewModel("Table", nameof(Table), activeAction == nameof(Table)),
            new NavigationItemViewModel("Tabs", nameof(Tabs), activeAction == nameof(Tabs)),
            new NavigationItemViewModel("Toast", nameof(Toast), activeAction == nameof(Toast)),
        ];
    }
}
