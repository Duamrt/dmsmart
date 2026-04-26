// mobile-login.js — injeta botão e modal de login em qualquer tela mobile/tablet
// se não houver sessão Supabase ativa.
(function () {
  'use strict';

  function inject() {
    if (document.getElementById('m-auth-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'm-auth-overlay';
    overlay.className = 'm-auth-overlay';
    overlay.innerHTML = `
      <form class="m-auth-card" id="m-auth-form">
        <h2>Entrar no DM Smart</h2>
        <div>
          <label for="m-auth-email">E-mail</label>
          <input type="email" id="m-auth-email" autocomplete="email" required>
        </div>
        <div>
          <label for="m-auth-pass">Senha</label>
          <input type="password" id="m-auth-pass" autocomplete="current-password" required>
        </div>
        <div class="m-auth-err" id="m-auth-err"></div>
        <div class="m-auth-actions">
          <button type="button" class="m-auth-btn ghost" id="m-auth-cancel">Cancelar</button>
          <button type="submit" class="m-auth-btn primary" id="m-auth-submit">Entrar</button>
        </div>
      </form>
    `;
    document.body.appendChild(overlay);

    const pill = document.createElement('button');
    pill.className = 'm-login-pill';
    pill.textContent = 'Entrar';
    pill.addEventListener('click', () => {
      overlay.classList.add('open');
      setTimeout(() => document.getElementById('m-auth-email')?.focus(), 50);
    });
    document.body.appendChild(pill);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
    document.getElementById('m-auth-cancel').addEventListener('click', () => overlay.classList.remove('open'));

    document.getElementById('m-auth-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('m-auth-email').value.trim();
      const pass  = document.getElementById('m-auth-pass').value;
      const errEl = document.getElementById('m-auth-err');
      const btn   = document.getElementById('m-auth-submit');
      errEl.textContent = '';
      btn.disabled = true; btn.textContent = 'Entrando…';
      try {
        if (typeof AuthStore === 'undefined') throw new Error('Auth store não disponível');
        await AuthStore.login(email, pass);
        try { await InstallationStore.pullFromCloud?.(); } catch {}
        window.location.reload();
      } catch (err) {
        errEl.textContent = err?.message || 'Falha no login';
        btn.disabled = false; btn.textContent = 'Entrar';
      }
    });
  }

  // Aguarda AuthStore inicializar, depois decide se mostra o pill
  function tryInject() {
    if (typeof AuthStore === 'undefined' || typeof AuthStore.isLoggedIn !== 'function') {
      setTimeout(tryInject, 200);
      return;
    }
    // Espera 500ms pra dar tempo de _user ser populado
    setTimeout(() => {
      if (!AuthStore.isLoggedIn()) inject();
    }, 800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInject, { once: true });
  } else {
    tryInject();
  }
})();
