/* ============================================
   RPG Card Canvas — Visualização em Grafo
   ============================================ */

/**
 * Módulo de visualização em grafo/canvas
 */
const GraphView = (function() {
    
    // ==================== ESTADO ====================
    let container = null;
    let nodesContainer = null;
    let canvas = null;
    let ctx = null;
    let minimapCanvas = null;
    let minimapCtx = null;
    
    // Transform state
    let transform = {
        x: 0,
        y: 0,
        scale: 1
    };
    
    // Interaction state
    let isDragging = false;
    let isPanning = false;
    let dragNode = null;
    let dragOffset = { x: 0, y: 0 };
    let lastMousePos = { x: 0, y: 0 };
    let selectedNodes = new Set();
    
    // Nodes cache
    let nodeElements = new Map();
    
    // Constants
    const MIN_SCALE = 0.25;
    const MAX_SCALE = 2;
    const ZOOM_SPEED = 0.1;
    
    // ==================== INICIALIZAÇÃO ====================
    
    /**
     * Inicializa a visualização em grafo
     */
    function init() {
        container = document.getElementById('graphContainer');
        nodesContainer = document.getElementById('graphNodes');
        canvas = document.getElementById('graphCanvas');
        minimapCanvas = document.getElementById('minimapCanvas');
        
        if (!container || !canvas) {
            console.warn('GraphView: Elementos não encontrados');
            return;
        }
        
        ctx = canvas.getContext('2d');
        minimapCtx = minimapCanvas?.getContext('2d');
        
        setupCanvas();
        setupEventListeners();
        
        // Subscribe to events
        Utils.EventBus.on('card:created', refresh);
        Utils.EventBus.on('card:updated', refresh);
        Utils.EventBus.on('card:deleted', refresh);
        Utils.EventBus.on('data:imported', refresh);
        
        console.log('GraphView inicializado');
    }
    
    /**
     * Configura o canvas
     */
    function setupCanvas() {
        resizeCanvas();
        window.addEventListener('resize', Utils.debounce(resizeCanvas, 100));
    }
    
    /**
     * Redimensiona o canvas
     */
    function resizeCanvas() {
        if (!container || !canvas) return;
        
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        if (minimapCanvas) {
            minimapCanvas.width = 160;
            minimapCanvas.height = 120;
        }
        
        render();
    }
    
    /**
     * Configura event listeners
     */
    function setupEventListeners() {
        // Mouse events no container
        container.addEventListener('mousedown', handleMouseDown);
        container.addEventListener('mousemove', handleMouseMove);
        container.addEventListener('mouseup', handleMouseUp);
        container.addEventListener('mouseleave', handleMouseUp);
        container.addEventListener('wheel', handleWheel, { passive: false });
        
        // Double click para abrir card
        container.addEventListener('dblclick', handleDoubleClick);
        
        // Context menu
        container.addEventListener('contextmenu', handleContextMenu);
        
        // Toolbar buttons
        document.getElementById('btnZoomIn')?.addEventListener('click', () => zoom(1));
        document.getElementById('btnZoomOut')?.addEventListener('click', () => zoom(-1));
        document.getElementById('btnZoomReset')?.addEventListener('click', resetZoom);
        document.getElementById('btnCenterGraph')?.addEventListener('click', centerGraph);
        document.getElementById('btnAutoLayout')?.addEventListener('click', autoLayout);
    }
    
    // ==================== RENDERIZAÇÃO ====================
    
    /**
     * Atualiza a visualização
     */
    function refresh() {
        renderNodes();
        render();
    }
    
    /**
     * Renderiza os nós
     */
    function renderNodes() {
        if (!nodesContainer) return;
        
        const cards = DataManager.getAllCards();
        
        // Remove nós que não existem mais
        nodeElements.forEach((element, id) => {
            if (!cards.find(c => c.id === id)) {
                element.remove();
                nodeElements.delete(id);
            }
        });
        
        // Adiciona ou atualiza nós
        cards.forEach(card => {
            let element = nodeElements.get(card.id);
            
            if (!element) {
                element = CardRenderer.renderGraphNode(card);
                setupNodeEvents(element, card);
                nodesContainer.appendChild(element);
                nodeElements.set(card.id, element);
            } else {
                // Atualiza posição
                element.style.left = `${card.position?.x || 100}px`;
                element.style.top = `${card.position?.y || 100}px`;
            }
        });
        
        applyTransform();
    }
    
    /**
     * Configura eventos do nó
     * @param {HTMLElement} element - Elemento do nó
     * @param {Object} card - Dados do card
     */
    function setupNodeEvents(element, card) {
        element.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                e.stopPropagation();
                startDragNode(element, card, e);
            }
        });
    }
    
    /**
     * Renderiza o canvas (conexões)
     */
    function render() {
        if (!ctx || !canvas) return;
        
        // Limpa canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Aplica transformação
        ctx.save();
        ctx.translate(transform.x, transform.y);
        ctx.scale(transform.scale, transform.scale);
        
        // Desenha conexões
        drawConnections();
        
        ctx.restore();
        
        // Atualiza minimap
        updateMinimap();
    }
    
    /**
     * Desenha as conexões entre cards
     */
    function drawConnections() {
        const cards = DataManager.getAllCards();
        
        cards.forEach(card => {
            const sourceElement = nodeElements.get(card.id);
            if (!sourceElement) return;
            
            const sourcePos = getNodeCenter(sourceElement);
            
            card.connections.forEach(conn => {
                const targetElement = nodeElements.get(conn.targetId);
                if (!targetElement) return;
                
                const targetPos = getNodeCenter(targetElement);
                
                drawConnection(sourcePos, targetPos, conn);
            });
        });
    }
    
    /**
     * Desenha uma conexão
     * @param {Object} from - Ponto de origem
     * @param {Object} to - Ponto de destino
     * @param {Object} connection - Dados da conexão
     */
    function drawConnection(from, to, connection) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const angle = Math.atan2(dy, dx);
        
        // Linha
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        
        // Curva bezier para conexões mais suaves
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        const offset = Math.min(Math.abs(dx), Math.abs(dy)) * 0.3;
        
        ctx.bezierCurveTo(
            midX, from.y + offset,
            midX, to.y - offset,
            to.x, to.y
        );
        
        ctx.strokeStyle = getComputedStyle(document.documentElement)
            .getPropertyValue('--graph-line').trim() || '#4a4a5a';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Seta no destino
        const arrowSize = 10;
        const arrowAngle = Math.atan2(to.y - midY, to.x - midX);
        
        ctx.beginPath();
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(
            to.x - arrowSize * Math.cos(arrowAngle - Math.PI / 6),
            to.y - arrowSize * Math.sin(arrowAngle - Math.PI / 6)
        );
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(
            to.x - arrowSize * Math.cos(arrowAngle + Math.PI / 6),
            to.y - arrowSize * Math.sin(arrowAngle + Math.PI / 6)
        );
        ctx.stroke();
        
        // Label da relação (opcional)
        if (connection.relation && transform.scale > 0.6) {
            ctx.font = '11px sans-serif';
            ctx.fillStyle = getComputedStyle(document.documentElement)
                .getPropertyValue('--text-muted').trim() || '#71717a';
            ctx.textAlign = 'center';
            ctx.fillText(connection.relation, midX, midY - 5);
        }
    }
    
    /**
     * Obtém o centro de um nó
     * @param {HTMLElement} element - Elemento do nó
     * @returns {Object} Posição {x, y}
     */
    function getNodeCenter(element) {
        const x = parseFloat(element.style.left) + element.offsetWidth / 2;
        const y = parseFloat(element.style.top) + element.offsetHeight / 2;
        return { x, y };
    }
    
    /**
     * Aplica transformação aos nós
     */
    function applyTransform() {
        if (!nodesContainer) return;
        
        nodesContainer.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;
        nodesContainer.style.transformOrigin = '0 0';
    }
    
    // ==================== INTERAÇÃO ====================
    
    /**
     * Inicia drag de nó
     * @param {HTMLElement} element - Elemento do nó
     * @param {Object} card - Dados do card
     * @param {MouseEvent} e - Evento
     */
    function startDragNode(element, card, e) {
        isDragging = true;
        dragNode = { element, card };
        
        const rect = element.getBoundingClientRect();
        dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        element.classList.add('dragging');
        
        // Seleciona o nó
        selectNode(card.id);
    }
    
    /**
     * Manipula mouse down
     * @param {MouseEvent} e - Evento
     */
    function handleMouseDown(e) {
        if (e.target === container || e.target === canvas) {
            isPanning = true;
            lastMousePos = { x: e.clientX, y: e.clientY };
            container.style.cursor = 'grabbing';
            
            // Deseleciona todos
            deselectAll();
        }
    }
    
    /**
     * Manipula mouse move
     * @param {MouseEvent} e - Evento
     */
    function handleMouseMove(e) {
        if (isDragging && dragNode) {
            // Drag de nó
            const containerRect = container.getBoundingClientRect();
            const x = (e.clientX - containerRect.left - transform.x) / transform.scale - dragOffset.x;
            const y = (e.clientY - containerRect.top - transform.y) / transform.scale - dragOffset.y;
            
            dragNode.element.style.left = `${x}px`;
            dragNode.element.style.top = `${y}px`;
            
            render();
        } else if (isPanning) {
            // Pan do canvas
            const dx = e.clientX - lastMousePos.x;
            const dy = e.clientY - lastMousePos.y;
            
            transform.x += dx;
            transform.y += dy;
            
            lastMousePos = { x: e.clientX, y: e.clientY };
            
            applyTransform();
            render();
        }
    }
    
    /**
     * Manipula mouse up
     * @param {MouseEvent} e - Evento
     */
    function handleMouseUp(e) {
        if (isDragging && dragNode) {
            // Salva posição do card
            const x = parseFloat(dragNode.element.style.left);
            const y = parseFloat(dragNode.element.style.top);
            
            DataManager.updateCard(dragNode.card.id, {
                position: { x, y }
            });
            
            dragNode.element.classList.remove('dragging');
        }
        
        isDragging = false;
        isPanning = false;
        dragNode = null;
        container.style.cursor = 'grab';
    }
    
    /**
     * Manipula scroll/zoom
     * @param {WheelEvent} e - Evento
     */
    function handleWheel(e) {
        e.preventDefault();
        
        const delta = e.deltaY > 0 ? -1 : 1;
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        zoomAt(delta, mouseX, mouseY);
    }
    
    /**
     * Manipula double click
     * @param {MouseEvent} e - Evento
     */
    function handleDoubleClick(e) {
        const node = e.target.closest('.graph-node');
        if (node) {
            const cardId = node.dataset.cardId;
            CardRenderer.openCardDetail(cardId);
        }
    }
    
    /**
     * Manipula context menu
     * @param {MouseEvent} e - Evento
     */
    function handleContextMenu(e) {
        e.preventDefault();
        
        const node = e.target.closest('.graph-node');
        if (node) {
            const cardId = node.dataset.cardId;
            showContextMenu(e.clientX, e.clientY, cardId);
        }
    }
    
    /**
     * Mostra menu de contexto
     * @param {number} x - Posição X
     * @param {number} y - Posição Y
     * @param {string} cardId - ID do card
     */
    function showContextMenu(x, y, cardId) {
        // Remove menu existente
        const existing = document.querySelector('.graph-context-menu');
        if (existing) existing.remove();
        
        const card = DataManager.getCardById(cardId);
        if (!card) return;
        
        const menu = document.createElement('div');
        menu.className = 'graph-context-menu';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        
        menu.innerHTML = `
            <div class="context-menu-item" data-action="open">📖 Abrir</div>
            <div class="context-menu-item" data-action="edit">✏️ Editar</div>
            <div class="context-menu-item" data-action="favorite">
                ${card.isFavorite ? '★' : '☆'} ${card.isFavorite ? 'Remover Favorito' : 'Favoritar'}
            </div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item danger" data-action="delete">🗑️ Excluir</div>
        `;
        
        document.body.appendChild(menu);
        
        // Event listeners
        menu.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            if (action) {
                handleContextAction(action, cardId);
            }
            menu.remove();
        });
        
        // Fecha ao clicar fora
        setTimeout(() => {
            document.addEventListener('click', function closeMenu() {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            });
        }, 0);
    }
    
    /**
     * Manipula ação do context menu
     * @param {string} action - Ação
     * @param {string} cardId - ID do card
     */
    function handleContextAction(action, cardId) {
        switch (action) {
            case 'open':
                CardRenderer.openCardDetail(cardId);
                break;
            case 'edit':
                Utils.EventBus.emit('card:edit', { cardId });
                break;
            case 'favorite':
                DataManager.toggleFavorite(cardId);
                break;
            case 'delete':
                Utils.EventBus.emit('card:confirmDelete', { cardId });
                break;
        }
    }
    
    /**
     * Seleciona um nó
     * @param {string} cardId - ID do card
     */
    function selectNode(cardId) {
        const element = nodeElements.get(cardId);
        if (element) {
            element.classList.add('selected');
            selectedNodes.add(cardId);
        }
    }
    
    /**
     * Deseleciona todos os nós
     */
    function deselectAll() {
        selectedNodes.forEach(id => {
            const element = nodeElements.get(id);
            if (element) element.classList.remove('selected');
        });
        selectedNodes.clear();
    }
    
    // ==================== ZOOM E NAVEGAÇÃO ====================
    
    /**
     * Aplica zoom
     * @param {number} direction - Direção (1 ou -1)
     */
    function zoom(direction) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        zoomAt(direction, centerX, centerY);
    }
    
    /**
     * Aplica zoom em um ponto específico
     * @param {number} direction - Direção
     * @param {number} x - Posição X
     * @param {number} y - Posição Y
     */
    function zoomAt(direction, x, y) {
        const oldScale = transform.scale;
        const newScale = Utils.clamp(
            oldScale * (1 + direction * ZOOM_SPEED),
            MIN_SCALE,
            MAX_SCALE
        );
        
        // Ajusta posição para manter o ponto sob o mouse
        const scaleDelta = newScale / oldScale;
        transform.x = x - (x - transform.x) * scaleDelta;
        transform.y = y - (y - transform.y) * scaleDelta;
        transform.scale = newScale;
        
        applyTransform();
        render();
    }
    
    /**
     * Reseta o zoom
     */
    function resetZoom() {
        transform.scale = 1;
        applyTransform();
        render();
    }
    
    /**
     * Centraliza o grafo
     */
    function centerGraph() {
        const cards = DataManager.getAllCards();
        if (cards.length === 0) {
            transform.x = 0;
            transform.y = 0;
            applyTransform();
            render();
            return;
        }
        
        // Calcula bounding box
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        cards.forEach(card => {
            const pos = card.position || { x: 0, y: 0 };
            const element = nodeElements.get(card.id);
            const width = element?.offsetWidth || 180;
            const height = element?.offsetHeight || 80;
            
            minX = Math.min(minX, pos.x);
            minY = Math.min(minY, pos.y);
            maxX = Math.max(maxX, pos.x + width);
            maxY = Math.max(maxY, pos.y + height);
        });
        
        // Centraliza
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        transform.x = canvas.width / 2 - centerX * transform.scale;
        transform.y = canvas.height / 2 - centerY * transform.scale;
        
        applyTransform();
        render();
    }
    
    /**
     * Auto layout - organiza os nós automaticamente
     */
    function autoLayout() {
        const cards = DataManager.getAllCards();
        if (cards.length === 0) return;
        
        // Agrupa por tipo
        const types = DataManager.getAllTypes();
        const groups = {};
        
        types.forEach(type => {
            groups[type.id] = cards.filter(c => c.typeId === type.id);
        });
        
        // Layout em colunas por tipo
        let columnX = 50;
        const columnWidth = 250;
        const nodeHeight = 100;
        const padding = 30;
        
        Object.entries(groups).forEach(([typeId, typeCards]) => {
            if (typeCards.length === 0) return;
            
            typeCards.forEach((card, index) => {
                const newPosition = {
                    x: columnX,
                    y: 50 + index * (nodeHeight + padding)
                };
                
                DataManager.updateCard(card.id, { position: newPosition });
                
                const element = nodeElements.get(card.id);
                if (element) {
                    element.style.left = `${newPosition.x}px`;
                    element.style.top = `${newPosition.y}px`;
                }
            });
            
            columnX += columnWidth;
        });
        
        render();
        centerGraph();
        
        UI.showToast('Layout reorganizado!', 'success');
    }
    
    // ==================== MINIMAP ====================
    
    /**
     * Atualiza o minimap
     */
    function updateMinimap() {
        if (!minimapCtx || !minimapCanvas) return;
        
        minimapCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
        
        const cards = DataManager.getAllCards();
        if (cards.length === 0) return;
        
        // Calcula bounds
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        cards.forEach(card => {
            const pos = card.position || { x: 0, y: 0 };
            minX = Math.min(minX, pos.x);
            minY = Math.min(minY, pos.y);
            maxX = Math.max(maxX, pos.x + 180);
            maxY = Math.max(maxY, pos.y + 80);
        });
        
        const worldWidth = maxX - minX + 100;
        const worldHeight = maxY - minY + 100;
        const scale = Math.min(
            minimapCanvas.width / worldWidth,
            minimapCanvas.height / worldHeight
        );
        
        // Desenha nós
        cards.forEach(card => {
            const pos = card.position || { x: 0, y: 0 };
            const type = DataManager.getTypeById(card.typeId);
            
            minimapCtx.fillStyle = card.color || type?.color || '#6366f1';
            minimapCtx.fillRect(
                (pos.x - minX) * scale + 5,
                (pos.y - minY) * scale + 5,
                180 * scale,
                80 * scale
            );
        });
        
        // Desenha viewport
        const viewportX = (-transform.x / transform.scale - minX) * scale + 5;
        const viewportY = (-transform.y / transform.scale - minY) * scale + 5;
        const viewportW = (canvas.width / transform.scale) * scale;
        const viewportH = (canvas.height / transform.scale) * scale;
        
        minimapCtx.strokeStyle = '#6366f1';
        minimapCtx.lineWidth = 2;
        minimapCtx.strokeRect(viewportX, viewportY, viewportW, viewportH);
    }
    
    /**
     * Foca em um card específico
     * @param {string} cardId - ID do card
     */
    function focusOnCard(cardId) {
        const card = DataManager.getCardById(cardId);
        if (!card) return;
        
        const pos = card.position || { x: 0, y: 0 };
        
        transform.x = canvas.width / 2 - pos.x * transform.scale;
        transform.y = canvas.height / 2 - pos.y * transform.scale;
        
        applyTransform();
        render();
        
        selectNode(cardId);
    }
    
    // ==================== API PÚBLICA ====================
    return {
        init,
        refresh,
        render,
        zoom,
        resetZoom,
        centerGraph,
        autoLayout,
        focusOnCard,
        getTransform: () => ({ ...transform }),
        setTransform: (t) => {
            transform = { ...t };
            applyTransform();
            render();
        }
    };
})();

// Expor globalmente
window.GraphView = GraphView;
