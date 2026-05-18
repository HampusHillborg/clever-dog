// Send a push to iOS via APNs HTTP/2.
//
// Apple's APNs accepts a JWT bearer (ES256) instead of certificates. Config
// comes from three Supabase secrets:
//   APNS_AUTH_KEY_P8   — the entire .p8 file contents (incl. BEGIN/END lines)
//   APNS_KEY_ID        — 10-char key id shown next to the key in the
//                        Apple Developer portal
//   APNS_TEAM_ID       — 10-char team id from Apple Developer membership
//
// APNS_BUNDLE_ID defaults to se.cleverdog.kundportal — the apns-topic header
// must match the iOS app's bundle id.
//
// APNS_ENV          — 'production' (default) or 'sandbox'. Sandbox is the
//                     development server, only useful when distributing
//                     debug builds via Xcode (not TestFlight).

import { create as createJWT, getNumericDate } from 'https://deno.land/x/djwt@v3.0.2/mod.ts';

const HOST = (env: string) =>
  env === 'sandbox'
    ? 'https://api.sandbox.push.apple.com'
    : 'https://api.push.apple.com';

let cachedToken: { token: string; expires: number } | null = null;

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buf;
}

async function buildJwt(): Promise<string> {
  // APNs JWTs are valid for up to 60 min. Cache for 50 to leave headroom.
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.token;

  const keyId = Deno.env.get('APNS_KEY_ID');
  const teamId = Deno.env.get('APNS_TEAM_ID');
  const pem = Deno.env.get('APNS_AUTH_KEY_P8');
  if (!keyId || !teamId || !pem) throw new Error('APNS env not set');

  const cleanPem = pem.replace(/\\n/g, '\n');
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(cleanPem),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  const jwt = await createJWT(
    { alg: 'ES256', typ: 'JWT', kid: keyId },
    {
      iss: teamId,
      iat: getNumericDate(0),
      // Apple drops tokens >1h old. Mint for 50 min.
      exp: getNumericDate(50 * 60),
    },
    key,
  );
  cachedToken = { token: jwt, expires: Date.now() + 50 * 60 * 1000 };
  return jwt;
}

export async function sendApnsToTokens(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string> = {},
): Promise<void> {
  if (tokens.length === 0) return;

  const pem = Deno.env.get('APNS_AUTH_KEY_P8');
  if (!pem) {
    console.warn('APNS_AUTH_KEY_P8 not set, skipping iOS push');
    return;
  }

  let jwt: string;
  try {
    jwt = await buildJwt();
  } catch (e) {
    console.error('[apns] jwt build failed', e);
    return;
  }

  const bundleId = Deno.env.get('APNS_BUNDLE_ID') ?? 'se.cleverdog.kundportal';
  const host = HOST(Deno.env.get('APNS_ENV') ?? 'production');

  await Promise.all(tokens.map(async (token) => {
    try {
      const payload = {
        aps: {
          alert: { title, body },
          sound: 'default',
          'content-available': 1,
        },
        ...data,
      };
      const res = await fetch(`${host}/3/device/${token}`, {
        method: 'POST',
        headers: {
          authorization: `bearer ${jwt}`,
          'apns-topic': bundleId,
          'apns-push-type': 'alert',
          'apns-priority': '10',
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error(
          `APNs send failed for token ${token.slice(0, 12)}… status=${res.status}`,
          text,
        );
      }
    } catch (e) {
      console.error('APNs send threw', e);
    }
  }));
}
