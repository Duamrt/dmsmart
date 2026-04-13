// zone-editor.js
// Modal de criação/edição de ambiente (zona).
// Usado pelo "+ Novo ambiente" do dashboard e pelo botão ✏️ do ZoneModal.
//
// Fluxo:
//   ZoneEditor.open()              → cria nova zona
//   ZoneEditor.open({ zoneId })    → edita zona existente
//
// Pega a lista de entidades disponíveis via HAClient.getAllStates(). Se o HA
// estiver offline, cai num fallback usando as entidades já registradas no
// StateStore (modo mock).

const ZONE_EDITOR_ICONS = [
  { name: 'sofa',    label: 'Sala' },
  { name: 'bed',     label: 'Quarto' },
  { name: 'kitchen', label: 'Cozinha' },
  { name: 'shower',  label: 'Banheiro' },
  { name: 'toilet',  label: 'Lavabo' },
  { name: 'monitor', label: 'Escritório' },
  { name: 'washing', label: 'Lavanderia' },
  { name: 'hanger',  label: 'Closet' },
  { name: 'car',     label: 'Garagem' },
  { name: 'tree',    label: 'Área externa' },
  { name: 'door',    label: 'Entrada' },
  { name: 'lamp',    label: 'Outro' }
];

const ZONE_EDITOR_DOMAINS = {
  light:         { label: 'Luzes',              type: 'light' },
  switch:        { label: 'Tomadas',            type: 'switch' },
  climate:       { label: 'Clima / Ar',         type: 'climate' },
  cover:         { label: 'Cortinas / Portões', type: 'cover' },
  media_player:  { label: 'TVs e mídia',        type: 'media_player' },
  fan:           { label: 'Ventiladores',       type: 'fan' },
  camera:        { label: 'Câmeras',            type: 'camera' },
  sensor:        { label: 'Sensores',           type: 'sensor' },
  binary_sensor: { label: 'Sensores (on/off)',  type: 'binary_sensor' }
};

const ZoneEditor = {
  _overlay: null,
  _mode: 'create',
  _zoneId: null,
  _draft: null,
  _bound: false,

  init() {
    this._overlay = document.getElementById('zone-editor');
    if (!this._overlay || this._bound) return;
    this._bind();
    this._bound = true;
  },

  open(opts = {}) {
    if (!this._overlay) this.init();
    if (!this._overlay) return;

    if (opts.zoneId) {
      const zone = ZoneRegistry.get(opts.zoneId);
      if (!zone) return;
      this._mode = 'edit';
      this._zoneId = zone.id;
      this._draft = {
        name: zone.name || '',
        icon: zone.icon || ZONE_EDITOR_ICONS[0].name,
        devices: zone.devices.map(d => ({ ...d }))
      };
    } else {
      this._mode = 'create';
      this._zoneId = null;
      this._draft = {
        name: '',
        icon: ZONE_EDITOR_ICONS[0].name,
        devices: []
      };
    }

    this._render();
    this._overlay.classList.remove('hidden');
    document.body.classList.add('modal-open');
    setTimeout(() => {
      const input = this._overlay.querySelector('[data-ze="name"]');
      if (input) { input.focus(); input.select(); }
    }, 20);
  },

  close() {
    if (!this._overlay) return;
    this._overlay.classList.add('hidden');
    document.body.classList.remove('modal-open');
    this._draft = null;
    this._zoneId = null;
  },

  _render() {
    if (!this._overlay || !this._draft) return;

    const title = this._mode === 'edit' ? 'Editar ambiente' : 'Novo ambiente';
    const assignedByOthers = new Set();
    for (const z of ZoneRegistry.all()) {
      if (z.id === this._zoneId) continue;
      for (const d of z.devices) assignedByOthers.add(d.entity);
    }
    const selectedIds = new Set(this._draft.devices.map(d => d.entity));

    const states = this._getAvailableStates();
    const useful = states.filter(e => {
      if (!e || !e.entity_id) return false;
      const domain = e.entity_id.split('.')[0];
      return !!ZONE_EDITOR_DOMAINS[domain];
    });

    const groups = {};
    for (const e of useful) {
      const domain = e.entity_id.split('.')[0];
      if (!groups[domain]) groups[domain] = [];
      groups[domain].push(e);
    }
    for (const k of Object.keys(groups)) {
      groups[k].sort((a, b) => {
        const an = (a.attributes && a.attributes.friendly_name) || a.entity_id;
        const bn = (b.attributes && b.attributes.friendly_name) || b.entity_id;
        return an.localeCompare(bn, 'pt-BR');
      });
    }

    const iconsHTML = ZONE_EDITOR_ICONS.map(item => `
      <button type="button" class="ze-icon ${this._draft.icon === item.name ? 'active' : ''}"
              data-ze="icon" data-icon="${item.name}" aria-label="${item.label}">
        <span class="ze-icon-svg">${_zeIcon(item.name)}</span>
        <span class="ze-icon-label">${item.label}</span>
      </button>
    `).join('');

    const groupsHTML = Object.keys(groups).length === 0
      ? `<div class="ze-empty">Nenhum dispositivo disponível. ${this._isMockOrOffline() ? 'Conecte o Home Assistant pra ver entidades reais.' : ''}</div>`
      : Object.entries(groups).map(([domain, items]) => {
          const label = ZONE_EDITOR_DOMAINS[domain].label;
          const rowsHTML = items.map(e => {
            const friendly = (e.attributes && e.attributes.friendly_name) || e.entity_id;
            const isSelected = selectedIds.has(e.entity_id);
            const usedElsewhere = assignedByOthers.has(e.entity_id) && !isSelected;
            return `
              <label class="ze-entity-row ${isSelected ? 'on' : ''} ${usedElsewhere ? 'taken' : ''}">
                <input type="checkbox" data-ze="entity" value="${_zeEsc(e.entity_id)}" ${isSelected ? 'checked' : ''} ${usedElsewhere ? 'disabled' : ''}>
                <span class="ze-entity-text">
                  <span class="ze-entity-name">${_zeEsc(friendly)}</span>
                  <span class="ze-entity-id">${_zeEsc(e.entity_id)}${usedElsewhere ? ' · já em outro ambiente' : ''}</span>
                </span>
              </label>
            `;
          }).join('');
          return `
            <div class="ze-group">
              <div class="ze-group-label">${label} <span>(${items.length})</span></div>
              ${rowsHTML}
            </div>
          `;
        }).join('');

    const deleteBtn = this._mode === 'edit'
      ? `<button type="button" class="ze-delete" data-ze="delete">Excluir ambiente</button>`
      : '';

    this._overlay.innerHTML = `
      <div class="ze-card" role="dialog" aria-modal="true" aria-label="${title}">
        <div class="ze-head">
          <div class="ze-head-title">${title}</div>
          <button type="button" class="ze-close" data-ze="close" aria-label="Fechar">×</button>
        </div>
        <div class="ze-body">
          <div class="ze-field">
            <label class="ze-label" for="ze-name">Nome do ambiente</label>
            <input type="text" id="ze-name" data-ze="name" class="ze-input"
                   placeholder="Ex: Suíte, Sala, Cozinha" maxlength="40"
                   value="${_zeEsc(this._draft.name)}">
          </div>
          <div class="ze-field">
            <div class="ze-label">Ícone</div>
            <div class="ze-icons">${iconsHTML}</div>
          </div>
          <div class="ze-field">
            <div class="ze-label">Dispositivos <span class="ze-count">${this._draft.devices.length} selecionado${this._draft.devices.length === 1 ? '' : 's'}</span></div>
            <div class="ze-entities">${groupsHTML}</div>
          </div>
        </div>
        <div class="ze-foot">
          ${deleteBtn}
          <div class="ze-foot-actions">
            <button type="button" class="ze-btn ze-btn-ghost" data-ze="cancel">Cancelar</button>
            <button type="button" class="ze-btn ze-btn-primary" data-ze="save">${this._mode === 'edit' ? 'Salvar' : 'Criar ambiente'}</button>
          </div>
        </div>
      </div>
    `;
  },

  _bind() {
    this._overlay.addEventListener('click', (e) => {
      if (e.target === this._overlay) { this.close(); return; }
      const btn = e.target.closest('[data-ze]');
      if (!btn) return;
      const action = btn.getAttribute('data-ze');

      if (action === 'close' || action === 'cancel') { this.close(); return; }

      if (action === 'icon') {
        this._captureForm();
        this._draft.icon = btn.getAttribute('data-icon');
        this._render();
        return;
      }

      if (action === 'save') { this._save(); return; }

      if (action === 'delete') { this._deleteZone(); return; }
    });

    this._overlay.addEventListener('change', (e) => {
      if (!e.target.matches('[data-ze="entity"]')) return;
      this._captureForm();
      this._updateCountLabel();
    });

    this._overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
      if (e.key === 'Enter' && e.target && e.target.matches('[data-ze="name"]')) {
        e.preventDefault();
        this._save();
      }
    });
  },

  _captureForm() {
    if (!this._overlay || !this._draft) return;
    const nameEl = this._overlay.querySelector('[data-ze="name"]');
    if (nameEl) this._draft.name = nameEl.value;

    const checked = Array.from(this._overlay.querySelectorAll('[data-ze="entity"]:checked'))
      .map(el => el.value);

    const states = this._getAvailableStates();
    const stateMap = new Map(states.map(s => [s.entity_id, s]));

    // Preserve existing device ids + critical flag
    const existing = new Map(this._draft.devices.map(d => [d.entity, d]));

    this._draft.devices = checked.map(entityId => {
      const prev = existing.get(entityId);
      const state = stateMap.get(entityId);
      const domain = entityId.split('.')[0];
      const domainDef = ZONE_EDITOR_DOMAINS[domain];
      const friendly = (state && state.attributes && state.attributes.friendly_name) || entityId;
      return prev ? { ...prev } : {
        id: 'dev_' + entityId.replace(/[^a-z0-9]/gi, '_').slice(0, 20) + '_' + Math.random().toString(36).slice(2, 6),
        name: friendly,
        type: domainDef ? domainDef.type : 'switch',
        entity: entityId,
        isCritical: false
      };
    });
  },

  _updateCountLabel() {
    const el = this._overlay && this._overlay.querySelector('.ze-count');
    if (!el) return;
    const n = this._draft.devices.length;
    el.textContent = `${n} selecionado${n === 1 ? '' : 's'}`;
  },

  _save() {
    this._captureForm();
    const name = (this._draft.name || '').trim();
    if (!name) {
      const input = this._overlay.querySelector('[data-ze="name"]');
      if (input) { input.focus(); input.classList.add('ze-input-error'); }
      return;
    }
    this._draft.name = name;

    if (this._mode === 'edit') {
      ZoneRegistry.updateZone(this._zoneId, {
        name: this._draft.name,
        icon: this._draft.icon,
        devices: this._draft.devices
      });
    } else {
      ZoneRegistry.addZone({
        name: this._draft.name,
        icon: this._draft.icon,
        devices: this._draft.devices
      });
    }

    this.close();
  },

  _deleteZone() {
    if (this._mode !== 'edit' || !this._zoneId) return;
    const zone = ZoneRegistry.get(this._zoneId);
    if (!zone) { this.close(); return; }
    const ok = confirm(`Excluir o ambiente "${zone.name}"? Os dispositivos voltam a ficar disponíveis pra outros ambientes.`);
    if (!ok) return;
    ZoneRegistry.removeZone(this._zoneId);
    this.close();
  },

  _getAvailableStates() {
    if (typeof HAClient !== 'undefined' && HAClient.getAllStates) {
      const s = HAClient.getAllStates();
      if (Array.isArray(s) && s.length > 0) return s;
    }
    // Fallback mock: usa o que estiver no StateStore
    if (typeof StateStore !== 'undefined' && StateStore._state) {
      return Object.values(StateStore._state);
    }
    return [];
  },

  _isMockOrOffline() {
    if (typeof HAClient === 'undefined' || !HAClient.getAllStates) return true;
    const s = HAClient.getAllStates();
    return !Array.isArray(s) || s.length === 0;
  }
};

function _zeEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function _zeIcon(name) {
  if (typeof UIRenderer !== 'undefined' && UIRenderer._getIcon) {
    return UIRenderer._getIcon(name);
  }
  return '';
}
