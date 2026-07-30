---
name: codegraph-consulta
description: Consulta ao grafo do CodeGraph — escolher entre explore, query, node, callers, callees e impact, formular a pergunta que devolve contexto útil em uma chamada, ler a saída de blast radius e saber quando o grep ainda é a ferramenta certa. Use ao investigar como um trecho funciona, localizar um símbolo, medir o efeito de uma alteração ou substituir um laço de grep/Read que está gastando contexto.
agent: codegraph-agent
---

# Consulta ao grafo

O ganho está em **uma pergunta bem-feita**, não em muitas consultas. `explore` resolve a maioria dos
casos: devolve o fonte verbatim dos símbolos relevantes, numerado, mais os caminhos de chamada entre
eles e o raio de impacto.

## Qual comando para qual pergunta

| Pergunta | Comando |
|---|---|
| "Como isso funciona?" / "Onde fica X?" / vou mexer nisso | `explore` |
| "Existe um símbolo chamado assim?" | `query` |
| "Quero o corpo deste símbolo ou deste arquivo" | `node` |
| "Quem chama isso?" | `callers` |
| "O que isso chama?" | `callees` |
| "O que quebra se eu mudar isso?" | `impact` |

Na dúvida, **`explore`**. Os outros são refino sobre uma pista que ele já deu.

## explore — o caminho padrão

```bash
codegraph explore "PedidoService confirmar pagamento fluxo"
codegraph explore "PedidoRepository ObterPorId" --max-files 8
```

Aceita pergunta em linguagem natural **ou** um punhado de nomes de símbolo e arquivo. Nomear os
suspeitos rende mais que uma pergunta vaga:

- Fraco: `explore "como funciona o pedido"`
- Bom: `explore "PedidoService PedidoRepository ConfirmarPagamento"`

Para um fluxo que atravessa camadas, cite as pontas — o grafo preenche o meio.

Pelo MCP, a mesma coisa: `codegraph_explore` com `query` e, quando o projeto não é o padrão da
sessão, `projectPath`.

## O fonte devolvido já é leitura feita

A saída é o conteúdo **atual em disco**, numerado, byte a byte igual ao que o `Read` traria. Reabrir
o mesmo arquivo com `Read` depois de um `explore` gasta contexto duas vezes pela mesma informação.

Só volte ao `Read` quando precisar de uma parte do arquivo que o grafo não devolveu, ou quando for
editar e precisar do texto exato ao redor do ponto de edição.

## Os demais comandos

```bash
codegraph query "Repository" --kind class --limit 20     # busca por nome
codegraph node PedidoService.Confirmar                   # um símbolo, com trilha
codegraph node src/Core/Pedidos/Pedido.cs                # arquivo numerado
codegraph callers ObterPorId                             # quem chama
codegraph callees ConfirmarPagamento                     # o que chama
codegraph impact Pedido --depth 3                        # raio de impacto
codegraph files                                          # estrutura indexada
```

`--json` em `query`, `callers`, `callees` e `impact` quando a saída for processada por script.

## Ler o blast radius

`explore` e `impact` listam quem depende do símbolo e sinalizam ausência de teste cobrindo. Serve a
duas decisões: **o que reler antes de editar** e **o que testar depois**. Um símbolo com muitos
dependentes e sem teste é onde a mudança silenciosa dói.

## Quando o grep continua certo

O índice guarda **símbolos**, não texto qualquer. Continue no `grep`/`Read` para:

- String literal, mensagem de erro, chave de configuração.
- Comentário e documentação (`.md`).
- `.cshtml`, `.css`, `.sql`, `.json` — fora do índice.
- Ocorrência textual de um nome dentro de string ou template.

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| "Nenhum símbolo encontrado" para algo que existe | Índice defasado, ou arquivo não é código | `codegraph status`; se for `.cshtml`/`.sql`, use `grep` |
| Saída enorme demais | Consulta ampla demais | Nomeie símbolos; use `--max-files` |
| Símbolo achado mas sem quem o chama | Chamada por dispatch dinâmico ou reflexão | Confirme com `grep` pelo nome |
| Resposta cita código que não existe mais | Índice desatualizado | `codegraph sync`; ver `codegraph-manutencao` |
