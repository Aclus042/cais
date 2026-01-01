# 🎲 RPG Card Canvas

> Sistema de Cards Modulares para Mestres de RPG

Uma ferramenta web completa para criar, organizar, visualizar e navegar por cards interligados durante a preparação e execução de sessões de RPG.

---

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Características](#características)
- [Como Usar](#como-usar)
- [Estrutura de Dados](#estrutura-de-dados)
- [Arquitetura](#arquitetura)
- [Atalhos de Teclado](#atalhos-de-teclado)
- [Importação/Exportação](#importaçãoexportação)

---

## 🎯 Visão Geral

O RPG Card Canvas é uma ferramenta **local-first** que funciona diretamente no navegador, sem necessidade de servidor. Todos os dados são armazenados no localStorage do navegador.

### Conceito Central

- **Cards independentes**: Cada informação é um card autônomo
- **Conexões explícitas**: Links nomeados entre cards
- **Navegação não-linear**: Acesse qualquer informação em até 2 cliques
- **Múltiplas visualizações**: Grid, Grafo (Canvas) e Detalhe

---

## ✨ Características

### 🃏 Sistema de Cards

- **Tipos personalizáveis**: NPC, Cena, Local, Criatura, Item, etc.
- **Campos flexíveis**: Título, resumo, conteúdo (Markdown), campos customizados
- **Tags**: Organize e filtre por categorias
- **Cores**: Identidade visual por card
- **Favoritos**: Acesso rápido aos cards importantes

### 🔗 Conexões

- **Direcionais ou bidirecionais**
- **Relações nomeadas** (ex: "conhece", "leva a", "controla")
- **Visualização no grafo**
- **Navegação rápida** entre cards conectados

### 👁️ Modos de Visualização

#### Grid (Cards)
- Lista ou grade de cards
- Filtros por tipo, tag
- Busca instantânea
- 3 tamanhos: Compacto, Médio, Grande

#### Grafo (Canvas)
- Cards como nós visuais
- Conexões como linhas
- Arrastar cards livremente
- Zoom e pan
- Auto-layout

#### Detalhe (Foco)
- Visualização completa de um card
- Navegação por conexões
- Histórico de navegação

### 🎨 Personalização

- **Tema claro e escuro**
- **Cores por tipo de card**
- **Ícones personalizáveis**

---

## 🚀 Como Usar

### Primeiros Passos

1. **Abra o arquivo `index.html`** no navegador
2. **Crie seu primeiro card** clicando em "+ Card"
3. **Defina o tipo** (NPC, Local, Cena, etc.)
4. **Adicione conteúdo** usando Markdown
5. **Crie conexões** com outros cards

### Criando Cards

1. Clique em **"+ Card"** no header
2. Preencha os campos:
   - **Título**: Nome do card (obrigatório)
   - **Tipo**: Categoria do card
   - **Resumo**: Descrição breve para referência rápida
   - **Conteúdo**: Texto detalhado (suporta Markdown)
   - **Tags**: Palavras-chave para filtros
   - **Campos Personalizados**: Informações extras
   - **Conexões**: Links para outros cards

### Markdown Suportado

```markdown
# Título H1
## Título H2
### Título H3

**Negrito** e *Itálico*

- Lista não ordenada
1. Lista ordenada

> Citação

`código inline`

[Link](url)
```

### Navegando

- **Grid**: Clique em um card para ver detalhes
- **Grafo**: Arraste para mover, scroll para zoom, duplo-clique para abrir
- **Detalhe**: Clique nas conexões para navegar

---

## 📊 Estrutura de Dados

### Card

```javascript
{
  id: "abc123",           // ID único gerado
  title: "Nome do Card",  // Título
  typeId: "npc",          // ID do tipo
  summary: "Resumo...",   // Descrição breve
  content: "# Markdown",  // Conteúdo principal
  tags: ["tag1", "tag2"], // Tags
  customFields: [         // Campos personalizados
    { name: "Campo", value: "Valor" }
  ],
  connections: [          // Conexões
    { targetId: "xyz789", relation: "conhece", bidirectional: false }
  ],
  color: "#6366f1",       // Cor do card
  isFavorite: false,      // Favorito
  position: { x: 100, y: 100 }, // Posição no grafo
  createdAt: 1234567890,  // Timestamp criação
  updatedAt: 1234567890   // Timestamp atualização
}
```

### Tipo

```javascript
{
  id: "npc",
  name: "NPC",
  icon: "👤",
  color: "#f59e0b",
  isDefault: true  // Tipos padrão não podem ser excluídos
}
```

---

## 🏗️ Arquitetura

### Estrutura de Arquivos

```
📁 planejamento/
├── 📄 index.html          # Página principal
├── 📁 css/
│   ├── styles.css         # Estilos principais
│   ├── themes.css         # Sistema de temas
│   ├── cards.css          # Estilos dos cards
│   ├── graph.css          # Estilos do grafo
│   └── modal.css          # Estilos dos modais
└── 📁 js/
    ├── utils.js           # Funções utilitárias
    ├── data.js            # Gerenciamento de dados
    ├── markdown.js        # Parser Markdown
    ├── cards.js           # Renderização de cards
    ├── connections.js     # Editor de conexões
    ├── graph.js           # Visualização em grafo
    ├── views.js           # Gerenciamento de views
    ├── ui.js              # Interface do usuário
    └── app.js             # Aplicação principal
```

### Módulos

| Módulo | Responsabilidade |
|--------|------------------|
| `Utils` | Funções utilitárias, EventBus, storage |
| `DataManager` | CRUD de cards, tipos, persistência |
| `MarkdownParser` | Conversão Markdown → HTML |
| `CardRenderer` | Renderização de cards |
| `ConnectionsEditor` | UI de edição de conexões |
| `GraphView` | Visualização em grafo/canvas |
| `ViewManager` | Gerenciamento de views |
| `UI` | Modais, toasts, formulários |
| `App` | Inicialização da aplicação |

### Comunicação entre Módulos

Os módulos se comunicam através do **EventBus**:

```javascript
// Emitir evento
Utils.EventBus.emit('card:created', card);

// Escutar evento
Utils.EventBus.on('card:created', (card) => {
  // Reagir ao evento
});
```

---

## ⌨️ Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| `Ctrl + N` | Novo card |
| `Ctrl + K` | Focar na busca |
| `Alt + 1` | View Grid |
| `Alt + 2` | View Grafo |
| `Alt + 3` | View Detalhe |
| `Esc` | Fechar modal |

---

## 💾 Importação/Exportação

### Exportar

1. Clique no botão **📤** no header
2. Um arquivo JSON será baixado com todos os seus dados

### Importar

1. Clique no botão **📥** no header
2. Escolha o modo:
   - **Substituir**: Apaga dados atuais
   - **Mesclar**: Adiciona aos dados existentes
3. Arraste o arquivo JSON ou clique para selecionar

### Formato do Arquivo

```json
{
  "version": "1.0.0",
  "exportedAt": "2024-01-01T00:00:00.000Z",
  "session": "Nome da Sessão",
  "cards": [...],
  "types": [...],
  "settings": {...},
  "favorites": [...]
}
```

---

## 🎮 Uso em Mesa

### Dicas para Mestres

1. **Favoritos**: Marque cards que você consultará frequentemente
2. **Resumos**: Use o campo de resumo para informações que precisa ver de relance
3. **Conexões**: Crie conexões que representem o fluxo da sessão
4. **Grafo**: Use a view de grafo para ter uma visão geral
5. **Tema Escuro**: Menos distração durante a sessão

### Fluxo Sugerido

1. **Preparação**:
   - Crie a Sinopse como hub central
   - Adicione NPCs, Locais, Cenas
   - Conecte tudo

2. **Durante a Sessão**:
   - Use a view de Detalhe para consultas
   - Navegue pelas conexões
   - Favoritos sempre acessíveis

---

## 🔧 Requisitos

- Navegador moderno (Chrome, Firefox, Edge, Safari)
- JavaScript habilitado
- LocalStorage disponível

---

## 📝 Licença

Este projeto é de uso livre para fins pessoais e educacionais.

---

**Feito com ❤️ para Mestres de RPG**
