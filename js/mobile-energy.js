// mobile-energy.js — tela de energia (Fase B4)
(async function () {
  'use strict';
  await MobileBoot.init();

  const inst = MobileBoot.inst;
  document.getElementById('m-en-sub').textContent = `${inst.name || 'Casa'} · ${formatDate(new Date())}`;

  // Em modo preview, valores mock. Em modo real, tentar ler de sensores power.
  const powerSensors = (ZoneRegistry.allEntityIds() || []).filter(e => /sensor\..*(power|consumo|kw)/i.test(e));

  function formatDate(d) {
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
  }

  // ── Tabs de período (mock — gera curvas diferentes) ─────────────────────────
  const pathArea = document.getElementById('m-en-area');
  const pathLine = document.getElementById('m-en-line');
  const axis = document.getElementById('m-en-axis');
  const periodLabel = document.getElementById('m-en-period-label');

  const PERIODS = {
    '7d':  { label: '7 dias',     line: 'M0,70 C40,68 80,60 120,55 C160,50 200,40 240,35 C280,30 300,28 320,25', axis: ['Seg','Qua','Sex','Sab','agora'] },
    '24h': { label: '24h',        line: 'M0,80 C20,82 40,75 60,70 C80,66 100,72 120,60 C140,50 160,42 180,48 C200,52 220,30 240,26 C260,22 280,40 300,46 L320,40', axis: ['00h','06h','12h','18h','agora'] },
    '1h':  { label: '1h',         line: 'M0,60 C40,55 80,52 120,48 C160,44 200,40 240,38 C280,36 300,34 320,32', axis: ['-60','-45','-30','-15','agora'] },
  };

  function setPeriod(key) {
    const p = PERIODS[key];
    if (!p) return;
    pathLine.setAttribute('d', p.line);
    // Area = line + close to bottom
    pathArea.setAttribute('d', p.line + ' L320,110 L0,110 Z');
    periodLabel.textContent = p.label;
    axis.innerHTML = p.axis.map(a => `<span>${a}</span>`).join('');
  }

  document.querySelectorAll('[data-period]').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('[data-period]').forEach(o => o.classList.remove('active'));
      b.classList.add('active');
      setPeriod(b.getAttribute('data-period'));
    });
  });

  // ── Top consumidores ────────────────────────────────────────────────────────
  const consList = document.getElementById('m-en-cons-list');

  const consumers = MobileBoot.previewMode ? [
    { name: 'AC Sala',         meta: '22°C · cool',  watts: 340, icon: 'climate' },
    { name: 'AC Suíte',        meta: '24°C · auto',  watts: 280, icon: 'climate' },
    { name: 'Geladeira',       meta: 'Cozinha',      watts: 125, icon: 'fridge' },
    { name: 'Forno elétrico',  meta: 'standby',      watts: 62,  icon: 'oven'    },
    { name: 'TV Samsung',      meta: 'Sala',         watts: 0,   icon: 'tv'      },
  ] : []; // TODO: buscar sensores de power reais

  const max = Math.max(...consumers.map(c => c.watts), 1);

  consList.innerHTML = consumers.length === 0
    ? '<div style="padding:20px 0;text-align:center;color:var(--text-3);font-size:12px">Sem sensores de potência configurados</div>'
    : consumers.map(c => `
      <div class="m-en-cons">
        <div class="m-en-cons-icon">${iconFor(c.icon)}</div>
        <div class="m-en-cons-info">
          <div class="m-en-cons-name">${MobileBoot.escapeHtml(c.name)}</div>
          <div class="m-en-cons-meta">${MobileBoot.escapeHtml(c.meta)}</div>
          <div class="m-en-cons-bar"><div class="m-en-cons-fill" style="width:${(c.watts/max*100).toFixed(0)}%"></div></div>
        </div>
        <div class="m-en-cons-val">${c.watts}<small>W</small></div>
      </div>
    `).join('');

  function iconFor(kind) {
    const icons = {
      climate: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path stroke-linecap="round" d="M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>',
      fridge:  '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="18" rx="2"/><line x1="6" y1="9" x2="18" y2="9"/></svg>',
      oven:    '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="6" y="14" width="12" height="6" rx="1"/><rect x="6" y="4" width="12" height="6" rx="1"/></svg>',
      tv:      '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="14" rx="2"/></svg>',
    };
    return icons[kind] || icons.climate;
  }

  // ── Voltar ──────────────────────────────────────────────────────────────────
  document.getElementById('m-back').addEventListener('click', () => {
    if (history.length > 1) history.back();
    else window.location.href = 'mobile.html';
  });

  // ── Routing tabbar ──────────────────────────────────────────────────────────
  document.querySelectorAll('[data-route]').forEach(btn => {
    btn.addEventListener('click', () => {
      const r = btn.getAttribute('data-route');
      if (r === 'setup') window.location.href = 'index.html';
      else if (r === 'add') alert('Em construção');
    });
  });
})();
