---
name: vite-build
description: Pipeline de assets com Vite — configurar vite.config.ts, declarar entry points por feature, gerar manifest com hash, definir scripts npm e amarrar o build ao .csproj. Use ao criar feature com script/estilo próprio, alterar build, dev server ou saída de assets.
agent: frontend-agent
---

# Vite Build

**Vite é o compilador obrigatório.** Sem script Node artesanal, Gulp, Webpack ou o bundler do
próprio ASP.NET. O Vite transpila com esbuild, faz HMR incremental em desenvolvimento e entrega
build de produção com tree-shaking, minificação e hashing de conteúdo sem configuração adicional.

## Estrutura

```text
src/<Produto>.<Modulo>.Web/
├── Features/<Feature>/
│   ├── Scripts/<feature>.ts      entry point da feature
│   └── Styles/<feature>.css      camadas Tailwind específicas da feature (opcional)
├── Features/Shared/
│   ├── Scripts/                  módulos compartilhados
│   └── Styles/app.css            @import "tailwindcss" + @theme + componentes compartilhados
├── wwwroot/dist/                 saída do Vite (gerada; fora do controle de versão)
├── vite.config.ts
├── tsconfig.json
└── package.json
```

`wwwroot/dist/` entra no `.gitignore`. Não versione asset compilado.

## Configuração

Um entry point por feature, saída com manifest para o Razor resolver os arquivos versionados:

```ts
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

export default defineConfig({
    plugins: [tailwindcss()],
    build: {
        outDir: "wwwroot/dist",
        emptyOutDir: true,
        manifest: true,
        rollupOptions: {
            input: {
                app: resolve(__dirname, "Features/Shared/Styles/app.css"),
                <feature>: resolve(__dirname, "Features/<Feature>/Scripts/<feature>.ts"),
            },
        },
    },
    server: {
        port: 5173,
        strictPort: true,
    },
});
```

| Opção | Por quê |
|---|---|
| `manifest: true` | Sem ele o Razor não descobre o nome com hash |
| `emptyOutDir: true` | Impede asset órfão de build anterior servido em produção |
| `strictPort: true` | Falha alto em vez de subir em porta que o Razor não conhece |
| Entry por feature | Página carrega só o script da própria tela |

## Dependências

Fixe versão exata, sem `^`, para build reprodutível; atualize deliberadamente.

```json
{
  "devDependencies": {
    "typescript": "<versao-estavel-mais-recente>",
    "vite": "<versao-estavel-mais-recente>",
    "tailwindcss": "<versao-estavel-mais-recente>",
    "@tailwindcss/vite": "<versao-estavel-mais-recente>",
    "@types/node": "<versao-estavel-mais-recente>"
  }
}
```

| Pacote | Papel |
|---|---|
| `typescript` | Checagem de tipos; `tsc --noEmit` é o portão do build |
| `vite` | Compilador e dev server |
| `tailwindcss` | Framework de estilo utilitário |
| `@tailwindcss/vite` | Plugin oficial — dispensa o passo PostCSS |
| `@types/node` | Necessário para tipar `vite.config.ts` (`__dirname`, `node:path`) |

**Deliberadamente ausentes:** UIkit, Bootstrap e afins; jQuery; Webpack, Gulp e PostCSS avulso;
qualquer framework SPA. Nenhum entra sem justificativa explícita de qual problema resolve.

## Scripts npm

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "typecheck": "tsc --noEmit"
  }
}
```

A **checagem de tipos permanece separada da emissão** — o esbuild transpila sem verificar tipos.
Por isso `tsc --noEmit` roda antes do `vite build` e é o que efetivamente falha o build diante de
erro de tipo. Nunca troque essa ordem nem remova o `&&`.

## Integração com o `.csproj`

O `.csproj` Web amarra `npm install` e `npm run build` a targets `BeforeBuild`, de modo que
`dotnet build` continue produzindo os assets sem passo manual.

```xml
<Target Name="NpmInstall" BeforeTargets="Build" Inputs="package.json" Outputs="node_modules/.install-stamp">
  <Exec Command="npm install" />
  <Touch Files="node_modules/.install-stamp" AlwaysCreate="true" />
</Target>

<Target Name="NpmBuild" BeforeTargets="Build" DependsOnTargets="NpmInstall">
  <Exec Command="npm run build" />
</Target>
```

O `Inputs`/`Outputs` evita reinstalar dependência a cada build incremental.

## Dev server e produção

- **Desenvolvimento:** `npm run dev` sobe o Vite em `5173`; o Razor aponta para o dev server e o HMR
  aplica mudança de CSS sem recarregar a página.
- **Produção:** `npm run build` gera `wwwroot/dist/.vite/manifest.json`; o Razor lê o manifest e
  emite a tag com o arquivo hasheado.

Nenhuma view conhece esse mecanismo — ele fica encapsulado no TagHelper (ver `razor-interop`).

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| CSS antigo em produção | Cache sem hash | `manifest: true` e resolver via manifest |
| Build passa com erro de tipo | `vite build` sem `tsc --noEmit` | Restaurar o `&&` no script |
| Asset 404 após renomear feature | Entry point não atualizado | Corrigir `rollupOptions.input` |
| Arquivo de build anterior servido | `emptyOutDir` desligado | Ligar `emptyOutDir` |
| `__dirname` sem tipo | Falta `@types/node` | Instalar e incluir no `tsconfig` |
