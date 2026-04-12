// wizard.js
// Wizard de criação de instalação: boas-vindas → formulário → teste de conexão → salvar.
// O passo de "descoberta de entidades + criação de zonas" vai ser implementado no plan 03-03.
// Por enquanto, o sucesso no teste cria a instalação SEM zonas e ativa — o dashboard mostra
// placeholder pedindo pra configurar zonas depois.

const Wizard = {
  container: null,
  step: 'welcome',
  draft: { name: '', haUrl: '', token: '' },
  lastStates: null,
  lastError: null,

  init(container) {
    this.container = container;
    this.container.addEventListener('click', (ev) => this._handleClick(ev));
    this.container.addEventListener('submit', (ev) => this._handleSubmit(ev));
  },

  open({ skipWelcome = false } = {}) {
    this.draft = { name: '', haUrl: 'http://localhost:8123', token: '' };
    this.lastStates = null;
    this.lastError = null;
    this.step = skipWelcome ? 'form' : 'welcome';
    this.render();
    this.container.classList.remove('hidden');
    document.body.classList.add('wizard-open');
  },

  close() {
    this.container.classList.add('hidden');
    document.body.classList.remove('wizard-open');
  },

  goto(step) {
    this.step = step;
    this.render();
  },

  render() {
    let html = '';
    switch (this.step) {
      case 'welcome':      html = this._renderWelcome();  break;
      case 'form':         html = this._renderForm();     break;
      case 'testing':      html = this._renderTesting();  break;
      case 'success':      html = this._renderSuccess();  break;
      case 'error':        html = this._renderError();    break;
    }
    this.container.innerHTML = html;
  },

  _renderWelcome() {
    return `
      <div class="wiz-card">
        <div class="wiz-logo">
          <span class="logo-dm">DM</span><span class="logo-smart">SMART</span><span class="logo-dot"></span>
        </div>
        <h1 class="wiz-title">Bem-vindo</h1>
        <p class="wiz-subtitle">
          Controle sua casa ou escritório pelo Home Assistant.<br>
          Pra começar, adicione sua primeira instalação.
        </p>
        <button class="wiz-btn wiz-btn-primary" data-action="start">
          + Adicionar instalação
        </button>
      </div>
    `;
  },

  _renderForm() {
    const { name, haUrl, token } = this.draft;
    return `
      <div class="wiz-card">
        <h1 class="wiz-title">Nova instalação</h1>
        <p class="wiz-subtitle">Conecte ao seu Home Assistant.</p>

        <form class="wiz-form" novalidate>
          <label class="wiz-field">
            <span class="wiz-label">Nome da instalação</span>
            <input type="text" name="name" value="${this._esc(name)}"
                   placeholder="Ex: Casa, Escritório"
                   class="wiz-input" required maxlength="60">
          </label>

          <label class="wiz-field">
            <span class="wiz-label">URL do Home Assistant</span>
            <input type="url" name="haUrl" value="${this._esc(haUrl)}"
                   placeholder="http://192.168.1.10:8123"
                   class="wiz-input" required>
            <span class="wiz-hint">Precisa começar com http:// ou https://</span>
          </label>

          <label class="wiz-field">
            <span class="wiz-label">Token de acesso de longa duração</span>
            <textarea name="token" class="wiz-input wiz-textarea" rows="4"
                      placeholder="Cole o token aqui" required>${this._esc(token)}</textarea>
            <span class="wiz-hint">
              Crie um no HA em <strong>Perfil → Tokens de acesso de longa duração</strong>.
              O token fica salvo só neste dispositivo.
            </span>
          </label>

          <div class="wiz-actions">
            <button type="button" class="wiz-btn wiz-btn-ghost" data-action="back-welcome">Voltar</button>
            <button type="submit" class="wiz-btn wiz-btn-primary">Testar conexão</button>
          </div>
        </form>
      </div>
    `;
  },

  _renderTesting() {
    return `
      <div class="wiz-card">
        <div class="wiz-spinner"></div>
        <h1 class="wiz-title">Testando conexão...</h1>
        <p class="wiz-subtitle">${this._esc(this.draft.haUrl)}</p>
      </div>
    `;
  },

  _renderSuccess() {
    const count = Array.isArray(this.lastStates) ? this.lastStates.length : 0;
    return `
      <div class="wiz-card">
        <div class="wiz-check">✓</div>
        <h1 class="wiz-title">Conectado!</h1>
        <p class="wiz-subtitle">
          Encontramos <strong>${count}</strong> entidades no <strong>${this._esc(this.draft.name)}</strong>.
        </p>
        <p class="wiz-note">
          A criação de zonas chega no próximo passo (plan 03-03).
          Por enquanto, salvar já cria a instalação vazia.
        </p>
        <div class="wiz-actions wiz-actions-stack">
          <button class="wiz-btn wiz-btn-primary" data-action="finalize">Salvar instalação</button>
          <button class="wiz-btn wiz-btn-ghost" data-action="back-form">Voltar</button>
        </div>
      </div>
    `;
  },

  _renderError() {
    const err = this.lastError || 'Erro desconhecido';
    const hint = this._errorHint(err);
    return `
      <div class="wiz-card">
        <div class="wiz-error-icon">!</div>
        <h1 class="wiz-title">Falha na conexão</h1>
        <p class="wiz-subtitle wiz-subtitle-error">${this._esc(err)}</p>
        <p class="wiz-note">${hint}</p>
        <div class="wiz-actions wiz-actions-stack">
          <button class="wiz-btn wiz-btn-primary" data-action="back-form">Voltar e corrigir</button>
        </div>
      </div>
    `;
  },

  _errorHint(err) {
    const s = String(err).toLowerCase();
    if (s.includes('auth_invalid')) return 'Token inválido. Crie um novo no HA e tente de novo.';
    if (s.includes('timeout'))      return 'O HA não respondeu. Confira se está ligado e acessível no URL informado.';
    if (s.includes('ws error') || s.includes('network'))
                                     return 'Não consegui alcançar o servidor. Confira a URL, a porta e se o HA está rodando.';
    return 'Confira os dados e tente novamente.';
  },

  _handleClick(ev) {
    const btn = ev.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    if (action === 'start')         this.goto('form');
    if (action === 'back-welcome')  this.goto('welcome');
    if (action === 'back-form')     this.goto('form');
    if (action === 'finalize')      this._finalize();
  },

  _handleSubmit(ev) {
    ev.preventDefault();
    const form = ev.target;
    const fd = new FormData(form);
    this.draft = {
      name: (fd.get('name') || '').toString().trim(),
      haUrl: (fd.get('haUrl') || '').toString().trim(),
      token: (fd.get('token') || '').toString().trim()
    };

    const err = this._validateDraft(this.draft);
    if (err) {
      this.lastError = err;
      this.goto('error');
      return;
    }

    this.goto('testing');
    this._runTest();
  },

  _validateDraft({ name, haUrl, token }) {
    if (!name) return 'Dê um nome pra instalação.';
    if (!haUrl) return 'Informe a URL do Home Assistant.';
    if (!/^https?:\/\//i.test(haUrl)) return 'A URL precisa começar com http:// ou https://';
    if (!token) return 'Cole o token de longa duração.';
    if (token.length < 20) return 'Token parece inválido (muito curto).';
    return null;
  },

  async _runTest() {
    try {
      const states = await this._testConnection(this.draft.haUrl, this.draft.token);
      this.lastStates = states;
      this.lastError = null;
      this.goto('success');
    } catch (err) {
      this.lastError = err && err.message ? err.message : String(err);
      this.lastStates = null;
      this.goto('error');
    }
  },

  // Testa conexão standalone (sem tocar no HAClient principal).
  // Retorna array de states em caso de sucesso; rejeita com mensagem em caso de falha.
  _testConnection(url, token) {
    return new Promise((resolve, reject) => {
      let ws;
      const wsUrl = url.replace(/^http/i, 'ws').replace(/\/$/, '') + '/api/websocket';
      const timeout = setTimeout(() => {
        try { ws && ws.close(); } catch {}
        reject(new Error('timeout'));
      }, 10000);

      try {
        ws = new WebSocket(wsUrl);
      } catch (err) {
        clearTimeout(timeout);
        return reject(new Error('ws error: ' + err.message));
      }

      let msgId = 1;
      let gotStates = null;

      ws.addEventListener('message', (ev) => {
        let msg;
        try { msg = JSON.parse(ev.data); } catch { return; }

        if (msg.type === 'auth_required') {
          ws.send(JSON.stringify({ type: 'auth', access_token: token }));
          return;
        }
        if (msg.type === 'auth_invalid') {
          clearTimeout(timeout);
          try { ws.close(); } catch {}
          reject(new Error('auth_invalid'));
          return;
        }
        if (msg.type === 'auth_ok') {
          ws.send(JSON.stringify({ id: msgId, type: 'get_states' }));
          return;
        }
        if (msg.type === 'result' && msg.id === msgId) {
          clearTimeout(timeout);
          if (msg.success) {
            gotStates = msg.result || [];
            try { ws.close(); } catch {}
            resolve(gotStates);
          } else {
            try { ws.close(); } catch {}
            reject(new Error(msg.error?.message || 'result error'));
          }
          return;
        }
      });

      ws.addEventListener('error', () => {
        clearTimeout(timeout);
        if (!gotStates) reject(new Error('ws error'));
      });

      ws.addEventListener('close', () => {
        clearTimeout(timeout);
        if (!gotStates) reject(new Error('ws closed'));
      });
    });
  },

  _finalize() {
    const inst = InstallationStore.create({
      name: this.draft.name,
      haUrl: this.draft.haUrl,
      zones: []
    });
    InstallationStore.setToken(inst.id, this.draft.token);
    ActiveInstallation.setId(inst.id);
    this.close();
    window.location.reload();
  },

  _esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
};
