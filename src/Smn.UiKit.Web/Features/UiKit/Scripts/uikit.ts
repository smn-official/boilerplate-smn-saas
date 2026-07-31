const ThemeStorageKey = "smn-uikit-theme";

type Theme = "light" | "dark";

function applyTheme(theme: Theme): void {
    document.documentElement.classList.toggle("dark", theme === "dark");
}

function readStoredTheme(): Theme | null {
    const stored = localStorage.getItem(ThemeStorageKey);

    if (stored === "light" || stored === "dark") {
        return stored;
    }

    return null;
}

function initializeThemeToggle(): void {
    const stored = readStoredTheme();

    if (stored !== null) {
        applyTheme(stored);
    }

    const toggle = document.querySelector<HTMLElement>("[data-theme-toggle]");

    if (toggle === null) {
        return;
    }

    toggle.addEventListener("click", () => {
        const current: Theme = document.documentElement.classList.contains("dark")
            ? "dark"
            : "light";
        const next: Theme = current === "dark" ? "light" : "dark";

        applyTheme(next);
        localStorage.setItem(ThemeStorageKey, next);
    });
}

const CopyFeedbackMs = 2000;

function swapCopyIcons(button: HTMLElement, copied: boolean): void {
    const idle = button.querySelector<SVGElement>("[data-copy-icon='idle']");
    const done = button.querySelector<SVGElement>("[data-copy-icon='done']");

    idle?.toggleAttribute("hidden", copied);
    done?.toggleAttribute("hidden", !copied);
}

function initializeCodeCopy(): void {
    const blocks = document.querySelectorAll<HTMLElement>("[data-code-block]");

    for (const block of blocks) {
        const button = block.querySelector<HTMLButtonElement>("[data-copy-code]");
        const source = block.querySelector<HTMLElement>("[data-code-source]");
        const status = block.querySelector<HTMLElement>("[data-copy-status]");

        if (button === null || source === null) {
            continue;
        }

        const code = source.dataset.codeSource;

        if (code === undefined) {
            continue;
        }

        let resetHandle: number | undefined;

        button.addEventListener("click", () => {
            void navigator.clipboard.writeText(code).then(
                () => {
                    button.dataset.copied = "true";
                    swapCopyIcons(button, true);

                    if (status !== null) {
                        status.textContent = "Código copiado";
                    }

                    window.clearTimeout(resetHandle);
                    resetHandle = window.setTimeout(() => {
                        delete button.dataset.copied;
                        swapCopyIcons(button, false);

                        if (status !== null) {
                            status.textContent = "";
                        }
                    }, CopyFeedbackMs);
                },
                () => {
                    if (status !== null) {
                        status.textContent = "Não foi possível copiar";
                    }
                },
            );
        });
    }
}

/**
 * Move o fundo da aba ativa até ela. As medidas vão para custom properties e o
 * CSS anima a transição — assim o fundo desliza de uma aba para a outra em vez
 * de sumir de uma e aparecer na outra.
 */
function moveTabIndicator(tabs: HTMLElement): void {
    const list = tabs.querySelector<HTMLElement>(".tabs__list");
    const active = list?.querySelector<HTMLElement>("[role='tab'][aria-selected='true']");

    if (list === null || list === undefined || active === null || active === undefined) {
        return;
    }

    list.style.setProperty("--tabs-indicator-x", `${active.offsetLeft}px`);
    list.style.setProperty("--tabs-indicator-y", `${active.offsetTop}px`);
    list.style.setProperty("--tabs-indicator-width", `${active.offsetWidth}px`);
    list.style.setProperty("--tabs-indicator-height", `${active.offsetHeight}px`);
    list.setAttribute("data-tabs-ready", "true");
}

function selectTab(tabs: HTMLElement, target: HTMLElement): void {
    const buttons = tabs.querySelectorAll<HTMLButtonElement>("[role='tab']");

    for (const button of buttons) {
        const isTarget = button === target;
        const panelId = button.getAttribute("aria-controls");
        const panel = panelId === null ? null : document.getElementById(panelId);

        button.setAttribute("aria-selected", isTarget ? "true" : "false");
        button.tabIndex = isTarget ? 0 : -1;
        panel?.toggleAttribute("hidden", !isTarget);
    }

    moveTabIndicator(tabs);
}

function initializeTabs(): void {
    const groups = document.querySelectorAll<HTMLElement>("[data-smn-tabs]");

    for (const tabs of groups) {
        const buttons = [...tabs.querySelectorAll<HTMLButtonElement>("[role='tab']")];
        const vertical = tabs.dataset.orientation === "vertical";

        moveTabIndicator(tabs);

        // Fontes carregando depois mudam a largura das abas; sem remedir, o
        // indicador fica desalinhado do texto.
        if (typeof ResizeObserver !== "undefined") {
            const list = tabs.querySelector<HTMLElement>(".tabs__list");

            if (list !== null) {
                new ResizeObserver(() => moveTabIndicator(tabs)).observe(list);
            }
        }

        for (const button of buttons) {
            button.addEventListener("click", () => selectTab(tabs, button));

            button.addEventListener("keydown", (event: KeyboardEvent) => {
                const forwardKey = vertical ? "ArrowDown" : "ArrowRight";
                const backwardKey = vertical ? "ArrowUp" : "ArrowLeft";
                const step = event.key === forwardKey ? 1 : event.key === backwardKey ? -1 : 0;

                if (step === 0) {
                    return;
                }

                event.preventDefault();

                const enabled = buttons.filter((candidate) => !candidate.disabled);
                const current = enabled.indexOf(button);
                const next = enabled[(current + step + enabled.length) % enabled.length];

                if (next === undefined) {
                    return;
                }

                selectTab(tabs, next);
                next.focus();
            });
        }
    }
}

function initializeModals(): void {
    const openers = document.querySelectorAll<HTMLElement>("[data-modal-open]");

    for (const opener of openers) {
        opener.addEventListener("click", () => {
            const id = opener.dataset.modalOpen;
            const dialog = id === undefined ? null : document.getElementById(id);

            if (dialog instanceof HTMLDialogElement) {
                dialog.showModal();
            }
        });
    }

    const closers = document.querySelectorAll<HTMLElement>("[data-modal-close]");

    for (const closer of closers) {
        closer.addEventListener("click", () => {
            closer.closest("dialog")?.close();
        });
    }

    // Clicar fora fecha: o ::backdrop conta como clique no próprio <dialog>,
    // então comparar o alvo com ele distingue fora de dentro.
    for (const dialog of document.querySelectorAll<HTMLDialogElement>("dialog.modal")) {
        dialog.addEventListener("click", (event: MouseEvent) => {
            if (event.target === dialog) {
                dialog.close();
            }
        });
    }
}

function initializeInputOtp(): void {
    const groups = document.querySelectorAll<HTMLElement>("[data-smn-input-otp]");

    for (const group of groups) {
        const boxes = [...group.querySelectorAll<HTMLInputElement>(".input-otp__slot")];

        boxes.forEach((box, index) => {
            box.addEventListener("input", () => {
                box.value = box.value.replace(/\D/g, "").slice(0, 1);

                if (box.value !== "") {
                    boxes[index + 1]?.focus();
                }
            });

            box.addEventListener("keydown", (event: KeyboardEvent) => {
                // Backspace numa casa vazia volta para a anterior, senão o
                // usuário fica preso apagando o nada.
                if (event.key === "Backspace" && box.value === "") {
                    event.preventDefault();
                    const previous = boxes[index - 1];
                    previous?.focus();

                    if (previous !== undefined) {
                        previous.value = "";
                    }
                }
            });

            box.addEventListener("paste", (event: ClipboardEvent) => {
                event.preventDefault();

                const digits = (event.clipboardData?.getData("text") ?? "").replace(/\D/g, "");

                digits.split("").forEach((digit, offset) => {
                    const target = boxes[index + offset];

                    if (target !== undefined) {
                        target.value = digit;
                    }
                });

                const filled = Math.min(index + digits.length, boxes.length - 1);
                boxes[filled]?.focus();
            });
        });
    }
}

function initializeToasts(): void {
    for (const button of document.querySelectorAll<HTMLElement>("[data-toast-close]")) {
        button.addEventListener("click", () => {
            button.closest<HTMLElement>(".toast")?.remove();
        });
    }
}

function initializeToggleButtons(): void {
    for (const button of document.querySelectorAll<HTMLButtonElement>(".toggle-button")) {
        button.addEventListener("click", () => {
            const pressed = button.getAttribute("aria-pressed") === "true";
            button.setAttribute("aria-pressed", pressed ? "false" : "true");
        });
    }
}

function initializeSliderOutputs(): void {
    for (const slider of document.querySelectorAll<HTMLElement>("[data-slider-output]")) {
        const input = slider.querySelector<HTMLInputElement>(".slider__input");
        const output = slider.querySelector<HTMLElement>(".slider__output");

        if (input === null || output === null) {
            continue;
        }

        const suffix = slider.dataset.sliderSuffix ?? "";

        input.addEventListener("input", () => {
            output.textContent = `${input.value}${suffix}`;
            input.setAttribute("aria-valuetext", `${input.value}${suffix}`);
        });
    }
}

function initializeNumberFields(): void {
    for (const group of document.querySelectorAll<HTMLElement>("[data-smn-number-field]")) {
        const input = group.querySelector<HTMLInputElement>(".number-field__input");

        if (input === null) {
            continue;
        }

        for (const button of group.querySelectorAll<HTMLButtonElement>("[data-number-step]")) {
            button.addEventListener("click", () => {
                // stepUp/stepDown já respeitam min, max e step do próprio input.
                if (button.dataset.numberStep === "1") {
                    input.stepUp();
                } else {
                    input.stepDown();
                }

                input.dispatchEvent(new Event("change", { bubbles: true }));
            });
        }
    }
}

function initializeSearchFields(): void {
    for (const group of document.querySelectorAll<HTMLElement>("[data-smn-search-field]")) {
        const input = group.querySelector<HTMLInputElement>(".input-group__input");
        const clear = group.querySelector<HTMLButtonElement>("[data-search-clear]");

        if (input === null || clear === null) {
            continue;
        }

        const sync = (): void => {
            clear.hidden = input.value === "";
        };

        sync();
        input.addEventListener("input", sync);

        clear.addEventListener("click", () => {
            input.value = "";
            sync();
            input.focus();
            input.dispatchEvent(new Event("input", { bubbles: true }));
        });
    }
}

function revealActiveMenuItem(): void {
    const sidebar = document.querySelector<HTMLElement>(".panel-sidebar");
    const active = sidebar?.querySelector<HTMLElement>("[aria-current='page']");

    if (sidebar === undefined || sidebar === null || active === undefined || active === null) {
        return;
    }

    // Só rola quando o item ativo está fora da área visível do menu. Em página
    // do fim da lista ele nasceria abaixo do corte, e o usuário não veria onde está.
    const fits =
        active.offsetTop >= sidebar.scrollTop &&
        active.offsetTop + active.offsetHeight <= sidebar.scrollTop + sidebar.clientHeight;

    if (!fits) {
        sidebar.scrollTop = active.offsetTop - sidebar.clientHeight / 2 + active.offsetHeight / 2;
    }
}

type ThemeTokens = Record<string, string>;

interface CatalogTheme {
    slug: string;
    nome: string;
    claro: ThemeTokens;
    escuro: ThemeTokens;
}

const ThemeChoiceKey = "smn-uikit-tema";
const ThemeStyleId = "smn-uikit-tema-aplicado";

/**
 * Escreve os tokens do tema numa folha de estilo própria, em vez de mexer no
 * style inline do <html>. Assim a alternância claro/escuro continua sendo só a
 * classe .dark, e restaurar o padrão é remover um elemento.
 */
function applyThemeTokens(theme: CatalogTheme | null): void {
    document.getElementById(ThemeStyleId)?.remove();

    if (theme === null) {
        return;
    }

    const toBlock = (tokens: ThemeTokens): string =>
        Object.entries(tokens)
            .map(([name, value]) => `--${name}:${value};`)
            .join("");

    const style = document.createElement("style");
    style.id = ThemeStyleId;
    style.textContent =
        `:root{${toBlock(theme.claro)}}` + `.dark{${toBlock(theme.escuro)}}`;

    document.head.append(style);
}

function readStoredTheme2(catalog: CatalogTheme[]): CatalogTheme | null {
    const slug = localStorage.getItem(ThemeChoiceKey);

    return catalog.find((theme) => theme.slug === slug) ?? null;
}

/** Amostras de cor que resumem o tema no card e no cabeçalho. */
function swatches(theme: CatalogTheme, dark: boolean): string {
    const tokens = dark ? theme.escuro : theme.claro;
    const keys = ["accent", "surface", "default", "danger", "foreground"];

    return keys
        .map((key) => {
            const color = tokens[key] ?? "transparent";
            return `<span class="tema__amostra" style="background:${color}"></span>`;
        })
        .join("");
}

function initializeThemes(): void {
    const root = document.querySelector<HTMLElement>("[data-smn-temas]");

    if (root === null) {
        return;
    }

    const grid = root.querySelector<HTMLElement>("[data-tema-grade]");
    const empty = root.querySelector<HTMLElement>("[data-tema-vazio]");
    const count = root.querySelector<HTMLElement>("[data-tema-contagem]");
    const search = root.querySelector<HTMLInputElement>("[data-tema-busca] input");
    const currentName = root.querySelector<HTMLElement>("[data-tema-atual-nome]");
    const currentDescription = root.querySelector<HTMLElement>("[data-tema-atual-descricao]");
    const currentSwatches = root.querySelector<HTMLElement>("[data-tema-atual-amostras]");
    const restore = root.querySelector<HTMLElement>("[data-tema-restaurar]");

    const dialog = document.getElementById("modal-tema");
    const preview = document.querySelector<HTMLElement>("[data-tema-preview]");
    const apply = document.querySelector<HTMLElement>("[data-tema-aplicar]");
    const cancel = document.querySelector<HTMLElement>("[data-tema-cancelar]");

    if (grid === null || dialog === null || preview === null) {
        return;
    }

    let catalog: CatalogTheme[] = [];
    let staged: CatalogTheme | null = null;
    let committed: CatalogTheme | null = null;

    const isDark = (): boolean => document.documentElement.classList.contains("dark");

    const describeCurrent = (): void => {
        const active = committed;

        if (currentName !== null) {
            currentName.textContent = active?.nome ?? "Padrão do UiKit";
        }

        if (currentDescription !== null) {
            currentDescription.textContent =
                active === null
                    ? "Os tokens que vêm no tokens.css."
                    : `Tema "${active.nome}" aplicado sobre os tokens do UiKit.`;
        }

        if (currentSwatches !== null) {
            currentSwatches.innerHTML = active === null ? "" : swatches(active, isDark());
        }

        restore?.toggleAttribute("hidden", active === null);
    };

    const render = (term: string): void => {
        const needle = term.trim().toLowerCase();
        const visible = catalog.filter((theme) => theme.nome.toLowerCase().includes(needle));

        grid.innerHTML = visible
            .map(
                (theme) => `
                <button type="button" class="tema-card" data-tema-slug="${theme.slug}">
                    <span class="tema-card__amostras">${swatches(theme, isDark())}</span>
                    <span class="tema-card__nome">${theme.nome}</span>
                </button>`,
            )
            .join("");

        empty?.classList.toggle("hidden", visible.length > 0);

        if (count !== null) {
            count.textContent = `(${visible.length})`;
        }
    };

    const openPreview = (theme: CatalogTheme): void => {
        staged = theme;
        applyThemeTokens(theme);

        preview.innerHTML = `
            <p class="mb-3 text-sm font-medium">${theme.nome}</p>
            <p class="mb-4 text-sm text-muted">
                O painel inteiro já está com este tema. Confirme para manter, ou cancele para voltar.
            </p>
            <div class="flex flex-wrap items-center gap-2">
                <span class="button button--primary">Primary</span>
                <span class="button button--secondary">Secondary</span>
                <span class="button button--outline">Outline</span>
                <span class="button button--danger">Danger</span>
            </div>
            <div class="mt-3 flex flex-wrap items-center gap-2">
                <span class="chip chip--accent chip--soft chip--md"><span class="chip__label">Accent</span></span>
                <span class="chip chip--success chip--soft chip--md"><span class="chip__label">Success</span></span>
                <span class="chip chip--warning chip--soft chip--md"><span class="chip__label">Warning</span></span>
                <span class="chip chip--danger chip--soft chip--md"><span class="chip__label">Danger</span></span>
            </div>`;

        if (dialog instanceof HTMLDialogElement) {
            dialog.showModal();
        }
    };

    // Fechar sem confirmar volta ao tema que estava valendo — a pré-visualização
    // não pode virar aplicação por acidente.
    const revert = (): void => {
        staged = null;
        applyThemeTokens(committed);
    };

    grid.addEventListener("click", (event: MouseEvent) => {
        const card = (event.target as HTMLElement).closest<HTMLElement>("[data-tema-slug]");
        const theme = catalog.find((item) => item.slug === card?.dataset.temaSlug);

        if (theme !== undefined) {
            openPreview(theme);
        }
    });

    apply?.addEventListener("click", () => {
        if (staged !== null) {
            committed = staged;
            localStorage.setItem(ThemeChoiceKey, committed.slug);
            staged = null;
            describeCurrent();
        }

        if (dialog instanceof HTMLDialogElement) {
            dialog.close();
        }
    });

    // Escolher no painel é metade do caminho: o projeto precisa do CSS em disco.
    // Aqui sai o arquivo pronto para colar depois do tokens.css.
    const exportButton = document.querySelector<HTMLElement>("[data-tema-exportar]");

    exportButton?.addEventListener("click", () => {
        if (staged === null) {
            return;
        }

        const block = (tokens: ThemeTokens): string =>
            Object.entries(tokens)
                .map(([name, value]) => `    --${name}: ${value};`)
                .join("\n");

        const css =
            `/* ${staged.nome} — tema do tweakcn adaptado ao vocabulário do UiKit.\n` +
            ` * Importe DEPOIS de tokens.css: sobrescreve os tokens base e deixa\n` +
            ` * intactos os derivados (--accent-hover, --accent-soft) que o color-mix calcula.\n` +
            ` */\n\n` +
            `:root {\n${block(staged.claro)}\n}\n\n` +
            `.dark {\n${block(staged.escuro)}\n}\n`;

        void navigator.clipboard.writeText(css).then(
            () => {
                exportButton.textContent = "CSS copiado";
                window.setTimeout(() => {
                    exportButton.textContent = "Copiar CSS";
                }, 2000);
            },
            () => {
                exportButton.textContent = "Não foi possível copiar";
            },
        );
    });

    cancel?.addEventListener("click", revert);
    dialog.addEventListener("close", () => {
        if (staged !== null) {
            revert();
        }
    });

    restore?.addEventListener("click", () => {
        committed = null;
        localStorage.removeItem(ThemeChoiceKey);
        applyThemeTokens(null);
        describeCurrent();
        render(search?.value ?? "");
    });

    search?.addEventListener("input", () => render(search.value));

    // As amostras mudam de cor com o tema claro/escuro do painel.
    new MutationObserver(() => {
        describeCurrent();
        render(search?.value ?? "");
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    void fetch("/temas.json")
        .then((response) => response.json() as Promise<{ temas: CatalogTheme[] }>)
        .then((data) => {
            catalog = data.temas;
            committed = readStoredTheme2(catalog);
            describeCurrent();
            render("");
        })
        .catch(() => {
            grid.innerHTML =
                '<p class="text-sm text-danger">Não foi possível carregar o catálogo de temas.</p>';
        });
}

/**
 * Reaplica o tema escolhido em toda página do painel, não só na de temas —
 * senão navegar para outro componente voltaria ao padrão.
 */
function restoreChosenTheme(): void {
    const slug = localStorage.getItem(ThemeChoiceKey);

    if (slug === null || document.querySelector("[data-smn-temas]") !== null) {
        return;
    }

    void fetch("/temas.json")
        .then((response) => response.json() as Promise<{ temas: CatalogTheme[] }>)
        .then((data) => {
            applyThemeTokens(data.temas.find((theme) => theme.slug === slug) ?? null);
        })
        .catch(() => {
            // Sem catálogo o painel fica no tema padrão, que é aceitável.
        });
}

initializeThemeToggle();
revealActiveMenuItem();
initializeThemes();
restoreChosenTheme();
initializeCodeCopy();
initializeTabs();
initializeModals();
initializeInputOtp();
initializeToasts();
initializeToggleButtons();
initializeSliderOutputs();
initializeNumberFields();
initializeSearchFields();
