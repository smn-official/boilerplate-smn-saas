const JUROS_AO_MES = 0.0149;

const moeda = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
});

function calcularParcela(financiado: number, prazo: number): number {
    if (financiado <= 0) {
        return 0;
    }

    const fator = (1 + JUROS_AO_MES) ** prazo;

    return (financiado * JUROS_AO_MES * fator) / (fator - 1);
}

function iniciarSimulador(): void {
    const versoes = document.querySelector<HTMLElement>("[data-simulador-versoes]");
    const controleEntrada = document.querySelector<HTMLInputElement>("[data-simulador-controle-entrada]");
    const controlePrazo = document.querySelector<HTMLSelectElement>("[data-simulador-controle-prazo]");
    const saidaEntrada = document.querySelector<HTMLElement>("[data-simulador-entrada]");
    const saidaParcela = document.querySelector<HTMLElement>("[data-simulador-parcela]");
    const saidaFinanciado = document.querySelector<HTMLElement>("[data-simulador-financiado]");
    const saidaPrazo = document.querySelector<HTMLElement>("[data-simulador-prazo]");
    const saidaNome = document.querySelector<HTMLElement>("[data-simulador-nome]");
    const anuncio = document.querySelector<HTMLElement>("[data-simulador-anuncio]");

    if (!versoes || !controleEntrada || !controlePrazo || !saidaEntrada
        || !saidaParcela || !saidaFinanciado || !saidaPrazo || !saidaNome || !anuncio) {
        return;
    }

    const recalcular = (): void => {
        const versaoMarcada = versoes.querySelector<HTMLInputElement>("input[name='versao']:checked");

        if (!versaoMarcada) {
            return;
        }

        const preco = Number(versaoMarcada.dataset["preco"] ?? 0);
        const nome = versaoMarcada.dataset["nome"] ?? "";
        const prazo = Number(controlePrazo.value);
        const entradaEscolhida = Number(controleEntrada.value);
        const entrada = Math.min(entradaEscolhida, preco);
        const financiado = preco - entrada;
        const parcela = calcularParcela(financiado, prazo);

        saidaEntrada.textContent = moeda.format(entrada);
        saidaFinanciado.textContent = moeda.format(financiado);
        saidaPrazo.textContent = String(prazo);
        saidaNome.textContent = nome;
        saidaParcela.textContent = financiado === 0 ? "À vista" : moeda.format(parcela);

        anuncio.textContent = financiado === 0
            ? `${nome} quitado à vista por ${moeda.format(preco)}.`
            : `${nome}: ${moeda.format(parcela)} por mês em ${prazo} parcelas.`;
    };

    versoes.addEventListener("change", recalcular);
    controleEntrada.addEventListener("input", recalcular);
    controlePrazo.addEventListener("change", recalcular);

    recalcular();
}

function iniciarFormulario(): void {
    const formulario = document.querySelector<HTMLFormElement>("[data-formulario-agendamento]");

    if (!formulario) {
        return;
    }

    const botao = formulario.querySelector<HTMLButtonElement>("[data-botao-enviar]");
    const iconePadrao = formulario.querySelector<SVGElement>("[data-icone-padrao]");
    const iconeCarregando = formulario.querySelector<SVGElement>("[data-icone-carregando]");
    const sucesso = formulario.querySelector<HTMLElement>("[data-mensagem-sucesso]");

    if (!botao || !iconePadrao || !iconeCarregando || !sucesso) {
        return;
    }

    const mostrarErro = (campo: string, mensagem: string): void => {
        const alvo = formulario.querySelector<HTMLElement>(`[data-erro-de='${campo}']`);

        if (!alvo) {
            return;
        }

        alvo.textContent = mensagem;
        alvo.hidden = mensagem.length === 0;
    };

    formulario.addEventListener("submit", (evento) => {
        evento.preventDefault();

        const dados = new FormData(formulario);
        const nome = String(dados.get("nome") ?? "").trim();
        const telefone = String(dados.get("telefone") ?? "").replace(/\D/g, "");

        mostrarErro("nome", nome.length >= 3 ? "" : "Escreva seu nome completo.");
        mostrarErro("telefone", telefone.length >= 10 ? "" : "Informe o telefone com DDD.");

        if (nome.length < 3 || telefone.length < 10) {
            return;
        }

        botao.disabled = true;
        botao.setAttribute("aria-busy", "true");
        iconePadrao.classList.add("hidden");
        iconeCarregando.classList.remove("hidden");

        window.setTimeout(() => {
            botao.disabled = false;
            botao.removeAttribute("aria-busy");
            iconePadrao.classList.remove("hidden");
            iconeCarregando.classList.add("hidden");
            sucesso.hidden = false;
            formulario.reset();
        }, 900);
    });
}

iniciarSimulador();
iniciarFormulario();
