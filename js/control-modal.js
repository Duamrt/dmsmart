// control-modal.js
// Modal de detalhe de dispositivo com controles específicos por tipo
// Abre via badge click em UIRenderer. Fecha via X, backdrop, Escape.
// Sincroniza estado ao vivo com StateStore enquanto aberto.

const ControlModal = {
  _overlay: null,
  _device: null,
  _unsub: null,
  _pressTimer: null,
  _lastState: null,

  init() {
    this._overlay = document.getElementById('control-modal');
    if (!this._overlay) {
      this._overlay = document.createElement('div');
      this._overlay.id = 'control-modal';
      this._overlay.className = 'control-modal-overlay hidden';
      document.body.appendChild(this._overlay);
    }

    this._overlay.addEventListener('click', (e) => {
      if (e.target === this._overlay) { this.close(); return; }
      const btn = e.target.closest('[data-ctrl]');
      if (!btn) return;
      const action = btn.getAttribute('data-ctrl');
      if (action === 'close') { this.close(); return; }
      this._handleAction(action, btn);
    });

    this._overlay.addEventListener('input', (e) => {
      const input = e.target.closest('input[type="range"][data-ctrl-range]');
      if (!input) return;
      this._handleRange(input.getAttribute('data-ctrl-range'), input);
    });

    document.addEventListener('keydown', (e) => {
      if (this._overlay.classList.contains('hidden')) return;
      if (e.key === 'Escape') this.close();
    });
  },

  open(device) {
    if (!device || !device.entity) return;
    this._device = device;
    this._lastState = StateStore.get(device.entity);
    this._render();
    this._overlay.classList.remove('hidden');
    document.body.classList.add('modal-open');

    if (this._unsub) this._unsub();
    this._unsub = StateStore.subscribe(device.entity, (newState) => {
      this._lastState = newState;
      this._syncLiveOnly();
    });
  },

  close() {
    this._overlay.classList.add('hidden');
    document.body.classList.remove('modal-open');
    if (this._unsub) { this._unsub(); this._unsub = null; }
    this._device = null;
    this._lastState = null;
  },

  _render() {
    const device = this._device;
    const state = this._lastState;
    const type = device.type || 'switch';
    const renderer = ControlRenderers[type] || ControlRenderers.switch;
    const bodyHtml = renderer.body(device, state);
    const statusTxt = renderer.status ? renderer.status(device, state) : _ctrlStateLabel(state);
    const icon = _ctrlDomainIcon(type);

    this._overlay.innerHTML = `
      <div class="control-card" role="dialog" aria-modal="true">
        <div class="control-head">
          <div class="control-head-icon">${icon}</div>
          <div class="control-head-text">
            <div class="control-head-name">${_ctrlEsc(device.name || device.entity)}</div>
            <div class="control-head-entity">${_ctrlEsc(device.entity)}</div>
          </div>
          <button type="button" class="control-close" data-ctrl="close" aria-label="Fechar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6l-12 12"/></svg>
          </button>
        </div>
        <div class="control-body" data-ctrl-body>${bodyHtml}</div>
        <div class="control-foot">
          <div class="control-foot-label">Status</div>
          <div class="control-foot-value" data-ctrl-status>${_ctrlEsc(statusTxt)}</div>
        </div>
      </div>
    `;
  },

  _syncLiveOnly() {
    if (!this._device || this._overlay.classList.contains('hidden')) return;
    const type = this._device.type || 'switch';
    const renderer = ControlRenderers[type] || ControlRenderers.switch;
    const body = this._overlay.querySelector('[data-ctrl-body]');
    const statusEl = this._overlay.querySelector('[data-ctrl-status]');
    if (!body) return;

    if (renderer.sync) {
      renderer.sync(body, this._device, this._lastState);
    } else {
      body.innerHTML = renderer.body(this._device, this._lastState);
    }
    if (statusEl) {
      const txt = renderer.status ? renderer.status(this._device, this._lastState) : _ctrlStateLabel(this._lastState);
      statusEl.textContent = txt;
    }
  },

  _handleAction(action, btn) {
    const device = this._device;
    if (!device) return;
    const type = device.type || 'switch';
    const renderer = ControlRenderers[type] || ControlRenderers.switch;
    if (renderer.handle) {
      renderer.handle(action, btn, device, this._lastState, this);
    }
  },

  _handleRange(name, input) {
    const device = this._device;
    if (!device) return;
    const type = device.type || 'switch';
    const renderer = ControlRenderers[type] || ControlRenderers.switch;
    if (renderer.range) {
      renderer.range(name, input, device, this._lastState, this);
    }
  },

  _call(domain, service, data = {}) {
    try {
      if (typeof HAClient !== 'undefined' && HAClient.callService) {
        return HAClient.callService(domain, service, data);
      }
    } catch (err) {
      console.warn('[control-modal] callService falhou:', err);
    }
    return Promise.resolve();
  },

  _optimistic(patch) {
    const cur = StateStore.get(this._device.entity) || { entity_id: this._device.entity, attributes: {} };
    const next = {
      ...cur,
      ...patch,
      attributes: { ...(cur.attributes || {}), ...(patch.attributes || {}) }
    };
    StateStore.update(this._device.entity, next);
    this._lastState = next;
  }
};

/* ==================================================================
   Renderers por tipo
   Cada renderer tem:
     - body(device, state) -> string HTML
     - status?(device, state) -> string curta pro rodapé
     - handle?(action, btn, device, state, modal) -> lida com botões
     - range?(name, input, device, state, modal) -> lida com sliders
     - sync?(bodyEl, device, state) -> atualiza in-place (sem rerender)
   ================================================================== */

const ControlRenderers = {
  switch: {
    body(device, state) {
      const isOn = state && state.state === 'on';
      return `
        ${_ctrlBigToggle(isOn)}
      `;
    },
    sync(body, device, state) {
      const isOn = state && state.state === 'on';
      const toggle = body.querySelector('[data-ctrl="toggle"]');
      if (toggle) {
        toggle.classList.toggle('on', isOn);
        const lbl = toggle.querySelector('.big-toggle-label');
        if (lbl) lbl.textContent = isOn ? 'Ligado' : 'Desligado';
      }
    },
    handle(action, btn, device, state, modal) {
      if (action !== 'toggle') return;
      const isOn = state && state.state === 'on';
      const nextState = isOn ? 'off' : 'on';
      modal._optimistic({ state: nextState });
      const domain = device.entity.split('.')[0];
      modal._call(domain, 'toggle', { entity_id: device.entity });
    }
  },

  light: {
    body(device, state) {
      const isOn = state && state.state === 'on';
      const attrs = (state && state.attributes) || {};
      const brightness = Math.round(((attrs.brightness || 0) / 255) * 100);
      const supportsColor = Array.isArray(attrs.supported_color_modes)
        && attrs.supported_color_modes.some(m => ['rgb','rgbw','rgbww','hs','xy'].includes(m));
      const rgb = attrs.rgb_color || [255, 200, 120];
      const hex = _ctrlRgbToHex(rgb);

      return `
        ${_ctrlBigToggle(isOn)}
        <div class="control-section">
          <div class="control-section-head">
            <span>Brilho</span>
            <span class="control-section-val" data-ctrl-bright-val>${brightness}%</span>
          </div>
          <input type="range" min="0" max="100" value="${brightness}" data-ctrl-range="brightness" class="control-range" />
        </div>
        ${supportsColor ? `
          <div class="control-section">
            <div class="control-section-head">
              <span>Cor</span>
              <span class="control-swatch-current" style="background:${hex}"></span>
            </div>
            <div class="control-swatches">
              ${_ctrlColorPalette().map(c => `
                <button type="button" class="control-swatch" style="background:${c}" data-ctrl="color" data-color="${c}"></button>
              `).join('')}
            </div>
          </div>
        ` : ''}
      `;
    },
    status(device, state) {
      if (!state) return '—';
      if (state.state !== 'on') return 'Desligada';
      const attrs = state.attributes || {};
      const pct = Math.round(((attrs.brightness || 0) / 255) * 100);
      return pct > 0 ? `${pct}% de brilho` : 'Ligada';
    },
    sync(body, device, state) {
      const isOn = state && state.state === 'on';
      const attrs = (state && state.attributes) || {};
      const brightness = Math.round(((attrs.brightness || 0) / 255) * 100);
      const toggle = body.querySelector('[data-ctrl="toggle"]');
      if (toggle) {
        toggle.classList.toggle('on', isOn);
        const lbl = toggle.querySelector('.big-toggle-label');
        if (lbl) lbl.textContent = isOn ? 'Ligada' : 'Desligada';
      }
      const slider = body.querySelector('[data-ctrl-range="brightness"]');
      if (slider && document.activeElement !== slider) slider.value = brightness;
      const val = body.querySelector('[data-ctrl-bright-val]');
      if (val) val.textContent = `${brightness}%`;
    },
    handle(action, btn, device, state, modal) {
      if (action === 'toggle') {
        const isOn = state && state.state === 'on';
        modal._optimistic({ state: isOn ? 'off' : 'on' });
        modal._call('light', isOn ? 'turn_off' : 'turn_on', { entity_id: device.entity });
        return;
      }
      if (action === 'color') {
        const hex = btn.getAttribute('data-color');
        const rgb = _ctrlHexToRgb(hex);
        modal._optimistic({ state: 'on', attributes: { rgb_color: rgb } });
        modal._call('light', 'turn_on', { entity_id: device.entity, rgb_color: rgb });
        return;
      }
    },
    range(name, input, device, state, modal) {
      if (name !== 'brightness') return;
      const pct = Number(input.value) || 0;
      const val = modal._overlay.querySelector('[data-ctrl-bright-val]');
      if (val) val.textContent = `${pct}%`;
      clearTimeout(modal._rangeDebounce);
      modal._rangeDebounce = setTimeout(() => {
        if (pct === 0) {
          modal._optimistic({ state: 'off', attributes: { brightness: 0 } });
          modal._call('light', 'turn_off', { entity_id: device.entity });
        } else {
          const brightness = Math.round((pct / 100) * 255);
          modal._optimistic({ state: 'on', attributes: { brightness } });
          modal._call('light', 'turn_on', { entity_id: device.entity, brightness_pct: pct });
        }
      }, 150);
    }
  },

  climate: {
    body(device, state) {
      const attrs = (state && state.attributes) || {};
      const currentTemp = attrs.current_temperature;
      const targetTemp = attrs.temperature || 22;
      const minTemp = attrs.min_temp || 16;
      const maxTemp = attrs.max_temp || 30;
      const hvacMode = state && state.state ? state.state : 'off';
      const modes = attrs.hvac_modes || ['off','cool','heat','auto'];
      const modeLabels = { off: 'Desligado', cool: 'Frio', heat: 'Quente', auto: 'Auto', dry: 'Seco', fan_only: 'Vent', heat_cool: 'Auto' };

      return `
        <div class="control-climate">
          <div class="climate-current">
            ${currentTemp != null ? `<div class="climate-current-val">${currentTemp}°</div><div class="climate-current-label">temperatura atual</div>` : `<div class="climate-current-label">sem sensor de temperatura</div>`}
          </div>
          <div class="climate-target" data-ctrl-climate-target data-min="${minTemp}" data-max="${maxTemp}">
            <button type="button" class="climate-target-btn" data-ctrl="temp-down" aria-label="Diminuir">−</button>
            <div class="climate-target-val" data-ctrl-temp>${targetTemp}°</div>
            <button type="button" class="climate-target-btn" data-ctrl="temp-up" aria-label="Aumentar">+</button>
          </div>
        </div>
        <div class="control-section">
          <div class="control-section-head"><span>Modo</span></div>
          <div class="climate-modes">
            ${modes.map(m => `
              <button type="button" class="climate-mode-pill ${m === hvacMode ? 'active' : ''}" data-ctrl="mode" data-mode="${m}">${modeLabels[m] || m}</button>
            `).join('')}
          </div>
        </div>
      `;
    },
    status(device, state) {
      if (!state) return '—';
      const attrs = state.attributes || {};
      const mode = state.state === 'off' ? 'Desligado' : state.state;
      return attrs.temperature != null ? `${mode} · alvo ${attrs.temperature}°` : mode;
    },
    sync(body, device, state) {
      const attrs = (state && state.attributes) || {};
      const targetTemp = attrs.temperature;
      const tempEl = body.querySelector('[data-ctrl-temp]');
      if (tempEl && targetTemp != null) tempEl.textContent = `${targetTemp}°`;
      const mode = state && state.state;
      body.querySelectorAll('.climate-mode-pill').forEach(el => {
        el.classList.toggle('active', el.getAttribute('data-mode') === mode);
      });
    },
    handle(action, btn, device, state, modal) {
      const attrs = (state && state.attributes) || {};
      const wrap = modal._overlay.querySelector('[data-ctrl-climate-target]');
      const min = wrap ? Number(wrap.getAttribute('data-min')) : 16;
      const max = wrap ? Number(wrap.getAttribute('data-max')) : 30;
      const cur = attrs.temperature != null ? Number(attrs.temperature) : 22;

      if (action === 'temp-up' || action === 'temp-down') {
        const delta = action === 'temp-up' ? 1 : -1;
        const next = Math.max(min, Math.min(max, cur + delta));
        modal._optimistic({ attributes: { temperature: next } });
        const tempEl = modal._overlay.querySelector('[data-ctrl-temp]');
        if (tempEl) tempEl.textContent = `${next}°`;
        modal._call('climate', 'set_temperature', { entity_id: device.entity, temperature: next });
        return;
      }
      if (action === 'mode') {
        const mode = btn.getAttribute('data-mode');
        modal._optimistic({ state: mode });
        modal._overlay.querySelectorAll('.climate-mode-pill').forEach(el => {
          el.classList.toggle('active', el.getAttribute('data-mode') === mode);
        });
        modal._call('climate', 'set_hvac_mode', { entity_id: device.entity, hvac_mode: mode });
        return;
      }
    }
  },

  cover: {
    body(device, state) {
      const attrs = (state && state.attributes) || {};
      const position = attrs.current_position != null ? attrs.current_position : (state && state.state === 'open' ? 100 : 0);
      return `
        <div class="control-cover">
          <div class="cover-visual">
            <div class="cover-track">
              <div class="cover-fill" style="height:${100 - position}%"></div>
            </div>
            <div class="cover-pct" data-ctrl-cover-pct>${position}%</div>
          </div>
          <div class="cover-buttons">
            <button type="button" class="cover-btn" data-ctrl="open" aria-label="Abrir">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 15l6-6 6 6"/></svg>
              <span>Abrir</span>
            </button>
            <button type="button" class="cover-btn" data-ctrl="stop" aria-label="Parar">
              <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
              <span>Parar</span>
            </button>
            <button type="button" class="cover-btn" data-ctrl="close" aria-label="Fechar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
              <span>Fechar</span>
            </button>
          </div>
        </div>
      `;
    },
    status(device, state) {
      if (!state) return '—';
      const attrs = state.attributes || {};
      if (attrs.current_position != null) return `${attrs.current_position}% aberto`;
      return state.state === 'open' ? 'Aberto' : state.state === 'closed' ? 'Fechado' : state.state;
    },
    sync(body, device, state) {
      const attrs = (state && state.attributes) || {};
      const position = attrs.current_position != null ? attrs.current_position : (state && state.state === 'open' ? 100 : 0);
      const fill = body.querySelector('.cover-fill');
      const pct = body.querySelector('[data-ctrl-cover-pct]');
      if (fill) fill.style.height = `${100 - position}%`;
      if (pct) pct.textContent = `${position}%`;
    },
    handle(action, btn, device, state, modal) {
      const services = { open: 'open_cover', close: 'close_cover', stop: 'stop_cover' };
      const service = services[action];
      if (!service) return;
      if (action === 'open') modal._optimistic({ state: 'open', attributes: { current_position: 100 } });
      if (action === 'close') modal._optimistic({ state: 'closed', attributes: { current_position: 0 } });
      modal._call('cover', service, { entity_id: device.entity });
    }
  },

  fan: {
    body(device, state) {
      const isOn = state && state.state === 'on';
      const attrs = (state && state.attributes) || {};
      const percentage = attrs.percentage != null ? attrs.percentage : (isOn ? 100 : 0);
      return `
        ${_ctrlBigToggle(isOn)}
        <div class="control-section">
          <div class="control-section-head">
            <span>Velocidade</span>
            <span class="control-section-val" data-ctrl-fan-val>${percentage}%</span>
          </div>
          <input type="range" min="0" max="100" value="${percentage}" data-ctrl-range="speed" class="control-range" />
        </div>
      `;
    },
    status(device, state) {
      if (!state) return '—';
      if (state.state !== 'on') return 'Desligado';
      const attrs = state.attributes || {};
      return attrs.percentage != null ? `${attrs.percentage}% de velocidade` : 'Ligado';
    },
    sync(body, device, state) {
      const isOn = state && state.state === 'on';
      const attrs = (state && state.attributes) || {};
      const percentage = attrs.percentage != null ? attrs.percentage : (isOn ? 100 : 0);
      const toggle = body.querySelector('[data-ctrl="toggle"]');
      if (toggle) {
        toggle.classList.toggle('on', isOn);
        const lbl = toggle.querySelector('.big-toggle-label');
        if (lbl) lbl.textContent = isOn ? 'Ligado' : 'Desligado';
      }
      const slider = body.querySelector('[data-ctrl-range="speed"]');
      if (slider && document.activeElement !== slider) slider.value = percentage;
      const val = body.querySelector('[data-ctrl-fan-val]');
      if (val) val.textContent = `${percentage}%`;
    },
    handle(action, btn, device, state, modal) {
      if (action !== 'toggle') return;
      const isOn = state && state.state === 'on';
      modal._optimistic({ state: isOn ? 'off' : 'on' });
      modal._call('fan', isOn ? 'turn_off' : 'turn_on', { entity_id: device.entity });
    },
    range(name, input, device, state, modal) {
      if (name !== 'speed') return;
      const pct = Number(input.value) || 0;
      const val = modal._overlay.querySelector('[data-ctrl-fan-val]');
      if (val) val.textContent = `${pct}%`;
      clearTimeout(modal._rangeDebounce);
      modal._rangeDebounce = setTimeout(() => {
        if (pct === 0) {
          modal._optimistic({ state: 'off', attributes: { percentage: 0 } });
          modal._call('fan', 'turn_off', { entity_id: device.entity });
        } else {
          modal._optimistic({ state: 'on', attributes: { percentage: pct } });
          modal._call('fan', 'set_percentage', { entity_id: device.entity, percentage: pct });
        }
      }, 150);
    }
  },

  media_player: {
    body(device, state) {
      const attrs = (state && state.attributes) || {};
      const stateTxt = state ? state.state : 'off';
      const isPlaying = stateTxt === 'playing';
      const volume = attrs.volume_level != null ? Math.round(attrs.volume_level * 100) : 50;
      const title = attrs.media_title || attrs.friendly_name || '';
      const artist = attrs.media_artist || '';

      return `
        <div class="control-media">
          <div class="media-now">
            <div class="media-now-state">${_ctrlMediaLabel(stateTxt)}</div>
            ${title ? `<div class="media-now-title">${_ctrlEsc(title)}</div>` : ''}
            ${artist ? `<div class="media-now-sub">${_ctrlEsc(artist)}</div>` : ''}
          </div>
          <div class="media-transport">
            <button type="button" class="media-btn" data-ctrl="prev" aria-label="Anterior">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zM20 6l-10 6 10 6z"/></svg>
            </button>
            <button type="button" class="media-btn big ${isPlaying ? 'active' : ''}" data-ctrl="play-pause" aria-label="Play/Pause">
              ${isPlaying
                ? '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>'
                : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'
              }
            </button>
            <button type="button" class="media-btn" data-ctrl="next" aria-label="Próxima">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 6l10 6-10 6zM16 6h2v12h-2z"/></svg>
            </button>
          </div>
        </div>
        <div class="control-section">
          <div class="control-section-head">
            <span>Volume</span>
            <span class="control-section-val" data-ctrl-vol-val>${volume}%</span>
          </div>
          <input type="range" min="0" max="100" value="${volume}" data-ctrl-range="volume" class="control-range" />
        </div>
      `;
    },
    status(device, state) {
      return state ? _ctrlMediaLabel(state.state) : '—';
    },
    sync(body, device, state) {
      const attrs = (state && state.attributes) || {};
      const stateTxt = state ? state.state : 'off';
      const isPlaying = stateTxt === 'playing';
      const playBtn = body.querySelector('[data-ctrl="play-pause"]');
      if (playBtn) {
        playBtn.classList.toggle('active', isPlaying);
        playBtn.innerHTML = isPlaying
          ? '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
      }
      const stateEl = body.querySelector('.media-now-state');
      if (stateEl) stateEl.textContent = _ctrlMediaLabel(stateTxt);
      const slider = body.querySelector('[data-ctrl-range="volume"]');
      const volume = attrs.volume_level != null ? Math.round(attrs.volume_level * 100) : 50;
      if (slider && document.activeElement !== slider) slider.value = volume;
      const val = body.querySelector('[data-ctrl-vol-val]');
      if (val) val.textContent = `${volume}%`;
    },
    handle(action, btn, device, state, modal) {
      const map = { 'play-pause': 'media_play_pause', 'prev': 'media_previous_track', 'next': 'media_next_track', 'stop': 'media_stop' };
      const service = map[action];
      if (!service) return;
      if (action === 'play-pause') {
        const isPlaying = state && state.state === 'playing';
        modal._optimistic({ state: isPlaying ? 'paused' : 'playing' });
      }
      modal._call('media_player', service, { entity_id: device.entity });
    },
    range(name, input, device, state, modal) {
      if (name !== 'volume') return;
      const pct = Number(input.value) || 0;
      const val = modal._overlay.querySelector('[data-ctrl-vol-val]');
      if (val) val.textContent = `${pct}%`;
      clearTimeout(modal._rangeDebounce);
      modal._rangeDebounce = setTimeout(() => {
        modal._optimistic({ attributes: { volume_level: pct / 100 } });
        modal._call('media_player', 'volume_set', { entity_id: device.entity, volume_level: pct / 100 });
      }, 150);
    }
  }
};

/* ==================================================================
   Helpers
   ================================================================== */

function _ctrlBigToggle(isOn) {
  return `
    <button type="button" class="big-toggle ${isOn ? 'on' : ''}" data-ctrl="toggle">
      <div class="big-toggle-ring">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <path d="M12 2v10"/>
          <path d="M5.6 6.4a8 8 0 1 0 12.8 0"/>
        </svg>
      </div>
      <div class="big-toggle-label">${isOn ? 'Ligado' : 'Desligado'}</div>
    </button>
  `;
}

function _ctrlStateLabel(state) {
  if (!state || !state.state) return '—';
  const map = { on: 'Ligado', off: 'Desligado', unavailable: 'Indisponível', unknown: 'Desconhecido' };
  return map[state.state] || state.state;
}

function _ctrlMediaLabel(s) {
  const map = { playing: 'Tocando', paused: 'Pausado', idle: 'Ocioso', off: 'Desligado', on: 'Ligado' };
  return map[s] || s || '—';
}

function _ctrlEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function _ctrlRgbToHex(rgb) {
  if (!Array.isArray(rgb) || rgb.length < 3) return '#ffcc88';
  return '#' + rgb.slice(0, 3).map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

function _ctrlHexToRgb(hex) {
  const clean = hex.replace('#', '');
  const n = parseInt(clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function _ctrlColorPalette() {
  return [
    '#ffffff', '#ffe0b3', '#ffb870', '#ff8c42',
    '#ff4d6d', '#c9429d', '#7a4dff', '#3d6cff',
    '#1fb1ff', '#26d0a3', '#7ae06a', '#fff24d'
  ];
}

function _ctrlDomainIcon(type) {
  const icons = {
    switch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="8" width="18" height="8" rx="4"/><circle cx="9" cy="12" r="2.5" fill="currentColor" stroke="none"/></svg>',
    light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 1 4 10.5c-.7.6-1 1.3-1 2V16H9v-.5c0-.7-.3-1.4-1-2A6 6 0 0 1 12 3z"/></svg>',
    climate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 3v13"/><circle cx="12" cy="18" r="3"/><path d="M9 9h6"/><path d="M9 13h6"/></svg>',
    cover: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M4 9h16"/><path d="M4 15h16"/><path d="M12 3v18"/></svg>',
    fan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="2"/><path d="M12 10V4s4 0 4 4-4 2-4 2z"/><path d="M14 12h6s0 4-4 4-2-4-2-4z"/><path d="M12 14v6s-4 0-4-4 4-2 4-2z"/><path d="M10 12H4s0-4 4-4 2 4 2 4z"/></svg>',
    media_player: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>'
  };
  return icons[type] || icons.switch;
}
