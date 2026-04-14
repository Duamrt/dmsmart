// white-label.js — Marca própria para integradores
// Fluxo cliente: app.dmstack.com.br/?b=SLUG → carrega logo/cor do integrador
// Fluxo integrador: configura nome, logo, cor e copia o link no painel
'use strict';

const WhiteLabel = (() => {
  let _branding = null;

  // ── Init ─────────────────────────────────────────────────────────────────
  async function init() {
    const slug = new URLSearchParams(location.search).get('b');
    if (slug) {
      const { data } = await SUPA.from('integrator_branding')
        .select('*').eq('brand_slug', slug).maybeSingle();
      if (data) { _branding = data; _apply(data); }
      return;
    }
    // Integrador logado → carrega a própria marca (para preview)
    if (typeof AuthStore !== 'undefined' && AuthStore.isLoggedIn()) {
      const user = AuthStore.getUser();
      const plan = typeof LicenseManager !== 'undefined' ? LicenseManager.getPlanKey() : 'basico';
      if (plan === 'integrador') {
        const { data } = await SUPA.from('integrator_branding')
          .select('*').eq('user_id', user.id).maybeSingle();
        if (data) { _branding = data; _apply(data); }
      }
    }
  }

  // ── Apply ─────────────────────────────────────────────────────────────────
  function _apply(b) {
    if (b.primary_color) _injectAccent(b.primary_color);

    const logoImg  = document.getElementById('wl-logo-img');
    const logoText = document.getElementById('wl-logo-text');

    if (b.logo_data && logoImg) {
      logoImg.src = b.logo_data;
      logoImg.style.display = 'block';
      if (logoText) logoText.style.display = 'none';
    }
    if (b.brand_name) {
      if (logoText && !b.logo_data) logoText.textContent = b.brand_name;
      document.title = b.brand_name + ' — Smart Home';
    }
  }

  function _injectAccent(color) {
    const dark  = _darken(color, 25);
    const alpha = color + '28';
    let style = document.getElementById('wl-styles');
    if (!style) {
      style = document.createElement('style');
      style.id = 'wl-styles';
      document.head.appendChild(style);
    }
    style.textContent = `
      :root { --wl-accent: ${color}; --wl-accent-dark: ${dark}; }
      .lic-btn--primary, .onb-cta, .wl-save-btn { background: ${color} !important; }
      .lic-btn--primary:hover, .onb-cta:hover, .wl-save-btn:hover { background: ${dark} !important; }
      .sidebar-nav-item.active { color: ${color} !important; }
      .sidebar-nav-item.active .sidebar-nav-icon svg { stroke: ${color} !important; }
      .lic-plan-card--highlight { border-color: ${color} !important; background: ${color}0d !important; }
      .lic-popular-tag { background: ${color} !important; }
    `;
  }

  function _darken(hex, amount) {
    const clean = hex.replace('#', '');
    const full = clean.length === 3
      ? clean.split('').map(c => c + c).join('') : clean;
    const num = parseInt(full, 16);
    const r = Math.max(0, (num >> 16) - amount);
    const g = Math.max(0, ((num >> 8) & 0xff) - amount);
    const b = Math.max(0, (num & 0xff) - amount);
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  // ── Settings UI ───────────────────────────────────────────────────────────
  function renderSettings(el) {
    if (!el) return;
    const b = _branding || {};
    const slug = b.brand_slug || '';
    const shareUrl = slug ? `${location.origin}${location.pathname}?b=${slug}` : '';

    el.innerHTML = `
      <div class="wl-wrap">
        <div class="wl-section">
          <h3 class="wl-title">Identidade visual</h3>

          <label class="wl-label">Nome da empresa</label>
          <input class="wl-input" id="wl-brand-name" type="text"
            placeholder="Ex: Casa Inteligente" value="${_esc(b.brand_name || '')}">

          <label class="wl-label">Logo
            <span class="wl-label-hint">PNG ou SVG · máx 200KB · fundo transparente</span>
          </label>
          <div class="wl-logo-row">
            <div class="wl-logo-preview" id="wl-logo-preview">
              ${b.logo_data ? `<img src="${b.logo_data}" alt="logo">` : '<span class="wl-logo-empty">Sem logo</span>'}
            </div>
            <div class="wl-logo-btns">
              <label class="wl-upload-btn" for="wl-logo-file">Carregar imagem</label>
              <input type="file" id="wl-logo-file" accept="image/png,image/svg+xml,image/jpeg,image/webp" class="wl-file-hidden">
              ${b.logo_data ? `<button class="wl-remove-btn" id="wl-logo-remove" type="button">Remover</button>` : ''}
            </div>
          </div>

          <label class="wl-label">Cor principal</label>
          <div class="wl-color-row">
            <input type="color" id="wl-color-pick" value="${b.primary_color || '#1f6feb'}" class="wl-color-pick">
            <input class="wl-input wl-input--hex" id="wl-color-hex" type="text"
              maxlength="7" placeholder="#1f6feb" value="${b.primary_color || '#1f6feb'}">
            <span class="wl-color-swatch" id="wl-color-swatch"
              style="background:${b.primary_color || '#1f6feb'}"></span>
          </div>
        </div>

        <div class="wl-section">
          <h3 class="wl-title">Link do cliente</h3>
          <p class="wl-desc">Envie este link para o seu cliente. Ele abrirá o app com a sua marca.</p>

          <label class="wl-label">Slug (único, só letras e números)</label>
          <input class="wl-input" id="wl-slug" type="text"
            placeholder="ex: casainteligente" value="${_esc(slug)}">

          <div class="wl-share-box" id="wl-share-box" style="${slug ? '' : 'display:none'}">
            <span class="wl-share-url" id="wl-share-url">${_esc(shareUrl)}</span>
            <button class="wl-copy-btn" id="wl-copy-btn" type="button">Copiar</button>
          </div>
        </div>

        <div class="wl-footer">
          <button class="wl-save-btn" id="wl-save-btn" type="button">Salvar configurações</button>
        </div>
      </div>`;

    _bindSettings(el);
  }

  function _bindSettings(el) {
    const nameInput  = el.querySelector('#wl-brand-name');
    const slugInput  = el.querySelector('#wl-slug');
    const fileInput  = el.querySelector('#wl-logo-file');
    const colorPick  = el.querySelector('#wl-color-pick');
    const colorHex   = el.querySelector('#wl-color-hex');
    const colorSwatch = el.querySelector('#wl-color-swatch');

    // Auto-slug a partir do nome (só se ainda não tem slug salvo)
    nameInput?.addEventListener('input', () => {
      if (!_branding?.brand_slug) {
        slugInput.value = _autoSlug(nameInput.value);
        _syncShareBox(el, slugInput.value);
      }
    });
    slugInput?.addEventListener('input', () => _syncShareBox(el, slugInput.value));

    // Upload logo
    fileInput?.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;
      if (file.size > 200 * 1024) { alert('Imagem muito grande. Máximo 200KB.'); return; }
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        el.querySelector('#wl-logo-preview').innerHTML = `<img src="${dataUrl}" alt="logo">`;
        fileInput._dataUrl = dataUrl;
        // Preview ao vivo no sidebar
        const logoImg  = document.getElementById('wl-logo-img');
        const logoText = document.getElementById('wl-logo-text');
        if (logoImg) { logoImg.src = dataUrl; logoImg.style.display = 'block'; }
        if (logoText) logoText.style.display = 'none';
      };
      reader.readAsDataURL(file);
    });

    // Remover logo
    el.querySelector('#wl-logo-remove')?.addEventListener('click', () => {
      fileInput._dataUrl = '';
      el.querySelector('#wl-logo-preview').innerHTML = '<span class="wl-logo-empty">Sem logo</span>';
      el.querySelector('#wl-logo-remove')?.remove();
      const logoImg  = document.getElementById('wl-logo-img');
      const logoText = document.getElementById('wl-logo-text');
      if (logoImg) { logoImg.src = ''; logoImg.style.display = 'none'; }
      if (logoText) { logoText.style.display = ''; logoText.textContent = nameInput?.value || 'dmsmart'; }
    });

    // Color picker ↔ hex
    colorPick?.addEventListener('input', () => {
      colorHex.value = colorPick.value;
      colorSwatch.style.background = colorPick.value;
      _injectAccent(colorPick.value);
    });
    colorHex?.addEventListener('input', () => {
      if (/^#[0-9a-f]{6}$/i.test(colorHex.value)) {
        colorPick.value = colorHex.value;
        colorSwatch.style.background = colorHex.value;
        _injectAccent(colorHex.value);
      }
    });

    // Copiar link
    el.querySelector('#wl-copy-btn')?.addEventListener('click', () => {
      const url = el.querySelector('#wl-share-url')?.textContent || '';
      navigator.clipboard.writeText(url).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = url; document.body.appendChild(ta);
        ta.select(); document.execCommand('copy'); ta.remove();
      });
      const btn = el.querySelector('#wl-copy-btn');
      btn.textContent = 'Copiado!';
      setTimeout(() => btn.textContent = 'Copiar', 2000);
    });

    // Salvar
    el.querySelector('#wl-save-btn')?.addEventListener('click', () => _save(el));
  }

  function _syncShareBox(el, slug) {
    const box  = el.querySelector('#wl-share-box');
    const urlEl = el.querySelector('#wl-share-url');
    if (!box || !urlEl) return;
    if (slug) {
      box.style.display = '';
      urlEl.textContent = `${location.origin}${location.pathname}?b=${slug}`;
    } else {
      box.style.display = 'none';
    }
  }

  async function _save(el) {
    const btn = el.querySelector('#wl-save-btn');
    btn.disabled = true; btn.textContent = 'Salvando…';

    const user = AuthStore.getUser();
    const fileInput = el.querySelector('#wl-logo-file');
    const logoData = fileInput?._dataUrl !== undefined
      ? (fileInput._dataUrl || null)
      : (_branding?.logo_data || null);

    const slug = el.querySelector('#wl-slug')?.value.trim() || null;
    if (slug && !/^[a-z0-9-]+$/.test(slug)) {
      alert('Slug inválido. Use apenas letras minúsculas, números e hifens.');
      btn.disabled = false; btn.textContent = 'Salvar configurações';
      return;
    }

    const payload = {
      user_id:       user.id,
      brand_name:    el.querySelector('#wl-brand-name')?.value.trim() || '',
      logo_data:     logoData,
      primary_color: el.querySelector('#wl-color-pick')?.value || '#1f6feb',
      brand_slug:    slug,
      updated_at:    new Date().toISOString(),
    };

    const { data, error } = await SUPA.from('integrator_branding')
      .upsert(payload, { onConflict: 'user_id' })
      .select().single();

    btn.disabled = false;
    if (error) {
      btn.textContent = 'Salvar configurações';
      alert('Erro ao salvar: ' + error.message);
      return;
    }

    _branding = data;
    _apply(data);
    _syncShareBox(el, data.brand_slug);
    btn.textContent = '✓ Salvo!';
    setTimeout(() => btn.textContent = 'Salvar configurações', 2500);
  }

  function _autoSlug(name) {
    return name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  return { init, renderSettings, get: () => _branding };
})();
