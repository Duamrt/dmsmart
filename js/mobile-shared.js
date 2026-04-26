// mobile-shared.js — bootstrap comum às telas mobile (Fase B)
// Inicializa AuthStore, decide modo preview vs real, prepara ZoneRegistry e StateStore.
// Exporta MobileBoot via window.

(function () {
  'use strict';

  const PREVIEW_INSTALL = {
    id: 'preview',
    name: 'Casa Jupi',
    haUrl: '',
    zones: [
      { id: 'sala', name: 'Sala', icon: 'sofa', order: 1, devices: [
        { entity: 'light.spot_principal', name: 'Spot principal' },
        { entity: 'light.abajur', name: 'Abajur' },
        { entity: 'climate.ar_sala', name: 'Ar condicionado' },
        { entity: 'media_player.tv', name: 'TV Samsung' },
        { entity: 'media_player.jbl', name: 'JBL' },
        { entity: 'cover.cortina', name: 'Cortina' },
        { entity: 'switch.tomada', name: 'Tomada' },
      ]},
      { id: 'suite', name: 'Suíte', icon: 'bed', order: 2, devices: [
        { entity: 'light.suite_teto', name: 'Luz teto' },
        { entity: 'climate.ar_suite', name: 'Ar Suíte' },
        { entity: 'cover.persiana_suite', name: 'Persiana' },
      ]},
      { id: 'cozinha', name: 'Cozinha', icon: 'stove', order: 3, devices: [
        { entity: 'light.cozinha', name: 'Luz cozinha' },
        { entity: 'switch.geladeira', name: 'Geladeira' },
      ]},
      { id: 'bwc', name: 'BWC Suíte', icon: 'bath', order: 4, devices: [
        { entity: 'light.bwc_suite', name: 'Luz BWC' },
      ]},
      { id: 'garagem', name: 'Garagem', icon: 'garage', order: 5, devices: [
        { entity: 'cover.portao', name: 'Portão' },
        { entity: 'camera.garagem', name: 'Câmera' },
        { entity: 'light.garagem', name: 'Luz' },
      ]},
    ],
  };

  const PREVIEW_STATES = [
    { entity_id: 'light.spot_principal', state: 'on'    },
    { entity_id: 'light.abajur',         state: 'on'    },
    { entity_id: 'climate.ar_sala',      state: 'cool'  },
    { entity_id: 'media_player.tv',      state: 'off'   },
    { entity_id: 'media_player.jbl',     state: 'off'   },
    { entity_id: 'cover.cortina',        state: 'closed'},
    { entity_id: 'switch.tomada',        state: 'on'    },
    { entity_id: 'light.suite_teto',     state: 'on'    },
    { entity_id: 'climate.ar_suite',     state: 'auto' },
    { entity_id: 'cover.persiana_suite', state: 'closed'},
    { entity_id: 'light.cozinha',        state: 'off'   },
    { entity_id: 'switch.geladeira',     state: 'on'    },
    { entity_id: 'light.bwc_suite',      state: 'off'   },
    { entity_id: 'cover.portao',         state: 'closed'},
    { entity_id: 'camera.garagem',       state: 'recording' },
    { entity_id: 'light.garagem',        state: 'off'   },
  ];

  const MobileBoot = {
    previewMode: false,
    inst: null,

    async init() {
      try { await AuthStore.init(); } catch (e) { console.warn('[mobile] auth init', e); }

      let inst = null;
      if (AuthStore.isLoggedIn?.()) {
        inst = ActiveInstallation.ensure();
      }

      if (!inst) {
        this.previewMode = true;
        inst = JSON.parse(JSON.stringify(PREVIEW_INSTALL));
      }
      this.inst = inst;

      ZoneRegistry.init(inst);

      if (this.previewMode) {
        StateStore.init(JSON.parse(JSON.stringify(PREVIEW_STATES)));
        return;
      }

      // Modo real: conecta no HA
      const haUrl = inst.haUrl || inst.ha_url;
      const haToken = ActiveInstallation.getToken?.();
      if (haUrl && haToken) {
        HAClient.setConfig({ url: haUrl, token: haToken });
        try {
          await HAClient.connect();
          const all = await HAClient.send({ type: 'get_states' });
          if (Array.isArray(all)) {
            const watched = new Set(ZoneRegistry.allEntityIds());
            const filtered = all.filter(s => watched.has(s.entity_id));
            StateStore.init(filtered);
          }
          HAClient.onStateChanged?.((entityId, newState) => {
            const watched = new Set(ZoneRegistry.allEntityIds());
            if (watched.has(entityId)) {
              StateStore.update(entityId, { entity_id: entityId, state: newState.state, attributes: newState.attributes });
            }
          });
        } catch (e) {
          console.warn('[mobile] HA falhou, modo offline', e);
        }
      }
    },

    iconForDomain(domain) {
      const icons = {
        light:    '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 18h6M10 22h4M12 2a7 7 0 0 1 4 12.7c-.6.5-1 1.3-1 2.1V18H9v-1.2c0-.8-.4-1.6-1-2.1A7 7 0 0 1 12 2z"/></svg>',
        switch:   '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" d="M12 7v5"/></svg>',
        climate:  '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path stroke-linecap="round" d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41"/></svg>',
        cover:    '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path stroke-linecap="round" d="M3 9h18M3 15h18"/></svg>',
        camera:   '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path stroke-linecap="round" stroke-linejoin="round" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/></svg>',
        sensor:   '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M12 2v8M8 12h8"/></svg>',
        media_player: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="14" rx="2"/></svg>',
      };
      return icons[domain] || icons.switch;
    },

    formatMeta(dev, st) {
      if (!st) return '<span style="opacity:.5">desconectado</span>';
      const domain = dev.entity.split('.')[0];
      if (domain === 'light' || domain === 'switch') return st.state === 'on' ? 'ligado' : 'desligado';
      if (domain === 'climate') return st.state === 'off' ? 'desligado' : MobileBoot.escapeHtml(st.state);
      if (domain === 'cover') return st.state === 'open' ? 'aberta' : st.state === 'closed' ? 'fechada' : MobileBoot.escapeHtml(st.state);
      if (domain === 'camera') return st.state === 'recording' ? '● gravando' : 'standby';
      if (domain === 'media_player') return st.state === 'playing' ? '▶ tocando' : st.state === 'idle' ? 'parado' : 'desligado';
      return MobileBoot.escapeHtml(st.state);
    },

    escapeHtml(s) {
      const d = document.createElement('div');
      d.textContent = String(s ?? '');
      return d.innerHTML;
    },

    async toggle(entityId) {
      if (this.previewMode) {
        const st = StateStore.get(entityId);
        const next = st?.state === 'on' ? 'off' : 'on';
        StateStore.update(entityId, { entity_id: entityId, state: next, attributes: st?.attributes || {} });
        return;
      }
      const domain = entityId.split('.')[0];
      try {
        await HAClient.callService(domain, 'toggle', { entity_id: entityId });
      } catch (err) {
        console.warn('[mobile] toggle falhou', err);
      }
    },
  };

  window.MobileBoot = MobileBoot;
})();
