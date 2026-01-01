/* ============================================
   RPG Card Canvas — Aplicação Principal
   ============================================ */

/**
 * Aplicação Principal
 * Inicializa todos os módulos e configura a aplicação
 */
const App = (function() {
    
    // ==================== ESTADO ====================
    let isInitialized = false;
    
    // ==================== INICIALIZAÇÃO ====================
    
    /**
     * Inicializa a aplicação
     */
    function init() {
        if (isInitialized) {
            console.warn('App já inicializado');
            return;
        }
        
        console.log('🎲 RPG Card Canvas - Iniciando...');
        
        // Inicializa módulos na ordem correta
        DataManager.init();
        UI.init();
        ViewManager.init();
        GraphView.init();
        
        // Configura elementos específicos
        setupSessionName();
        setupClearFilters();
        
        // Carrega dados de exemplo se estiver vazio
        loadSampleDataIfEmpty();
        
        isInitialized = true;
        console.log('✅ RPG Card Canvas - Pronto!');
        
        // Mostra mensagem de boas-vindas
        const cards = DataManager.getAllCards();
        if (cards.length === 0) {
            UI.showToast('Bem-vindo! Crie seu primeiro card para começar.', 'info', 5000);
        }
    }
    
    /**
     * Configura nome da sessão editável
     */
    function setupSessionName() {
        const sessionName = document.getElementById('sessionName');
        if (!sessionName) return;
        
        const settings = DataManager.getSettings();
        sessionName.textContent = settings.sessionName || 'Nova Sessão';
        
        sessionName.addEventListener('click', () => {
            const newName = prompt('Nome da Sessão:', sessionName.textContent);
            if (newName !== null && newName.trim()) {
                sessionName.textContent = newName.trim();
                DataManager.updateSettings({ sessionName: newName.trim() });
            }
        });
    }
    
    /**
     * Configura botão de limpar filtros
     */
    function setupClearFilters() {
        document.getElementById('btnClearFilters')?.addEventListener('click', () => {
            ViewManager.clearFilters();
        });
    }
    
    /**
     * Carrega dados de exemplo se não houver cards
     */
    function loadSampleDataIfEmpty() {
        const cards = DataManager.getAllCards();
        if (cards.length > 0) return;
        
        // Perguntar se quer carregar dados de exemplo
        // (descomentado para não interferir com uso real)
        /*
        if (confirm('Deseja carregar dados de exemplo para explorar a ferramenta?')) {
            loadSampleData();
        }
        */
    }
    
    /**
     * Carrega dados de exemplo para demonstração
     */
    function loadSampleData() {
        // Sinopse
        const sinopse = DataManager.createCard({
            title: 'A Sombra sobre Valheim',
            typeId: 'sinopse',
            summary: 'Os heróis chegam à cidade de Valheim para investigar desaparecimentos misteriosos nas minas antigas.',
            content: `## Premissa
Os jogadores foram contratados pelo Prefeito Aldric para investigar o desaparecimento de mineradores nas Minas de Cristal.

## Conflito Central
Uma antiga entidade despertou nas profundezas das minas e está corrompendo os trabalhadores.

## Objetivos
- Descobrir a causa dos desaparecimentos
- Explorar as minas antigas
- Confrontar a ameaça nas profundezas

## Tom
Mistério e horror sutil, com elementos de exploração de dungeon.`,
            tags: ['principal', 'mistério', 'horror'],
            position: { x: 400, y: 50 }
        });
        
        // NPCs
        const prefeito = DataManager.createCard({
            title: 'Prefeito Aldric',
            typeId: 'npc',
            summary: 'Líder nervoso de Valheim, esconde um segredo sobre as minas.',
            content: `## Aparência
Homem de meia-idade, cabelos grisalhos, sempre bem vestido mas com olheiras profundas.

## Personalidade
Ansioso, evasivo quando questionado sobre o passado das minas.

## Segredo
Seu avô foi responsável por selar a entidade há 50 anos. Ele sabe mais do que admite.

## Motivação
Resolver o problema sem que a verdade venha à tona.`,
            tags: ['aliado', 'segredo'],
            customFields: [
                { name: 'Ocupação', value: 'Prefeito de Valheim' },
                { name: 'Idade', value: '52 anos' }
            ],
            position: { x: 100, y: 200 }
        });
        
        const minerador = DataManager.createCard({
            title: 'Thorin Ferreiro',
            typeId: 'npc',
            summary: 'Único sobrevivente das minas, traumatizado e relutante em falar.',
            content: `## Aparência
Anão robusto com cicatrizes recentes no rosto. Mãos tremem constantemente.

## Personalidade
Antes alegre e tagarela, agora silencioso e assustado.

## O que ele viu
Viu seus companheiros serem "tomados" por uma escuridão viva. Ouviu sussurros.

## Pista que pode dar
Menciona "cristais que pulsavam como corações" nas profundezas.`,
            tags: ['testemunha', 'pista'],
            position: { x: 100, y: 400 }
        });
        
        // Locais
        const valheim = DataManager.createCard({
            title: 'Cidade de Valheim',
            typeId: 'local',
            summary: 'Cidade mineradora próspera, agora tomada pelo medo.',
            content: `## Descrição
Cidade de médio porte construída ao pé das montanhas. Arquitetura robusta de pedra.

## Atmosfera
Ruas vazias ao anoitecer. Moradores evitam falar sobre as minas. Velas acesas em todas as janelas.

## Locais Importantes
- **Prefeitura**: Onde Aldric recebe os heróis
- **Taverna do Martelo Partido**: Onde Thorin pode ser encontrado
- **Templo de Moradin**: Padre preocupado com "profanação"`,
            tags: ['hub', 'inicial'],
            position: { x: 400, y: 200 }
        });
        
        const minas = DataManager.createCard({
            title: 'Minas de Cristal',
            typeId: 'local',
            summary: 'Antigas minas de cristais raros, agora tomadas pela escuridão.',
            content: `## Descrição
Vastas minas que se estendem por quilômetros sob a montanha. Cristais naturais iluminam alguns túneis.

## Níveis
1. **Nível Superior**: Abandonado recentemente, ferramentas largadas
2. **Nível Médio**: Sinais de luta, marcas estranhas nas paredes
3. **Nível Inferior**: Câmara selada há 50 anos

## Perigos
- Desabamentos
- Criaturas corrompidas
- A própria escuridão

## Segredo
No nível mais profundo, cristais negros pulsam com energia sombria.`,
            tags: ['dungeon', 'perigo'],
            position: { x: 700, y: 200 }
        });
        
        // Criatura
        const entidade = DataManager.createCard({
            title: 'O Sussurro das Profundezas',
            typeId: 'criatura',
            summary: 'Entidade antiga de pura escuridão que consome mentes.',
            content: `## Natureza
Não é um ser físico tradicional, mas uma consciência malévola que habita a escuridão.

## Poderes
- Corromper mentes através de sussurros
- Controlar os "tomados"
- Mover-se através de sombras
- Enfraquecer fontes de luz

## Fraqueza
Luz intensa e cristais puros (não corrompidos) causam dor.

## Objetivo
Expandir sua influência para a superfície, consumir mais mentes.`,
            tags: ['boss', 'horror'],
            position: { x: 700, y: 400 }
        });
        
        // Pistas
        const pista1 = DataManager.createCard({
            title: 'Diário do Avô de Aldric',
            typeId: 'pista',
            summary: 'Documento antigo detalhando o selamento da entidade.',
            content: `## Onde encontrar
Escondido no escritório de Aldric, em um compartimento secreto.

## Conteúdo
Relata como um grupo de mineradores encontrou "algo" nas profundezas e como foi selado usando cristais puros abençoados.

## Revelação
O selo precisa ser renovado a cada 50 anos. O prazo expirou há 3 meses.`,
            tags: ['documento', 'segredo'],
            position: { x: 400, y: 400 }
        });
        
        // Cenas
        const cena1 = DataManager.createCard({
            title: 'Chegada a Valheim',
            typeId: 'cena',
            summary: 'Os heróis chegam e percebem a atmosfera tensa da cidade.',
            content: `## Descrição
Ao chegarem, percebem ruas mais vazias que o normal. Moradores evitam contato visual.

## Objetivo
Introduzir a atmosfera e levar os jogadores ao Prefeito.

## Eventos
- Encontro com guardas nervosos no portão
- Observar moradores fechando janelas
- Chegar à prefeitura

## Transição
Leva à audiência com o Prefeito Aldric.`,
            tags: ['introdução'],
            position: { x: 100, y: 50 }
        });
        
        // Adiciona conexões
        DataManager.addConnection(sinopse.id, cena1.id, { relation: 'começa com' });
        DataManager.addConnection(sinopse.id, valheim.id, { relation: 'acontece em' });
        DataManager.addConnection(sinopse.id, minas.id, { relation: 'leva a' });
        
        DataManager.addConnection(cena1.id, prefeito.id, { relation: 'apresenta' });
        DataManager.addConnection(cena1.id, valheim.id, { relation: 'acontece em' });
        
        DataManager.addConnection(prefeito.id, pista1.id, { relation: 'esconde' });
        DataManager.addConnection(prefeito.id, minas.id, { relation: 'contrata para investigar' });
        
        DataManager.addConnection(valheim.id, minerador.id, { relation: 'onde encontrar' });
        DataManager.addConnection(valheim.id, minas.id, { relation: 'próximo a' });
        
        DataManager.addConnection(minerador.id, minas.id, { relation: 'sobreviveu a' });
        DataManager.addConnection(minerador.id, entidade.id, { relation: 'testemunhou' });
        
        DataManager.addConnection(minas.id, entidade.id, { relation: 'contém' });
        DataManager.addConnection(pista1.id, entidade.id, { relation: 'revela sobre' });
        
        ViewManager.refreshCurrentView();
        GraphView.centerGraph();
        
        UI.showToast('Dados de exemplo carregados!', 'success');
    }
    
    // ==================== API PÚBLICA ====================
    return {
        init,
        loadSampleData,
        version: '1.0.0'
    };
})();

// ==================== INICIALIZAÇÃO ====================

// Aguarda DOM estar pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', App.init);
} else {
    App.init();
}

// Expor globalmente para debug
window.App = App;
