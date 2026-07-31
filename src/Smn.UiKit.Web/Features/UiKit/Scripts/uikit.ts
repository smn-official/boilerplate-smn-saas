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
}

function initializeTabs(): void {
    const groups = document.querySelectorAll<HTMLElement>("[data-smn-tabs]");

    for (const tabs of groups) {
        const buttons = [...tabs.querySelectorAll<HTMLButtonElement>("[role='tab']")];

        for (const button of buttons) {
            button.addEventListener("click", () => selectTab(tabs, button));

            button.addEventListener("keydown", (event: KeyboardEvent) => {
                const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;

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

initializeThemeToggle();
initializeCodeCopy();
initializeTabs();
initializeModals();
initializeInputOtp();
initializeToasts();
initializeToggleButtons();
initializeSliderOutputs();
initializeNumberFields();
initializeSearchFields();
