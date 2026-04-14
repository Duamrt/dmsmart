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
  plus:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
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

function _slugify(s) {
  return s.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const ScenesPanel = {
  _container: null,
  _scenes: [],
  _modal: null,

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
      // Estado vazio — sempre renderiza o conteúdo, visibilidade controlada pelo setView
      this._container.innerHTML = `
        <div class="scenes-empty-page">
          <div class="scenes-empty-page-icon">${_SVG.sparkle}</div>
          <div class="scenes-empty-page-title">Nenhuma cena ainda</div>
          <div class="scenes-empty-page-sub">Crie uma cena capturando o estado atual dos seus dispositivos — sem sair do app.</div>
          <button class="scenes-create-btn" type="button" id="scenes-create-first">
            ${_SVG.plus} Nova cena
          </button>
          <div class="scenes-tips">
            <div class="scenes-tip-label">Sugestões</div>
            <div class="scenes-tip-list">
              ${['Cinema', 'Boa noite', 'Bom dia', 'Trabalho', 'Chegou em casa'].map(n => `
                <button class="scenes-tip-pill" type="button" data-name="${_esc(n)}">${n}</button>
              `).join('')}
            </div>
          </div>
        </div>
      `;
      this._container.querySelector('#scenes-create-first')
        .addEventListener('click', () => this._openCreateModal());
      this._container.querySelectorAll('.scenes-tip-pill').forEach(pill => {
        pill.addEventListener('click', () => this._openCreateModal(pill.getAttribute('data-name')));
      });
      return;
    }

    this._container.innerHTML = `
      <div class="scenes-header">
        <span class="scenes-title">Cenas &amp; Automações</span>
        <span class="scenes-badge">${this._scenes.length}</span>
        <button class="scenes-add-btn" type="button" id="scenes-add-btn" title="Nova cena">${_SVG.plus}</button>
      </div>
      <div class="scenes-list">${this._scenes.map(s => `
        <div class="scene-card-wrap">
          <button class="scene-card" type="button" data-id="${_esc(s.id)}" data-type="${_esc(s.type)}">
            <span class="scene-card-icon">${_sceneIcon(s.name)}</span>
            <span class="scene-card-name">${_esc(s.name)}</span>
          </button>
          ${s.type === 'scene' ? `
          <button class="scene-more-btn" type="button" data-id="${_esc(s.id)}" data-name="${_esc(s.name)}" title="Opções" aria-label="Opções">⋯</button>
          <div class="scene-more-menu hidden" id="smenu-${_esc(s.id.replace(/\./g,'-'))}">
            <button type="button" class="scene-menu-edit" data-id="${_esc(s.id)}" data-name="${_esc(s.name)}">Editar</button>
            <button type="button" class="scene-menu-delete" data-id="${_esc(s.id)}" data-name="${_esc(s.name)}">Excluir</button>
          </div>
          ` : ''}
        </div>
      `).join('')}</div>
    `;

    this._container.querySelector('#scenes-add-btn')
      .addEventListener('click', () => this._openCreateModal());

    this._container.querySelectorAll('.scene-card').forEach(btn => {
      btn.addEventListener('click', () => this._activate(btn));
    });

    // Menus ⋯
    this._container.querySelectorAll('.scene-more-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const menuId = 'smenu-' + id.replace(/\./g, '-');
        const menu = document.getElementById(menuId);
        if (!menu) return;
        const isOpen = !menu.classList.contains('hidden');
        this._closeMenus();
        if (!isOpen) menu.classList.remove('hidden');
      });
    });

    this._container.querySelectorAll('.scene-menu-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._closeMenus();
        const scene = this._scenes.find(s => s.id === btn.getAttribute('data-id'));
        if (scene) this._openCreateModal(scene.name, scene.id);
      });
    });

    this._container.querySelectorAll('.scene-menu-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._closeMenus();
        this._deleteScene(btn.getAttribute('data-id'), btn.getAttribute('data-name'));
      });
    });

    // Fechar menu ao clicar fora
    document.addEventListener('click', this._boundCloseMenus = () => this._closeMenus(), { once: true });
  },

  _closeMenus() {
    if (this._container) {
      this._container.querySelectorAll('.scene-more-menu').forEach(m => m.classList.add('hidden'));
    }
  },

  async _deleteScene(entityId, name) {
    if (!confirm(`Excluir a cena "${name}"?\nEssa ação não pode ser desfeita.`)) return;
    try {
      await HAClient.callService('scene', 'delete', { entity_id: entityId });
      if (typeof _showToast === 'function') _showToast(`Cena "${name}" excluída`, 'success');
      await HAClient.refreshAllStates();
      this.load();
    } catch (err) {
      console.warn('[scenes] erro ao excluir:', err);
      if (typeof _showToast === 'function') _showToast('Erro ao excluir a cena', 'error');
    }
  },

  _activate(btn) {
    const id   = btn.getAttribute('data-id');
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

  // ─── Modal de criação / edição ───────────────────────────────────

  // editEntityId: se passado, abre em modo edição (atualiza cena existente)
  _openCreateModal(prefillName = '', editEntityId = '') {
    if (document.getElementById('scene-create-modal')) return;

    const isEdit = !!editEntityId;
    const sceneId = editEntityId ? editEntityId.replace(/^scene\./, '') : '';

    // Coleta dispositivos controláveis das zonas
    const devices = this._getControllableDevices();

    const modal = document.createElement('div');
    modal.id = 'scene-create-modal';
    modal.className = 'scene-create-overlay';
    modal.innerHTML = `
      <div class="scene-create-dialog">
        <div class="scene-create-header">
          <span class="scene-create-title">${isEdit ? 'Editar cena' : 'Nova cena'}</span>
          <button class="scene-create-close" type="button" data-action="close" aria-label="Fechar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="scene-create-body">
          <label class="scene-create-label">Nome da cena</label>
          <input class="scene-create-input" id="scene-name-input" type="text"
            placeholder="Ex: Cinema, Boa noite, Chegou em casa…"
            value="${_esc(prefillName)}" autocomplete="off" />

          <label class="scene-create-label" style="margin-top:18px">
            Dispositivos
            <span class="scene-create-hint">Defina o que cada dispositivo deve fazer quando a cena for ativada.</span>
          </label>

          ${devices.length ? `
            <div class="scene-device-list" id="scene-device-list">
              ${devices.map(d => `
                <label class="scene-device-row">
                  <input type="checkbox" class="scene-device-check" value="${_esc(d.entity)}" checked />
                  <span class="scene-device-name">${_esc(d.name)}</span>
                  <span class="scene-device-zone">${_esc(d.zone)}</span>
                  <button type="button" class="scene-state-toggle" data-state="${d.on ? 'on' : 'off'}">${d.on ? 'Ligar' : 'Desligar'}</button>
                </label>
              `).join('')}
            </div>
          ` : `<div class="scene-create-hint" style="margin-top:8px">Nenhum dispositivo configurado nas zonas.</div>`}
        </div>

        <div class="scene-create-footer">
          <div class="scene-create-error hidden" id="scene-create-error"></div>
          <button class="scene-create-cancel" type="button" data-action="close">Cancelar</button>
          <button class="scene-create-save" type="button" id="scene-save-btn" data-edit-id="${_esc(sceneId)}" data-edit-entity="${_esc(editEntityId)}">${isEdit ? 'Salvar cena' : 'Criar cena'}</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.closest('[data-action="close"]')) this._closeCreateModal();
    });
    modal.addEventListener('keydown', (e) => { if (e.key === 'Escape') this._closeCreateModal(); });
    document.getElementById('scene-save-btn').addEventListener('click', () => this._saveScene());

    // Toggle Ligar / Desligar — stopPropagation para não marcar/desmarcar o checkbox da label
    modal.addEventListener('click', (e) => {
      const toggle = e.target.closest('.scene-state-toggle');
      if (!toggle) return;
      e.preventDefault();
      e.stopPropagation();
      const newState = toggle.getAttribute('data-state') === 'on' ? 'off' : 'on';
      toggle.setAttribute('data-state', newState);
      toggle.textContent = newState === 'on' ? 'Ligar' : 'Desligar';
    });

    setTimeout(() => {
      const inp = document.getElementById('scene-name-input');
      if (inp && !isEdit) inp.focus();
    }, 80);
  },

  _closeCreateModal() {
    const modal = document.getElementById('scene-create-modal');
    if (modal) modal.remove();
  },

  _getControllableDevices() {
    if (typeof ZoneRegistry === 'undefined') return [];
    const devices = [];
    for (const zone of ZoneRegistry.all()) {
      for (const device of (zone.devices || [])) {
        const domain = (device.entity || '').split('.')[0];
        if (['sensor', 'binary_sensor', 'camera'].includes(domain)) continue;
        const state = typeof StateStore !== 'undefined' ? StateStore.get(device.entity) : null;
        devices.push({
          entity: device.entity,
          name: device.name || device.entity,
          zone: zone.name || '',
          on: state ? (state.state === 'on' || state.state === 'home') : false,
        });
      }
    }
    return devices;
  },

  async _saveScene() {
    const nameInput = document.getElementById('scene-name-input');
    const errEl     = document.getElementById('scene-create-error');
    const saveBtn   = document.getElementById('scene-save-btn');

    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) {
      errEl.textContent = 'Informe um nome para a cena.';
      errEl.classList.remove('hidden');
      nameInput && nameInput.focus();
      return;
    }

    // Coleta dispositivos selecionados + estado desejado
    const checks = document.querySelectorAll('#scene-device-list .scene-device-check:checked');
    const desiredStates = Array.from(checks).map(chk => {
      const row = chk.closest('.scene-device-row');
      const toggle = row ? row.querySelector('.scene-state-toggle') : null;
      return { entity: chk.value, on: toggle ? toggle.getAttribute('data-state') === 'on' : true };
    });

    if (!desiredStates.length) {
      errEl.textContent = 'Selecione ao menos um dispositivo.';
      errEl.classList.remove('hidden');
      return;
    }

    if (typeof HAClient === 'undefined') {
      errEl.textContent = 'Sem conexão com o Home Assistant.';
      errEl.classList.remove('hidden');
      return;
    }

    errEl.classList.add('hidden');
    saveBtn.disabled = true;
    const isEdit = !!saveBtn.getAttribute('data-edit-id');
    const editId   = saveBtn.getAttribute('data-edit-id') || '';     // scene slug original
    const editEntity = saveBtn.getAttribute('data-edit-entity') || ''; // entity_id original (scene.xxx)
    saveBtn.textContent = 'Aplicando estados…';

    const newSceneId = _slugify(name);
    // Em modo edição: se o nome mudou cria com novo id e exclui o antigo; se igual usa mesmo id
    const sceneId = isEdit ? newSceneId : newSceneId;
    const renamed = isEdit && editId && editId !== newSceneId;
    const entities = desiredStates.map(d => d.entity);

    try {
      // 1. Aplica o estado desejado em cada dispositivo para o HA capturar no snapshot
      await Promise.all(desiredStates.map(d =>
        HAClient.callService('homeassistant', d.on ? 'turn_on' : 'turn_off', { entity_id: d.entity })
          .catch(() => {}) // ignora erros individuais (ex: sensor sem turn_on)
      ));

      // 2. Aguarda o HA processar as mudanças de estado
      saveBtn.textContent = 'Capturando snapshot…';
      await new Promise(r => setTimeout(r, 800));

      // 3. Captura o snapshot como cena
      await HAClient.callService('scene', 'create', {
        scene_id: sceneId,
        snapshot_entities: entities,
      });

      // 4. Se renomeou, exclui a cena antiga
      if (renamed && editEntity) {
        await HAClient.callService('scene', 'delete', { entity_id: editEntity }).catch(() => {});
      }

      this._closeCreateModal();
      const msg = isEdit ? `Cena "${name}" atualizada` : `Cena "${name}" criada`;
      if (typeof _showToast === 'function') _showToast(msg, 'success');

      // Força refresh dos estados (HAClient._allStates é estático após conexão)
      await HAClient.refreshAllStates();
      this.load();
    } catch (err) {
      console.warn('[scenes] erro ao salvar cena:', err);
      errEl.textContent = 'Erro ao salvar cena. Verifique a conexão com o HA.';
      errEl.classList.remove('hidden');
      saveBtn.disabled = false;
      saveBtn.textContent = isEdit ? 'Salvar cena' : 'Criar cena';
    }
  },
};
