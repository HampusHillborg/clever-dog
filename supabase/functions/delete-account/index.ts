// Edge Function: delete-account
// Tillåter en inloggad kund att radera sitt eget konto och all tillhörande
// persondata. Krav från Apple (2022) och Play Store att radering ska gå att
// göra från appen, inte bara via email/kontaktformulär.
//
// Vad som raderas:
//   - auth.users-raden (cascade → device_tokens via FK)
//   - customers-raden (cascade → customer_dogs, messages; sätter
//     bookings.customer_id = null så historiska bokningsposter behålls
//     för bokföringskrav om hunden har co-ownership)
//   - dogs där denna kund är ENDA ägare (cascade → bookings,
//     recurring_schedule, dog_daily_reports, dog_attendance,
//     dog_vaccinations, dog_activities)
//
// Dogs med co-owners behålls — de tas inte bort eftersom medägaren har
// fortsatt behov av sin hundprofil.

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const responseHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing token' }), { status: 401, headers: responseHeaders });
  }
  const jwt = authHeader.replace(/^bearer\s+/i, '').trim();

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: { user }, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !user) {
    return new Response(
      JSON.stringify({ error: 'Invalid token', detail: userErr?.message ?? null }),
      { status: 401, headers: responseHeaders },
    );
  }

  const { data: customer, error: cErr } = await admin
    .from('customers')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (cErr) {
    return new Response(JSON.stringify({ error: 'DB error', detail: cErr.message }), { status: 500, headers: responseHeaders });
  }

  if (customer) {
    const { data: ownedDogs } = await admin
      .from('customer_dogs')
      .select('dog_id')
      .eq('customer_id', customer.id);
    const dogIds = (ownedDogs ?? []).map((r: { dog_id: string }) => r.dog_id);

    // Identify dogs where this customer is the only owner — those will be
    // orphaned after we delete the customer, so delete them too.
    let soloOwnedDogIds: string[] = [];
    if (dogIds.length > 0) {
      const { data: coOwners } = await admin
        .from('customer_dogs')
        .select('dog_id')
        .in('dog_id', dogIds)
        .neq('customer_id', customer.id);
      const dogsWithCoOwners = new Set((coOwners ?? []).map((r: { dog_id: string }) => r.dog_id));
      soloOwnedDogIds = dogIds.filter(id => !dogsWithCoOwners.has(id));
    }

    const { error: delCustomerErr } = await admin
      .from('customers')
      .delete()
      .eq('id', customer.id);
    if (delCustomerErr) {
      return new Response(JSON.stringify({ error: 'Failed to delete customer', detail: delCustomerErr.message }), { status: 500, headers: responseHeaders });
    }

    if (soloOwnedDogIds.length > 0) {
      const { error: delDogsErr } = await admin
        .from('dogs')
        .delete()
        .in('id', soloOwnedDogIds);
      if (delDogsErr) {
        return new Response(JSON.stringify({ error: 'Failed to delete orphan dogs', detail: delDogsErr.message }), { status: 500, headers: responseHeaders });
      }
    }
  }

  const { error: delAuthErr } = await admin.auth.admin.deleteUser(user.id);
  if (delAuthErr) {
    return new Response(JSON.stringify({ error: 'Failed to delete auth user', detail: delAuthErr.message }), { status: 500, headers: responseHeaders });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: responseHeaders });
});
