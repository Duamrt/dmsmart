// integrator-panel.js — Painel do Integrador
// Mostra todas as instalações gerenciadas (integrator_id = user.id)
// Depende de: SUPA, AuthStore, ActiveInstallation, InstallationStore, _showToast

const IntegratorPanel = {
  _el: null,

  init(el) {
    this._el = el;
  },

  async load() {
    if (!this._el) return;
    this._el.innerHTML = '<div class="intp-loading">Carregando clientes…</div>';

    const user = AuthStore.getUser();
    if (!user) {
      this._el.innerHTML = '<div class="intp-empty">Faça login para ver seus clientes.</div>';
      return;
    }

    // Busca instalações onde o usuário é integrador
    const { data, error } = await SUPA.from('installations')
      .select('*')
      .eq('integrator_id', user.id)
      .order('name');

    if (error) {
      console.warn('[dmsmart] IntegratorPanel.load:', error.message);
      this._el.innerHTML = '<div class="intp-empty">Erro ao carregar clientes.</div>';
      return;
    }

    // Também inclui instalações próprias (user_id = user.id) sem integrator
    const { data: ownData } = await SUPA.from('installations')
      .select('*')
      .eq('user_id', user.id)
      .order('name');

    // Mescla sem duplicar
    const allMap = new Map();
    (ownData  || []).forEach(r => allMap.set(r.id, { ...r, _source: 'own' }));
    (data     || []).forEach(r => allMap.set(r.id, { ...r, _source: 'client' }));
    const all = [...allMap.values()];

    if (all.length === 0) {
      this._el.innerHTML = `
        <div class="intp-empty">
          <svg viewBox="0 0 24 24"><path d="M3 12 12 4l9 8"/><path d="M5 10v10h14V10"/></svg>
          <p>Nenhum cliente encontrado.</p>
          <p class="intp-empty-hint">Crie instalações e vincule-as ao seu perfil de integrador.</p>
        </div>`;
      return;
    }

    const activeId = ActiveInstallation.getId();

    this._el.innerHTML = `
      <div class="intp-header">
        <span class="intp-count">${all.length} instalação${all.length !== 1 ? 'ões' : ''}</span>
      </div>
      <div class="intp-grid">
        ${all.map(inst => this._renderCard(inst, activeId)).join('')}
        <button class="intp-card intp-card-new" type="button" data-action="new-installation">
          <span class="intp-card-new-plus">+</span>
          <span>Novo cliente</span>
        </button>
      </div>`;

    // Eventos dos botões
    this._el.querySelectorAll('[data-manage]').forEach(btn => {
      btn.addEventListener('click', () => this._manage(btn.getAttribute('data-manage')));
    });
    this._el.querySelectorAll('[data-revoke]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._revoke(btn.getAttribute('data-revoke'), btn.getAttribute('data-revoke-name'));
      });
    });
  },

  _renderCard(inst, activeId) {
    const isActive   = inst.id === activeId;
    const isClient   = inst._source === 'client';
    const isLinked   = !!inst.integrator_id; // instalação do cliente vinculada ao integrador
    const zoneCount  = Array.isArray(inst.zones) ? inst.zones.length : 0;
    const haHost     = inst.ha_url
      ? (new URL(inst.ha_url.startsWith('http') ? inst.ha_url : 'http://' + inst.ha_url)).hostname
      : '—';

    const revokeBtn = isLinked
      ? `<button class="intp-revoke-btn" type="button"
           data-revoke="${_authEsc(inst.id)}"
           data-revoke-name="${_authEsc(inst.name)}"
           title="Desvincular acesso do integrador">
           Desvincular
         </button>`
      : '';

    return `
      <div class="intp-card${isActive ? ' intp-card--active' : ''}">
        <div class="intp-card-head">
          <div class="intp-card-icon">
            <svg viewBox="0 0 24 24"><path d="M3 12 12 4l9 8"/><path d="M5 10v10h14V10"/></svg>
          </div>
          ${isClient ? '<span class="intp-badge">Cliente</span>' : ''}
          ${isActive  ? '<span class="intp-badge intp-badge--active">Ativo</span>' : ''}
        </div>
        <div class="intp-card-body">
          <div class="intp-card-name">${_authEsc(inst.name)}</div>
          <div class="intp-card-url">${_authEsc(haHost)}</div>
          <div class="intp-card-meta">${zoneCount} ambiente${zoneCount !== 1 ? 's' : ''}</div>
        </div>
        <div class="intp-card-actions">
          <button class="intp-manage-btn" type="button" data-manage="${_authEsc(inst.id)}">
            ${isActive ? 'Gerenciando' : 'Gerenciar'}
          </button>
          ${revokeBtn}
        </div>
      </div>`;
  },

  async _manage(installId) {
    // Garante que a instalação está no localStorage
    let local = InstallationStore.get(installId);
    if (!local) {
      // Busca do cloud e insere no store local
      const { data } = await SUPA.from('installations').select('*').eq('id', installId).single();
      if (data) {
        const inst = {
          id:        data.id,
          name:      data.name,
          haUrl:     data.ha_url || '',
          zones:     Array.isArray(data.zones) ? data.zones : [],
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
        localStorage.setItem(InstallationStore.KEY_INSTALL(data.id), JSON.stringify(inst));
        const idx = InstallationStore._readIndex();
        if (!idx.includes(data.id)) { idx.push(data.id); InstallationStore._writeIndex(idx); }
        local = inst;
      }
    }
    if (!local) {
      if (typeof _showToast === 'function') _showToast('Instalação não encontrada', 'error');
      return;
    }

    ActiveInstallation.setId(installId);
    window.location.reload();
  },

  async _revoke(installId, installName) {
    const label = installName || 'esta instalação';
    if (!confirm(`Desvincular acesso de integrador de "${label}"?\n\nO cliente não poderá mais ser gerenciado por esta conta.`)) return;

    const { error } = await SUPA.rpc('revoke_integrator', { p_installation_id: installId });
    if (error) {
      console.warn('[dmsmart] revoke_integrator:', error.message);
      if (typeof _showToast === 'function') _showToast('Erro ao desvincular', 'error');
      return;
    }

    if (typeof _showToast === 'function') _showToast(`"${label}" desvinculado`, 'success');
    await this.load();
  }
};
