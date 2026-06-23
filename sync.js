/* ═══════════════════════════════════════════
   LOUP-GAROU — SYNC SUPABASE (multijoueur)
   Gère la connexion, la lecture/écriture de l'état
   de la partie, et l'abonnement temps réel.
   ═══════════════════════════════════════════ */
'use strict';

const Sync = {
  client: null,
  channel: null,
  roomCode: null,
  onStateChange: null,  // callback(stateObject)
  _saveTimer: null,

  /* Connexion au projet Supabase avec l'URL + clé fournies */
  connect(url, anonKey) {
    if (!window.supabase) {
      throw new Error('Librairie Supabase non chargée.');
    }
    const cleanUrl = this.sanitizeUrl(url);
    this.client = window.supabase.createClient(cleanUrl, anonKey.trim());
    localStorage.setItem('lg_sb_url', cleanUrl);
    localStorage.setItem('lg_sb_key', anonKey.trim());
    return this.client;
  },

  /* Nettoie les erreurs de copier-coller fréquentes sur l'URL du projet */
  sanitizeUrl(url) {
    let u = url.trim();
    u = u.replace(/\/(rest|auth|realtime|storage)\/v1.*$/i, ''); // retire un suffixe d'API collé par erreur
    u = u.replace(/\/+$/, ''); // retire les / de fin
    return u;
  },

  /* Tente de se reconnecter avec les identifiants sauvegardés */
  tryAutoConnect() {
    const url = localStorage.getItem('lg_sb_url');
    const key = localStorage.getItem('lg_sb_key');
    if (url && key) {
      try {
        this.connect(url, key);
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  },

  isConnected() {
    return !!this.client;
  },

  /* Crée une nouvelle partie (ligne) dans la table `games` */
  async createGame(roomCode, initialState) {
    if (!this.client) throw new Error('Non connecté à Supabase.');
    const { error } = await this.client
      .from('games')
      .insert([{ room_code: roomCode, state: initialState }]);
    if (error) throw error;
    this.roomCode = roomCode;
    return true;
  },

  /* Récupère l'état actuel d'une partie */
  async fetchGame(roomCode) {
    if (!this.client) throw new Error('Non connecté à Supabase.');
    const { data, error } = await this.client
      .from('games')
      .select('state')
      .eq('room_code', roomCode)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return data.state;
  },

  /* Pousse un nouvel état pour la partie (écrase l'état précédent) */
  async pushState(roomCode, state) {
    if (!this.client) throw new Error('Non connecté à Supabase.');
    const { error } = await this.client
      .from('games')
      .update({ state, updated_at: new Date().toISOString() })
      .eq('room_code', roomCode);
    if (error) throw error;
    return true;
  },

  /* Version "debounced" : regroupe les écritures rapprochées pour éviter le flood */
  pushStateDebounced(roomCode, state, delay = 150) {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      this.pushState(roomCode, state).catch(err => console.error('Erreur de synchronisation:', err));
    }, delay);
  },

  /* S'abonne aux changements en temps réel sur une partie */
  subscribe(roomCode, callback) {
    if (!this.client) throw new Error('Non connecté à Supabase.');
    this.unsubscribe();
    this.roomCode = roomCode;
    this.onStateChange = callback;

    this.channel = this.client
      .channel(`game-${roomCode}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `room_code=eq.${roomCode}` },
        (payload) => {
          if (payload.new && payload.new.state) {
            callback(payload.new.state);
          }
        }
      )
      .subscribe();

    return this.channel;
  },

  unsubscribe() {
    if (this.channel && this.client) {
      this.client.removeChannel(this.channel);
    }
    this.channel = null;
  },
};

window.Sync = Sync;
