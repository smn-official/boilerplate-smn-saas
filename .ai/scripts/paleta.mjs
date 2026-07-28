#!/usr/bin/env node
/**
 * Sugere e valida paleta para os design tokens.
 *
 * A API sugere; este script CORRIGE o contraste. Paleta crua de gerador
 * reprova em WCAG com frequência — usar a saída direto produz design system
 * inacessível.
 *
 * Uso:
 *   node .ai/scripts/paleta.mjs                      # sugere do zero
 *   node .ai/scripts/paleta.mjs --marca "#2563EB"    # ancora na cor da marca
 *   node .ai/scripts/paleta.mjs --marca "#2563EB" --sem-api
 *   node .ai/scripts/paleta.mjs --validar "#2563EB,#FFFFFF,#E5E7EB,#111827,#6B7280"
 */

const API = 'https://colormind.io/api/';

// ---------------------------------------------------------------- cor

const hexParaRgb = (h) => {
  const s = h.replace('#', '').trim();
  const full = s.length === 3 ? [...s].map((c) => c + c).join('') : s;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};

const rgbParaHex = (rgb) =>
  '#' + rgb.map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('').toUpperCase();

function luminancia([r, g, b]) {
  const f = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Razão de contraste WCAG 2.1 entre duas cores. */
export function contraste(a, b) {
  const [l1, l2] = [luminancia(hexParaRgb(a)), luminancia(hexParaRgb(b))].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

function rgbParaHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslParaRgb([h, s, l]) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const conv = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [conv(h + 1 / 3), conv(h), conv(h - 1 / 3)].map((c) => c * 255);
}

/**
 * Ajusta a LUMINOSIDADE até atingir o contraste alvo, preservando matiz e
 * saturação — mudar matiz trocaria a identidade da marca.
 */
function ajustarParaContraste(cor, fundo, alvo) {
  if (contraste(cor, fundo) >= alvo) return cor;

  const [h, s, l0] = rgbParaHsl(hexParaRgb(cor));
  const fundoClaro = luminancia(hexParaRgb(fundo)) > 0.4;

  let melhor = cor;
  for (let passo = 1; passo <= 100; passo++) {
    const l = fundoClaro ? l0 - passo / 100 : l0 + passo / 100;
    if (l < 0 || l > 1) break;
    const candidato = rgbParaHex(hslParaRgb([h, s, l]));
    melhor = candidato;
    if (contraste(candidato, fundo) >= alvo) return candidato;
  }
  return melhor;
}

// ---------------------------------------------------------------- paleta

const PALETAS_PRONTAS = {
  azul: {
    nome: 'Azul corporativo — neutro, seguro para SaaS B2B',
    tokens: { primaria: '#1D4ED8', superficie: '#FFFFFF', borda: '#8C9CB0', texto: '#0F172A', textoSuave: '#64748B' },
  },
  verde: {
    nome: 'Verde — saúde, sustentabilidade, finanças pessoais',
    tokens: { primaria: '#047857', superficie: '#FFFFFF', borda: '#8C9CB0', texto: '#0F172A', textoSuave: '#64748B' },
  },
  violeta: {
    nome: 'Violeta — produto moderno, criativo, developer tools',
    tokens: { primaria: '#6D28D9', superficie: '#FFFFFF', borda: '#8C9CB0', texto: '#1E1B29', textoSuave: '#6B7280' },
  },
  grafite: {
    nome: 'Grafite — sóbrio, deixa o conteúdo dominar',
    tokens: { primaria: '#334155', superficie: '#FFFFFF', borda: '#8C9CB0', texto: '#0F172A', textoSuave: '#64748B' },
  },
};

async function sugerirViaApi(marca) {
  const corpo = marca
    ? { model: 'ui', input: [hexParaRgb(marca), 'N', 'N', 'N', 'N'] }
    : { model: 'ui' };

  const resposta = await fetch(API, {
    method: 'POST',
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(10_000),
  });
  if (!resposta.ok) throw new Error(`API respondeu ${resposta.status}`);

  const { result } = await resposta.json();
  const cores = result.map(rgbParaHex);
  const ordenadas = [...cores].sort((a, b) => luminancia(hexParaRgb(b)) - luminancia(hexParaRgb(a)));

  // A superfície é SEMPRE branca em tema claro, nunca uma cor da API. Deixar a
  // API escolher o fundo inverte a paleta: superfície média torna impossível
  // atingir 7:1 no texto, e a correção de luminosidade não tem para onde ir.
  const superficie = '#FFFFFF';

  // A âncora nem sempre volta na posição 0 — a API pode reordenar. Quando há
  // marca, ela é a primária por definição; não se procura entre as devolvidas.
  const primaria = marca
    ? (marca.startsWith('#') ? marca : `#${marca}`)
    : ordenadas.find((c) => contraste(c, superficie) >= 3) ?? ordenadas[3];

  return {
    primaria,
    superficie,
    borda: ordenadas[1],
    texto: ordenadas[4],
    textoSuave: ordenadas[3],
  };
}

/** Corrige a paleta até passar em WCAG. Retorna tokens + relatório. */
export function corrigirEValidar(t) {
  const superficie = t.superficie;

  const corrigida = {
    primaria: ajustarParaContraste(t.primaria, superficie, 4.5),
    superficie,
    borda: ajustarParaContraste(t.borda, superficie, 3.0),
    texto: ajustarParaContraste(t.texto, superficie, 7.0),
    textoSuave: ajustarParaContraste(t.textoSuave, superficie, 4.5),
  };

  const checagens = [
    ['texto × superfície', corrigida.texto, superficie, 7.0, 'texto principal (AAA)'],
    ['texto-suave × superfície', corrigida.textoSuave, superficie, 4.5, 'texto secundário (AA)'],
    ['primária × superfície', corrigida.primaria, superficie, 4.5, 'link, botão, ação'],
    ['borda × superfície', corrigida.borda, superficie, 3.0, 'borda, divisor, ícone'],
  ].map(([par, a, b, minimo, uso]) => {
    const razao = contraste(a, b);
    return { par, razao, minimo, uso, passa: razao >= minimo, mudou: false };
  });

  for (const chave of Object.keys(corrigida)) {
    if (corrigida[chave].toUpperCase() !== (t[chave] ?? '').toUpperCase()) {
      const alvo = checagens.find((c) => c.par.startsWith(chave.replace('textoSuave', 'texto-suave')));
      if (alvo) alvo.mudou = true;
    }
  }

  return { tokens: corrigida, checagens };
}

function imprimir(tokens, checagens, origem) {
  console.log(`\nPaleta sugerida (${origem}):\n`);
  const rotulos = {
    primaria: '--color-primaria', superficie: '--color-superficie', borda: '--color-borda',
    texto: '--color-texto', textoSuave: '--color-texto-suave',
  };
  for (const [k, v] of Object.entries(tokens)) console.log(`  ${rotulos[k].padEnd(22)} ${v}`);

  console.log('\nContraste WCAG:\n');
  for (const c of checagens) {
    const marca = c.passa ? 'ok  ' : 'FALHA';
    const nota = c.mudou ? '  (luminosidade ajustada)' : '';
    console.log(`  ${marca} ${c.par.padEnd(26)} ${c.razao.toFixed(2)}:1  (min ${c.minimo})  ${c.uso}${nota}`);
  }

  const falhas = checagens.filter((c) => !c.passa);
  console.log(falhas.length
    ? `\n${falhas.length} par(es) ainda abaixo do mínimo — escolha outra cor de marca.`
    : '\nTodos os pares passam. Aplique em Features/Shared/Styles/app.css, no @theme.');

  console.log(`
@theme {
    --color-primaria: ${tokens.primaria};
    --color-superficie: ${tokens.superficie};
    --color-borda: ${tokens.borda};
    --color-texto: ${tokens.texto};
    --color-texto-suave: ${tokens.textoSuave};
}`);
}

// ---------------------------------------------------------------- cli

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--marca') a.marca = argv[++i];
    else if (argv[i] === '--validar') a.validar = argv[++i];
    else if (argv[i] === '--sem-api') a.semApi = true;
    else if (argv[i] === '--pronta') a.pronta = argv[++i];
    else if (argv[i] === '--help' || argv[i] === '-h') a.help = true;
  }
  return a;
}

const HEX = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(`
Sugere e valida paleta para os design tokens.

  --marca <hex>        Ancora a sugestão na cor da marca (ex.: "#2563EB")
  --pronta <nome>      Usa paleta pronta: ${Object.keys(PALETAS_PRONTAS).join(', ')}
  --validar <5 hex>    Só valida o contraste de uma paleta existente
  --sem-api            Não chama a API; usa paleta pronta

A API sugere, mas o contraste é corrigido aqui: paleta crua de gerador reprova
em WCAG com frequência. O ajuste mexe na luminosidade, nunca no matiz.
`);
    return 0;
  }

  if (args.marca && !HEX.test(args.marca)) {
    console.error(`erro: --marca inválida: "${args.marca}". Use hex, ex.: "#2563EB".`);
    return 1;
  }

  if (args.validar) {
    const cores = args.validar.split(',').map((c) => c.trim());
    if (cores.length !== 5 || !cores.every((c) => HEX.test(c))) {
      console.error('erro: --validar exige 5 hex separados por vírgula (primaria,superficie,borda,texto,textoSuave).');
      return 1;
    }
    const [primaria, superficie, borda, texto, textoSuave] = cores.map((c) => (c.startsWith('#') ? c : `#${c}`));
    const { tokens, checagens } = corrigirEValidar({ primaria, superficie, borda, texto, textoSuave });
    imprimir(tokens, checagens, 'validada e corrigida');
    return checagens.every((c) => c.passa) ? 0 : 1;
  }

  if (args.pronta) {
    const p = PALETAS_PRONTAS[args.pronta];
    if (!p) {
      console.error(`erro: paleta "${args.pronta}" não existe. Opções: ${Object.keys(PALETAS_PRONTAS).join(', ')}`);
      return 1;
    }
    const { tokens, checagens } = corrigirEValidar(p.tokens);
    imprimir(tokens, checagens, p.nome);
    return 0;
  }

  if (args.semApi) {
    console.log('\nPaletas prontas — todas verificadas em WCAG:\n');
    for (const [chave, p] of Object.entries(PALETAS_PRONTAS)) {
      console.log(`  ${chave.padEnd(9)} ${p.tokens.primaria}  ${p.nome}`);
    }
    console.log('\nEscolha com --pronta <nome>.');
    return 0;
  }

  try {
    const bruta = await sugerirViaApi(args.marca);
    const { tokens, checagens } = corrigirEValidar(bruta);
    imprimir(tokens, checagens, args.marca ? `colormind.io, ancorada em ${args.marca}` : 'colormind.io');
  } catch (erro) {
    console.error(`\nAPI indisponível (${erro.message}). Use --sem-api para ver as paletas prontas.`);
    return 1;
  }
  return 0;
}

process.exit(await main());
