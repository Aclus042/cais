/* ============================================
   RPG Card Canvas — Renderização de Cards
   ============================================ */

/**
 * Módulo de renderização de cards
 */
const CardRenderer = (function() {
    
    /**
     * Renderiza um card para o grid
     * @param {Object} card - Dados do card
     * @returns {HTMLElement} Elemento do card
     */
    function renderGridCard(card) {
        const type = DataManager.getTypeById(card.typeId);
        const element = document.createElement('div');
        element.className = 'card';
        element.dataset.cardId = card.id;
        element.style.setProperty('--card-color', card.color || type?.color || '#6366f1');
        
        const connectionsCount = card.connections.length;
        const incomingCount = DataManager.getIncomingConnections(card.id).length;
        const totalConnections = connectionsCount + incomingCount;
        
        element.innerHTML = `
            <div class="card-header">
                <div class="card-icon">${type?.icon || '📄'}</div>
                <div class="card-title-group">
                    <div class="card-type">${Utils.escapeHtml(type?.name || 'Card')}</div>
                    <div class="card-title">${Utils.escapeHtml(card.title)}</div>
                </div>
                <div class="card-actions">
                    <button class="card-action-btn ${card.isFavorite ? 'favorite' : ''}" 
                            data-action="favorite" title="Favoritar">
                        ${card.isFavorite ? '★' : '☆'}
                    </button>
                    <button class="card-action-btn" data-action="edit" title="Editar">✏️</button>
                </div>
            </div>
            ${card.summary ? `
                <div class="card-summary">${Utils.escapeHtml(card.summary)}</div>
            ` : ''}
            ${card.tags.length > 0 ? `
                <div class="card-tags">
                    ${card.tags.slice(0, 4).map(tag => `
                        <span class="card-tag">${Utils.escapeHtml(tag)}</span>
                    `).join('')}
                    ${card.tags.length > 4 ? `
                        <span class="card-tag">+${card.tags.length - 4}</span>
                    ` : ''}
                </div>
            ` : ''}
            ${totalConnections > 0 ? `
                <div class="card-connections">
                    <span class="card-connection-count" title="${totalConnections} conexões">
                        🔗 ${totalConnections}
                    </span>
                </div>
            ` : ''}
        `;
        
        // Event listeners
        element.addEventListener('click', (e) => {
            if (e.target.closest('[data-action]')) {
                const action = e.target.closest('[data-action]').dataset.action;
                handleCardAction(card.id, action);
            } else {
                openCardDetail(card.id);
            }
        });
        
        return element;
    }
    
    /**
     * Renderiza detalhes do card
     * @param {Object} card - Dados do card
     * @returns {string} HTML do detalhe
     */
    function renderCardDetail(card) {
        const type = DataManager.getTypeById(card.typeId);
        const connections = DataManager.getCardConnections(card.id);
        const incomingConnections = DataManager.getIncomingConnections(card.id);
        
        let html = `
            <div class="detail-title-row">
                <div class="detail-icon" style="background: ${card.color}20; color: ${card.color}">
                    ${type?.icon || '📄'}
                </div>
                <div class="detail-title-group">
                    <div class="detail-type" style="color: ${card.color}">
                        ${Utils.escapeHtml(type?.name || 'Card')}
                    </div>
                    <h1 class="detail-title">${Utils.escapeHtml(card.title)}</h1>
                </div>
            </div>
        `;
        
        if (card.summary) {
            html += `
                <div class="detail-summary" style="border-left-color: ${card.color}">
                    ${Utils.escapeHtml(card.summary)}
                </div>
            `;
        }
        
        if (card.content) {
            html += `
                <div class="detail-content">
                    ${MarkdownParser.parse(card.content)}
                </div>
            `;
        }
        
        if (card.customFields && card.customFields.length > 0) {
            html += `
                <div class="detail-custom-fields">
                    <h4>Informações Adicionais</h4>
                    ${card.customFields.map(field => `
                        <div class="custom-field-item">
                            <span class="custom-field-label">${Utils.escapeHtml(field.name)}:</span>
                            <span class="custom-field-value">${Utils.escapeHtml(field.value)}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (card.tags.length > 0) {
            html += `
                <div class="detail-tags">
                    ${card.tags.map(tag => `
                        <span class="detail-tag">${Utils.escapeHtml(tag)}</span>
                    `).join('')}
                </div>
            `;
        }
        
        return html;
    }
    
    /**
     * Renderiza conexões do card
     * @param {Object} card - Dados do card
     * @returns {string} HTML das conexões
     */
    function renderCardConnections(card) {
        const connections = DataManager.getCardConnections(card.id);
        const incomingConnections = DataManager.getIncomingConnections(card.id);
        
        if (connections.length === 0 && incomingConnections.length === 0) {
            return `
                <div class="no-connections">
                    <div class="no-connections-icon">🔗</div>
                    <p>Nenhuma conexão</p>
                </div>
            `;
        }
        
        let html = '<h3>🔗 Conexões</h3><div class="connections-grid">';
        
        // Conexões de saída
        connections.forEach(conn => {
            const targetType = DataManager.getTypeById(conn.targetCard.typeId);
            html += `
                <div class="connection-card" data-card-id="${conn.targetCard.id}">
                    <div class="connection-icon">${targetType?.icon || '📄'}</div>
                    <div class="connection-info">
                        <div class="connection-name">${Utils.escapeHtml(conn.targetCard.title)}</div>
                        <div class="connection-relation">→ ${Utils.escapeHtml(conn.relation)}</div>
                    </div>
                    <span class="connection-arrow">→</span>
                </div>
            `;
        });
        
        // Conexões de entrada
        incomingConnections.forEach(conn => {
            const sourceType = DataManager.getTypeById(conn.sourceCard.typeId);
            html += `
                <div class="connection-card" data-card-id="${conn.sourceCard.id}">
                    <div class="connection-icon">${sourceType?.icon || '📄'}</div>
                    <div class="connection-info">
                        <div class="connection-name">${Utils.escapeHtml(conn.sourceCard.title)}</div>
                        <div class="connection-relation">← ${Utils.escapeHtml(conn.relation)}</div>
                    </div>
                    <span class="connection-arrow">→</span>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }
    
    /**
     * Renderiza card para o grafo
     * @param {Object} card - Dados do card
     * @returns {HTMLElement} Nó do grafo
     */
    function renderGraphNode(card) {
        const type = DataManager.getTypeById(card.typeId);
        const element = document.createElement('div');
        element.className = 'graph-node';
        element.dataset.cardId = card.id;
        element.style.setProperty('--node-color', card.color || type?.color || '#6366f1');
        element.style.left = `${card.position?.x || 100}px`;
        element.style.top = `${card.position?.y || 100}px`;
        
        element.innerHTML = `
            <div class="graph-node-header">
                <div class="graph-node-icon">${type?.icon || '📄'}</div>
                <div>
                    <div class="graph-node-type">${Utils.escapeHtml(type?.name || 'Card')}</div>
                    <div class="graph-node-title">${Utils.escapeHtml(card.title)}</div>
                </div>
            </div>
            ${card.summary ? `
                <div class="graph-node-summary">${Utils.escapeHtml(card.summary)}</div>
            ` : ''}
        `;
        
        return element;
    }
    
    /**
     * Renderiza item na sidebar (favoritos/recentes)
     * @param {Object} card - Dados do card
     * @param {string} className - Classe CSS
     * @returns {HTMLElement} Elemento
     */
    function renderSidebarItem(card, className) {
        const type = DataManager.getTypeById(card.typeId);
        const element = document.createElement('div');
        element.className = className;
        element.dataset.cardId = card.id;
        
        element.innerHTML = `
            <span class="type-icon">${type?.icon || '📄'}</span>
            <span class="item-title">${Utils.escapeHtml(card.title)}</span>
        `;
        
        element.addEventListener('click', () => openCardDetail(card.id));
        
        return element;
    }
    
    /**
     * Renderiza item de tipo
     * @param {Object} type - Dados do tipo
     * @returns {HTMLElement} Elemento
     */
    function renderTypeItem(type) {
        const count = DataManager.countCardsByType(type.id);
        const element = document.createElement('div');
        element.className = 'type-item';
        element.dataset.typeId = type.id;
        
        element.innerHTML = `
            <div class="type-icon-preview">${type.icon}</div>
            <div class="type-info">
                <div class="type-name">${Utils.escapeHtml(type.name)}</div>
                <div class="type-count">${count} card${count !== 1 ? 's' : ''}</div>
            </div>
            <div class="type-color-preview" style="background: ${type.color}"></div>
            <div class="type-actions">
                ${!type.isDefault ? `
                    <button class="type-action-btn" data-action="edit" title="Editar">✏️</button>
                    <button class="type-action-btn danger" data-action="delete" title="Excluir">🗑️</button>
                ` : ''}
            </div>
        `;
        
        return element;
    }
    
    /**
     * Abre detalhe do card
     * @param {string} cardId - ID do card
     */
    function openCardDetail(cardId) {
        const card = DataManager.getCardById(cardId);
        if (!card) return;
        
        DataManager.addToHistory(cardId);
        Utils.EventBus.emit('card:opened', card);
    }
    
    /**
     * Manipula ação do card
     * @param {string} cardId - ID do card
     * @param {string} action - Ação
     */
    function handleCardAction(cardId, action) {
        switch (action) {
            case 'favorite':
                DataManager.toggleFavorite(cardId);
                break;
            case 'edit':
                Utils.EventBus.emit('card:edit', { cardId });
                break;
            case 'delete':
                Utils.EventBus.emit('card:confirmDelete', { cardId });
                break;
        }
    }
    
    /**
     * Preenche dropdown de tipos
     * @param {HTMLSelectElement} select - Elemento select
     * @param {string} selectedId - ID selecionado
     */
    function populateTypeSelect(select, selectedId = null) {
        const types = DataManager.getAllTypes();
        select.innerHTML = types.map(type => `
            <option value="${type.id}" ${type.id === selectedId ? 'selected' : ''}>
                ${type.icon} ${type.name}
            </option>
        `).join('');
    }
    
    /**
     * Preenche dropdown de cards (para conexões)
     * @param {HTMLSelectElement} select - Elemento select
     * @param {string} excludeId - ID a excluir
     * @param {string} selectedId - ID selecionado
     */
    function populateCardSelect(select, excludeId = null, selectedId = null) {
        const cards = DataManager.getAllCards().filter(c => c.id !== excludeId);
        const types = DataManager.getAllTypes();
        
        select.innerHTML = '<option value="">Selecione um card...</option>';
        
        // Agrupa por tipo
        types.forEach(type => {
            const typeCards = cards.filter(c => c.typeId === type.id);
            if (typeCards.length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = `${type.icon} ${type.name}`;
                
                typeCards.forEach(card => {
                    const option = document.createElement('option');
                    option.value = card.id;
                    option.textContent = card.title;
                    if (card.id === selectedId) option.selected = true;
                    optgroup.appendChild(option);
                });
                
                select.appendChild(optgroup);
            }
        });
    }
    
    // API Pública
    return {
        renderGridCard,
        renderCardDetail,
        renderCardConnections,
        renderGraphNode,
        renderSidebarItem,
        renderTypeItem,
        openCardDetail,
        handleCardAction,
        populateTypeSelect,
        populateCardSelect
    };
})();

// Expor globalmente
window.CardRenderer = CardRenderer;
