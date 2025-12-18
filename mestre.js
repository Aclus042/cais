// ============================================
// GERENCIADOR DE IMAGENS - SISTEMA DE CROP
// ============================================
// 
// MODELO MENTAL CORRETO PARA CROP DE IMAGENS
// ==========================================
// 
// 1. DIFERENÇA ENTRE object-fit: cover E CROP REAL
//    - object-fit: cover é APENAS VISUAL. A imagem inteira ainda existe,
//      o CSS apenas esconde partes dela na renderização.
//    - Crop via Canvas é DEFINITIVO. Gera uma nova imagem contendo
//      apenas a área selecionada.
// 
// 2. POR QUE CROP NO UPLOAD?
//    - Reduz tamanho do arquivo (menos dados no localStorage)
//    - Garante consistência: a mesma imagem em qualquer card
//    - Previsibilidade: o usuário sabe exatamente o que salvou
//    - Performance: imagens menores = renderização mais rápida
// 
// 3. ASPECT RATIO FIXO (3:2)
//    - Cards de RPG são tipicamente horizontais ou quadrados
//    - 3:2 é versátil: funciona bem em cards grandes, médios e pequenos
//    - Uma proporção única evita distorções entre contextos
//    - Alternativa: 4:3 para imagens mais "quadradas", 16:9 para banners
// 
// 4. FLUXO DE CROP
//    a) Usuário seleciona arquivo
//    b) Imagem carrega em área de preview com MÁSCARA FIXA
//    c) Usuário arrasta a imagem (não a máscara)
//    d) Usuário ajusta zoom se necessário
//    e) Ao confirmar: canvas extrai apenas a área visível
//    f) Imagem recortada é salva em base64
//

const ImageManager = {
    // Configuração de proporção do crop
    // 3:2 é ideal para cards de RPG (versátil para vários tamanhos)
    CROP_ASPECT_RATIO: 3 / 2,  // largura / altura
    CROP_WIDTH: 450,           // largura da área de crop em pixels
    CROP_HEIGHT: 300,          // altura da área de crop (450 / 1.5)
    OUTPUT_WIDTH: 600,         // largura da imagem final
    OUTPUT_HEIGHT: 400,        // altura da imagem final (600 / 1.5)
    OUTPUT_QUALITY: 0.85,      // qualidade JPEG (0.85 = bom equilíbrio)
    
    // Estado interno
    state: {
        originalImage: null,    // Image object original
        imageWidth: 0,          // largura natural da imagem
        imageHeight: 0,         // altura natural da imagem
        scale: 1,               // escala atual (zoom)
        minScale: 1,            // escala mínima (imagem cobre a área)
        offsetX: 0,             // deslocamento X da imagem
        offsetY: 0,             // deslocamento Y da imagem
        isDragging: false,      // se está arrastando
        dragStartX: 0,          // posição inicial do drag
        dragStartY: 0,          // posição inicial do drag
        callback: null,         // função chamada ao confirmar
    },
    
    // Elementos DOM (cacheados para performance)
    elements: {
        modal: null,
        canvas: null,
        ctx: null,
        zoomSlider: null,
        zoomValue: null,
    },
    
    // ==========================================
    // MÉTODO PRINCIPAL: Abrir seletor de imagem
    // ==========================================
    selectImage(callback) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file || !file.type.startsWith('image/')) return;
            
            // Ler arquivo como Data URL
            const reader = new FileReader();
            reader.onload = (event) => {
                this.loadImage(event.target.result, callback);
            };
            reader.readAsDataURL(file);
        };
        
        input.click();
    },
    
    // ==========================================
    // Carregar imagem e abrir modal
    // ==========================================
    loadImage(dataUrl, callback) {
        const img = new Image();
        
        img.onload = () => {
            // Salvar estado
            this.state.originalImage = img;
            this.state.imageWidth = img.naturalWidth;
            this.state.imageHeight = img.naturalHeight;
            this.state.callback = callback;
            
            // Calcular escala mínima (imagem deve cobrir área de crop)
            this.calculateMinScale();
            
            // Iniciar com escala mínima e centralizado
            this.state.scale = this.state.minScale;
            this.centerImage();
            
            // Abrir modal
            this.openModal();
        };
        
        img.onerror = () => {
            alert('Erro ao carregar imagem. Tente outro arquivo.');
        };
        
        img.src = dataUrl;
    },
    
    // ==========================================
    // Calcular escala mínima
    // A imagem deve SEMPRE cobrir completamente a área de crop
    // ==========================================
    calculateMinScale() {
        const { imageWidth, imageHeight } = this.state;
        
        // Escala necessária para cobrir a largura
        const scaleX = this.CROP_WIDTH / imageWidth;
        // Escala necessária para cobrir a altura
        const scaleY = this.CROP_HEIGHT / imageHeight;
        
        // Usar a MAIOR escala (garante cobertura total)
        this.state.minScale = Math.max(scaleX, scaleY);
    },
    
    // ==========================================
    // Centralizar imagem na área de crop
    // ==========================================
    centerImage() {
        const { imageWidth, imageHeight, scale } = this.state;
        
        const scaledWidth = imageWidth * scale;
        const scaledHeight = imageHeight * scale;
        
        // Centralizar: offset = (tamanho da área - tamanho da imagem) / 2
        this.state.offsetX = (this.CROP_WIDTH - scaledWidth) / 2;
        this.state.offsetY = (this.CROP_HEIGHT - scaledHeight) / 2;
    },
    
    // ==========================================
    // Limitar offset para imagem não sair da área
    // ==========================================
    clampOffset() {
        const { imageWidth, imageHeight, scale } = this.state;
        
        const scaledWidth = imageWidth * scale;
        const scaledHeight = imageHeight * scale;
        
        // Limite máximo: 0 (borda esquerda/topo alinhada com área)
        // Limite mínimo: área - imagem (borda direita/baixo alinhada)
        const maxOffsetX = 0;
        const minOffsetX = this.CROP_WIDTH - scaledWidth;
        const maxOffsetY = 0;
        const minOffsetY = this.CROP_HEIGHT - scaledHeight;
        
        this.state.offsetX = Math.min(maxOffsetX, Math.max(minOffsetX, this.state.offsetX));
        this.state.offsetY = Math.min(maxOffsetY, Math.max(minOffsetY, this.state.offsetY));
    },
    
    // ==========================================
    // Abrir modal de crop
    // ==========================================
    openModal() {
        // Cachear elementos
        this.elements.modal = document.getElementById('imageModal');
        this.elements.canvas = document.getElementById('cropCanvas');
        this.elements.ctx = this.elements.canvas.getContext('2d');
        this.elements.zoomSlider = document.getElementById('cropZoomSlider');
        this.elements.zoomValue = document.getElementById('cropZoomValue');
        
        // Configurar canvas
        this.elements.canvas.width = this.CROP_WIDTH;
        this.elements.canvas.height = this.CROP_HEIGHT;
        
        // Configurar slider de zoom
        // Range: 100% (escala mínima) até 300% da escala mínima
        this.elements.zoomSlider.min = 100;
        this.elements.zoomSlider.max = 300;
        this.elements.zoomSlider.value = 100;
        this.updateZoomDisplay();
        
        // Configurar eventos
        this.setupEvents();
        
        // Renderizar preview
        this.render();
        
        // Mostrar modal
        this.elements.modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },
    
    // ==========================================
    // Configurar eventos de interação
    // ==========================================
    setupEvents() {
        const canvas = this.elements.canvas;
        
        // Remover eventos anteriores (evita duplicação)
        canvas.onmousedown = null;
        canvas.ontouchstart = null;
        document.onmousemove = null;
        document.ontouchmove = null;
        document.onmouseup = null;
        document.ontouchend = null;
        
        // Mouse events
        canvas.onmousedown = (e) => this.startDrag(e.clientX, e.clientY);
        document.onmousemove = (e) => this.drag(e.clientX, e.clientY);
        document.onmouseup = () => this.endDrag();
        
        // Touch events (mobile)
        canvas.ontouchstart = (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.startDrag(touch.clientX, touch.clientY);
        };
        document.ontouchmove = (e) => {
            if (!this.state.isDragging) return;
            const touch = e.touches[0];
            this.drag(touch.clientX, touch.clientY);
        };
        document.ontouchend = () => this.endDrag();
        
        // Zoom slider
        this.elements.zoomSlider.oninput = () => this.handleZoom();
    },
    
    // ==========================================
    // Iniciar arraste
    // ==========================================
    startDrag(clientX, clientY) {
        this.state.isDragging = true;
        this.state.dragStartX = clientX - this.state.offsetX;
        this.state.dragStartY = clientY - this.state.offsetY;
        this.elements.canvas.style.cursor = 'grabbing';
    },
    
    // ==========================================
    // Durante arraste
    // ==========================================
    drag(clientX, clientY) {
        if (!this.state.isDragging) return;
        
        this.state.offsetX = clientX - this.state.dragStartX;
        this.state.offsetY = clientY - this.state.dragStartY;
        
        this.clampOffset();
        this.render();
    },
    
    // ==========================================
    // Finalizar arraste
    // ==========================================
    endDrag() {
        this.state.isDragging = false;
        if (this.elements.canvas) {
            this.elements.canvas.style.cursor = 'grab';
        }
    },
    
    // ==========================================
    // Processar zoom
    // ==========================================
    handleZoom() {
        const zoomPercent = parseInt(this.elements.zoomSlider.value);
        const newScale = this.state.minScale * (zoomPercent / 100);
        
        // Calcular centro atual da área visível
        const centerX = this.CROP_WIDTH / 2;
        const centerY = this.CROP_HEIGHT / 2;
        
        // Posição do centro na imagem (antes do zoom)
        const imgCenterX = (centerX - this.state.offsetX) / this.state.scale;
        const imgCenterY = (centerY - this.state.offsetY) / this.state.scale;
        
        // Aplicar nova escala
        this.state.scale = newScale;
        
        // Recalcular offset para manter o mesmo ponto central
        this.state.offsetX = centerX - (imgCenterX * newScale);
        this.state.offsetY = centerY - (imgCenterY * newScale);
        
        this.clampOffset();
        this.updateZoomDisplay();
        this.render();
    },
    
    // ==========================================
    // Atualizar display do zoom
    // ==========================================
    updateZoomDisplay() {
        const zoomPercent = this.elements.zoomSlider.value;
        this.elements.zoomValue.textContent = `${zoomPercent}%`;
    },
    
    // ==========================================
    // Renderizar preview no canvas
    // ==========================================
    render() {
        const { ctx, canvas } = this.elements;
        const { originalImage, scale, offsetX, offsetY } = this.state;
        
        if (!ctx || !originalImage) return;
        
        // Limpar canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Fundo escuro (para imagens com transparência)
        ctx.fillStyle = '#0a0a0b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Desenhar imagem escalada e posicionada
        const scaledWidth = originalImage.naturalWidth * scale;
        const scaledHeight = originalImage.naturalHeight * scale;
        
        ctx.drawImage(
            originalImage,
            offsetX,
            offsetY,
            scaledWidth,
            scaledHeight
        );
        
        // Desenhar borda indicativa
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
    },
    
    // ==========================================
    // Confirmar crop e gerar imagem final
    // ==========================================
    confirmCrop() {
        const { originalImage, scale, offsetX, offsetY, callback } = this.state;
        
        if (!originalImage || !callback) return;
        
        // Criar canvas de saída com tamanho final
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = this.OUTPUT_WIDTH;
        outputCanvas.height = this.OUTPUT_HEIGHT;
        
        const outputCtx = outputCanvas.getContext('2d');
        outputCtx.imageSmoothingEnabled = true;
        outputCtx.imageSmoothingQuality = 'high';
        
        // Calcular a proporção entre preview e output
        const scaleRatioX = this.OUTPUT_WIDTH / this.CROP_WIDTH;
        const scaleRatioY = this.OUTPUT_HEIGHT / this.CROP_HEIGHT;
        
        // Calcular posição e tamanho da imagem no canvas de saída
        const finalOffsetX = offsetX * scaleRatioX;
        const finalOffsetY = offsetY * scaleRatioY;
        const finalWidth = originalImage.naturalWidth * scale * scaleRatioX;
        const finalHeight = originalImage.naturalHeight * scale * scaleRatioY;
        
        // Desenhar imagem recortada
        outputCtx.drawImage(
            originalImage,
            finalOffsetX,
            finalOffsetY,
            finalWidth,
            finalHeight
        );
        
        // Converter para base64
        const croppedImage = outputCanvas.toDataURL('image/jpeg', this.OUTPUT_QUALITY);
        
        // Chamar callback com imagem recortada
        callback(croppedImage);
        
        // Fechar modal
        this.closeModal();
    },
    
    // ==========================================
    // Fechar modal e limpar estado
    // ==========================================
    closeModal() {
        // Remover eventos globais
        document.onmousemove = null;
        document.onmouseup = null;
        document.ontouchmove = null;
        document.ontouchend = null;
        
        // Esconder modal
        if (this.elements.modal) {
            this.elements.modal.classList.remove('active');
        }
        document.body.style.overflow = 'auto';
        
        // Limpar estado
        this.state = {
            originalImage: null,
            imageWidth: 0,
            imageHeight: 0,
            scale: 1,
            minScale: 1,
            offsetX: 0,
            offsetY: 0,
            isDragging: false,
            dragStartX: 0,
            dragStartY: 0,
            callback: null,
        };
        
        // Limpar elementos
        this.elements = {
            modal: null,
            canvas: null,
            ctx: null,
            zoomSlider: null,
            zoomValue: null,
        };
    },
    
    // ==========================================
    // Método legado para compatibilidade
    // (redireciona para novo sistema)
    // ==========================================
    updateZoom() {
        this.handleZoom();
    },
    
    confirmImage() {
        this.confirmCrop();
    }
};

// ============================================
// RENDERIZADOR DE TEXTO COM DESTAQUE
// ============================================
//
// MODELO MENTAL DE RENDERIZAÇÃO SEGURA
// =====================================
//
// 1. textContent vs innerHTML
//    - textContent: SEGURO, trata tudo como texto puro
//    - innerHTML: PERIGOSO, interpreta HTML e pode executar scripts
//
// 2. Risco de XSS (Cross-Site Scripting)
//    - Se o usuário digitar <script>alert('hack')</script>
//    - Com innerHTML direto, isso EXECUTARIA
//    - Precisamos ESCAPAR o HTML antes de processar
//
// 3. Fluxo Seguro
//    a) Receber texto puro do usuário
//    b) ESCAPAR caracteres HTML perigosos (< > & " ')
//    c) DEPOIS aplicar nossas transformações controladas
//    d) Resultado: HTML seguro com apenas as tags que permitimos
//
// SINTAXE SUPORTADA
// =================
// - \n → quebra de linha (<br>)
// - *texto* → destaque (<span class="text-highlight">texto</span>)
// - Sem aninhamento, sem outros símbolos
//

const TextRenderer = {
    
    // ==========================================
    // Escapar caracteres HTML perigosos
    // SEMPRE fazer isso ANTES de qualquer transformação
    // ==========================================
    escapeHTML(text) {
        if (!text) return '';
        
        const escapeMap = {
            '&': '&amp;',   // & deve ser primeiro!
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        
        return text.replace(/[&<>"']/g, char => escapeMap[char]);
    },
    
    // ==========================================
    // Renderizar texto com destaque
    // Converte sintaxe mínima para HTML seguro
    // ==========================================
    render(text) {
        if (!text) return '';
        
        // 1. ESCAPAR HTML primeiro (segurança)
        let safe = this.escapeHTML(text);
        
        // 2. Converter *texto* para destaque
        // Regex: *texto* onde texto não contém * nem quebra de linha
        // Não permite aninhamento
        safe = safe.replace(
            /\*([^*\n]+)\*/g, 
            '<span class="text-highlight">$1</span>'
        );
        
        // 3. Converter quebras de linha para <br>
        safe = safe.replace(/\n/g, '<br>');
        
        return safe;
    },
    
    // ==========================================
    // Renderizar para exibição em card (versão curta)
    // Limita o tamanho e remove quebras extras
    // ==========================================
    renderShort(text, maxLength = 150) {
        if (!text) return '';
        
        // Truncar se muito longo
        let truncated = text;
        if (text.length > maxLength) {
            truncated = text.substring(0, maxLength).trim() + '...';
        }
        
        return this.render(truncated);
    },
    
    // ==========================================
    // Renderizar para exibição detalhada (versão completa)
    // Preserva todas as quebras de linha
    // ==========================================
    renderFull(text) {
        return this.render(text);
    },
    
    // ==========================================
    // Verificar se texto contém destaques
    // Útil para UI (mostrar dica sobre sintaxe)
    // ==========================================
    hasHighlights(text) {
        if (!text) return false;
        return /\*[^*\n]+\*/.test(text);
    },
    
    // ==========================================
    // Remover sintaxe de destaque (para busca)
    // ==========================================
    stripHighlights(text) {
        if (!text) return '';
        return text.replace(/\*([^*\n]+)\*/g, '$1');
    }
};

// ============================================
// GERENCIADOR DE DADOS E PERSISTÊNCIA
// ============================================

const DataManager = {
    // Chaves do localStorage
    KEYS: {
        locais: 'rpg_locais',
        npcs: 'rpg_npcs',
        pistas: 'rpg_pistas',
        monstros: 'rpg_monstros'
    },

    // Carregar dados do localStorage
    load(key) {
        try {
            const data = localStorage.getItem(this.KEYS[key]);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error(`Erro ao carregar ${key}:`, error);
            return [];
        }
    },

    // Salvar dados no localStorage
    save(key, data) {
        try {
            localStorage.setItem(this.KEYS[key], JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`Erro ao salvar ${key}:`, error);
            return false;
        }
    },

    // Adicionar item
    add(key, item) {
        const data = this.load(key);
        item.id = this.generateId();
        item.createdAt = new Date().toISOString();
        data.push(item);
        this.save(key, data);
        return item;
    },

    // Atualizar item
    update(key, id, updatedItem) {
        const data = this.load(key);
        const index = data.findIndex(item => item.id === id);
        if (index !== -1) {
            data[index] = { ...data[index], ...updatedItem, updatedAt: new Date().toISOString() };
            this.save(key, data);
            return data[index];
        }
        return null;
    },

    // Deletar item
    delete(key, id) {
        const data = this.load(key);
        const filtered = data.filter(item => item.id !== id);
        this.save(key, filtered);
        return filtered.length < data.length;
    },

    // Buscar item por ID
    getById(key, id) {
        const data = this.load(key);
        return data.find(item => item.id === id);
    },

    // Gerar ID único
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // Exportar todos os dados
    exportAll() {
        const allData = {
            locais: this.load('locais'),
            npcs: this.load('npcs'),
            pistas: this.load('pistas'),
            monstros: this.load('monstros'),
            exportedAt: new Date().toISOString()
        };
        return JSON.stringify(allData, null, 2);
    },

    // Importar todos os dados
    importAll(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.locais) this.save('locais', data.locais);
            if (data.npcs) this.save('npcs', data.npcs);
            if (data.pistas) this.save('pistas', data.pistas);
            if (data.monstros) this.save('monstros', data.monstros);
            return true;
        } catch (error) {
            console.error('Erro ao importar dados:', error);
            return false;
        }
    }
};

// ============================================
// GERENCIADOR DE UI
// ============================================

const UIManager = {
    // Alternar views
    switchView(viewName) {
        // Atualizar navegação
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewName);
        });

        // Atualizar seções
        document.querySelectorAll('.view-section').forEach(section => {
            section.classList.toggle('active', section.id === `view-${viewName}`);
        });

        // Renderizar a view apropriada
        app.renderCurrentView();
    },

    // Abrir modal
    openModal(title, content) {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        modalTitle.textContent = title;
        modalBody.innerHTML = content;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    // Fechar modal
    closeModal() {
        const modal = document.getElementById('modal');
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    },

    // Mostrar empty state
    toggleEmptyState(type, isEmpty) {
        // Mapeamento correto de IDs
        const emptyIdMap = {
            'locais': 'emptyLocais',
            'npcs': 'emptyNPCs',
            'pistas': 'emptyPistas',
            'monstros': 'emptyMonstros'
        };
        
        const gridIdMap = {
            'locais': 'locaisGrid',
            'npcs': 'npcsGrid',
            'pistas': 'pistasGrid',
            'monstros': 'monstrosGrid'
        };
        
        const emptyState = document.getElementById(emptyIdMap[type]);
        const grid = document.getElementById(gridIdMap[type]);
        
        if (emptyState && grid) {
            if (isEmpty) {
                emptyState.classList.remove('hidden');
                grid.classList.add('hidden');
            } else {
                emptyState.classList.add('hidden');
                grid.classList.remove('hidden');
            }
        }
    },

    // Confirmar exclusão
    confirmDelete(message = 'Tem certeza que deseja excluir este item?') {
        return confirm(message);
    },

    // Alerta de sucesso
    showSuccess(message) {
        alert(message);
    },

    // Alerta de erro
    showError(message) {
        alert(message);
    }
};

// ============================================
// RENDERIZADORES DE CARDS
// ============================================

const CardRenderer = {
    // Obter caminho completo do local (breadcrumb)
    getLocalBreadcrumb(local, locais) {
        const path = [];
        let current = local;
        while (current.parentId) {
            const parent = locais.find(l => l.id === current.parentId);
            if (parent) {
                path.unshift(parent.nome);
                current = parent;
            } else break;
        }
        return path;
    },

    // Contar sub-locais diretos
    countSubLocais(localId, locais) {
        return locais.filter(l => l.parentId === localId).length;
    },

    // Renderizar card de local com sistema de níveis hierárquicos
    renderLocalCard(local, options = {}) {
        const locais = DataManager.load('locais');
        const npcsCount = local.npcs ? local.npcs.length : 0;
        const pistasCount = local.pistas ? local.pistas.length : 0;
        const monstrosCount = local.monstros ? local.monstros.length : 0;
        const subLocaisCount = this.countSubLocais(local.id, locais);
        const breadcrumb = this.getLocalBreadcrumb(local, locais);
        
        // Calcular nível hierárquico
        const level = HierarchyManager.getLevel(local.id, locais);
        const levelLabel = HierarchyManager.getLevelLabel(level);
        
        // Verificar visibilidade no modo foco
        const isVisible = HierarchyManager.isVisible(local.id, locais);
        const hiddenClass = isVisible ? '' : 'hierarchy-hidden';
        
        // Verificar se é o local em foco
        const isFocused = HierarchyManager.currentFocusId === local.id;
        const focusedClass = isFocused ? 'hierarchy-focused' : '';

        return `
            <div class="card level-${level} ${hiddenClass} ${focusedClass}" data-local-id="${local.id}" data-level="${level}">
                <span class="card-level-badge level-${level}">${levelLabel}</span>
                ${breadcrumb.length > 0 && !HierarchyManager.currentFocusId ? `
                    <div class="card-breadcrumb">
                        ${breadcrumb.join(' › ')}
                    </div>
                ` : ''}
                <div class="card-image ${local.imagem ? '' : 'placeholder'}" onclick="app.viewDetail('local', '${local.id}')">
                    ${local.imagem ? `<img src="${local.imagem}" alt="${local.nome}" style="width:100%;height:100%;object-fit:cover;">` : '📍'}
                </div>
                <div class="card-body">
                    <h3 class="card-title">${local.nome || 'Local Sem Nome'}</h3>
                    <p class="card-description">${TextRenderer.renderShort(local.descricao) || 'Sem descrição'}</p>
                    <div class="card-meta">
                        ${subLocaisCount > 0 ? HierarchyManager.renderSublocaisIndicator(local, subLocaisCount) : ''}
                        <span class="card-badge">👥 ${npcsCount} NPCs</span>
                        <span class="card-badge">🔍 ${pistasCount} Pistas</span>
                        <span class="card-badge">⚔️ ${monstrosCount} Monstros</span>
                    </div>
                    <div class="card-actions">
                        <button class="card-btn" onclick="app.viewDetail('local', '${local.id}')">Ver</button>
                        <button class="card-btn" onclick="app.editItem('local', '${local.id}')">Editar</button>
                        <button class="card-btn danger" onclick="app.deleteItem('local', '${local.id}', '${local.nome}')">Excluir</button>
                    </div>
                </div>
            </div>
        `;
    },

    // Renderizar card de NPC
    renderNPCCard(npc) {
        const vinculosCount = npc.vinculos ? npc.vinculos.length : 0;
        const pistasCount = npc.pistas ? npc.pistas.length : 0;

        return `
            <div class="card">
                <div class="card-image ${npc.imagem ? '' : 'placeholder'}" onclick="app.viewDetail('npc', '${npc.id}')">
                    ${npc.imagem ? `<img src="${npc.imagem}" alt="${npc.nome}" style="width:100%;height:100%;object-fit:cover;">` : '👤'}
                </div>
                <div class="card-body">
                    <h3 class="card-title">${npc.nome || 'NPC Sem Nome'}</h3>
                    <p class="card-description">${TextRenderer.renderShort(npc.descricao) || 'Sem descrição'}</p>
                    <div class="card-meta">
                        ${npc.idade ? `<span class="card-badge">📅 ${npc.idade} anos</span>` : ''}
                        <span class="card-badge">🔗 ${vinculosCount} vínculos</span>
                        <span class="card-badge">🔍 ${pistasCount} pistas</span>
                    </div>
                    <div class="card-actions">
                        <button class="card-btn" onclick="app.viewDetail('npc', '${npc.id}')">Ver</button>
                        <button class="card-btn" onclick="app.editItem('npc', '${npc.id}')">Editar</button>
                        <button class="card-btn danger" onclick="app.deleteItem('npc', '${npc.id}', '${npc.nome}')">Excluir</button>
                    </div>
                </div>
            </div>
        `;
    },

    // Renderizar card de pista
    renderPistaCard(pista) {
        const npcsCount = pista.npcs ? pista.npcs.length : 0;
        const locaisCount = pista.locais ? pista.locais.length : 0;

        return `
            <div class="card">
                <div class="card-image ${pista.imagem ? '' : 'placeholder'}" onclick="app.viewDetail('pista', '${pista.id}')">
                    ${pista.imagem ? `<img src="${pista.imagem}" alt="${pista.nome}" style="width:100%;height:100%;object-fit:cover;">` : '🔍'}
                </div>
                <div class="card-body">
                    <h3 class="card-title">${pista.nome || 'Pista Sem Nome'}</h3>
                    <p class="card-description">${TextRenderer.renderShort(pista.descricao) || 'Sem descrição'}</p>
                    <div class="card-meta">
                        <span class="card-badge">👥 ${npcsCount} NPCs</span>
                        <span class="card-badge">📍 ${locaisCount} Locais</span>
                    </div>
                    <div class="card-actions">
                        <button class="card-btn" onclick="app.viewDetail('pista', '${pista.id}')">Ver</button>
                        <button class="card-btn" onclick="app.editItem('pista', '${pista.id}')">Editar</button>
                        <button class="card-btn danger" onclick="app.deleteItem('pista', '${pista.id}', '${pista.nome}')">Excluir</button>
                    </div>
                </div>
            </div>
        `;
    },

    // Renderizar card de monstro
    renderMonstroCard(monstro) {
        const locaisCount = monstro.locais ? monstro.locais.length : 0;

        return `
            <div class="card">
                <div class="card-image ${monstro.imagem ? '' : 'placeholder'}" onclick="app.viewDetail('monstro', '${monstro.id}')">
                    ${monstro.imagem ? `<img src="${monstro.imagem}" alt="${monstro.nome}" style="width:100%;height:100%;object-fit:cover;">` : '⚔️'}
                </div>
                <div class="card-body">
                    <h3 class="card-title">${monstro.nome || 'Monstro Sem Nome'}</h3>
                    <p class="card-description">${TextRenderer.renderShort(monstro.descricao) || 'Sem descrição'}</p>
                    <div class="card-meta">
                        <span class="card-badge">📍 ${locaisCount} Locais</span>
                    </div>
                    <div class="card-actions">
                        <button class="card-btn" onclick="app.viewDetail('monstro', '${monstro.id}')">Ver</button>
                        <button class="card-btn" onclick="app.editItem('monstro', '${monstro.id}')">Editar</button>
                        <button class="card-btn danger" onclick="app.deleteItem('monstro', '${monstro.id}', '${monstro.nome}')">Excluir</button>
                    </div>
                </div>
            </div>
        `;
    }
};

// ============================================
// GERENCIADOR DE FORMULÁRIOS
// ============================================

const FormManager = {
    // Renderizar multi-select
    renderMultiSelect(name, label, options, selectedIds = []) {
        const selectedOptions = options.filter(opt => selectedIds.includes(opt.id));
        
        return `
            <div class="form-group">
                <label class="form-label">${label}</label>
                <div class="multi-select-wrapper">
                    <div class="selected-items" id="selected-${name}">
                        ${selectedOptions.map(opt => `
                            <span class="selected-tag" data-id="${opt.id}">
                                ${opt.nome}
                                <button type="button" class="tag-remove" onclick="FormManager.removeTag('${name}', '${opt.id}')">&times;</button>
                            </span>
                        `).join('')}
                    </div>
                    <div class="select-dropdown" id="dropdown-${name}">
                        ${options.map(opt => `
                            <div class="select-option ${selectedIds.includes(opt.id) ? 'selected' : ''}" 
                                 data-id="${opt.id}"
                                 onclick="FormManager.toggleOption('${name}', '${opt.id}', '${opt.nome}')">
                                <input type="checkbox" ${selectedIds.includes(opt.id) ? 'checked' : ''} onclick="event.stopPropagation()">
                                ${opt.nome}
                            </div>
                        `).join('')}
                        ${options.length === 0 ? '<div class="select-option" style="opacity:0.5;">Nenhum item disponível</div>' : ''}
                    </div>
                </div>
                <input type="hidden" name="${name}" id="input-${name}" value="${selectedIds.join(',')}">
            </div>
        `;
    },

    // Adicionar/remover opção no multi-select
    toggleOption(name, id, nome) {
        const input = document.getElementById(`input-${name}`);
        const selectedContainer = document.getElementById(`selected-${name}`);
        const option = document.querySelector(`#dropdown-${name} [data-id="${id}"]`);
        
        let selectedIds = input.value ? input.value.split(',') : [];
        
        if (selectedIds.includes(id)) {
            selectedIds = selectedIds.filter(sid => sid !== id);
            option.classList.remove('selected');
            option.querySelector('input').checked = false;
        } else {
            selectedIds.push(id);
            option.classList.add('selected');
            option.querySelector('input').checked = true;
        }
        
        input.value = selectedIds.join(',');
        this.updateSelectedTags(name, selectedIds);
    },

    // Atualizar tags selecionadas
    updateSelectedTags(name, selectedIds) {
        const selectedContainer = document.getElementById(`selected-${name}`);
        const dropdown = document.getElementById(`dropdown-${name}`);
        
        let items = [];
        selectedIds.forEach(id => {
            const option = dropdown.querySelector(`[data-id="${id}"]`);
            if (option) {
                const nome = option.textContent.trim();
                items.push({ id, nome });
            }
        });
        
        selectedContainer.innerHTML = items.map(item => `
            <span class="selected-tag" data-id="${item.id}">
                ${item.nome}
                <button type="button" class="tag-remove" onclick="FormManager.removeTag('${name}', '${item.id}')">&times;</button>
            </span>
        `).join('');
    },

    // Remover tag
    removeTag(name, id) {
        const input = document.getElementById(`input-${name}`);
        const option = document.querySelector(`#dropdown-${name} [data-id="${id}"]`);
        
        let selectedIds = input.value ? input.value.split(',') : [];
        selectedIds = selectedIds.filter(sid => sid !== id);
        
        input.value = selectedIds.join(',');
        
        if (option) {
            option.classList.remove('selected');
            option.querySelector('input').checked = false;
        }
        
        this.updateSelectedTags(name, selectedIds);
    },

    // Obter valores do formulário
    getFormData(formId) {
        const form = document.getElementById(formId);
        if (!form) {
            return null;
        }
        
        const formData = new FormData(form);
        const data = {};
        
        try {
            for (let [key, value] of formData.entries()) {
                // Arrays de relacionamentos
                if (key === 'npcs' || key === 'pistas' || key === 'monstros' || key === 'locais' || key === 'vinculos') {
                    // Converte string separada por vírgula em array, filtrando vazios
                    data[key] = value && value.trim() !== '' ? value.split(',').filter(id => id.trim() !== '') : [];
                } 
                // Campos numéricos (idade)
                else if (key === 'idade') {
                    // Converte para número ou null se vazio
                    const numValue = value?.trim();
                    data[key] = numValue && numValue !== '' ? parseInt(numValue, 10) : null;
                }
                // Campo parentId (referência ao local pai)
                else if (key === 'parentId') {
                    data[key] = value && value.trim() !== '' ? value.trim() : null;
                }
                // Demais campos (texto)
                else {
                    data[key] = value || '';
                }
            }
            
            return data;
        } catch (error) {
            console.error('Erro ao processar dados do formulário:', error);
            return null;
        }
    }
};

// ============================================
// RENDERIZADORES DE FORMULÁRIOS
// ============================================

const FormRenderer = {
    // Renderizar campo de upload de imagem
    renderImageUpload(name, currentImage = null, icon = '🖼️') {
        const previewId = `preview-${name}`;
        const inputId = `input-${name}`;
        
        return `
            <div class="form-group">
                <label class="form-label">Imagem</label>
                <div class="image-upload-container">
                    <div class="image-preview ${currentImage ? '' : 'placeholder'}" id="${previewId}">
                        ${currentImage ? `<img src="${currentImage}" alt="Preview">` : icon}
                    </div>
                    <div class="image-upload-actions">
                        <button type="button" class="btn-upload" onclick="FormRenderer.selectImage('${name}', '${icon}')">
                            📤 Carregar Imagem
                        </button>
                        <button type="button" class="btn-remove-image" id="remove-${name}" onclick="FormRenderer.removeImage('${name}', '${icon}')" ${!currentImage ? 'style="display:none;"' : ''}>
                            🗑️ Remover
                        </button>
                        <p class="form-help">Selecione uma imagem do seu computador</p>
                    </div>
                </div>
                <input type="hidden" name="${name}" id="${inputId}" value="${currentImage || ''}">
            </div>
        `;
    },
    
    // Selecionar e recortar imagem
    selectImage(name, icon) {
        ImageManager.selectImage((imageData) => {
            const preview = document.getElementById(`preview-${name}`);
            const input = document.getElementById(`input-${name}`);
            const removeBtn = document.getElementById(`remove-${name}`);
            
            preview.classList.remove('placeholder');
            preview.innerHTML = `<img src="${imageData}" alt="Preview">`;
            input.value = imageData;
            removeBtn.style.display = 'block';
        });
    },
    
    // Remover imagem
    removeImage(name, icon) {
        const preview = document.getElementById(`preview-${name}`);
        const input = document.getElementById(`input-${name}`);
        const removeBtn = document.getElementById(`remove-${name}`);
        
        preview.classList.add('placeholder');
        preview.innerHTML = icon;
        input.value = '';
        removeBtn.style.display = 'none';
    },
    
    // Formulário de Local
    renderLocalForm(local = null) {
        const npcs = DataManager.load('npcs');
        const pistas = DataManager.load('pistas');
        const monstros = DataManager.load('monstros');
        const locais = DataManager.load('locais');
        
        // Filtrar locais que podem ser pai (excluir o próprio local e seus descendentes)
        const getDescendantIds = (parentId) => {
            const descendants = [];
            const findChildren = (id) => {
                locais.filter(l => l.parentId === id).forEach(child => {
                    descendants.push(child.id);
                    findChildren(child.id);
                });
            };
            findChildren(parentId);
            return descendants;
        };
        
        const excludeIds = local ? [local.id, ...getDescendantIds(local.id)] : [];
        const availableParents = locais.filter(l => !excludeIds.includes(l.id));
        
        // Função para obter o caminho completo do local
        const getLocalPath = (localItem) => {
            const path = [localItem.nome];
            let current = localItem;
            while (current.parentId) {
                const parent = locais.find(l => l.id === current.parentId);
                if (parent) {
                    path.unshift(parent.nome);
                    current = parent;
                } else break;
            }
            return path.join(' > ');
        };
        
        return `
            <form id="formLocal" onsubmit="app.saveItem(event, 'local', '${local?.id || ''}')">
                <div class="form-group">
                    <label class="form-label">Nome do Local *</label>
                    <input type="text" name="nome" class="form-input" value="${local?.nome || ''}" required placeholder="Ex: Taverna do Dragão Dourado">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Local Pai (opcional)</label>
                    <select name="parentId" class="form-input">
                        <option value="">— Nenhum (local raiz) —</option>
                        ${availableParents.map(l => `
                            <option value="${l.id}" ${local?.parentId === l.id ? 'selected' : ''}>
                                ${getLocalPath(l)}
                            </option>
                        `).join('')}
                    </select>
                    <small style="color: var(--text-secondary); font-size: 0.85rem;">Se este local fica dentro de outro maior, selecione o local pai</small>
                </div>
                
                ${this.renderImageUpload('imagem', local?.imagem, '📍')}
                
                <div class="form-group">
                    <label class="form-label">Descrição *</label>
                    <textarea name="descricao" class="form-textarea" required placeholder="Descreva o local...">${local?.descricao || ''}</textarea>
                </div>
                
                ${FormManager.renderMultiSelect('npcs', 'NPCs neste Local', npcs, local?.npcs || [])}
                ${FormManager.renderMultiSelect('pistas', 'Pistas Disponíveis', pistas, local?.pistas || [])}
                ${FormManager.renderMultiSelect('monstros', 'Monstros Encontrados', monstros, local?.monstros || [])}
                
                <div class="form-actions">
                    <button type="submit" class="btn-primary">💾 Salvar</button>
                    <button type="button" class="btn-secondary" onclick="UIManager.closeModal()">Cancelar</button>
                </div>
            </form>
        `;
    },

    // Formulário de NPC
    renderNPCForm(npc = null) {
        const allNpcs = DataManager.load('npcs').filter(n => n.id !== npc?.id);
        const pistas = DataManager.load('pistas');
        
        return `
            <form id="formNPC" onsubmit="app.saveItem(event, 'npc', '${npc?.id || ''}')">
                <div class="form-group">
                    <label class="form-label">Nome do NPC *</label>
                    <input type="text" name="nome" class="form-input" value="${npc?.nome || ''}" required placeholder="Ex: Tibério Folhadoble">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Idade</label>
                    <input type="number" name="idade" class="form-input" value="${npc?.idade !== null && npc?.idade !== undefined ? npc.idade : ''}" placeholder="Ex: 52" min="0">
                </div>
                
                ${this.renderImageUpload('imagem', npc?.imagem, '👤')}
                
                <div class="form-group">
                    <label class="form-label">Descrição *</label>
                    <textarea name="descricao" class="form-textarea" required placeholder="Descreva o NPC...">${npc?.descricao || ''}</textarea>
                </div>
                
                ${FormManager.renderMultiSelect('vinculos', 'Vínculos com Outros NPCs', allNpcs, npc?.vinculos || [])}
                ${FormManager.renderMultiSelect('pistas', 'Pistas que o NPC Possui', pistas, npc?.pistas || [])}
                
                <div class="form-actions">
                    <button type="submit" class="btn-primary">💾 Salvar</button>
                    <button type="button" class="btn-secondary" onclick="UIManager.closeModal()">Cancelar</button>
                </div>
            </form>
        `;
    },

    // Formulário de Pista
    renderPistaForm(pista = null) {
        const locais = DataManager.load('locais');
        const npcs = DataManager.load('npcs');
        
        return `
            <form id="formPista" onsubmit="app.saveItem(event, 'pista', '${pista?.id || ''}')">
                <div class="form-group">
                    <label class="form-label">Nome da Pista *</label>
                    <input type="text" name="nome" class="form-input" value="${pista?.nome || ''}" required placeholder="Ex: Mapa do Tesouro Rasgado">
                </div>
                
                ${FormRenderer.renderImageUpload('imagem', pista?.imagem, '🔍')}
                
                <div class="form-group">
                    <label class="form-label">Descrição *</label>
                    <textarea name="descricao" class="form-textarea" required placeholder="Descreva a pista...">${pista?.descricao || ''}</textarea>
                </div>
                
                ${FormManager.renderMultiSelect('locais', 'Locais Onde Pode Ser Encontrada', locais, pista?.locais || [])}
                ${FormManager.renderMultiSelect('npcs', 'NPCs que Podem Fornecer', npcs, pista?.npcs || [])}
                
                <div class="form-actions">
                    <button type="submit" class="btn-primary">💾 Salvar</button>
                    <button type="button" class="btn-secondary" onclick="UIManager.closeModal()">Cancelar</button>
                </div>
            </form>
        `;
    },

    // Formulário de Monstro
    renderMonstroForm(monstro = null) {
        const locais = DataManager.load('locais');
        
        return `
            <form id="formMonstro" onsubmit="app.saveItem(event, 'monstro', '${monstro?.id || ''}')">
                <div class="form-group">
                    <label class="form-label">Nome do Monstro *</label>
                    <input type="text" name="nome" class="form-input" value="${monstro?.nome || ''}" required placeholder="Ex: Lobo Espectral">
                </div>
                
                ${FormRenderer.renderImageUpload('imagem', monstro?.imagem, '⚔️')}
                </div>
                
                <div class="form-group">
                    <label class="form-label">Descrição *</label>
                    <textarea name="descricao" class="form-textarea" required placeholder="Descreva o monstro...">${monstro?.descricao || ''}</textarea>
                </div>
                
                ${FormManager.renderMultiSelect('locais', 'Locais Onde Aparece', locais, monstro?.locais || [])}
                
                <div class="form-actions">
                    <button type="submit" class="btn-primary">💾 Salvar</button>
                    <button type="button" class="btn-secondary" onclick="UIManager.closeModal()">Cancelar</button>
                </div>
            </form>
        `;
    }
};

// ============================================
// GERENCIADOR DE HIERARQUIA DE LOCAIS
// ============================================

const HierarchyManager = {
    // Estado atual da navegação hierárquica
    currentFocusId: null,  // ID do local em foco (null = visão geral)
    focusPath: [],         // Caminho de navegação [raiz, filho, neto...]
    
    // Labels por nível hierárquico
    levelLabels: ['Região', 'Cidade', 'Local', 'Sub-local', 'Detalhe'],
    
    // Calcular nível hierárquico de um local
    getLevel(localId, locais) {
        let level = 0;
        let current = locais.find(l => l.id === localId);
        
        while (current && current.parentId) {
            level++;
            current = locais.find(l => l.id === current.parentId);
            if (level > 10) break; // Segurança contra loops infinitos
        }
        
        return Math.min(level, 4); // Máximo 5 níveis (0-4)
    },
    
    // Obter label do nível
    getLevelLabel(level) {
        return this.levelLabels[level] || 'Sub-local';
    },
    
    // Obter todos os descendentes de um local (filhos, netos, etc.)
    getDescendants(localId, locais) {
        const descendants = [];
        const queue = [localId];
        
        while (queue.length > 0) {
            const currentId = queue.shift();
            const children = locais.filter(l => l.parentId === currentId);
            
            children.forEach(child => {
                descendants.push(child.id);
                queue.push(child.id);
            });
        }
        
        return descendants;
    },
    
    // Obter caminho de ancestrais (do mais antigo ao atual)
    getAncestorPath(localId, locais) {
        const path = [];
        let current = locais.find(l => l.id === localId);
        
        while (current) {
            path.unshift(current);
            if (current.parentId) {
                current = locais.find(l => l.id === current.parentId);
            } else {
                break;
            }
        }
        
        return path;
    },
    
    // Obter filhos diretos de um local
    getChildren(localId, locais) {
        return locais.filter(l => l.parentId === localId);
    },
    
    // Focar em um local (mostrar apenas ele e seus descendentes)
    focusOn(localId) {
        const locais = DataManager.load('locais');
        
        if (!localId) {
            // Voltar à visão geral
            this.currentFocusId = null;
            this.focusPath = [];
        } else {
            const local = locais.find(l => l.id === localId);
            if (!local) return;
            
            this.currentFocusId = localId;
            this.focusPath = this.getAncestorPath(localId, locais);
        }
        
        // Atualizar UI
        this.updateNavigationUI();
        app.renderLocais();
    },
    
    // Voltar um nível na hierarquia
    goBack() {
        if (this.focusPath.length <= 1) {
            // Voltar à visão geral
            this.focusOn(null);
        } else {
            // Voltar ao pai
            const parentIndex = this.focusPath.length - 2;
            this.focusOn(this.focusPath[parentIndex].id);
        }
    },
    
    // Resetar para visão geral
    reset() {
        this.focusOn(null);
    },
    
    // Verificar se um local deve ser visível no estado atual
    isVisible(localId, locais) {
        if (!this.currentFocusId) {
            // Visão geral: mostrar todos
            return true;
        }
        
        // No modo foco, mostrar apenas:
        // 1. O local em foco
        // 2. Seus descendentes diretos e indiretos
        if (localId === this.currentFocusId) return true;
        
        const descendants = this.getDescendants(this.currentFocusId, locais);
        return descendants.includes(localId);
    },
    
    // Atualizar UI de navegação (breadcrumb)
    updateNavigationUI() {
        const navContainer = document.getElementById('hierarchyNav');
        if (!navContainer) return;
        
        if (!this.currentFocusId) {
            navContainer.classList.add('hidden');
            document.getElementById('locaisGrid')?.classList.remove('focused-mode');
            return;
        }
        
        navContainer.classList.remove('hidden');
        document.getElementById('locaisGrid')?.classList.add('focused-mode');
        
        // Construir navegação
        let html = `
            <button class="hierarchy-btn" onclick="HierarchyManager.reset()" title="Visão geral">
                🏠 Visão Geral
            </button>
            <div class="hierarchy-path">
        `;
        
        this.focusPath.forEach((local, index) => {
            const isLast = index === this.focusPath.length - 1;
            const level = this.getLevel(local.id, DataManager.load('locais'));
            
            if (index > 0) {
                html += '<span class="hierarchy-path-separator">›</span>';
            }
            
            html += `
                <span class="hierarchy-path-item ${isLast ? 'current' : ''}" 
                      onclick="HierarchyManager.focusOn('${local.id}')"
                      title="${this.getLevelLabel(level)}">
                    ${local.nome}
                </span>
            `;
        });
        
        html += '</div>';
        
        // Botão de voltar
        if (this.focusPath.length > 0) {
            html += `
                <button class="hierarchy-btn" onclick="HierarchyManager.goBack()" title="Voltar um nível">
                    ← Voltar
                </button>
            `;
        }
        
        navContainer.innerHTML = html;
    },
    
    // Renderizar indicador de sub-locais em um card
    renderSublocaisIndicator(local, sublocaisCount) {
        if (sublocaisCount === 0) return '';
        
        return `
            <div class="card-sublocais-indicator" onclick="event.stopPropagation(); HierarchyManager.focusOn('${local.id}')">
                📂 ${sublocaisCount} sub-${sublocaisCount === 1 ? 'local' : 'locais'} → Explorar
            </div>
        `;
    }
};

// ============================================
// RENDERIZADORES DE VISUALIZAÇÃO DETALHADA
// ============================================

const DetailRenderer = {
    // Visualização de Local
    renderLocalDetail(local) {
        const locais = DataManager.load('locais');
        const npcs = DataManager.load('npcs').filter(n => local.npcs?.includes(n.id));
        const pistas = DataManager.load('pistas').filter(p => local.pistas?.includes(p.id));
        const monstros = DataManager.load('monstros').filter(m => local.monstros?.includes(m.id));
        
        // Encontrar local pai
        const parentLocal = local.parentId ? locais.find(l => l.id === local.parentId) : null;
        
        // Encontrar sub-locais
        const subLocais = locais.filter(l => l.parentId === local.id);
        
        // Obter breadcrumb completo
        const getBreadcrumb = () => {
            const path = [];
            let current = local;
            while (current.parentId) {
                const parent = locais.find(l => l.id === current.parentId);
                if (parent) {
                    path.unshift(parent);
                    current = parent;
                } else break;
            }
            return path;
        };
        const breadcrumb = getBreadcrumb();
        
        return `
            <div class="detail-view">
                <div class="detail-image ${local.imagem ? '' : 'placeholder'}">
                    ${local.imagem ? `<img src="${local.imagem}" alt="${local.nome}" style="width:100%;height:100%;object-fit:cover;">` : '📍'}
                </div>
                
                <div class="detail-content">
                    ${breadcrumb.length > 0 ? `
                    <div class="detail-breadcrumb">
                        ${breadcrumb.map(l => `<span class="breadcrumb-item" onclick="app.viewDetail('local', '${l.id}')">${l.nome}</span>`).join(' › ')}
                        <span class="breadcrumb-current"> › ${local.nome}</span>
                    </div>
                    ` : ''}
                    
                    <div class="detail-header">
                        <h2 class="detail-title">${local.nome}</h2>
                    </div>
                
                <div class="detail-section">
                    <h3 class="detail-section-title">📝 Descrição</h3>
                    <p class="detail-text">${TextRenderer.renderFull(local.descricao) || 'Sem descrição'}</p>
                </div>
                
                ${subLocais.length > 0 ? `
                <div class="detail-section">
                    <h3 class="detail-section-title">📂 Sub-locais</h3>
                    <div class="detail-list">
                        ${subLocais.map(sub => `
                            <div class="detail-list-item detail-list-item-sublocation" onclick="app.viewDetail('local', '${sub.id}')">
                                📍 ${sub.nome}
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                ${npcs.length > 0 ? `
                <div class="detail-section">
                    <h3 class="detail-section-title">👥 NPCs neste Local</h3>
                    <div class="detail-list">
                        ${npcs.map(npc => `
                            <div class="detail-list-item" onclick="app.viewDetail('npc', '${npc.id}')">${npc.nome}</div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                ${pistas.length > 0 ? `
                <div class="detail-section">
                    <h3 class="detail-section-title">🔍 Pistas Disponíveis</h3>
                    <div class="detail-list">
                        ${pistas.map(pista => `
                            <div class="detail-list-item" onclick="app.viewDetail('pista', '${pista.id}')">${pista.nome}</div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                ${monstros.length > 0 ? `
                <div class="detail-section">
                    <h3 class="detail-section-title">⚔️ Monstros Encontrados</h3>
                    <div class="detail-list">
                        ${monstros.map(monstro => `
                            <div class="detail-list-item" onclick="app.viewDetail('monstro', '${monstro.id}')">${monstro.nome}</div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                <div class="detail-actions">
                    <button class="btn-primary" onclick="app.editItem('local', '${local.id}')">✏️ Editar</button>
                    <button class="btn-danger" onclick="app.deleteItem('local', '${local.id}', '${local.nome}')">🗑️ Excluir</button>
                </div>
            </div>
        `;
    },

    // Visualização de NPC
    renderNPCDetail(npc) {
        const vinculos = DataManager.load('npcs').filter(n => npc.vinculos?.includes(n.id));
        const pistas = DataManager.load('pistas').filter(p => npc.pistas?.includes(p.id));
        const locais = DataManager.load('locais').filter(l => l.npcs?.includes(npc.id));
        
        return `
            <div class="detail-view">
                <div class="detail-image ${npc.imagem ? '' : 'placeholder'}">
                    ${npc.imagem ? `<img src="${npc.imagem}" alt="${npc.nome}" style="width:100%;height:100%;object-fit:cover;">` : '👤'}
                </div>
                
                <div class="detail-content">
                    <div class="detail-header">
                        <h2 class="detail-title">${npc.nome}</h2>
                    </div>
                
                ${npc.idade ? `
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-item-label">Idade</div>
                        <div class="detail-item-value">${npc.idade} anos</div>
                    </div>
                </div>
                ` : ''}
                
                <div class="detail-section">
                    <h3 class="detail-section-title">📝 Descrição</h3>
                    <p class="detail-text">${TextRenderer.renderFull(npc.descricao) || 'Sem descrição'}</p>
                </div>
                
                ${vinculos.length > 0 ? `
                <div class="detail-section">
                    <h3 class="detail-section-title">🔗 Vínculos</h3>
                    <div class="detail-list">
                        ${vinculos.map(v => `
                            <div class="detail-list-item" onclick="app.viewDetail('npc', '${v.id}')">${v.nome}</div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                ${pistas.length > 0 ? `
                <div class="detail-section">
                    <h3 class="detail-section-title">🔍 Pistas que Possui</h3>
                    <div class="detail-list">
                        ${pistas.map(p => `
                            <div class="detail-list-item" onclick="app.viewDetail('pista', '${p.id}')">${p.nome}</div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                ${locais.length > 0 ? `
                <div class="detail-section">
                    <h3 class="detail-section-title">📍 Locais Associados</h3>
                    <div class="detail-list">
                        ${locais.map(l => `
                            <div class="detail-list-item" onclick="app.viewDetail('local', '${l.id}')">${l.nome}</div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                    <div class="detail-actions">
                        <button class="btn-primary" onclick="app.editItem('npc', '${npc.id}')">✏️ Editar</button>
                        <button class="btn-danger" onclick="app.deleteItem('npc', '${npc.id}', '${npc.nome}')">🗑️ Excluir</button>
                    </div>
                </div>
            </div>
        `;
    },

    // Visualização de Pista
    renderPistaDetail(pista) {
        const locais = DataManager.load('locais').filter(l => pista.locais?.includes(l.id));
        const npcs = DataManager.load('npcs').filter(n => pista.npcs?.includes(n.id));
        
        return `
            <div class="detail-view">
                <div class="detail-image ${pista.imagem ? '' : 'placeholder'}">
                    ${pista.imagem ? `<img src="${pista.imagem}" alt="${pista.nome}" style="width:100%;height:100%;object-fit:cover;">` : '🔍'}
                </div>
                
                <div class="detail-content">
                    <div class="detail-header">
                        <h2 class="detail-title">${pista.nome}</h2>
                    </div>
                
                <div class="detail-section">
                    <h3 class="detail-section-title">📝 Descrição</h3>
                    <p class="detail-text">${TextRenderer.renderFull(pista.descricao) || 'Sem descrição'}</p>
                </div>
                
                ${locais.length > 0 ? `
                <div class="detail-section">
                    <h3 class="detail-section-title">📍 Locais Onde Pode Ser Encontrada</h3>
                    <div class="detail-list">
                        ${locais.map(l => `
                            <div class="detail-list-item" onclick="app.viewDetail('local', '${l.id}')">${l.nome}</div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                ${npcs.length > 0 ? `
                <div class="detail-section">
                    <h3 class="detail-section-title">👥 NPCs que Podem Fornecer</h3>
                    <div class="detail-list">
                        ${npcs.map(n => `
                            <div class="detail-list-item" onclick="app.viewDetail('npc', '${n.id}')">${n.nome}</div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                <div class="detail-actions">
                    <button class="btn-primary" onclick="app.editItem('pista', '${pista.id}')">✏️ Editar</button>
                    <button class="btn-danger" onclick="app.deleteItem('pista', '${pista.id}', '${pista.nome}')">🗑️ Excluir</button>
                </div>
            </div>
        `;
    },

    // Visualização de Monstro
    renderMonstroDetail(monstro) {
        const locais = DataManager.load('locais').filter(l => monstro.locais?.includes(l.id));
        
        return `
            <div class="detail-view">
                <div class="detail-image ${monstro.imagem ? '' : 'placeholder'}">
                    ${monstro.imagem ? `<img src="${monstro.imagem}" alt="${monstro.nome}" style="width:100%;height:100%;object-fit:cover;">` : '⚔️'}
                </div>
                
                <div class="detail-content">
                    <div class="detail-header">
                        <h2 class="detail-title">${monstro.nome}</h2>
                    </div>
                
                <div class="detail-section">
                    <h3 class="detail-section-title">📝 Descrição</h3>
                    <p class="detail-text">${TextRenderer.renderFull(monstro.descricao) || 'Sem descrição'}</p>
                </div>
                
                ${locais.length > 0 ? `
                <div class="detail-section">
                    <h3 class="detail-section-title">📍 Locais Onde Aparece</h3>
                    <div class="detail-list">
                        ${locais.map(l => `
                            <div class="detail-list-item" onclick="app.viewDetail('local', '${l.id}')">${l.nome}</div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                    <div class="detail-actions">
                        <button class="btn-primary" onclick="app.editItem('monstro', '${monstro.id}')">✏️ Editar</button>
                        <button class="btn-danger" onclick="app.deleteItem('monstro', '${monstro.id}', '${monstro.nome}')">🗑️ Excluir</button>
                    </div>
                </div>
            </div>
        `;
    }
};

// ============================================
// APPLICATION CORE
// ============================================

const app = {
    currentView: 'locais',
    
    // Inicializar aplicação
    init() {
        this.setupEventListeners();
        this.renderCurrentView();
    },

    // Configurar event listeners
    setupEventListeners() {
        // Navegação
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.currentView = e.currentTarget.dataset.view;
                UIManager.switchView(this.currentView);
            });
        });

        // Botões de criar
        document.getElementById('btnAddLocal')?.addEventListener('click', () => this.showForm('local'));
        document.getElementById('btnAddNPC')?.addEventListener('click', () => this.showForm('npc'));
        document.getElementById('btnAddPista')?.addEventListener('click', () => this.showForm('pista'));
        document.getElementById('btnAddMonstro')?.addEventListener('click', () => this.showForm('monstro'));

        // Modal
        document.getElementById('modalClose')?.addEventListener('click', () => UIManager.closeModal());
        document.querySelector('.modal-overlay')?.addEventListener('click', () => UIManager.closeModal());

        // Export/Import
        document.getElementById('exportData')?.addEventListener('click', () => this.exportData());
        document.getElementById('importData')?.addEventListener('click', () => document.getElementById('importFile').click());
        document.getElementById('importFile')?.addEventListener('change', (e) => this.importData(e));
    },

    // Renderizar view atual
    renderCurrentView() {
        switch(this.currentView) {
            case 'locais':
                this.renderLocais();
                break;
            case 'npcs':
                this.renderNPCs();
                break;
            case 'pistas':
                this.renderPistas();
                break;
            case 'monstros':
                this.renderMonstros();
                break;
        }
    },

    // Renderizar Locais
    renderLocais() {
        const locais = DataManager.load('locais');
        const grid = document.getElementById('locaisGrid');
        
        UIManager.toggleEmptyState('locais', locais.length === 0);
        
        if (locais.length > 0 && grid) {
            // Ordenar locais hierarquicamente
            const sortedLocais = this.sortLocaisHierarchically(locais);
            
            // Renderizar cards
            grid.innerHTML = sortedLocais.map(local => CardRenderer.renderLocalCard(local)).join('');
            
            // Atualizar navegação hierárquica
            HierarchyManager.updateNavigationUI();
        } else {
            // Resetar hierarquia se não há locais
            HierarchyManager.reset();
        }
    },
    
    // Ordenar locais: locais raiz primeiro, depois sub-locais agrupados por pai
    sortLocaisHierarchically(locais) {
        const result = [];
        const processed = new Set();
        
        // Função recursiva para adicionar local e seus filhos
        const addLocalAndChildren = (local, depth = 0) => {
            if (processed.has(local.id)) return;
            processed.add(local.id);
            result.push({ ...local, _depth: depth });
            
            // Encontrar e adicionar filhos
            const children = locais.filter(l => l.parentId === local.id);
            children.forEach(child => addLocalAndChildren(child, depth + 1));
        };
        
        // Começar com locais raiz (sem parentId)
        const rootLocais = locais.filter(l => !l.parentId);
        rootLocais.forEach(local => addLocalAndChildren(local, 0));
        
        // Adicionar locais órfãos (parentId aponta para local inexistente)
        locais.forEach(local => {
            if (!processed.has(local.id)) {
                result.push({ ...local, _depth: 0 });
            }
        });
        
        return result;
    },

    // Renderizar NPCs
    renderNPCs() {
        const npcs = DataManager.load('npcs');
        const grid = document.getElementById('npcsGrid');
        
        UIManager.toggleEmptyState('npcs', npcs.length === 0);
        
        if (npcs.length > 0 && grid) {
            grid.innerHTML = npcs.map(npc => CardRenderer.renderNPCCard(npc)).join('');
        }
    },

    // Renderizar Pistas
    renderPistas() {
        const pistas = DataManager.load('pistas');
        const grid = document.getElementById('pistasGrid');
        
        UIManager.toggleEmptyState('pistas', pistas.length === 0);
        
        if (pistas.length > 0 && grid) {
            grid.innerHTML = pistas.map(pista => CardRenderer.renderPistaCard(pista)).join('');
        }
    },

    // Renderizar Monstros
    renderMonstros() {
        const monstros = DataManager.load('monstros');
        const grid = document.getElementById('monstrosGrid');
        
        UIManager.toggleEmptyState('monstros', monstros.length === 0);
        
        if (monstros.length > 0 && grid) {
            grid.innerHTML = monstros.map(monstro => CardRenderer.renderMonstroCard(monstro)).join('');
        }
    },

    // Mostrar formulário de criação/edição
    showForm(type, id = null) {
        let title, content;
        const item = id ? DataManager.getById(type === 'local' ? 'locais' : type === 'npc' ? 'npcs' : type === 'pista' ? 'pistas' : 'monstros', id) : null;
        
        switch(type) {
            case 'local':
                title = item ? 'Editar Local' : 'Criar Novo Local';
                content = FormRenderer.renderLocalForm(item);
                break;
            case 'npc':
                title = item ? 'Editar NPC' : 'Criar Novo NPC';
                content = FormRenderer.renderNPCForm(item);
                break;
            case 'pista':
                title = item ? 'Editar Pista' : 'Criar Nova Pista';
                content = FormRenderer.renderPistaForm(item);
                break;
            case 'monstro':
                title = item ? 'Editar Monstro' : 'Criar Novo Monstro';
                content = FormRenderer.renderMonstroForm(item);
                break;
        }
        
        UIManager.openModal(title, content);
    },

    // Editar item
    editItem(type, id) {
        this.showForm(type, id);
    },

    // Visualizar detalhes
    viewDetail(type, id) {
        const dataKey = type === 'local' ? 'locais' : type === 'npc' ? 'npcs' : type === 'pista' ? 'pistas' : 'monstros';
        const item = DataManager.getById(dataKey, id);
        
        if (!item) {
            UIManager.showError('Item não encontrado!');
            return;
        }
        
        let title, content;
        
        switch(type) {
            case 'local':
                title = item.nome;
                content = DetailRenderer.renderLocalDetail(item);
                break;
            case 'npc':
                title = item.nome;
                content = DetailRenderer.renderNPCDetail(item);
                break;
            case 'pista':
                title = item.nome;
                content = DetailRenderer.renderPistaDetail(item);
                break;
            case 'monstro':
                title = item.nome;
                content = DetailRenderer.renderMonstroDetail(item);
                break;
        }
        
        UIManager.openModal(title, content);
    },

    // Salvar item (criar ou atualizar)
    saveItem(event, type, id = '') {
        event.preventDefault();
        
        try {
            // Mapear tipo para ID do formulário
            const formIdMap = {
                'local': 'formLocal',
                'npc': 'formNPC',
                'pista': 'formPista',
                'monstro': 'formMonstro'
            };
            
            const formId = formIdMap[type];
            const formData = FormManager.getFormData(formId);
            
            if (!formData) {
                UIManager.showError('Erro ao ler dados do formulário!');
                return;
            }
            
            const dataKey = type === 'local' ? 'locais' : type === 'npc' ? 'npcs' : type === 'pista' ? 'pistas' : 'monstros';
            
            if (id) {
                // Atualizar
                DataManager.update(dataKey, id, formData);
                UIManager.showSuccess('Item atualizado com sucesso!');
            } else {
                // Criar
                DataManager.add(dataKey, formData);
                UIManager.showSuccess('Item criado com sucesso!');
            }
            
            UIManager.closeModal();
            this.renderCurrentView();
        } catch (error) {
            console.error('Erro ao salvar item:', error);
            UIManager.showError('Erro ao salvar: ' + error.message);
        }
    },

    // Deletar item
    deleteItem(type, id, nome) {
        if (!UIManager.confirmDelete(`Tem certeza que deseja excluir "${nome}"?`)) {
            return;
        }
        
        const dataKey = type === 'local' ? 'locais' : type === 'npc' ? 'npcs' : type === 'pista' ? 'pistas' : 'monstros';
        
        if (DataManager.delete(dataKey, id)) {
            UIManager.showSuccess('Item excluído com sucesso!');
            UIManager.closeModal();
            this.renderCurrentView();
        } else {
            UIManager.showError('Erro ao excluir item!');
        }
    },

    // Exportar dados
    exportData() {
        const jsonData = DataManager.exportAll();
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rpg-campanha-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        UIManager.showSuccess('Dados exportados com sucesso!');
    },

    // Importar dados
    importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            if (DataManager.importAll(e.target.result)) {
                UIManager.showSuccess('Dados importados com sucesso!');
                this.renderCurrentView();
            } else {
                UIManager.showError('Erro ao importar dados! Verifique o arquivo.');
            }
        };
        reader.readAsText(file);
        
        // Limpar input
        event.target.value = '';
    }
};

// ============================================
// INICIALIZAR APLICAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    app.init();
    
    // Mobile menu toggle
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    if (mobileMenuToggle && sidebar && sidebarOverlay) {
        let lastScrollTop = 0;
        let isScrollingUp = false;
        
        // Detectar direção do scroll
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
            
            if (currentScroll > lastScrollTop) {
                // Scrollando para baixo - esconder botão
                isScrollingUp = false;
                mobileMenuToggle.classList.remove('visible');
            } else if (currentScroll < lastScrollTop) {
                // Scrollando para cima - mostrar botão
                isScrollingUp = true;
                mobileMenuToggle.classList.add('visible');
            }
            
            lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
        });
        
        mobileMenuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            sidebarOverlay.classList.toggle('active');
            mobileMenuToggle.classList.toggle('active');
        });
        
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('active');
            mobileMenuToggle.classList.remove('active');
        });
        
        // Fechar sidebar ao clicar em um item de navegação no mobile
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                    sidebarOverlay.classList.remove('active');
                    mobileMenuToggle.classList.remove('active');
                }
            });
        });
    }
    
    console.log('⚓ Cais do Farol inicializado!');
});

// ============================================
// BRAINSTORM - GERADOR DE IDEIAS
// ============================================

const BrainstormGenerator = {
    currentCategory: null,
    currentStep: 1,
    settings: {
        genero: null,
        tom: null,
        epoca: null,
        tipo: null
    },
    
    // Templates de ideias para cada categoria
    templates: {
        local: {
            nomes: [
                'A Âncora Partida', 'Gruta das Marés Sussurrantes', 'Observatório da Lua Sangrenta', 
                'Escombros do Covenant Despedaçado', 'Ancoradouro dos Vendavais', 'Farol de Ashira',
                'Santuário das Águas Negras', 'Feira dos Corsários', 'Bastilha das Correntes',
                'Arquivo dos Nomes Proibidos', 'Necrotério dos Afogados', 'Solar Maremonte',
                'Estalagem do Último Suspiro', 'Poço de Sal e Cinzas', 'Bosque dos Náufragos',
                'Recife dos Condenados', 'Arquipélago Fantasma', 'Pináculo do Lamento',
                'Garganta do Oceano', 'Charco das Almas Perdidas', 'Ermo de Vidro', 'Cratera Carmesim'
            ],
            adjetivos: [
                'envolto em brumas eternas', 'marcado por presságios sinistros', 
                'construído sobre ossos antigos', 'tocado pela maldição da maré',
                'esquecido pelos mapas', 'consagrado a deuses mortos',
                'interditado pela Guilda dos Faróis', 'envolto em sombras dançantes',
                'iluminado por chamas que nunca morrem', 'escondido entre dobras da realidade',
                'abandonado após o Grande Naufrágio', 'guardado por pactos quebrados',
                'amaldiçoado pelas Luas Gêmeas', 'erguido em glória há milênios',
                'corroído pelo sal e pelo tempo', 'esculpido em pedra-lua',
                'protegido por selos de sangue', 'suspenso entre marés',
                'tomado por vegetação faminta', 'permeado por murmúrios distantes'
            ],
            caracteristicas: [
                'onde cristais crescem das paredes e cantam quando tocados',
                'coberto por névoa espessa que engole sons e memórias',
                'ressoando com ecos de batalhas travadas há séculos',
                'protegido por círculos de proteção que brilham sob o luar',
                'cercado por águas tão claras que refletem outros mundos',
                'construído com pedra-vulcânica que pulsa como coração vivo',
                'cujas paredes narram histórias em idiomas esquecidos',
                'onde uma fenda no ar revela estrelas que não existem',
                'vigiado por espíritos presos em âmbar temporal',
                'onde relógios andam para trás e feridas cicatrizam antes de abrir',
                'sufocado por vinhas carmesins que sussurram segredos',
                'decorado com símbolos que ardem nos olhos de quem os contempla',
                'onde o ar é denso e salgado como lágrimas de gigantes',
                'repleto de estátuas que seguem visitantes com olhares vazios'
            ],
            segredos: [
                'guarda o último mapa para Atlântida das Correntes',
                'serve como gaiola para uma entidade que antecede o tempo',
                'contém portais para os Sete Mares Proibidos',
                'foi erguido sobre o cadáver de um deus-baleia',
                'preserva tomos escritos em sangue de videntes',
                'é o ponto de encontro da Ordem da Maré Negra',
                'esconde túneis que conectam todos os oceanos',
                'foi construído sobre o túmulo da Primeira Tempestade',
                'abriga o coração cristalizado de um Leviatã adormecido',
                'é assombrado pelo capitão que sacrificou sua tripulação',
                'contém o verdadeiro nome do Oceano Primordial',
                'é onde as marés decidem quem vive e quem morre'
            ]
        },
        npc: {
            profissoes: [
                'Capitão de Navios Fantasma', 'Domador de Marés', 'Mercador de Sonhos Afogados',
                'Forjador de Âncoras Vivas', 'Destilador de Tempestades', 'Leitor de Estrelas Submersas',
                'Guardião dos Faróis Mortos', 'Vigilante do Cais', 'Tecelão de Correntes',
                'Cantador de Baladas Perdidas', 'Cirurgião das Águas Profundas', 'Invocador de Névoas',
                'Caçador de Lulas Colossais', 'Atravessador de Fronteiras', 'Arauto das Correntezas',
                'Arquivista de Naufrágios', 'Ceifador Silencioso', 'Negociador de Maremotos',
                'Escultor de Ossos de Coral', 'Decifrador de Conchas Ancestrais'
            ],
            personalidades: [
                'ousado como vendaval, mas queima pontes sem olhar para trás',
                'observa cada sombra, confia apenas no metal frio de sua lâmina',
                'encanta multidões com palavras doces que escondem ganchos afiados',
                'fala pouco, mas cada palavra carrega o peso de segredos milenares',
                'incapaz de mentir, mesmo quando a verdade custa vidas',
                'sorri enquanto tece teias onde todos são peças do seu jogo',
                'daria a vida pelos seus, sem hesitar nem cobrar gratidão',
                'muda de ideia como o vento muda de direção, impossível de prever',
                'carrega séculos de paciência, espera o momento exato para agir',
                'explode em fúria como maremoto, arrependendo-se apenas quando passa'
            ],
            objetivos: [
                'rastreia quem traiu sua tripulação para as profundezas',
                'busca absolvição pelo naufrágio que causou e pelas almas que levou',
                'persegue pistas sobre a ilha onde nasceu, apagada dos mapas',
                'foge de uma Ordem que executa qualquer um que conheça seu nome',
                'caça o Tridente de Maraleth, capaz de controlar oceanos inteiros',
                'guarda o segredo de uma praga que pode drenar os mares',
                'procura irmãos vendidos como escravos há décadas',
                'quer provar que não é covarde diante de quem o chamou assim',
                'investiga desaparecimentos de navios que formam um padrão sinistro',
                'cumpre visões de uma entidade submarina que lhe fala em pesadelos'
            ],
            marcas: [
                'carrega cicatriz em forma de âncora gravada a ferro em brasa',
                'usa medalhão que pulsa com luz azul quando perigo se aproxima',
                'fala como se tivesse vivido em dez portos diferentes',
                'tem um olho verde como alga e outro negro como abismo',
                'exibe tatuagem que se move sozinha, mostrando mapas mutantes',
                'nasceu com marca de tridente nas costas, sinal de maldição',
                'jamais tira seu casaco de couro de criatura marinha',
                'é seguido por uma gaivota albina que entende ordens',
                'usa gancho de prata no lugar da mão perdida em ritual',
                'esconde as mãos sob luvas, pois são cobertas de escamas'
            ]
        },
        pista: {
            tipos: [
                'Carta Selada com Cera Negra', 'Mapa Tatuado em Pele Humana', 
                'Diário Encadernado em Couro de Sereia', 'Pergaminho que Sangra ao Toque',
                'Grimório de Páginas Vivas', 'Medalhão com Retrato que Envelhece',
                'Chave Forjada em Osso de Baleia', 'Moeda de Metal que Não Existe',
                'Amuleto que Sussurra em Línguas Mortas', 'Fragmento de Espelho Amaldiçoado',
                'Tatuagem Arrancada e Preservada', 'Símbolo Gravado em Dente de Tubarão',
                'Código Escrito em Conchas Perfuradas', 'Runas Esculpidas em Âmbar',
                'Selo Real Coberto de Ferrugem Carmesim', 'Garrafa com Mensagem Fantasma'
            ],
            condicoes: [
                'carbonizado nas bordas, como se escapasse de incêndio submarino',
                'cifrado em linguagem que só é legível sob luz de lua cheia',
                'manchado com sangue que ainda brilha fracamente',
                'dilacerado por garras, faltando pedaços cruciais',
                'escrito com tinta que só aparece quando molhado em água salgada',
                'envolto em selo de proteção que queima mãos impuras',
                'redigido em idioma que não consta em nenhum arquivo',
                'datado de época anterior ao surgimento dos oceanos',
                'marcado com brasão de família extinta há gerações',
                'encharcado, com palavras dissolvendo-se lentamente'
            ],
            conteudos: [
                'indica coordenadas de tesouro guardado por criatura lendária',
                'profetiza o despertar de algo que deveria permanecer adormecido',
                'denuncia traição nas mais altas esferas do Conselho dos Faróis',
                'detalha invocação capaz de rasgar o véu entre mundos',
                'nomeia o traidor que entregou a frota às Águas Negras',
                'conecta naufrágios recentes a um padrão de sacrifício ritual',
                'preserva confissão de alguém que morreu jurando silêncio',
                'documenta avistamento de Leviatã nas Fossas Proibidas',
                'revela linhagem secreta ligando mercadores a realeza',
                'aponta entrada oculta para o Arquivo Submerso'
            ],
            consequencias: [
                'mas sombras observam quem o carrega',
                'porém cada palavra lida é armadilha que se fecha lentamente',
                'mas usá-lo destruirá alianças que mantêm a paz',
                'e três facções matariam para possuí-lo',
                'mas revelar seu conteúdo marca o portador para morte',
                'e perderá validade quando a maré virar na próxima lua',
                'mas só funciona combinado com outro artefato perdido',
                'porém faltam páginas essenciais, espalhadas propositalmente',
                'mas decifrar exige sacrifício de memórias preciosas',
                'e pode reescrever história de forma irreversível'
            ]
        },
        monstro: {
            tipos: [
                'Dracoserpe das Profundezas', 'Enguia do Abismo', 'Aparição de Névoa Salgada',
                'Colosso de Coral Vivo', 'Pesadelo Afogado', 'Maré Consciente',
                'Horror de Mil Olhos Submersos', 'Afogado Eterno', 'Fera das Correntes',
                'Autômato de Âncoras Retorcidas', 'Sílfide Corrompida das Ondas',
                'Titã de Ossos de Navio', 'Amálgama de Náufragos', 'Hidra de Algas Venenosas',
                'Guardião da Fossa Oceânica', 'Sombra que Arrasta para o Fundo'
            ],
            caracteristicas: [
                'coberto por escamas que refletem memórias de quem as observa',
                'tecido com sombras que devoram luz e esperança',
                'repleto de olhos que choram água salgada constantemente',
                'irradia ondas de energia que fazem o ar vibrar e distorcer',
                'formado por cristais que cantam lamentos de afogados',
                'exala névoa esverdeada que corrói metal e carne',
                'possui tentáculos que brotam novamente quando cortados',
                'arde por dentro com chamas azuis que não se apagam na água',
                'tem corpo translúcido onde órgãos pulsam visivelmente',
                'é fusão grotesca de criaturas diferentes fundidas em carne única',
                'tem garras de ferro enferrujado arrancado de navios naufragados',
                'crepita envolto em relâmpagos que saltam pela água'
            ],
            habilidades: [
                'assume aparência humana perfeita, mas reflexos revelam sua verdadeira forma',
                'sussurra em mentes fracas até que obedeçam ou enlouqueçam',
                'desliza através de matéria sólida como se fosse água',
                'suga vigor vital através de toque gélido que deixa marcas',
                'conjura enxame de criaturas menores que emergem de seu corpo',
                'projeta miragens tão reais que podem matar de medo',
                'distorce fluxo temporal ao redor, envelhecendo ou rejuvenescendo',
                'devora magias lançadas contra ele e cresce mais forte',
                'regenera ferimentos em segundos, exigindo dano maciço',
                'fragmenta-se em cópias menores quando ferido gravemente',
                'petrifica vítimas que encontram seu olhar por muito tempo',
                'dissolve-se em sombras e ressurge em outro ponto escuro'
            ],
            fraquezas: [
                'desintegra-se sob luz direta do sol nascente',
                'é repelido por água consagrada aos deuses dos mares',
                'não consegue cruzar linhas de sal marinho abençoado',
                'entra em pânico diante de fogo alquímico verde',
                'depende de âncora física que, se destruída, o bane',
                'perde força quando afastado das águas onde nasceu',
                'é cego mas detecta vibrações - silêncio total o confunde',
                'deve consumir almas humanas a cada lua ou definha',
                'recua diante de ferro fundido em fornalha submarina',
                'enfraquece drasticamente sob eclipse lunar'
            ],
            origens: [
                'nascido de ritual proibido que sacrificou tripulação inteira',
                'guardião leal corrompido por entidade do abismo',
                'resultado de maldição lançada por bruxo moribundo',
                'invasor de dimensão paralela preso entre mundos',
                'criatura comum exposta a cristais de energia primordial',
                'manifestação da ira de divindade esquecida',
                'fusão forçada de almas de condenados ao mar',
                'arma biológica de guerra antiga, perdida e feral',
                'pesadelo coletivo que ganhou forma tangível',
                'último sobrevivente de espécie extinta há milênios'
            ]
        }
    },
    
    // Gerar uma ideia aleatória
    generateIdea(category) {
        const template = this.templates[category];
        let idea = {};
        
        switch(category) {
            case 'local':
                const nome = this.random(template.nomes);
                const adj = this.random(template.adjetivos);
                idea = {
                    titulo: nome,
                    descricao: `${adj.charAt(0).toUpperCase() + adj.slice(1)}, ${this.random(template.caracteristicas)}`,
                    segredo: `${this.random(template.segredos)}`
                };
                break;
                
            case 'npc':
                idea = {
                    titulo: this.random(template.profissoes),
                    personalidade: this.random(template.personalidades),
                    objetivo: this.random(template.objetivos),
                    marca: this.random(template.marcas)
                };
                break;
                
            case 'pista':
                idea = {
                    titulo: this.random(template.tipos),
                    condicao: this.random(template.condicoes),
                    conteudo: this.random(template.conteudos),
                    twist: this.random(template.consequencias)
                };
                break;
                
            case 'monstro':
                idea = {
                    titulo: this.random(template.tipos),
                    aparencia: this.random(template.caracteristicas),
                    poder: this.random(template.habilidades),
                    fraqueza: this.random(template.fraquezas),
                    origem: this.random(template.origens)
                };
                break;
        }
        
        return idea;
    },
    
    // Gerar múltiplas ideias
    generateMultiple(category, count = 6) {
        const ideas = [];
        for (let i = 0; i < count; i++) {
            ideas.push(this.generateIdea(category));
        }
        return ideas;
    },
    
    // Selecionar item aleatório de array
    random(array) {
        return array[Math.floor(Math.random() * array.length)];
    },
    
    // Renderizar ideias na interface
    renderIdeas(category) {
        this.currentCategory = category;
        const ideas = [];
        
        // Gerar ideias contextualizadas
        for (let i = 0; i < 6; i++) {
            ideas.push(this.generateContextualIdea(category));
        }
        
        const container = document.getElementById('ideasGrid');
        const resultsSection = document.getElementById('brainstormResults');
        const contextDesc = document.getElementById('contextDescription');
        
        // Atualizar descrição do contexto
        if (contextDesc) {
            contextDesc.textContent = this.getGenerationContext();
        }
        
        resultsSection.classList.remove('hidden');
        container.innerHTML = ideas.map(idea => this.createIdeaCard(idea, category)).join('');
        
        // Scroll suave até os resultados
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },
    
    // Criar card de ideia
    createIdeaCard(idea, category) {
        let content = '';
        
        switch(category) {
            case 'local':
                content = `
                    <h4>${idea.titulo}</h4>
                    <p class="idea-line"><strong>Característica:</strong> ${idea.descricao}</p>
                    <p class="idea-line"><strong>Segredo:</strong> ${idea.segredo}</p>
                `;
                break;
            case 'npc':
                content = `
                    <h4>${idea.titulo}</h4>
                    <p class="idea-line"><strong>Personalidade:</strong> ${idea.personalidade}</p>
                    <p class="idea-line"><strong>Objetivo:</strong> ${idea.objetivo}</p>
                    <p class="idea-line"><strong>Marca:</strong> ${idea.marca}</p>
                `;
                break;
            case 'pista':
                content = `
                    <h4>${idea.titulo}</h4>
                    <p class="idea-line"><strong>Estado:</strong> ${idea.condicao}</p>
                    <p class="idea-line"><strong>Revelação:</strong> ${idea.conteudo}</p>
                    <p class="idea-line"><strong>Porém:</strong> ${idea.twist}</p>
                `;
                break;
            case 'monstro':
                content = `
                    <h4>${idea.titulo}</h4>
                    <p class="idea-line">${idea.aparencia}</p>
                    <p class="idea-line"><strong>Poder:</strong> ${idea.poder}</p>
                    <p class="idea-line"><strong>Fraqueza:</strong> ${idea.fraqueza}</p>
                    <p class="idea-line"><strong>Origem:</strong> ${idea.origem}</p>
                `;
                break;
        }
        
        return `
            <div class="idea-card">
                ${content}
            </div>
        `;
    },
    
    // Inicializar eventos
    init() {
        this.setupWizard();
        
        // Botão de gerar mais
        const generateBtn = document.getElementById('generateMoreIdeas');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                if (this.currentCategory) {
                    this.renderIdeas(this.currentCategory);
                }
            });
        }
        
        // Botão de mudar configurações
        const changeBtn = document.getElementById('changeSettings');
        if (changeBtn) {
            changeBtn.addEventListener('click', () => {
                this.resetWizard();
            });
        }
    },
    
    // Configurar wizard
    setupWizard() {
        const options = document.querySelectorAll('.wizard-option');
        const backBtn = document.querySelector('.wizard-back');
        
        options.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const step = e.currentTarget.closest('.wizard-step');
                const stepNum = parseInt(step.dataset.step);
                const value = e.currentTarget.dataset.value;
                
                // Marcar seleção
                step.querySelectorAll('.wizard-option').forEach(opt => opt.classList.remove('selected'));
                e.currentTarget.classList.add('selected');
                
                // Se for random, escolher aleatoriamente
                let finalValue = value;
                if (value === 'random') {
                    const options = Array.from(step.querySelectorAll('.wizard-option:not(.wizard-random)'));
                    const randomOption = options[Math.floor(Math.random() * options.length)];
                    finalValue = randomOption.dataset.value;
                }
                
                // Salvar escolha
                switch(stepNum) {
                    case 1:
                        this.settings.genero = finalValue;
                        break;
                    case 2:
                        this.settings.tom = finalValue;
                        break;
                    case 3:
                        this.settings.epoca = finalValue;
                        break;
                    case 4:
                        this.settings.tipo = finalValue;
                        this.currentCategory = finalValue;
                        break;
                }
                
                // Avançar para próximo passo
                setTimeout(() => {
                    if (stepNum < 4) {
                        this.goToStep(stepNum + 1);
                    } else {
                        this.startGeneration();
                    }
                }, 300);
            });
        });
        
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                if (this.currentStep > 1) {
                    this.goToStep(this.currentStep - 1);
                }
            });
        }
    },
    
    // Ir para passo específico
    goToStep(step) {
        this.currentStep = step;
        
        // Atualizar steps
        document.querySelectorAll('.wizard-step').forEach((el, idx) => {
            el.classList.toggle('active', idx + 1 === step);
        });
        
        // Atualizar progress dots
        document.querySelectorAll('.progress-dot').forEach((dot, idx) => {
            dot.classList.toggle('active', idx < step);
        });
        
        // Mostrar/esconder botão voltar
        const backBtn = document.querySelector('.wizard-back');
        if (backBtn) {
            backBtn.style.display = step > 1 ? 'block' : 'none';
        }
    },
    
    // Resetar wizard
    resetWizard() {
        this.settings = { genero: null, tom: null, epoca: null, tipo: null };
        this.currentStep = 1;
        this.goToStep(1);
        
        document.querySelectorAll('.wizard-option').forEach(opt => opt.classList.remove('selected'));
        document.getElementById('brainstormWizard').style.display = 'block';
        document.getElementById('brainstormResults').classList.add('hidden');
    },
    
    // Iniciar geração
    startGeneration() {
        document.getElementById('brainstormWizard').style.display = 'none';
        this.renderIdeas(this.currentCategory);
    },
    
    // Obter contexto de geração
    getGenerationContext() {
        const contexts = {
            genero: {
                'fantasia-epica': 'épica e mágica',
                'horror-cosmico': 'sombria e lovecraftiana',
                'noir-urbano': 'noir e misteriosa',
                'steampunk': 'vitoriana e engenhosa',
                'aventura-pirata': 'marítima e aventureira',
                'faroeste': 'de fronteira selvagem',
                'cyberpunk': 'high-tech e distópica',
                'pos-apocaliptico': 'pós-apocalíptica e desolada'
            },
            tom: {
                'sombrio': 'com tom sombrio e consequências reais',
                'equilibrado': 'equilibrada entre drama e esperança',
                'heroico': 'heroica e épica',
                'satirico': 'satírica e irreverente'
            },
            epoca: {
                'era-antiga': 'na era dos impérios antigos',
                'medieval': 'na era medieval',
                'renascimento': 'no renascimento',
                'era-vitoriana': 'na era vitoriana',
                'contemporaneo': 'nos tempos modernos',
                'futuro': 'em um futuro distante'
            }
        };
        
        return `Campanha ${contexts.genero[this.settings.genero]} ${contexts.tom[this.settings.tom]}, ambientada ${contexts.epoca[this.settings.epoca]}`;
    },
    
    // Gerar ideia contextualizada
    generateContextualIdea(category) {
        const baseIdea = this.generateIdea(category);
        const { genero, tom, epoca } = this.settings;
        
        // Aplicar modificadores contextuais
        return this.applyContextModifiers(baseIdea, category, genero, tom, epoca);
    },
    
    // Aplicar modificadores de contexto
    applyContextModifiers(idea, category, genero, tom, epoca) {
        // Modifiers específicos por gênero
        const modifiers = this.getContextualModifiers(genero, tom, epoca);
        
        if (category === 'local') {
            idea.descricao = this.enrichDescription(idea.descricao, modifiers);
            idea.segredo = this.enrichSecret(idea.segredo, modifiers);
        } else if (category === 'npc') {
            idea.personalidade = this.enrichPersonality(idea.personalidade, modifiers);
            idea.objetivo = this.enrichGoal(idea.objetivo, modifiers);
        } else if (category === 'pista') {
            idea.condicao = this.enrichCondition(idea.condicao, modifiers);
            idea.conteudo = this.enrichContent(idea.conteudo, modifiers);
        } else if (category === 'monstro') {
            idea.aparencia = this.enrichAppearance(idea.aparencia, modifiers);
            idea.origem = this.enrichOrigin(idea.origem, modifiers);
        }
        
        return idea;
    },
    
    // Obter modificadores contextuais
    getContextualModifiers(genero, tom, epoca) {
        const mods = {
            prefix: [],
            suffix: [],
            flavor: []
        };
        
        // Modificadores por gênero
        if (genero === 'fantasia-epica') {
            mods.flavor = ['arcano', 'místico', 'lendário', 'encantado'];
        } else if (genero === 'horror-cosmico') {
            mods.flavor = ['profano', 'insano', 'eldritch', 'amaldiçoado'];
        } else if (genero === 'cyberpunk') {
            mods.flavor = ['sintético', 'neural', 'corporativo', 'hackeado'];
        } else if (genero === 'steampunk') {
            mods.flavor = ['mecânico', 'a vapor', 'vitoriano', 'engenhoso'];
        } else if (genero === 'aventura-pirata') {
            mods.flavor = ['náutico', 'saqueado', 'lendário', 'oceânico'];
        }
        
        // Modificadores por tom
        if (tom === 'sombrio') {
            mods.prefix.push('corrompido', 'maldito', 'profanado');
        } else if (tom === 'heroico') {
            mods.prefix.push('glorioso', 'nobre', 'lendário');
        }
        
        return mods;
    },
    
    // Enriquecer descrições
    enrichDescription(desc, mods) {
        if (mods.flavor.length > 0 && Math.random() > 0.5) {
            const flavor = mods.flavor[Math.floor(Math.random() * mods.flavor.length)];
            return desc.replace(/Um lugar/, `Um lugar ${flavor}`);
        }
        return desc;
    },
    
    enrichSecret(secret, mods) {
        return secret;
    },
    
    enrichPersonality(personality, mods) {
        return personality;
    },
    
    enrichGoal(goal, mods) {
        return goal;
    },
    
    enrichCondition(condition, mods) {
        return condition;
    },
    
    enrichContent(content, mods) {
        return content;
    },
    
    enrichAppearance(appearance, mods) {
        if (mods.flavor.length > 0 && Math.random() > 0.5) {
            const flavor = mods.flavor[Math.floor(Math.random() * mods.flavor.length)];
            return `${appearance}, com aspecto ${flavor}`;
        }
        return appearance;
    },
    
    enrichOrigin(origin, mods) {
        return origin;
    }
};

// Inicializar brainstorm quando DOM carregar
document.addEventListener('DOMContentLoaded', () => {
    BrainstormGenerator.init();
});

// ============================================
// MAPA MENTAL / CANVAS
// ============================================

const MindMapCanvas = {
    container: null,
    svg: null,
    nodesContainer: null,
    nodes: [],
    connections: [],
    scale: 1,
    panX: 0,
    panY: 0,
    isDragging: false,
    draggedNode: null,
    dragStartX: 0,
    dragStartY: 0,
    isPanning: false,
    panStartX: 0,
    panStartY: 0,
    
    // Inicializar
    init() {
        this.container = document.getElementById('mindMapCanvas');
        this.svg = document.getElementById('connectionsSvg');
        this.nodesContainer = document.getElementById('nodesContainer');
        
        if (!this.container || !this.svg || !this.nodesContainer) return;
        
        this.setupEvents();
        this.loadData();
    },
    
    // Configurar eventos
    setupEvents() {
        // Botões de controle
        document.getElementById('canvasReset')?.addEventListener('click', () => this.reset());
        document.getElementById('canvasAutoOrganize')?.addEventListener('click', () => this.autoOrganize());
        
        // Pan do canvas
        this.container.addEventListener('mousedown', (e) => {
            if (e.target === this.container || e.target === this.nodesContainer) {
                e.preventDefault();
                this.isPanning = true;
                this.panStartX = e.clientX - this.panX;
                this.panStartY = e.clientY - this.panY;
            }
        });
        
        this.container.addEventListener('mousemove', (e) => {
            if (this.isPanning) {
                this.panX = e.clientX - this.panStartX;
                this.panY = e.clientY - this.panStartY;
                this.updateTransform();
            }
        });
        
        this.container.addEventListener('mouseup', () => {
            this.isPanning = false;
        });
        
        this.container.addEventListener('mouseleave', () => {
            this.isPanning = false;
        });
        
        // Zoom com scroll
        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.zoom(delta);
        }, { passive: false });
    },
    
    // Carregar dados do localStorage
    loadData() {
        this.nodes = [];
        this.connections = [];
        
        const locais = DataManager.load('locais') || [];
        const npcs = DataManager.load('npcs') || [];
        const pistas = DataManager.load('pistas') || [];
        const monstros = DataManager.load('monstros') || [];
        
        // Criar nós para cada item
        locais.forEach((item, idx) => {
            this.nodes.push({
                id: `local-${item.id}`,
                type: 'local',
                data: item,
                x: 200 + (idx % 4) * 250,
                y: 100 + Math.floor(idx / 4) * 200
            });
        });
        
        npcs.forEach((item, idx) => {
            this.nodes.push({
                id: `npc-${item.id}`,
                type: 'npc',
                data: item,
                x: 200 + (idx % 4) * 250,
                y: 350 + Math.floor(idx / 4) * 200
            });
        });
        
        pistas.forEach((item, idx) => {
            this.nodes.push({
                id: `pista-${item.id}`,
                type: 'pista',
                data: item,
                x: 200 + (idx % 4) * 250,
                y: 600 + Math.floor(idx / 4) * 200
            });
        });
        
        monstros.forEach((item, idx) => {
            this.nodes.push({
                id: `monstro-${item.id}`,
                type: 'monstro',
                data: item,
                x: 200 + (idx % 4) * 250,
                y: 850 + Math.floor(idx / 4) * 200
            });
        });
        
        // Criar conexões baseadas nos relacionamentos
        this.createConnections();
        this.render();
    },
    
    // Criar conexões entre nós
    createConnections() {
        this.nodes.forEach(node => {
            const data = node.data;
            
            // Conexões de locais
            if (node.type === 'local') {
                if (data.npcs && data.npcs.length > 0) {
                    data.npcs.forEach(npcId => {
                        const targetNode = this.nodes.find(n => n.id === `npc-${npcId}`);
                        if (targetNode) {
                            this.connections.push({
                                from: node.id,
                                to: targetNode.id,
                                type: 'local'
                            });
                        }
                    });
                }
                if (data.pistas && data.pistas.length > 0) {
                    data.pistas.forEach(pistaId => {
                        const targetNode = this.nodes.find(n => n.id === `pista-${pistaId}`);
                        if (targetNode) {
                            this.connections.push({
                                from: node.id,
                                to: targetNode.id,
                                type: 'local'
                            });
                        }
                    });
                }
                if (data.monstros && data.monstros.length > 0) {
                    data.monstros.forEach(monstroId => {
                        const targetNode = this.nodes.find(n => n.id === `monstro-${monstroId}`);
                        if (targetNode) {
                            this.connections.push({
                                from: node.id,
                                to: targetNode.id,
                                type: 'local'
                            });
                        }
                    });
                }
            }
            
            // Conexões de NPCs
            if (node.type === 'npc') {
                if (data.locais && data.locais.length > 0) {
                    data.locais.forEach(localId => {
                        const targetNode = this.nodes.find(n => n.id === `local-${localId}`);
                        if (targetNode && !this.connections.find(c => 
                            (c.from === node.id && c.to === targetNode.id) ||
                            (c.from === targetNode.id && c.to === node.id)
                        )) {
                            this.connections.push({
                                from: node.id,
                                to: targetNode.id,
                                type: 'npc'
                            });
                        }
                    });
                }
            }
        });
    },
    
    // Renderizar canvas
    render() {
        this.nodesContainer.innerHTML = '';
        this.svg.innerHTML = '';
        
        // Renderizar linhas de conexão
        this.connections.forEach(conn => {
            const fromNode = this.nodes.find(n => n.id === conn.from);
            const toNode = this.nodes.find(n => n.id === conn.to);
            
            if (fromNode && toNode) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const path = this.calculateConnectionPath(fromNode, toNode);
                line.setAttribute('d', path);
                line.setAttribute('class', `connection-line type-${conn.type}`);
                line.setAttribute('data-from', conn.from);
                line.setAttribute('data-to', conn.to);
                this.svg.appendChild(line);
            }
        });
        
        // Renderizar nós
        this.nodes.forEach(node => {
            const nodeEl = this.createNodeElement(node);
            this.nodesContainer.appendChild(nodeEl);
        });
    },
    
    // Calcular caminho da conexão (curva suave)
    calculateConnectionPath(fromNode, toNode) {
        const x1 = fromNode.x + 110;
        const y1 = fromNode.y + 50;
        const x2 = toNode.x + 110;
        const y2 = toNode.y + 50;
        
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const controlOffset = Math.min(distance * 0.3, 100);
        
        const cx1 = x1 + controlOffset;
        const cy1 = y1;
        const cx2 = x2 - controlOffset;
        const cy2 = y2;
        
        return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
    },
    
    // Criar elemento de nó
    createNodeElement(node) {
        const div = document.createElement('div');
        div.className = `canvas-node type-${node.type}`;
        div.style.left = `${node.x}px`;
        div.style.top = `${node.y}px`;
        div.setAttribute('data-id', node.id);
        
        const data = node.data;
        let summary = '';
        let details = '';
        
        switch(node.type) {
            case 'local':
                summary = data.descricao?.substring(0, 80) + '...' || '';
                details = `<p><strong>Tipo:</strong> ${data.tipo || 'N/A'}</p>
                          <p><strong>Perigos:</strong> ${data.perigos || 'Nenhum'}</p>`;
                break;
            case 'npc':
                summary = data.profissao || '';
                details = `<p><strong>Idade:</strong> ${data.idade || 'N/A'}</p>
                          <p><strong>Personalidade:</strong> ${data.personalidade || 'N/A'}</p>`;
                break;
            case 'pista':
                summary = data.tipo || '';
                details = `<p><strong>Localização:</strong> ${data.localizacao || 'N/A'}</p>
                          <p><strong>Informação:</strong> ${data.informacao?.substring(0, 100) || 'N/A'}</p>`;
                break;
            case 'monstro':
                summary = `ND ${data.nd || '?'}`;
                details = `<p><strong>Tipo:</strong> ${data.tipo || 'N/A'}</p>
                          <p><strong>Habitat:</strong> ${data.habitat || 'N/A'}</p>`;
                break;
        }
        
        div.innerHTML = `
            <div class="node-header">
                <span class="node-type">${node.type}</span>
                <button class="node-toggle" data-action="toggle">▼</button>
            </div>
            ${data.imagem ? `<img src="${data.imagem}" class="node-image" alt="${data.nome}">` : ''}
            <h4 class="node-title">${data.nome}</h4>
            <p class="node-summary">${summary}</p>
            <div class="node-details" style="display: none;">${details}</div>
        `;
        
        // Eventos de drag
        div.addEventListener('mousedown', (e) => {
            if (e.target.closest('.node-toggle')) {
                this.toggleNode(div);
                return;
            }
            this.startDrag(node, e);
        });
        
        return div;
    },
    
    // Toggle expansão do nó
    toggleNode(nodeEl) {
        const details = nodeEl.querySelector('.node-details');
        const toggle = nodeEl.querySelector('.node-toggle');
        
        if (details.style.display === 'none') {
            details.style.display = 'block';
            toggle.textContent = '▲';
            nodeEl.classList.add('expanded');
        } else {
            details.style.display = 'none';
            toggle.textContent = '▼';
            nodeEl.classList.remove('expanded');
        }
    },
    
    // Iniciar drag de nó
    startDrag(node, e) {
        e.preventDefault();
        this.isDragging = true;
        this.draggedNode = node;
        this.dragStartX = e.clientX - node.x;
        this.dragStartY = e.clientY - node.y;
        
        const mousemove = (e) => {
            if (this.isDragging && this.draggedNode) {
                this.draggedNode.x = e.clientX - this.dragStartX;
                this.draggedNode.y = e.clientY - this.dragStartY;
                this.updateNodePosition(this.draggedNode);
            }
        };
        
        const mouseup = () => {
            this.isDragging = false;
            this.draggedNode = null;
            document.removeEventListener('mousemove', mousemove);
            document.removeEventListener('mouseup', mouseup);
        };
        
        document.addEventListener('mousemove', mousemove);
        document.addEventListener('mouseup', mouseup);
    },
    
    // Atualizar posição do nó
    updateNodePosition(node) {
        const nodeEl = this.nodesContainer.querySelector(`[data-id="${node.id}"]`);
        if (nodeEl) {
            nodeEl.style.left = `${node.x}px`;
            nodeEl.style.top = `${node.y}px`;
        }
        
        // Atualizar conexões
        this.updateConnections(node.id);
    },
    
    // Atualizar conexões de um nó
    updateConnections(nodeId) {
        const relatedConnections = this.connections.filter(c => c.from === nodeId || c.to === nodeId);
        
        relatedConnections.forEach(conn => {
            const fromNode = this.nodes.find(n => n.id === conn.from);
            const toNode = this.nodes.find(n => n.id === conn.to);
            
            if (fromNode && toNode) {
                const line = this.svg.querySelector(`[data-from="${conn.from}"][data-to="${conn.to}"]`);
                if (line) {
                    const path = this.calculateConnectionPath(fromNode, toNode);
                    line.setAttribute('d', path);
                }
            }
        });
    },
    
    // Zoom
    zoom(factor) {
        this.scale *= factor;
        this.scale = Math.max(0.3, Math.min(3, this.scale));
        this.updateTransform();
    },
    
    // Resetar visualização
    reset() {
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        this.updateTransform();
    },
    
    // Atualizar transformação
    updateTransform() {
        this.nodesContainer.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
        this.svg.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
    },
    
    // Organizar automaticamente
    autoOrganize() {
        const types = ['local', 'npc', 'pista', 'monstro'];
        const spacing = 280;
        const startY = 100;
        
        types.forEach((type, typeIdx) => {
            const typeNodes = this.nodes.filter(n => n.type === type);
            typeNodes.forEach((node, idx) => {
                node.x = 150 + (idx % 5) * spacing;
                node.y = startY + typeIdx * 250;
                this.updateNodePosition(node);
            });
        });
    }
};

// Inicializar quando view do canvas for ativada
document.addEventListener('DOMContentLoaded', () => {
    const canvasView = document.getElementById('view-canvas');
    if (canvasView) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.target.classList.contains('active')) {
                    MindMapCanvas.init();
                    observer.disconnect();
                }
            });
        });
        
        observer.observe(canvasView, { attributes: true, attributeFilter: ['class'] });
    }
});

// ============================================
// SELETOR DE COR DE DESTAQUE
// ============================================

const ColorPicker = {
    trigger: null,
    panel: null,
    currentColor: null,
    
    init() {
        this.trigger = document.getElementById('colorPickerTrigger');
        this.panel = document.getElementById('colorPickerPanel');
        
        if (!this.trigger || !this.panel) return;
        
        // Carregar cor salva
        const savedColor = localStorage.getItem('rpg-accent-color');
        const savedRgb = localStorage.getItem('rpg-accent-color-rgb');
        if (savedColor && savedRgb) {
            this.applyColor(savedColor, savedRgb);
            this.markSelected(savedColor);
        }
        
        // Toggle painel
        this.trigger.addEventListener('click', () => {
            this.panel.classList.toggle('active');
        });
        
        // Fechar ao clicar fora
        document.addEventListener('click', (e) => {
            if (!this.trigger.contains(e.target) && !this.panel.contains(e.target)) {
                this.panel.classList.remove('active');
            }
        });
        
        // Opções de cor
        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', () => {
                const color = option.dataset.color;
                const rgb = option.dataset.rgb;
                
                this.applyColor(color, rgb);
                this.markSelected(color);
                this.saveColor(color, rgb);
            });
        });
        
        // Fechar painel quando o mouse sair da área
        this.panel.addEventListener('mouseleave', () => {
            this.panel.classList.remove('active');
        });
    },
    
    applyColor(color, rgb) {
        const root = document.documentElement;
        
        // Calcular tons derivados
        const lightColor = this.lightenColor(color, 20);
        const darkColor = this.darkenColor(color, 15);
        
        root.style.setProperty('--color-primary', color);
        root.style.setProperty('--color-primary-light', lightColor);
        root.style.setProperty('--color-primary-dark', darkColor);
        root.style.setProperty('--color-primary-rgb', rgb);
        
        this.currentColor = color;
    },
    
    markSelected(color) {
        document.querySelectorAll('.color-option').forEach(option => {
            option.classList.toggle('selected', option.dataset.color === color);
        });
    },
    
    saveColor(color, rgb) {
        localStorage.setItem('rpg-accent-color', color);
        localStorage.setItem('rpg-accent-color-rgb', rgb);
    },
    
    lightenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    },
    
    darkenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }
};

// Inicializar Color Picker
document.addEventListener('DOMContentLoaded', () => {
    ColorPicker.init();
});
