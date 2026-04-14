// license-manager.js — Planos e licenciamento dmsmart
// Planos: basico (grátis) · profissional (R$49/mês) · integrador (R$39/instalação/mês)
'use strict';

const LicenseManager = (() => {
  const WA = '5587981456565';

  const PLANS = {
    basico: {
      key: 'basico',
      name: 'Básico',
      tagline: 'Para uso próprio',
      price: 'Grátis',
      priceSub: 'para sempre',
      instLimit: 1,
      features: [
        { label: 'Dashboard em tempo real', ok: true },
        { label: 'Controle de zonas e ambientes', ok: true },
        { label: 'Cenas e automações', ok: true },
        { label: 'App mobile (PWA)', ok: true },
        { label: 'Painel de energia', ok: false },
        { label: 'Relatórios e histórico', ok: false },
        { label: 'Alertas proativos', ok: false },
      ]
    },
    profissional: {
      key: 'profissional',
      name: 'Profissional',
      tagline: 'Para usuários avançados',
      price: 'R$ 49',
      priceSub: 'por mês',
      instLimit: 1,
      features: [
        { label: 'Tudo do Básico', ok: true },
        { label: 'Painel de energia', ok: true },
        { label: 'Relatórios e histórico', ok: true },
        { label: 'Alertas proativos', ok: true },
        { label: 'Planta baixa interativa', ok: true },
        { label: 'Exportação CSV / PDF', ok: true },
      ]
    },
    integrador: {
      key: 'integrador',
      name: 'Integrador',
      tagline: 'Para profissionais que atendem clientes',
      price: 'R$ 39',
      priceSub: 'por instalação/mês',
      instLimit: Infinity,
      features: [
        { label: 'Tudo do Profissional', ok: true },
        { label: 'Instalações ilimitadas', ok: true },
        { label: 'Painel multi-cliente', ok: true },
        { label: 'Relatórios por cliente', ok: true },
        { label: 'Alertas por instalação', ok: true },
        { label: 'Suporte prioritário', ok: true },
      ]
    }
  };

  // Features que requerem plano mínimo
  const FEATURE_PLAN = {
    energia:    'profissional',
    relatorios: 'profissional',
    alertas:    'profissional',
    integrador: 'integrador'
  };

  const PLAN_ORDER = ['basico', 'profissional', 'integrador'];

  function _planRank(key) { return PLAN_ORDER.indexOf(key); }

  function getPlanKey() {
    if (typeof AuthStore !== 'undefined' && AuthStore.isLoggedIn()) {
      const p = AuthStore.getProfile();
      if (p && p.plan && PLANS[p.plan]) return p.plan;
    }
    return localStorage.getItem('dmsmart_plan') || 'basico';
  }

  function getPlan(key) { return PLANS[key || getPlanKey()]; }

  function canAccess(view) {
    const required = FEATURE_PLAN[view];
    if (!required) return true; // sem restrição
    return _planRank(getPlanKey()) >= _planRank(required);
  }

  function getInstallCount() {
    return typeof InstallationStore !== 'undefined' ? InstallationStore.all().length : 0;
  }

  function canAddInstallation() {
    const plan = getPlan();
    if (plan.instLimit === Infinity) return true;
    return getInstallCount() < plan.instLimit;
  }

  // ── Init ─────────────────────────────────────────────────────────────────
  function init() {
    _renderBadge();
    _renderLockedNavIcons();
    _checkOverLimitOnLoad();
    if (typeof SUPA !== 'undefined') {
      SUPA.auth.onAuthStateChange(() => setTimeout(() => { _renderBadge(); _renderLockedNavIcons(); }, 600));
    }
  }

  function _checkOverLimitOnLoad() {
    const SESS_KEY = 'dmsmart_overlimit_warned';
    if (sessionStorage.getItem(SESS_KEY)) return;
    const plan = getPlan();
    if (plan.instLimit === Infinity) return;
    const count = getInstallCount();
    if (count <= plan.instLimit) return;
    sessionStorage.setItem(SESS_KEY, '1');
    // aguarda o modal estar no DOM
    setTimeout(() => openUpgradePrompt(), 1200);
  }

  function _renderBadge() {
    const el = document.getElementById('license-plan-badge');
    if (!el) return;
    const key = getPlanKey();
    const plan = PLANS[key];
    const count = getInstallCount();
    const lim = plan.instLimit === Infinity ? '∞' : plan.instLimit;
    const overLimit = plan.instLimit !== Infinity && count > plan.instLimit;
    el.innerHTML = `
      <button class="lic-badge-btn${overLimit ? ' lic-badge-btn--overlimit' : ''}" type="button" data-nav="planos" title="${overLimit ? 'Limite excedido — clique para ver planos' : 'Ver planos'}">
        <span class="lic-badge lic-badge--${key}">${plan.name}</span>
        <span class="lic-inst-count${overLimit ? ' lic-inst-count--overlimit' : ''}">${overLimit ? '⚠ ' : ''}${count}/${lim}</span>
      </button>
    `;
    el.querySelector('[data-nav]').addEventListener('click', () => {
      const btn = document.querySelector('.sidebar-nav-item[data-nav="planos"]');
      if (btn) btn.click(); else goToPlans();
    });
  }

  function _renderLockedNavIcons() {
    document.querySelectorAll('[data-nav]').forEach(btn => {
      const view = btn.getAttribute('data-nav');
      const locked = !canAccess(view);
      btn.classList.toggle('lic-nav-locked', locked);
      const existing = btn.querySelector('.lic-lock-icon');
      if (locked && !existing) {
        const icon = document.createElement('span');
        icon.className = 'lic-lock-icon';
        icon.innerHTML = '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
        btn.appendChild(icon);
      } else if (!locked && existing) {
        existing.remove();
      }
    });
  }

  // ── Feature lock overlay ─────────────────────────────────────────────────
  function renderLockedView(el, view) {
    const required = FEATURE_PLAN[view];
    const plan = PLANS[required];
    const waMsg = encodeURIComponent(`Olá! Quero fazer upgrade para o plano ${plan.name} do dmsmart.`);
    el.innerHTML = `
      <div class="lic-locked-wrap">
        <div class="lic-locked-icon">
          <svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
        </div>
        <div class="lic-locked-title">Recurso bloqueado</div>
        <div class="lic-locked-sub">Esta funcionalidade requer o plano <strong>${plan.name}</strong>.</div>
        <div class="lic-locked-actions">
          <button class="lic-btn lic-btn--primary" type="button" id="lic-see-plans-btn">Ver planos</button>
          <a class="lic-btn lic-btn--wa" href="https://wa.me/${WA}?text=${waMsg}" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
            Falar com suporte
          </a>
        </div>
      </div>
    `;
    document.getElementById('lic-see-plans-btn').addEventListener('click', goToPlans);
  }

  // ── Upgrade prompt (modal — quando tenta criar instalação além do limite) ─
  function openUpgradePrompt() {
    const modal = document.getElementById('license-upgrade-modal');
    if (!modal) return;
    const key = getPlanKey();
    const plan = PLANS[key];
    const lim = plan.instLimit;
    const waMsg = encodeURIComponent('Olá! Quero fazer upgrade do meu plano dmsmart para ter mais instalações.');
    modal.classList.remove('hidden');
    modal.querySelector('.lic-upgrade-body').innerHTML = `
      <div class="lic-upgrade-icon">⚡</div>
      <h3>Limite atingido</h3>
      <p>O plano <strong>${plan.name}</strong> permite até <strong>${lim} instalação${lim > 1 ? 'ões' : ''}</strong>.</p>
      <p>Faça upgrade para gerenciar mais instalações.</p>
      <div class="lic-upgrade-actions">
        <button class="lic-btn lic-btn--primary" type="button" id="lic-upgrade-goto-plans">Ver planos</button>
        <a class="lic-btn lic-btn--wa" href="https://wa.me/${WA}?text=${waMsg}" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
          Falar agora
        </a>
        <button class="lic-btn lic-btn--ghost" type="button" id="lic-upgrade-cancel">Cancelar</button>
      </div>
    `;
    document.getElementById('lic-upgrade-goto-plans').addEventListener('click', () => { modal.classList.add('hidden'); goToPlans(); });
    document.getElementById('lic-upgrade-cancel').addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); }, { once: true });
  }

  function goToPlans() {
    const modal = document.getElementById('license-upgrade-modal');
    if (modal) modal.classList.add('hidden');
    const btn = document.querySelector('.sidebar-nav-item[data-nav="planos"]');
    if (btn) btn.click();
  }

  // ── Página de planos ──────────────────────────────────────────────────────
  function renderPlansPage(el) {
    if (!el) return;
    const currentKey = getPlanKey();
    const count = getInstallCount();

    const cards = PLAN_ORDER.map(key => {
      const p = PLANS[key];
      const isCurrent = key === currentKey;
      const waMsg = encodeURIComponent(`Olá! Quero fazer upgrade para o plano ${p.name} do dmsmart.`);
      const rows = p.features.map(f => `
        <li class="${f.ok ? '' : 'lic-feat--off'}">
          <svg viewBox="0 0 24 24">${f.ok
            ? '<path d="M20 6L9 17l-5-5"/>'
            : '<path d="M18 6L6 18M6 6l12 12"/>'
          }</svg>
          ${f.label}
        </li>
      `).join('');

      return `
        <div class="lic-plan-card${isCurrent ? ' lic-plan-card--current' : ''}${key === 'profissional' ? ' lic-plan-card--highlight' : ''}">
          ${isCurrent ? '<div class="lic-current-tag">Plano atual</div>' : ''}
          ${key === 'profissional' && !isCurrent ? '<div class="lic-popular-tag">Popular</div>' : ''}
          <div class="lic-plan-top">
            <div class="lic-plan-name">${p.name}</div>
            <div class="lic-plan-tagline">${p.tagline}</div>
            <div class="lic-plan-price-row">
              <span class="lic-plan-price">${p.price}</span>
              <span class="lic-plan-price-sub">${p.priceSub}</span>
            </div>
          </div>
          <ul class="lic-plan-features">${rows}</ul>
          ${isCurrent
            ? `<button class="lic-btn lic-btn--current" disabled>Plano atual</button>`
            : `<a class="lic-btn lic-btn--primary" href="https://wa.me/${WA}?text=${waMsg}" target="_blank" rel="noopener">Fazer upgrade</a>`
          }
        </div>
      `;
    }).join('');

    const cur = PLANS[currentKey];
    const lim = cur.instLimit === Infinity ? '∞' : cur.instLimit;

    el.innerHTML = `
      <div class="lic-wrap">
        <div class="lic-header">
          <div class="lic-header-left">
            <div class="lic-header-label">Plano atual</div>
            <div class="lic-header-row">
              <span class="lic-badge lic-badge--${currentKey} lic-badge--lg">${cur.name}</span>
              <span class="lic-header-usage">${count} de ${lim} instalação${cur.instLimit !== 1 ? 'ões' : ''} ativa${count !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
        <div class="lic-plans-grid">${cards}</div>
        <div class="lic-plans-footer">
          Dúvidas ou downgrade? Fale pelo
          <a href="https://wa.me/${WA}" target="_blank" rel="noopener">WhatsApp</a>.
        </div>
      </div>
    `;
  }

  function refreshBadge() { _renderBadge(); _renderLockedNavIcons(); }

  return { init, getPlanKey, getPlan, canAccess, canAddInstallation, openUpgradePrompt, goToPlans, renderPlansPage, renderLockedView, refreshBadge };
})();
