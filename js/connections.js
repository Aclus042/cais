/* ============================================
   RPG Card Canvas — Gerenciamento de Conexões
   ============================================ */

/**
 * Módulo de gerenciamento de conexões no editor
 */
const ConnectionsEditor = (function() {
    
    let container = null;
    let currentCardId = null;
    let connections = [];
    
    /**
     * Inicializa o editor de conexões
     * @param {HTMLElement} containerEl - Container das conexões
     */
    function init(containerEl) {
        container = containerEl;
    }
    
    /**
     * Define as conexões atuais
     * @param {Array} conns - Lista de conexões
     * @param {string} cardId - ID do card atual
     */
    function setConnections(conns, cardId) {
        connections = conns ? [...conns] : [];
        currentCardId = cardId;
        render();
    }
    
    /**
     * Obtém as conexões atuais
     * @returns {Array} Lista de conexões
     */
    function getConnections() {
        return [...connections];
    }
    
    /**
     * Renderiza o editor de conexões
     */
    function render() {
        if (!container) return;
        
        container.innerHTML = connections.map((conn, index) => {
            const targetCard = DataManager.getCardById(conn.targetId);
            const targetType = targetCard ? DataManager.getTypeById(targetCard.typeId) : null;
            
            return `
                <div class="connection-row" data-index="${index}">
                    <select class="connection-target" data-index="${index}">
                        ${renderCardOptions(conn.targetId)}
                    </select>
                    <input type="text" 
                           class="connection-relation" 
                           data-index="${index}"
                           value="${Utils.escapeHtml(conn.relation || '')}" 
                           placeholder="Relação (ex: conhece)">
                    <div class="connection-direction">
                        <button type="button" 
                                class="direction-btn ${!conn.bidirectional ? 'active' : ''}" 
                                data-index="${index}"
                                data-direction="single"
                                title="Conexão única">→</button>
                        <button type="button" 
                                class="direction-btn ${conn.bidirectional ? 'active' : ''}" 
                                data-index="${index}"
                                data-direction="bidirectional"
                                title="Conexão bidirecional">↔</button>
                    </div>
                    <button type="button" 
                            class="btn-remove-connection" 
                            data-index="${index}"
                            title="Remover conexão">✕</button>
                </div>
            `;
        }).join('');
        
        // Adiciona event listeners
        container.querySelectorAll('.connection-target').forEach(select => {
            select.addEventListener('change', handleTargetChange);
        });
        
        container.querySelectorAll('.connection-relation').forEach(input => {
            input.addEventListener('input', handleRelationChange);
        });
        
        container.querySelectorAll('.direction-btn').forEach(btn => {
            btn.addEventListener('click', handleDirectionChange);
        });
        
        container.querySelectorAll('.btn-remove-connection').forEach(btn => {
            btn.addEventListener('click', handleRemove);
        });
    }
    
    /**
     * Renderiza opções de cards
     * @param {string} selectedId - ID selecionado
     * @returns {string} HTML das opções
     */
    function renderCardOptions(selectedId) {
        const cards = DataManager.getAllCards().filter(c => c.id !== currentCardId);
        const types = DataManager.getAllTypes();
        
        let html = '<option value="">Selecione um card...</option>';
        
        types.forEach(type => {
            const typeCards = cards.filter(c => c.typeId === type.id);
            if (typeCards.length > 0) {
                html += `<optgroup label="${type.icon} ${Utils.escapeHtml(type.name)}">`;
                typeCards.forEach(card => {
                    html += `<option value="${card.id}" ${card.id === selectedId ? 'selected' : ''}>
                        ${Utils.escapeHtml(card.title)}
                    </option>`;
                });
                html += '</optgroup>';
            }
        });
        
        return html;
    }
    
    /**
     * Adiciona nova conexão
     */
    function addConnection() {
        connections.push({
            targetId: '',
            relation: '',
            bidirectional: false
        });
        render();
        
        // Foca no select da nova conexão
        const lastSelect = container.querySelector('.connection-row:last-child .connection-target');
        if (lastSelect) lastSelect.focus();
    }
    
    /**
     * Manipula mudança de target
     * @param {Event} e - Evento
     */
    function handleTargetChange(e) {
        const index = parseInt(e.target.dataset.index);
        connections[index].targetId = e.target.value;
    }
    
    /**
     * Manipula mudança de relação
     * @param {Event} e - Evento
     */
    function handleRelationChange(e) {
        const index = parseInt(e.target.dataset.index);
        connections[index].relation = e.target.value;
    }
    
    /**
     * Manipula mudança de direção
     * @param {Event} e - Evento
     */
    function handleDirectionChange(e) {
        const index = parseInt(e.target.dataset.index);
        const direction = e.target.dataset.direction;
        connections[index].bidirectional = direction === 'bidirectional';
        
        // Atualiza botões ativos
        const row = e.target.closest('.connection-row');
        row.querySelectorAll('.direction-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.direction === direction);
        });
    }
    
    /**
     * Manipula remoção de conexão
     * @param {Event} e - Evento
     */
    function handleRemove(e) {
        const index = parseInt(e.target.dataset.index);
        connections.splice(index, 1);
        render();
    }
    
    /**
     * Valida conexões (remove inválidas)
     * @returns {Array} Conexões válidas
     */
    function validate() {
        return connections.filter(conn => {
            return conn.targetId && 
                   conn.targetId !== currentCardId && 
                   DataManager.getCardById(conn.targetId);
        });
    }
    
    /**
     * Limpa o editor
     */
    function clear() {
        connections = [];
        currentCardId = null;
        if (container) container.innerHTML = '';
    }
    
    // API Pública
    return {
        init,
        setConnections,
        getConnections,
        addConnection,
        validate,
        clear,
        render
    };
})();

// Expor globalmente
window.ConnectionsEditor = ConnectionsEditor;
