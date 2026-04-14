// wizard.js — Wizard de onboarding dmsmart
// Fluxos:
//   instalador → form → testing → discover/zones → finalize
//   cliente    → client-form → testing → client-success → client-notif → client-tour → finalize
// Progresso salvo em localStorage (dmsmart_onboarding) — retomável entre sessões.

const USEFUL_DOMAINS = {
  light: { label: 'Luzes', type: 'light' },
  switch: { label: 'Tomadas', type: 'switch' },
  climate: { label: 'Clima / Ar', type: 'climate' },
  cover: { label: 'Cortinas / Portões', type: 'cover' },
  media_player: { label: 'TVs e mídia', type: 'media_player' },
  fan: { label: 'Ventiladores', type: 'fan' },
  alarm_control_panel: { label: 'Alarme', type: 'alarm_control_panel' }
};

const ZONE_ICONS = ['sofa', 'bed', 'kitchen', 'shower', 'car', 'tree', 'hanger', 'washing', 'monitor'];

const ONBOARDING_KEY = 'dmsmart_onboarding';

const Wizard = {
  container: null,
  step: 'role-select',
  _resumeToStep: null,
  draft: {
    role: '',
    name: '',
    haUrl: 'http://localhost:8123',
    token: '',
    zones: [],
    editingZone: null,
    _tourSlide: 0
  },
  lastStates: null,
  lastError: null,

  init(container) {
    if (this._bound) return;
    this.container = container;
    this.container.addEventListener('click', (ev) => this._handleClick(ev));
    this.container.addEventListener('submit', (ev) => this._handleSubmit(ev));
    this.container.addEventListener('change', (ev) => this._handleChange(ev));
    this._bound = true;
  },

  open({ skipWelcome = false } = {}) {
    const saved = this._loadProgress();
    if (saved && saved.step && !['role-select', 'resume', 'testing', 'welcome'].includes(saved.step)) {
      this._resumeToStep = saved.step;
      Object.assign(this.draft, saved.draft || {});
      this.step = 'resume';
      this._show();
      return;
    }
    this._doOpen(skipWelcome);
  },

  _doOpen(skipWelcome = false) {
    this.draft = {
      role: '',
      name: '',
      haUrl: 'http://localhost:8123',
      token: '',
      zones: [],
      editingZone: null,
      _tourSlide: 0
    };
    this.lastStates = null;
    this.lastError = null;
    this._resumeToStep = null;
    this.step = skipWelcome ? 'form' : 'role-select';
    this._show();
  },

  _show() {
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
    if (!['role-select', 'resume', 'testing', 'welcome'].includes(step)) {
      this.saveProgress();
    }
  },

  // =========================================================================
  // Progresso
  // =========================================================================

  saveProgress() {
    try {
      localStorage.setItem(ONBOARDING_KEY, JSON.stringify({
        step: this.step,
        draft: {
          role: this.draft.role,
          name: this.draft.name,
          haUrl: this.draft.haUrl,
          token: this.draft.token,
          zones: this.draft.zones,
          _tourSlide: this.draft._tourSlide || 0
        }
      }));
    } catch {}
  },

  _loadProgress() {
    try {
      const raw = localStorage.getItem(ONBOARDING_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  clearProgress() {
    localStorage.removeItem(ONBOARDING_KEY);
  },

  // =========================================================================
  // Render
  // =========================================================================

  render() {
    let html = '';
    switch (this.step) {
      case 'resume':          html = this._renderResume();              break;
      case 'role-select':     html = this._renderRoleSelect();          break;
      case 'welcome':         html = this._renderWelcome();             break;
      case 'form':            html = this._renderForm();                break;
      case 'client-form':     html = this._renderClientForm();          break;
      case 'testing':         html = this._renderTesting();             break;
      case 'success':         html = this._renderSuccess();             break;
      case 'client-success':  html = this._renderClientSuccess();       break;
      case 'error':           html = this._renderError();               break;
      case 'discover':        html = this._renderDiscover();            break;
      case 'zone-edit':       html = this._renderZoneEdit();            break;
      case 'client-notif':    html = this._renderClientNotifications(); break;
      case 'client-tour':     html = this._renderClientTour();          break;
    }
    this.container.innerHTML = html;
  },

  _renderResume() {
    return `
      <div class="wiz-card">
        <div class="wiz-logo">
          <span class="logo-dm">DM</span><span class="logo-smart">SMART</span><span class="logo-dot"></span>
        </div>
        <h1 class="wiz-title">Continuar de onde parou?</h1>
        <p class="wiz-subtitle">Você tem uma configuração em andamento.</p>
        <div class="wiz-actions wiz-actions-stack">
          <button class="wiz-btn wiz-btn-primary" data-action="resume-yes">Continuar</button>
          <button class="wiz-btn wiz-btn-ghost" data-action="resume-no">Começar do zero</button>
        </div>
      </div>
    `;
  },

  _renderRoleSelect() {
    return `
      <div class="wiz-card">
        <div class="wiz-logo">
          <span class="logo-dm">DM</span><span class="logo-smart">SMART</span><span class="logo-dot"></span>
        </div>
        <h1 class="wiz-title">Bem-vindo</h1>
        <p class="wiz-subtitle">Como você vai usar o dmsmart?</p>
        <div class="wiz-roles">
          <button class="wiz-role-card" data-action="select-role" data-role="installer">
            <div class="wiz-role-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
            </div>
            <div class="wiz-role-title">Instalador técnico</div>
            <div class="wiz-role-desc">Configurar o sistema, conectar ao Home Assistant e criar as zonas</div>
          </button>
          <button class="wiz-role-card" data-action="select-role" data-role="client">
            <div class="wiz-role-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div class="wiz-role-title">Cliente / morador</div>
            <div class="wiz-role-desc">O sistema já foi instalado, quero acessar e usar o painel</div>
          </button>
        </div>
      </div>
    `;
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
            <button type="button" class="wiz-btn wiz-btn-ghost" data-action="back-role">Voltar</button>
            <button type="submit" class="wiz-btn wiz-btn-primary">Testar conexão</button>
          </div>
        </form>
      </div>
    `;
  },

  _renderClientForm() {
    const { name, haUrl, token } = this.draft;
    return `
      <div class="wiz-card">
        <h1 class="wiz-title">Conectar ao sistema</h1>
        <p class="wiz-subtitle">Peça os dados de acesso ao seu instalador.</p>

        <form class="wiz-form" data-form="client-connect" novalidate>
          <label class="wiz-field">
            <span class="wiz-label">Nome (opcional)</span>
            <input type="text" name="name" value="${this._esc(name)}"
                   placeholder="Ex: Minha casa, Escritório"
                   class="wiz-input" maxlength="60">
          </label>

          <label class="wiz-field">
            <span class="wiz-label">Endereço do sistema</span>
            <input type="url" name="haUrl" value="${this._esc(haUrl)}"
                   placeholder="http://192.168.1.10:8123"
                   class="wiz-input" required>
            <span class="wiz-hint">Fornecido pelo instalador</span>
          </label>

          <label class="wiz-field">
            <span class="wiz-label">Código de acesso (token)</span>
            <textarea name="token" class="wiz-input wiz-textarea" rows="3"
                      placeholder="Cole aqui o código fornecido pelo instalador" required>${this._esc(token)}</textarea>
          </label>

          <div class="wiz-actions">
            <button type="button" class="wiz-btn wiz-btn-ghost" data-action="back-role">Voltar</button>
            <button type="submit" class="wiz-btn wiz-btn-primary">Conectar</button>
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
    const total = Array.isArray(this.lastStates) ? this.lastStates.length : 0;
    const useful = this._usefulEntities().length;
    return `
      <div class="wiz-card">
        <div class="wiz-check">✓</div>
        <h1 class="wiz-title">Conectado!</h1>
        <p class="wiz-subtitle">
          Encontramos <strong>${useful}</strong> dispositivos controláveis no
          <strong>${this._esc(this.draft.name)}</strong><br>
          (${total} entidades no total).
        </p>
        <p class="wiz-note">
          Agora bora organizar por zonas — tipo "Sala", "Suíte" — pra deixar
          o dashboard arrumado.
        </p>
        <div class="wiz-actions wiz-actions-stack">
          <button class="wiz-btn wiz-btn-primary" data-action="go-discover">Organizar zonas</button>
          <button class="wiz-btn wiz-btn-ghost" data-action="back-form">Voltar</button>
        </div>
      </div>
    `;
  },

  _renderClientSuccess() {
    const total = Array.isArray(this.lastStates) ? this.lastStates.length : 0;
    return `
      <div class="wiz-card">
        <div class="wiz-check">✓</div>
        <h1 class="wiz-title">Conectado!</h1>
        <p class="wiz-subtitle">
          Sistema acessível — ${total} entidades encontradas.<br>
          Tudo certo para começar.
        </p>
        <div class="wiz-actions wiz-actions-stack">
          <button class="wiz-btn wiz-btn-primary" data-action="go-client-notif">Continuar</button>
        </div>
      </div>
    `;
  },

  _renderError() {
    const err = this.lastError || 'Erro desconhecido';
    const hint = this._errorHint(err);
    const backAction = this.draft.role === 'client' ? 'back-client-form' : 'back-form';
    return `
      <div class="wiz-card">
        <div class="wiz-error-icon">!</div>
        <h1 class="wiz-title">Falha na conexão</h1>
        <p class="wiz-subtitle wiz-subtitle-error">${this._esc(err)}</p>
        <p class="wiz-note">${hint}</p>
        <div class="wiz-actions wiz-actions-stack">
          <button class="wiz-btn wiz-btn-primary" data-action="${backAction}">Voltar e corrigir</button>
        </div>
      </div>
    `;
  },

  _renderClientNotifications() {
    return `
      <div class="wiz-card">
        <h1 class="wiz-title">Notificações</h1>
        <p class="wiz-subtitle">Quer receber alertas neste dispositivo?</p>
        <p class="wiz-note">
          Quando o instalador configurar automações — como presença detectada, alarme acionado
          ou evento de energia — você recebe a notificação direto aqui.
        </p>
        <div class="wiz-actions wiz-actions-stack">
          <button class="wiz-btn wiz-btn-primary" data-action="enable-notifications">Ativar notificações</button>
          <button class="wiz-btn wiz-btn-ghost" data-action="skip-notifications">Agora não</button>
        </div>
      </div>
    `;
  },

  _renderClientTour() {
    const slide = this.draft._tourSlide || 0;
    const slides = [
      {
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
        title: 'Controle por zonas',
        desc: 'Cada cômodo fica num card. Toque para ligar, desligar ou ajustar qualquer dispositivo.'
      },
      {
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
        title: 'Status em tempo real',
        desc: 'O painel atualiza automaticamente conforme os dispositivos mudam. Sem precisar recarregar a página.'
      },
      {
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
        title: 'Alertas inteligentes',
        desc: 'Use o botão de sino para ativar notificações push e receber alertas das automações configuradas.'
      }
    ];
    const s = slides[slide];
    const isLast = slide >= slides.length - 1;
    const dots = slides.map((_, i) => `
      <button class="wiz-tour-dot ${i === slide ? 'active' : ''}"
              data-action="tour-goto" data-slide="${i}"
              aria-label="Slide ${i + 1}"></button>
    `).join('');

    return `
      <div class="wiz-card">
        <div class="wiz-tour-icon">${s.icon}</div>
        <h1 class="wiz-title">${s.title}</h1>
        <p class="wiz-subtitle">${s.desc}</p>
        <div class="wiz-tour-dots">${dots}</div>
        <div class="wiz-actions wiz-actions-stack">
          ${isLast
            ? `<button class="wiz-btn wiz-btn-primary" data-action="tour-finish">Começar a usar</button>`
            : `<button class="wiz-btn wiz-btn-primary" data-action="tour-next">Próximo</button>
               <button class="wiz-btn wiz-btn-ghost" data-action="tour-finish">Pular tour</button>`
          }
        </div>
      </div>
    `;
  },

  _renderDiscover() {
    const zones = this.draft.zones;
    const assignedCount = zones.reduce((acc, z) => acc + z.devices.length, 0);
    const totalUseful = this._usefulEntities().length;
    const remaining = totalUseful - assignedCount;

    const zonesHTML = zones.length === 0
      ? `<p class="wiz-empty-zones">Nenhuma zona ainda. Clique em "Nova zona" pra começar.</p>`
      : zones.map((z, idx) => `
          <div class="wiz-zone-card">
            <div class="wiz-zone-icon">${UIRenderer._getIcon(z.icon)}</div>
            <div class="wiz-zone-info">
              <div class="wiz-zone-name">${this._esc(z.name)}</div>
              <div class="wiz-zone-meta">${z.devices.length} dispositivo${z.devices.length === 1 ? '' : 's'}</div>
            </div>
            <button class="wiz-zone-del" type="button" data-action="remove-zone" data-idx="${idx}" aria-label="Remover zona">×</button>
          </div>
        `).join('');

    return `
      <div class="wiz-card wiz-card-wide">
        <h1 class="wiz-title">Zonas de ${this._esc(this.draft.name)}</h1>
        <p class="wiz-subtitle">
          ${assignedCount} atribuído${assignedCount === 1 ? '' : 's'} ·
          ${remaining} sobrando
        </p>

        <div class="wiz-zones-list">${zonesHTML}</div>

        <div class="wiz-actions wiz-actions-stack">
          <button class="wiz-btn wiz-btn-ghost" type="button" data-action="add-zone">+ Nova zona</button>
          <button class="wiz-btn wiz-btn-primary" type="button" data-action="finalize"
                  ${zones.length === 0 ? 'disabled' : ''}>
            Salvar instalação
          </button>
          <button class="wiz-btn wiz-btn-text" type="button" data-action="back-form">Voltar</button>
        </div>
      </div>
    `;
  },

  _renderZoneEdit() {
    const zone = this.draft.editingZone || { name: '', icon: ZONE_ICONS[0], devices: [] };
    const assigned = new Set(
      this.draft.zones
        .filter(z => z !== zone)
        .flatMap(z => z.devices.map(d => d.entity))
    );
    const selectedEntities = new Set(zone.devices.map(d => d.entity));
    const selectedCritical = new Set(zone.devices.filter(d => d.isCritical).map(d => d.entity));

    const groups = this._groupByDomain(this._usefulEntities());
    const groupsHTML = Object.entries(groups).map(([domain, items]) => {
      const label = USEFUL_DOMAINS[domain].label;
      const available = items.filter(e => !assigned.has(e.entity_id));
      if (available.length === 0) return '';
      const itemsHTML = available.map(e => {
        const friendly = e.attributes && e.attributes.friendly_name
          ? e.attributes.friendly_name
          : e.entity_id;
        const isSelected = selectedEntities.has(e.entity_id);
        const isCritical = selectedCritical.has(e.entity_id);
        return `
          <label class="wiz-entity-row ${isSelected ? 'is-on' : ''}">
            <input type="checkbox" name="entity" value="${this._esc(e.entity_id)}" ${isSelected ? 'checked' : ''}>
            <span class="wiz-entity-name">${this._esc(friendly)}</span>
            <span class="wiz-entity-id">${this._esc(e.entity_id)}</span>
            <label class="wiz-entity-critical" title="Pede confirmação antes de acionar">
              <input type="checkbox" name="critical" value="${this._esc(e.entity_id)}" ${isCritical ? 'checked' : ''} ${isSelected ? '' : 'disabled'}>
              <span>crítico</span>
            </label>
          </label>
        `;
      }).join('');
      return `
        <div class="wiz-domain-group">
          <div class="wiz-domain-label">${label} <span>(${available.length})</span></div>
          <div class="wiz-domain-items">${itemsHTML}</div>
        </div>
      `;
    }).join('');

    const iconsHTML = ZONE_ICONS.map(name => `
      <button type="button" class="wiz-icon-pick ${zone.icon === name ? 'active' : ''}"
              data-action="select-icon" data-icon="${name}">
        ${UIRenderer._getIcon(name)}
      </button>
    `).join('');

    return `
      <div class="wiz-card wiz-card-wide">
        <h1 class="wiz-title">${this.draft.editingZone && this.draft.editingZone._isEdit ? 'Editar zona' : 'Nova zona'}</h1>
        <form class="wiz-form wiz-zone-form" data-form="zone" novalidate>
          <label class="wiz-field">
            <span class="wiz-label">Nome da zona</span>
            <input type="text" name="zoneName" value="${this._esc(zone.name)}"
                   placeholder="Ex: Sala, Suíte, Cozinha"
                   class="wiz-input" required maxlength="40" autofocus>
          </label>

          <div class="wiz-field">
            <span class="wiz-label">Ícone</span>
            <div class="wiz-icon-grid">${iconsHTML}</div>
          </div>

          <div class="wiz-field">
            <span class="wiz-label">Dispositivos</span>
            <div class="wiz-entities">
              ${groupsHTML || '<p class="wiz-empty-zones">Todos os dispositivos já foram atribuídos a outras zonas.</p>'}
            </div>
          </div>

          <div class="wiz-actions">
            <button type="button" class="wiz-btn wiz-btn-ghost" data-action="cancel-zone">Cancelar</button>
            <button type="submit" class="wiz-btn wiz-btn-primary">Salvar zona</button>
          </div>
        </form>
      </div>
    `;
  },

  // =========================================================================
  // Handlers
  // =========================================================================

  _handleClick(ev) {
    const btn = ev.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');

    // Resume
    if (action === 'resume-yes') {
      this.step = this._resumeToStep || 'form';
      this.render();
      return;
    }
    if (action === 'resume-no') {
      this.clearProgress();
      this._doOpen();
      return;
    }

    // Seleção de perfil
    if (action === 'select-role') {
      const role = btn.getAttribute('data-role');
      this.draft.role = role;
      this.goto(role === 'client' ? 'client-form' : 'form');
      return;
    }

    // Navegação comum
    if (action === 'back-role')        return this.goto('role-select');
    if (action === 'back-form')        return this.goto('form');
    if (action === 'back-client-form') return this.goto('client-form');
    if (action === 'start')            return this.goto('form');
    if (action === 'back-welcome')     return this.goto('role-select');
    if (action === 'go-discover')      return this.goto('discover');
    if (action === 'go-client-notif')  return this.goto('client-notif');

    // Notificações
    if (action === 'enable-notifications') {
      localStorage.setItem('dmsmart_push_pending', '1');
      if ('Notification' in window) {
        Notification.requestPermission().finally(() => this.goto('client-tour'));
      } else {
        this.goto('client-tour');
      }
      return;
    }
    if (action === 'skip-notifications') return this.goto('client-tour');

    // Tour
    if (action === 'tour-next') {
      this.draft._tourSlide = (this.draft._tourSlide || 0) + 1;
      this.saveProgress();
      this.render();
      return;
    }
    if (action === 'tour-goto') {
      const slide = Number(btn.getAttribute('data-slide'));
      if (!Number.isNaN(slide)) {
        this.draft._tourSlide = slide;
        this.saveProgress();
        this.render();
      }
      return;
    }
    if (action === 'tour-finish') return this._finalizeClient();

    // Zonas
    if (action === 'add-zone') {
      this.draft.editingZone = { name: '', icon: ZONE_ICONS[0], devices: [] };
      return this.goto('zone-edit');
    }
    if (action === 'cancel-zone') {
      this.draft.editingZone = null;
      return this.goto('discover');
    }
    if (action === 'remove-zone') {
      const idx = Number(btn.getAttribute('data-idx'));
      if (!Number.isNaN(idx)) this.draft.zones.splice(idx, 1);
      return this.render();
    }
    if (action === 'select-icon') {
      const icon = btn.getAttribute('data-icon');
      if (this.draft.editingZone) {
        this.draft.editingZone.icon = icon;
        this._captureZoneForm();
        this.render();
      }
      return;
    }

    if (action === 'finalize') return this._finalize();
  },

  _handleChange(ev) {
    const target = ev.target;
    if (target.name === 'entity') {
      this._captureZoneForm();
      this.render();
      return;
    }
    if (target.name === 'critical') {
      this._captureZoneForm();
      return;
    }
  },

  _handleSubmit(ev) {
    ev.preventDefault();
    const form = ev.target;
    const which = form.getAttribute('data-form');

    if (which === 'zone') {
      this._captureZoneForm();
      const zone = this.draft.editingZone;
      if (!zone.name || !zone.name.trim()) {
        alert('Dê um nome pra zona.');
        return;
      }
      if (zone.devices.length === 0) {
        alert('Marque pelo menos um dispositivo.');
        return;
      }
      zone.name = zone.name.trim();
      if (zone._isEdit && typeof zone._editIdx === 'number') {
        this.draft.zones[zone._editIdx] = this._stripInternal(zone);
      } else {
        this.draft.zones.push(this._stripInternal(zone));
      }
      this.draft.editingZone = null;
      return this.goto('discover');
    }

    if (which === 'client-connect') {
      const fd = new FormData(form);
      this.draft.name    = (fd.get('name')   || '').toString().trim() || 'Minha instalação';
      this.draft.haUrl   = (fd.get('haUrl')  || '').toString().trim();
      this.draft.token   = (fd.get('token')  || '').toString().trim();
      const err = this._validateClientDraft(this.draft);
      if (err) { this.lastError = err; return this.goto('error'); }
      this.goto('testing');
      this._runTest();
      return;
    }

    // Formulário do instalador (default)
    const fd = new FormData(form);
    this.draft.name  = (fd.get('name')  || '').toString().trim();
    this.draft.haUrl = (fd.get('haUrl') || '').toString().trim();
    this.draft.token = (fd.get('token') || '').toString().trim();

    const err = this._validateDraft(this.draft);
    if (err) { this.lastError = err; return this.goto('error'); }
    this.goto('testing');
    this._runTest();
  },

  _captureZoneForm() {
    const form = this.container.querySelector('[data-form="zone"]');
    if (!form || !this.draft.editingZone) return;
    const zone = this.draft.editingZone;
    const nameInput = form.querySelector('input[name="zoneName"]');
    if (nameInput) zone.name = nameInput.value;

    const checked = Array.from(form.querySelectorAll('input[name="entity"]:checked'))
      .map(el => el.value);
    const critical = new Set(
      Array.from(form.querySelectorAll('input[name="critical"]:checked'))
        .map(el => el.value)
    );
    const usefulMap = new Map(this._usefulEntities().map(e => [e.entity_id, e]));

    zone.devices = checked.map(entityId => {
      const entity = usefulMap.get(entityId);
      const domain = entityId.split('.')[0];
      const domainDef = USEFUL_DOMAINS[domain];
      const friendly = entity && entity.attributes && entity.attributes.friendly_name
        ? entity.attributes.friendly_name
        : entityId;
      return {
        id: 'dev_' + entityId.replace(/[^a-z0-9]/gi, '_').slice(0, 20) + '_' + Math.random().toString(36).slice(2, 6),
        name: friendly,
        type: domainDef ? domainDef.type : 'switch',
        entity: entityId,
        isCritical: critical.has(entityId) || domain === 'alarm_control_panel'
      };
    });
  },

  _stripInternal(zone) {
    return {
      name: zone.name,
      icon: zone.icon,
      devices: zone.devices
    };
  },

  // =========================================================================
  // Validação
  // =========================================================================

  _validateDraft({ name, haUrl, token }) {
    if (!name) return 'Dê um nome pra instalação.';
    if (!haUrl) return 'Informe a URL do Home Assistant.';
    if (!/^https?:\/\//i.test(haUrl)) return 'A URL precisa começar com http:// ou https://';
    if (!token) return 'Cole o token de longa duração.';
    if (token.length < 20) return 'Token parece inválido (muito curto).';
    return null;
  },

  _validateClientDraft({ haUrl, token }) {
    if (!haUrl) return 'Informe o endereço do sistema.';
    if (!/^https?:\/\//i.test(haUrl)) return 'O endereço precisa começar com http:// ou https://';
    if (!token) return 'Cole o código de acesso fornecido pelo instalador.';
    if (token.length < 20) return 'Código de acesso inválido (muito curto).';
    return null;
  },

  _errorHint(err) {
    const s = String(err).toLowerCase();
    if (s.includes('auth_invalid')) return 'Token inválido. Crie um novo no HA e tente de novo.';
    if (s.includes('timeout'))      return 'O HA não respondeu. Confira se está ligado e acessível no URL informado.';
    if (s.includes('ws error') || s.includes('network'))
                                     return 'Não consegui alcançar o servidor. Confira a URL, a porta e se o HA está rodando.';
    return 'Confira os dados e tente novamente.';
  },

  // =========================================================================
  // Descoberta de entidades
  // =========================================================================

  _usefulEntities() {
    if (!Array.isArray(this.lastStates)) return [];
    return this.lastStates.filter(e => {
      if (!e || !e.entity_id) return false;
      const domain = e.entity_id.split('.')[0];
      return !!USEFUL_DOMAINS[domain];
    });
  },

  _groupByDomain(entities) {
    const groups = {};
    for (const e of entities) {
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
    return groups;
  },

  // =========================================================================
  // Conexão
  // =========================================================================

  async _runTest() {
    try {
      const states = await this._testConnection(this.draft.haUrl, this.draft.token);
      this.lastStates = states;
      this.lastError = null;
      this.goto(this.draft.role === 'client' ? 'client-success' : 'success');
    } catch (err) {
      this.lastError = err && err.message ? err.message : String(err);
      this.lastStates = null;
      this.goto('error');
    }
  },

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

  // =========================================================================
  // Finalizar
  // =========================================================================

  _finalize() {
    this.clearProgress();
    const isFirst = InstallationStore.all().length === 0;
    const inst = InstallationStore.create({
      name: this.draft.name,
      haUrl: this.draft.haUrl,
      zones: this.draft.zones
    });
    InstallationStore.setToken(inst.id, this.draft.token);
    ActiveInstallation.setId(inst.id);
    this.close();
    if (isFirst) {
      window.location.reload();
    } else {
      document.dispatchEvent(new CustomEvent('dmsmart:installation-created', { detail: { id: inst.id } }));
    }
  },

  _finalizeClient() {
    this.clearProgress();
    const inst = InstallationStore.create({
      name: this.draft.name || 'Minha instalação',
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
