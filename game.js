/* ═══════════════════════════════════════════
   LOUP-GAROU — GAME ENGINE
   Rôles, phases, conditions de victoire
   ═══════════════════════════════════════════ */
'use strict';

/* ── RÔLES ── */
const ROLES = {
  villageois: {
    id: 'villageois',
    name: 'Villageois',
    icon: '🧑‍🌾',
    team: 'village',
    desc: 'Pas de pouvoir spécial. Identifie les loups et vote pour les éliminer.',
    configurable: true,
    min: 0,
    max: 12,
    default: 4,
  },
  loup_garou: {
    id: 'loup_garou',
    name: 'Loup-Garou',
    icon: '🐺',
    team: 'loups',
    desc: 'La nuit, se concerte avec les autres loups pour dévorer un villageois.',
    configurable: true,
    min: 1,
    max: 6,
    default: 2,
    hasNightAction: true,
    nightOrder: 30,
  },
  voyante: {
    id: 'voyante',
    name: 'Voyante',
    icon: '🔮',
    team: 'village',
    desc: 'Chaque nuit, découvre le rôle d\'un joueur de son choix.',
    configurable: true,
    min: 0,
    max: 1,
    default: 1,
    unique: true,
    nightOrder: 10,
    hasNightAction: true,
  },
  sorciere: {
    id: 'sorciere',
    name: 'Sorcière',
    icon: '🧙',
    team: 'village',
    desc: 'Possède une potion de vie (ressuscite) et une potion de mort (tue). Chacune utilisable une fois.',
    configurable: true,
    min: 0,
    max: 1,
    default: 1,
    unique: true,
    nightOrder: 40,
    hasNightAction: true,
  },
  chasseur: {
    id: 'chasseur',
    name: 'Chasseur',
    icon: '🏹',
    team: 'village',
    desc: 'Quand il meurt, tire une balle et emporte un joueur de son choix avec lui.',
    configurable: true,
    min: 0,
    max: 1,
    default: 0,
    unique: true,
    hasDeathAction: true,
  },
  cupidon: {
    id: 'cupidon',
    name: 'Cupidon',
    icon: '💘',
    team: 'village',
    desc: 'La première nuit, désigne deux joueurs qui tombent amoureux. Les amoureux meurent ensemble.',
    configurable: true,
    min: 0,
    max: 1,
    default: 0,
    unique: true,
    nightOrder: 5,
    hasNightAction: true,
    firstNightOnly: true,
  },
  petite_fille: {
    id: 'petite_fille',
    name: 'Petite Fille',
    icon: '👧',
    team: 'village',
    desc: 'Peut espionner les loups pendant leur phase nocturne.',
    configurable: true,
    min: 0,
    max: 1,
    default: 0,
    unique: true,
  },
};

/* ── PHASES ── */
const PHASES = {
  PREPARATION:   'preparation',
  NUIT_CUPIDON:  'nuit_cupidon',
  NUIT_VOYANTE:  'nuit_voyante',
  NUIT_LOUPS:    'nuit_loups',
  NUIT_SORCIERE: 'nuit_sorciere',
  AUBE:          'aube',
  JOUR_DEBAT:    'jour_debat',
  VOTE:          'vote',
  ELIMINATION:   'elimination',
  CHASSEUR:      'chasseur',
  FIN:           'fin',
};

const PHASE_INFO = {
  [PHASES.PREPARATION]:   { icon: '🕯️', label: 'Préparation',          night: true,  desc: 'Le Meneur prépare la partie.' },
  [PHASES.NUIT_CUPIDON]:  { icon: '💘', label: "Cupidon s'éveille",     night: true,  desc: 'Cupidon choisit deux amoureux.' },
  [PHASES.NUIT_VOYANTE]:  { icon: '🔮', label: 'La Voyante s\'éveille', night: true,  desc: 'La Voyante sonde un joueur.' },
  [PHASES.NUIT_LOUPS]:    { icon: '🐺', label: 'Les Loups s\'éveillent', night: true, desc: 'Les Loups choisissent leur victime.' },
  [PHASES.NUIT_SORCIERE]: { icon: '🧙', label: 'La Sorcière s\'éveille', night: true, desc: 'La Sorcière décide du sort de la victime.' },
  [PHASES.AUBE]:          { icon: '🌅', label: "L'aube se lève",        night: false, desc: 'Le village découvre les événements de la nuit.' },
  [PHASES.JOUR_DEBAT]:    { icon: '☀️', label: 'Débat villageois',      night: false, desc: 'Les villageois débattent.' },
  [PHASES.VOTE]:          { icon: '🗳️', label: 'Vote du village',       night: false, desc: 'Chacun vote pour éliminer un suspect.' },
  [PHASES.ELIMINATION]:   { icon: '💀', label: 'Élimination',           night: false, desc: 'Le résultat du vote est révélé.' },
  [PHASES.CHASSEUR]:      { icon: '🏹', label: 'Le Chasseur tire',       night: false, desc: 'Le Chasseur emporte quelqu\'un avec lui.' },
  [PHASES.FIN]:           { icon: '🏁', label: 'Fin de partie',         night: false, desc: 'La partie est terminée.' },
};

/* ── ÉTAT DE JEU ── */
class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.roomCode = null;
    this.hostId = null;
    this.players = {};       // { id: { id, name, role, alive, isHost } }
    this.phase = PHASES.PREPARATION;
    this.round = 0;
    this.log = [];
    this.nightVictim = null;
    this.witchSave = false;
    this.witchKill = null;
    this.witchUsedSave = false;
    this.witchUsedKill = false;
    this.seerResult = null;       // { targetId, role } visible to seer only (we store, UI filters)
    this.wolfVotes = {};
    this.dayVotes = {};
    this.lovers = [];
    this.mayorId = null;
    this.pendingChasseur = null;
    this.config = {};
    this.started = false;
    this.winner = null;
    this.cupidonDone = false;
  }

  getPlayer(id) { return this.players[id]; }
  getAlivePlayers() { return Object.values(this.players).filter(p => p.alive); }
  getDeadPlayers()  { return Object.values(this.players).filter(p => !p.alive); }
  getPlayersByRole(roleId) { return Object.values(this.players).filter(p => p.role === roleId); }
  getAliveByRole(roleId)   { return this.getAlivePlayers().filter(p => p.role === roleId); }
  getAliveWolves()   { return this.getAliveByRole('loup_garou'); }
  getAliveVillagers(){ return this.getAlivePlayers().filter(p => ROLES[p.role]?.team === 'village'); }

  addLog(text, type = 'system') {
    this.log.push({ text, type, ts: Date.now() });
  }

  checkWinCondition() {
    const wolves    = this.getAliveWolves();
    const villagers  = this.getAliveVillagers();

    // Amoureux : si les deux amoureux sont les seuls vivants (équipes opposées ou non)
    if (this.lovers.length === 2) {
      const alive = this.getAlivePlayers();
      if (alive.length === 2 && alive.every(p => this.lovers.includes(p.id))) {
        this.winner = 'amoureux';
        return 'amoureux';
      }
    }

    if (wolves.length === 0) {
      this.winner = 'village';
      return 'village';
    }
    if (wolves.length >= villagers.length) {
      this.winner = 'loups';
      return 'loups';
    }
    return null;
  }

  killPlayer(playerId, reason = '') {
    const p = this.players[playerId];
    if (!p || !p.alive) return [];
    p.alive = false;
    const dead = [playerId];
    this.addLog(`💀 ${p.name} est mort·e.${reason ? ' (' + reason + ')' : ''}`, 'death');

    if (this.lovers.includes(playerId)) {
      const loverId = this.lovers.find(id => id !== playerId);
      const lover = this.players[loverId];
      if (lover && lover.alive) {
        lover.alive = false;
        dead.push(loverId);
        this.addLog(`💘 ${lover.name} meurt de chagrin.`, 'death');
      }
    }
    return dead;
  }

  assignRoles(playerIds, config) {
    const roleList = [];
    for (const [roleId, count] of Object.entries(config)) {
      for (let i = 0; i < count; i++) roleList.push(roleId);
    }
    for (let i = roleList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roleList[i], roleList[j]] = [roleList[j], roleList[i]];
    }
    playerIds.forEach((id, idx) => {
      if (this.players[id]) this.players[id].role = roleList[idx] || 'villageois';
    });
  }

  getVoteWinner(votes, mayorId = null) {
    const tally = {};
    for (const [voter, target] of Object.entries(votes)) {
      const weight = (voter === mayorId) ? 2 : 1;
      tally[target] = (tally[target] || 0) + weight;
    }
    if (Object.keys(tally).length === 0) return null;
    const max = Math.max(...Object.values(tally));
    const winners = Object.keys(tally).filter(k => tally[k] === max);
    return { winner: winners.length === 1 ? winners[0] : null, tally, tied: winners.length > 1, tiedPlayers: winners };
  }

  toJSON() {
    return {
      roomCode: this.roomCode,
      hostId: this.hostId,
      players: this.players,
      phase: this.phase,
      round: this.round,
      log: this.log,
      nightVictim: this.nightVictim,
      witchSave: this.witchSave,
      witchKill: this.witchKill,
      witchUsedSave: this.witchUsedSave,
      witchUsedKill: this.witchUsedKill,
      seerResult: this.seerResult,
      wolfVotes: this.wolfVotes,
      dayVotes: this.dayVotes,
      lovers: this.lovers,
      mayorId: this.mayorId,
      pendingChasseur: this.pendingChasseur,
      config: this.config,
      started: this.started,
      winner: this.winner,
      cupidonDone: this.cupidonDone,
    };
  }

  fromJSON(data) {
    if (!data) return this;
    Object.assign(this, data);
    return this;
  }
}

/* ── HELPERS ── */
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function generateUserId() {
  return 'u_' + Math.random().toString(36).slice(2, 10);
}

function getDefaultConfig(playerCount) {
  const wolves = Math.max(1, Math.floor(playerCount / 4));
  const hasVoyante = playerCount >= 5;
  const hasSorciere = playerCount >= 7;
  const hasCupidon = playerCount >= 8;
  const config = { loup_garou: wolves };
  if (hasVoyante)  config.voyante = 1;
  if (hasSorciere) config.sorciere = 1;
  if (hasCupidon)  config.cupidon = 1;
  const specials = wolves + (hasVoyante ? 1 : 0) + (hasSorciere ? 1 : 0) + (hasCupidon ? 1 : 0);
  config.villageois = Math.max(0, playerCount - specials);
  return config;
}

function countRoleTotal(config) {
  return Object.values(config).reduce((a, b) => a + b, 0);
}

function getRoleTeamColor(role) {
  const team = ROLES[role]?.team;
  if (team === 'loups') return 'var(--wolf2)';
  if (team === 'village') return 'var(--sage2)';
  return 'var(--ink2)';
}

// Export pour main.js
window.LG = { ROLES, PHASES, PHASE_INFO, GameState, generateRoomCode, generateUserId, getDefaultConfig, countRoleTotal, getRoleTeamColor };
