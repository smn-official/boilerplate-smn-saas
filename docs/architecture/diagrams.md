# Diagramas

> **Template do boilerplate.** Preencha ao implementar e remova este aviso.

Diagramas em Mermaid, versionados como texto. Imagem exportada não entra no repositório: ela
desatualiza em silêncio e ninguém consegue revisar um `.png` num diff.

Os dois primeiros diagramas são **fixos pelo boilerplate** — descrevem a norma, valem em qualquer
projeto e não devem ser editados por projeto. Os demais são placeholders: o projeto os preenche.

Referência normativa: [../../.ai/docs/estrutura-arquitetura.md](../../.ai/docs/estrutura-arquitetura.md).

## Direção de dependência — fixo pelo boilerplate

Corresponde a `Web ──► Data ──► Core`, com a seta direta `Web ──► Core` existindo apenas para
composição. Nenhuma seta aponta para `Web`, e nenhuma sai de `Core`.

```mermaid
graph LR
    Web["Web<br/>Controllers, ViewModels, Views<br/>composição da raiz"]
    Data["Data<br/>DbContext, repositórios<br/>integrações externas"]
    Core["Core<br/>agregados, serviços<br/>contratos, DTOs"]

    Web -->|"referencia"| Data
    Data -->|"referencia"| Core
    Web -.->|"composição: injeta contratos de Core"| Core

    Banco[("PostgreSQL")]
    Externo["API externa"]
    Data --> Banco
    Data --> Externo
```

Leitura do diagrama:

- A seta tracejada `Web ⇢ Core` é composição — o Controller injeta `I<Entidade>Service` declarado em
  `Core.Interfaces.Services`. **Nunca** serve para pular a camada de dados.
- Banco e API externa penduram em `Data`, nunca em `Core`: o domínio conhece o contrato, não o
  transporte.
- `Core` não tem seta de saída. Se algum dia tiver, o desenho está errado.

## Fluxo de uma requisição — fixo pelo boilerplate

Escrita atravessando as três camadas, com persistência única ao final.

```mermaid
sequenceDiagram
    autonumber
    actor Usuario as Usuário
    participant Controller as Controller (Web)
    participant Service as Service (Core)
    participant Agregado as Agregado (Core)
    participant Repo as Repository (Data)
    participant Banco as PostgreSQL
    participant Externo as Integração externa

    Usuario->>Controller: POST /resources/save
    Note over Controller: valida antiforgery e model binding
    Controller->>Controller: Request (ViewModel) → Dto
    Controller->>Service: SalvarAsync(dto, cancellationToken)
    Service->>Repo: ObterPorSpecAsync(spec, cancellationToken)
    Repo->>Banco: SELECT
    Banco-->>Repo: linhas
    Repo-->>Service: agregado
    Service->>Agregado: construir ou Atualizar(...)
    Note over Agregado: invariantes e regra de negócio
    Agregado-->>Service: propriedade de regra
    alt integração necessária
        Service->>Externo: sincronizar por contrato de Core
        Externo-->>Service: resultado
    end
    Service->>Repo: SalvarAlteracoesAsync(cancellationToken)
    Repo->>Banco: SaveChanges único
    Banco-->>Repo: ok
    Repo-->>Service: ok
    Service-->>Controller: Dto de saída
    Controller->>Controller: Dto → ViewModel
    Controller-->>Usuario: RedirectToAction / View
```

Pontos que o diagrama trava:

- O Controller nunca fala com `Repo` nem com `Banco`.
- A regra vive no agregado; o serviço consulta e reage.
- Existe **um** `SaveChanges`, no fim.
- A integração externa é opcional e não participa da transação do banco — ver
  [data-flow.md](data-flow.md).

## Responsabilidade por artefato — fixo pelo boilerplate

Ida e volta usam artefatos diferentes de propósito: na ida o dado converge para o domínio, na volta
diverge para a tela.

```mermaid
flowchart LR
    subgraph Ida["Requisição"]
        direction LR
        C1[Controller] --> S1[Service] --> R1[Repository] --> A1[Agregado]
    end
    subgraph Volta["Resposta"]
        direction RL
        A2[Agregado] --> D2[DTO] --> V2[ViewModel] --> W2[View]
    end
    Ida --> Volta
```

## Modelo de domínio — preencher

*Um diagrama de classes com os agregados deste projeto, suas entidades filhas e as relações entre
eles. Mostre a raiz de cada agregado e a fronteira de consistência — o que entra junto no mesmo
`SaveChanges`. Relação entre agregados é por identificador, nunca por navegação direta.*

*Se o diagrama ficar grande demais para caber numa tela, é sinal de que há mais de um domínio aqui:
o critério de separação está na seção 18 da referência normativa.*

```mermaid
classDiagram
    class Entidade {
        +Guid Id
        +string Codigo
        +Status Status
        +bool EhCondicao
        +Atualizar()
        +Excluir()
    }
    class EntidadeFilha {
        +Guid Id
        +Guid EntidadeId
    }
    Entidade "1" --> "0..*" EntidadeFilha : coleção somente leitura
```

## Sequência dos casos de uso críticos — preencher

*Um `sequenceDiagram` por caso de uso onde errar dói: cobrança, exclusão de conta, integração
irreversível, qualquer fluxo com efeito colateral externo. Caso de uso de CRUD simples não merece
diagrama — ele já está descrito pelo fluxo canônico acima.*

*Para cada um, deixe explícito o que acontece quando o passo externo falha depois do banco ter
gravado. Essa é a informação que o diagrama tem e a prosa esquece.*

```mermaid
sequenceDiagram
    autonumber
    participant Ator
    participant Sistema
    participant Externo

    Ator->>Sistema: ação
    Sistema->>Externo: efeito irreversível
    alt sucesso
        Externo-->>Sistema: confirmação
        Sistema-->>Ator: resultado
    else falha
        Externo-->>Sistema: erro
        Note over Sistema: compensação a definir por caso de uso
        Sistema-->>Ator: mensagem de erro
    end
```

## Modelo de dados — preencher

*Um `erDiagram` com as tabelas de que este projeto é dono, e — separadas visualmente — as tabelas
consumidas de outro sistema. Marcar o papel de cada schema aqui evita a migration acidental sobre
schema alheio.*

```mermaid
erDiagram
    ENTIDADE ||--o{ ENTIDADE_FILHA : possui
    ENTIDADE {
        uuid identificador PK
        text codigo
        text status
        boolean excluido
    }
    ENTIDADE_FILHA {
        uuid identificador PK
        uuid identificador_entidade FK
    }
```

Identificadores em PostgreSQL vão **por extenso** — sem abreviação, sigla ou diminutivo.

## Deploy — preencher

*A topologia real: onde a aplicação roda, onde o banco vive, quais recursos externos existem e por
onde o tráfego entra. Inclua os ambientes e o que difere entre eles. O diagrama existe para
responder "o que preciso provisionar para subir isso do zero?".*

```mermaid
flowchart TB
    Navegador["Navegador"]
    subgraph Nuvem["Ambiente"]
        App["App Service<br/>&lt;Produto&gt;.&lt;Modulo&gt;.Web"]
        Banco[("PostgreSQL")]
        Telemetria["Application Insights"]
    end
    Terceiro["Serviço externo"]

    Navegador -->|HTTPS| App
    App --> Banco
    App --> Telemetria
    App --> Terceiro
```

## Pipeline — preencher

*Os stages e as dependências entre eles. O ponto de atenção fixo: `Deploy` depende de **`Test`**, não
apenas de `Build` — caso contrário uma falha de teste não bloqueia o deploy.*

```mermaid
flowchart LR
    Build["Build<br/>restore + publish"] --> Test["Test<br/>dotnet test"]
    Test --> Deploy["Deploy<br/>conforme a branch"]
```

## Convenções destes diagramas

- Mermaid em bloco ` ```mermaid `, nunca imagem exportada.
- Rótulo em português, no idioma do domínio; nome de artefato como está no código.
- Um diagrama responde uma pergunta. Diagrama que tenta mostrar tudo não é lido por ninguém.
- Diagrama desatualizado é pior que ausente: se a mudança altera estrutura, o diagrama é atualizado
  na mesma entrega.
