// auth-store.js — sessão Supabase + UI de login/logout + perfis de acesso
// Depende de: SUPA (supabase-client.js), InstallationStore, _showToast (app.js)

const AuthStore = {
  _user:    null,
  _profile: null,   // { id, role, display_name }

  async init() {
    const { data: { session } } = await SUPA.auth.getSession();
    this._user = session?.user || null;
    if (this._user) await this._loadProfile();

    SUPA.auth.onAuthStateChange(async (_event, session) => {
      this._user = session?.user || null;
      if (this._user) await this._loadProfile();
      else this._profile = null;
      this._renderSidebarAuth();
      if (typeof _onRoleChange === 'function') _onRoleChange();
    });

    this._renderSidebarAuth();
  },

  getUser()       { return this._user; },
  isLoggedIn()    { return !!this._user; },
  getProfile()    { return this._profile; },
  getRole()       { return this._profile?.role || 'admin'; },
  isIntegrador()  { return this.getRole() === 'integrador'; },

  async _loadProfile() {
    if (!this._user) return;
    const { data } = await SUPA.from('user_profiles').select('*').eq('id', this._user.id).single();
    if (data) {
      this._profile = data;
    } else {
      // Cria perfil se não existir (usuário criado antes da migração)
      const { data: inserted } = await SUPA.from('user_profiles')
        .upsert({ id: this._user.id, role: 'admin' }, { onConflict: 'id' })
        .select().single();
      this._profile = inserted || { id: this._user.id, role: 'admin' };
    }
  },

  async updateRole(role) {
    if (!this._user) return;
    const { error } = await SUPA.from('user_profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', this._user.id);
    if (!error) this._profile = { ...this._profile, role };
    return !error;
  },

  async login(email, password) {
    const { data, error } = await SUPA.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async logout() {
    const { error } = await SUPA.auth.signOut();
    if (error) throw error;
    this._profile = null;
  },

  _renderSidebarAuth() {
    const el = document.getElementById('sidebar-auth');
    if (!el) return;

    if (this._user) {
      const email    = this._user.email || '';
      const initials = email.slice(0, 2).toUpperCase();
      const roleLabel = this._profile?.role === 'integrador'
        ? '<span class="sidebar-auth-role">Integrador</span>'
        : '';
      el.innerHTML = `
        <button class="sidebar-auth-btn sidebar-auth-btn--user" type="button" id="sidebar-auth-trigger"
          title="${_authEsc(email)}">
          <span class="sidebar-auth-avatar">${_authEsc(initials)}</span>
          <span class="sidebar-auth-email">${_authEsc(email)}${roleLabel}</span>
          <svg class="sidebar-auth-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round"><path d="M18 15l-6-6-6 6"/></svg>
        </button>
      `;
      document.getElementById('sidebar-auth-trigger')
        .addEventListener('click', () => this._openProfileMenu());
    } else {
      el.innerHTML = `
        <button class="sidebar-auth-btn sidebar-auth-btn--guest" type="button" id="sidebar-login-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 3h6v18h-6M10 17l5-5-5-5M15 12H3"/>
          </svg>
          <span>Entrar / Sincronizar</span>
        </button>
      `;
      document.getElementById('sidebar-login-btn')
        .addEventListener('click', () => this.openLoginModal());
    }
  },

  openLoginModal() {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    const emailInput = document.getElementById('auth-email');
    if (emailInput) { emailInput.value = ''; emailInput.focus(); }
    const passInput = document.getElementById('auth-pass');
    if (passInput) passInput.value = '';
    const errEl = document.getElementById('auth-error');
    if (errEl) errEl.textContent = '';
    this._bindLoginModal();
  },

  closeLoginModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('hidden');
  },

  _bindLoginModal() {
    const modal = document.getElementById('auth-modal');
    if (!modal || modal._authBound) return;
    modal._authBound = true;

    modal.addEventListener('click', (e) => {
      if (e.target === modal) { this.closeLoginModal(); return; }
      const btn = e.target.closest('[data-auth]');
      if (!btn) return;
      const action = btn.getAttribute('data-auth');
      if (action === 'close')   this.closeLoginModal();
      if (action === 'submit')  this._submitLogin();
    });

    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeLoginModal();
      if (e.key === 'Enter')  this._submitLogin();
    });
  },

  async _submitLogin() {
    const emailEl = document.getElementById('auth-email');
    const passEl  = document.getElementById('auth-pass');
    const errEl   = document.getElementById('auth-error');
    const btnEl   = document.getElementById('auth-submit');
    if (!emailEl || !passEl) return;

    const email = emailEl.value.trim();
    const pass  = passEl.value;

    if (!email || !pass) {
      if (errEl) errEl.textContent = 'Preencha e-mail e senha.';
      return;
    }

    if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Entrando…'; }
    if (errEl) errEl.textContent = '';

    try {
      await this.login(email, pass);
      this.closeLoginModal();

      const count = await InstallationStore.pullFromCloud();
      if (count > 0) {
        window.location.reload();
      } else {
        await InstallationStore.pushAllToCloud();
        if (typeof _showToast === 'function') _showToast('Conta conectada', 'success');
      }
    } catch (err) {
      if (errEl) errEl.textContent = err.message || 'Falha no login.';
      if (btnEl) { btnEl.disabled = false; btnEl.textContent = 'Entrar'; }
    }
  },

  _openProfileMenu() {
    const email = this._user?.email || '';
    const role  = this._profile?.role || 'admin';
    const labels = { admin: 'Admin', viewer: 'Visualizador', integrador: 'Integrador' };
    if (confirm(`Conta: ${email}\nPerfil: ${labels[role] || role}\n\nSair?`)) {
      this.logout()
        .then(() => {
          if (typeof _showToast === 'function') _showToast('Sessão encerrada');
          this._renderSidebarAuth();
          if (typeof _onRoleChange === 'function') _onRoleChange();
        })
        .catch(err => console.warn('[dmsmart] logout error:', err.message));
    }
  }
};

// Utilitário local de escape HTML
function _authEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
