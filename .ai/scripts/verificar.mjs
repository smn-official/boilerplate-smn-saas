#!/usr/bin/env node
/**
 * Verifica a integridade da documentação do boilerplate.
 *
 * Existe porque 95 arquivos de norma afirmam coisas sobre o repositório —
 * quantos agentes existem, quais skills, quem é dono do quê — e nada garantia
 * que essas afirmações continuassem verdadeiras. Contagem defasada e link morto
 * não quebram nada visivelmente: fazem o agente orientar contra o padrão
 * vigente, que é o pior defeito possível numa documentação normativa.
 *
 * Uso:
 *   node .ai/scripts/verificar.mjs
 *   node .ai/scripts/verificar.mjs --silencioso   # só a saída final
 *
 * Sai com 1 quando encontra problema — serve como portão de esteira.
 */

import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, relative, resolve, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const IGNORAR = new Set(['node_modules', '.git', '.codegraph', 'bin', 'obj', 'dist', '.vs', '.claude']);

const problemas = [];
const erro = (arquivo, mensagem) => problemas.push({ arquivo, mensagem });

async function* percorrer(dir) {
  for (const entrada of await readdir(dir, { withFileTypes: true })) {
    if (IGNORAR.has(entrada.name)) continue;
    const caminho = join(dir, entrada.name);
    if (entrada.isSymbolicLink()) continue;
    if (entrada.isDirectory()) yield* percorrer(caminho);
    else if (entrada.isFile()) yield caminho;
  }
}

function lerFrontmatter(texto) {
  const m = texto.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const campos = {};
  for (const linha of m[1].split('\n')) {
    const sep = linha.indexOf(':');
    if (sep > 0) campos[linha.slice(0, sep).trim()] = linha.slice(sep + 1).trim();
  }
  return campos;
}

// ---------------------------------------------------------------- inventário

async function inventariar() {
  const agentes = (await readdir(join(RAIZ, '.ai/agents')))
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));

  const skills = [];
  for (const nome of await readdir(join(RAIZ, '.ai/skills'), { withFileTypes: true })) {
    if (!nome.isDirectory()) continue;
    const caminho = join(RAIZ, '.ai/skills', nome.name, 'SKILL.md');
    if (!existsSync(caminho)) {
      erro(`.ai/skills/${nome.name}`, 'diretório de skill sem SKILL.md');
      continue;
    }
    skills.push({ nome: nome.name, caminho, campos: lerFrontmatter(await readFile(caminho, 'utf8')) });
  }
  return { agentes, skills };
}

// ---------------------------------------------------------------- verificações

/** Frontmatter obrigatório, nome coerente com o diretório e dono existente. */
function verificarSkills({ agentes, skills }) {
  for (const skill of skills) {
    const rel = `.ai/skills/${skill.nome}/SKILL.md`;
    if (!skill.campos) {
      erro(rel, 'sem frontmatter');
      continue;
    }
    for (const campo of ['name', 'description', 'agent']) {
      if (!skill.campos[campo]) erro(rel, `frontmatter sem \`${campo}\``);
    }
    if (skill.campos.name && skill.campos.name !== skill.nome) {
      erro(rel, `\`name: ${skill.campos.name}\` diverge do diretório \`${skill.nome}\``);
    }
    if (skill.campos.agent && !agentes.includes(skill.campos.agent)) {
      erro(rel, `\`agent: ${skill.campos.agent}\` não existe em .ai/agents/`);
    }
  }
}

/** Todo agente precisa de frontmatter completo e nome igual ao arquivo. */
async function verificarAgentes({ agentes }) {
  for (const agente of agentes) {
    const rel = `.ai/agents/${agente}.md`;
    const campos = lerFrontmatter(await readFile(join(RAIZ, rel), 'utf8'));
    if (!campos) {
      erro(rel, 'sem frontmatter');
      continue;
    }
    for (const campo of ['name', 'description', 'model']) {
      if (!campos[campo]) erro(rel, `frontmatter sem \`${campo}\``);
    }
    if (campos.name && campos.name !== agente) {
      erro(rel, `\`name: ${campos.name}\` diverge do arquivo \`${agente}.md\``);
    }
  }
}

/**
 * As contagens afirmadas em prosa contra a realidade do disco.
 *
 * É a verificação que mais pega defeito: "50 skills" envelhece a cada skill
 * nova, em seis arquivos diferentes, e ninguém percebe até ler com atenção.
 */
async function verificarContagens({ agentes, skills }) {
  const porExtenso = {
    2: 'dois', 3: 'três', 4: 'quatro', 5: 'cinco', 6: 'seis', 7: 'sete',
    8: 'oito', 9: 'nove', 10: 'dez', 11: 'onze', 12: 'doze',
  };
  const agentesEsperado = agentes.length;
  const skillsEsperado = skills.length;

  for await (const caminho of percorrer(RAIZ)) {
    if (!caminho.endsWith('.md')) continue;
    const rel = relative(RAIZ, caminho);
    const texto = await readFile(caminho, 'utf8');

    for (const m of texto.matchAll(/(\d+) skills/gi)) {
      const valor = Number(m[1]);
      // Contagem por agente (ex.: "net10-agent — 9 skills") é validada adiante.
      if (valor !== skillsEsperado && valor > 12) {
        erro(rel, `diz "${m[0]}" — o disco tem ${skillsEsperado}`);
      }
    }
    // Só conta como afirmação sobre o inventário quando qualifica o conjunto
    // inteiro. "Três agentes recusam pedidos" e "nunca dois agentes editando o
    // mesmo arquivo" falam de subconjunto — acusá-las treinaria quem lê a
    // ignorar a saída, que é como um verificador morre.
    const inventarioDeAgentes = /(\d+|dois|três|quatro|cinco|seis|sete|oito|nove|dez|onze|doze)\s+agentes\s+(especializados|no total|em \[?\.?\.?\/?\.ai)/gi;
    const extenso = porExtenso[agentesEsperado];
    for (const m of texto.matchAll(inventarioDeAgentes)) {
      const valor = m[1].toLowerCase();
      const bate = valor === String(agentesEsperado) || valor === extenso;
      if (!bate) erro(rel, `diz "${m[0].trim()}" — o disco tem ${agentesEsperado} (${extenso})`);
    }
  }
}

/** Cada skill precisa estar registrada em skills.md, e vice-versa. */
async function verificarRegistro({ skills }) {
  const rel = '.ai/docs/skills.md';
  const texto = await readFile(join(RAIZ, rel), 'utf8');

  const registradas = new Set(
    [...texto.matchAll(/\.\.\/skills\/([a-z0-9-]+)\/SKILL\.md/g)].map((m) => m[1]),
  );

  for (const skill of skills) {
    if (!registradas.has(skill.nome)) erro(rel, `skill \`${skill.nome}\` existe no disco mas não está registrada`);
  }
  for (const nome of registradas) {
    if (!skills.some((s) => s.nome === nome)) erro(rel, `registra \`${nome}\`, que não existe em .ai/skills/`);
  }

  // O subtotal de cada seção precisa bater com o frontmatter das skills.
  for (const m of texto.matchAll(/^## ([a-z0-9-]+) — (\d+) skills?$/gm)) {
    const [, agente, declarado] = m;
    const real = skills.filter((s) => s.campos?.agent === agente).length;
    if (Number(declarado) !== real) {
      erro(rel, `seção de \`${agente}\` diz ${declarado} skills; o frontmatter aponta ${real}`);
    }
  }
}

/** Link markdown relativo que não resolve é instrução para um arquivo inexistente. */
async function verificarLinks() {
  for await (const caminho of percorrer(RAIZ)) {
    if (!caminho.endsWith('.md')) continue;
    const rel = relative(RAIZ, caminho);
    const texto = await readFile(caminho, 'utf8');

    for (const m of texto.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const alvo = m[1].split('#')[0].trim();
      if (!alvo || /^(https?:|mailto:)/.test(alvo)) continue;
      if (!existsSync(normalize(join(dirname(caminho), alvo)))) {
        erro(rel, `link quebrado: \`${alvo}\``);
      }
    }

    // Referência em crase a skill/agente escapa do checador de link markdown —
    // foi assim que `design-intencional` sobreviveu a uma limpeza inteira.
    for (const m of texto.matchAll(/`\.ai\/(skills|agents)\/([a-z0-9-]+)`/g)) {
      const [, tipo, nome] = m;
      const existe = tipo === 'skills'
        ? existsSync(join(RAIZ, '.ai/skills', nome))
        : existsSync(join(RAIZ, '.ai/agents', `${nome}.md`));
      if (!existe) erro(rel, `cita \`.ai/${tipo}/${nome}\`, que não existe`);
    }
  }
}

// ---------------------------------------------------------------- saída

async function main() {
  const silencioso = process.argv.includes('--silencioso');
  const inventario = await inventariar();

  verificarSkills(inventario);
  await verificarAgentes(inventario);
  await verificarContagens(inventario);
  await verificarRegistro(inventario);
  await verificarLinks();

  if (!silencioso) {
    console.log(`\nInventário: ${inventario.agentes.length} agentes, ${inventario.skills.length} skills.`);
  }

  if (!problemas.length) {
    console.log('\nDocumentação íntegra: contagens, links, frontmatter e registro conferem.\n');
    return 0;
  }

  const porArquivo = new Map();
  for (const p of problemas) {
    if (!porArquivo.has(p.arquivo)) porArquivo.set(p.arquivo, []);
    porArquivo.get(p.arquivo).push(p.mensagem);
  }

  console.error(`\n${problemas.length} problema(s) em ${porArquivo.size} arquivo(s):\n`);
  for (const [arquivo, mensagens] of [...porArquivo].sort()) {
    console.error(`  ${arquivo}`);
    for (const m of mensagens) console.error(`      ${m}`);
  }
  console.error('');
  return 1;
}

process.exit(await main());
