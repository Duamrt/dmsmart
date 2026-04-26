// dm-assistant.js v3.2 — markdown rendering no painel HUD
const DM_VERSION = 'v3.2.0';
console.log(`%c[DM] ${DM_VERSION} carregado`, 'color:#38bdf8;font-weight:bold;font-size:14px');

const DM_CONFIG = {
  supabaseUrl:    'https://bkfkzauhnlulrtttgcii.supabase.co',
  supabaseKey:    'sb_publishable_6tsPVQYcS9FlJM0ZwKKH-w_3xRRsm8h',
  elevenLabsKey:  'sk_c6d11d9d75f846c4ba2e89c0ee11721949d1c22136f5b615',
  elevenVoiceId:  'aU2vcrnwi348Gnc2Y1si', // José — Rural character (pt-BR)
  elevenModel:    'eleven_multilingual_v2',
};

const WAKE_WORDS = [
  /\b(ei|oi|hey|e)\s*(dm|demi|d\.?m\.?)\b/i,
  /\boi\s+demi\b/i,
  /\bei\s+demi\b/i,
  /\bdemi\b/i,
];

function _contemWake(texto) {
  return WAKE_WORDS.some(r => r.test(texto));
}

function _removerWake(texto) {
  let t = texto;
  for (const r of WAKE_WORDS) t = t.replace(r, '');
  // remove vírgula/ponto/espaço sobrando no início
  return t.replace(/^[\s,\.]+/, '').trim();
}

class DMAssistant {
  constructor() {
    this.sb          = window.supabase.createClient(DM_CONFIG.supabaseUrl, DM_CONFIG.supabaseKey);
    this.ttsVoice    = null;
    this.ouvindo     = false;
    this.awake       = false; // wake word foi detectado, aguardando comando
    this.recognition = null;

    this._initTTS();
    this._initSpeech();
    this._iniciarEscutaPassiva();
  }

  // ── TTS Chrome (fallback) ────────────────────────────────────────────────────

  _initTTS() {
    if (!window.speechSynthesis) return;
    const set = () => {
      const voices = speechSynthesis.getVoices();
      this.ttsVoice =
        voices.find(v => v.name === 'Google português do Brasil') ||
        voices.find(v => v.name.startsWith('Google') && v.lang === 'pt-BR') ||
        voices.find(v => v.lang === 'pt-BR' && !v.name.includes('Daniel') && !v.name.includes('Hortencia')) ||
        null;
    };
    set();
    speechSynthesis.onvoiceschanged = set;
  }

  _falarFallback(limpo) {
    if (!this.ttsVoice || !limpo) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(limpo);
    u.voice = this.ttsVoice;
    u.lang  = 'pt-BR';
    u.rate  = 1.0;
    speechSynthesis.speak(u);
  }

  // ── TTS ElevenLabs (José) — só fala respostas curtas pra economizar chars ───

  async _falar(texto) {
    if (!texto?.trim()) return;
    const limpo = texto.replace(/[#*_`~]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').substring(0, 400);

    // Respostas longas ficam só no chat — sem gastar chars da ElevenLabs
    if (limpo.length > 120) return;

    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${DM_CONFIG.elevenVoiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': DM_CONFIG.elevenLabsKey,
        },
        body: JSON.stringify({
          text: limpo,
          model_id: DM_CONFIG.elevenModel,
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.80,
            style: 0.30,
            use_speaker_boost: true,
          },
        }),
      });

      if (!res.ok) {
        console.warn('[DM TTS] ElevenLabs', res.status, '— fallback Chrome');
        this._falarFallback(limpo);
        return;
      }

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const aud  = new Audio(url);
      aud.onended = () => URL.revokeObjectURL(url);
      aud.play();
    } catch (e) {
      console.warn('[DM TTS] Erro ElevenLabs:', e.message, '— fallback Chrome');
      this._falarFallback(limpo);
    }
  }

  // ── STT ──────────────────────────────────────────────────────────────────────

  // ── STT: uma única instância, modo muda entre passivo/ativo ─────────────────

  _initSpeech() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    this._SR   = SR;
    this._modo = 'parado'; // 'parado' | 'passivo' | 'ativo'
  }

  _criarRec() {
    const r          = new this._SR();
    r.lang           = 'pt-BR';
    r.continuous     = true;   // nunca para sozinho
    r.interimResults = true;
    return r;
  }

  async _iniciarEscutaPassiva() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
    } catch(e) {
      this._setStatus('erro', 'Microfone bloqueado — clique no cadeado e permita');
      return;
    }
    this._ligarPassivo();
  }

  _ligarPassivo() {
    if (this._modo === 'passivo') return;
    this._pararRec();
    this._modo = 'passivo';

    const r = this._criarRec();
    r.onresult = e => {
      const res  = e.results[e.results.length - 1];
      if (!res.isFinal) return;
      const txt = res[0].transcript.trim();
      console.log('[DM passivo]', txt);
      if (this._modo !== 'passivo') return;
      if (_contemWake(txt)) {
        const cmd = _removerWake(txt);
        this._ativar(r, cmd);
      }
    };
    r.onerror = e => {
      if (e.error === 'aborted') return;
      console.warn('[DM rec erro]', e.error);
      if (this._modo === 'passivo') setTimeout(() => this._ligarPassivo(), 500);
    };
    r.onend = () => {
      if (this._modo === 'passivo') setTimeout(() => this._ligarPassivo(), 300);
    };
    this._rec = r;
    try { r.start(); } catch(_) {}
    this._setStatus('pronto', '● ouvindo — diga "Ei DM"');
  }

  _pararRec() {
    try { this._rec?.stop(); } catch(_) {}
    this._rec  = null;
    this._modo = 'parado';
  }

  _bip() {
    try {
      const ctx = new AudioContext();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.3, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      o.start(); o.stop(ctx.currentTime + 0.15);
    } catch(_) {}
  }

  _ativar(recAtual, cmdImediato) {
    this._bip();
    // comando veio junto com o wake word — executa direto
    if (cmdImediato) {
      this._onTexto(cmdImediato);
      return; // _onTexto reinicia passivo ao terminar
    }
    // muda o mesmo recognition pro modo ativo
    this._modo = 'ativo';
    this.ouvindo = true;
    this._updateBtn();
    this._setStatus('ouvindo', 'Ouvindo...');

    // substitui handler pelo ativo (mesmo objeto r)
    recAtual.onresult = e => {
      const res = e.results[e.results.length - 1];
      const txt = res[0].transcript.trim();
      const input = document.getElementById('dm-input');
      if (input) input.value = txt;
      if (res.isFinal && txt) {
        this._onTexto(txt);
      }
    };
    recAtual.onend = () => {
      if (this._modo === 'ativo') this._ligarPassivo();
    };
  }

  async toggleOuvir() {
    if (!this._SR) { alert('Navegador nao suporta voz.'); return; }
    if (this.ouvindo) {
      this._ligarPassivo();
      this.ouvindo = false;
      this._updateBtn();
      return;
    }
    this._bip();
    this._modo = 'ativo';
    this.ouvindo = true;
    this._updateBtn();
    this._setStatus('ouvindo', 'Ouvindo...');
    const r = this._criarRec();
    r.onresult = e => {
      const res = e.results[e.results.length - 1];
      const txt = res[0].transcript.trim();
      const input = document.getElementById('dm-input');
      if (input) input.value = txt;
      if (res.isFinal && txt) this._onTexto(txt);
    };
    r.onend = () => { if (this._modo === 'ativo') this._ligarPassivo(); };
    r.onerror = () => this._ligarPassivo();
    this._rec = r;
    try { r.start(); } catch(_) {}
  }

  async enviarTexto(texto) { await this._onTexto(texto); }

  // ── Fluxo principal ──────────────────────────────────────────────────────────

  async _onTexto(texto) {
    if (!texto?.trim()) return;
    const input = document.getElementById('dm-input');
    if (input) input.value = '';
    this._addMsg('user', texto);
    this._setStatus('pensando', 'DM pensando...');

    try {
      const resposta = await this._enviarParaWorker(texto);
      this._addMsg('dm', resposta);
      this._falar(resposta);
    } catch (e) {
      console.error('[DM] Erro:', e);
      this._addMsg('dm', `Erro: ${e.message}. O worker esta rodando?`);
    }

    setTimeout(() => {
      this._reiniciarPassivo();
      this._setStatus('pronto', '● ouvindo — diga "Ei DM"');
    }, 1500);
  }

  // ── Envia p/ worker Python via Supabase ───────────────────────────────────────

  async _enviarParaWorker(mensagem) {
    const { data: cmd, error } = await this.sb
      .from('dm_commands')
      .insert({ acao: 'chat', parametros: { mensagem }, fonte: 'dm', status: 'pendente' })
      .select()
      .single();

    if (error || !cmd) throw new Error('Falha ao inserir comando no Supabase');
    return await this._aguardarResultado(cmd.id);
  }

  _aguardarResultado(cmdId) {
    return new Promise((resolve, reject) => {
      let resolvido = false;
      let channel = null;

      const finalizar = (ok, val) => {
        if (resolvido) return;
        resolvido = true;
        if (channel) { this.sb.removeChannel(channel); channel = null; }
        ok ? resolve(val) : reject(new Error(val));
      };

      // Timeout de segurança
      const timer = setTimeout(() => finalizar(false, 'Timeout — worker não respondeu'), 30000);

      // Realtime: notificação instantânea quando status muda
      channel = this.sb
        .channel(`dm_cmd_${cmdId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'dm_commands', filter: `id=eq.${cmdId}` }, payload => {
          const s = payload.new?.status;
          if (s === 'executado') { clearTimeout(timer); finalizar(true, payload.new.resultado || payload.new.result || '...'); }
          else if (s === 'erro')  { clearTimeout(timer); finalizar(false, payload.new.resultado || 'Erro no worker'); }
        })
        .subscribe();

      // Fallback poll a cada 800ms (caso Realtime falhe)
      const poll = async () => {
        if (resolvido) return;
        const { data } = await this.sb.from('dm_commands').select('status,resultado,result').eq('id', cmdId).single();
        if (data?.status === 'executado') { clearTimeout(timer); finalizar(true, data.resultado || data.result || '...'); }
        else if (data?.status === 'erro') { clearTimeout(timer); finalizar(false, data.resultado || 'Erro no worker'); }
        else if (!resolvido) setTimeout(poll, 800);
      };
      setTimeout(poll, 800);
    });
  }

  // ── UI ────────────────────────────────────────────────────────────────────────

  _addMsg(role, texto) {
    const feed = document.getElementById('dm-feed');
    if (!feed) return;
    document.getElementById('feed-empty')?.remove();
    const div     = document.createElement('div');
    div.className = `dm-msg dm-msg--${role}`;
    if (role === 'dm') {
      div.innerHTML = this._md(texto);
    } else {
      div.textContent = texto;
    }
    feed.appendChild(div);
    feed.scrollTop = feed.scrollHeight;
  }

  // markdown leve → HTML (escapa primeiro, depois aplica formatação)
  _md(s) {
    if (!s) return '';
    const esc = String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const lines = esc.split(/\r?\n/);
    const out = [];
    let inUl = false, inOl = false;
    const closeLists = () => {
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (inOl) { out.push('</ol>'); inOl = false; }
    };
    const inline = (t) => t
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|\s)\*([^*\n]+)\*/g, '$1<em>$2</em>')
      .replace(/(^|\s)_([^_\n]+)_/g, '$1<em>$2</em>')
      .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    for (const raw of lines) {
      const l = raw.trimEnd();
      let m;
      if (!l.trim()) { closeLists(); continue; }
      if ((m = l.match(/^###\s+(.*)$/))) { closeLists(); out.push(`<h3>${inline(m[1])}</h3>`); continue; }
      if ((m = l.match(/^##\s+(.*)$/)))  { closeLists(); out.push(`<h2>${inline(m[1])}</h2>`); continue; }
      if ((m = l.match(/^#\s+(.*)$/)))   { closeLists(); out.push(`<h1>${inline(m[1])}</h1>`); continue; }
      if ((m = l.match(/^\s*[-*]\s+(.*)$/))) {
        if (inOl) { out.push('</ol>'); inOl = false; }
        if (!inUl) { out.push('<ul>'); inUl = true; }
        out.push(`<li>${inline(m[1])}</li>`);
        continue;
      }
      if ((m = l.match(/^\s*\d+\.\s+(.*)$/))) {
        if (inUl) { out.push('</ul>'); inUl = false; }
        if (!inOl) { out.push('<ol>'); inOl = true; }
        out.push(`<li>${inline(m[1])}</li>`);
        continue;
      }
      closeLists();
      out.push(`<p>${inline(l)}</p>`);
    }
    closeLists();
    return out.join('');
  }

  _setStatus(estado, texto) {
    const el = document.getElementById('dm-status');
    if (el) { el.textContent = texto; el.dataset.estado = estado; }
    const map = { ouvindo: 'listen', pensando: 'think', executando: 'think', pronto: 'idle', erro: 'error' };
    if (window._orbSetState) window._orbSetState(map[estado] || 'idle');
  }

  _updateBtn() {
    document.getElementById('dm-btn-voz')?.classList.toggle('dm-btn--ativo', this.ouvindo);
  }
}

window.DM = new DMAssistant();
