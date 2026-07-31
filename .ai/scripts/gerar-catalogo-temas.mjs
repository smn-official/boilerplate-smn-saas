/**
 * Gera o catálogo de temas que o painel consome.
 *
 * Lê os temas shadcn de .ai/referencias/temas-shadcn/, traduz cada um para o
 * vocabulário de tokens do UiKit (mesmo mapa do tema-shadcn-para-heroui.mjs) e
 * emite um único JSON com claro e escuro de todos.
 *
 * O painel carrega esse arquivo e aplica os tokens em runtime, sem rebuild —
 * é o que permite pré-visualizar um tema antes de adotá-lo.
 *
 * uso: node .ai/scripts/gerar-catalogo-temas.mjs
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ORIGEM = join(RAIZ, '.ai/referencias/temas-shadcn');
const DESTINO = join(RAIZ, 'src/Smn.UiKit.Web/wwwroot/temas.json');

/** token do UiKit -> token do shadcn que o alimenta. */
const MAPA = {
  background: 'background',
  foreground: 'foreground',
  surface: 'card',
  'surface-foreground': 'card-foreground',
  overlay: 'popover',
  'overlay-foreground': 'popover-foreground',
  accent: 'primary',
  'accent-foreground': 'primary-foreground',
  default: 'secondary',
  'default-foreground': 'secondary-foreground',
  muted: 'muted-foreground',
  danger: 'destructive',
  'danger-foreground': 'destructive-foreground',
  border: 'border',
  separator: 'border',
  'field-background': 'input',
  'field-foreground': 'foreground',
  focus: 'ring',
};

/** Extrai `--token: valor;` de um bloco de CSS. */
function tokensDe(bloco) {
  const encontrados = {};

  for (const [, nome, valor] of bloco.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    encontrados[nome] = valor.trim();
  }

  return encontrados;
}

/**
 * Isola o bloco claro e o escuro do arquivo do tema.
 *
 * Os seletores são compostos e indentados dentro de `@layer base` —
 * `.dark,\n  [data-theme="dark"] {` —, então a captura vai do seletor até a
 * primeira chave e daí até o fecho.
 */
function blocosDe(css) {
  const claro = css.match(/:root[^{]*\{([^}]+)\}/);
  const escuro = css.match(/\.dark[^{]*\{([^}]+)\}/);

  return {
    claro: claro ? tokensDe(claro[1]) : {},
    escuro: escuro ? tokensDe(escuro[1]) : {},
  };
}

/** Traduz os tokens shadcn para os do UiKit. */
function traduzir(tokens) {
  const saida = {};

  for (const [destino, origem] of Object.entries(MAPA)) {
    if (tokens[origem] !== undefined) {
      saida[destino] = tokens[origem];
    }
  }

  return saida;
}

/** Nome legível a partir do slug da pasta. */
function titulo(slug, css) {
  const primeiraLinha = css.match(/\/\*\s*([^\n—]+)—/);

  if (primeiraLinha !== null) {
    return primeiraLinha[1].trim();
  }

  return slug
    .split('-')
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(' ');
}

const pastas = (await readdir(ORIGEM, { withFileTypes: true }))
  .filter((entrada) => entrada.isDirectory())
  .map((entrada) => entrada.name)
  .sort();

const temas = [];

for (const slug of pastas) {
  let css;

  try {
    css = await readFile(join(ORIGEM, slug, `${slug}.css`), 'utf8');
  } catch {
    continue;
  }

  const { claro, escuro } = blocosDe(css);
  const tokensClaro = traduzir(claro);
  const tokensEscuro = traduzir(escuro);

  // Tema sem os dois modos não serve: o painel alterna entre eles.
  if (Object.keys(tokensClaro).length === 0 || Object.keys(tokensEscuro).length === 0) {
    continue;
  }

  temas.push({
    slug,
    nome: titulo(slug, css),
    claro: tokensClaro,
    escuro: tokensEscuro,
  });
}

await writeFile(DESTINO, JSON.stringify({ temas }, null, 0), 'utf8');

console.log(`${temas.length} temas -> ${DESTINO}`);
