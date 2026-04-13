// scenes.js
// Painel de cenas e scripts do Home Assistant
// Renderiza cards clicáveis que ativam scene.turn_on / script.turn_on

const _SVG = {
  film:       '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="2.18"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 7h5M17 17h5"/></svg>',
  moon:       '<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/></svg>',
  sun:        '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
  sofa:       '<svg viewBox="0 0 24 24"><path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3"/><path d="M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z"/><path d="M4 18v2M20 18v2M12 4v9"/></svg>',
  briefcase:  '<svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="12.01"/><path d="M2 12h20"/></svg>',
  party:      '<svg viewBox="0 0 24 24"><path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01M22 8h.01M15 2h.01M22 20h.01M22 2l-2.24 3.15A16 16 0 0 0 20 10a15.86 15.86 0 0 1-4 10c-1.57 1.57-3.6 2.63-6.09 3"/><path d="M10.46 7.26C10.2 5.88 9.17 4.24 8 3"/><path d="m16.6 9.52-1.3 3"/><path d="M10.4 13.12 7 14"/><path d="M2 9.91c2.38 0 4.72-.42 7-1.26"/><path d="m15.5 4.5 3 1.5"/></svg>',
  utensils:   '<svg viewBox="0 0 24 24"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>',
  book:       '<svg viewBox="0 0 24 24"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>',
  home:       '<svg viewBox="0 0 24 24"><path d="M3 12 12 4l9 8"/><path d="M5 10v10h14V10"/></svg>',
  door:       '<svg viewBox="0 0 24 24"><path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h3"/><path d="M13 20h9"/><path d="M10 12v.01"/><path d="M13 4l-9 4v12h9V4z"/></svg>',
  sparkle:    '<svg viewBox="0 0 24 24"><path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"/></svg>',
  lightning:  '<svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
};

function _sceneIcon(name) {
  const n = name.toLowerCase();
  if (/cinema|filme|tv|tele|assistir/.test(n)) return _SVG.film;
  if (/noite|dormir|sleep|descanso|boa noite/.test(n)) return _SVG.moon;
  if (/manh[ãa]|bom dia|acordar|morning|despertar/.test(n)) return _SVG.sun;
  if (/relax|descan|chill|conforto/.test(n)) return _SVG.sofa;
  if (/trabalh|foco|work|estudo|produtiv/.test(n)) return _SVG.briefcase;
  if (/festa|party|comemora|celebr/.test(n)) return _SVG.party;
  if (/jantar|refei|comer|dinner|almo[çc]/.test(n)) return _SVG.utensils;
  if (/leitu|ler\b|read|livro/.test(n)) return _SVG.book;
  if (/chegou|chegada|home\b|voltei/.test(n)) return _SVG.home;
  if (/saiu|saida|away|ausente|sair/.test(n)) return _SVG.door;
  if (/autom|script|rotina/.test(n)) return _SVG.lightning;
  return _SVG.sparkle;
}

function _esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const ScenesPanel = {
  _container: null,
  _scenes: [],

  init(container) {
    this._container = container;
  },

  load() {
    if (!this._container) return;
    const states = (typeof HAClient !== 'undefined' && HAClient.getAllStates) ? HAClient.getAllStates() : [];
    this._scenes = states
      .filter(s =>
        (s.entity_id.startsWith('scene.') || s.entity_id.startsWith('script.')) &&
        s.state !== 'unavailable'
      )
      .map(s => ({
        id: s.entity_id,
        name: (s.attributes && s.attributes.friendly_name) || s.entity_id.split('.')[1].replace(/_/g, ' '),
        type: s.entity_id.startsWith('scene.') ? 'scene' : 'script',
      }));
    this.render();
  },

  render() {
    if (!this._container) return;
    if (!this._scenes.length) {
      this._container.classList.add('hidden');
      return;
    }
    this._container.classList.remove('hidden');

    const cards = this._scenes.map(s => `
      <button class="scene-card" type="button" data-id="${_esc(s.id)}" data-type="${_esc(s.type)}">
        <span class="scene-card-icon">${_sceneIcon(s.name)}</span>
        <span class="scene-card-name">${_esc(s.name)}</span>
      </button>
    `).join('');

    this._container.innerHTML = `
      <div class="scenes-header">
        <span class="scenes-title">Cenas &amp; Automações</span>
        <span class="scenes-badge">${this._scenes.length}</span>
      </div>
      <div class="scenes-list">${cards}</div>
    `;

    this._container.querySelectorAll('.scene-card').forEach(btn => {
      btn.addEventListener('click', () => this._activate(btn));
    });
  },

  _activate(btn) {
    const id  = btn.getAttribute('data-id');
    const type = btn.getAttribute('data-type');
    if (!id || typeof HAClient === 'undefined') return;

    btn.classList.add('scene-activating');
    btn.disabled = true;

    HAClient.callService(type, 'turn_on', { entity_id: id })
      .then(() => {
        btn.classList.remove('scene-activating');
        btn.classList.add('scene-activated');
        setTimeout(() => { btn.classList.remove('scene-activated'); btn.disabled = false; }, 1800);
      })
      .catch(err => {
        console.warn('[scenes] falhou:', err);
        btn.classList.remove('scene-activating');
        btn.classList.add('scene-error');
        setTimeout(() => { btn.classList.remove('scene-error'); btn.disabled = false; }, 1500);
      });
  },
};
