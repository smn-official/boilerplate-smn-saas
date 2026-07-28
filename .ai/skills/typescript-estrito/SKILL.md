---
name: typescript-estrito
description: TypeScript moderno em modo estrito — escolher e fixar a versão, configurar tsconfig com strict/noUnusedLocals/noUnusedParameters, tipar DOM sem any e organizar módulos de feature. Use ao criar ou alterar .ts, tsconfig.json, atualizar a versão do compilador ou revisar tipagem.
agent: frontend-agent
---

# TypeScript Estrito

## Versão

Use a **versão estável mais recente do TypeScript** e mantenha-a atualizada — cada release traz
inferência melhor e regras de checagem que capturam erro antes do runtime. **Fixe a versão exata**
(sem `^`) para que o build seja reprodutível, e atualize deliberadamente.

Sobre numeração, sem chute: a linha estável do TypeScript é a **série 5.x**, e é dela que você deve
tirar a versão a fixar. A **7.x é a reescrita nativa do compilador em Go** anunciada pela Microsoft,
cujo objetivo declarado é um ganho grande de velocidade de compilação e de responsividade do
editor. Quando ela estiver estável e o projeto adotá-la, **o `tsconfig.json` e as flags desta skill
permanecem os mesmos** — muda o desempenho do `tsc`, não o contrato de tipos.

Regra prática: consulte a versão publicada no registro antes de fixar; **não invente número de
versão, flag ou API** que você não verificou.

```json
{
  "devDependencies": {
    "typescript": "<versao-estavel-mais-recente>"
  }
}
```

## `tsconfig.json`

Modo estrito é obrigatório. Estas flags não são negociáveis:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["Features/**/*.ts", "vite.config.ts"]
}
```

| Flag | O que evita |
|---|---|
| `strict` | Guarda-chuva: `null` implícito, `this` solto, retorno inconsistente |
| `noUnusedLocals` | Import e variável mortos sobrevivendo à refatoração |
| `noUnusedParameters` | Assinatura desatualizada em handler |
| `isolatedModules` | Construção que o esbuild transpila errado por não ver o programa todo |
| `verbatimModuleSyntax` | Import de tipo virando import de runtime e quebrando o bundle |
| `noEmit` | Emissão é do Vite; o `tsc` só verifica |

`tsc --noEmit` roda **antes** do `vite build` — o esbuild não checa tipos (ver `vite-build`).

## Tipar o DOM sem `any`

`querySelector` devolve união com `null` e o tipo genérico `Element`. Estreite com guarda e saia
cedo — a página não pode quebrar quando o script carrega numa rota sem o elemento-alvo.

```ts
const formulario = document.querySelector<HTMLFormElement>("[data-<feature>-form]");

if (formulario === null) {
    return;
}

const campo = formulario.elements.namedItem("<campo>");

if (!(campo instanceof HTMLInputElement)) {
    return;
}
```

Proibido: `any`, `as` para calar o compilador, `!` de non-null assertion, `@ts-ignore`.
Quando precisar afirmar um tipo, use `instanceof` ou um type guard nomeado — a checagem sobrevive à
refatoração; a asserção não.

```ts
function ehResposta<Entidade>(valor: unknown): valor is Resposta<Entidade> {
    return typeof valor === "object" && valor !== null && "id" in valor;
}
```

Dado vindo do servidor por `fetch` ou `JSON.parse` é `unknown` até ser validado. Nunca declare
`const dados: Resposta = await resposta.json()` — isso é uma asserção disfarçada.

## Módulos de feature

```text
Features/<Feature>/Scripts/<feature>.ts   entry point — lê data-*, liga eventos, sai cedo
Features/Shared/Scripts/<modulo>.ts       utilitário reutilizado por mais de uma feature
```

- Um entry point por feature; nada de arquivo global que roda em toda página.
- Módulo compartilhado exporta função pura tipada; não toca em `document` no topo do arquivo.
- Nada de estado global mutável entre módulos.
- `export`/`import` ESM sempre; sem `namespace`, sem `require`, sem `<script>` inline com lógica.
- Tipo compartilhado com o servidor vive num `.ts` de tipos da feature e espelha o ViewModel —
  quando o ViewModel muda, esse arquivo muda na mesma entrega.

```ts
export type <Entidade>Selecionada = {
    readonly id: string;
    readonly nome: string;
};
```

Prefira `type` a `interface` para dados; `readonly` por padrão, como nas classes do servidor.

## Convenções

- Sem comentário, exceto quando a intenção não é dedutível do trecho.
- Early return e cláusula de guarda em vez de `if` aninhado.
- `const` por padrão; `let` só com reatribuição real; nunca `var`.
- Igualdade estrita (`===`); comparação com `null` explícita.
- `async/await` em vez de cadeia de `then`; sempre tratar rejeição.
- Nomes de função e variável no idioma do domínio; API do navegador em inglês.
- Linhas de ~100 caracteres, aspas duplas, ponto e vírgula, newline final.

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| `Object is possibly 'null'` "resolvido" com `!` | Guarda ausente | `if (x === null) return;` |
| Erro de tipo só aparece em produção | `tsc` fora do script de build | `tsc --noEmit && vite build` |
| Import de tipo quebra o bundle | Falta `verbatimModuleSyntax` | Ligar a flag e usar `import type` |
| `any` implícito em handler de evento | Parâmetro sem tipo | Tipar com `MouseEvent`, `SubmitEvent` |
| Script quebra em rota sem o elemento | Sem saída antecipada | Retornar quando o alvo é `null` |
| JSON do servidor tipado por asserção | `as` em `.json()` | Validar com type guard a partir de `unknown` |
