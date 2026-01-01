/* ============================================
   RPG Card Canvas — Gerenciamento de Dados
   ============================================ */

/**
 * Módulo de gerenciamento de dados
 * Responsável por todas as operações CRUD e persistência
 */
const DataManager = (function() {
    // ==================== CONSTANTES ====================
    const STORAGE_KEYS = {
        CARDS: 'rpg_cards',
        TYPES: 'rpg_types',
        SESSION: 'rpg_session',
        SETTINGS: 'rpg_settings',
        HISTORY: 'rpg_history',
        FAVORITES: 'rpg_favorites'
    };

    const VERSION = '1.0.0';

    // ==================== TIPOS PADRÃO ====================
    const DEFAULT_TYPES = [
        { id: 'sinopse', name: 'Sinopse', icon: '📜', color: '#6366f1', isDefault: true },
        { id: 'cena', name: 'Cena', icon: '🎬', color: '#8b5cf6', isDefault: true },
        { id: 'npc', name: 'NPC', icon: '👤', color: '#f59e0b', isDefault: true },
        { id: 'local', name: 'Local', icon: '🏛️', color: '#22c55e', isDefault: true },
        { id: 'criatura', name: 'Criatura', icon: '🐉', color: '#ef4444', isDefault: true },
        { id: 'faccao', name: 'Facção', icon: '⚔️', color: '#3b82f6', isDefault: true },
        { id: 'item', name: 'Item', icon: '🎁', color: '#eab308', isDefault: true },
        { id: 'evento', name: 'Evento', icon: '⚡', color: '#ec4899', isDefault: true },
        { id: 'pista', name: 'Pista', icon: '🔍', color: '#06b6d4', isDefault: true },
        { id: 'missao', name: 'Missão', icon: '🎯', color: '#14b8a6', isDefault: true },
        { id: 'recurso', name: 'Recurso Narrativo', icon: '✨', color: '#a855f7', isDefault: true }
    ];

    const DEFAULT_SETTINGS = {
        theme: 'dark',
        gridSize: 'medium',
        autoSave: true,
        sessionName: 'Nova Sessão'
    };

    // ==================== ESTADO ====================
    let cards = [];
    let types = [];
    let settings = {};
    let history = [];
    let favorites = [];

    // ==================== INICIALIZAÇÃO ====================
    
    /**
     * Inicializa o módulo de dados
     */
    function init() {
        loadAllData();
        setupAutoSave();
        console.log('DataManager inicializado');
    }

    /**
     * Carrega todos os dados do localStorage
     */
    function loadAllData() {
        cards = Utils.storage.get(STORAGE_KEYS.CARDS, []);
        types = Utils.storage.get(STORAGE_KEYS.TYPES, DEFAULT_TYPES);
        settings = Utils.storage.get(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
        history = Utils.storage.get(STORAGE_KEYS.HISTORY, []);
        favorites = Utils.storage.get(STORAGE_KEYS.FAVORITES, []);

        // Garante que tipos padrão existam
        ensureDefaultTypes();
    }

    /**
     * Garante que os tipos padrão existam
     */
    function ensureDefaultTypes() {
        DEFAULT_TYPES.forEach(defaultType => {
            if (!types.find(t => t.id === defaultType.id)) {
                types.push(defaultType);
            }
        });
        saveTypes();
    }

    /**
     * Configura auto-save
     */
    function setupAutoSave() {
        // Salva a cada mudança via EventBus
        Utils.EventBus.on('data:changed', Utils.debounce(() => {
            if (settings.autoSave) {
                saveAllData();
            }
        }, 500));
    }

    /**
     * Salva todos os dados
     */
    function saveAllData() {
        Utils.storage.set(STORAGE_KEYS.CARDS, cards);
        Utils.storage.set(STORAGE_KEYS.TYPES, types);
        Utils.storage.set(STORAGE_KEYS.SETTINGS, settings);
        Utils.storage.set(STORAGE_KEYS.HISTORY, history);
        Utils.storage.set(STORAGE_KEYS.FAVORITES, favorites);
    }

    // ==================== CARDS CRUD ====================

    /**
     * Cria um novo card
     * @param {Object} cardData - Dados do card
     * @returns {Object} Card criado
     */
    function createCard(cardData) {
        const now = Date.now();
        const card = {
            id: Utils.generateId(),
            title: cardData.title || 'Novo Card',
            typeId: cardData.typeId || 'npc',
            summary: cardData.summary || '',
            content: cardData.content || '',
            tags: cardData.tags || [],
            customFields: cardData.customFields || [],
            connections: cardData.connections || [],
            color: cardData.color || getTypeById(cardData.typeId)?.color || '#6366f1',
            isFavorite: cardData.isFavorite || false,
            position: cardData.position || { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
            createdAt: now,
            updatedAt: now
        };

        cards.push(card);
        saveCards();
        addToHistory(card.id);
        Utils.EventBus.emit('card:created', card);
        Utils.EventBus.emit('data:changed');
        
        return card;
    }

    /**
     * Atualiza um card existente
     * @param {string} cardId - ID do card
     * @param {Object} updates - Atualizações
     * @returns {Object|null} Card atualizado ou null
     */
    function updateCard(cardId, updates) {
        const index = cards.findIndex(c => c.id === cardId);
        if (index === -1) return null;

        const updatedCard = {
            ...cards[index],
            ...updates,
            updatedAt: Date.now()
        };

        cards[index] = updatedCard;
        saveCards();
        Utils.EventBus.emit('card:updated', updatedCard);
        Utils.EventBus.emit('data:changed');
        
        return updatedCard;
    }

    /**
     * Deleta um card
     * @param {string} cardId - ID do card
     * @returns {boolean} Sucesso
     */
    function deleteCard(cardId) {
        const index = cards.findIndex(c => c.id === cardId);
        if (index === -1) return false;

        const deletedCard = cards[index];
        cards.splice(index, 1);

        // Remove conexões que apontam para este card
        cards.forEach(card => {
            card.connections = card.connections.filter(conn => conn.targetId !== cardId);
        });

        // Remove dos favoritos
        removeFavorite(cardId);

        saveCards();
        Utils.EventBus.emit('card:deleted', deletedCard);
        Utils.EventBus.emit('data:changed');
        
        return true;
    }

    /**
     * Obtém um card por ID
     * @param {string} cardId - ID do card
     * @returns {Object|null} Card ou null
     */
    function getCardById(cardId) {
        return cards.find(c => c.id === cardId) || null;
    }

    /**
     * Obtém todos os cards
     * @returns {Array} Lista de cards
     */
    function getAllCards() {
        return [...cards];
    }

    /**
     * Filtra cards
     * @param {Object} filters - Filtros a aplicar
     * @returns {Array} Cards filtrados
     */
    function filterCards(filters = {}) {
        let result = [...cards];

        if (filters.typeId) {
            result = result.filter(c => c.typeId === filters.typeId);
        }

        if (filters.tags && filters.tags.length > 0) {
            result = result.filter(c => 
                filters.tags.some(tag => c.tags.includes(tag))
            );
        }

        if (filters.query) {
            result = Utils.filterByText(result, filters.query, ['title', 'summary', 'content']);
        }

        if (filters.favorites) {
            result = result.filter(c => c.isFavorite);
        }

        return result;
    }

    /**
     * Busca cards por texto
     * @param {string} query - Termo de busca
     * @returns {Array} Cards encontrados
     */
    function searchCards(query) {
        if (!query) return getAllCards();
        return Utils.filterByText(cards, query, ['title', 'summary', 'content', 'tags']);
    }

    /**
     * Salva cards no localStorage
     */
    function saveCards() {
        Utils.storage.set(STORAGE_KEYS.CARDS, cards);
    }

    // ==================== TIPOS CRUD ====================

    /**
     * Cria um novo tipo
     * @param {Object} typeData - Dados do tipo
     * @returns {Object} Tipo criado
     */
    function createType(typeData) {
        const type = {
            id: Utils.generateId(),
            name: typeData.name || 'Novo Tipo',
            icon: typeData.icon || '📄',
            color: typeData.color || Utils.randomColor(),
            isDefault: false,
            customFields: typeData.customFields || []
        };

        types.push(type);
        saveTypes();
        Utils.EventBus.emit('type:created', type);
        Utils.EventBus.emit('data:changed');
        
        return type;
    }

    /**
     * Atualiza um tipo
     * @param {string} typeId - ID do tipo
     * @param {Object} updates - Atualizações
     * @returns {Object|null} Tipo atualizado ou null
     */
    function updateType(typeId, updates) {
        const index = types.findIndex(t => t.id === typeId);
        if (index === -1) return null;

        types[index] = { ...types[index], ...updates };
        saveTypes();
        Utils.EventBus.emit('type:updated', types[index]);
        Utils.EventBus.emit('data:changed');
        
        return types[index];
    }

    /**
     * Deleta um tipo (apenas não-padrão)
     * @param {string} typeId - ID do tipo
     * @returns {boolean} Sucesso
     */
    function deleteType(typeId) {
        const index = types.findIndex(t => t.id === typeId);
        if (index === -1 || types[index].isDefault) return false;

        const deletedType = types[index];
        types.splice(index, 1);

        // Move cards deste tipo para 'npc' (tipo padrão)
        cards.forEach(card => {
            if (card.typeId === typeId) {
                card.typeId = 'npc';
            }
        });

        saveTypes();
        saveCards();
        Utils.EventBus.emit('type:deleted', deletedType);
        Utils.EventBus.emit('data:changed');
        
        return true;
    }

    /**
     * Obtém um tipo por ID
     * @param {string} typeId - ID do tipo
     * @returns {Object|null} Tipo ou null
     */
    function getTypeById(typeId) {
        return types.find(t => t.id === typeId) || null;
    }

    /**
     * Obtém todos os tipos
     * @returns {Array} Lista de tipos
     */
    function getAllTypes() {
        return [...types];
    }

    /**
     * Conta cards por tipo
     * @param {string} typeId - ID do tipo
     * @returns {number} Quantidade de cards
     */
    function countCardsByType(typeId) {
        return cards.filter(c => c.typeId === typeId).length;
    }

    /**
     * Salva tipos no localStorage
     */
    function saveTypes() {
        Utils.storage.set(STORAGE_KEYS.TYPES, types);
    }

    // ==================== CONEXÕES ====================

    /**
     * Adiciona uma conexão entre cards
     * @param {string} sourceId - ID do card de origem
     * @param {string} targetId - ID do card de destino
     * @param {Object} connectionData - Dados da conexão
     * @returns {boolean} Sucesso
     */
    function addConnection(sourceId, targetId, connectionData = {}) {
        const sourceCard = getCardById(sourceId);
        const targetCard = getCardById(targetId);
        
        if (!sourceCard || !targetCard || sourceId === targetId) return false;

        // Verifica se já existe
        const exists = sourceCard.connections.some(c => c.targetId === targetId);
        if (exists) return false;

        const connection = {
            targetId,
            relation: connectionData.relation || 'conecta a',
            bidirectional: connectionData.bidirectional || false
        };

        sourceCard.connections.push(connection);

        // Se bidirecional, adiciona conexão reversa
        if (connection.bidirectional) {
            const reverseExists = targetCard.connections.some(c => c.targetId === sourceId);
            if (!reverseExists) {
                targetCard.connections.push({
                    targetId: sourceId,
                    relation: connectionData.reverseRelation || connection.relation,
                    bidirectional: true
                });
            }
        }

        saveCards();
        Utils.EventBus.emit('connection:created', { sourceId, targetId, connection });
        Utils.EventBus.emit('data:changed');
        
        return true;
    }

    /**
     * Remove uma conexão
     * @param {string} sourceId - ID do card de origem
     * @param {string} targetId - ID do card de destino
     * @returns {boolean} Sucesso
     */
    function removeConnection(sourceId, targetId) {
        const sourceCard = getCardById(sourceId);
        if (!sourceCard) return false;

        const initialLength = sourceCard.connections.length;
        sourceCard.connections = sourceCard.connections.filter(c => c.targetId !== targetId);

        if (sourceCard.connections.length === initialLength) return false;

        saveCards();
        Utils.EventBus.emit('connection:deleted', { sourceId, targetId });
        Utils.EventBus.emit('data:changed');
        
        return true;
    }

    /**
     * Obtém todas as conexões de um card
     * @param {string} cardId - ID do card
     * @returns {Array} Lista de conexões expandidas
     */
    function getCardConnections(cardId) {
        const card = getCardById(cardId);
        if (!card) return [];

        return card.connections.map(conn => {
            const targetCard = getCardById(conn.targetId);
            return {
                ...conn,
                targetCard: targetCard || null
            };
        }).filter(conn => conn.targetCard);
    }

    /**
     * Obtém conexões que apontam para um card
     * @param {string} cardId - ID do card
     * @returns {Array} Lista de conexões de entrada
     */
    function getIncomingConnections(cardId) {
        const result = [];
        cards.forEach(card => {
            card.connections.forEach(conn => {
                if (conn.targetId === cardId) {
                    result.push({
                        sourceId: card.id,
                        sourceCard: card,
                        relation: conn.relation
                    });
                }
            });
        });
        return result;
    }

    /**
     * Obtém total de conexões
     * @returns {number} Total de conexões
     */
    function getTotalConnections() {
        return cards.reduce((total, card) => total + card.connections.length, 0);
    }

    // ==================== TAGS ====================

    /**
     * Obtém todas as tags únicas
     * @returns {Array} Lista de tags
     */
    function getAllTags() {
        const tagSet = new Set();
        cards.forEach(card => {
            card.tags.forEach(tag => tagSet.add(tag));
        });
        return Array.from(tagSet).sort();
    }

    // ==================== FAVORITOS ====================

    /**
     * Alterna favorito
     * @param {string} cardId - ID do card
     * @returns {boolean} Novo estado de favorito
     */
    function toggleFavorite(cardId) {
        const card = getCardById(cardId);
        if (!card) return false;

        card.isFavorite = !card.isFavorite;
        
        if (card.isFavorite) {
            if (!favorites.includes(cardId)) {
                favorites.unshift(cardId);
            }
        } else {
            removeFavorite(cardId);
        }

        saveCards();
        saveFavorites();
        Utils.EventBus.emit('favorite:toggled', { cardId, isFavorite: card.isFavorite });
        Utils.EventBus.emit('data:changed');
        
        return card.isFavorite;
    }

    /**
     * Remove dos favoritos
     * @param {string} cardId - ID do card
     */
    function removeFavorite(cardId) {
        favorites = favorites.filter(id => id !== cardId);
    }

    /**
     * Obtém favoritos
     * @returns {Array} Cards favoritos
     */
    function getFavorites() {
        return favorites
            .map(id => getCardById(id))
            .filter(card => card !== null);
    }

    /**
     * Salva favoritos
     */
    function saveFavorites() {
        Utils.storage.set(STORAGE_KEYS.FAVORITES, favorites);
    }

    // ==================== HISTÓRICO ====================

    /**
     * Adiciona ao histórico
     * @param {string} cardId - ID do card
     */
    function addToHistory(cardId) {
        // Remove duplicatas
        history = history.filter(id => id !== cardId);
        // Adiciona no início
        history.unshift(cardId);
        // Limita a 20 itens
        history = history.slice(0, 20);
        saveHistory();
    }

    /**
     * Obtém histórico recente
     * @param {number} limit - Limite de itens
     * @returns {Array} Cards recentes
     */
    function getRecentCards(limit = 10) {
        return history
            .slice(0, limit)
            .map(id => getCardById(id))
            .filter(card => card !== null);
    }

    /**
     * Salva histórico
     */
    function saveHistory() {
        Utils.storage.set(STORAGE_KEYS.HISTORY, history);
    }

    // ==================== SETTINGS ====================

    /**
     * Atualiza configurações
     * @param {Object} updates - Atualizações
     */
    function updateSettings(updates) {
        settings = { ...settings, ...updates };
        Utils.storage.set(STORAGE_KEYS.SETTINGS, settings);
        Utils.EventBus.emit('settings:updated', settings);
    }

    /**
     * Obtém configurações
     * @returns {Object} Configurações
     */
    function getSettings() {
        return { ...settings };
    }

    // ==================== IMPORTAÇÃO / EXPORTAÇÃO ====================

    /**
     * Exporta todos os dados
     * @returns {Object} Dados exportados
     */
    function exportData() {
        return {
            version: VERSION,
            exportedAt: new Date().toISOString(),
            session: settings.sessionName,
            cards,
            types,
            settings,
            favorites
        };
    }

    /**
     * Importa dados
     * @param {Object} data - Dados a importar
     * @param {string} mode - 'replace' ou 'merge'
     * @returns {Object} Resultado da importação
     */
    function importData(data, mode = 'replace') {
        try {
            if (!data || !data.cards) {
                throw new Error('Dados inválidos');
            }

            if (mode === 'replace') {
                cards = data.cards || [];
                types = data.types || DEFAULT_TYPES;
                settings = data.settings || DEFAULT_SETTINGS;
                favorites = data.favorites || [];
                history = [];
            } else {
                // Merge: adiciona novos, atualiza existentes pelo título
                const existingTitles = new Set(cards.map(c => c.title.toLowerCase()));
                
                data.cards.forEach(importCard => {
                    if (!existingTitles.has(importCard.title.toLowerCase())) {
                        // Gera novo ID para evitar conflitos
                        importCard.id = Utils.generateId();
                        cards.push(importCard);
                    }
                });

                // Merge tipos
                data.types?.forEach(importType => {
                    if (!types.find(t => t.id === importType.id || t.name === importType.name)) {
                        importType.id = Utils.generateId();
                        types.push(importType);
                    }
                });
            }

            ensureDefaultTypes();
            saveAllData();
            
            Utils.EventBus.emit('data:imported', { mode, count: data.cards.length });
            Utils.EventBus.emit('data:changed');

            return { success: true, count: data.cards.length };
        } catch (error) {
            console.error('Erro na importação:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Limpa todos os dados
     */
    function clearAllData() {
        cards = [];
        types = [...DEFAULT_TYPES];
        settings = { ...DEFAULT_SETTINGS };
        history = [];
        favorites = [];
        saveAllData();
        Utils.EventBus.emit('data:cleared');
    }

    // ==================== ESTATÍSTICAS ====================

    /**
     * Obtém estatísticas
     * @returns {Object} Estatísticas
     */
    function getStats() {
        return {
            totalCards: cards.length,
            totalConnections: getTotalConnections(),
            totalTypes: types.length,
            totalTags: getAllTags().length,
            cardsByType: types.map(type => ({
                type,
                count: countCardsByType(type.id)
            }))
        };
    }

    // ==================== API PÚBLICA ====================
    return {
        init,
        // Cards
        createCard,
        updateCard,
        deleteCard,
        getCardById,
        getAllCards,
        filterCards,
        searchCards,
        // Types
        createType,
        updateType,
        deleteType,
        getTypeById,
        getAllTypes,
        countCardsByType,
        // Connections
        addConnection,
        removeConnection,
        getCardConnections,
        getIncomingConnections,
        getTotalConnections,
        // Tags
        getAllTags,
        // Favorites
        toggleFavorite,
        getFavorites,
        // History
        addToHistory,
        getRecentCards,
        // Settings
        updateSettings,
        getSettings,
        // Import/Export
        exportData,
        importData,
        clearAllData,
        // Stats
        getStats
    };
})();

// Expor globalmente
window.DataManager = DataManager;
