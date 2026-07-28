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
 * `docs/context/general-vision.md` NÃO entra aqui: é o arquivo que o projeto deve
 * preencher, não descartar. O setup o mantém com o template dentro.
 */
const EXEMPLOS = ['docs/features/feature-example'];

async function localizarExemplos() {
  return EXEMPLOS.map((p) => join(RAIZ, p)).filter((p) => existsSync(p));
}

/**
 * A pasta de exemplo era a referência de formato que o README manda copiar.
 * Ao removê-la, deixa-se o formato registrado por escrito no lugar dela.
 */
async function escreverFeaturesReadme() {
  const destino = join(RAIZ, 'docs/features/README.md');
  if (existsSync(destino)) return;

  const conteudo = `# Features

Uma pasta por feature, em kebab-case e no idioma do negócio (\`requisicao-material\`, não
\`MaterialRequest\`).

\`\`\`text
docs/features/<nome-da-feature>/
├── <nome-da-feature>.md        o que faz, fluxos, dados, permissões
└── rules/
    └── rule-<feature>-<n>.md   uma regra de negócio por arquivo
\`\`\`

## O documento da feature

Seções esperadas, nesta ordem:

| Seção | Conteúdo |
|---|---|
| O que é | Uma ou duas frases. Se não couber, são duas features |
| Por que existe | O problema concreto; sem isso ninguém sabe o que preservar depois |
| Fluxo principal | Caminho feliz em passos, do ponto de vista de quem usa |
| Fluxos alternativos e falhas | O que mais acontece na prática — a seção mais esquecida |
| Regras de negócio | Tabela apontando para \`rules/\`, uma linha cada |
| Dados | Entidades tocadas e se há dado pessoal |
| Permissões | Quem pode o quê; cada linha deveria virar teste |
| Fora de escopo | O que não entra, e por quê |
| Decisões em aberto | Pergunta, dono da decisão e suposição em uso |

Cabeçalho com **Status** (rascunho · em implementação · entregue) e **Atualizado em**.

## O arquivo de regra

| Seção | Conteúdo |
|---|---|
| Enunciado | A regra em uma frase, no imperativo. Sem "geralmente" |
| Por quê | Origem: exigência legal, decisão comercial, limitação operacional |
| Casos | Tabela que vira teste — inclua o limite **e os dois lados dele** |
| Exceções | Quando não se aplica e quem autoriza. "Não há" também é resposta |
| Impacto | Qual agregado garante a invariante, qual mensagem o usuário vê |

O identificador (\`RN-1\`) é estável e vive **só na documentação** — nunca em mensagem de erro,
constante, teste ou comentário de código.

Regra é garantida no domínio (\`Core\`), não apenas validada na tela: validação de interface é
conveniência, invariante de agregado é garantia.

## Antes de codar

Preencha o documento **antes** da implementação. Escrever o fluxo revela ambiguidade enquanto ela é
barata de resolver. Se ao preencher a resposta for "não sei", essa é a pergunta a levar ao dono do
produto.
`;

  await writeFile(destino, conteudo, 'utf8');
}

/**
 * Após remover a pasta de exemplo, o docs/README.md ficaria com links mortos e
 * instruções para copiar algo que não existe mais. Reescreve esses trechos para
 * apontar ao docs/features/README.md, que passa a ser a referência de formato.
 */
async function removerReferenciasAosExemplos() {
  const destino = join(RAIZ, 'docs/README.md');
  if (!existsSync(destino)) return;

  const substituicoes = [
    [
      '| Feature nova aprovada | Copiar `feature-example/`, renomear, preencher **antes** de codar |',
      '| Feature nova aprovada | Criar a pasta conforme [features/README.md](features/README.md), preencher **antes** de codar |',
    ],
    [
      `cp -R docs/features/feature-example docs/features/requisicao-material
cd docs/features/requisicao-material
mv feature-example.md requisicao-material.md
mv rules/rule-feature-example-1.md rules/rule-requisicao-material-1.md
mv rules/rule-feature-example-2.md rules/rule-requisicao-material-2.md`,
      `mkdir -p docs/features/requisicao-material/rules
cd docs/features/requisicao-material
touch requisicao-material.md rules/rule-requisicao-material-1.md`,
    ],
    ['\nMantenha `feature-example/` intacta: é o molde.\n', '\n'],
    [
      `3. **Ao descobrir uma regra não documentada**, escreva-a — no formato de
   [rule-feature-example-1](features/feature-example/rules/rule-feature-example-1.md), com casos no
   limite dos dois lados.`,
      `3. **Ao descobrir uma regra não documentada**, escreva-a no formato descrito em
   [features/README.md](features/README.md), com casos no limite dos dois lados.`,
    ],
  ];

  let texto = await readFile(destino, 'utf8');
  for (const [de, para] of substituicoes) texto = texto.split(de).join(para);

  // O parágrafo final inteiro cita o exemplo preenchido; sem ele, some.
  const inicioParagrafo = texto.indexOf('O template preenchido em');
  if (inicioParagrafo !== -1) texto = `${texto.slice(0, inicioParagrafo).trimEnd()}\n`;

  await writeFile(destino, texto, 'utf8');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(`
Parametriza o boilerplate com o nome real do projeto.

  --produto <Nome>     Nome do produto em PascalCase (ex.: Contoso)
  --modulo  <Nome>     Nome do módulo inicial em PascalCase (ex.: Vendas)
  --dry-run            Mostra o que mudaria, sem gravar nada
  --manter-exemplos    Preserva docs/features/feature-example (removida por padrão)

Além de substituir <Produto> e <Modulo>, o setup remove a documentação de
exemplo e registra o formato dos templates em docs/features/README.md.
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
    await escreverFeaturesReadme();
    await removerReferenciasAosExemplos();
  }

  console.log(`\nAplicado: <Produto> → ${args.produto}   <Modulo> → ${args.modulo}`);
  if (exemplos.length && !args.manterExemplos) {
    console.log(`Removidos ${exemplos.length} caminho(s) de documentação de exemplo.`);
    console.log('O formato dos templates ficou registrado em docs/features/README.md.');
  }
  console.log('\nMarcadores didáticos (<Entidade>, <Feature>, <schema>, <tabela>…) permanecem');
  console.log('intactos de propósito: são notação das skills, não identidade do projeto.');
  console.log('\nPróximo passo — definir a paleta (os tokens de cor ainda são #<hex>):');
  console.log('  node .ai/scripts/paleta.mjs --marca "#2563EB"   # se já houver cor de marca');
  console.log('  node .ai/scripts/paleta.mjs --sem-api           # para escolher entre as prontas');
  console.log('\n  Sem cor definida? --sem-api lista as paletas prontas: azul, verde,');
  console.log('  violeta e grafite, todas já com contraste validado.');

  console.log(`\nE criar a solução:`);
  console.log(`  dotnet new sln -n ${args.produto} --format slnx`);
  console.log(`  dotnet new classlib -o src/${args.produto}.${args.modulo}/Core`);
  console.log(`  dotnet new classlib -o src/${args.produto}.${args.modulo}/Data`);
  console.log(`  dotnet new mvc      -o src/${args.produto}.${args.modulo}.Web`);
  return 0;
}

process.exit(await main());
