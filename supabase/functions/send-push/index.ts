// send-push — Edge Function dmsmart
// Recebe: { installation_id, title, body, icon?, url?, tag? }
// Envia Web Push para todos os dispositivos inscritos na instalação
// Autorização: Bearer = SUPABASE_ANON_KEY ou PUSH_SECRET (custom secret)
//
// Secrets necessários no painel Supabase (Settings > Edge Functions > Secrets):
//   VAPID_PRIVATE_KEY   = CE2Tgj0nWy_Ln0DdbL7iPiQ6kam67geSJkUTalZyTmA
//   VAPID_PUBLIC_KEY    = BH37qwVWQN6QcetOPzZGLS3T1fJQftCm2iZ4DySt4bnR-m0keHekDFwRbTA7u2LnpZgPdHY49JMGvUOde-XGU5Y
//   VAPID_SUBJECT       = mailto:duam@edreng.com.br
//   PUSH_SECRET         = (string livre — use no HA para autenticar)

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Auth: aceita anon key do Supabase ou PUSH_SECRET customizado
  const auth = req.headers.get('authorization') || '';
  const token = auth.replace('Bearer ', '');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const pushSecret = Deno.env.get('PUSH_SECRET') || '';

  if (!token || (token !== anonKey && token !== pushSecret)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  let body: { installation_id?: string; title?: string; body?: string; icon?: string; url?: string; tag?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { installation_id, title, body: msgBody, icon, url, tag } = body;
  if (!installation_id || !title) {
    return new Response(JSON.stringify({ error: 'installation_id e title são obrigatórios' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Configura VAPID
  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@dmsmart.app',
    Deno.env.get('VAPID_PUBLIC_KEY') || '',
    Deno.env.get('VAPID_PRIVATE_KEY') || ''
  );

  // Busca subscriptions da instalação
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  );

  const { data: subs, error: dbErr } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth_key')
    .eq('installation_id', installation_id);

  if (dbErr) {
    return new Response(JSON.stringify({ error: dbErr.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ sent: 0, message: 'Nenhum dispositivo inscrito' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const payload = JSON.stringify({
    title,
    body: msgBody || '',
    icon: icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    url: url || '/',
    tag: tag || 'dmsmart-alert'
  });

  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        payload
      )
    )
  );

  const sent = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  // Remove subscriptions inválidas (410 Gone)
  const goneEndpoints = results
    .map((r, i) => ({ r, sub: subs[i] }))
    .filter(({ r }) => r.status === 'rejected' && (r as PromiseRejectedResult).reason?.statusCode === 410)
    .map(({ sub }) => sub.endpoint);

  if (goneEndpoints.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', goneEndpoints);
  }

  return new Response(JSON.stringify({ sent, failed, total: subs.length }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
