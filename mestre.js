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

// ============================================
// BRAINSTORM - GERADOR DE IDEIAS
// ============================================

const BrainstormGenerator = {
    currentCategory: null,
    
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
        const ideas = this.generateMultiple(category, 6);
        const container = document.getElementById('ideasGrid');
        const resultsSection = document.getElementById('brainstormResults');
        
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
        // Botões de categoria
        document.querySelectorAll('.category-card').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.currentTarget.dataset.category;
                this.renderIdeas(category);
            });
        });
        
        // Botão de gerar mais
        const generateBtn = document.getElementById('generateMoreIdeas');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                if (this.currentCategory) {
                    this.renderIdeas(this.currentCategory);
                }
            });
        }
    }
};

// Inicializar brainstorm quando DOM carregar
document.addEventListener('DOMContentLoaded', () => {
    BrainstormGenerator.init();
});
