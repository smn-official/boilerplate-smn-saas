---
name: feature-web
description: Camada de apresentação ASP.NET Core MVC — criar feature vertical (Controller, ViewModel, View), definir rotas, configurar Vite + Tailwind, aplicar design system e tipografia. Use ao criar ou alterar tela, rota, TypeScript ou estilo.
agent: net10-agent
---

# Feature Web

## Anatomia

```text
Features/<Feature>/
├── Controllers/   coordena entrada, serviço e resposta — sem regra de negócio
├── ViewModels/    apresentação; nunca vira entidade de persistência
├── Views/         Razor, sem regra de negócio e sem style=""
├── Scripts/       TypeScript da feature
├── Styles/        CSS/Tailwind da feature (opcional)
├── Services/      opcional
└── Helpers/       opcional — formatação e mapeamento Request → Dto
```

Compartilhado fica em `Features/Shared` e **não** se duplica.

## Controller

Porta de entrada. Responde "quem chamou, o que responder".

**Deve:** extrair dados da requisição; validar **apenas** aspecto técnico (model binding); delegar
ao serviço; traduzir o resultado em resposta HTTP; definir rotas, verbos e status; propagar o
`CancellationToken`; permanecer fino.

**Nunca:** regra de negócio; `DbContext` ou repositório; manipular agregado; auditoria, e-mail,
integração; encadear passos de negócio.

```csharp
[Route("resources")]
[Authorize]
public class <Entidade>Controller(I<Entidade>Service <entidade>Service) : Controller
{
    [HttpGet("")]
    public async Task<IActionResult> Gerenciar(CancellationToken cancellationToken)
        => View(await CriarVisualizacaoAsync(cancellationToken));

    [HttpPost("save")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Salvar(<Entidade>FormularioRequest request, CancellationToken cancellationToken)
    {
        await <entidade>Service.SalvarAsync(<Entidade>FormularioMapper.ParaDto(request), cancellationToken);

        return RedirectToAction(nameof(Gerenciar));
    }
}
```

### Rotas

**Contrato externo: inglês, kebab-case**, por atributo. Controller e actions no idioma do domínio.

| Verbo | Rota | Action |
|---|---|---|
| GET | `""` | `Gerenciar` |
| GET | `"new"` | `Novo` |
| GET | `"edit"` | `Editar` |
| POST | `"save"` | `Salvar` |
| POST | `"delete"` | `Excluir` |

- Controllers de negócio são `[Authorize]`.
- Todo `POST` exige `[ValidateAntiForgeryToken]`.
- `CancellationToken` sempre por último.
- Rota de preview/diagnóstico é `[AllowAnonymous]` **com guarda de ambiente** retornando `404` fora
  de Development.
- `Url.Action` sempre com `nameof`, nunca string literal.

## ViewModel

Modelo de **uma tela específica**. Responde "como a tela enxerga esses dados?".

**Deve:** conter só o que a tela exibe; trazer dados **já formatados**; consolidar múltiplas fontes;
expor campos de renderização prontos (classe, cor, ícone, texto de estado); expor decisões visuais
como booleanos resolvidos (`ExibirBotao<Acao>`); ser específica por caso de uso.

**Nunca:** regra de negócio; depender de service ou repository; integração externa; método de
persistência; virar modelo único de 80 propriedades para todas as telas.

Sufixo `Request` para os que sofrem model binding — única exceção à regra de propriedade somente
leitura.

## View

Transforma ViewModel em marcação. Responde "como apresentar?".

**Deve:** renderizar dados prontos; ser burra; condicional só sobre flag já resolvida; aplicar
classes fornecidas pela ViewModel; extrair repetição para partial; iterar coleção já filtrada e
ordenada.

**Nunca:** regra de negócio em condicional composta; injetar service, repository ou `DbContext`;
chamar API ou persistir; derivar classe por cadeia de `if/else`; filtrar ou ordenar na marcação;
helper extenso no arquivo.

### Localização de views

```csharp
var featureLocations = new[]
{
    "/Features/{1}/Views/{0}.cshtml",
    "/Features/{1}/Views/Shared/{0}.cshtml",
    "/Features/Shared/{0}.cshtml",
};

return featureLocations.Concat(viewLocations);
```

Layout padrão em `Features/_ViewStart.cshtml`.

## Assets — Vite + Tailwind

**Vite é obrigatório.** Sem script Node artesanal, Gulp ou Webpack.
**Tailwind é obrigatório. Não usar UIkit, Bootstrap ou qualquer biblioteca de componentes
pré-estilizados** — impõem design system próprio, exigem sobrescrita por especificidade e trazem
CSS que nunca será usado.

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
});
```

Tokens no CSS (Tailwind 4):

```css
@import "tailwindcss";

@theme {
    --color-primaria: #<hex>;
    --font-sans: "<Fonte>", sans-serif;
}
```

Scripts npm — **checagem de tipos separada da emissão**, porque o esbuild transpila sem verificar:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "typecheck": "tsc --noEmit"
  }
}
```

Em desenvolvimento o Razor aponta para o dev server (HMR); em produção resolve o `manifest.json`.
Encapsule num TagHelper: `<vite-asset src="Features/<Feature>/Scripts/<feature>.ts"></vite-asset>`.

## Design system

A escala tipográfica abaixo é o contrato único de tipos e pesos. Cor, hierarquia, profundidade,
movimento e direção visual estão em [design-visual](../design-visual/SKILL.md); os estados que toda
tela precisa renderizar, em [estados-de-interface](../estados-de-interface/SKILL.md).

### Escala tipográfica

| Token | Tamanho | Peso | Tracking | Uso |
|---|---|---|---|---|
| `display-xl` | 56px | 700 | -0.025em | Hero, lado de marca |
| `display-lg` | 44px | 700 | -0.025em | Headline de tela cheia |
| `display-md` | 34px | 700 | -0.025em | Wordmark, KPI gigante |
| `h1` | 26–28px | 700 | -0.02em | Título de página ou card principal |
| `h2` | 22–24px | 700 | -0.02em | Seção, KPI grande |
| `h3` | 18px | 600 | -0.01em | Subseção, título de card |
| `h4` | 16px | 600 | 0 | Bloco de formulário |
| `body-lg` | 16px | 400 | 0 | Subtítulo de hero |
| `body` | 14px | 400 | 0 | Texto padrão: inputs, células |
| `body-sm` | 13px | 400–500 | 0 | Label, link e botão secundário |
| `caption` | 12px | 500 | 0 | Rodapé, ajuda, metadado |
| `micro` | 11px | 600 | 0.08em | Eyebrow, tag — **uppercase** |
| `nano` | 10–11px | 600 | 0.32em | Tagline, divisor — **uppercase** |

### Princípios

- Toda declaração escolhe **um token da escala**. Caso real que não caiba exige alterar a escala,
  não codar exceção.
- Tracking negativo só em display e heading; de `body` para baixo é `0`.
- `micro` e `nano` só em caixa alta.
- **Nada de `style=""`** — estilizar por classes utilitárias.
- Nome de classe referencia o **token semântico**, nunca o valor em pixels.
- Padrão repetido vira **componente Razor**, não `@apply`.
- URLs geradas no Razor e passadas ao TypeScript por `data-*` — nunca hardcoded no `.ts`.

### Layout e responsividade

- Tokens e componentes compartilhados vivem num único lugar central; classe de feature nunca
  redefine o sistema base.
- Largura máxima única; navegação lateral fixa no desktop, offcanvas abaixo de ~960px.
- Rolagem vertical pertence à área principal, nunca ao contêiner centralizado.
- **Nunca** overflow horizontal.
- Tabela extensa vira card ou recebe scroll interno no próprio contêiner.
- Grade de formulário colapsa para uma coluna no mobile; ação primária ocupa a largura disponível.
- **Tipografia nunca reduzida abaixo da escala** para caber — reorganize o layout.
- Validar desktop **e** mobile antes de entregar.
