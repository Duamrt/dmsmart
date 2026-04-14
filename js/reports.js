// reports.js — Relatórios e histórico de uso dmsmart
// Busca histórico do Home Assistant via REST API e gera relatório por dispositivo/ambiente
'use strict';

const ReportsPanel = (() => {
  let _el = null;
  let _period = '7d';
  let _zoneFilter = 'all';
  let _data = []; // [{entityId, name, zone, timeOn, timeOff, cycles, availability, lastChanged}]
  let _loading = false;

  // ── Public ──────────────────────────────────────────────────────────────
  function init(el) { _el = el; }

  async function load() {
    if (!_el) return;
    _renderShell();
    await _fetchAndRender();
  }

  // ── Shell (controles) ────────────────────────────────────────────────────
  function _renderShell() {
    _el.innerHTML = `
      <div class="rpt-wrap">
        <div class="rpt-toolbar">
          <div class="rpt-toolbar-left">
            <div class="rpt-period-group" role="group" aria-label="Período">
              <button class="rpt-period-btn active" data-period="7d">7 dias</button>
              <button class="rpt-period-btn" data-period="30d">30 dias</button>
              <button class="rpt-period-btn" data-period="month">Este mês</button>
              <button class="rpt-period-btn" data-period="lastmonth">Mês anterior</button>
            </div>
            <select class="rpt-zone-select" id="rpt-zone-select" aria-label="Filtrar por ambiente">
              <option value="all">Todos os ambientes</option>
            </select>
          </div>
          <div class="rpt-toolbar-right">
            <button class="rpt-export-btn" id="rpt-export-csv" title="Exportar CSV">
              <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>
              CSV
            </button>
            <button class="rpt-export-btn" id="rpt-export-print" title="Imprimir / PDF">
              <svg viewBox="0 0 24 24"><polyline points="6,9 6,2 18,2 18,9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              PDF
            </button>
          </div>
        </div>
        <div class="rpt-summary-row" id="rpt-summary-row"></div>
        <div class="rpt-table-wrap" id="rpt-table-wrap">
          <div class="rpt-loading">
            <div class="rpt-spinner"></div>Buscando histórico…
          </div>
        </div>
        <div class="rpt-footer" id="rpt-footer"></div>
      </div>`;

    // Período
    _el.querySelectorAll('.rpt-period-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (_loading) return;
        _period = btn.dataset.period;
        _el.querySelectorAll('.rpt-period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _fetchAndRender();
      });
    });

    // Zone select — popula com zonas reais
    const zoneSelect = _el.querySelector('#rpt-zone-select');
    if (typeof ZoneRegistry !== 'undefined') {
      ZoneRegistry.all().forEach(z => {
        const opt = document.createElement('option');
        opt.value = z.id;
        opt.textContent = z.name;
        zoneSelect.appendChild(opt);
      });
    }
    zoneSelect.value = _zoneFilter;
    zoneSelect.addEventListener('change', () => {
      _zoneFilter = zoneSelect.value;
      _renderTable();
    });

    // Exportar
    _el.querySelector('#rpt-export-csv').addEventListener('click', _exportCSV);
    _el.querySelector('#rpt-export-print').addEventListener('click', _printReport);
  }

  // ── Fetch histórico HA ───────────────────────────────────────────────────
  async function _fetchAndRender() {
    const tableWrap = _el && _el.querySelector('#rpt-table-wrap');
    if (!tableWrap) return;

    if (typeof HAClient === 'undefined' || !HAClient._url || !HAClient._token) {
      tableWrap.innerHTML = '<div class="rpt-empty">Conecte ao Home Assistant para ver o histórico.</div>';
      return;
    }

    _loading = true;
    tableWrap.innerHTML = '<div class="rpt-loading"><div class="rpt-spinner"></div>Buscando histórico…</div>';

    const { start, end } = _getPeriodRange();
    const entities = typeof ZoneRegistry !== 'undefined' ? ZoneRegistry.allEntityIds() : [];

    if (!entities.length) {
      tableWrap.innerHTML = '<div class="rpt-empty">Nenhum dispositivo configurado.</div>';
      _loading = false;
      return;
    }

    try {
      const history = await _fetchHistory(start, end, entities);
      _data = _processHistory(history, start, end);
      _renderSummary(start, end);
      _renderTable();
      _renderFooter(start, end);
    } catch (err) {
      console.error('[reports] erro ao buscar histórico:', err);
      tableWrap.innerHTML = `<div class="rpt-empty">Erro ao buscar histórico: ${err.message}</div>`;
    }
    _loading = false;
  }

  // Usa WebSocket já conectada — sem CORS
  async function _fetchHistory(start, end, entities) {
    return HAClient.fetchHistory(entities, start.toISOString(), end.toISOString());
    // Retorna: { entity_id: [{s, lc}, ...], ... }  (lc = unix seconds)
  }

  // ── Processar histórico (formato WS: objeto keyed por entity_id) ─────────
  function _processHistory(historyObj, start, end) {
    if (!historyObj || typeof historyObj !== 'object' || Array.isArray(historyObj)) return [];
    const totalMs = end - start;
    const results = [];

    for (const [entityId, entityHistory] of Object.entries(historyObj)) {
      if (!Array.isArray(entityHistory)) continue;
      const zone = typeof ZoneRegistry !== 'undefined' ? ZoneRegistry.findZoneByEntity(entityId) : null;
      const zoneId = zone ? zone.id : null;
      const zoneName = zone ? zone.name : '—';

      // Nome amigável
      let friendlyName = entityId;
      if (typeof HAClient !== 'undefined' && HAClient._allStates) {
        const st = HAClient._allStates.find(s => s.entity_id === entityId);
        if (st && st.attributes && st.attributes.friendly_name) {
          friendlyName = st.attributes.friendly_name;
        }
      }

      let timeOnMs = 0;
      let timeOffMs = 0;
      let timeUnavailableMs = 0;
      let cycles = 0;
      let lastChanged = null;

      for (let i = 0; i < entityHistory.length; i++) {
        const curr = entityHistory[i];
        const next = entityHistory[i + 1];
        // lc = last_changed em unix seconds; lu = last_updated
        const currTime = new Date((curr.lc || curr.lu || 0) * 1000);
        const nextTime = next ? new Date((next.lc || next.lu || 0) * 1000) : end;
        const durationMs = nextTime - currTime;
        if (durationMs < 0) continue;

        const state = (curr.s || '').toLowerCase();
        const isOn = state !== 'off' && state !== 'unavailable' && state !== 'unknown' && state !== 'idle';
        const isUnavailable = state === 'unavailable' || state === 'unknown';

        if (isUnavailable) {
          timeUnavailableMs += durationMs;
        } else if (isOn) {
          timeOnMs += durationMs;
        } else {
          timeOffMs += durationMs;
        }

        // Conta ciclo ligar
        if (isOn && i > 0) {
          const prevState = (entityHistory[i - 1].s || '').toLowerCase();
          const prevOff = prevState === 'off' || prevState === 'unavailable' || prevState === 'unknown' || prevState === 'idle';
          if (prevOff) cycles++;
        }

        lastChanged = currTime;
      }

      const availableMs = totalMs - timeUnavailableMs;
      const availability = availableMs > 0 ? (timeOnMs / availableMs) * 100 : 0;

      results.push({
        entityId,
        name: friendlyName,
        zoneId,
        zoneName,
        timeOnMs,
        timeOffMs,
        timeUnavailableMs,
        cycles,
        availability,
        lastChanged
      });
    }

    // Ordena por zona depois por nome
    results.sort((a, b) => {
      if (a.zoneName < b.zoneName) return -1;
      if (a.zoneName > b.zoneName) return 1;
      return a.name.localeCompare(b.name);
    });

    return results;
  }

  // ── Render summary ───────────────────────────────────────────────────────
  function _renderSummary(start, end) {
    const summaryRow = _el && _el.querySelector('#rpt-summary-row');
    if (!summaryRow) return;

    const filtered = _getFiltered();
    const totalDevices = filtered.length;
    const avgAvailability = totalDevices > 0
      ? (filtered.reduce((s, d) => s + d.availability, 0) / totalDevices)
      : 0;
    const mostUsed = filtered.reduce((best, d) => (!best || d.timeOnMs > best.timeOnMs) ? d : best, null);
    const totalCycles = filtered.reduce((s, d) => s + d.cycles, 0);

    summaryRow.innerHTML = `
      <div class="rpt-kpi">
        <div class="rpt-kpi-val">${totalDevices}</div>
        <div class="rpt-kpi-label">Dispositivos</div>
      </div>
      <div class="rpt-kpi">
        <div class="rpt-kpi-val">${avgAvailability.toFixed(0)}%</div>
        <div class="rpt-kpi-label">Disponibilidade média</div>
      </div>
      <div class="rpt-kpi">
        <div class="rpt-kpi-val">${totalCycles}</div>
        <div class="rpt-kpi-label">Acionamentos</div>
      </div>
      <div class="rpt-kpi rpt-kpi--wide">
        <div class="rpt-kpi-val rpt-kpi-val--sm">${mostUsed ? mostUsed.name : '—'}</div>
        <div class="rpt-kpi-label">Mais usado</div>
      </div>`;
  }

  // ── Render tabela ────────────────────────────────────────────────────────
  function _renderTable() {
    const tableWrap = _el && _el.querySelector('#rpt-table-wrap');
    if (!tableWrap) return;

    const filtered = _getFiltered();

    if (!filtered.length) {
      tableWrap.innerHTML = '<div class="rpt-empty">Nenhum dado de histórico encontrado para este período.</div>';
      // Atualiza summary com 0s
      _renderSummary();
      return;
    }

    // Atualiza summary para refletir filtro de zona
    _renderSummary();

    let rows = '';
    let lastZone = null;
    for (const d of filtered) {
      if (d.zoneName !== lastZone) {
        lastZone = d.zoneName;
        rows += `<tr class="rpt-zone-row"><td colspan="6">${_esc(d.zoneName)}</td></tr>`;
      }
      const avClass = d.availability >= 80 ? 'rpt-avail--high'
                     : d.availability >= 40 ? 'rpt-avail--mid'
                     : 'rpt-avail--low';
      rows += `<tr>
        <td class="rpt-col-name">${_esc(d.name)}<span class="rpt-entity-id">${_esc(d.entityId)}</span></td>
        <td class="rpt-col-on">${_fmtDuration(d.timeOnMs)}</td>
        <td class="rpt-col-off">${_fmtDuration(d.timeOffMs)}</td>
        <td class="rpt-col-avail">
          <div class="rpt-avail-bar-wrap">
            <div class="rpt-avail-bar-bg">
              <div class="rpt-avail-bar-fill ${avClass}" style="width:${Math.min(100, d.availability).toFixed(1)}%"></div>
            </div>
            <span class="rpt-avail-pct ${avClass}">${d.availability.toFixed(1)}%</span>
          </div>
        </td>
        <td class="rpt-col-cycles">${d.cycles}</td>
        <td class="rpt-col-last">${d.lastChanged ? _fmtDateTime(d.lastChanged) : '—'}</td>
      </tr>`;
    }

    tableWrap.innerHTML = `
      <table class="rpt-table">
        <thead>
          <tr>
            <th class="rpt-col-name">Dispositivo</th>
            <th class="rpt-col-on">Tempo ligado</th>
            <th class="rpt-col-off">Tempo desligado</th>
            <th class="rpt-col-avail">Disponibilidade</th>
            <th class="rpt-col-cycles">Acionamentos</th>
            <th class="rpt-col-last">Última mudança</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  function _renderFooter(start, end) {
    const footer = _el && _el.querySelector('#rpt-footer');
    if (!footer) return;
    footer.textContent = `Período: ${_fmtDate(start)} → ${_fmtDate(end)} · ${_data.length} dispositivos monitorados`;
  }

  // ── Helpers período ──────────────────────────────────────────────────────
  function _getPeriodRange() {
    const now = new Date();
    let start;
    const end = new Date(now);

    switch (_period) {
      case '30d':
        start = new Date(now); start.setDate(start.getDate() - 30); break;
      case 'month': {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      }
      case 'lastmonth': {
        const m = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        start = new Date(y, m, 1);
        end.setTime(new Date(y, m + 1, 0, 23, 59, 59).getTime());
        break;
      }
      default: // 7d
        start = new Date(now); start.setDate(start.getDate() - 7); break;
    }
    return { start, end };
  }

  function _getFiltered() {
    if (_zoneFilter === 'all') return _data;
    return _data.filter(d => d.zoneId === _zoneFilter);
  }

  // ── Export CSV ───────────────────────────────────────────────────────────
  function _exportCSV() {
    if (!_data.length) return;
    const { start, end } = _getPeriodRange();
    const filtered = _getFiltered();
    const header = ['Dispositivo', 'Entity ID', 'Ambiente', 'Tempo ligado (h)', 'Tempo desligado (h)', 'Disponibilidade (%)', 'Acionamentos', 'Última mudança'];
    const rows = filtered.map(d => [
      _csvCell(d.name),
      _csvCell(d.entityId),
      _csvCell(d.zoneName),
      (d.timeOnMs / 3600000).toFixed(2),
      (d.timeOffMs / 3600000).toFixed(2),
      d.availability.toFixed(1),
      d.cycles,
      d.lastChanged ? _fmtDateTime(d.lastChanged) : ''
    ]);
    const csv = [header, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `dmsmart-relatorio-${_fmtDateFile(start)}_${_fmtDateFile(end)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ── Print / PDF ───────────────────────────────────────────────────────────
  function _printReport() {
    if (!_data.length) return;
    const { start, end } = _getPeriodRange();
    const filtered = _getFiltered();
    const install = typeof ActiveInstallation !== 'undefined' ? ActiveInstallation.get() : null;
    const installName = install ? install.name : 'dmsmart';

    let tableRows = '';
    let lastZone = null;
    for (const d of filtered) {
      if (d.zoneName !== lastZone) {
        lastZone = d.zoneName;
        tableRows += `<tr class="zone-header"><td colspan="5">${_esc(d.zoneName)}</td></tr>`;
      }
      tableRows += `<tr>
        <td>${_esc(d.name)}<br><small>${_esc(d.entityId)}</small></td>
        <td>${_fmtDuration(d.timeOnMs)}</td>
        <td>${d.availability.toFixed(1)}%</td>
        <td>${d.cycles}</td>
        <td>${d.lastChanged ? _fmtDateTime(d.lastChanged) : '—'}</td>
      </tr>`;
    }

    const html = `<!DOCTYPE html><html lang="pt-BR"><head>
      <meta charset="UTF-8">
      <title>Relatório dmsmart — ${_fmtDate(start)} a ${_fmtDate(end)}</title>
      <style>
        body { font-family: Arial, sans-serif; color: #111; margin: 32px; font-size: 13px; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        .sub { color: #555; margin: 0 0 24px; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #1a1a2e; color: #fff; padding: 8px 10px; text-align: left; font-size: 12px; }
        td { padding: 7px 10px; border-bottom: 1px solid #e0e0e0; vertical-align: top; }
        tr.zone-header td { background: #f0f4ff; font-weight: bold; color: #1a1a2e; padding: 6px 10px; }
        small { color: #888; font-size: 11px; }
        .footer { margin-top: 24px; color: #888; font-size: 11px; }
        @media print { body { margin: 16px; } }
      </style>
    </head><body>
      <h1>Relatório de uso — ${_esc(installName)}</h1>
      <p class="sub">Período: ${_fmtDate(start)} a ${_fmtDate(end)} · Gerado em ${_fmtDateTime(new Date())}</p>
      <table>
        <thead><tr>
          <th>Dispositivo</th><th>Tempo ligado</th><th>Disponibilidade</th><th>Acionamentos</th><th>Última mudança</th>
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
      <p class="footer">dmsmart · app.dmstack.com.br</p>
    </body></html>`;

    const win = window.open('', '_blank');
    if (!win) { alert('Permita pop-ups para gerar o PDF.'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }

  // ── Formatadores ─────────────────────────────────────────────────────────
  function _fmtDuration(ms) {
    if (!ms || ms < 0) return '—';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (h === 0) return `${m}min`;
    return `${h}h ${m.toString().padStart(2, '0')}min`;
  }

  function _fmtDate(d) {
    return d.toLocaleDateString('pt-BR');
  }

  function _fmtDateTime(d) {
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  function _fmtDateFile(d) {
    return d.toISOString().slice(0, 10);
  }

  function _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function _csvCell(s) {
    const v = String(s || '');
    return v.includes(';') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v;
  }

  return { init, load };
})();
