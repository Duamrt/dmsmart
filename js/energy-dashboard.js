// energy-dashboard.js — Painel de Energia dmsmart
// Consumo rede · Geração solar · Custo · ROI · Histórico
'use strict';
const EnergyDashboard = (() => {
  const STORAGE_KEY = 'dmsmart_energy_cfg';

  let _el = null;
  let _cfg = {};
  let _unsubAll = null;
  let _chartData = { labels: [], grid: [], solar: [], net: [] };

  // ── Public ─────────────────────────────────────────────────────────────
  function init(el) { _el = el; }

  async function load() {
    if (!_el) return;
    _cfg = _loadCfg();
    if (_unsubAll) { _unsubAll(); _unsubAll = null; }

    _el.innerHTML = '<div class="enrg-loading"><div class="enrg-spinner"></div>Carregando dados de energia…</div>';

    const sensors = _detectSensors();
    _render(sensors);

    // Subscreve todas as mudanças de estado
    if (typeof StateStore !== 'undefined') {
      _unsubAll = StateStore.subscribeAll(() => {
        _updateKpis();
        _updateRanking();
      });
    }

    await _loadChartData();
    _drawChart();
  }

  // ── Config ─────────────────────────────────────────────────────────────
  function _cfgKey() {
    const inst = typeof ActiveInstallation !== 'undefined' ? ActiveInstallation.get() : null;
    return inst ? STORAGE_KEY + '_' + inst.id : STORAGE_KEY;
  }
  function _loadCfg() {
    try { return JSON.parse(localStorage.getItem(_cfgKey()) || '{}'); } catch { return {}; }
  }
  function _saveCfg() {
    try { localStorage.setItem(_cfgKey(), JSON.stringify(_cfg)); } catch {}
  }

  // ── Sensor detection ───────────────────────────────────────────────────
  function _detectSensors() {
    const power = [], energy = [];
    if (typeof HAClient === 'undefined' || !HAClient._allStates) return { power, energy };
    for (const s of HAClient._allStates) {
      const dc   = s.attributes?.device_class;
      const unit = s.attributes?.unit_of_measurement || '';
      const val  = parseFloat(s.state);
      if (isNaN(val) || s.state === 'unavailable' || s.state === 'unknown') continue;
      const rec = { entity_id: s.entity_id, name: s.attributes.friendly_name || s.entity_id, value: val, unit };
      if (dc === 'power' || unit === 'W' || unit === 'kW')    power.push(rec);
      else if (dc === 'energy' || unit === 'kWh' || unit === 'Wh') energy.push(rec);
    }
    power.sort((a, b) => _toKW(b.value, b.unit) - _toKW(a.value, a.unit));
    return { power, energy };
  }

  function _toKW(val, unit) {
    if (val === null || val === undefined) return 0;
    return unit === 'W' ? val / 1000 : Number(val);
  }

  function _getKW(entityId, unitFallback) {
    if (!entityId || typeof StateStore === 'undefined') return null;
    const s = StateStore.get(entityId);
    if (!s) return null;
    const v = parseFloat(s.state);
    if (isNaN(v)) return null;
    const unit = s.attributes?.unit_of_measurement || unitFallback || 'kW';
    return _toKW(v, unit);
  }

  // ── Tariff ─────────────────────────────────────────────────────────────
  const FLAGS = {
    verde:     { label: 'Verde',       color: '#22c55e', extra: 0 },
    amarela:   { label: 'Amarela',     color: '#eab308', extra: 0.01874 },
    vermelha1: { label: 'Vermelha P1', color: '#ef4444', extra: 0.03971 },
    vermelha2: { label: 'Vermelha P2', color: '#dc2626', extra: 0.09492 },
  };

  function _tariff() {
    const base  = parseFloat(_cfg.tariffBase) || 0.75;
    const flag  = FLAGS[_cfg.tariffFlag || 'verde'] || FLAGS.verde;
    return { base, flag, total: base + flag.extra };
  }

  // ── Render ─────────────────────────────────────────────────────────────
  function _render(sensors) {
    const gridKW  = _getKW(_cfg.gridEntity,  _cfg.gridUnit)  ?? 0;
    const solarKW = _getKW(_cfg.solarEntity, _cfg.solarUnit) ?? 0;
    const netKW   = solarKW - gridKW;
    const t       = _tariff();

    const now          = new Date();
    const daysElapsed  = now.getDate() + now.getHours() / 24;
    const daysInMonth  = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const costMonth    = gridKW > 0 ? gridKW * 24 * daysElapsed * t.total : 0;
    const costProj     = gridKW > 0 ? costMonth / daysElapsed * daysInMonth : 0;

    const invest    = parseFloat(_cfg.solarInvest)    || 0;
    const avgDailyKwh = solarKW * 5;
    const annualSave  = avgDailyKwh * 365 * t.total;
    const payback     = invest > 0 && annualSave > 0 ? invest / annualSave : null;

    const haGrid  = !!_cfg.gridEntity;
    const hasSolar = !!_cfg.solarEntity;

    _el.innerHTML = `
<div class="enrg-wrap">

  ${!haGrid ? `<div class="enrg-config-hint">
    <svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
    Configure os sensores para ver dados em tempo real.
    <button type="button" class="enrg-cfg-link" data-enrg-open-cfg>Configurar agora →</button>
  </div>` : ''}

  <!-- KPIs -->
  <div class="enrg-kpi-row">
    <div class="enrg-kpi enrg-kpi--grid">
      <div class="enrg-kpi-icon"><svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div>
      <div class="enrg-kpi-body">
        <div class="enrg-kpi-val" id="enrg-grid-val">${haGrid ? gridKW.toFixed(2) : '—'}</div>
        <div class="enrg-kpi-unit">kW</div>
        <div class="enrg-kpi-label">Consumo da rede</div>
      </div>
    </div>
    <div class="enrg-kpi enrg-kpi--solar">
      <div class="enrg-kpi-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg></div>
      <div class="enrg-kpi-body">
        <div class="enrg-kpi-val" id="enrg-solar-val">${hasSolar ? solarKW.toFixed(2) : '—'}</div>
        <div class="enrg-kpi-unit">kW</div>
        <div class="enrg-kpi-label">Geração solar</div>
      </div>
    </div>
    <div class="enrg-kpi enrg-kpi--net${netKW >= 0 ? ' enrg-kpi--surplus' : ' enrg-kpi--deficit'}" id="enrg-net-card">
      <div class="enrg-kpi-icon"><svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div>
      <div class="enrg-kpi-body">
        <div class="enrg-kpi-val" id="enrg-net-val">${(haGrid || hasSolar) ? (netKW >= 0 ? '+' : '') + netKW.toFixed(2) : '—'}</div>
        <div class="enrg-kpi-unit">kW</div>
        <div class="enrg-kpi-label">Saldo líquido</div>
      </div>
    </div>
    <div class="enrg-kpi enrg-kpi--cost">
      <div class="enrg-kpi-icon"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.88 14.91v.94h-1.75v-.94c-1.12-.24-2.07-.96-2.14-2.23h1.28c.06.69.54 1.23 1.74 1.23 1.28 0 1.57-.64 1.57-1.04 0-.54-.29-1.05-1.75-1.4-1.63-.4-2.74-1.06-2.74-2.4 0-1.13.91-1.86 2.04-2.11V8h1.75v.96c1.22.3 1.83 1.22 1.87 2.22H13.5c-.03-.73-.42-1.23-1.46-1.23-.98 0-1.57.45-1.57 1.07 0 .55.43.91 1.75 1.25 1.35.36 2.74.91 2.74 2.56-.01 1.2-.91 1.85-2.08 2.08z"/></svg></div>
      <div class="enrg-kpi-body">
        <div class="enrg-kpi-val" id="enrg-cost-val">${haGrid && costMonth > 0 ? 'R$&nbsp;' + costMonth.toFixed(0) : '—'}</div>
        <div class="enrg-kpi-unit" id="enrg-cost-unit">${haGrid && costProj > 0 ? 'proj. R$&nbsp;' + costProj.toFixed(0) : 'estimado'}</div>
        <div class="enrg-kpi-label">Custo do mês</div>
      </div>
    </div>
  </div>

  <!-- Bandeira tarifária -->
  <div class="enrg-flag-bar">
    <div class="enrg-flag-dot" style="background:${t.flag.color}" id="enrg-flag-dot"></div>
    <div class="enrg-flag-info">
      Bandeira <strong id="enrg-flag-name">${t.flag.label}</strong>
      <span class="enrg-flag-rate" id="enrg-flag-rate">· R$ ${t.total.toFixed(5)}/kWh</span>
    </div>
    <button type="button" class="enrg-flag-edit" data-enrg-open-cfg>Editar configurações ↗</button>
  </div>

  <!-- Chart + Side -->
  <div class="enrg-main-row">
    <div class="enrg-chart-card">
      <div class="enrg-chart-head">
        <div class="enrg-chart-title">Consumo × Geração — últimas 24h</div>
        <div class="enrg-chart-legend">
          <span class="enrg-leg enrg-leg--grid"><span></span>Rede</span>
          <span class="enrg-leg enrg-leg--solar"><span></span>Solar</span>
          <span class="enrg-leg enrg-leg--net"><span></span>Saldo</span>
        </div>
      </div>
      <div class="enrg-chart-body" id="enrg-chart-body">
        <div class="enrg-chart-wait">Carregando histórico…</div>
      </div>
    </div>

    <div class="enrg-side-col">
      <div class="enrg-ranking-card">
        <div class="enrg-card-head">
          <svg viewBox="0 0 24 24"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
          Maiores consumidores
        </div>
        <div id="enrg-ranking">${_renderRanking(sensors.power)}</div>
      </div>

      <div class="enrg-roi-card">
        <div class="enrg-card-head">
          <svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M18 9l-5 5-4-4-3 3"/></svg>
          ROI Solar
        </div>
        <div id="enrg-roi-body">${_renderROI(invest, annualSave, payback, hasSolar)}</div>
      </div>
    </div>
  </div>

  <!-- Comparativo mensal -->
  <div class="enrg-compare-card">
    <div class="enrg-card-head">
      <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M8 4v6M16 4v6"/></svg>
      Comparativo mensal
    </div>
    <div id="enrg-compare">${_renderCompare(costMonth, costProj, daysElapsed, daysInMonth)}</div>
  </div>

</div>

<!-- Modal config -->
<div class="enrg-modal hidden" id="enrg-modal">
  <div class="enrg-modal-card">
    <div class="enrg-modal-head">
      Configurar Energia
      <button type="button" id="enrg-modal-close">×</button>
    </div>
    <div class="enrg-modal-body">
      <div class="enrg-form-group">
        <label>Sensor de consumo da rede</label>
        <select id="enrg-sel-grid">
          <option value="">— não configurado —</option>
          ${sensors.power.map(s => `<option value="${s.entity_id}" ${_cfg.gridEntity === s.entity_id ? 'selected' : ''}>${s.name} (${_toKW(s.value, s.unit).toFixed(2)} kW)</option>`).join('')}
        </select>
      </div>
      <div class="enrg-form-group">
        <label>Sensor de geração solar</label>
        <select id="enrg-sel-solar">
          <option value="">— não configurado —</option>
          ${sensors.power.map(s => `<option value="${s.entity_id}" ${_cfg.solarEntity === s.entity_id ? 'selected' : ''}>${s.name} (${_toKW(s.value, s.unit).toFixed(2)} kW)</option>`).join('')}
        </select>
      </div>
      <div class="enrg-form-row">
        <div class="enrg-form-group">
          <label>Tarifa base (R$/kWh)</label>
          <input type="number" id="enrg-inp-tariff" value="${parseFloat(_cfg.tariffBase) || 0.75}" step="0.001" min="0" placeholder="0.75">
        </div>
        <div class="enrg-form-group">
          <label>Bandeira tarifária</label>
          <select id="enrg-sel-flag">
            ${Object.entries(FLAGS).map(([k, v]) => `<option value="${k}" ${(_cfg.tariffFlag || 'verde') === k ? 'selected' : ''}>${v.label}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="enrg-form-sep">Painel solar</div>
      <div class="enrg-form-row">
        <div class="enrg-form-group">
          <label>Investimento total (R$)</label>
          <input type="number" id="enrg-inp-invest" value="${parseFloat(_cfg.solarInvest) || ''}" placeholder="ex: 25000">
        </div>
        <div class="enrg-form-group">
          <label>Capacidade (kWp)</label>
          <input type="number" id="enrg-inp-cap" value="${parseFloat(_cfg.solarCapacity) || ''}" step="0.1" placeholder="ex: 5.0">
        </div>
      </div>
    </div>
    <div class="enrg-modal-foot">
      <button type="button" id="enrg-modal-cancel">Cancelar</button>
      <button type="button" id="enrg-modal-save" class="enrg-modal-save">Salvar</button>
    </div>
  </div>
</div>`;

    _bindEvents(sensors);
  }

  // ── Sub-renders ─────────────────────────────────────────────────────────
  function _renderRanking(sensors) {
    if (!sensors || sensors.length === 0)
      return '<div class="enrg-rank-empty">Nenhum sensor de potência detectado</div>';
    const top = sensors.slice(0, 6);
    const maxKW = _toKW(top[0].value, top[0].unit) || 0.01;
    return top.map((s, i) => {
      const kw  = _toKW(s.value, s.unit);
      const pct = Math.round(kw / maxKW * 100);
      return `<div class="enrg-rank-item">
        <div class="enrg-rank-num">${i + 1}</div>
        <div class="enrg-rank-body">
          <div class="enrg-rank-name">${s.name}</div>
          <div class="enrg-rank-bar"><div class="enrg-rank-fill" style="width:${pct}%"></div></div>
        </div>
        <div class="enrg-rank-val">${kw.toFixed(2)} kW</div>
      </div>`;
    }).join('');
  }

  function _renderROI(invest, annualSave, payback, hasSolar) {
    if (!hasSolar || invest === 0)
      return `<div class="enrg-roi-empty">Configure o sensor solar e o investimento para ver o retorno.
        <button type="button" class="enrg-cfg-link" data-enrg-open-cfg>Configurar →</button></div>`;
    const years  = payback ? Math.floor(payback) : null;
    const months = payback ? Math.round((payback % 1) * 12) : null;
    const pbLabel = years !== null ? `${years}a ${months}m` : '—';
    return `<div class="enrg-roi-grid">
      <div class="enrg-roi-item">
        <div class="enrg-roi-val">R$&nbsp;${(annualSave / 12).toFixed(0)}</div>
        <div class="enrg-roi-lbl">Economia/mês</div>
      </div>
      <div class="enrg-roi-item">
        <div class="enrg-roi-val">R$&nbsp;${annualSave.toFixed(0)}</div>
        <div class="enrg-roi-lbl">Economia/ano</div>
      </div>
      <div class="enrg-roi-item">
        <div class="enrg-roi-val enrg-roi-payback">${pbLabel}</div>
        <div class="enrg-roi-lbl">Payback estimado</div>
      </div>
    </div>`;
  }

  function _renderCompare(costMonth, costProj, daysElapsed, daysInMonth) {
    if (costMonth === 0)
      return '<div class="enrg-compare-hint">Configure o sensor de rede para ver o comparativo de custos.</div>';
    const pct = Math.round(daysElapsed / daysInMonth * 100);
    return `<div class="enrg-compare-wrap">
      <div class="enrg-compare-item">
        <div class="enrg-compare-lbl">Gasto até hoje</div>
        <div class="enrg-compare-val">R$&nbsp;${costMonth.toFixed(2)}</div>
        <div class="enrg-compare-bar"><div class="enrg-compare-fill" style="width:${pct}%"></div></div>
        <div class="enrg-compare-sub">${daysElapsed.toFixed(0)} de ${daysInMonth} dias (${pct}%)</div>
      </div>
      <div class="enrg-compare-item">
        <div class="enrg-compare-lbl">Projeção para o mês</div>
        <div class="enrg-compare-val enrg-compare-proj">R$&nbsp;${costProj.toFixed(2)}</div>
        <div class="enrg-compare-bar"><div class="enrg-compare-fill enrg-compare-fill--proj" style="width:100%"></div></div>
        <div class="enrg-compare-sub">com base no consumo atual</div>
      </div>
    </div>`;
  }

  // ── Live updates ────────────────────────────────────────────────────────
  function _updateKpis() {
    const gridKW  = _getKW(_cfg.gridEntity,  _cfg.gridUnit);
    const solarKW = _getKW(_cfg.solarEntity, _cfg.solarUnit);
    const netKW   = (solarKW ?? 0) - (gridKW ?? 0);
    const t       = _tariff();

    const now         = new Date();
    const daysElapsed = now.getDate() + now.getHours() / 24;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const costMonth   = gridKW !== null ? (gridKW * 24 * daysElapsed * t.total) : 0;
    const costProj    = daysElapsed > 0 ? costMonth / daysElapsed * daysInMonth : 0;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerHTML = val; };
    if (gridKW  !== null) set('enrg-grid-val',  gridKW.toFixed(2));
    if (solarKW !== null) set('enrg-solar-val', solarKW.toFixed(2));
    if (gridKW !== null || solarKW !== null) {
      set('enrg-net-val', (netKW >= 0 ? '+' : '') + netKW.toFixed(2));
      const card = document.getElementById('enrg-net-card');
      if (card) {
        card.classList.toggle('enrg-kpi--surplus', netKW >= 0);
        card.classList.toggle('enrg-kpi--deficit', netKW < 0);
      }
    }
    if (gridKW !== null && costMonth > 0) {
      set('enrg-cost-val',  'R$&nbsp;' + costMonth.toFixed(0));
      set('enrg-cost-unit', 'proj. R$&nbsp;' + costProj.toFixed(0));
    }
  }

  function _updateRanking() {
    const el = document.getElementById('enrg-ranking');
    if (!el) return;
    el.innerHTML = _renderRanking(_detectSensors().power);
  }

  // ── Chart ───────────────────────────────────────────────────────────────
  async function _loadChartData() {
    if (!_cfg.gridEntity && !_cfg.solarEntity) {
      _showChartMsg('Configure os sensores para ver o gráfico histórico.');
      return;
    }
    const inst  = typeof ActiveInstallation !== 'undefined' ? ActiveInstallation.get() : null;
    const token = inst ? (typeof InstallationStore !== 'undefined' ? InstallationStore.getToken(inst.id) : '') : '';
    if (!inst || !inst.haUrl || !token) {
      _showChartMsg('HA offline — histórico indisponível.');
      return;
    }
    const startIso = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const entities = [_cfg.gridEntity, _cfg.solarEntity].filter(Boolean).join(',');
    const url = `${inst.haUrl}/api/history/period/${startIso}?filter_entity_id=${entities}&minimal_response=true&significant_changes_only=false`;
    try {
      const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const raw = await res.json();
      _processHistory(raw);
    } catch (e) {
      console.warn('[energy] histórico:', e.message);
      _showChartMsg('Histórico indisponível — ' + e.message);
    }
  }

  function _processHistory(data) {
    const H = 24;
    const now = Date.now();
    const labels = Array.from({ length: H }, (_, i) => {
      const h = new Date(now - (H - 1 - i) * 3600000).getHours();
      return h + 'h';
    });
    const grid  = new Array(H).fill(null);
    const solar = new Array(H).fill(null);

    for (const series of (data || [])) {
      if (!series?.length) continue;
      const eid     = series[0]?.entity_id;
      const isGrid  = eid === _cfg.gridEntity;
      const isSolar = eid === _cfg.solarEntity;
      if (!isGrid && !isSolar) continue;
      const target = isGrid ? grid : solar;
      for (const entry of series) {
        const v = parseFloat(entry.state);
        if (isNaN(v)) continue;
        const t    = new Date(entry.last_changed || entry.last_updated).getTime();
        const idx  = H - 1 - Math.floor((now - t) / 3600000);
        if (idx >= 0 && idx < H) {
          target[idx] = Math.max(target[idx] ?? 0, _toKW(v, entry.attributes?.unit_of_measurement || 'kW'));
        }
      }
    }
    // Propagate last known value forward
    const fwd = (arr) => {
      let last = 0;
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] !== null) { last = arr[i]; }
        else arr[i] = last;
      }
    };
    fwd(grid); fwd(solar);

    _chartData = { labels, grid, solar, net: grid.map((g, i) => (solar[i] ?? 0) - g) };
    _drawChart();
  }

  function _showChartMsg(msg) {
    const el = document.getElementById('enrg-chart-body');
    if (el) el.innerHTML = `<div class="enrg-chart-wait">${msg}</div>`;
  }

  function _drawChart() {
    const body = document.getElementById('enrg-chart-body');
    if (!body) return;
    const { labels, grid, solar, net } = _chartData;
    if (!labels?.length || (grid.every(v => v === 0) && solar.every(v => v === 0))) {
      _showChartMsg('Sem dados históricos — aguarde coleta de leituras.');
      return;
    }
    const W   = Math.max(body.clientWidth || 560, 300);
    const H   = 180;
    const PAD = { t: 12, r: 12, b: 28, l: 40 };
    const cW  = W - PAD.l - PAD.r;
    const cH  = H - PAD.t - PAD.b;

    const allV = [...grid, ...solar, ...net];
    const maxV = Math.max(...allV, 0.1);
    const minV = Math.min(...allV, 0);
    const rng  = maxV - minV || 1;

    const xOf  = (i) => (PAD.l + (i / (labels.length - 1)) * cW).toFixed(1);
    const yOf  = (v)  => (PAD.t + cH - ((v - minV) / rng * cH)).toFixed(1);
    const line = (arr) => arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${xOf(i)} ${yOf(v)}`).join(' ');
    const area = (arr) => {
      const base = yOf(minV);
      return `${line(arr)} L${xOf(arr.length - 1)} ${base} L${xOf(0)} ${base}Z`;
    };

    const yTick = 4;
    const gridLines = Array.from({ length: yTick + 1 }, (_, i) => {
      const v = minV + rng / yTick * i;
      const y = yOf(v);
      return `<text x="${PAD.l - 4}" y="${y}" text-anchor="end" dominant-baseline="middle">${v.toFixed(1)}</text>
              <line x1="${PAD.l}" y1="${y}" x2="${PAD.l + cW}" y2="${y}" stroke="rgba(255,255,255,.06)" stroke-width="1"/>`;
    }).join('');

    const xLabels = labels.filter((_, i) => i % 4 === 0).map((l, j) => {
      const i = j * 4;
      return `<text x="${xOf(i)}" y="${H - 4}" text-anchor="middle">${l}</text>`;
    }).join('');

    body.innerHTML = `<svg class="enrg-chart-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="eg-gr" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#3b82f6" stop-opacity=".25"/><stop offset="100%" stop-color="#3b82f6" stop-opacity=".02"/>
        </linearGradient>
        <linearGradient id="eg-sol" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f59e0b" stop-opacity=".25"/><stop offset="100%" stop-color="#f59e0b" stop-opacity=".02"/>
        </linearGradient>
      </defs>
      <g font-size="10" fill="rgba(255,255,255,.4)" font-family="system-ui,sans-serif">${gridLines}${xLabels}</g>
      <path d="${area(grid)}"  fill="url(#eg-gr)"/>
      <path d="${area(solar)}" fill="url(#eg-sol)"/>
      <path d="${line(grid)}"  fill="none" stroke="#3b82f6" stroke-width="2" stroke-linejoin="round"/>
      <path d="${line(solar)}" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linejoin="round"/>
      <path d="${line(net)}"   fill="none" stroke="#22c55e" stroke-width="1.5" stroke-dasharray="4 3" stroke-linejoin="round"/>
    </svg>`;
  }

  // ── Events ──────────────────────────────────────────────────────────────
  function _bindEvents(sensors) {
    const modal = () => document.getElementById('enrg-modal');
    const open  = () => modal()?.classList.remove('hidden');
    const close = () => modal()?.classList.add('hidden');

    _el.querySelectorAll('[data-enrg-open-cfg]').forEach(b => b.addEventListener('click', open));
    document.getElementById('enrg-modal-close')?.addEventListener('click', close);
    document.getElementById('enrg-modal-cancel')?.addEventListener('click', close);

    document.getElementById('enrg-modal-save')?.addEventListener('click', async () => {
      const gridId  = document.getElementById('enrg-sel-grid')?.value  || '';
      const solarId = document.getElementById('enrg-sel-solar')?.value || '';
      const findUnit = (id) => sensors.power.find(s => s.entity_id === id)?.unit || 'kW';
      _cfg = {
        ..._cfg,
        gridEntity:    gridId,
        solarEntity:   solarId,
        gridUnit:      findUnit(gridId),
        solarUnit:     findUnit(solarId),
        tariffBase:    parseFloat(document.getElementById('enrg-inp-tariff')?.value)  || 0.75,
        tariffFlag:    document.getElementById('enrg-sel-flag')?.value               || 'verde',
        solarInvest:   parseFloat(document.getElementById('enrg-inp-invest')?.value) || 0,
        solarCapacity: parseFloat(document.getElementById('enrg-inp-cap')?.value)    || 0,
      };
      _saveCfg();
      close();
      await load();
    });

    // Redraw chart on resize
    if (typeof ResizeObserver !== 'undefined') {
      const chartBody = document.getElementById('enrg-chart-body');
      if (chartBody) new ResizeObserver(() => _drawChart()).observe(chartBody);
    }
  }

  return { init, load };
})();
