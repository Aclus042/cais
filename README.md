# 🎲 Painel do Mestre - Gerenciador de Campanha RPG

Ferramenta completa para mestres de RPG gerenciarem suas campanhas de forma organizada e profissional.

## 🎯 Funcionalidades

### ✅ Sistema Completo de CRUD
- **Criar** novos itens (Locais, NPCs, Pistas, Monstros)
- **Editar** itens existentes
- **Visualizar** detalhes completos
- **Excluir** itens com confirmação

### 🔗 Relacionamentos Dinâmicos
- Vincule NPCs a locais
- Associe pistas a NPCs e locais
- Conecte monstros aos locais onde aparecem
- Crie vínculos entre NPCs
- Navegue entre itens relacionados com um clique

### 💾 Persistência de Dados
- Todos os dados salvos automaticamente no **localStorage**
- Nenhuma perda de dados ao fechar o navegador
- **Exportar** campanha completa em JSON
- **Importar** campanhas de backups anteriores

## 🚀 Como Usar

1. Abra o arquivo `mestre.html` em qualquer navegador moderno
2. Comece criando seus primeiros itens usando os botões "+ Criar"
3. Clique em cards para ver detalhes completos
4. Use os botões de Editar/Excluir para gerenciar itens
5. Navegue entre seções usando o menu lateral

## 📋 Estrutura de Dados

### 📍 Locais
- Nome
- Imagem (URL)
- Descrição
- NPCs presentes
- Pistas disponíveis
- Monstros encontrados

### 👥 NPCs
- Nome
- Idade
- Imagem (URL)
- Descrição
- Vínculos com outros NPCs
- Pistas que possui

### 🔍 Pistas
- Nome
- Imagem (URL)
- Descrição
- Locais onde pode ser encontrada
- NPCs que podem fornecê-la

### ⚔️ Monstros
- Nome
- Imagem (URL)
- Descrição
- Locais onde aparece

## 💡 Dicas de Uso

- **Imagens**: Cole URLs diretas de imagens (PNG, JPG, etc.)
- **Backup**: Use a função de exportar regularmente para fazer backups
- **Navegação**: Clique em qualquer item relacionado para visualizar seus detalhes
- **Multi-select**: Use os checkboxes nos formulários para selecionar múltiplos itens

## 🛠️ Tecnologias

- **HTML5** puro
- **CSS3** com variáveis customizadas
- **JavaScript** vanilla (ES6+)
- **localStorage** para persistência

## 📦 Arquivos

- `mestre.html` - Estrutura da aplicação
- `mestre.css` - Estilos e layout
- `mestre.js` - Lógica e funcionalidades

## ⚙️ Compatibilidade

Funciona em todos os navegadores modernos:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

---

**Desenvolvido para mestres de RPG que querem organização e controle total de suas campanhas!** 🎲✨
