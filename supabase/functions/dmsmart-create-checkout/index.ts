// dmsmart-create-checkout — Edge Function Supabase
// Cria uma Stripe Checkout Session e retorna a URL de redirecionamento.
//
// Variáveis de ambiente necessárias (Supabase Dashboard → Settings → Edge Functions):
//   STRIPE_SECRET_KEY        — sk_live_...
//   STRIPE_PRICE_PROFISSIONAL — price_...  (R$49/mês)
//   STRIPE_PRICE_INTEGRADOR  — price_...  (R$39/mês)

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const PRICES: Record<string, string> = {
      profissional: Deno.env.get('STRIPE_PRICE_PROFISSIONAL')!,
      integrador:   Deno.env.get('STRIPE_PRICE_INTEGRADOR')!,
    };

    const { plan, user_id, email, success_url, cancel_url } = await req.json();

    const priceId = PRICES[plan];
    if (!priceId) {
      return new Response(JSON.stringify({ error: `Plano inválido: ${plan}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Supabase admin para ler/escrever stripe_customer_id
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Busca ou cria customer Stripe
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('user_id', user_id)
      .single();

    let customerId: string = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { user_id, plan },
      });
      customerId = customer.id;
      await supabase
        .from('user_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', user_id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${success_url}?checkout=success&plan=${plan}`,
      cancel_url:  `${cancel_url}?checkout=cancel`,
      locale: 'pt-BR',
      metadata: { plan, user_id },
      subscription_data: { metadata: { plan, user_id } },
      allow_promotion_codes: true,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[create-checkout]', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
