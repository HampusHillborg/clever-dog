// Edge Function: invite-customer
// Skickar invite-mejl till en kund och uppdaterar invite_status='invited'.
// Kräver att anroparen är inloggad och finns i admin_users.

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SITE_URL = Deno.env.get('SITE_URL') ?? 'http://localhost:5173';

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
  const { data: adminRow } = await admin
    .from('admin_users').select('id').eq('id', user.id).maybeSingle();
  if (!adminRow) {
    return new Response(JSON.stringify({ error: 'Forbidden — admin only' }), { status: 403, headers: responseHeaders });
  }

  let body: { customer_id?: string } = {};
  try { body = await req.json(); } catch { /* tom body */ }
  if (!body.customer_id) {
    return new Response(JSON.stringify({ error: 'customer_id krävs' }), { status: 400, headers: responseHeaders });
  }

  const { data: customer, error: cErr } = await admin
    .from('customers').select('id, email, invite_status').eq('id', body.customer_id).single();
  if (cErr || !customer) {
    return new Response(JSON.stringify({ error: 'Kund hittades inte' }), { status: 404, headers: responseHeaders });
  }
  if (customer.invite_status === 'accepted') {
    return new Response(JSON.stringify({ error: 'Kund har redan accepterat inbjudan' }), { status: 400, headers: responseHeaders });
  }

  const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(customer.email, {
    redirectTo: `${SITE_URL}/login/accept-invite`,
  });
  if (inviteErr) {
    return new Response(JSON.stringify({ error: inviteErr.message }), { status: 500, headers: responseHeaders });
  }

  await admin.from('customers')
    .update({ invite_status: 'invited', invited_at: new Date().toISOString() })
    .eq('id', customer.id);

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: responseHeaders });
});
