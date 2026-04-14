// push-manager.js — Web Push Notifications para dmsmart
// VAPID public key gerada em 2026-04-13 (privada está nas secrets do Supabase)
// Depende de: SUPA (supabase-client.js), AuthStore (auth-store.js)

const PushManager = (() => {
  const VAPID_PUBLIC = 'BH37qwVWQN6QcetOPzZGLS3T1fJQftCm2iZ4DySt4bnR-m0keHekDFwRbTA7u2LnpZgPdHY49JMGvUOde-XGU5Y';

  let _swReg = null;
  let _installationId = null;
  let _subscribed = false; // rastreia se há subscription ativa (permission !== subscribed)

  function isSupported() {
    return 'Notification' in window && 'PushManager' in window && !!_swReg;
  }

  function getStatus() {
    if (!isSupported()) return 'unsupported';
    if (Notification.permission === 'denied') return 'denied';
    if (_subscribed) return 'granted';
    return 'default';
  }

  function _urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
  }

  async function _saveSubscription(sub) {
    const json = sub.toJSON();
    const user_id = (typeof AuthStore !== 'undefined' && AuthStore.isLoggedIn())
      ? AuthStore.getUser().id
      : null;

    const { error } = await SUPA.from('push_subscriptions').upsert({
      user_id,
      installation_id: _installationId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth_key: json.keys.auth,
      user_agent: navigator.userAgent.slice(0, 200)
    }, { onConflict: 'endpoint' });

    if (error) console.warn('[push] falha ao salvar subscription:', error.message);
    else console.log('[push] subscription salva para instalação:', _installationId);
  }

  async function _deleteSubscription(sub) {
    await SUPA.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  }

  function _renderButton() {
    const btn = document.getElementById('push-toggle-btn');
    if (!btn) return;
    const status = getStatus();
    btn.dataset.status = status;
    if (status === 'granted') {
      btn.title = 'Notificações ativas — clique para desativar';
      btn.querySelector('.push-btn-label').textContent = 'Notificações ativas';
    } else if (status === 'denied') {
      btn.title = 'Notificações bloqueadas pelo navegador';
      btn.querySelector('.push-btn-label').textContent = 'Notificações bloqueadas';
    } else if (status === 'unsupported') {
      btn.title = 'Notificações não suportadas neste dispositivo';
      btn.querySelector('.push-btn-label').textContent = 'Push não suportado';
      btn.disabled = true;
    } else {
      btn.title = 'Ativar notificações push';
      btn.querySelector('.push-btn-label').textContent = 'Ativar notificações';
    }
  }

  async function toggle() {
    if (!isSupported()) return;
    const status = getStatus();

    if (status === 'granted') {
      // Desativar
      const existing = await _swReg.pushManager.getSubscription();
      if (existing) {
        await _deleteSubscription(existing);
        await existing.unsubscribe();
      }
      _subscribed = false;
      _renderButton();
      return;
    }

    if (status === 'denied') {
      alert('Notificações bloqueadas. Habilite nas configurações do navegador para este site.');
      return;
    }

    // Pedir permissão e inscrever
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { _renderButton(); return; }

    try {
      const sub = await _swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: _urlBase64ToUint8Array(VAPID_PUBLIC)
      });
      await _saveSubscription(sub);
      _subscribed = true;
    } catch (err) {
      console.warn('[push] falha ao inscrever:', err.message);
    }
    _renderButton();
  }

  async function init(swReg, installationId) {
    _swReg = swReg;
    _installationId = installationId;
    _renderButton();

    const btn = document.getElementById('push-toggle-btn');
    if (btn && !btn._pushBound) {
      btn._pushBound = true;
      btn.addEventListener('click', () => toggle());
    }

    // Checa se já existe subscription ativa (define _subscribed antes de renderizar)
    const existing = await _swReg.pushManager.getSubscription();
    if (existing && Notification.permission === 'granted') {
      _subscribed = true;
      await _saveSubscription(existing);
    } else if (!existing && Notification.permission === 'granted' && localStorage.getItem('dmsmart_push_pending')) {
      // Permissão foi concedida no wizard de onboarding — inscrever agora que o SW está pronto
      localStorage.removeItem('dmsmart_push_pending');
      try {
        const sub = await _swReg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: _urlBase64ToUint8Array(VAPID_PUBLIC)
        });
        await _saveSubscription(sub);
        _subscribed = true;
        console.log('[push] auto-subscribe via onboarding concluído');
      } catch (err) {
        console.warn('[push] auto-subscribe via onboarding falhou:', err.message);
      }
    }
    _renderButton();
  }

  return { init, toggle, getStatus, isSupported };
})();
