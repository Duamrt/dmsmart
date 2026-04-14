// checkout.js — Self-service upgrade via Stripe Checkout
// Fluxo: botão Fazer upgrade → Edge Function cria Session → redirect Stripe → volta com ?checkout=success
// CONFIGURAR: STRIPE_PK abaixo (chave pública, segura no frontend)
'use strict';

const LicenseCheckout = (() => {
  // ── Configuração ─────────────────────────────────────────────────────────
  // Preencher após criar conta no Stripe (chave pública — pode ficar no código)
  const STRIPE_PK = 'pk_live_PREENCHER_AQUI';

  const EDGE_URL = 'https://ojuzuojdjnhqiuwvhstv.supabase.co/functions/v1/dmsmart-create-checkout';
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qdXp1b2pkam5ocWl1d3Zoc3R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwOTkzMDMsImV4cCI6MjA5MTY3NTMwM30.UbIEp08Xx54vdzNHpY9ue6UO19n1vjUA6O78TQGXJlA';

  // ── Checkout ──────────────────────────────────────────────────────────────
  async function open(planKey) {
    if (STRIPE_PK.includes('PREENCHER')) {
      alert('Pagamento online em breve! Por enquanto, fale pelo WhatsApp para fazer upgrade.');
      return;
    }

    const user = (typeof AuthStore !== 'undefined') ? AuthStore.getUser() : null;
    if (!user) { _toast('Faça login para continuar.', 'error'); return; }

    // Loading nos botões desse plano
    const btns = document.querySelectorAll(`[data-checkout="${planKey}"]`);
    btns.forEach(b => { b.disabled = true; b.dataset.origText = b.textContent; b.textContent = 'Aguarde…'; });

    try {
      const session = await SUPA.auth.getSession();
      const token = session?.data?.session?.access_token || ANON_KEY;

      const res = await fetch(EDGE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': ANON_KEY,
        },
        body: JSON.stringify({
          plan: planKey,
          user_id: user.id,
          email: user.email,
          success_url: location.origin + location.pathname,
          cancel_url: location.origin + location.pathname,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Erro ao criar sessão de pagamento');
      }
    } catch (err) {
      _toast('Não foi possível abrir o checkout: ' + err.message, 'error');
      btns.forEach(b => {
        b.disabled = false;
        b.textContent = b.dataset.origText || 'Fazer upgrade';
      });
    }
  }

  // ── Retorno do Stripe ─────────────────────────────────────────────────────
  // Chamado no init do app — lê ?checkout=success|cancel&plan=profissional
  function handleReturn() {
    const params = new URLSearchParams(location.search);
    const status = params.get('checkout');
    if (!status) return;

    history.replaceState({}, '', location.pathname);

    if (status === 'success') {
      const plan = params.get('plan');
      const names = { profissional: 'Profissional', integrador: 'Integrador' };
      _toast(`✓ Upgrade para ${names[plan] || 'novo plano'} ativado! Recarregando…`, 'success');
      // Aguarda um pouco para o webhook atualizar o banco, então recarrega
      setTimeout(() => location.reload(), 2500);
    } else if (status === 'cancel') {
      _toast('Pagamento cancelado. Nenhum valor foi cobrado.', 'neutral');
    }
  }

  // ── Toast ─────────────────────────────────────────────────────────────────
  function _toast(msg, type) {
    const t = document.createElement('div');
    t.className = `checkout-toast checkout-toast--${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('checkout-toast--visible'));
    const dur = type === 'success' ? 4000 : 3000;
    setTimeout(() => {
      t.classList.remove('checkout-toast--visible');
      setTimeout(() => t.remove(), 350);
    }, dur);
  }

  return { open, handleReturn };
})();
