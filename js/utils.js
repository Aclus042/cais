/* ============================================
   RPG Card Canvas — Funções Utilitárias
   ============================================ */

/**
 * Gera um ID único usando timestamp + random
 * @returns {string} ID único
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Debounce para otimizar chamadas de função
 * @param {Function} func - Função a ser executada
 * @param {number} wait - Tempo de espera em ms
 * @returns {Function} Função com debounce
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle para limitar chamadas de função
 * @param {Function} func - Função a ser executada
 * @param {number} limit - Limite de tempo em ms
 * @returns {Function} Função com throttle
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Escapa HTML para prevenir XSS
 * @param {string} text - Texto a ser escapado
 * @returns {string} Texto escapado
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Formata data para exibição
 * @param {Date|string|number} date - Data a ser formatada
 * @returns {string} Data formatada
 */
function formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Busca com destaque de texto
 * @param {string} text - Texto original
 * @param {string} query - Termo de busca
 * @returns {string} Texto com destaque HTML
 */
function highlightText(text, query) {
    if (!query || !text) return escapeHtml(text);
    const escaped = escapeHtml(text);
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return escaped.replace(regex, '<mark>$1</mark>');
}

/**
 * Escapa caracteres especiais de regex
 * @param {string} string - String a ser escapada
 * @returns {string} String escapada para uso em regex
 */
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Clona profundamente um objeto
 * @param {*} obj - Objeto a ser clonado
 * @returns {*} Clone do objeto
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Verifica se dois objetos são iguais
 * @param {*} a - Primeiro objeto
 * @param {*} b - Segundo objeto
 * @returns {boolean} True se são iguais
 */
function deepEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Obtém valor aninhado de objeto por path
 * @param {Object} obj - Objeto
 * @param {string} path - Caminho (ex: 'a.b.c')
 * @param {*} defaultValue - Valor padrão
 * @returns {*} Valor encontrado ou default
 */
function getNestedValue(obj, path, defaultValue = undefined) {
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
        if (result === null || result === undefined) {
            return defaultValue;
        }
        result = result[key];
    }
    return result !== undefined ? result : defaultValue;
}

/**
 * Ordena array de objetos por propriedade
 * @param {Array} array - Array a ser ordenado
 * @param {string} key - Chave para ordenação
 * @param {string} direction - 'asc' ou 'desc'
 * @returns {Array} Array ordenado
 */
function sortByKey(array, key, direction = 'asc') {
    return [...array].sort((a, b) => {
        const aVal = getNestedValue(a, key, '');
        const bVal = getNestedValue(b, key, '');
        const comparison = String(aVal).localeCompare(String(bVal), 'pt-BR', { numeric: true });
        return direction === 'asc' ? comparison : -comparison;
    });
}

/**
 * Filtra array de objetos por texto
 * @param {Array} array - Array a ser filtrado
 * @param {string} query - Termo de busca
 * @param {Array<string>} keys - Chaves a serem pesquisadas
 * @returns {Array} Array filtrado
 */
function filterByText(array, query, keys) {
    if (!query) return array;
    const lowerQuery = query.toLowerCase();
    return array.filter(item => {
        return keys.some(key => {
            const value = getNestedValue(item, key, '');
            return String(value).toLowerCase().includes(lowerQuery);
        });
    });
}

/**
 * Download de arquivo JSON
 * @param {Object} data - Dados a serem exportados
 * @param {string} filename - Nome do arquivo
 */
function downloadJson(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Lê arquivo JSON
 * @param {File} file - Arquivo a ser lido
 * @returns {Promise<Object>} Promise com dados do JSON
 */
function readJsonFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                resolve(data);
            } catch (error) {
                reject(new Error('Arquivo JSON inválido'));
            }
        };
        reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
        reader.readAsText(file);
    });
}

/**
 * Calcula distância entre dois pontos
 * @param {Object} p1 - Primeiro ponto {x, y}
 * @param {Object} p2 - Segundo ponto {x, y}
 * @returns {number} Distância
 */
function distance(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Clamp valor entre min e max
 * @param {number} value - Valor
 * @param {number} min - Mínimo
 * @param {number} max - Máximo
 * @returns {number} Valor clamped
 */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Lerp (interpolação linear)
 * @param {number} a - Valor inicial
 * @param {number} b - Valor final
 * @param {number} t - Fator (0-1)
 * @returns {number} Valor interpolado
 */
function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Gera cor aleatória em hex
 * @returns {string} Cor em formato hex
 */
function randomColor() {
    const colors = [
        '#ef4444', '#f97316', '#f59e0b', '#eab308',
        '#84cc16', '#22c55e', '#14b8a6', '#06b6d4',
        '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6',
        '#a855f7', '#d946ef', '#ec4899', '#f43f5e'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Converte cor hex para RGB
 * @param {string} hex - Cor em hex
 * @returns {Object} Objeto {r, g, b}
 */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

/**
 * Converte RGB para hex
 * @param {number} r - Red
 * @param {number} g - Green
 * @param {number} b - Blue
 * @returns {string} Cor em hex
 */
function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

/**
 * Determina se a cor é clara ou escura
 * @param {string} hex - Cor em hex
 * @returns {boolean} True se for escura
 */
function isColorDark(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return false;
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance < 0.5;
}

/**
 * Local Storage helpers com fallback
 */
const storage = {
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch {
            return defaultValue;
        }
    },
    
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch {
            console.warn('Erro ao salvar no localStorage');
            return false;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch {
            return false;
        }
    },
    
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch {
            return false;
        }
    }
};

/**
 * Event Bus simples para comunicação entre módulos
 */
const EventBus = {
    events: {},
    
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
        
        // Retorna função para remover listener
        return () => this.off(event, callback);
    },
    
    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    },
    
    emit(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Erro no event handler para ${event}:`, error);
            }
        });
    }
};

// Expor globalmente
window.Utils = {
    generateId,
    debounce,
    throttle,
    escapeHtml,
    formatDate,
    highlightText,
    escapeRegex,
    deepClone,
    deepEqual,
    getNestedValue,
    sortByKey,
    filterByText,
    downloadJson,
    readJsonFile,
    distance,
    clamp,
    lerp,
    randomColor,
    hexToRgb,
    rgbToHex,
    isColorDark,
    storage,
    EventBus
};
