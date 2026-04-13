// auth-store.js — sessão Supabase + UI de login/logout
// Depende de: SUPA (supabase-client.js), InstallationStore, _showToast (app.js)

const AuthStore = {
  _user: null,
  _listeners: [],

  async init() {
    const { data: { session } } = await SUPA.auth.getSession();
    this._user = session?.user || null;

    SUPA.auth.onAuthStateChange((_event, session) => {
      this._user = session?.user || null;
      this._renderSidebarAuth();
    });

    this._renderSidebarAuth();
  },

  getUser()    { return this._user; },
  isLoggedIn() { return !!this._user; },

  async login(email, password) {
    const { data, error } = await SUPA.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async logout() {
    const { error } = await SUPA.auth.signOut();
    if (error) throw error;
  },

  onChange(cb) {
    this._listeners.push(cb);
    return () => { this._listeners = this._listeners.filter(l => l !== cb); };
  },

  _renderSidebarAuth() {
    const el = document.getElementById('sidebar-auth');
    if (!el) return;

    if (this._user) {
      const email = this._user.email || '';
      const initials = email.slice(0, 2).toUpperCase();
      el.innerHTML = `
        <button class="sidebar-auth-btn sidebar-auth-btn--user" type="button" id="sidebar-auth-trigger"
          title="${_authEsc(email)}">
          <span class="sidebar-auth-avatar">${_authEsc(initials)}</span>
          <span class="sidebar-auth-email">${_authEsc(email)}</span>
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

      // Puxa instalações do cloud — se vier algo novo, recarrega
      const count = await InstallationStore.pullFromCloud();
      if (count > 0) {
        window.location.reload();
      } else {
        // Empurra o que está local pro cloud
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
    if (confirm(`Sair da conta ${email}?`)) {
      this.logout()
        .then(() => {
          if (typeof _showToast === 'function') _showToast('Sessão encerrada');
          this._renderSidebarAuth();
        })
        .catch(err => console.warn('[dmsmart] logout error:', err.message));
    }
  }
};

// Utilitário local de escape HTML (não depende do app.js)
function _authEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
