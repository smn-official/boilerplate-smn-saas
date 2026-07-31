/**
 * Converte o CSS do HeroUI de seletor de classe para seletor de elemento/atributo,
 * para uso global no Razor: `<button>` puro em vez de `<button class="button--primary">`.
 *
 * Três regras, aplicadas na ordem:
 *   .comp__parte    -> [data-slot="comp-parte"]   (ou elemento nativo, quando houver)
 *   .comp--variante -> <alvo>[data-variant="…"]   (ou [data-size] quando for tamanho)
 *   .comp           -> <elemento>, [data-slot="comp"]
 *
 * A ordem importa: `__parte` antes de `--variante` antes da raiz, senão o prefixo
 * mais curto consome o mais longo.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const ACERVO = '/Users/vagnerking/Documents/Projetinhos/Boilerplate-Smn-SaaS/.ai/referencias/componentes-heroui';
const SAIDA = process.argv[2] ?? 'convertido-todos';

/** componente -> elemento HTML que recebe o estilo base. */
const ELEMENTO = {
  button: 'button',
  input: 'input:not([type="checkbox"]):not([type="radio"])',
  textarea: 'textarea',
  label: 'label',
  link: 'a',
  kbd: 'kbd',
  table: 'table',
  separator: 'hr',
  fieldset: 'fieldset',
  card: 'article',
  header: 'header',
  meter: 'meter',
  'progress-bar': 'progress',
  toolbar: 'menu',
  'disclosure-group': 'details',
};

/** Partes BEM que têm elemento nativo — evita exigir data-slot onde o HTML já diz. */
const PARTES_NATIVAS = {
  'table__column': 'th',
  'table__cell': 'td',
  'table__row': 'tr',
  'table__header': 'thead',
  'table__body': 'tbody',
  'table__footer': 'tfoot',
  'fieldset__legend': 'legend',
  'card__title': 'h3',
};

/** Tamanhos, para virar data-size em vez de data-variant. */
const TAMANHO = /^(xs|sm|md|lg|xl)$/;

/** A raiz do arquivo nem sempre é o nome do componente. */
const RAIZ = { table: 'table-root' };

/**
 * Classes irmãs com hífen simples (não são `--variante` nem `__parte`).
 * `.badge-anchor` é o wrapper que posiciona o badge; `.typography-prose`
 * estiliza `h1`/`p` filhos. Viram slot próprio.
 */
const IRMAS = {
  'badge-anchor': '[data-slot="badge-anchor"]',
  'typography-prose': '[data-slot="prose"]',
};

const TRIVIAIS = [
  // elemento (15 com raiz própria)
  'button', 'input', 'textarea', 'label', 'link', 'kbd', 'table', 'separator',
  'fieldset', 'card', 'header', 'meter', 'progress-bar', 'toolbar', 'disclosure-group',
  // atributo (22)
  'alert', 'avatar', 'badge', 'chip', 'skeleton', 'spinner', 'breadcrumbs', 'button-group',
  'close-button', 'empty-state', 'description', 'error-message', 'progress-circle',
  'surface', 'tag', 'toggle-button', 'toggle-button-group', 'checkbox-group', 'switch-group',
  'color-swatch', 'typography', 'field-error',
];

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function converter(css, comp) {
  const raiz = RAIZ[comp] ?? comp;
  const el = ELEMENTO[comp];
  const alvo = el ? el.split(':')[0] : `[data-slot="${comp}"]`;

  // 0. classes irmãs de hífen simples, antes que a regra da raiz as consuma
  for (const [classe, seletor] of Object.entries(IRMAS)) {
    if (classe.startsWith(raiz)) {
      css = css.replace(new RegExp(`\\.${escapar(classe)}\\b`, 'g'), seletor);
    }
  }

  // 1. .comp__parte -> elemento nativo ou [data-slot="comp-parte"]
  //    O prefixo BEM nem sempre é a raiz: `table.css` tem raiz `.table-root`
  //    mas partes `.table__column`. Converte pelos dois prefixos.
  for (const prefixo of new Set([raiz, comp])) {
    css = css.replace(new RegExp(`\\.${escapar(prefixo)}__([a-z][a-z0-9_-]*)`, 'g'), (_, parte) => {
      const chave = `${prefixo}__${parte}`;
      return PARTES_NATIVAS[chave] ?? `[data-slot="${comp}-${parte.replace(/_/g, '-')}"]`;
    });
  }

  // 2. .comp--variante -> alvo[data-variant] | alvo[data-size]
  css = css.replace(new RegExp(`\\.${escapar(raiz)}--([a-z][a-z0-9-]*)`, 'g'), (_, v) =>
    TAMANHO.test(v) ? `${alvo}[data-size="${v}"]` : `${alvo}[data-variant="${v}"]`);

  // 3. .comp (raiz) -> elemento, [data-slot="comp"]
  const seletorRaiz = el ? `${el}, [data-slot="${comp}"]` : `[data-slot="${comp}"]`;
  css = css.replace(new RegExp(`\\.${escapar(raiz)}\\b(?!-)`, 'g'), seletorRaiz);

  return `/* ${comp} — convertido para seletor global. Fonte: .ai/referencias/componentes-heroui/${comp}/ */\n${css}`;
}

/**
 * Referência cruzada: `button-group.css` e `link.css` estilizam `.button`,
 * que é de outro arquivo. Sem esta passada a classe sobreviveria e o seletor
 * nunca casaria, porque ninguém escreve `class="button"` na view.
 */
function converterCruzadas(css, comp) {
  // Nome mais longo primeiro: `.button-group` antes de `.button`, senão o
  // prefixo curto casa dentro do longo e corrompe o seletor.
  const alvos = Object.entries(ELEMENTO)
    .filter(([outro]) => outro !== comp)
    .sort(([a], [b]) => b.length - a.length);
  for (const [outro, el] of alvos) {
    const alvo = el.split(':')[0];
    // variante de outro componente: `.button--outline` -> `button[data-variant="outline"]`
    css = css.replace(new RegExp(`\\.${escapar(outro)}--([a-z][a-z0-9-]*)`, 'g'), (_, v) =>
      TAMANHO.test(v) ? `${alvo}[data-size="${v}"]` : `${alvo}[data-variant="${v}"]`);
    // raiz de outro componente
    css = css.replace(new RegExp(`\\.${escapar(outro)}\\b(?![-_])`, 'g'), alvo);
  }
  return css;
}

await mkdir(SAIDA, { recursive: true });
let ok = 0;
const relatorio = [];
for (const comp of TRIVIAIS) {
  const origem = join(ACERVO, comp, `${comp}.css`);
  const css = await readFile(origem, 'utf8').catch(() => null);
  if (!css) { console.error('faltando:', comp); continue; }
  const saida = converterCruzadas(converter(css, comp), comp);
  // sobrou alguma classe do componente sem converter? checa raiz E nome do componente
  const restantes = [...new Set([
    ...(saida.match(new RegExp(`\\.${escapar(RAIZ[comp] ?? comp)}[a-z0-9_-]*`, 'g')) || []),
    ...(saida.match(new RegExp(`\\.${escapar(comp)}[a-z0-9_-]*`, 'g')) || []),
  ])];
  relatorio.push({ comp, elemento: ELEMENTO[comp] ?? `[data-slot="${comp}"]`, restantes });
  await writeFile(join(SAIDA, `${comp}.css`), saida);
  ok++;
}
console.log(`convertidos=${ok}`);
const sujos = relatorio.filter((r) => r.restantes.length);
console.log('com classe remanescente:', sujos.length ? sujos.map((s) => `${s.comp}[${s.restantes.join(' ')}]`).join(', ') : 'nenhum');
await writeFile(join(SAIDA, '_relatorio.json'), JSON.stringify(relatorio, null, 2));
