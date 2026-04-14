// dmsmart-stripe-webhook — Edge Function Supabase
// Recebe eventos do Stripe e atualiza o plano do usuário no banco.
//
// Variáveis de ambiente necessárias:
//   STRIPE_SECRET_KEY        — sk_live_...
//   STRIPE_WEBHOOK_SECRET    — whsec_...  (gerado ao criar o webhook no Stripe Dashboard)
//
// Endpoint a cadastrar no Stripe Dashboard → Webhooks:
//   https://ojuzuojdjnhqiuwvhstv.supabase.co/functions/v1/dmsmart-stripe-webhook
//
// Eventos a habilitar no Stripe:
//   checkout.session.completed
//   customer.subscription.deleted

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  });

  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
    );
  } catch (err: any) {
    console.error('[stripe-webhook] assinatura inválida:', err.message);
    return new Response('Webhook signature error', { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // ── Pagamento confirmado → ativa plano ───────────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.CheckoutSession;
    const customerId = session.customer as string;
    const planKey = session.metadata?.plan;

    if (!planKey || !customerId) {
      console.error('[stripe-webhook] metadata incompleto:', { planKey, customerId });
      return new Response(JSON.stringify({ ok: false, reason: 'metadata incompleto' }), { status: 200 });
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({ plan: planKey })
      .eq('stripe_customer_id', customerId);

    if (error) console.error('[stripe-webhook] update plan error:', error.message);
    else console.log(`[stripe-webhook] plano atualizado → ${planKey} (customer: ${customerId})`);
  }

  // ── Assinatura cancelada → volta para básico ─────────────────────────────
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = sub.customer as string;

    const { error } = await supabase
      .from('user_profiles')
      .update({ plan: 'basico' })
      .eq('stripe_customer_id', customerId);

    if (error) console.error('[stripe-webhook] downgrade error:', error.message);
    else console.log(`[stripe-webhook] cancelamento → básico (customer: ${customerId})`);
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
