/* ═══════════════════════════════════════════
   LOUP-GAROU — MAIN CONTROLLER (UI)
   ═══════════════════════════════════════════ */

const App = {
    game: new window.LG.GameState(),

    init() {
        this.cacheDOM();
        this.bindEvents();
        // Démarrage : afficher l'écran de config
        this.showScreen('screen-config');
    },

    cacheDOM() {
        this.screens = document.querySelectorAll('.screen');
        // Cache des éléments clés de l'UI
        this.els = {
            btnDemo: document.getElementById('btn-demo'),
            btnCreate: document.getElementById('btn-create'),
            lobbyCode: document.getElementById('lobby-code-big'),
            playerList: document.getElementById('player-list')
        };
    },

    bindEvents() {
        // Mode démo pour tester rapidement
        this.els.btnDemo.addEventListener('click', () => {
            this.startDemo();
        });
    },

    showScreen(screenId) {
        this.screens.forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    },

    startDemo() {
        // Initialisation du moteur
        this.game.roomCode = window.LG.generateRoomCode();
        
        // Simulation de 6 joueurs
        for(let i=1; i<=6; i++) {
            const id = window.LG.generateUserId();
            this.game.players[id] = { 
                id, 
                name: `Joueur ${i}`, 
                role: null, 
                alive: true 
            };
        }

        // Setup config par défaut
        this.game.config = window.LG.getDefaultConfig(6);
        this.game.assignRoles(Object.keys(this.game.players), this.game.config);
        
        // Mise à jour de l'UI du lobby
        this.els.lobbyCode.innerText = this.game.roomCode;
        this.updatePlayerList();
        
        this.showScreen('screen-lobby');
    },

    updatePlayerList() {
        const list = this.els.playerList;
        list.innerHTML = Object.values(this.game.players).map(p => `
            <li class="player-item">
                <div class="player-avatar">🧑</div>
                <div class="player-name">${p.name}</div>
            </li>
        `).join('');
        document.getElementById('player-count').innerText = Object.keys(this.game.players).length;
    },

    // Méthode pour afficher un toast (notification en bas)
    showToast(msg, type = '') {
        const toast = document.getElementById('toast');
        toast.innerText = msg;
        toast.className = `toast show ${type ? 'toast-' + type : ''}`;
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
};

// Lancement
document.addEventListener('DOMContentLoaded', () => App.init());
