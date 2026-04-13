// floorplan.js — Planta Baixa Interativa
// Armazena imagem (base64) e marcadores por instalação no localStorage.
// Marcadores refletem estado em tempo real via StateStore.
// Modo editor: clique para adicionar, arraste para reposicionar.

const FloorPlan = (() => {
  let _container = null;
  let _installId = null;
  let _data = null;      // { imageData, markers: [{id, x, y, entityId, label}] }
  let _editMode = false;
  let _pendingPos = null;
  let _unsubAll = null;

  // Estado do drag
  let _drag = null; // { el, markerId, startX, startY, moved }

  /* ── Storage ──────────────────────────────────────────────── */

  const _key = () => `dmsmart_fp_${_installId}`;

  function _loadData() {
    try {
      const raw = localStorage.getItem(_key());
      _data = raw ? JSON.parse(raw) : { imageData: null, markers: [] };
    } catch (_) {
      _data = { imageData: null, markers: [] };
    }
  }

  function _saveData() {
    try {
      localStorage.setItem(_key(), JSON.stringify(_data));
    } catch (e) {
      console.warn('[FloorPlan] localStorage cheio:', e);
    }
  }

  /* ── Public API ───────────────────────────────────────────── */

  function init(container, installId) {
    _container = container;
    _installId = installId;
    _editMode  = false;
    _loadData();
    _render();

    if (_unsubAll) _unsubAll();
    if (typeof StateStore !== 'undefined') {
      _unsubAll = StateStore.subscribeAll(() => updateMarkers());
    }
  }

  function refresh() {
    if (!_container || !_installId) return;
    _render();
  }

  function updateMarkers() {
    const wrap = document.getElementById('fp-img-wrap');
    if (!wrap) return;
    wrap.querySelectorAll('.fp-marker[data-marker-id]').forEach(el => {
      const id = el.getAttribute('data-marker-id');
      const m  = (_data.markers || []).find(x => x.id === id);
      if (!m) return;
      el.setAttribute('data-state', _stateAttr(m.entityId));
    });
  }

  /* ── Render ───────────────────────────────────────────────── */

  function _render() {
    if (!_container) return;
    if (!_data || !_data.imageData) _renderEmpty();
    else _renderMap();
  }

  function _renderEmpty() {
    _container.innerHTML = `
      <div class="floorplan-empty">
        <div class="floorplan-empty-icon">
          <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
        </div>
        <div class="floorplan-empty-title">Nenhuma planta cadastrada</div>
        <div class="floorplan-empty-sub">Faça upload da planta baixa da instalação para posicionar marcadores nos dispositivos.</div>
        <label class="btn-fp-upload">
          <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Fazer upload da planta
          <input type="file" accept="image/*" style="display:none" id="fp-upload-input">
        </label>
      </div>
    `;
    const inp = document.getElementById('fp-upload-input');
    if (inp) inp.addEventListener('change', _handleUpload);
  }

  function _renderMap() {
    const markers    = (_data.markers || []).map(_markerHtml).join('');
    const editActive = _editMode ? ' active' : '';
    const editMode   = _editMode ? ' edit-mode' : '';

    _container.innerHTML = `
      <div class="floorplan-toolbar">
        <div class="floorplan-title">Planta baixa</div>
        <button type="button" class="btn-fp${editActive}" id="fp-edit-btn">
          <svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z"/></svg>
          ${_editMode ? 'Sair do editor' : 'Editar'}
        </button>
        <label class="btn-fp" title="Trocar imagem da planta">
          <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Trocar
          <input type="file" accept="image/*" style="display:none" id="fp-upload-input">
        </label>
      </div>
      ${_editMode ? '<div class="floorplan-hint">Clique para adicionar marcador · Arraste para reposicionar</div>' : ''}
      <div class="floorplan-viewport${editMode}" id="fp-viewport">
        <div class="floorplan-img-wrap" id="fp-img-wrap">
          <img class="floorplan-img" id="fp-img" src="${_data.imageData}" alt="Planta baixa" draggable="false">
          ${markers}
        </div>
      </div>
    `;

    document.getElementById('fp-edit-btn').addEventListener('click', _toggleEdit);
    const inp = document.getElementById('fp-upload-input');
    if (inp) inp.addEventListener('change', _handleUpload);

    document.getElementById('fp-viewport').addEventListener('click', _onViewportClick);
    _bindMarkers();
  }

  /* ── Markers ──────────────────────────────────────────────── */

  function _markerHtml(m) {
    return `
      <div class="fp-marker" data-state="${_stateAttr(m.entityId)}" data-marker-id="${m.id}"
           style="left:${(m.x * 100).toFixed(3)}%;top:${(m.y * 100).toFixed(3)}%">
        ${_domainIcon(m.entityId)}
        <div class="fp-marker-tip">${_esc(m.label || m.entityId)}</div>
        <div class="fp-marker-del" data-del="${m.id}">×</div>
      </div>
    `;
  }

  function _bindMarkers() {
    const wrap = document.getElementById('fp-img-wrap');
    if (!wrap) return;
    wrap.querySelectorAll('.fp-marker').forEach(el => {
      // Botão remover
      const del = el.querySelector('.fp-marker-del');
      if (del) {
        del.addEventListener('pointerdown', e => e.stopPropagation());
        del.addEventListener('click', e => {
          e.stopPropagation();
          _removeMarker(del.getAttribute('data-del'));
        });
      }

      // Drag (edit mode) ou toggle (normal mode)
      el.addEventListener('pointerdown', e => {
        if (!_editMode) return;
        if (e.target.closest('.fp-marker-del')) return;
        e.stopPropagation();
        e.preventDefault();
        _startDrag(el, e);
      });

      el.addEventListener('click', e => {
        if (_editMode) { e.stopPropagation(); return; }
        e.stopPropagation();
        // Ignora se foi um drag
        if (_drag && _drag.moved) return;
        const m = (_data.markers || []).find(x => x.id === el.getAttribute('data-marker-id'));
        if (m) _toggleEntity(m.entityId);
      });
    });
  }

  /* ── Drag & Drop ──────────────────────────────────────────── */

  function _startDrag(el, e) {
    _drag = {
      el,
      markerId: el.getAttribute('data-marker-id'),
      startClientX: e.clientX,
      startClientY: e.clientY,
      moved: false
    };

    el.setPointerCapture(e.pointerId);
    el.classList.add('fp-dragging');

    // Fecha picker se aberto
    document.getElementById('fp-picker')?.remove();
    _pendingPos = null;

    el.addEventListener('pointermove', _onDragMove);
    el.addEventListener('pointerup',   _onDragEnd);
    el.addEventListener('pointercancel', _onDragEnd);
  }

  function _onDragMove(e) {
    if (!_drag) return;
    const dx = e.clientX - _drag.startClientX;
    const dy = e.clientY - _drag.startClientY;

    // Marca como moved se deslocou mais de 4px
    if (!_drag.moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      _drag.moved = true;
    }
    if (!_drag.moved) return;

    const img = document.getElementById('fp-img');
    if (!img) return;
    const rect = img.getBoundingClientRect();

    // Posição do ponteiro relativa à imagem (0-1)
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top)  / rect.height));

    // Atualiza visualmente sem re-render
    _drag.el.style.left = (x * 100).toFixed(3) + '%';
    _drag.el.style.top  = (y * 100).toFixed(3) + '%';
    _drag.currentX = x;
    _drag.currentY = y;
  }

  function _onDragEnd(e) {
    if (!_drag) return;
    const { el, markerId, moved, currentX, currentY } = _drag;

    el.removeEventListener('pointermove', _onDragMove);
    el.removeEventListener('pointerup',   _onDragEnd);
    el.removeEventListener('pointercancel', _onDragEnd);
    el.classList.remove('fp-dragging');

    if (moved && currentX !== undefined) {
      // Persiste nova posição
      const m = (_data.markers || []).find(x => x.id === markerId);
      if (m) {
        m.x = currentX;
        m.y = currentY;
        _saveData();
      }
    }

    _drag = null;
  }

  function _removeMarker(id) {
    _data.markers = (_data.markers || []).filter(m => m.id !== id);
    _saveData();
    const el = document.querySelector(`[data-marker-id="${id}"]`);
    if (el) el.remove();
  }

  function _placeMarker(entityId, label) {
    if (!_pendingPos) return;
    const m = { id: 'm' + Date.now(), x: _pendingPos.x, y: _pendingPos.y, entityId, label };
    if (!_data.markers) _data.markers = [];
    _data.markers.push(m);
    _saveData();
    _pendingPos = null;

    const wrap = document.getElementById('fp-img-wrap');
    if (wrap) {
      const tmp = document.createElement('div');
      tmp.innerHTML = _markerHtml(m);
      wrap.appendChild(tmp.firstElementChild);
      _bindMarkers();
    }
  }

  /* ── Entity picker ────────────────────────────────────────── */

  function _onViewportClick(e) {
    if (!_editMode) return;
    if (e.target.closest('.fp-marker') || e.target.closest('.fp-picker')) return;
    // Ignora se terminou de arrastar
    if (_drag && _drag.moved) return;

    const img = document.getElementById('fp-img');
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top)  / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;

    _pendingPos = { x, y };
    _showPicker(e.clientX, e.clientY);
  }

  function _showPicker(cx, cy) {
    document.getElementById('fp-picker')?.remove();

    const entities = _availableEntities();
    const viewport = document.getElementById('fp-viewport');
    const vRect    = viewport.getBoundingClientRect();

    let left = cx - vRect.left + viewport.scrollLeft + 10;
    let top  = cy - vRect.top  + viewport.scrollTop  + 10;

    const itemsHtml = entities.length === 0
      ? '<div class="fp-picker-empty">Nenhum dispositivo configurado nas zonas</div>'
      : entities.map(e => `
          <button class="fp-picker-item" data-entity="${_esc(e.entityId)}" data-label="${_esc(e.label)}">
            <span class="fp-picker-item-dot" style="background:${_dotColor(e.entityId)}"></span>
            <span>${_esc(e.label)}</span>
          </button>
        `).join('');

    const picker = document.createElement('div');
    picker.className = 'fp-picker';
    picker.id = 'fp-picker';
    picker.style.cssText = `left:${left}px;top:${top}px`;
    picker.innerHTML = `
      <div class="fp-picker-head">
        <span class="fp-picker-title">Selecionar dispositivo</span>
        <button class="fp-picker-close" id="fp-picker-close">×</button>
      </div>
      <div class="fp-picker-list">${itemsHtml}</div>
    `;

    document.getElementById('fp-img-wrap').appendChild(picker);

    requestAnimationFrame(() => {
      const pRect = picker.getBoundingClientRect();
      if (pRect.right  > vRect.right)  picker.style.left = Math.max(0, left - pRect.width  - 14) + 'px';
      if (pRect.bottom > vRect.bottom) picker.style.top  = Math.max(0, top  - pRect.height - 14) + 'px';
    });

    picker.querySelector('#fp-picker-close').addEventListener('click', () => {
      picker.remove();
      _pendingPos = null;
    });

    picker.querySelectorAll('.fp-picker-item').forEach(btn => {
      btn.addEventListener('click', () => {
        _placeMarker(btn.getAttribute('data-entity'), btn.getAttribute('data-label'));
        picker.remove();
      });
    });

    setTimeout(() => {
      const handler = ev => {
        if (!picker.isConnected) { document.removeEventListener('click', handler); return; }
        if (!picker.contains(ev.target)) {
          picker.remove();
          _pendingPos = null;
          document.removeEventListener('click', handler);
        }
      };
      document.addEventListener('click', handler);
    }, 0);
  }

  function _availableEntities() {
    if (typeof ZoneRegistry === 'undefined') return [];
    const result = [];
    for (const zone of ZoneRegistry.all()) {
      for (const device of (zone.devices || [])) {
        const entityId = device.entityId || device.entity;
        if (!entityId) continue;
        result.push({ entityId, label: device.name || entityId });
      }
    }
    return result;
  }

  /* ── HA interaction ───────────────────────────────────────── */

  function _toggleEntity(entityId) {
    if (typeof HAClient === 'undefined') return;
    const domain = entityId.split('.')[0];
    HAClient.callService(domain, 'toggle', { entity_id: entityId });
  }

  /* ── Helpers ──────────────────────────────────────────────── */

  function _stateAttr(entityId) {
    if (typeof StateStore === 'undefined') return 'off';
    const s = StateStore.get(entityId);
    if (!s) return 'off';
    if (s.state === 'on') return 'on';
    if (s.state === 'unavailable' || s.state === 'unknown') return 'unavailable';
    return 'off';
  }

  function _dotColor(entityId) {
    const a = _stateAttr(entityId);
    if (a === 'on') return 'var(--success)';
    if (a === 'unavailable') return 'var(--danger)';
    return 'var(--text-3)';
  }

  function _domainIcon(entityId) {
    const domain = entityId ? entityId.split('.')[0] : '';
    const map = {
      light:        '<svg viewBox="0 0 24 24"><path d="M9 17h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 1 4 10.5c-.7.6-1 1.3-1 2V16H9v-.5c0-.7-.3-1.4-1-2A6 6 0 0 1 12 3z"/></svg>',
      switch:       '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16v.01"/></svg>',
      climate:      '<svg viewBox="0 0 24 24"><path d="M12 2v6m0 8v6M4.93 4.93l4.24 4.24m5.66 5.66 4.24 4.24M2 12h6m8 0h6M4.93 19.07l4.24-4.24m5.66-5.66 4.24-4.24"/></svg>',
      cover:        '<svg viewBox="0 0 24 24"><path d="M3 4h18M3 20h18M12 4v16"/></svg>',
      media_player: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M3 14h18"/></svg>',
      fan:          '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12m11.32 11.32 2.12 2.12M2 12h3m14 0h3M4.22 19.78l2.12-2.12m11.32-11.32 2.12-2.12"/></svg>',
      camera:       '<svg viewBox="0 0 24 24"><path d="M23 7 16 12l7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>',
    };
    return map[domain] || '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/></svg>';
  }

  function _toggleEdit() {
    _editMode = !_editMode;
    document.getElementById('fp-picker')?.remove();
    _pendingPos = null;
    _drag = null;
    _renderMap();
  }

  function _handleUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (!_data) _data = { markers: [] };
      _data.imageData = ev.target.result;
      _saveData();
      _editMode = false;
      _render();
    };
    reader.readAsDataURL(file);
  }

  function _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return { init, refresh, updateMarkers };
})();
