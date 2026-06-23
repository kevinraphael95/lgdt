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
    nightOrder: 20,
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
  maire: {
    id: 'maire',
    name: 'Maire',
    icon: '🎖️',
    team: 'village',
    desc: 'Elu au premier tour, sa voix compte double lors des votes.',
    configurable: false, // toujours présent comme rôle optionnel d'élection
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
  [PHASES.PREPARATION]:   { icon: '🕯️',  label: 'Préparation',         night: true },
  [PHASES.NUIT_CUPIDON]:  { icon: '💘',  label: 'Cupidon s\'éveille',  night: true },
  [PHASES.NUIT_VOYANTE]:  { icon: '🔮',  label: 'La Voyante s\'éveille', night: true },
  [PHASES.NUIT_LOUPS]:    { icon: '🐺',  label: 'Les Loups s\'éveillent', night: true },
  [PHASES.NUIT_SORCIERE]: { icon: '🧙',  label: 'La Sorcière s\'éveille', night: true },
  [PHASES.AUBE]:          { icon: '🌅',  label: 'L\'aube se lève',     night: false },
  [PHASES.JOUR_DEBAT]:    { icon: '☀️',  label: 'Débat villageois',    night: false },
  [PHASES.VOTE]:          { icon: '🗳️',  label: 'Vote du village',     night: false },
  [PHASES.ELIMINATION]:   { icon: '💀',  label: 'Élimination',         night: false },
  [PHASES.CHASSEUR]:      { icon: '🏹',  label: 'Le Chasseur tire',    night: false },
  [PHASES.FIN]:           { icon: '🏁',  label: 'Fin de partie',       night: false },
};

/* ── ÉTAT DE JEU ── */
class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.roomCode = null;
    this.players = {};       // { id: { id, name, role, alive, lover, mayor } }
    this.phase = PHASES.PREPARATION;
    this.round = 0;
    this.log = [];
    this.nightVictim = null;      // joueur dévored by wolves
    this.witchSave = false;
    this.witchKill = null;
    this.witchUsedSave = false;
    this.witchUsedKill = false;
    this.seerTarget = null;
    this.wolfVotes = {};
    this.dayVotes = {};
    this.lovers = [];             // [id1, id2]
    this.mayorId = null;
    this.pendingChasseur = null;  // joueur chasseur mort qui doit tirer
    this.config = {};             // roleId -> count
    this.started = false;
    this.winner = null;
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
    const villagers = this.getAliveVillagers();

    if (wolves.length === 0) {
      this.winner = 'village';
      return 'village';
    }
    if (wolves.length >= villagers.length) {
      this.winner = 'loups';
      return 'loups';
    }
    // Amoureux : si les deux amoureux sont les seuls vivants d'équipes opposées
    if (this.lovers.length === 2) {
      const [l1, l2] = this.lovers.map(id => this.players[id]);
      const alive = this.getAlivePlayers();
      if (alive.length === 2 && alive.every(p => this.lovers.includes(p.id))) {
        this.winner = 'amoureux';
        return 'amoureux';
      }
    }
    return null;
  }

  killPlayer(playerId, reason = '') {
    const p = this.players[playerId];
    if (!p || !p.alive) return [];
    p.alive = false;
    const dead = [playerId];
    this.addLog(`💀 ${p.name} est mort·e.${reason ? ' (' + reason + ')' : ''}`, 'death');

    // Amoureux : si l'un meurt, l'autre aussi
    if (this.lovers.includes(playerId)) {
      const loverId = this.lovers.find(id => id !== playerId);
      const lover = this.players[loverId];
      if (lover && lover.alive) {
        lover.alive = false;
        dead.push(loverId);
        this.addLog(`💘 ${lover.name} meurt de chagrin (amour).`, 'death');
      }
    }
    return dead;
  }

  assignRoles(playerIds, config) {
    const roleList = [];
    for (const [roleId, count] of Object.entries(config)) {
      for (let i = 0; i < count; i++) roleList.push(roleId);
    }
    // Shuffle Fisher-Yates
    for (let i = roleList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roleList[i], roleList[j]] = [roleList[j], roleList[i]];
    }
    playerIds.forEach((id, idx) => {
      if (this.players[id]) this.players[id].role = roleList[idx];
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

  getNextPhases() {
    const phases = [];
    const hasCupidon  = this.getAliveByRole('cupidon').length > 0 && this.round === 0;
    const hasVoyante  = this.getAliveByRole('voyante').length > 0;
    const hasSorciere = this.getAliveByRole('sorciere').length > 0;
    const hasWolves   = this.getAliveWolves().length > 0;

    if (hasCupidon)  phases.push(PHASES.NUIT_CUPIDON);
    if (hasVoyante)  phases.push(PHASES.NUIT_VOYANTE);
    if (hasWolves)   phases.push(PHASES.NUIT_LOUPS);
    if (hasSorciere) phases.push(PHASES.NUIT_SORCIERE);
    phases.push(PHASES.AUBE);
    phases.push(PHASES.JOUR_DEBAT);
    phases.push(PHASES.VOTE);
    phases.push(PHASES.ELIMINATION);
    return phases;
  }

  toJSON() {
    return {
      roomCode: this.roomCode,
      players: this.players,
      phase: this.phase,
      round: this.round,
      log: this.log,
      nightVictim: this.nightVictim,
      witchSave: this.witchSave,
      witchKill: this.witchKill,
      witchUsedSave: this.witchUsedSave,
      witchUsedKill: this.witchUsedKill,
      wolfVotes: this.wolfVotes,
      dayVotes: this.dayVotes,
      lovers: this.lovers,
      mayorId: this.mayorId,
      pendingChasseur: this.pendingChasseur,
      config: this.config,
      started: this.started,
      winner: this.winner,
    };
  }

  fromJSON(data) {
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
  // Heuristique : nb loups ≈ 1 pour 4 joueurs
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
