/* ============================================
   RPG Card Canvas — Interface do Usuário
   ============================================ */

/**
 * Módulo de UI - Modais, Toasts e Interações
 */
const UI = (function() {
    
    // ==================== ESTADO ====================
    let currentModal = null;
    let editingCardId = null;
    let cardTags = [];
    let customFields = [];
    
    // ==================== INICIALIZAÇÃO ====================
    
    /**
     * Inicializa o módulo de UI
     */
    function init() {
        setupModals();
        setupCardForm();
        setupTypesModal();
        setupImportExport();
        setupThemeToggle();
        setupSearch();
        setupKeyboardShortcuts();
        
        console.log('UI inicializado');
    }
    
    // ==================== MODAIS ====================
    
    /**
     * Configura sistema de modais
     */
    function setupModals() {
        // Fecha modal ao clicar no backdrop ou botão de fechar
        document.querySelectorAll('.modal').forEach(modal => {
            modal.querySelector('.modal-backdrop')?.addEventListener('click', () => {
                closeModal(modal.id);
            });
            
            modal.querySelectorAll('[data-close-modal]').forEach(btn => {
                btn.addEventListener('click', () => {
                    closeModal(modal.id);
                });
            });
        });
        
        // Fecha modal com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && currentModal) {
                closeModal(currentModal);
            }
        });
    }
    
    /**
     * Abre um modal
     * @param {string} modalId - ID do modal
     */
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        modal.classList.add('active');
        currentModal = modalId;
        document.body.style.overflow = 'hidden';
        
        // Foca no primeiro input
        setTimeout(() => {
            const firstInput = modal.querySelector('input:not([type="hidden"]), textarea, select');
            if (firstInput) firstInput.focus();
        }, 100);
    }
    
    /**
     * Fecha um modal
     * @param {string} modalId - ID do modal
     */
    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        modal.classList.remove('active');
        currentModal = null;
        document.body.style.overflow = '';
    }
    
    // ==================== FORMULÁRIO DE CARD ====================
    
    /**
     * Configura formulário de card
     */
    function setupCardForm() {
        const form = document.getElementById('formCard');
        const modal = document.getElementById('modalCard');
        
        // Botões de novo card
        document.getElementById('btnNewCard')?.addEventListener('click', () => openCardModal());
        document.getElementById('btnEmptyNewCard')?.addEventListener('click', () => openCardModal());
        
        // Subscribe para edição
        Utils.EventBus.on('card:edit', ({ cardId }) => openCardModal(cardId));
        Utils.EventBus.on('card:confirmDelete', ({ cardId }) => confirmDeleteCard(cardId));
        
        // Form submit
        form?.addEventListener('submit', handleCardSubmit);
        
        // Editor toolbar
        document.querySelectorAll('.editor-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const textarea = document.getElementById('cardContent');
                MarkdownParser.insertFormat(textarea, btn.dataset.format);
            });
        });
        
        // Tags input
        const tagsInput = document.getElementById('cardTagsInput');
        tagsInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addTag(tagsInput.value.trim());
                tagsInput.value = '';
            }
        });
        
        // Adicionar campo customizado
        document.getElementById('btnAddCustomField')?.addEventListener('click', addCustomField);
        
        // Adicionar conexão
        document.getElementById('btnAddConnection')?.addEventListener('click', () => {
            ConnectionsEditor.addConnection();
        });
        
        // Inicializa editor de conexões
        ConnectionsEditor.init(document.getElementById('connectionsContainer'));
    }
    
    /**
     * Abre modal de card (novo ou edição)
     * @param {string|null} cardId - ID do card para edição
     */
    function openCardModal(cardId = null) {
        editingCardId = cardId;
        cardTags = [];
        customFields = [];
        
        const modal = document.getElementById('modalCard');
        const title = document.getElementById('modalCardTitle');
        const form = document.getElementById('formCard');
        
        // Popula select de tipos
        CardRenderer.populateTypeSelect(document.getElementById('cardType'));
        
        if (cardId) {
            // Modo edição
            const card = DataManager.getCardById(cardId);
            if (!card) return;
            
            title.textContent = 'Editar Card';
            document.getElementById('cardId').value = card.id;
            document.getElementById('cardTitle').value = card.title;
            document.getElementById('cardType').value = card.typeId;
            document.getElementById('cardSummary').value = card.summary || '';
            document.getElementById('cardContent').value = card.content || '';
            document.getElementById('cardColor').value = card.color || '#6366f1';
            document.getElementById('cardFavorite').checked = card.isFavorite || false;
            
            cardTags = [...(card.tags || [])];
            customFields = [...(card.customFields || [])];
            
            ConnectionsEditor.setConnections(card.connections, cardId);
        } else {
            // Modo criação
            title.textContent = 'Novo Card';
            form.reset();
            document.getElementById('cardId').value = '';
            document.getElementById('cardColor').value = '#6366f1';
            
            ConnectionsEditor.clear();
        }
        
        renderTags();
        renderCustomFields();
        openModal('modalCard');
    }
    
    /**
     * Manipula submit do formulário de card
     * @param {Event} e - Evento de submit
     */
    function handleCardSubmit(e) {
        e.preventDefault();
        
        const cardData = {
            title: document.getElementById('cardTitle').value.trim(),
            typeId: document.getElementById('cardType').value,
            summary: document.getElementById('cardSummary').value.trim(),
            content: document.getElementById('cardContent').value,
            color: document.getElementById('cardColor').value,
            isFavorite: document.getElementById('cardFavorite').checked,
            tags: cardTags,
            customFields: customFields,
            connections: ConnectionsEditor.validate()
        };
        
        if (!cardData.title) {
            showToast('O título é obrigatório', 'error');
            return;
        }
        
        if (editingCardId) {
            // Atualização
            DataManager.updateCard(editingCardId, cardData);
            showToast('Card atualizado com sucesso!', 'success');
        } else {
            // Criação
            DataManager.createCard(cardData);
            showToast('Card criado com sucesso!', 'success');
        }
        
        closeModal('modalCard');
    }
    
    /**
     * Adiciona uma tag
     * @param {string} tag - Tag a adicionar
     */
    function addTag(tag) {
        if (tag && !cardTags.includes(tag)) {
            cardTags.push(tag);
            renderTags();
        }
    }
    
    /**
     * Remove uma tag
     * @param {number} index - Índice da tag
     */
    function removeTag(index) {
        cardTags.splice(index, 1);
        renderTags();
    }
    
    /**
     * Renderiza tags
     */
    function renderTags() {
        const container = document.getElementById('cardTagsList');
        if (!container) return;
        
        container.innerHTML = cardTags.map((tag, index) => `
            <span class="tag-item">
                ${Utils.escapeHtml(tag)}
                <button type="button" class="tag-remove" data-index="${index}">&times;</button>
            </span>
        `).join('');
        
        container.querySelectorAll('.tag-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                removeTag(parseInt(btn.dataset.index));
            });
        });
    }
    
    /**
     * Adiciona campo customizado
     */
    function addCustomField() {
        customFields.push({ name: '', value: '' });
        renderCustomFields();
        
        // Foca no novo campo
        setTimeout(() => {
            const inputs = document.querySelectorAll('.custom-field-row:last-child input');
            if (inputs[0]) inputs[0].focus();
        }, 50);
    }
    
    /**
     * Remove campo customizado
     * @param {number} index - Índice do campo
     */
    function removeCustomField(index) {
        customFields.splice(index, 1);
        renderCustomFields();
    }
    
    /**
     * Renderiza campos customizados
     */
    function renderCustomFields() {
        const container = document.getElementById('customFieldsContainer');
        if (!container) return;
        
        container.innerHTML = customFields.map((field, index) => `
            <div class="custom-field-row" data-index="${index}">
                <input type="text" 
                       placeholder="Nome do campo" 
                       value="${Utils.escapeHtml(field.name)}"
                       class="field-name">
                <input type="text" 
                       placeholder="Valor" 
                       value="${Utils.escapeHtml(field.value)}"
                       class="field-value">
                <button type="button" class="btn-remove-field" data-index="${index}">✕</button>
            </div>
        `).join('');
        
        // Event listeners
        container.querySelectorAll('.custom-field-row').forEach(row => {
            const index = parseInt(row.dataset.index);
            
            row.querySelector('.field-name').addEventListener('input', (e) => {
                customFields[index].name = e.target.value;
            });
            
            row.querySelector('.field-value').addEventListener('input', (e) => {
                customFields[index].value = e.target.value;
            });
            
            row.querySelector('.btn-remove-field').addEventListener('click', () => {
                removeCustomField(index);
            });
        });
    }
    
    /**
     * Confirma exclusão de card
     * @param {string} cardId - ID do card
     */
    function confirmDeleteCard(cardId) {
        const card = DataManager.getCardById(cardId);
        if (!card) return;
        
        document.getElementById('confirmTitle').textContent = 'Excluir Card';
        document.getElementById('confirmMessage').textContent = 
            `Tem certeza que deseja excluir "${card.title}"? Esta ação não pode ser desfeita.`;
        
        const btnConfirm = document.getElementById('btnConfirmAction');
        const newBtn = btnConfirm.cloneNode(true);
        btnConfirm.parentNode.replaceChild(newBtn, btnConfirm);
        
        newBtn.addEventListener('click', () => {
            DataManager.deleteCard(cardId);
            closeModal('modalConfirm');
            showToast('Card excluído com sucesso!', 'success');
        });
        
        openModal('modalConfirm');
    }
    
    // ==================== MODAL DE TIPOS ====================
    
    /**
     * Configura modal de tipos
     */
    function setupTypesModal() {
        document.getElementById('btnManageTypes')?.addEventListener('click', () => {
            renderTypesList();
            openModal('modalTypes');
        });
        
        document.getElementById('btnCreateType')?.addEventListener('click', createType);
    }
    
    /**
     * Renderiza lista de tipos
     */
    function renderTypesList() {
        const container = document.getElementById('typesList');
        if (!container) return;
        
        const types = DataManager.getAllTypes();
        container.innerHTML = '';
        
        types.forEach(type => {
            const element = CardRenderer.renderTypeItem(type);
            
            // Event listeners
            element.querySelector('[data-action="edit"]')?.addEventListener('click', () => {
                editType(type.id);
            });
            
            element.querySelector('[data-action="delete"]')?.addEventListener('click', () => {
                confirmDeleteType(type.id);
            });
            
            container.appendChild(element);
        });
    }
    
    /**
     * Cria novo tipo
     */
    function createType() {
        const name = document.getElementById('newTypeName').value.trim();
        const icon = document.getElementById('newTypeIcon').value.trim() || '📄';
        const color = document.getElementById('newTypeColor').value;
        
        if (!name) {
            showToast('Nome do tipo é obrigatório', 'error');
            return;
        }
        
        DataManager.createType({ name, icon, color });
        
        // Limpa formulário
        document.getElementById('newTypeName').value = '';
        document.getElementById('newTypeIcon').value = '';
        document.getElementById('newTypeColor').value = '#6366f1';
        
        renderTypesList();
        showToast('Tipo criado com sucesso!', 'success');
    }
    
    /**
     * Edita um tipo
     * @param {string} typeId - ID do tipo
     */
    function editType(typeId) {
        const type = DataManager.getTypeById(typeId);
        if (!type || type.isDefault) return;
        
        const name = prompt('Nome do tipo:', type.name);
        if (name === null) return;
        
        const icon = prompt('Ícone (emoji):', type.icon);
        if (icon === null) return;
        
        DataManager.updateType(typeId, { 
            name: name.trim() || type.name, 
            icon: icon.trim() || type.icon 
        });
        
        renderTypesList();
        showToast('Tipo atualizado!', 'success');
    }
    
    /**
     * Confirma exclusão de tipo
     * @param {string} typeId - ID do tipo
     */
    function confirmDeleteType(typeId) {
        const type = DataManager.getTypeById(typeId);
        if (!type || type.isDefault) return;
        
        const count = DataManager.countCardsByType(typeId);
        
        if (confirm(`Excluir tipo "${type.name}"?\n${count > 0 ? `${count} card(s) serão movidos para "NPC".` : ''}`)) {
            DataManager.deleteType(typeId);
            renderTypesList();
            showToast('Tipo excluído!', 'success');
        }
    }
    
    // ==================== IMPORTAÇÃO / EXPORTAÇÃO ====================
    
    /**
     * Configura import/export
     */
    function setupImportExport() {
        // Export
        document.getElementById('btnExport')?.addEventListener('click', exportData);
        
        // Import
        document.getElementById('btnImport')?.addEventListener('click', () => {
            openModal('modalImport');
        });
        
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        
        document.getElementById('btnSelectFile')?.addEventListener('click', () => {
            fileInput?.click();
        });
        
        fileInput?.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                handleImportFile(e.target.files[0]);
            }
        });
        
        // Drag and drop
        dropZone?.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
        
        dropZone?.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });
        
        dropZone?.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            
            if (e.dataTransfer.files[0]) {
                handleImportFile(e.dataTransfer.files[0]);
            }
        });
    }
    
    /**
     * Exporta dados
     */
    function exportData() {
        const data = DataManager.exportData();
        const settings = DataManager.getSettings();
        const filename = `rpg-cards-${settings.sessionName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
        
        Utils.downloadJson(data, filename);
        showToast('Dados exportados com sucesso!', 'success');
    }
    
    /**
     * Manipula arquivo de importação
     * @param {File} file - Arquivo
     */
    async function handleImportFile(file) {
        try {
            const data = await Utils.readJsonFile(file);
            const mode = document.querySelector('input[name="importMode"]:checked')?.value || 'replace';
            
            const result = DataManager.importData(data, mode);
            
            if (result.success) {
                closeModal('modalImport');
                ViewManager.refreshCurrentView();
                showToast(`${result.count} cards importados com sucesso!`, 'success');
            } else {
                showToast(`Erro na importação: ${result.error}`, 'error');
            }
        } catch (error) {
            showToast(`Erro ao ler arquivo: ${error.message}`, 'error');
        }
        
        // Limpa input
        document.getElementById('fileInput').value = '';
    }
    
    // ==================== TEMA ====================
    
    /**
     * Configura toggle de tema
     */
    function setupThemeToggle() {
        const btn = document.getElementById('btnTheme');
        const settings = DataManager.getSettings();
        
        // Aplica tema salvo
        document.documentElement.dataset.theme = settings.theme || 'dark';
        updateThemeButton();
        
        btn?.addEventListener('click', toggleTheme);
    }
    
    /**
     * Alterna tema
     */
    function toggleTheme() {
        const currentTheme = document.documentElement.dataset.theme;
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.dataset.theme = newTheme;
        DataManager.updateSettings({ theme: newTheme });
        updateThemeButton();
    }
    
    /**
     * Atualiza botão de tema
     */
    function updateThemeButton() {
        const btn = document.getElementById('btnTheme');
        const isDark = document.documentElement.dataset.theme === 'dark';
        if (btn) {
            btn.textContent = isDark ? '☀️' : '🌙';
            btn.title = isDark ? 'Tema Claro' : 'Tema Escuro';
        }
    }
    
    // ==================== BUSCA ====================
    
    /**
     * Configura busca global
     */
    function setupSearch() {
        const input = document.getElementById('globalSearch');
        
        input?.addEventListener('input', Utils.debounce((e) => {
            const query = e.target.value.trim();
            
            if (ViewManager.getCurrentView() === 'grid') {
                ViewManager.refreshGridView({ query });
            }
        }, 300));
        
        // Ctrl+K para focar na busca
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                input?.focus();
            }
        });
    }
    
    // ==================== ATALHOS DE TECLADO ====================
    
    /**
     * Configura atalhos de teclado
     */
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ignora se está em input
            if (e.target.matches('input, textarea, select')) return;
            
            switch (e.key) {
                case 'n':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        openCardModal();
                    }
                    break;
                case '1':
                    if (e.altKey) {
                        e.preventDefault();
                        ViewManager.switchView('grid');
                    }
                    break;
                case '2':
                    if (e.altKey) {
                        e.preventDefault();
                        ViewManager.switchView('graph');
                    }
                    break;
                case '3':
                    if (e.altKey) {
                        e.preventDefault();
                        ViewManager.switchView('detail');
                    }
                    break;
            }
        });
    }
    
    // ==================== TOAST NOTIFICATIONS ====================
    
    /**
     * Mostra uma notificação toast
     * @param {string} message - Mensagem
     * @param {string} type - Tipo (success, error, info)
     * @param {number} duration - Duração em ms
     */
    function showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '✓',
            error: '✕',
            info: 'ℹ'
        };
        
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${Utils.escapeHtml(message)}</span>
            <button class="toast-close">&times;</button>
        `;
        
        container.appendChild(toast);
        
        // Event listener para fechar
        toast.querySelector('.toast-close').addEventListener('click', () => {
            removeToast(toast);
        });
        
        // Auto-remove
        setTimeout(() => removeToast(toast), duration);
    }
    
    /**
     * Remove um toast
     * @param {HTMLElement} toast - Elemento do toast
     */
    function removeToast(toast) {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }
    
    // ==================== API PÚBLICA ====================
    return {
        init,
        openModal,
        closeModal,
        openCardModal,
        showToast
    };
})();

// Expor globalmente
window.UI = UI;
