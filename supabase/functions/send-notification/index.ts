// Edge Function: send-notification
// Sends transactional emails via Resend.
//
// Body shape:
//   { kind: 'booking_request',    booking_id: string }
//   { kind: 'booking_decision',   booking_id: string }   // confirmed or rejected
//   { kind: 'customer_message',   message_id: string }
//
// Auth: requires a valid Supabase JWT; the function decides who to email
// based on the payload kind. Customers can trigger 'booking_request' and
// 'customer_message'. Admins can trigger 'booking_decision'.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { sendPushToTokens, lookupTokensForUser } from './push.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_FROM = Deno.env.get('RESEND_FROM_EMAIL') ?? 'onboarding@resend.dev';
const ADMIN_EMAIL = Deno.env.get('ADMIN_NOTIFY_EMAIL') ?? '';
const SITE_URL = Deno.env.get('SITE_URL') ?? 'http://localhost:5173';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
};

type Kind = 'booking_request' | 'booking_decision' | 'customer_message' | 'staff_message' | 'application_decision';

const escape = (s: string | null | undefined) =>
  (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function sendEmail(to: string, subject: string, html: string, replyTo?: string) {
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');
  const payload: Record<string, unknown> = { from: RESEND_FROM, to, subject, html };
  if (replyTo) payload.reply_to = replyTo;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend error ${res.status}: ${text}`);
  }
  return res.json();
}

function wrap(title: string, body: string) {
  return `
<!doctype html>
<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #222;">
  <h2 style="color: #c97b3a; margin-top: 0;">CleverDog Hunddagis</h2>
  <h3>${escape(title)}</h3>
  ${body}
  <p style="margin-top: 32px; font-size: 0.85em; color: #888;">
    Detta är ett automatiskt mejl. Logga in på <a href="${SITE_URL}/login">${SITE_URL}/login</a>.
  </p>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  const headers = { ...cors, 'Content-Type': 'application/json' };

  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing token' }), { status: 401, headers });
  }
  const jwt = authHeader.replace(/^bearer\s+/i, '').trim();

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: { user }, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers });
  }

  let body: { kind?: Kind; booking_id?: string; message_id?: string; application_id?: string } = {};
  try { body = await req.json(); } catch { /* empty */ }
  if (!body.kind) return new Response(JSON.stringify({ error: 'kind required' }), { status: 400, headers });

  try {
    if (body.kind === 'booking_request') {
      if (!body.booking_id) throw new Error('booking_id required');
      if (!ADMIN_EMAIL) return new Response(JSON.stringify({ ok: false, skipped: 'no admin email' }), { headers });

      const { data: booking } = await admin
        .from('bookings')
        .select('*, dogs(name, breed), customers(name, email, phone)')
        .eq('id', body.booking_id).single();
      if (!booking) throw new Error('booking not found');

      const type = booking.booking_type === 'boarding' ? 'Pensionat' : 'Enstaka dag';
      const dates = booking.start_date === booking.end_date
        ? booking.start_date
        : `${booking.start_date} → ${booking.end_date}`;
      const html = wrap('Ny bokningsförfrågan', `
        <p><strong>${escape(booking.customers?.name)}</strong> (${escape(booking.customers?.email)})
        har skickat en ny förfrågan:</p>
        <ul>
          <li><strong>Typ:</strong> ${type}</li>
          <li><strong>Hund:</strong> ${escape(booking.dogs?.name)} (${escape(booking.dogs?.breed)})</li>
          <li><strong>Datum:</strong> ${escape(dates)}</li>
          ${booking.notes ? `<li><strong>Anteckningar:</strong> ${escape(booking.notes)}</li>` : ''}
        </ul>
        <p>Logga in på <a href="${SITE_URL}/admin">admin-portalen</a> för att godkänna eller avslå.</p>
      `);
      // Reply-To = customer email so admin can reply directly from inbox
      await sendEmail(
        ADMIN_EMAIL,
        `Ny ${type.toLowerCase()}-förfrågan från ${booking.customers?.name}`,
        html,
        booking.customers?.email ?? undefined,
      );

      // Kvitto till kunden: vi har tagit emot förfrågan
      if (booking.customers?.email) {
        const customerHtml = wrap(`Vi har tagit emot din ${type.toLowerCase()}-förfrågan`, `
          <p>Hej ${escape(booking.customers.name)},</p>
          <p>Vi har tagit emot din förfrågan och återkommer så snart vi kan med besked.</p>
          <ul>
            <li><strong>Hund:</strong> ${escape(booking.dogs?.name)}</li>
            <li><strong>Typ:</strong> ${type}</li>
            <li><strong>Datum:</strong> ${escape(dates)}</li>
            ${booking.notes ? `<li><strong>Dina anteckningar:</strong> ${escape(booking.notes)}</li>` : ''}
          </ul>
          <p>Du ser status p&aring; din f&ouml;rfr&aring;gan i <a href="${SITE_URL}/kund">kundportalen</a>.</p>
        `);
        await sendEmail(
          booking.customers.email,
          `Bekräftelse: ${type.toLowerCase()}-förfrågan mottagen`,
          customerHtml,
          ADMIN_EMAIL || undefined,
        );
      }
    }
    else if (body.kind === 'booking_decision') {
      if (!body.booking_id) throw new Error('booking_id required');

      const { data: booking } = await admin
        .from('bookings')
        .select('*, dogs(name), customers(name, email)')
        .eq('id', body.booking_id).single();
      if (!booking) throw new Error('booking not found');
      if (!booking.customers?.email) {
        return new Response(JSON.stringify({ ok: false, skipped: 'no customer email' }), { headers });
      }

      const type = booking.booking_type === 'boarding' ? 'Pensionat' : 'Enstaka dag';
      const dates = booking.start_date === booking.end_date
        ? booking.start_date
        : `${booking.start_date} → ${booking.end_date}`;
      const approved = booking.status === 'confirmed';
      const subject = approved
        ? `Din ${type.toLowerCase()}-bokning är godkänd`
        : `Din ${type.toLowerCase()}-förfrågan blev avslagen`;
      const html = wrap(subject, `
        <p>Hej ${escape(booking.customers?.name)},</p>
        <p>${approved ? 'Din förfrågan har godkänts!' : 'Tyvärr kunde vi inte godkänna din förfrågan.'}</p>
        <ul>
          <li><strong>Hund:</strong> ${escape(booking.dogs?.name)}</li>
          <li><strong>Typ:</strong> ${type}</li>
          <li><strong>Datum:</strong> ${escape(dates)}</li>
          ${booking.admin_response ? `<li><strong>Meddelande från oss:</strong> ${escape(booking.admin_response)}</li>` : ''}
        </ul>
        <p>Se din kalender på <a href="${SITE_URL}/kund">kundportalen</a>.</p>
      `);
      // Reply-To = admin email so customer can write back to staff
      await sendEmail(booking.customers.email, subject, html, ADMIN_EMAIL || undefined);

      // Push notification (non-fatal). booking.customer_id is the customers.id;
      // we need the auth.users.id which lives on customers.auth_user_id.
      if (booking.customer_id) {
        const { data: cust } = await admin
          .from('customers')
          .select('auth_user_id')
          .eq('id', booking.customer_id)
          .maybeSingle();
        if (cust?.auth_user_id) {
          const tokens = await lookupTokensForUser(admin as never, cust.auth_user_id);
          if (tokens.length > 0) {
            const pushBody = approved
              ? `${escape(booking.dogs?.name)}: ${dates} är godkänd`
              : `Din förfrågan blev avslagen. Se kalendern för detaljer.`;
            await sendPushToTokens(tokens, subject, pushBody, {
              kind: 'booking_decision',
              booking_id: booking.id,
            });
          }
        }
      }
    }
    else if (body.kind === 'customer_message') {
      if (!body.message_id) throw new Error('message_id required');
      if (!ADMIN_EMAIL) return new Response(JSON.stringify({ ok: false, skipped: 'no admin email' }), { headers });

      const { data: msg } = await admin
        .from('messages')
        .select('*, customers(name, email), dogs(name)')
        .eq('id', body.message_id).single();
      if (!msg || msg.sender_role !== 'customer') {
        return new Response(JSON.stringify({ ok: false, skipped: 'not customer message' }), { headers });
      }

      const html = wrap('Nytt meddelande från kund', `
        <p><strong>${escape(msg.customers?.name)}</strong> (${escape(msg.customers?.email)})
        ${msg.dogs?.name ? `om <strong>${escape(msg.dogs.name)}</strong>` : ''} skrev:</p>
        <blockquote style="border-left: 3px solid #c97b3a; padding-left: 12px; color: #444;">
          ${escape(msg.body)}
        </blockquote>
        <p>Svara via <a href="${SITE_URL}/admin">admin-portalen</a>.</p>
      `);
      // Reply-To = customer email so admin can reply via inbox
      await sendEmail(
        ADMIN_EMAIL,
        `Nytt meddelande från ${msg.customers?.name}`,
        html,
        msg.customers?.email ?? undefined,
      );
    }
    else if (body.kind === 'staff_message') {
      if (!body.message_id) throw new Error('message_id required');

      const { data: msg } = await admin
        .from('messages')
        .select('*, customers(name, email), dogs(name)')
        .eq('id', body.message_id).single();
      if (!msg || msg.sender_role !== 'staff') {
        return new Response(JSON.stringify({ ok: false, skipped: 'not staff message' }), { headers });
      }
      if (!msg.customers?.email) {
        return new Response(JSON.stringify({ ok: false, skipped: 'no customer email' }), { headers });
      }

      const html = wrap('Nytt meddelande från CleverDog', `
        <p>Hej ${escape(msg.customers.name)},</p>
        <p>Personalen har skrivit till dig${msg.dogs?.name ? ` om <strong>${escape(msg.dogs.name)}</strong>` : ''}:</p>
        <blockquote style="border-left: 3px solid #c97b3a; padding-left: 12px; color: #444;">
          ${escape(msg.body)}
        </blockquote>
        <p>Svara via <a href="${SITE_URL}/kund">kundportalen</a>.</p>
      `);
      // Reply-To = admin so customer can reply via inbox
      await sendEmail(
        msg.customers.email,
        'Nytt meddelande från CleverDog',
        html,
        ADMIN_EMAIL || undefined,
      );

      // Push notification — fan out to all of this customer's devices.
      if (msg.customer_id) {
        const { data: cust } = await admin
          .from('customers')
          .select('auth_user_id')
          .eq('id', msg.customer_id)
          .maybeSingle();
        if (cust?.auth_user_id) {
          const tokens = await lookupTokensForUser(admin as never, cust.auth_user_id);
          if (tokens.length > 0) {
            await sendPushToTokens(
              tokens,
              'Nytt meddelande från CleverDog',
              String(msg.body).slice(0, 120),
              { kind: 'staff_message', message_id: msg.id },
            );
          }
        }
      }
    }
    else if (body.kind === 'application_decision') {
      if (!body.application_id) throw new Error('application_id required');

      const { data: app } = await admin
        .from('applications')
        .select('owner_name, owner_email, dog_name, service_type, status, rejection_reason')
        .eq('id', body.application_id).single();
      if (!app) throw new Error('application not found');
      if (!app.owner_email) {
        return new Response(JSON.stringify({ ok: false, skipped: 'no owner email' }), { headers });
      }

      const approved = app.status === 'approved' || app.status === 'matched' || app.status === 'added';
      const subject = approved
        ? `Din ansökan om plats hos CleverDog är godkänd`
        : `Din ansökan om plats hos CleverDog blev avslagen`;
      const html = wrap(subject, `
        <p>Hej ${escape(app.owner_name)},</p>
        <p>${approved
          ? 'Din ansökan har godkänts! Vi återkommer med nästa steg.'
          : 'Tack för din ansökan. Tyvärr kan vi inte erbjuda en plats just nu.'}</p>
        <ul>
          <li><strong>Hund:</strong> ${escape(app.dog_name)}</li>
          <li><strong>Tjänst:</strong> ${escape(app.service_type)}</li>
          ${!approved && app.rejection_reason
            ? `<li><strong>Anledning:</strong> ${escape(app.rejection_reason)}</li>`
            : ''}
        </ul>
        ${!approved ? '<p>Har du frågor om beslutet? Svara på det här mejlet så återkommer vi.</p>' : ''}
      `);
      await sendEmail(app.owner_email, subject, html, ADMIN_EMAIL || undefined);
    }
    else {
      return new Response(JSON.stringify({ error: 'unknown kind' }), { status: 400, headers });
    }

    return new Response(JSON.stringify({ ok: true }), { headers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('send-notification failed:', msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers });
  }
});
