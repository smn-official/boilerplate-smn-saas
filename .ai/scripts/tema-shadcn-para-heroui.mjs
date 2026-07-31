/**
 * Adapta um tema shadcn (tweakcn) para o vocabulário de tokens do HeroUI.
 *
 * Os dois acervos nomeiam as mesmas ideias diferente — `--primary` vs `--accent`,
 * `--card` vs `--surface`. Este script lê o tema shadcn e emite um arquivo que
 * declara os tokens do HeroUI a partir dos valores dele, para claro e escuro.
 *
 * uso: node tema-shadcn-para-heroui.mjs <slug-do-tema> [arquivo-de-saida]
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** token do HeroUI  ->  token do shadcn que o alimenta. */
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
  radius: 'radius',
};

/** Extrai `--token: valor;` de um bloco. */
function tokensDe(bloco) {
  const mapa = {};
  for (const m of bloco.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) mapa[m[1]] = m[2].trim();
  return mapa;
}

const slug = process.argv[2];
if (!slug) {
  console.error('informe o slug do tema, ex.: node tema-shadcn-para-heroui.mjs cloudflare');
  process.exit(1);
}

const origem = resolve(RAIZ, '.ai/referencias/temas-shadcn', slug, `${slug}.css`);
const css = await readFile(origem, 'utf8');

const claro = tokensDe(css.match(/:root\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? '');
const escuro = tokensDe(css.match(/\[data-theme="dark"\]\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? '');
const nome = css.match(/^\/\* (.+?) —/m)?.[1] ?? slug;

function bloco(tokens, base) {
  const linhas = [];
  for (const [heroui, shadcn] of Object.entries(MAPA)) {
    const valor = tokens[shadcn] ?? base?.[shadcn];
    if (valor) linhas.push(`  --${heroui}: ${valor};`);
  }
  return linhas.join('\n');
}

const saida = `/* ${nome} — tema shadcn adaptado ao vocabulário do HeroUI.
 * Gerado por .ai/scripts/tema-shadcn-para-heroui.mjs a partir de
 * .ai/referencias/temas-shadcn/${slug}/${slug}.css
 *
 * Importar DEPOIS de tema/default.css: sobrescreve os tokens, mantendo
 * intactos os derivados (--accent-hover, --accent-soft) que o default.css
 * calcula com color-mix.
 */

:root,
.light,
[data-theme="light"] {
${bloco(claro)}
}

.dark,
[data-theme="dark"] {
${bloco(escuro, claro)}
}
`;

const destino = process.argv[3] ?? `tema-${slug}.css`;
await writeFile(destino, saida);
console.log(`tema "${nome}" -> ${destino}`);
console.log(`tokens claro: ${bloco(claro).split('\n').length} | escuro: ${bloco(escuro, claro).split('\n').length}`);
