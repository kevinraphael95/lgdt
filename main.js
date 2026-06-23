/* ═══════════════════════════════════════════
   LOUP-GAROU — MAIN CONTROLLER (UI)
   Gère tous les écrans, le flow hôte/invité,
   et la synchronisation multijoueur.
   ═══════════════════════════════════════════ */
'use strict';

const App = {
  MIN_PLAYERS: 5,
  game: new window.LG.GameState(),
  myId: null,
  myName: null,
  isHost: false,
  isOnline: false,       // true si connecté à Supabase
  pollTimer: null,
  selectedTargets: {},   // état temporaire de sélection pour l'action en cours

  /* ────────────────────────────────────────
     INITIALISATION
  ──────────────────────────────────────── */
  init() {
    this.cacheDOM();
    this.bindEvents();
    this.restoreIdentity();

    // Si des identifiants Supabase existent déjà, on tente la connexion auto
    if (window.Sync.tryAutoConnect()) {
      this.isOnline = true;
      this.showScreen('screen-home');
    } else {
      this.showScreen('screen-config');
    }
    this.renderHomeHeader();
  },

  restoreIdentity() {
    this.myId = localStorage.getItem('lg_my_id') || window.LG.generateUserId();
    localStorage.setItem('lg_my_id', this.myId);
    this.myName = localStorage.getItem('lg_my_name') || '';
    if (this.els.usernameInput) this.els.usernameInput.value = this.myName;
  },

  cacheDOM() {
    this.screens = document.querySelectorAll('.screen');
    this.els = {
      // config
      sbUrl: document.getElementById('sb-url'),
      sbKey: document.getElementById('sb-key'),
      btnSaveConfig: document.getElementById('btn-save-config'),
      btnDemo: document.getElementById('btn-demo'),
      // home
      headerUsername: document.getElementById('header-username'),
      btnCreate: document.getElementById('btn-create'),
      joinCode: document.getElementById('join-code'),
      btnJoin: document.getElementById('btn-join'),
      usernameInput: document.getElementById('username-input'),
      btnSetUsername: document.getElementById('btn-set-username'),
      // lobby
      btnLeaveLobby: document.getElementById('btn-leave-lobby'),
      lobbyRoomCode: document.getElementById('lobby-room-code'),
      lobbyCode: document.getElementById('lobby-code-big'),
      btnCopyCode: document.getElementById('btn-copy-code'),
      playerList: document.getElementById('player-list'),
      playerCount: document.getElementById('player-count'),
      hostControls: document.getElementById('host-controls'),
      rolesConfig: document.getElementById('roles-config'),
      roleSummary: document.getElementById('role-summary'),
      btnStartGame: document.getElementById('btn-start-game'),
      startHint: document.getElementById('start-hint'),
      guestWaiting: document.getElementById('guest-waiting'),
      rolesLegendList: document.getElementById('roles-legend-list'),
      // game
      gamePhaseLabel: document.getElementById('game-phase-label'),
      gameRoomCode: document.getElementById('game-room-code'),
      myRoleIcon: document.getElementById('my-role-icon'),
      myRoleName: document.getElementById('my-role-name'),
      myRoleDesc: document.getElementById('my-role-desc'),
      myStatusBadge: document.getElementById('my-status-badge'),
      aliveCount: document.getElementById('alive-count'),
      playersAliveList: document.getElementById('players-alive-list'),
      phaseIcon: document.getElementById('phase-icon'),
      phaseTitle: document.getElementById('phase-title'),
      phaseDesc: document.getElementById('phase-desc'),
      actionZone: document.getElementById('action-zone'),
      actionTitle: document.getElementById('action-title'),
      actionDesc: document.getElementById('action-desc'),
      actionTargets: document.getElementById('action-targets'),
      actionButtons: document.getElementById('action-buttons'),
      actionResult: document.getElementById('action-result'),
      gameLog: document.getElementById('game-log'),
      hostPanel: document.getElementById('host-panel'),
      hostPhaseControls: document.getElementById('host-phase-controls'),
      hostActionsZone: document.getElementById('host-actions-zone'),
      // end
      endMoon: document.getElementById('end-moon'),
      endTitle: document.getElementById('end-title'),
      endSubtitle: document.getElementById('end-subtitle'),
      endReveals: document.getElementById('end-reveals'),
      btnPlayAgain: document.getElementById('btn-play-again'),
      // misc
      toast: document.getElementById('toast'),
      modalOverlay: document.getElementById('modal-overlay'),
      modalBox: document.getElementById('modal-box'),
      modalTitle: document.getElementById('modal-title'),
      modalBody: document.getElementById('modal-body'),
      modalActions: document.getElementById('modal-actions'),
    };
  },

  bindEvents() {
    // Config
    this.els.btnSaveConfig.addEventListener('click', () => this.handleSaveConfig());
    this.els.btnDemo.addEventListener('click', () => this.startDemo());

    // Home
    this.els.btnSetUsername.addEventListener('click', () => this.handleSetUsername());
    this.els.usernameInput.addEventListener('keydown', e => { if (e.key === 'Enter') this.handleSetUsername(); });
    this.els.btnCreate.addEventListener('click', () => this.handleCreateGame());
    this.els.btnJoin.addEventListener('click', () => this.handleJoinGame());
    this.els.joinCode.addEventListener('keydown', e => { if (e.key === 'Enter') this.handleJoinGame(); });
    this.els.joinCode.addEventListener('input', () => {
      this.els.joinCode.value = this.els.joinCode.value.toUpperCase();
    });

    // Lobby
    this.els.btnLeaveLobby.addEventListener('click', () => this.handleLeaveLobby());
    this.els.btnCopyCode.addEventListener('click', () => this.handleCopyCode());
    this.els.btnStartGame.addEventListener('click', () => this.handleStartGame());

    // End
    this.els.btnPlayAgain.addEventListener('click', () => this.handlePlayAgain());
  },

  /* ────────────────────────────────────────
     ÉCRANS
  ──────────────────────────────────────── */
  showScreen(screenId) {
    this.screens.forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
  },

  renderHomeHeader() {
    if (this.els.headerUsername) {
      this.els.headerUsername.innerText = this.myName ? `👤 ${this.myName}` : '';
    }
  },

  showToast(msg, type = '') {
    const toast = this.els.toast;
    toast.innerText = msg;
    toast.className = `toast show ${type ? 'toast-' + type : ''}`;
    setTimeout(() => toast.classList.remove('show'), 3000);
  },

  showModal(title, body, actions) {
    this.els.modalTitle.innerText = title;
    this.els.modalBody.innerText = body;
    this.els.modalActions.innerHTML = '';
    actions.forEach(a => {
      const btn = document.createElement('button');
      btn.className = a.danger ? 'btn-danger' : (a.primary ? 'btn-primary' : 'btn-secondary');
      btn.innerText = a.label;
      btn.addEventListener('click', () => {
        this.hideModal();
        a.onClick && a.onClick();
      });
      this.els.modalActions.appendChild(btn);
    });
    this.els.modalOverlay.style.display = 'flex';
  },

  hideModal() {
    this.els.modalOverlay.style.display = 'none';
  },

  /* ────────────────────────────────────────
     CONFIG SUPABASE
  ──────────────────────────────────────── */
  handleSaveConfig() {
    const url = this.els.sbUrl.value.trim();
    const key = this.els.sbKey.value.trim();
    if (!url || !key) {
      this.showToast('Renseigne l\'URL et la clé.', 'error');
      return;
    }
    try {
      window.Sync.connect(url, key);
      this.isOnline = true;
      this.showToast('Connecté à Supabase !', 'success');
      this.showScreen('screen-home');
      this.renderHomeHeader();
    } catch (e) {
      console.error(e);
      this.showToast('Connexion impossible. Vérifie l\'URL et la clé.', 'error');
    }
  },

  /* ────────────────────────────────────────
     MODE DÉMO (solo/local, sans Supabase)
  ──────────────────────────────────────── */
  startDemo() {
    this.isOnline = false;
    this.isHost = true;
    this.myName = this.myName || 'Meneur';
    this.myId = 'host_demo';

    this.game.reset();
    this.game.roomCode = window.LG.generateRoomCode();
    this.game.hostId = this.myId;
    this.game.players[this.myId] = { id: this.myId, name: this.myName, role: null, alive: true, isHost: true };

    for (let i = 1; i <= 5; i++) {
      const id = window.LG.generateUserId();
      this.game.players[id] = { id, name: `Joueur ${i}`, role: null, alive: true, isHost: false };
    }

    this.game.config = window.LG.getDefaultConfig(6);
    this.enterLobby();
  },

  /* ────────────────────────────────────────
     PSEUDO
  ──────────────────────────────────────── */
  handleSetUsername() {
    const name = this.els.usernameInput.value.trim();
    if (!name) {
      this.showToast('Choisis un pseudo.', 'error');
      return;
    }
    this.myName = name;
    localStorage.setItem('lg_my_name', name);
    this.renderHomeHeader();
    this.showToast('Pseudo enregistré !', 'success');
  },

  ensureUsername() {
    if (!this.myName) {
      this.showToast('Choisis d\'abord un pseudo en bas de l\'écran.', 'error');
      return false;
    }
    return true;
  },

  /* ────────────────────────────────────────
     CRÉER UNE PARTIE (hôte)
  ──────────────────────────────────────── */
  async handleCreateGame() {
    if (!this.ensureUsername()) return;

    if (!this.isOnline) {
      this.showToast('Connecte Supabase pour jouer en ligne, ou utilise le mode démo.', 'error');
      return;
    }

    this.isHost = true;
    this.game.reset();
    this.game.roomCode = window.LG.generateRoomCode();
    this.game.hostId = this.myId;
    this.game.players[this.myId] = { id: this.myId, name: this.myName, role: null, alive: true, isHost: true };
    this.game.config = window.LG.getDefaultConfig(1);

    try {
      await window.Sync.createGame(this.game.roomCode, this.game.toJSON());
      this.subscribeToGame();
      this.enterLobby();
    } catch (e) {
      this.logSupabaseError('Création de partie', e);
      this.showToast(this.describeSupabaseError(e), 'error');
    }
  },

  /* ────────────────────────────────────────
     REJOINDRE UNE PARTIE (invité)
  ──────────────────────────────────────── */
  async handleJoinGame() {
    if (!this.ensureUsername()) return;

    const code = this.els.joinCode.value.trim().toUpperCase();
    if (!code) {
      this.showToast('Entre un code de partie.', 'error');
      return;
    }
    if (!this.isOnline) {
      this.showToast('Connecte Supabase pour rejoindre une partie en ligne.', 'error');
      return;
    }

    try {
      const state = await window.Sync.fetchGame(code);
      if (!state) {
        this.showToast('Partie introuvable.', 'error');
        return;
      }
      if (state.started) {
        this.showToast('Cette partie a déjà commencé.', 'error');
        return;
      }

      this.isHost = false;
      this.game.fromJSON(state);

      if (!this.game.players[this.myId]) {
        this.game.players[this.myId] = { id: this.myId, name: this.myName, role: null, alive: true, isHost: false };
        const specials = window.LG.countRoleTotal(this.game.config) - (this.game.config.villageois || 0);
        const total = Object.keys(this.game.players).length;
        this.game.config.villageois = Math.max(0, total - specials);
        await window.Sync.pushState(code, this.game.toJSON());
      }

      this.subscribeToGame();
      this.enterLobby();
    } catch (e) {
      this.logSupabaseError('Rejoindre une partie', e);
      this.showToast(this.describeSupabaseError(e), 'error');
    }
  },

  subscribeToGame() {
    if (!this.isOnline) return;
    window.Sync.subscribe(this.game.roomCode, (state) => {
      this.game.fromJSON(state);
      this.onRemoteStateUpdate();
    });
  },

  /* Appelé chaque fois qu'un nouvel état arrive depuis Supabase */
  onRemoteStateUpdate() {
    const active = document.querySelector('.screen.active');
    if (!active) return;

    if (this.game.winner) {
      this.renderEndScreen();
      this.showScreen('screen-end');
      return;
    }
    if (this.game.started) {
      this.renderGameScreen();
      if (active.id !== 'screen-game') this.showScreen('screen-game');
    } else {
      this.renderLobby();
      if (active.id !== 'screen-lobby') this.showScreen('screen-lobby');
    }
  },

  /* Sauvegarde l'état localement et le pousse vers Supabase si en ligne */
  async saveState({ immediate = false } = {}) {
    if (this.isOnline && this.game.roomCode) {
      if (immediate) {
        try { await window.Sync.pushState(this.game.roomCode, this.game.toJSON()); }
        catch (e) { console.error(e); this.showToast('Erreur de synchronisation.', 'error'); }
      } else {
        window.Sync.pushStateDebounced(this.game.roomCode, this.game.toJSON());
      }
    }
  },

  /* ────────────────────────────────────────
     LOBBY
  ──────────────────────────────────────── */
  enterLobby() {
    this.els.lobbyRoomCode.innerText = this.game.roomCode;
    this.renderLobby();
    this.showScreen('screen-lobby');
  },

  renderLobby() {
    this.els.lobbyCode.innerText = this.game.roomCode || '——';
    this.els.lobbyRoomCode.innerText = this.game.roomCode || '';

    const players = Object.values(this.game.players);
    this.els.playerCount.innerText = players.length;
    this.els.playerList.innerHTML = players.map(p => `
      <li class="player-item ${p.id === this.myId ? 'is-me' : ''}">
        <div class="player-avatar">${p.isHost ? '🎩' : '🧑'}</div>
        <div class="player-name">${this.escapeHtml(p.name)}</div>
        ${p.isHost ? '<span class="player-host-badge">MENEUR</span>' : ''}
      </li>
    `).join('');

    this.renderRolesLegend();

    if (this.isHost) {
      this.els.hostControls.style.display = 'flex';
      this.els.guestWaiting.style.display = 'none';
      this.renderRolesConfig(players.length);
    } else {
      this.els.hostControls.style.display = 'none';
      this.els.guestWaiting.style.display = 'flex';
    }
  },

  renderRolesLegend() {
    this.els.rolesLegendList.innerHTML = Object.values(window.LG.ROLES).map(r => `
      <div class="role-legend-item">
        <div class="role-legend-icon">${r.icon}</div>
        <div class="role-legend-info">
          <div class="role-legend-name">${r.name}</div>
          <div class="role-legend-desc">${r.desc}</div>
        </div>
      </div>
    `).join('');
  },

  renderRolesConfig(playerCount) {
    const cfg = this.game.config;
    const configurableRoles = Object.values(window.LG.ROLES).filter(r => r.configurable);

    this.els.rolesConfig.innerHTML = configurableRoles.map(r => {
      const count = cfg[r.id] || 0;
      return `
        <div class="role-config-item" data-role="${r.id}">
          <div class="role-config-icon">${r.icon}</div>
          <div class="role-config-info">
            <div class="role-config-name">${r.name}</div>
            <div class="role-config-count">
              <button class="role-count-btn" data-action="dec" data-role="${r.id}">−</button>
              <span class="role-count-val">${count}</span>
              <button class="role-count-btn" data-action="inc" data-role="${r.id}">+</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.els.rolesConfig.querySelectorAll('.role-count-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const roleId = btn.dataset.role;
        const action = btn.dataset.action;
        const role = window.LG.ROLES[roleId];
        let val = this.game.config[roleId] || 0;
        if (action === 'inc' && val < role.max) val++;
        if (action === 'dec' && val > role.min) val--;
        this.game.config[roleId] = val;
        this.renderRolesConfig(playerCount);
        this.updateRoleSummary(playerCount);
        this.saveState();
      });
    });

    this.updateRoleSummary(playerCount);
  },

  updateRoleSummary(playerCount) {
    const total = window.LG.countRoleTotal(this.game.config);
    const wolves = this.game.config.loup_garou || 0;
    const enoughPlayers = playerCount >= this.MIN_PLAYERS;
    const ok = total === playerCount && wolves >= 1 && enoughPlayers;

    this.els.roleSummary.innerHTML = `
      <strong>${total}</strong> rôle(s) assigné(s) pour <strong>${playerCount}</strong> joueur(s).
      ${!enoughPlayers ? `<br>⚠️ Il faut au moins ${this.MIN_PLAYERS} joueurs pour lancer une partie (${playerCount}/${this.MIN_PLAYERS}).` : ''}
      ${total !== playerCount ? `<br>⚠️ Le total doit être exactement égal au nombre de joueurs.` : ''}
      ${wolves < 1 ? `<br>⚠️ Il faut au moins un Loup-Garou.` : ''}
    `;

    this.els.btnStartGame.disabled = !ok;
    this.els.startHint.innerText = ok
      ? 'Tout est prêt !'
      : (!enoughPlayers
          ? `En attente de joueurs (${playerCount}/${this.MIN_PLAYERS} minimum)…`
          : 'Ajuste la composition pour pouvoir lancer la partie.');
  },

  handleCopyCode() {
    navigator.clipboard?.writeText(this.game.roomCode || '').then(() => {
      this.showToast('Code copié !', 'success');
    }).catch(() => this.showToast('Impossible de copier.', 'error'));
  },

  handleLeaveLobby() {
    this.showModal(
      'Quitter la partie ?',
      'Tu vas quitter ce lobby. Si tu es le Meneur, la partie ne pourra plus continuer pour les autres.',
      [
        { label: 'Annuler' },
        { label: 'Quitter', danger: true, onClick: () => {
          window.Sync.unsubscribe();
          this.game.reset();
          this.isHost = false;
          this.showScreen('screen-home');
        }},
      ]
    );
  },

  async handleStartGame() {
    const playerIds = Object.keys(this.game.players);
    if (playerIds.length < this.MIN_PLAYERS) {
      this.showToast(`Il faut au moins ${this.MIN_PLAYERS} joueurs pour lancer la partie.`, 'error');
      return;
    }
    const total = window.LG.countRoleTotal(this.game.config);
    if (total !== playerIds.length) {
      this.showToast('La composition des rôles ne correspond pas au nombre de joueurs.', 'error');
      return;
    }

    this.game.assignRoles(playerIds, this.game.config);
    this.game.started = true;
    this.game.round = 1;
    this.game.addLog('🌕 La partie commence. Les rôles ont été distribués en secret.', 'system');

    this.advancePhase(true);
    await this.saveState({ immediate: true });
    this.renderGameScreen();
    this.showScreen('screen-game');
  },

  handlePlayAgain() {
    window.Sync.unsubscribe();
    this.game.reset();
    this.isHost = false;
    this.showScreen('screen-home');
  },

  /* ────────────────────────────────────────
     MOTEUR DE PHASES
  ──────────────────────────────────────── */
  getPhaseSequence() {
    const seq = [];
    const isFirstNight = this.game.round === 1;
    const hasCupidon  = !this.game.cupidonDone && this.game.getAliveByRole('cupidon').length > 0 && isFirstNight;
    const hasVoyante  = this.game.getAliveByRole('voyante').length > 0;
    const hasWolves   = this.game.getAliveWolves().length > 0;
    const hasSorciere = this.game.getAliveByRole('sorciere').length > 0;

    if (hasCupidon)  seq.push(window.LG.PHASES.NUIT_CUPIDON);
    if (hasVoyante)  seq.push(window.LG.PHASES.NUIT_VOYANTE);
    if (hasWolves)   seq.push(window.LG.PHASES.NUIT_LOUPS);
    if (hasSorciere) seq.push(window.LG.PHASES.NUIT_SORCIERE);
    seq.push(window.LG.PHASES.AUBE);
    seq.push(window.LG.PHASES.JOUR_DEBAT);
    seq.push(window.LG.PHASES.VOTE);
    seq.push(window.LG.PHASES.ELIMINATION);
    return seq;
  },

  /* Avance à la phase suivante (uniquement appelé par l'hôte) */
  advancePhase(isFirstCall = false) {
    const P = window.LG.PHASES;

    if (!isFirstCall) {
      const seq = this.getPhaseSequence();
      const idx = seq.indexOf(this.game.phase);
      let next;
      if (idx === -1 || idx === seq.length - 1) {
        // Fin du cycle jour/nuit → on vérifie victoire puis on recommence une nuit
        const winner = this.game.checkWinCondition();
        if (winner) {
          this.game.phase = P.FIN;
          this.game.addLog('🏁 La partie est terminée.', 'system');
          this.renderEndScreen();
          this.showScreen('screen-end');
          this.saveState({ immediate: true });
          return;
        }
        this.game.round++;
        const newSeq = this.getPhaseSequence();
        next = newSeq[0];
      } else {
        next = seq[idx + 1];
      }
      this.game.phase = next;
    } else {
      const seq = this.getPhaseSequence();
      this.game.phase = seq[0];
    }

    this.onPhaseEnter();
  },

  onPhaseEnter() {
    const P = window.LG.PHASES;
    const info = window.LG.PHASE_INFO[this.game.phase];
    this.selectedTargets = {};

    switch (this.game.phase) {
      case P.NUIT_CUPIDON:
        this.game.addLog('💘 Cupidon se réveille…', 'night');
        break;
      case P.NUIT_VOYANTE:
        this.game.addLog('🔮 La Voyante se réveille…', 'night');
        break;
      case P.NUIT_LOUPS:
        this.game.wolfVotes = {};
        this.game.addLog('🐺 Les Loups se réveillent…', 'night');
        break;
      case P.NUIT_SORCIERE:
        this.game.addLog('🧙 La Sorcière se réveille…', 'night');
        break;
      case P.AUBE: {
        this.resolveNight();
        break;
      }
      case P.JOUR_DEBAT:
        this.game.addLog('☀️ Le village débat.', 'day');
        break;
      case P.VOTE:
        this.game.dayVotes = {};
        this.game.addLog('🗳️ Le vote commence.', 'day');
        break;
      case P.ELIMINATION:
        this.resolveVote();
        break;
    }
  },

  /* Résout les événements de la nuit (appelée à l'aube) */
  resolveNight() {
    const deaths = [];

    // Loups : victime choisie
    if (this.game.nightVictim) {
      // La sorcière peut avoir sauvé la victime
      if (!this.game.witchSave) {
        const dead = this.game.killPlayer(this.game.nightVictim, 'dévoré·e par les Loups');
        deaths.push(...dead);
      } else {
        this.game.addLog(`🧪 La Sorcière a sauvé ${this.game.players[this.game.nightVictim]?.name || 'la victime'}.`, 'action');
      }
    } else {
      this.game.addLog('🌙 Cette nuit, personne n\'a été attaqué.', 'system');
    }

    // Sorcière : potion de mort
    if (this.game.witchKill) {
      const dead = this.game.killPlayer(this.game.witchKill, 'empoisonné·e par la Sorcière');
      deaths.push(...dead);
    }

    // Chasseur mort cette nuit → doit tirer
    const chasseurDead = deaths.find(id => this.game.players[id]?.role === 'chasseur');
    if (chasseurDead) {
      this.game.pendingChasseur = chasseurDead;
    }

    this.game.nightVictim = null;
    this.game.witchSave = false;
    this.game.witchKill = null;

    this.game.addLog('🌅 Le village se réveille et découvre les événements de la nuit.', 'day');
  },

  /* Résout le vote du village */
  resolveVote() {
    const result = this.game.getVoteWinner(this.game.dayVotes, this.game.mayorId);
    if (!result || result.tied || !result.winner) {
      this.game.addLog('⚖️ Le vote est indécis, personne n\'est éliminé.', 'day');
      return;
    }
    const dead = this.game.killPlayer(result.winner, 'éliminé·e par le vote');
    const chasseurDead = dead.find(id => this.game.players[id]?.role === 'chasseur');
    if (chasseurDead) {
      this.game.pendingChasseur = chasseurDead;
    }
  },

  /* ────────────────────────────────────────
     RENDU ÉCRAN DE JEU
  ──────────────────────────────────────── */
  renderGameScreen() {
    const me = this.game.players[this.myId];
    const info = window.LG.PHASE_INFO[this.game.phase];

    this.els.gameRoomCode.innerText = this.game.roomCode || '';
    this.els.gamePhaseLabel.innerText = `${info.icon} ${info.label}`;

    // Mon rôle
    if (me && me.role) {
      const role = window.LG.ROLES[me.role];
      this.els.myRoleIcon.innerText = role.icon;
      this.els.myRoleName.innerText = role.name;
      this.els.myRoleDesc.innerText = role.desc;
    }
    if (me) {
      this.els.myStatusBadge.innerText = me.alive ? 'Vivant·e' : 'Mort·e';
      this.els.myStatusBadge.className = `status-badge ${me.alive ? 'alive' : 'dead'}`;
    }

    // Liste des joueurs
    const players = Object.values(this.game.players);
    this.els.aliveCount.innerText = this.game.getAlivePlayers().length;
    this.els.playersAliveList.innerHTML = players.map(p => `
      <li class="player-alive-item ${!p.alive ? 'dead' : ''} ${p.id === this.myId ? 'is-me' : ''}">
        <span class="player-alive-status">${p.alive ? '🟢' : '⚫'}</span>
        <span>${this.escapeHtml(p.name)}</span>
        ${this.game.mayorId === p.id ? ' 🎖️' : ''}
        ${this.game.lovers.includes(p.id) ? ' 💘' : ''}
      </li>
    `).join('');

    // Phase display
    this.els.phaseIcon.innerText = info.icon;
    this.els.phaseTitle.innerText = info.label;
    this.els.phaseDesc.innerText = info.desc;

    // Journal
    this.els.gameLog.innerHTML = this.game.log.slice(-40).reverse().map(l => `
      <li class="log-entry log-${l.type}">${this.escapeHtml(l.text)}</li>
    `).join('');

    // Zone d'action (selon mon rôle + phase)
    this.renderActionZone(me);

    // Panneau hôte
    if (this.isHost) {
      this.els.hostPanel.style.display = 'flex';
      this.renderHostPanel();
    } else {
      this.els.hostPanel.style.display = 'none';
    }

    // Chasseur en attente de tirer
    if (this.game.pendingChasseur === this.myId) {
      this.renderChasseurAction();
    }

    // Vérifie fin de partie
    if (this.game.winner) {
      this.renderEndScreen();
      this.showScreen('screen-end');
    }
  },

  renderActionZone(me) {
    const P = window.LG.PHASES;
    const zone = this.els.actionZone;
    zone.style.display = 'none';
    this.els.actionResult.style.display = 'none';

    if (!me || !me.alive) return;
    if (this.game.pendingChasseur && this.game.pendingChasseur === this.myId) return; // géré ailleurs

    const role = me.role;
    const alivePlayers = this.game.getAlivePlayers();
    const others = alivePlayers.filter(p => p.id !== this.myId);

    if (this.game.phase === P.NUIT_CUPIDON && role === 'cupidon' && !this.game.cupidonDone) {
      zone.style.display = 'block';
      this.els.actionTitle.innerText = '💘 Choisis deux amoureux';
      this.els.actionDesc.innerText = 'Sélectionne deux joueurs qui tomberont amoureux (toi compris si tu veux).';
      this.renderTargetButtons(alivePlayers, 2, 'cupidon');
      this.renderActionConfirm(() => this.submitCupidon());
      return;
    }

    if (this.game.phase === P.NUIT_VOYANTE && role === 'voyante') {
      zone.style.display = 'block';
      this.els.actionTitle.innerText = '🔮 Sonde un joueur';
      this.els.actionDesc.innerText = 'Choisis un joueur pour découvrir son rôle.';
      this.renderTargetButtons(others, 1, 'voyante');
      this.renderActionConfirm(() => this.submitVoyante());
      if (this.game.seerResult && this.game.seerResult.seerId === this.myId) {
        const target = this.game.players[this.game.seerResult.targetId];
        const targetRole = window.LG.ROLES[this.game.seerResult.role];
        this.els.actionResult.style.display = 'block';
        this.els.actionResult.innerText = `${target?.name} est : ${targetRole?.icon} ${targetRole?.name}`;
      }
      return;
    }

    if (this.game.phase === P.NUIT_LOUPS && role === 'loup_garou') {
      zone.style.display = 'block';
      this.els.actionTitle.innerText = '🐺 Choisissez votre victime';
      this.els.actionDesc.innerText = 'Vote avec les autres loups pour désigner la victime de cette nuit.';
      const villagerTargets = alivePlayers.filter(p => p.role !== 'loup_garou' || true); // loups peuvent voir tous les vivants
      this.renderTargetButtons(alivePlayers.filter(p => p.id !== this.myId || alivePlayers.length === 1), 1, 'loup');
      this.renderActionConfirm(() => this.submitWolfVote());
      return;
    }

    if (this.game.phase === P.NUIT_SORCIERE && role === 'sorciere') {
      zone.style.display = 'block';
      this.els.actionTitle.innerText = '🧙 Pouvoirs de la Sorcière';
      const victim = this.game.players[this.game.nightVictim];
      this.els.actionDesc.innerText = victim
        ? `${victim.name} a été attaqué·e par les Loups. Utilise tes potions si tu le souhaites.`
        : 'Personne n\'a été attaqué cette nuit.';
      this.els.actionTargets.innerHTML = '';
      this.els.actionButtons.innerHTML = '';

      if (victim && !this.game.witchUsedSave) {
        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn-secondary';
        saveBtn.innerText = `🧪 Sauver ${victim.name}`;
        saveBtn.addEventListener('click', () => this.submitWitchSave());
        this.els.actionButtons.appendChild(saveBtn);
      }
      if (!this.game.witchUsedKill) {
        others.forEach(p => {
          const btn = document.createElement('button');
          btn.className = 'target-btn';
          btn.innerText = `☠️ ${p.name}`;
          btn.addEventListener('click', () => this.submitWitchKill(p.id));
          this.els.actionTargets.appendChild(btn);
        });
      }
      const passBtn = document.createElement('button');
      passBtn.className = 'btn-ghost';
      passBtn.innerText = 'Ne rien faire →';
      passBtn.addEventListener('click', () => this.submitWitchPass());
      this.els.actionButtons.appendChild(passBtn);
      return;
    }

    if (this.game.phase === P.VOTE) {
      zone.style.display = 'block';
      this.els.actionTitle.innerText = '🗳️ Vote';
      this.els.actionDesc.innerText = 'Choisis qui tu accuses.';
      this.renderTargetButtons(others, 1, 'vote');
      this.renderActionConfirm(() => this.submitDayVote());
      return;
    }
  },

  renderTargetButtons(players, maxSelect, key) {
    this.els.actionTargets.innerHTML = '';
    const selected = this.selectedTargets[key] || [];
    players.forEach(p => {
      const btn = document.createElement('button');
      btn.className = `target-btn ${selected.includes(p.id) ? 'selected' : ''}`;
      btn.innerText = p.name;
      btn.addEventListener('click', () => {
        let sel = this.selectedTargets[key] || [];
        if (sel.includes(p.id)) {
          sel = sel.filter(id => id !== p.id);
        } else {
          if (sel.length >= maxSelect) sel = maxSelect === 1 ? [p.id] : sel;
          else sel.push(p.id);
        }
        this.selectedTargets[key] = sel;
        this.renderTargetButtons(players, maxSelect, key);
      });
      this.els.actionTargets.appendChild(btn);
    });
  },

  renderActionConfirm(onConfirm) {
    this.els.actionButtons.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'btn-primary';
    btn.innerText = 'Valider';
    btn.addEventListener('click', onConfirm);
    this.els.actionButtons.appendChild(btn);
  },

  async submitCupidon() {
    const sel = this.selectedTargets.cupidon || [];
    if (sel.length !== 2) { this.showToast('Choisis exactement 2 joueurs.', 'error'); return; }
    this.game.lovers = sel;
    this.game.cupidonDone = true;
    this.game.addLog('💘 Cupidon a désigné deux amoureux (en secret).', 'action');
    await this.saveState({ immediate: true });
    this.showToast('Amoureux désignés !', 'success');
  },

  async submitVoyante() {
    const sel = this.selectedTargets.voyante || [];
    if (sel.length !== 1) { this.showToast('Choisis un joueur.', 'error'); return; }
    const targetId = sel[0];
    this.game.seerResult = { seerId: this.myId, targetId, role: this.game.players[targetId].role };
    this.game.addLog('🔮 La Voyante a sondé un joueur (en secret).', 'action');
    await this.saveState({ immediate: true });
    this.renderGameScreen();
  },

  async submitWolfVote() {
    const sel = this.selectedTargets.loup || [];
    if (sel.length !== 1) { this.showToast('Choisis une victime.', 'error'); return; }
    this.game.wolfVotes[this.myId] = sel[0];
    const result = this.game.getVoteWinner(this.game.wolfVotes);
    if (result && result.winner) this.game.nightVictim = result.winner;
    this.game.addLog('🐺 Un loup a voté.', 'action');
    await this.saveState({ immediate: true });
    this.showToast('Vote enregistré !', 'success');
  },

  async submitWitchSave() {
    this.game.witchSave = true;
    this.game.witchUsedSave = true;
    this.game.addLog('🧪 La Sorcière a utilisé sa potion de vie.', 'action');
    await this.saveState({ immediate: true });
    this.renderGameScreen();
  },

  async submitWitchKill(targetId) {
    this.game.witchKill = targetId;
    this.game.witchUsedKill = true;
    this.game.addLog('☠️ La Sorcière a utilisé sa potion de mort.', 'action');
    await this.saveState({ immediate: true });
    this.renderGameScreen();
  },

  async submitWitchPass() {
    this.game.addLog('🧙 La Sorcière n\'a rien fait.', 'action');
    await this.saveState({ immediate: true });
    this.renderGameScreen();
  },

  async submitDayVote() {
    const sel = this.selectedTargets.vote || [];
    if (sel.length !== 1) { this.showToast('Choisis un joueur.', 'error'); return; }
    this.game.dayVotes[this.myId] = sel[0];
    this.game.addLog(`🗳️ ${this.game.players[this.myId]?.name} a voté.`, 'action');
    await this.saveState({ immediate: true });
    this.showToast('Vote enregistré !', 'success');
  },

  renderChasseurAction() {
    const zone = this.els.actionZone;
    zone.style.display = 'block';
    this.els.actionTitle.innerText = '🏹 Tu emportes quelqu\'un avec toi';
    this.els.actionDesc.innerText = 'Choisis un joueur qui mourra avec toi.';
    const targets = this.game.getAlivePlayers().filter(p => p.id !== this.myId);
    this.renderTargetButtons(targets, 1, 'chasseur');
    this.renderActionConfirm(async () => {
      const sel = this.selectedTargets.chasseur || [];
      if (sel.length !== 1) { this.showToast('Choisis un joueur.', 'error'); return; }
      this.game.killPlayer(sel[0], 'emporté·e par le Chasseur');
      this.game.pendingChasseur = null;
      await this.saveState({ immediate: true });
      this.renderGameScreen();
    });
  },

  /* ────────────────────────────────────────
     PANNEAU HÔTE
  ──────────────────────────────────────── */
  renderHostPanel() {
    const P = window.LG.PHASES;
    this.els.hostPhaseControls.innerHTML = '';
    this.els.hostActionsZone.innerHTML = '';

    const info = window.LG.PHASE_INFO[this.game.phase];
    const canAdvance = this.canAdvanceCurrentPhase();

    const btn = document.createElement('button');
    btn.className = 'host-btn active';
    btn.innerText = canAdvance ? `▶ Passer à la suite` : `⏳ En attente des actions…`;
    btn.disabled = !canAdvance;
    btn.addEventListener('click', () => this.handleHostAdvance());
    this.els.hostPhaseControls.appendChild(btn);

    // Affichage des votes en direct pendant le vote du village
    if (this.game.phase === P.VOTE) {
      const voteList = document.createElement('div');
      voteList.className = 'host-vote-list';
      const alive = this.game.getAlivePlayers();
      const tally = {};
      Object.values(this.game.dayVotes).forEach(t => { tally[t] = (tally[t] || 0) + 1; });
      const maxVotes = Math.max(1, ...Object.values(tally), 0);
      alive.forEach(p => {
        const count = tally[p.id] || 0;
        const row = document.createElement('div');
        row.className = 'host-vote-item';
        row.innerHTML = `<span>${this.escapeHtml(p.name)}</span><span>${count}</span>`;
        voteList.appendChild(row);
      });
      this.els.hostActionsZone.appendChild(voteList);
      const progress = document.createElement('p');
      progress.className = 'start-hint';
      progress.innerText = `${Object.keys(this.game.dayVotes).length} / ${alive.length} ont voté`;
      this.els.hostActionsZone.appendChild(progress);
    }

    if (this.game.phase === P.NUIT_LOUPS) {
      const wolves = this.game.getAliveWolves();
      const progress = document.createElement('p');
      progress.className = 'start-hint';
      progress.innerText = `${Object.keys(this.game.wolfVotes).length} / ${wolves.length} loups ont voté`;
      this.els.hostActionsZone.appendChild(progress);
    }
  },

  /* Détermine si l'hôte peut faire avancer la phase actuelle */
  canAdvanceCurrentPhase() {
    const P = window.LG.PHASES;
    switch (this.game.phase) {
      case P.NUIT_CUPIDON:
        return this.game.cupidonDone;
      case P.NUIT_VOYANTE:
        return !!this.game.seerResult;
      case P.NUIT_LOUPS: {
        const wolves = this.game.getAliveWolves();
        return wolves.every(w => this.game.wolfVotes[w.id]);
      }
      case P.NUIT_SORCIERE:
        return this.game.witchUsedSave !== undefined; // l'hôte peut toujours forcer le passage
      case P.VOTE: {
        const alive = this.game.getAlivePlayers();
        return alive.every(p => this.game.dayVotes[p.id]) || true; // l'hôte peut forcer si débat trop long
      }
      default:
        return true;
    }
  },

  async handleHostAdvance() {
    if (this.game.pendingChasseur) {
      this.showToast('En attente du tir du Chasseur…', 'error');
      return;
    }
    this.advancePhase(false);
    await this.saveState({ immediate: true });
    this.renderGameScreen();
  },

  /* ────────────────────────────────────────
     FIN DE PARTIE
  ──────────────────────────────────────── */
  renderEndScreen() {
    const winner = this.game.winner;
    if (winner === 'loups') {
      this.els.endMoon.innerText = '🐺';
      this.els.endTitle.innerText = 'Les Loups ont gagné';
      this.els.endTitle.className = 'end-title wolves';
      this.els.endSubtitle.innerText = 'Thiercelieu est désormais aux mains des créatures de la nuit.';
    } else if (winner === 'amoureux') {
      this.els.endMoon.innerText = '💘';
      this.els.endTitle.innerText = 'Les Amoureux ont gagné';
      this.els.endTitle.className = 'end-title village';
      this.els.endSubtitle.innerText = 'L\'amour triomphe de tout, même de la guerre des clans.';
    } else {
      this.els.endMoon.innerText = '🌕';
      this.els.endTitle.innerText = 'Le Village a gagné';
      this.els.endTitle.className = 'end-title village';
      this.els.endSubtitle.innerText = 'Les Loups ont été chassés de Thiercelieu.';
    }

    this.els.endReveals.innerHTML = Object.values(this.game.players).map(p => {
      const role = window.LG.ROLES[p.role] || { icon: '❓', name: '?' };
      return `
        <div class="reveal-card">
          <span class="reveal-icon">${role.icon}</span>
          <div>
            <div class="reveal-name">${this.escapeHtml(p.name)}</div>
            <div class="reveal-role">${role.name}${!p.alive ? ' · 💀' : ''}</div>
          </div>
        </div>
      `;
    }).join('');
  },

  /* ────────────────────────────────────────
     UTILITAIRES
  ──────────────────────────────────────── */
  logSupabaseError(context, e) {
    const details = {
      message: e?.message,
      details: e?.details,
      hint: e?.hint,
      code: e?.code,
      status: e?.status,
    };
    console.error(`[Supabase] ${context}:`, details, e);
  },

  describeSupabaseError(e) {
    const msg = e?.message || '';
    if (e?.code === '42P01' || /relation .* does not exist/i.test(msg)) {
      return 'La table "games" n\'existe pas. Relance le script SQL dans Supabase.';
    }
    if (e?.status === 404 || /not found/i.test(msg)) {
      return 'Adresse Supabase introuvable (404). Vérifie que l\'URL du projet ne contient PAS "/rest/v1" à la fin.';
    }
    if (e?.code === '23505' || /duplicate key/i.test(msg)) {
      return 'Ce code de partie existe déjà, réessaie.';
    }
    if (/row-level security|permission denied|RLS/i.test(msg) || e?.code === '42501') {
      return 'Accès refusé par Supabase (Row Level Security). Vérifie les policies de la table "games".';
    }
    if (/Failed to fetch|NetworkError|fetch/i.test(msg) || e?.status === 0) {
      return 'Impossible de contacter Supabase. Vérifie l\'URL du projet.';
    }
    if (e?.status === 401 || e?.status === 403 || /JWT|api key/i.test(msg)) {
      return 'Clé anonyme invalide ou rejetée par Supabase.';
    }
    return msg ? `Erreur Supabase : ${msg}` : 'Erreur inconnue. Regarde la console (F12) pour plus de détails.';
  },

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
};

// Lancement
document.addEventListener('DOMContentLoaded', () => App.init());
