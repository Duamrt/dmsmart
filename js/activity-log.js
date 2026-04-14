// activity-log.js — Log de atividade por instalação
// Registra ações do usuário (zonas, cenas, instalação) localmente + Supabase.
// Sem dependências rígidas — falha silenciosamente se offline/sem auth.
'use strict';

const ActivityLog = (() => {
  const LOCAL_KEY = 'dmsmart_actlog_';
  const MAX_LOCAL = 100;

  // ── Helpers internos ──────────────────────────────────────────────────────

  function _installId() {
    if (typeof ActiveInstallation !== 'undefined') {
      const a = ActiveInstallation.get();
      return a ? a.id : null;
    }
    return null;
  }

  function _userId() {
    if (typeof AuthStore !== 'undefined' && AuthStore.isLoggedIn()) {
      return AuthStore.getUser()?.id || null;
    }
    return null;
  }

  function _saveLocal(installId, entry) {
    try {
      const key = LOCAL_KEY + installId;
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      arr.unshift(entry);
      if (arr.length > MAX_LOCAL) arr.length = MAX_LOCAL;
      localStorage.setItem(key, JSON.stringify(arr));
    } catch {}
  }

  async function _pushCloud(entry) {
    if (typeof SUPA === 'undefined') return;
    const uid = _userId();
    if (!uid) return;
    try {
      await SUPA.from('installation_activity').insert({
        id:              entry.id,
        installation_id: entry.installation_id,
        user_id:         uid,
        action:          entry.action,
        label:           entry.label,
        meta:            entry.meta || {},
        created_at:      entry.created_at
      });
    } catch {}
  }

  function _relTime(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1)  return 'agora mesmo';
    if (min < 60) return `${min}min atrás`;
    const h = Math.floor(min / 60);
    if (h < 24)   return `${h}h atrás`;
    const d = Math.floor(h / 24);
    if (d < 7)    return `há ${d} dia${d > 1 ? 's' : ''}`;
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }

  const _ICONS = {
    installation_created: {
      color: '#22c55e',
      svg: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2,8 6,12 14,4"/></svg>`
    },
    zone_created: {
      color: '#60a5fa',
      svg: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="12" height="12" rx="2"/><path d="M2 8h12M8 2v12"/></svg>`
    },
    zone_edited: {
      color: '#a78bfa',
      svg: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2.5L13.5 5 6 12.5H3.5V10L11 2.5z"/></svg>`
    },
    zone_deleted: {
      color: '#f87171',
      svg: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4h12M5 4V3h6v1M6 7v5M10 7v5M3 4l1 9h8l1-9"/></svg>`
    },
    scene_activated: {
      color: '#fbbf24',
      svg: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3,2 13,8 3,14"/></svg>`
    },
  };

  function _cfg(action) {
    return _ICONS[action] || { color: '#6b7280', svg: '&middot;' };
  }

  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _uid() {
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  // ── Renderização ──────────────────────────────────────────────────────────

  function _renderItem(e) {
    const c = _cfg(e.action);
    return `
      <div class="act-item">
        <div class="act-dot" style="--act-color:${c.color}">${c.svg}</div>
        <div class="act-body">
          <div class="act-label">${_esc(e.label)}</div>
          <div class="act-time">${_relTime(e.created_at)}</div>
        </div>
      </div>`;
  }

  async function _loadEntries() {
    const id = _installId();
    if (!id) return [];
    if (typeof SUPA !== 'undefined' && _userId()) {
      try {
        const { data } = await SUPA
          .from('installation_activity')
          .select('id,action,label,created_at,meta')
          .eq('installation_id', id)
          .order('created_at', { ascending: false })
          .limit(50);
        if (data && data.length) return data;
      } catch {}
    }
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY + id) || '[]'); } catch { return []; }
  }

  async function _loadAndPaint(inner) {
    inner.innerHTML = '<div class="act-loading"><span class="act-spinner"></span>Carregando...</div>';
    const entries = await _loadEntries();
    if (!entries.length) {
      inner.innerHTML = `
        <div class="act-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
          <div>Nenhuma atividade ainda</div>
          <span>Crie zonas, ative cenas — o histórico aparece aqui.</span>
        </div>`;
      return;
    }
    inner.innerHTML = `<div class="act-feed">${entries.map(_renderItem).join('')}</div>`;
  }

  // ── API pública ───────────────────────────────────────────────────────────

  /**
   * Registra uma ação. Fire-and-forget — não bloqueia a UI.
   * @param {string} action  ex: 'zone_created'
   * @param {string} label   ex: 'Zona "Sala" criada'
   * @param {object} [meta]  dados extras opcionais
   */
  async function log(action, label, meta = {}) {
    const id = _installId();
    if (!id) return;
    const entry = {
      id:              _uid(),
      installation_id: id,
      action,
      label,
      meta,
      created_at:      new Date().toISOString()
    };
    _saveLocal(id, entry);
    _pushCloud(entry); // fire-and-forget
  }

  /**
   * Renderiza o painel de atividade no elemento dado.
   * Chamado por switchView('atividade') no app.js.
   */
  async function render(el) {
    if (!el) return;
    el.innerHTML = `
      <div class="act-wrap">
        <div class="act-page-header">
          <div>
            <h2 class="act-page-title">Atividade recente</h2>
            <p class="act-page-sub">Histórico de ações desta instalação</p>
          </div>
          <button class="act-refresh-btn" id="act-refresh-btn" type="button">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 2.5A6.5 6.5 0 1 1 7 1"/><polyline points="10.5,1 13.5,1 13.5,4"/></svg>
            Atualizar
          </button>
        </div>
        <div id="act-feed-inner"></div>
      </div>`;
    el.querySelector('#act-refresh-btn')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      await _loadAndPaint(el.querySelector('#act-feed-inner'));
      btn.disabled = false;
    });
    await _loadAndPaint(el.querySelector('#act-feed-inner'));
  }

  return { log, render };
})();
