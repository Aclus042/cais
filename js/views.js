/* ============================================
   RPG Card Canvas — Gerenciamento de Views
   ============================================ */

/**
 * Módulo de gerenciamento de visualizações
 */
const ViewManager = (function() {
    
    // ==================== ESTADO ====================
    let currentView = 'grid';
    let currentCardId = null;
    let navigationHistory = [];
    let historyIndex = -1;
    
    // ==================== ELEMENTOS ====================
    const elements = {
        viewBtns: null,
        viewGrid: null,
        viewGraph: null,
        viewDetail: null,
        cardsGrid: null,
        detailEmpty: null,
        detailContent: null,
        detailBody: null,
        detailConnections: null,
        detailBreadcrumb: null,
        btnDetailBack: null,
        btnDetailFavorite: null,
        btnDetailEdit: null,
        btnDetailDelete: null
    };
    
    // ==================== INICIALIZAÇÃO ====================
    
    /**
     * Inicializa o gerenciador de views
     */
    function init() {
        cacheElements();
        setupEventListeners();
        setupSubscriptions();
        
        // Carrega view inicial
        switchView('grid');
        refreshCurrentView();
        
        console.log('ViewManager inicializado');
    }
    
    /**
     * Cache de elementos DOM
     */
    function cacheElements() {
        elements.viewBtns = document.querySelectorAll('.view-btn');
        elements.viewGrid = document.getElementById('viewGrid');
        elements.viewGraph = document.getElementById('viewGraph');
        elements.viewDetail = document.getElementById('viewDetail');
        elements.cardsGrid = document.getElementById('cardsGrid');
        elements.detailEmpty = document.getElementById('detailEmpty');
        elements.detailContent = document.getElementById('detailContent');
        elements.detailBody = document.getElementById('detailBody');
        elements.detailConnections = document.getElementById('detailConnections');
        elements.detailBreadcrumb = document.getElementById('detailBreadcrumb');
        elements.btnDetailBack = document.getElementById('btnDetailBack');
        elements.btnDetailFavorite = document.getElementById('btnDetailFavorite');
        elements.btnDetailEdit = document.getElementById('btnDetailEdit');
        elements.btnDetailDelete = document.getElementById('btnDetailDelete');
    }
    
    /**
     * Configura event listeners
     */
    function setupEventListeners() {
        // View switcher
        elements.viewBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                switchView(btn.dataset.view);
            });
        });
        
        // Grid size buttons
        document.querySelectorAll('.grid-size-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.grid-size-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                elements.cardsGrid.dataset.size = btn.dataset.size;
                DataManager.updateSettings({ gridSize: btn.dataset.size });
            });
        });
        
        // Detail navigation
        elements.btnDetailBack?.addEventListener('click', navigateBack);
        elements.btnDetailFavorite?.addEventListener('click', toggleCurrentFavorite);
        elements.btnDetailEdit?.addEventListener('click', editCurrentCard);
        elements.btnDetailDelete?.addEventListener('click', deleteCurrentCard);
    }
    
    /**
     * Configura subscriptions de eventos
     */
    function setupSubscriptions() {
        Utils.EventBus.on('card:opened', (card) => {
            openCardDetail(card);
        });
        
        Utils.EventBus.on('card:created', refreshCurrentView);
        Utils.EventBus.on('card:updated', (card) => {
            refreshCurrentView();
            if (currentCardId === card.id) {
                renderCardDetail(card);
            }
        });
        Utils.EventBus.on('card:deleted', (card) => {
            refreshCurrentView();
            if (currentCardId === card.id) {
                showDetailEmpty();
            }
        });
        Utils.EventBus.on('data:imported', refreshCurrentView);
        Utils.EventBus.on('favorite:toggled', ({ cardId, isFavorite }) => {
            if (currentCardId === cardId) {
                updateFavoriteButton(isFavorite);
            }
        });
    }
    
    // ==================== SWITCH DE VIEWS ====================
    
    /**
     * Troca para uma view específica
     * @param {string} viewName - Nome da view
     */
    function switchView(viewName) {
        currentView = viewName;
        
        // Atualiza botões
        elements.viewBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });
        
        // Atualiza containers
        document.querySelectorAll('.view-container').forEach(container => {
            container.classList.remove('active');
        });
        
        switch (viewName) {
            case 'grid':
                elements.viewGrid?.classList.add('active');
                refreshGridView();
                break;
            case 'graph':
                elements.viewGraph?.classList.add('active');
                GraphView.refresh();
                GraphView.centerGraph();
                break;
            case 'detail':
                elements.viewDetail?.classList.add('active');
                if (!currentCardId) {
                    showDetailEmpty();
                }
                break;
        }
    }
    
    /**
     * Atualiza a view atual
     */
    function refreshCurrentView() {
        switch (currentView) {
            case 'grid':
                refreshGridView();
                break;
            case 'graph':
                GraphView.refresh();
                break;
            case 'detail':
                if (currentCardId) {
                    const card = DataManager.getCardById(currentCardId);
                    if (card) renderCardDetail(card);
                }
                break;
        }
        
        // Atualiza sidebar
        refreshSidebar();
        updateStats();
    }
    
    // ==================== GRID VIEW ====================
    
    /**
     * Atualiza a view de grid
     * @param {Object} filters - Filtros a aplicar
     */
    function refreshGridView(filters = {}) {
        if (!elements.cardsGrid) return;
        
        const cards = DataManager.filterCards(filters);
        const emptyState = document.getElementById('emptyState');
        
        // Limpa grid (exceto empty state)
        Array.from(elements.cardsGrid.children).forEach(child => {
            if (child.id !== 'emptyState') {
                child.remove();
            }
        });
        
        if (cards.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
        } else {
            if (emptyState) emptyState.style.display = 'none';
            
            cards.forEach(card => {
                const cardElement = CardRenderer.renderGridCard(card);
                elements.cardsGrid.appendChild(cardElement);
            });
        }
        
        // Atualiza contador
        document.getElementById('gridCardCount').textContent = 
            `${cards.length} card${cards.length !== 1 ? 's' : ''}`;
        
        // Aplica tamanho do grid
        const settings = DataManager.getSettings();
        elements.cardsGrid.dataset.size = settings.gridSize || 'medium';
        
        // Atualiza botão de tamanho ativo
        document.querySelectorAll('.grid-size-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.size === (settings.gridSize || 'medium'));
        });
    }
    
    // ==================== DETAIL VIEW ====================
    
    /**
     * Abre detalhes de um card
     * @param {Object} card - Dados do card
     */
    function openCardDetail(card) {
        if (!card) return;
        
        // Adiciona ao histórico de navegação
        if (currentCardId !== card.id) {
            if (historyIndex < navigationHistory.length - 1) {
                navigationHistory = navigationHistory.slice(0, historyIndex + 1);
            }
            navigationHistory.push(card.id);
            historyIndex = navigationHistory.length - 1;
        }
        
        currentCardId = card.id;
        
        // Se não está na view detail, switch
        if (currentView !== 'detail') {
            switchView('detail');
        }
        
        renderCardDetail(card);
    }
    
    /**
     * Renderiza detalhes do card
     * @param {Object} card - Dados do card
     */
    function renderCardDetail(card) {
        if (!card) {
            showDetailEmpty();
            return;
        }
        
        elements.detailEmpty.style.display = 'none';
        elements.detailContent.style.display = 'block';
        
        // Renderiza body
        elements.detailBody.innerHTML = CardRenderer.renderCardDetail(card);
        elements.detailBody.style.setProperty('--card-color', card.color || '#6366f1');
        
        // Renderiza conexões
        elements.detailConnections.innerHTML = CardRenderer.renderCardConnections(card);
        
        // Setup click em conexões
        elements.detailConnections.querySelectorAll('.connection-card').forEach(conn => {
            conn.addEventListener('click', () => {
                const targetId = conn.dataset.cardId;
                const targetCard = DataManager.getCardById(targetId);
                if (targetCard) openCardDetail(targetCard);
            });
        });
        
        // Atualiza breadcrumb
        updateBreadcrumb(card);
        
        // Atualiza botão de favorito
        updateFavoriteButton(card.isFavorite);
    }
    
    /**
     * Mostra estado vazio do detail
     */
    function showDetailEmpty() {
        currentCardId = null;
        elements.detailEmpty.style.display = 'flex';
        elements.detailContent.style.display = 'none';
    }
    
    /**
     * Atualiza breadcrumb
     * @param {Object} card - Card atual
     */
    function updateBreadcrumb(card) {
        if (!elements.detailBreadcrumb) return;
        
        const type = DataManager.getTypeById(card.typeId);
        
        let html = '';
        
        // Mostra histórico recente
        if (navigationHistory.length > 1 && historyIndex > 0) {
            const prevId = navigationHistory[historyIndex - 1];
            const prevCard = DataManager.getCardById(prevId);
            if (prevCard) {
                html += `<span class="breadcrumb-item" data-card-id="${prevId}">${Utils.escapeHtml(prevCard.title)}</span>`;
                html += `<span class="breadcrumb-separator">›</span>`;
            }
        }
        
        html += `<span class="breadcrumb-item current">${type?.icon || '📄'} ${Utils.escapeHtml(card.title)}</span>`;
        
        elements.detailBreadcrumb.innerHTML = html;
        
        // Event listener para navegação
        elements.detailBreadcrumb.querySelectorAll('.breadcrumb-item:not(.current)').forEach(item => {
            item.addEventListener('click', () => {
                const cardId = item.dataset.cardId;
                const card = DataManager.getCardById(cardId);
                if (card) openCardDetail(card);
            });
        });
    }
    
    /**
     * Atualiza botão de favorito
     * @param {boolean} isFavorite - Estado de favorito
     */
    function updateFavoriteButton(isFavorite) {
        if (elements.btnDetailFavorite) {
            elements.btnDetailFavorite.innerHTML = isFavorite ? '★' : '☆';
            elements.btnDetailFavorite.title = isFavorite ? 'Remover favorito' : 'Favoritar';
        }
    }
    
    /**
     * Navega para trás no histórico
     */
    function navigateBack() {
        if (historyIndex > 0) {
            historyIndex--;
            const cardId = navigationHistory[historyIndex];
            const card = DataManager.getCardById(cardId);
            if (card) {
                currentCardId = cardId;
                renderCardDetail(card);
            }
        } else {
            // Volta para grid
            switchView('grid');
        }
    }
    
    /**
     * Toggle favorito do card atual
     */
    function toggleCurrentFavorite() {
        if (currentCardId) {
            DataManager.toggleFavorite(currentCardId);
        }
    }
    
    /**
     * Edita o card atual
     */
    function editCurrentCard() {
        if (currentCardId) {
            Utils.EventBus.emit('card:edit', { cardId: currentCardId });
        }
    }
    
    /**
     * Exclui o card atual
     */
    function deleteCurrentCard() {
        if (currentCardId) {
            Utils.EventBus.emit('card:confirmDelete', { cardId: currentCardId });
        }
    }
    
    // ==================== SIDEBAR ====================
    
    /**
     * Atualiza a sidebar
     */
    function refreshSidebar() {
        refreshFavorites();
        refreshRecents();
        refreshFilters();
    }
    
    /**
     * Atualiza lista de favoritos
     */
    function refreshFavorites() {
        const container = document.getElementById('favoritesList');
        if (!container) return;
        
        const favorites = DataManager.getFavorites();
        
        if (favorites.length === 0) {
            container.innerHTML = '<p class="empty-message">Nenhum favorito</p>';
        } else {
            container.innerHTML = '';
            favorites.slice(0, 8).forEach(card => {
                container.appendChild(
                    CardRenderer.renderSidebarItem(card, 'favorite-item')
                );
            });
        }
    }
    
    /**
     * Atualiza lista de recentes
     */
    function refreshRecents() {
        const container = document.getElementById('recentsList');
        if (!container) return;
        
        const recents = DataManager.getRecentCards(8);
        
        if (recents.length === 0) {
            container.innerHTML = '<p class="empty-message">Nenhum card recente</p>';
        } else {
            container.innerHTML = '';
            recents.forEach(card => {
                container.appendChild(
                    CardRenderer.renderSidebarItem(card, 'recent-item')
                );
            });
        }
    }
    
    /**
     * Atualiza filtros
     */
    function refreshFilters() {
        // Atualiza select de tipos
        const filterType = document.getElementById('filterType');
        if (filterType) {
            const types = DataManager.getAllTypes();
            filterType.innerHTML = '<option value="">Todos os tipos</option>' +
                types.map(type => 
                    `<option value="${type.id}">${type.icon} ${Utils.escapeHtml(type.name)}</option>`
                ).join('');
        }
        
        // Atualiza tags
        const filterTags = document.getElementById('filterTags');
        if (filterTags) {
            const tags = DataManager.getAllTags();
            filterTags.innerHTML = tags.slice(0, 10).map(tag =>
                `<span class="tag-filter" data-tag="${Utils.escapeHtml(tag)}">${Utils.escapeHtml(tag)}</span>`
            ).join('');
            
            filterTags.querySelectorAll('.tag-filter').forEach(tagEl => {
                tagEl.addEventListener('click', () => {
                    tagEl.classList.toggle('active');
                    applyFilters();
                });
            });
        }
    }
    
    /**
     * Aplica filtros atuais
     */
    function applyFilters() {
        const typeId = document.getElementById('filterType')?.value || '';
        const activeTags = Array.from(document.querySelectorAll('.tag-filter.active'))
            .map(el => el.dataset.tag);
        
        refreshGridView({
            typeId: typeId || undefined,
            tags: activeTags.length > 0 ? activeTags : undefined
        });
    }
    
    /**
     * Limpa todos os filtros
     */
    function clearFilters() {
        document.getElementById('filterType').value = '';
        document.querySelectorAll('.tag-filter.active').forEach(el => {
            el.classList.remove('active');
        });
        refreshGridView();
    }
    
    /**
     * Atualiza estatísticas
     */
    function updateStats() {
        const stats = DataManager.getStats();
        
        document.getElementById('statTotalCards').textContent = stats.totalCards;
        document.getElementById('statTotalConnections').textContent = stats.totalConnections;
        document.getElementById('statTotalTypes').textContent = stats.totalTypes;
    }
    
    // ==================== API PÚBLICA ====================
    return {
        init,
        switchView,
        refreshCurrentView,
        refreshGridView,
        openCardDetail,
        applyFilters,
        clearFilters,
        getCurrentView: () => currentView,
        getCurrentCardId: () => currentCardId
    };
})();

// Expor globalmente
window.ViewManager = ViewManager;
