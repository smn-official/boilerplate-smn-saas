#!/usr/bin/env node
/**
 * Parametriza o boilerplate: substitui <Produto> e <Modulo> pelos nomes reais.
 *
 * A stack é fixa e opinativa — nada de agente ou skill é removido. Só a
 * identidade do projeto muda.
 *
 * Uso:
 *   node .ai/scripts/init.mjs --produto Contoso --modulo Vendas
 *   node .ai/scripts/init.mjs --produto Contoso --modulo Vendas --dry-run
 */

import { readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * APENAS estes dois marcadores são identidade do projeto.
 *
 * Todos os outros — <Entidade>, <Feature>, <schema>, <tabela>, <Contexto>… —
 * são notação didática permanente das skills: significam "a entidade que você
 * está escrevendo agora". Devem sobreviver intactos. Nunca adicione um deles
 * aqui.
 */
const MARCADORES = ['Produto', 'Modulo'];

const IGNORAR = new Set(['node_modules', '.git', 'bin', 'obj', 'dist', '.vs']);

function parseArgs(argv) {
  const args = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--manter-exemplos') args.manterExemplos = true;
    else if (a === '--produto') args.produto = argv[++i];
    else if (a === '--modulo') args.modulo = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

/** PascalCase válido como identificador .NET e seguro em caminho de arquivo. */
function validarNome(valor, rotulo) {
  if (!valor) return `${rotulo} é obrigatório.`;
  if (!/^[A-Z][A-Za-z0-9]*$/.test(valor)) {
    return `${rotulo} inválido: "${valor}". Use PascalCase sem espaço, hífen, ponto ou acento (ex.: Contoso).`;
  }
  if (valor.length > 40) return `${rotulo} muito longo (${valor.length}); máximo 40.`;
  const reservados = new Set(['System', 'Microsoft', 'Core', 'Data', 'Web', 'Tests', 'Program', 'Startup']);
  if (reservados.has(valor)) return `${rotulo} "${valor}" colide com nome reservado da stack. Escolha outro.`;
  return null;
}

async function* percorrer(dir) {
  for (const entrada of await readdir(dir, { withFileTypes: true })) {
    if (IGNORAR.has(entrada.name)) continue;
    const caminho = join(dir, entrada.name);
    // Symlinks (CLAUDE.md, GEMINI.md, .mcp.json, .claude/*) não são seguidos:
    // reescrever por eles duplicaria a edição e poderia quebrar o link.
    if (entrada.isSymbolicLink()) continue;
    if (entrada.isDirectory()) yield* percorrer(caminho);
    else if (entrada.isFile()) yield caminho;
  }
}

const EXTENSOES = new Set(['.md', '.json', '.cs', '.csproj', '.slnx', '.sql', '.ts', '.cshtml', '.props', '.yml', '.yaml']);

/**
 * Documentação de exemplo, removida no setup: serve ao boilerplate, não ao produto.
 *
 * Vazio desde que `docs/` passou a nascer como árvore de templates a preencher
 * (architecture, domain, development, infrastructure, api, decisions, features).
 * Não há mais pasta de exemplo preenchida para descartar — cada arquivo já é o
 * molde, e apagá-lo tiraria do projeto justamente o que ele deve preencher.
 */
const EXEMPLOS = [];

async function localizarExemplos() {
  return EXEMPLOS.map((p) => join(RAIZ, p)).filter((p) => existsSync(p));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(`
Parametriza o boilerplate com o nome real do projeto.

  --produto <Nome>     Nome do produto em PascalCase (ex.: Contoso)
  --modulo  <Nome>     Nome do módulo inicial em PascalCase (ex.: Vendas)
  --dry-run            Mostra o que mudaria, sem gravar nada
  --manter-exemplos    Preserva a documentação de exemplo (removida por padrão)

Só a identidade do projeto muda. A árvore de docs/ nasce como template a
preencher — architecture, domain, development, infrastructure, api, decisions
e features — e o setup não a descarta.
`);
    return 0;
  }

  const erros = [
    validarNome(args.produto, '--produto'),
    validarNome(args.modulo, '--modulo'),
  ].filter(Boolean);

  if (erros.length) {
    for (const e of erros) console.error(`erro: ${e}`);
    console.error('\nUse --help para ver os parâmetros.');
    return 1;
  }

  if (args.produto === args.modulo) {
    console.error(`erro: --produto e --modulo não podem ser iguais ("${args.produto}"); gerariam ${args.produto}.${args.produto}.Web.`);
    return 1;
  }

  const valores = { Produto: args.produto, Modulo: args.modulo };
  const alvos = MARCADORES.map((m) => ({ de: `<${m}>`, para: valores[m] }));

  const mudancas = [];
  for await (const caminho of percorrer(RAIZ)) {
    const ext = caminho.slice(caminho.lastIndexOf('.'));
    if (!EXTENSOES.has(ext)) continue;

    const original = await readFile(caminho, 'utf8');
    let texto = original;
    let ocorrencias = 0;
    for (const { de, para } of alvos) {
      const partes = texto.split(de);
      ocorrencias += partes.length - 1;
      texto = partes.join(para);
    }
    if (ocorrencias > 0) mudancas.push({ caminho, texto, ocorrencias });
  }

  const exemplos = await localizarExemplos();

  if (!mudancas.length && !exemplos.length) {
    console.log('Nenhum marcador <Produto>/<Modulo> nem arquivo de exemplo — o projeto já foi parametrizado.');
    return 0;
  }

  if (mudancas.length) {
    const total = mudancas.reduce((s, m) => s + m.ocorrencias, 0);
    console.log(`${args.dryRun ? '[dry-run] ' : ''}${total} ocorrências em ${mudancas.length} arquivos:\n`);
    for (const m of [...mudancas].sort((a, b) => b.ocorrencias - a.ocorrencias)) {
      console.log(`  ${String(m.ocorrencias).padStart(3)}x  ${relative(RAIZ, m.caminho)}`);
    }
  }

  if (exemplos.length) {
    console.log(`\n${args.dryRun ? '[dry-run] ' : ''}Documentação de exemplo a remover:\n`);
    for (const caminho of exemplos) console.log(`  ${relative(RAIZ, caminho)}`);
    if (args.manterExemplos) {
      console.log('\n  --manter-exemplos: nada será removido.');
    }
  }

  if (args.dryRun) {
    console.log(`\n<Produto> → ${args.produto}   <Modulo> → ${args.modulo}`);
    console.log('Nada gravado. Remova --dry-run para aplicar.');
    return 0;
  }

  for (const m of mudancas) await writeFile(m.caminho, m.texto, 'utf8');

  if (exemplos.length && !args.manterExemplos) {
    for (const caminho of exemplos) await rm(caminho, { recursive: true, force: true });
  }

  console.log(`\nAplicado: <Produto> → ${args.produto}   <Modulo> → ${args.modulo}`);
  if (exemplos.length && !args.manterExemplos) {
    console.log(`Removidos ${exemplos.length} caminho(s) de documentação de exemplo.`);
  }
  console.log('\nMarcadores didáticos (<Entidade>, <Feature>, <schema>, <tabela>…) permanecem');
  console.log('intactos de propósito: são notação das skills, não identidade do projeto.');
  console.log(`\nPróximo passo — criar a solução:`);
  console.log(`  dotnet new sln -n ${args.produto} --format slnx`);
  console.log(`  dotnet new classlib -o src/${args.produto}.${args.modulo}/Core`);
  console.log(`  dotnet new classlib -o src/${args.produto}.${args.modulo}/Data`);
  console.log(`  dotnet new mvc      -o src/${args.produto}.${args.modulo}.Web`);
  return 0;
}

process.exit(await main());
