// ============================================
// GERENCIADOR DE IMAGENS
// ============================================

const ImageManager = {
    currentImage: null,
    currentCallback: null,
    zoom: 1,
    imgElement: null,
    posX: 50,
    posY: 50,
    isDragging: false,
    startX: 0,
    startY: 0,
    
    // Abrir seletor de arquivo e mostrar modal de ajuste
    selectImage(callback) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.currentImage = e.target.result;
                    this.currentCallback = callback;
                    this.zoom = 1;
                    this.posX = 50;
                    this.posY = 50;
                    this.openModal();
                };
                reader.readAsDataURL(file);
            }
        };
        
        input.click();
    },
    
    // Abrir modal de ajuste
    openModal() {
        const modal = document.getElementById('imageModal');
        const container = document.getElementById('imagePreview');
        const slider = document.getElementById('sizeSlider');
        const zoomValue = document.getElementById('sizeValue');
        
        // Criar elemento de imagem
        container.innerHTML = '';
        this.imgElement = document.createElement('img');
        this.imgElement.src = this.currentImage;
        this.imgElement.style.width = '100%';
        this.imgElement.style.height = '100%';
        this.imgElement.style.objectFit = 'cover';
        this.imgElement.style.objectPosition = '50% 50%';
        this.imgElement.style.cursor = 'move';
        this.imgElement.draggable = false;
        container.appendChild(this.imgElement);
        
        // Adicionar eventos de drag
        this.setupDragEvents(container);
        
        slider.value = 100;
        zoomValue.textContent = '100%';
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },
    
    // Configurar eventos de arrastar
    setupDragEvents(container) {
        container.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.startX = e.clientX;
            this.startY = e.clientY;
            container.style.cursor = 'grabbing';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            
            const deltaX = (e.clientX - this.startX) * 0.5;
            const deltaY = (e.clientY - this.startY) * 0.5;
            
            this.posX = Math.max(0, Math.min(100, this.posX - deltaX));
            this.posY = Math.max(0, Math.min(100, this.posY - deltaY));
            
            this.startX = e.clientX;
            this.startY = e.clientY;
            
            this.updatePosition();
        });
        
        document.addEventListener('mouseup', () => {
            this.isDragging = false;
            container.style.cursor = 'move';
        });
    },
    
    // Atualizar posição da imagem
    updatePosition() {
        if (this.imgElement) {
            this.imgElement.style.objectPosition = `${this.posX}% ${this.posY}%`;
        }
    },
    
    // Atualizar zoom
    updateZoom() {
        const slider = document.getElementById('sizeSlider');
        const zoomValue = document.getElementById('sizeValue');
        const zoomPercent = parseInt(slider.value);
        
        this.zoom = zoomPercent / 100;
        zoomValue.textContent = `${zoomPercent}%`;
        
        if (this.imgElement) {
            const scale = 0.5 + (this.zoom * 1.5); // 50% a 200%
            this.imgElement.style.transform = `scale(${scale})`;
            this.imgElement.style.transition = 'transform 0.2s ease';
            this.imgElement.style.objectPosition = `${this.posX}% ${this.posY}%`;
        }
    },
    
    // Confirmar e processar imagem
    confirmImage() {
        if (!this.currentImage || !this.currentCallback) return;
        
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const outputSize = 300;
            canvas.width = outputSize;
            canvas.height = outputSize;
            
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Aplicar zoom
            const scale = 0.5 + (this.zoom * 1.5);
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;
            
            // Calcular crop com posição customizada
            const cropSize = Math.min(scaledWidth, scaledHeight);
            const maxOffsetX = (scaledWidth - cropSize) / scale;
            const maxOffsetY = (scaledHeight - cropSize) / scale;
            
            const offsetX = (this.posX / 100) * maxOffsetX;
            const offsetY = (this.posY / 100) * maxOffsetY;
            
            ctx.drawImage(
                img,
                offsetX, offsetY,
                cropSize / scale, cropSize / scale,
                0, 0,
                outputSize, outputSize
            );
            
            const resizedImage = canvas.toDataURL('image/jpeg', 0.92);
            this.currentCallback(resizedImage);
            this.closeModal();
        };
        img.src = this.currentImage;
    },
    
    // Fechar modal
    closeModal() {
        const modal = document.getElementById('imageModal');
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        
        this.currentImage = null;
        this.currentCallback = null;
        this.zoom = 1;
        this.imgElement = null;
        this.posX = 50;
        this.posY = 50;
        this.isDragging = false;
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
    // Renderizar card de local
    renderLocalCard(local) {
        const npcsCount = local.npcs ? local.npcs.length : 0;
        const pistasCount = local.pistas ? local.pistas.length : 0;
        const monstrosCount = local.monstros ? local.monstros.length : 0;

        return `
            <div class="card">
                <div class="card-image ${local.imagem ? '' : 'placeholder'}" onclick="app.viewDetail('local', '${local.id}')">
                    ${local.imagem ? `<img src="${local.imagem}" alt="${local.nome}" style="width:100%;height:100%;object-fit:cover;">` : '📍'}
                </div>
                <div class="card-body">
                    <h3 class="card-title">${local.nome || 'Local Sem Nome'}</h3>
                    <p class="card-description">${local.descricao || 'Sem descrição'}</p>
                    <div class="card-meta">
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
                    <p class="card-description">${npc.descricao || 'Sem descrição'}</p>
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
                    <p class="card-description">${pista.descricao || 'Sem descrição'}</p>
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
                    <p class="card-description">${monstro.descricao || 'Sem descrição'}</p>
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
        
        return `
            <form id="formLocal" onsubmit="app.saveItem(event, 'local', '${local?.id || ''}')">
                <div class="form-group">
                    <label class="form-label">Nome do Local *</label>
                    <input type="text" name="nome" class="form-input" value="${local?.nome || ''}" required placeholder="Ex: Taverna do Dragão Dourado">
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
// RENDERIZADORES DE VISUALIZAÇÃO DETALHADA
// ============================================

const DetailRenderer = {
    // Visualização de Local
    renderLocalDetail(local) {
        const npcs = DataManager.load('npcs').filter(n => local.npcs?.includes(n.id));
        const pistas = DataManager.load('pistas').filter(p => local.pistas?.includes(p.id));
        const monstros = DataManager.load('monstros').filter(m => local.monstros?.includes(m.id));
        
        return `
            <div class="detail-view">
                <div class="detail-image ${local.imagem ? '' : 'placeholder'}">
                    ${local.imagem ? `<img src="${local.imagem}" alt="${local.nome}" style="width:100%;height:100%;object-fit:cover;">` : '📍'}
                </div>
                
                <div class="detail-content">
                    <div class="detail-header">
                        <h2 class="detail-title">${local.nome}</h2>
                    </div>
                
                <div class="detail-section">
                    <h3 class="detail-section-title">📝 Descrição</h3>
                    <p class="detail-text">${local.descricao || 'Sem descrição'}</p>
                </div>
                
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
                    <p class="detail-text">${npc.descricao || 'Sem descrição'}</p>
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
                    <p class="detail-text">${pista.descricao || 'Sem descrição'}</p>
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
                    <p class="detail-text">${monstro.descricao || 'Sem descrição'}</p>
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
            grid.innerHTML = locais.map(local => CardRenderer.renderLocalCard(local)).join('');
        }
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
