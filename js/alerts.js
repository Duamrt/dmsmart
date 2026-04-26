// alerts.js — Sistema de alertas proativos dmsmart
// Monitora state_changed do HA e dispara push/telegram conforme regras configuradas
'use strict';

const AlertsManager = (() => {
  const STORAGE_KEY = 'dmsmart_alerts_cfg';
  const COOLDOWN_DEFAULT_MIN = 30;
  // Cooldown por instalação — sem isso, alerta de uma instalação silencia outra
  const _cdKey = () => 'dmsmart_alerts_cooldown_' + (_installId || 'default');

  let _el = null;          // section do painel de config
  let _unsubState = null;  // unsub do HAClient.onStateChanged
  let _installId = null;

  // ── Estrutura default de config ─────────────────────────────────────────
  const _defaultCfg = () => ({
    rules: {
      offline:     { enabled: true,  watchAll: false, cooldownMin: 30 },
      alarm:       { enabled: true,  cooldownMin: 5  },
      consumption: { enabled: false, thresholdW: 3000, entityId: '', cooldownMin: 60 }
    },
    channels: {
      push:     { enabled: true },
      telegram: { enabled: false, chatId: '', botToken: '' }
    }
  });

  // ── Config I/O ──────────────────────────────────────────────────────────
  function _cfgKey() {
    return _installId ? STORAGE_KEY + '_' + _installId : STORAGE_KEY;
  }

  function _loadCfg() {
    try {
      const raw = localStorage.getItem(_cfgKey());
      if (!raw) return _defaultCfg();
      const saved = JSON.parse(raw);
      // deep merge com defaults pra garantir todas as chaves
      const d = _defaultCfg();
      return {
        rules: {
          offline:     { ...d.rules.offline,     ...((saved.rules || {}).offline     || {}) },
          alarm:       { ...d.rules.alarm,       ...((saved.rules || {}).alarm       || {}) },
          consumption: { ...d.rules.consumption, ...((saved.rules || {}).consumption || {}) }
        },
        channels: {
          push:     { ...d.channels.push,     ...((saved.channels || {}).push     || {}) },
          telegram: { ...d.channels.telegram, ...((saved.channels || {}).telegram || {}) }
        }
      };
    } catch { return _defaultCfg(); }
  }

  function _saveCfg(cfg) {
    localStorage.setItem(_cfgKey(), JSON.stringify(cfg));
  }

  // ── Cooldown I/O ────────────────────────────────────────────────────────
  function _getCooldowns() {
    try { return JSON.parse(localStorage.getItem(_cdKey()) || '{}'); } catch { return {}; }
  }

  function _isInCooldown(key, cooldownMin) {
    const cd = _getCooldowns();
    if (!cd[key]) return false;
    const elapsed = (Date.now() - cd[key]) / 60000;
    return elapsed < cooldownMin;
  }

  function _setCooldown(key) {
    const cd = _getCooldowns();
    cd[key] = Date.now();
    localStorage.setItem(_cdKey(), JSON.stringify(cd));
  }

  // ── Inicialização do monitor ────────────────────────────────────────────
  function init(el, installId) {
    _el = el;
    _installId = installId;
    _startMonitor();
  }

  function _startMonitor() {
    if (_unsubState) _unsubState();
    if (typeof HAClient === 'undefined') return;
    _unsubState = HAClient.onStateChanged((entityId, newState) => {
      _checkState(entityId, newState);
    });
  }

  function _checkState(entityId, newState) {
    const cfg = _loadCfg();
    const state = newState ? (newState.state || '').toLowerCase() : 'unavailable';

    // ── Regra 1: dispositivo offline ─────────────────────────────────────
    if (cfg.rules.offline.enabled) {
      const isOffline = state === 'unavailable' || state === 'unknown' || !newState;
      if (isOffline) {
        const zone = typeof ZoneRegistry !== 'undefined' ? ZoneRegistry.findZoneByEntity(entityId) : null;
        const device = zone ? zone.devices.find(d => d.entity === entityId) : null;
        const shouldAlert = cfg.rules.offline.watchAll || (device && device.isCritical);
        if (shouldAlert && !_isInCooldown('offline_' + entityId, cfg.rules.offline.cooldownMin)) {
          const name = (newState && newState.attributes && newState.attributes.friendly_name)
            || (device && device.name) || entityId;
          const zoneName = zone ? zone.name : '';
          _sendAlert(cfg, 'offline', entityId, {
            title: 'Dispositivo offline',
            body: `${name}${zoneName ? ' (' + zoneName + ')' : ''} ficou inacessível`,
            tag: 'offline_' + entityId,
            icon: '/icons/icon-192.png',
            emoji: '🔴'
          });
          _setCooldown('offline_' + entityId);
        }
      }
    }

    // ── Regra 2: alarme ativado ───────────────────────────────────────────
    if (cfg.rules.alarm.enabled && entityId.startsWith('alarm_control_panel.')) {
      const alertStates = ['triggered', 'armed_away', 'armed_home', 'armed_night', 'armed_vacation'];
      if (alertStates.includes(state)) {
        const cdKey = 'alarm_' + entityId + '_' + state;
        if (!_isInCooldown(cdKey, cfg.rules.alarm.cooldownMin)) {
          const name = (newState && newState.attributes && newState.attributes.friendly_name) || entityId;
          const stateLabels = {
            triggered: 'ALARME DISPARADO',
            armed_away: 'Armado — ausente',
            armed_home: 'Armado — em casa',
            armed_night: 'Armado — noturno',
            armed_vacation: 'Armado — viagem'
          };
          _sendAlert(cfg, 'alarm', entityId, {
            title: stateLabels[state] || 'Alarme',
            body: name,
            tag: 'alarm_' + entityId,
            icon: '/icons/icon-192.png',
            emoji: state === 'triggered' ? '🚨' : '🔒'
          });
          _setCooldown(cdKey);
        }
      }
    }

    // ── Regra 3: consumo acima do limite ──────────────────────────────────
    if (cfg.rules.consumption.enabled && cfg.rules.consumption.entityId === entityId) {
      const val = parseFloat(newState ? newState.state : 'NaN');
      if (!isNaN(val)) {
        let valueW = val;
        const unit = (newState && newState.attributes && newState.attributes.unit_of_measurement) || '';
        if (unit === 'kW') valueW = val * 1000;
        if (valueW > cfg.rules.consumption.thresholdW) {
          if (!_isInCooldown('consumption_' + entityId, cfg.rules.consumption.cooldownMin)) {
            const name = (newState && newState.attributes && newState.attributes.friendly_name) || entityId;
            _sendAlert(cfg, 'consumption', entityId, {
              title: 'Consumo elevado',
              body: `${name}: ${val.toFixed(1)} ${unit} (limite: ${cfg.rules.consumption.thresholdW}W)`,
              tag: 'consumption_' + entityId,
              icon: '/icons/icon-192.png',
              emoji: '⚡'
            });
            _setCooldown('consumption_' + entityId);
          }
        }
      }
    }
  }

  // ── Envio de alerta ─────────────────────────────────────────────────────
  async function _sendAlert(cfg, ruleType, entityId, { title, body, tag, icon, emoji }) {
    console.log(`[alerts] ${emoji} ${title}: ${body}`);

    // Toast in-app sempre
    if (typeof _showToast === 'function') {
      _showToast(`${emoji} ${title}: ${body}`, ruleType === 'alarm' && title.includes('DISPARADO') ? 'error' : 'warn');
    }

    // Push
    if (cfg.channels.push.enabled) {
      await _sendPush(title, body, tag, icon);
    }

    // Telegram
    if (cfg.channels.telegram.enabled && cfg.channels.telegram.chatId && cfg.channels.telegram.botToken) {
      await _sendTelegram(cfg.channels.telegram.botToken, cfg.channels.telegram.chatId, `${emoji} *${title}*\n${body}`);
    }
  }

  async function _sendPush(title, body, tag, icon) {
    if (!_installId) return;
    try {
      const { data: { session } } = await SUPA.auth.getSession();
      const token = session ? session.access_token : (typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '');
      const { data: cfgData } = await SUPA.from('configurations').select('value').eq('key', 'supabase_url').maybeSingle().catch(() => ({ data: null }));
      const supaUrl = (typeof SUPA !== 'undefined' && SUPA.supabaseUrl) || '';
      const fnUrl = supaUrl.replace('supabase.co', 'supabase.co') + '/functions/v1/send-push';
      await fetch(fnUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ installation_id: _installId, title, body, tag, icon })
      });
    } catch (err) {
      console.warn('[alerts] push falhou:', err.message);
    }
  }

  async function _sendTelegram(botToken, chatId, text) {
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
      });
    } catch (err) {
      console.warn('[alerts] telegram falhou:', err.message);
    }
  }

  // ── Painel de configuração ──────────────────────────────────────────────
  function load() {
    if (!_el) return;
    _renderPanel();
  }

  function _renderPanel() {
    const cfg = _loadCfg();

    // Detecta sensores de consumo disponíveis
    const powerSensors = [];
    if (typeof HAClient !== 'undefined' && HAClient._allStates) {
      for (const s of HAClient._allStates) {
        const unit = (s.attributes && s.attributes.unit_of_measurement) || '';
        const dc   = (s.attributes && s.attributes.device_class) || '';
        if (dc === 'power' || unit === 'W' || unit === 'kW') {
          powerSensors.push({ entity_id: s.entity_id, name: (s.attributes && s.attributes.friendly_name) || s.entity_id });
        }
      }
    }

    const powerOptions = powerSensors.length
      ? powerSensors.map(s => `<option value="${_esc(s.entity_id)}" ${cfg.rules.consumption.entityId === s.entity_id ? 'selected' : ''}>${_esc(s.name)}</option>`).join('')
      : '<option value="">Nenhum sensor detectado</option>';

    _el.innerHTML = `
      <div class="alrt-wrap">
        <div class="alrt-section">
          <div class="alrt-section-title">Regras de alerta</div>

          <div class="alrt-rule">
            <div class="alrt-rule-head">
              <label class="alrt-toggle">
                <input type="checkbox" id="alrt-offline-en" ${cfg.rules.offline.enabled ? 'checked' : ''}>
                <span class="alrt-toggle-slider"></span>
              </label>
              <div class="alrt-rule-info">
                <div class="alrt-rule-name">🔴 Dispositivo offline</div>
                <div class="alrt-rule-sub">Alerta quando um dispositivo fica inacessível</div>
              </div>
            </div>
            <div class="alrt-rule-body" id="alrt-offline-body" style="${cfg.rules.offline.enabled ? '' : 'display:none'}">
              <label class="alrt-check-label">
                <input type="checkbox" id="alrt-offline-all" ${cfg.rules.offline.watchAll ? 'checked' : ''}>
                Monitorar todos os dispositivos (não só críticos)
              </label>
              <div class="alrt-field-row">
                <label>Cooldown</label>
                <input type="number" id="alrt-offline-cd" class="alrt-number" value="${cfg.rules.offline.cooldownMin}" min="1" max="1440"> min
              </div>
            </div>
          </div>

          <div class="alrt-rule">
            <div class="alrt-rule-head">
              <label class="alrt-toggle">
                <input type="checkbox" id="alrt-alarm-en" ${cfg.rules.alarm.enabled ? 'checked' : ''}>
                <span class="alrt-toggle-slider"></span>
              </label>
              <div class="alrt-rule-info">
                <div class="alrt-rule-name">🚨 Alarme ativado</div>
                <div class="alrt-rule-sub">Disparo ou armação do sistema de alarme</div>
              </div>
            </div>
            <div class="alrt-rule-body" id="alrt-alarm-body" style="${cfg.rules.alarm.enabled ? '' : 'display:none'}">
              <div class="alrt-field-row">
                <label>Cooldown</label>
                <input type="number" id="alrt-alarm-cd" class="alrt-number" value="${cfg.rules.alarm.cooldownMin}" min="1" max="1440"> min
              </div>
            </div>
          </div>

          <div class="alrt-rule">
            <div class="alrt-rule-head">
              <label class="alrt-toggle">
                <input type="checkbox" id="alrt-cons-en" ${cfg.rules.consumption.enabled ? 'checked' : ''}>
                <span class="alrt-toggle-slider"></span>
              </label>
              <div class="alrt-rule-info">
                <div class="alrt-rule-name">⚡ Consumo elevado</div>
                <div class="alrt-rule-sub">Sensor de potência ultrapassa o limite definido</div>
              </div>
            </div>
            <div class="alrt-rule-body" id="alrt-cons-body" style="${cfg.rules.consumption.enabled ? '' : 'display:none'}">
              <div class="alrt-field-row">
                <label>Sensor</label>
                <select id="alrt-cons-entity" class="alrt-select">${powerOptions}</select>
              </div>
              <div class="alrt-field-row">
                <label>Limite</label>
                <input type="number" id="alrt-cons-thresh" class="alrt-number" value="${cfg.rules.consumption.thresholdW}" min="100" max="100000"> W
              </div>
              <div class="alrt-field-row">
                <label>Cooldown</label>
                <input type="number" id="alrt-cons-cd" class="alrt-number" value="${cfg.rules.consumption.cooldownMin}" min="1" max="1440"> min
              </div>
            </div>
          </div>
        </div>

        <div class="alrt-section">
          <div class="alrt-section-title">Canais de notificação</div>

          <div class="alrt-rule">
            <div class="alrt-rule-head">
              <label class="alrt-toggle">
                <input type="checkbox" id="alrt-push-en" ${cfg.channels.push.enabled ? 'checked' : ''}>
                <span class="alrt-toggle-slider"></span>
              </label>
              <div class="alrt-rule-info">
                <div class="alrt-rule-name">🔔 Push notification</div>
                <div class="alrt-rule-sub" id="alrt-push-sub">Notificações do navegador/PWA</div>
              </div>
            </div>
          </div>

          <div class="alrt-rule">
            <div class="alrt-rule-head">
              <label class="alrt-toggle">
                <input type="checkbox" id="alrt-tg-en" ${cfg.channels.telegram.enabled ? 'checked' : ''}>
                <span class="alrt-toggle-slider"></span>
              </label>
              <div class="alrt-rule-info">
                <div class="alrt-rule-name">✈️ Telegram</div>
                <div class="alrt-rule-sub">Bot Telegram — token fica só neste dispositivo</div>
              </div>
            </div>
            <div class="alrt-rule-body" id="alrt-tg-body" style="${cfg.channels.telegram.enabled ? '' : 'display:none'}">
              <div class="alrt-field-col">
                <label>Bot Token <span class="alrt-hint">@BotFather → /newbot</span></label>
                <input type="password" id="alrt-tg-token" class="alrt-input" placeholder="123456:ABCdef…" value="${_esc(cfg.channels.telegram.botToken)}" autocomplete="off">
              </div>
              <div class="alrt-field-col">
                <label>Chat ID <span class="alrt-hint">Seu ID ou ID do grupo</span></label>
                <input type="text" id="alrt-tg-chatid" class="alrt-input" placeholder="ex: 123456789" value="${_esc(cfg.channels.telegram.chatId)}">
              </div>
              <div class="alrt-field-row alrt-tg-actions">
                <button class="alrt-btn-secondary" id="alrt-tg-help">Como obter o Chat ID?</button>
                <button class="alrt-btn-test" id="alrt-tg-test">Testar envio</button>
              </div>
              <div id="alrt-tg-feedback" class="alrt-feedback"></div>
            </div>
          </div>
        </div>

        <div class="alrt-save-row">
          <button class="alrt-btn-save" id="alrt-save">Salvar configurações</button>
        </div>
      </div>`;

    _bindEvents(cfg);
    _updatePushStatus();
  }

  function _bindEvents(cfg) {
    // Toggle expandir/colapsar regras
    [
      ['alrt-offline-en', 'alrt-offline-body'],
      ['alrt-alarm-en',   'alrt-alarm-body'],
      ['alrt-cons-en',    'alrt-cons-body'],
      ['alrt-tg-en',      'alrt-tg-body'],
    ].forEach(([checkId, bodyId]) => {
      const check = _el.querySelector('#' + checkId);
      const body  = _el.querySelector('#' + bodyId);
      if (check && body) {
        check.addEventListener('change', () => {
          body.style.display = check.checked ? '' : 'none';
        });
      }
    });

    // Ajuda Chat ID
    const helpBtn = _el.querySelector('#alrt-tg-help');
    if (helpBtn) {
      helpBtn.addEventListener('click', () => {
        const fb = _el.querySelector('#alrt-tg-feedback');
        if (fb) {
          fb.className = 'alrt-feedback alrt-feedback--info';
          fb.textContent = '1. Inicie conversa com seu bot. 2. Acesse: api.telegram.org/bot{TOKEN}/getUpdates. 3. Copie o "id" dentro de "chat".';
        }
      });
    }

    // Testar Telegram
    const testBtn = _el.querySelector('#alrt-tg-test');
    if (testBtn) {
      testBtn.addEventListener('click', async () => {
        const token  = _el.querySelector('#alrt-tg-token').value.trim();
        const chatId = _el.querySelector('#alrt-tg-chatid').value.trim();
        const fb = _el.querySelector('#alrt-tg-feedback');
        if (!token || !chatId) {
          if (fb) { fb.className = 'alrt-feedback alrt-feedback--error'; fb.textContent = 'Preencha o Token e o Chat ID.'; }
          return;
        }
        testBtn.disabled = true;
        testBtn.textContent = 'Enviando…';
        try {
          const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: '✅ *dmsmart* — Telegram configurado com sucesso!', parse_mode: 'Markdown' })
          });
          const json = await res.json();
          if (json.ok) {
            if (fb) { fb.className = 'alrt-feedback alrt-feedback--ok'; fb.textContent = 'Mensagem enviada! Telegram configurado.'; }
          } else {
            if (fb) { fb.className = 'alrt-feedback alrt-feedback--error'; fb.textContent = 'Erro: ' + (json.description || 'verifique token e chat_id'); }
          }
        } catch (err) {
          if (fb) { fb.className = 'alrt-feedback alrt-feedback--error'; fb.textContent = 'Falha na conexão: ' + err.message; }
        }
        testBtn.disabled = false;
        testBtn.textContent = 'Testar envio';
      });
    }

    // Salvar
    const saveBtn = _el.querySelector('#alrt-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const newCfg = _collectForm();
        _saveCfg(newCfg);
        saveBtn.textContent = 'Salvo!';
        setTimeout(() => { saveBtn.textContent = 'Salvar configurações'; }, 1500);
        if (typeof _showToast === 'function') _showToast('Alertas salvos', 'success');
      });
    }
  }

  function _collectForm() {
    const g = (id) => { const el = _el && _el.querySelector('#' + id); return el ? el.value : ''; };
    const c = (id) => { const el = _el && _el.querySelector('#' + id); return el ? el.checked : false; };
    return {
      rules: {
        offline:     { enabled: c('alrt-offline-en'), watchAll: c('alrt-offline-all'), cooldownMin: parseInt(g('alrt-offline-cd')) || 30 },
        alarm:       { enabled: c('alrt-alarm-en'),   cooldownMin: parseInt(g('alrt-alarm-cd'))   || 5  },
        consumption: { enabled: c('alrt-cons-en'),    thresholdW: parseInt(g('alrt-cons-thresh')) || 3000, entityId: g('alrt-cons-entity'), cooldownMin: parseInt(g('alrt-cons-cd')) || 60 }
      },
      channels: {
        push:     { enabled: c('alrt-push-en') },
        telegram: { enabled: c('alrt-tg-en'), chatId: g('alrt-tg-chatid').trim(), botToken: g('alrt-tg-token').trim() }
      }
    };
  }

  function _updatePushStatus() {
    const sub = _el && _el.querySelector('#alrt-push-sub');
    if (!sub) return;
    if (typeof PushManager === 'undefined') { sub.textContent = 'Push não disponível'; return; }
    const status = PushManager.getStatus();
    const labels = { granted: 'Ativas neste dispositivo', denied: 'Bloqueadas — habilite nas configurações', default: 'Clique no botão de notificações na barra lateral', unsupported: 'Não suportado neste browser' };
    sub.textContent = labels[status] || '';
  }

  function _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return { init, load };
})();
