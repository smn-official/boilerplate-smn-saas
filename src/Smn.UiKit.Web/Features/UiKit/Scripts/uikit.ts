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

initializeThemeToggle();
initializeCodeCopy();
