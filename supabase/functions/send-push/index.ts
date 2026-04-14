// send-push — Edge Function dmsmart
// Web Push via VAPID implementado nativamente com SubtleCrypto (sem npm:web-push)
// Secrets necessários (Settings > Edge Functions > Secrets):
//   VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT, PUSH_SECRET

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Converte base64url → Uint8Array
function fromBase64url(b64: string): Uint8Array {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const b64std = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64std);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// Uint8Array → base64url
function toBase64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Cria o JWT VAPID
async function makeVapidJwt(audience: string, subject: string, publicKeyB64: string, privateKeyB64: string): Promise<string> {
  const step = { current: 'buildHeader' };
  try {
    const header = toBase64url(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
    const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
    const payload = toBase64url(new TextEncoder().encode(JSON.stringify({ aud: audience, exp, sub: subject })));
    const sigInput = `${header}.${payload}`;

    step.current = 'decodePublicKey';
    const pub = fromBase64url(publicKeyB64);

    step.current = 'buildJwk';
    const jwk = {
      kty: 'EC', crv: 'P-256',
      d: privateKeyB64,
      x: toBase64url(pub.slice(1, 33).buffer),
      y: toBase64url(pub.slice(33, 65).buffer),
      key_ops: ['sign'],
    };

    step.current = 'importKey';
    const privKey = await crypto.subtle.importKey(
      'jwk', jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false, ['sign']
    );

    step.current = 'sign';
    const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privKey, new TextEncoder().encode(sigInput));
    return `${sigInput}.${toBase64url(sig)}`;
  } catch (e) {
    throw new Error(`makeVapidJwt[${step.current}]: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// Encripta payload Web Push (draft-ietf-webpush-encryption aesgcm)
async function encryptPayload(payload: string, p256dhB64: string, authB64: string): Promise<{ body: Uint8Array; salt: string; serverPubB64: string }> {
  const step = { current: 'importClientKey' };
  try {
    const clientPubKey = await crypto.subtle.importKey('raw', fromBase64url(p256dhB64), { name: 'ECDH', namedCurve: 'P-256' }, true, []);
    const authSecret = fromBase64url(authB64);
    const salt = crypto.getRandomValues(new Uint8Array(16));

    step.current = 'generateServerKey';
    const serverKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey', 'deriveBits']);
    const serverPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', serverKeyPair.publicKey));

    step.current = 'deriveBitsECDH';
    const sharedBits = await crypto.subtle.deriveBits({ name: 'ECDH', public: clientPubKey }, serverKeyPair.privateKey, 256);

    const enc = new TextEncoder();
    step.current = 'importHkdfKey';
    const hkdfKey = await crypto.subtle.importKey('raw', sharedBits, { name: 'HKDF' }, false, ['deriveBits']);

    step.current = 'derivePrk';
    const prkBits = await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt: authSecret, info: enc.encode('Content-Encoding: auth\0') },
      hkdfKey, 256
    );
    const prkKey = await crypto.subtle.importKey('raw', prkBits, { name: 'HKDF' }, false, ['deriveBits']);

    step.current = 'buildKeyInfo';
    function u16(n: number) { return new Uint8Array([n >> 8, n & 0xff]); }
    const clientPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', clientPubKey));
    const keyInfo = new Uint8Array([
      ...enc.encode('Content-Encoding: aesgcm\0'),
      ...enc.encode('P-256\0'),
      ...u16(65), ...clientPubRaw,
      ...u16(65), ...serverPubRaw
    ]);
    const nonceInfo = new Uint8Array([
      ...enc.encode('Content-Encoding: nonce\0'),
      ...enc.encode('P-256\0'),
      ...u16(65), ...clientPubRaw,
      ...u16(65), ...serverPubRaw
    ]);

    step.current = 'deriveCEK';
    const keyBits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: keyInfo }, prkKey, 128);
    step.current = 'deriveNonce';
    const nonceBits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo }, prkKey, 96);

    step.current = 'aesGcmEncrypt';
    const aesKey = await crypto.subtle.importKey('raw', keyBits, { name: 'AES-GCM' }, false, ['encrypt']);
    const paddedPayload = new Uint8Array([0, 0, ...enc.encode(payload)]);
    const encBody = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: new Uint8Array(nonceBits) }, aesKey, paddedPayload));

    return { body: encBody, salt: toBase64url(salt), serverPubB64: toBase64url(serverPubRaw) };
  } catch (e) {
    throw new Error(`encryptPayload[${step.current}]: ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function sendWebPush(sub: { endpoint: string; p256dh: string; auth_key: string }, payloadStr: string, vapidPublic: string, vapidPrivate: string, vapidSubject: string) {
  const url = new URL(sub.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const jwt = await makeVapidJwt(audience, vapidSubject, vapidPublic, vapidPrivate);

  const { body, salt, serverPubB64 } = await encryptPayload(payloadStr, sub.p256dh, sub.auth_key);

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aesgcm',
      'Encryption': `salt=${salt}`,
      'Crypto-Key': `dh=${serverPubB64};p256ecdsa=${vapidPublic}`,
      'Authorization': `WebPush ${jwt}`,
      'TTL': '86400',
    },
    body
  });

  if (!res.ok && res.status !== 201) {
    const text = await res.text().catch(() => '');
    throw Object.assign(new Error(`Push failed: ${res.status}`), { statusCode: res.status, body: text });
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.replace('Bearer ', '').trim();
    const pushSecret = (Deno.env.get('PUSH_SECRET') || '').trim();
    const anonKey   = (Deno.env.get('SUPABASE_ANON_KEY') || '').trim();

    if (!token || (token !== pushSecret && token !== anonKey)) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json();
    const { installation_id, title, body: msgBody, icon, url, tag } = body;
    if (!installation_id || !title) return json({ error: 'installation_id e title são obrigatórios' }, 400);

    const vapidPublic  = (Deno.env.get('VAPID_PUBLIC_KEY')  || '').trim();
    const vapidPrivate = (Deno.env.get('VAPID_PRIVATE_KEY') || '').trim();
    const vapidSubject = Deno.env.get('VAPID_SUBJECT')     || 'mailto:admin@dmsmart.app';

    if (!vapidPublic || !vapidPrivate) return json({ error: 'VAPID não configurado' }, 500);

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: subs, error: dbErr } = await supabase
      .from('push_subscriptions').select('endpoint, p256dh, auth_key').eq('installation_id', installation_id);

    if (dbErr) return json({ error: dbErr.message }, 500);
    if (!subs?.length) return json({ sent: 0, message: 'Nenhum dispositivo inscrito' });

    const payload = JSON.stringify({ title, body: msgBody || '', icon: icon || '/icons/icon-192.png', badge: '/icons/icon-192.png', url: url || '/', tag: tag || 'dmsmart-alert' });

    const results = await Promise.allSettled(subs.map(sub => sendWebPush(sub, payload, vapidPublic, vapidPrivate, vapidSubject)));

    const sent   = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    const errors = results.filter(r => r.status === 'rejected').map(r => (r as PromiseRejectedResult).reason?.message);

    // Remove subscriptions expiradas (410)
    const goneEndpoints = results
      .map((r, i) => ({ r, sub: subs[i] }))
      .filter(({ r }) => r.status === 'rejected' && (r as PromiseRejectedResult).reason?.statusCode === 410)
      .map(({ sub }) => sub.endpoint);
    if (goneEndpoints.length) await supabase.from('push_subscriptions').delete().in('endpoint', goneEndpoints);

    return json({ sent, failed, total: subs.length, errors: errors.length ? errors : undefined });

  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
