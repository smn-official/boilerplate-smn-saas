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

    // Subtotal por agente (`## net10-agent — 15 skills`) é afirmação sobre um
    // subconjunto e tem verificação própria em `verificarRegistro`. Antes isto era
    // um teto numérico (`valor > 12`), que quebrou no dia em que um agente passou
    // de doze skills: o subtotal legítimo virou erro. O recorte certo é sintático,
    // não numérico — acusar subtotal treina quem lê a ignorar a saída.
    const semSubtotais = texto
      .replace(/^##\s+[a-z0-9-]+\s+—\s+\d+\s+skills?\s*$/gim, '')
      .replace(/[a-z0-9-]+-agent[^.\n]{0,40}?\d+ skills?/gi, '')
      .replace(/suas \d+ skills?/gi, '');

    for (const m of semSubtotais.matchAll(/(\d+) skills/gi)) {
      const valor = Number(m[1]);
      if (valor !== skillsEsperado) {
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

/**
 * Tipo do projeto usado em exemplo de código e definido em nenhum lugar.
 *
 * É o defeito mais caro que esta documentação já produziu: `DomainException`
 * chegou a ser lançada em 11 pontos, com um segundo nome em outros 9, enquanto a
 * skill de teste esperava `ArgumentException` — o exemplo de uma skill não
 * compilava contra o da outra, e nenhuma das duas declarava a classe. Um tipo que
 * ninguém define é um convite para o agente inventar a assinatura.
 *
 * Só olha tipos de aparência própria (PascalCase, sem `.` nem `<` no nome, fora da
 * allowlist do BCL). Falso positivo aqui custa uma linha na allowlist; falso
 * negativo custa uma classe inventada em cada projeto derivado.
 */
const TIPOS_EXTERNOS = new Set([
  'Exception', 'ArgumentException', 'ArgumentNullException', 'InvalidOperationException',
  'NotImplementedException', 'NotSupportedException', 'UnauthorizedAccessException',
  'OperationCanceledException', 'TaskCanceledException', 'TimeoutException', 'FormatException',
  'HttpRequestException', 'JsonException', 'DbUpdateException', 'DbUpdateConcurrencyException',
  'PostgresException', 'NpgsqlException', 'NpgsqlConnection', 'NpgsqlCommand', 'NpgsqlParameter',
  'DbContext', 'DbContextOptions', 'DbSet', 'ModelBuilder', 'EntityTypeBuilder', 'MigrationBuilder',
  'List', 'Dictionary', 'HashSet', 'KeyValuePair', 'IEnumerable', 'IReadOnlyList', 'IReadOnlyCollection',
  'ValidationResult', 'ValidationContext', 'ValidationAttribute',
  'IQueryable', 'Task', 'ValueTask', 'CancellationToken', 'CancellationTokenSource',
  'Expression', 'Func', 'Action', 'Guid', 'DateTime', 'DateTimeOffset', 'TimeSpan', 'Uri',
  'String', 'Int32', 'Decimal', 'Boolean', 'Object', 'Type', 'Array', 'Math', 'Convert',
  'StringBuilder', 'StringComparison', 'StringComparer', 'CultureInfo', 'Encoding',
  'MemoryStream', 'FileStream', 'Stream', 'StreamReader', 'StreamWriter', 'Path', 'File',
  'Random', 'RandomNumberGenerator', 'SHA256', 'HMACSHA256', 'Rfc2898DeriveBytes',
  'CryptographicOperations', 'PeriodicTimer', 'Stopwatch', 'Activity', 'ActivitySource',
  'IServiceCollection', 'IServiceProvider', 'IServiceScopeFactory', 'IConfiguration',
  'IHostedService', 'BackgroundService', 'IHostApplicationLifetime', 'WebApplication',
  'WebApplicationBuilder', 'IWebHostEnvironment', 'IHostEnvironment',
  'ILogger', 'ILoggerFactory', 'LogLevel', 'EventId',
  'IActionResult', 'ActionResult', 'ControllerBase', 'Controller', 'ViewResult',
  'IFormFile', 'ModelStateDictionary', 'ProblemDetails', 'RouteValueDictionary',
  'IExceptionHandler', 'IMiddleware', 'HttpContext', 'HttpRequest', 'HttpResponse',
  'HttpClient', 'IHttpClientFactory', 'StatusCodes', 'ClaimsPrincipal', 'ClaimsIdentity', 'Claim',
  'AuthenticationProperties', 'CookieOptions', 'IMemoryCache', 'IDistributedCache', 'HybridCache',
  'IOptions', 'IOptionsMonitor', 'IValidateOptions', 'ValidateOptionsResult',
  'IViewLocationExpander', 'ViewLocationExpanderContext', 'RazorViewEngineOptions',
  'IEntityTypeConfiguration', 'ISpecification', 'Specification', 'AggregateRoot',
  'SmtpClient', 'MailMessage', 'MailAddress', 'DbConnection', 'DbTransaction',
  'IsolationLevel', 'InterceptionResult', 'DbConnectionInterceptor', 'ConnectionEventData',
  'Mock', 'Fact', 'Theory', 'InlineData', 'Trait', 'IAsyncLifetime', 'IClassFixture',
  'HtmlDocument', 'HtmlNode', 'ITestOutputHelper', 'TimeProvider',
  // Bibliotecas de terceiro: Stripe.net, Azure.Identity, Newtonsoft.
  'SessionService', 'SessionCreateOptions', 'SessionLineItemOptions', 'SessionLineItemPriceDataOptions',
  'SubscriptionService', 'SubscriptionCreateOptions', 'SubscriptionUpdateOptions',
  'SubscriptionItemOptions', 'CustomerService', 'CustomerCreateOptions', 'PriceService',
  'ProductService', 'RequestOptions', 'StripeException', 'EventUtility', 'StripeConfiguration',
  'BillingPortalSessionService', 'BillingPortalSessionCreateOptions',
  'DefaultAzureCredential', 'SecretClient', 'JsonSerializerSettings', 'JsonSerializerOptions',
]);

async function verificarTiposDefinidos() {
  const definidos = new Set();
  const usados = new Map();

  for await (const caminho of percorrer(RAIZ)) {
    if (!caminho.endsWith('.md')) continue;
    const rel = relative(RAIZ, caminho);
    const texto = await readFile(caminho, 'utf8');

    for (const bloco of texto.matchAll(/```csharp\n([\s\S]*?)```/g)) {
      const codigo = bloco[1];

      for (const d of codigo.matchAll(
        /\b(?:sealed\s+|abstract\s+|static\s+|partial\s+|public\s+|internal\s+)*(?:class|record|interface|struct|enum)\s+([A-Z][A-Za-z0-9_]*)/g,
      )) {
        definidos.add(d[1]);
      }

      for (const u of codigo.matchAll(/\bnew\s+([A-Z][A-Za-z0-9_]*)\s*[(<{]/g)) {
        if (!usados.has(u[1])) usados.set(u[1], rel);
      }
      for (const u of codigo.matchAll(/\bthrow\s+new\s+([A-Z][A-Za-z0-9_]*)/g)) {
        if (!usados.has(u[1])) usados.set(u[1], rel);
      }
    }
  }

  for (const [tipo, rel] of usados) {
    if (definidos.has(tipo) || TIPOS_EXTERNOS.has(tipo)) continue;
    // Artefatos cujo nome já é o contrato: um `<Entidade>ViewModel` ou `<Entidade>Dto` de
    // exemplo é notação, não promessa de definição. Exceção de domínio não entra aqui —
    // ela É o contrato que precisa estar declarado em algum lugar.
    if (/^(I[A-Z]|.*(Dto|ViewModel|Request|Response|Options|Spec|Builder|Attribute)$)/.test(tipo)) continue;
    erro(rel, `usa \`new ${tipo}(…)\` em exemplo, e nenhum \`.md\` define \`${tipo}\``);
  }
}

/**
 * Contrato fundacional declarado em mais de um lugar.
 *
 * `Specification<T>` chegou a ter duas declarações parciais e mutuamente
 * exclusivas — uma com `Includes`/`OrderBy`, outra com `Pular`/`Levar` — e
 * `AggregateRoot<TId>` tinha uma versão sem igualdade convivendo com a completa.
 * O efeito é o pior tipo de defeito de documentação normativa: duas skills
 * corretas isoladamente produzindo código que não compila junto, sem que nenhuma
 * das duas pareça errada. Estes tipos têm um dono e uma definição; as demais
 * referenciam.
 */
const CONTRATOS_UNICOS = [
  'AggregateRoot', 'Specification', 'ISpecification', 'DomainException', 'AcessoNegadoException',
];

async function verificarContratosUnicos() {
  const declaracoes = new Map(CONTRATOS_UNICOS.map((t) => [t, []]));

  for await (const caminho of percorrer(RAIZ)) {
    if (!caminho.endsWith('.md')) continue;
    const rel = relative(RAIZ, caminho);
    const texto = await readFile(caminho, 'utf8');

    for (const bloco of texto.matchAll(/```csharp\n([\s\S]*?)```/g)) {
      for (const d of bloco[1].matchAll(
        /\b(?:sealed\s+|abstract\s+|static\s+|partial\s+|public\s+|internal\s+)*(?:class|record|interface)\s+([A-Z][A-Za-z0-9_]*)/g,
      )) {
        if (declaracoes.has(d[1])) declaracoes.get(d[1]).push(rel);
      }
    }
  }

  for (const [tipo, locais] of declaracoes) {
    const unicos = [...new Set(locais)];
    if (unicos.length > 1) {
      erro(unicos[1], `\`${tipo}\` é declarado aqui e em \`${unicos[0]}\` — contrato fundacional tem uma definição só; as outras referenciam`);
    }
  }
}

/**
 * Marcador de identidade em arquivo que o `init.mjs` não reescreve.
 *
 * O setup só toca as extensões da lista `EXTENSOES` do `init.mjs`. Um `<Produto>`
 * num `.sh`, `.ps1`, `.txt` ou `.editorconfig` sobrevive à parametrização e o
 * agente passa a usar um caminho que não existe — falha silenciosa, porque o
 * arquivo continua legível e plausível.
 */
const EXTENSOES_DO_SETUP = new Set([
  '.md', '.json', '.cs', '.csproj', '.slnx', '.sql', '.ts', '.cshtml', '.props', '.yml', '.yaml',
]);

async function verificarMarcadores() {
  for await (const caminho of percorrer(RAIZ)) {
    const rel = relative(RAIZ, caminho);
    if (rel === '.ai/scripts/init.mjs' || rel === '.ai/scripts/verificar.mjs') continue;

    const ext = caminho.slice(caminho.lastIndexOf('.'));
    if (EXTENSOES_DO_SETUP.has(ext)) continue;

    const texto = await readFile(caminho, 'utf8').catch(() => '');
    if (/<(Produto|Modulo)>/.test(texto)) {
      erro(rel, `contém \`<Produto>\`/\`<Modulo>\` mas a extensão \`${ext}\` está fora do init.mjs — o marcador sobreviveria ao setup`);
    }
  }
}

/**
 * A tabela que roteia tarefa → agente, contra o disco.
 *
 * É a tabela que decide quem atende. Ela existe duplicada no `AGENTS.md` e no
 * `README.md`; apagar uma linha de uma delas não quebra nada visivelmente e o
 * roteamento passa a ignorar um agente inteiro.
 */
async function verificarRoteamento({ agentes }) {
  for (const rel of ['AGENTS.md', 'README.md']) {
    const texto = await readFile(join(RAIZ, rel), 'utf8');
    const citados = new Set([...texto.matchAll(/`([a-z0-9-]+-agent)`/g)].map((m) => m[1]));

    for (const agente of agentes) {
      if (!citados.has(agente)) erro(rel, `não cita \`${agente}\` na tabela de roteamento`);
    }
    for (const nome of citados) {
      if (!agentes.includes(nome)) erro(rel, `cita \`${nome}\`, que não existe em .ai/agents/`);
    }
  }
}

/** A tabela `## Skills` de cada agente contra o `agent:` do frontmatter, nos dois sentidos. */
async function verificarTabelaDeSkills({ agentes, skills }) {
  for (const agente of agentes) {
    const rel = `.ai/agents/${agente}.md`;
    const texto = await readFile(join(RAIZ, rel), 'utf8');
    const listadas = new Set([...texto.matchAll(/`([a-z0-9-]+)`/g)].map((m) => m[1]));
    const proprias = skills.filter((s) => s.campos?.agent === agente).map((s) => s.nome);

    for (const nome of proprias) {
      if (!listadas.has(nome)) {
        erro(rel, `é dono de \`${nome}\` no frontmatter, mas não a lista na tabela de Skills`);
      }
    }
  }
}

/** Âncora `#secao` que não corresponde a nenhum cabeçalho do arquivo alvo. */
function slugificar(titulo) {
  return titulo
    .trim()
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-');
}

async function verificarAncoras() {
  const cabecalhos = new Map();

  const slugsDe = async (caminho) => {
    if (cabecalhos.has(caminho)) return cabecalhos.get(caminho);
    const texto = await readFile(caminho, 'utf8').catch(() => '');
    const slugs = new Set(
      texto.split('\n').filter((l) => l.startsWith('#')).map((l) => slugificar(l.replace(/^#+/, ''))),
    );
    cabecalhos.set(caminho, slugs);
    return slugs;
  };

  for await (const caminho of percorrer(RAIZ)) {
    if (!caminho.endsWith('.md')) continue;
    const rel = relative(RAIZ, caminho);
    const texto = await readFile(caminho, 'utf8');

    for (const m of texto.matchAll(/\[[^\]]*\]\(([^)]*#[^)]+)\)/g)) {
      const [alvo, ancora] = [m[1].split('#')[0].trim(), m[1].split('#').slice(1).join('#').trim()];
      if (/^(https?:|mailto:)/.test(m[1])) continue;

      const destino = alvo ? normalize(join(dirname(caminho), alvo)) : caminho;
      if (!existsSync(destino)) continue;

      const slugs = await slugsDe(destino);
      if (!slugs.has(ancora)) {
        erro(rel, `âncora \`#${ancora}\` não existe em \`${alvo || relative(RAIZ, caminho)}\``);
      }
    }
  }
}

/**
 * A cópia do `AGENTS.md` em `.github/` contra a fonte.
 *
 * `CLAUDE.md` e `GEMINI.md` são symlinks e não podem divergir. O
 * `copilot-instructions.md` não pode ser symlink: os links relativos da raiz
 * (`.ai/…`) morreriam ao ser lidos de dentro de `.github/`, e nenhuma forma de
 * caminho resolve dos dois lugares num sistema de arquivos — a cópia com `../`
 * é a única saída. O custo é divergir em silêncio, que esta função remove:
 * compara as duas normalizando o prefixo dos caminhos.
 */
async function verificarCopiaDoCopilot() {
  const rel = '.github/copilot-instructions.md';
  const caminho = join(RAIZ, rel);
  if (!existsSync(caminho)) return;

  const normalizar = (texto) =>
    texto
      .replace(/^>.*$/gm, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\]\((?:\.\.\/)?(\.ai\/|docs\/)/g, ']($1')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

  const fonte = normalizar(await readFile(join(RAIZ, 'AGENTS.md'), 'utf8'));
  const copia = normalizar(await readFile(caminho, 'utf8'));

  // Comparação por multiconjunto: uma linha pode repetir legitimamente (o título
  // aparece no aviso de arquivo gerado e no corpo), e comparar por presença
  // acusaria uma diferença que não existe.
  const contar = (linhas) => {
    const mapa = new Map();
    for (const l of linhas) mapa.set(l, (mapa.get(l) ?? 0) + 1);
    return mapa;
  };
  const naFonte = contar(fonte);
  const naCopia = contar(copia);

  const soNaFonte = [...naFonte].filter(([l, n]) => n > (naCopia.get(l) ?? 0)).map(([l]) => l);
  const soNaCopia = [...naCopia].filter(([l, n]) => n > (naFonte.get(l) ?? 0)).map(([l]) => l);

  for (const linha of soNaFonte.slice(0, 5)) {
    erro(rel, `divergiu do AGENTS.md — falta: "${linha.slice(0, 80)}"`);
  }
  for (const linha of soNaCopia.slice(0, 5)) {
    erro(rel, `divergiu do AGENTS.md — sobra: "${linha.slice(0, 80)}"`);
  }
}

/** Contagem de servidores MCP afirmada em prosa contra o `servers.json`. */
async function verificarServidoresMcp() {
  const config = JSON.parse(await readFile(join(RAIZ, '.ai/mcp/servers.json'), 'utf8'));
  const total = Object.keys(config.mcpServers ?? {}).length;
  const porExtenso = { 2: 'dois', 3: 'três', 4: 'quatro', 5: 'cinco', 6: 'seis' };
  const extenso = porExtenso[total];

  for await (const caminho of percorrer(RAIZ)) {
    if (!caminho.endsWith('.md')) continue;
    const rel = relative(RAIZ, caminho);
    const texto = await readFile(caminho, 'utf8');

    const padrao = /(\d+|dois|três|quatro|cinco|seis)\s+servidores\s+(MCP|em \[)/gi;
    for (const m of texto.matchAll(padrao)) {
      const valor = m[1].toLowerCase();
      if (valor !== String(total) && valor !== extenso) {
        erro(rel, `diz "${m[0].trim()}" — o servers.json declara ${total} (${extenso})`);
      }
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
  await verificarTiposDefinidos();
  await verificarContratosUnicos();
  await verificarMarcadores();
  await verificarRoteamento(inventario);
  await verificarTabelaDeSkills(inventario);
  await verificarAncoras();
  await verificarCopiaDoCopilot();
  await verificarServidoresMcp();

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
