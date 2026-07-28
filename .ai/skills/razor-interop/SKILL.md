---
name: razor-interop
description: Contrato entre Razor e TypeScript — passar dados e URLs por atributos data-*, gerar rota com Url.Action e nameof, resolver assets pelo TagHelper do Vite (dev server vs. manifest.json) e garantir progressive enhancement. Use ao ligar comportamento a uma view, incluir script numa página ou revisar acoplamento entre .cshtml e .ts.
agent: frontend-agent
---

# Razor Interop

## Divisão de responsabilidade

```text
Razor      estrutura, dados iniciais, URLs, textos, estados já resolvidos pela ViewModel
data-*     único canal de entrada do servidor para o script
TypeScript comportamento pontual sobre uma página que já funciona sem ele
```

O TypeScript **não** monta a tela, **não** busca os dados iniciais, **não** conhece rota e **não**
substitui `@foreach`. A view é renderizada no servidor; o script enriquece.

## Contrato por `data-*`

O Razor escreve; o script lê. Nada de URL, id de rota ou texto literal dentro do `.ts`.

```razor
<div data-<feature>-root
     data-url-salvar="@Url.Action(nameof(<Entidade>Controller.Salvar), "<Entidade>")"
     data-<entidade>-id="@Model.Id"
     data-permite-<acao>="@Model.Exibir<Acao>.ToString().ToLowerInvariant()">
</div>
```

```ts
const raiz = document.querySelector<HTMLElement>("[data-<feature>-root]");

if (raiz === null) {
    return;
}

const urlSalvar = raiz.dataset.urlSalvar;
const permite<Acao> = raiz.dataset.permite<Acao> === "true";

if (urlSalvar === undefined) {
    return;
}
```

### Regras

| Regra | Motivo |
|---|---|
| `Url.Action` sempre com `nameof`, nunca string literal | Renomear a action quebra o build, não a tela |
| URL nunca hardcoded no `.ts` | Subpath, área e prefixo de rota mudam por ambiente |
| Seletor por `data-*`, nunca por classe de estilo | Refatoração visual não quebra comportamento |
| `data-*` em kebab-case; lido em camelCase no `dataset` | Contrato do próprio DOM |
| Booleano serializado como `"true"`/`"false"` | `dataset` só devolve string |
| Payload maior vai em `<script type="application/json">` | `data-*` não é lugar para objeto grande |

Para payload estruturado, serialize num bloco JSON e valide no script como `unknown` — nunca
concatene JSON dentro de um atributo.

```razor
<script type="application/json" data-<feature>-dados>@Html.Raw(Model.DadosJson)</script>
```

## Assets pelo TagHelper

Em desenvolvimento o Razor aponta para o dev server do Vite (HMR); em produção resolve o
`manifest.json` gerado pelo build, obtendo o arquivo com hash de conteúdo. Encapsule isso num
**TagHelper**, para que nenhuma view precise conhecer o mecanismo:

```html
<vite-asset src="Features/<Feature>/Scripts/<feature>.ts"></vite-asset>
```

O TagHelper decide:

| Ambiente | Comportamento |
|---|---|
| Development | Emite `<script type="module">` para `http://localhost:5173/<src>` e o client do HMR |
| Produção | Lê `wwwroot/dist/.vite/manifest.json`, emite o `file` hasheado e os `css` associados |

- O manifest é lido uma vez e mantido em cache na aplicação; não abrir o arquivo por requisição.
- O CSS compartilhado entra no layout; o script da feature entra na view da feature, em
  `@section Scripts`.
- Nenhuma view referencia caminho de `wwwroot/dist` diretamente.
- `<script>` sempre `type="module"` e `defer` implícito — nada de `<script>` inline com lógica.

## Progressive enhancement

A página precisa funcionar sem JavaScript. O script melhora; não habilita.

| Situação | Errado | Certo |
|---|---|---|
| Submeter formulário | `fetch` obrigatório | `<form method="post">` real; script intercepta se puder |
| Navegar | `location.href` num `<div>` clicável | `<a href>` gerado pelo Razor |
| Confirmar exclusão | Só `confirm()` no script | `POST` com antiforgery; script adiciona a confirmação |
| Mostrar/esconder bloco | Bloco começa oculto por classe e só o script revela | Estado inicial correto no Razor |
| Validar campo | Só no cliente | Validação no servidor; cliente antecipa a mensagem |

Todo `POST` interceptado deve continuar enviando o antiforgery token — leia-o do próprio formulário,
nunca o reconstrua no script.

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Rota quebra ao publicar em subpath | URL literal no `.ts` | Passar via `data-*` com `Url.Action` |
| Comportamento some após ajuste de CSS | Seletor por classe de estilo | Seletor por `data-*` |
| Script roda em página que não o usa | Entry point global | Um entry por feature e saída antecipada |
| Asset antigo servido após deploy | View apontando para `wwwroot/dist` fixo | Usar o TagHelper |
| `400` em requisição interceptada | Antiforgery token perdido | Enviar o token do formulário |
| Renomear action não acusa erro | `Url.Action` com string literal | `nameof` |
