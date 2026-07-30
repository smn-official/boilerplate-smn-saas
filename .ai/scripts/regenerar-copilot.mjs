#!/usr/bin/env node
/**
 * Regenera `.github/copilot-instructions.md` a partir do `AGENTS.md` da raiz.
 *
 * `CLAUDE.md` e `GEMINI.md` são symlinks e nunca divergem. O arquivo do Copilot
 * não pode ser symlink: os links do `AGENTS.md` são relativos à raiz (`.ai/…`) e,
 * lidos de dentro de `.github/`, resolveriam para `.github/.ai/…` — todos mortos.
 * Nenhuma forma de caminho resolve dos dois lugares num sistema de arquivos
 * (`/.ai/…` só funciona no renderizador web do GitHub, não no working tree que a
 * ferramenta lê), então a cópia com `../` é a única saída.
 *
 * O custo é divergir em silêncio, e é por isso que este script existe ao lado da
 * verificação `verificarCopiaDoCopilot` do `verificar.mjs`: uma regenera, a outra
 * acusa quem esqueceu de regenerar.
 *
 * Uso:
 *   node .ai/scripts/regenerar-copilot.mjs
 */

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const AVISO = `<!-- Arquivo gerado a partir do AGENTS.md da raiz. Não edite aqui. -->

> **Arquivo gerado — não edite aqui.** A fonte é o [\`AGENTS.md\`](../AGENTS.md) da raiz; esta é uma
> cópia com os links reescritos de \`.ai/…\` para \`../.ai/…\`, porque link relativo lido de dentro de
> \`.github/\` resolveria para \`.github/.ai/…\` e morreria. Nenhuma forma de caminho resolve dos dois
> lugares num sistema de arquivos, então a cópia é a única saída. Alterou a norma? Altere o
> \`AGENTS.md\` da raiz e regenere:
>
> \`node .ai/scripts/regenerar-copilot.mjs\`
>
> \`node .ai/scripts/verificar.mjs\` acusa link quebrado **e** divergência de conteúdo entre os dois.

`;

const fonte = await readFile(join(RAIZ, 'AGENTS.md'), 'utf8');
const corpo = fonte.replace(/\]\((\.ai\/|docs\/)/g, '](../$1');

await writeFile(join(RAIZ, '.github/copilot-instructions.md'), AVISO + corpo, 'utf8');

console.log('.github/copilot-instructions.md regenerado a partir do AGENTS.md.');
