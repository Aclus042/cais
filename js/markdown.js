/* ============================================
   RPG Card Canvas — Parser Markdown Simples
   ============================================ */

/**
 * Parser Markdown simplificado para uso em cards
 * Suporta: headers, bold, italic, lists, blockquotes, code, links
 */
const MarkdownParser = (function() {
    
    /**
     * Converte Markdown para HTML
     * @param {string} text - Texto em Markdown
     * @returns {string} HTML
     */
    function parse(text) {
        if (!text) return '';
        
        let html = text;
        
        // Escape HTML primeiro
        html = escapeHtml(html);
        
        // Headers (### H3, ## H2, # H1)
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        
        // Bold **text** ou __text__
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
        
        // Italic *text* ou _text_
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        html = html.replace(/_(.+?)_/g, '<em>$1</em>');
        
        // Strikethrough ~~text~~
        html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
        
        // Inline code `code`
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Blockquotes > text
        html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
        
        // Horizontal rule ---
        html = html.replace(/^---$/gm, '<hr>');
        
        // Unordered lists - item ou * item
        html = parseUnorderedLists(html);
        
        // Ordered lists 1. item
        html = parseOrderedLists(html);
        
        // Links [text](url)
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
        
        // Paragraphs (linhas vazias separam parágrafos)
        html = parseParagraphs(html);
        
        // Limpa blockquotes consecutivos
        html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n');
        
        return html;
    }
    
    /**
     * Escapa HTML
     * @param {string} text - Texto
     * @returns {string} Texto escapado
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Parse listas não ordenadas
     * @param {string} html - HTML atual
     * @returns {string} HTML com listas
     */
    function parseUnorderedLists(html) {
        const lines = html.split('\n');
        const result = [];
        let inList = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const match = line.match(/^[-*] (.+)$/);
            
            if (match) {
                if (!inList) {
                    result.push('<ul>');
                    inList = true;
                }
                result.push(`<li>${match[1]}</li>`);
            } else {
                if (inList) {
                    result.push('</ul>');
                    inList = false;
                }
                result.push(line);
            }
        }
        
        if (inList) {
            result.push('</ul>');
        }
        
        return result.join('\n');
    }
    
    /**
     * Parse listas ordenadas
     * @param {string} html - HTML atual
     * @returns {string} HTML com listas
     */
    function parseOrderedLists(html) {
        const lines = html.split('\n');
        const result = [];
        let inList = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const match = line.match(/^\d+\. (.+)$/);
            
            if (match) {
                if (!inList) {
                    result.push('<ol>');
                    inList = true;
                }
                result.push(`<li>${match[1]}</li>`);
            } else {
                if (inList) {
                    result.push('</ol>');
                    inList = false;
                }
                result.push(line);
            }
        }
        
        if (inList) {
            result.push('</ol>');
        }
        
        return result.join('\n');
    }
    
    /**
     * Parse parágrafos
     * @param {string} html - HTML atual
     * @returns {string} HTML com parágrafos
     */
    function parseParagraphs(html) {
        // Split por linhas duplas
        const blocks = html.split(/\n\n+/);
        
        return blocks.map(block => {
            // Não envolve em <p> se já é um elemento de bloco
            if (block.match(/^<(h[1-6]|ul|ol|blockquote|hr|pre)/)) {
                return block;
            }
            // Não envolve linhas vazias
            if (!block.trim()) {
                return '';
            }
            // Envolve em parágrafo
            return `<p>${block.replace(/\n/g, '<br>')}</p>`;
        }).join('\n');
    }
    
    /**
     * Remove formatação Markdown
     * @param {string} text - Texto com Markdown
     * @returns {string} Texto limpo
     */
    function stripMarkdown(text) {
        if (!text) return '';
        
        let clean = text;
        
        // Remove headers
        clean = clean.replace(/^#{1,6} /gm, '');
        
        // Remove bold/italic
        clean = clean.replace(/\*\*(.+?)\*\*/g, '$1');
        clean = clean.replace(/__(.+?)__/g, '$1');
        clean = clean.replace(/\*(.+?)\*/g, '$1');
        clean = clean.replace(/_(.+?)_/g, '$1');
        
        // Remove strikethrough
        clean = clean.replace(/~~(.+?)~~/g, '$1');
        
        // Remove code
        clean = clean.replace(/`([^`]+)`/g, '$1');
        
        // Remove blockquotes
        clean = clean.replace(/^> /gm, '');
        
        // Remove list markers
        clean = clean.replace(/^[-*] /gm, '');
        clean = clean.replace(/^\d+\. /gm, '');
        
        // Remove links, keep text
        clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
        
        // Remove horizontal rules
        clean = clean.replace(/^---$/gm, '');
        
        return clean.trim();
    }
    
    /**
     * Insere formatação no texto
     * @param {HTMLTextAreaElement} textarea - Elemento textarea
     * @param {string} format - Tipo de formatação
     */
    function insertFormat(textarea, format) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selected = text.substring(start, end);
        
        let insertion = '';
        let cursorOffset = 0;
        
        switch (format) {
            case 'bold':
                insertion = `**${selected || 'texto'}**`;
                cursorOffset = selected ? 0 : -2;
                break;
            case 'italic':
                insertion = `*${selected || 'texto'}*`;
                cursorOffset = selected ? 0 : -1;
                break;
            case 'heading':
                insertion = `\n## ${selected || 'Título'}\n`;
                cursorOffset = selected ? 0 : -1;
                break;
            case 'list':
                if (selected) {
                    insertion = selected.split('\n').map(line => `- ${line}`).join('\n');
                } else {
                    insertion = '\n- Item\n';
                }
                break;
            case 'quote':
                if (selected) {
                    insertion = selected.split('\n').map(line => `> ${line}`).join('\n');
                } else {
                    insertion = '\n> Citação\n';
                }
                break;
            case 'code':
                insertion = `\`${selected || 'código'}\``;
                cursorOffset = selected ? 0 : -1;
                break;
            case 'link':
                insertion = `[${selected || 'texto'}](url)`;
                cursorOffset = -1;
                break;
            default:
                insertion = selected;
        }
        
        textarea.value = text.substring(0, start) + insertion + text.substring(end);
        
        // Reposiciona cursor
        const newPos = start + insertion.length + cursorOffset;
        textarea.setSelectionRange(newPos, newPos);
        textarea.focus();
        
        // Dispara evento de input para atualizar estado
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    // API Pública
    return {
        parse,
        stripMarkdown,
        insertFormat
    };
})();

// Expor globalmente
window.MarkdownParser = MarkdownParser;
