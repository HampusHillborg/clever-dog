// Firebase Cloud Messaging via the HTTP v1 API.
// Uses a service-account JSON stored in FIREBASE_SERVICE_ACCOUNT_JSON.
//
// FCM proxies to APNs for iOS automatically once the APNs key is uploaded
// to the Firebase project, so this single send path covers both platforms.

import { create as createJWT, getNumericDate } from 'https://deno.land/x/djwt@v3.0.2/mod.ts';

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

// Access tokens last 1h; cache so a single function invocation doing
// multiple sends doesn't re-mint a JWT each time.
let cachedToken: { token: string; expires: number } | null = null;

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buf;
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const pem = sa.private_key.replace(/\\n/g, '\n');
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(pem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const jwt = await createJWT(
    { alg: 'RS256', typ: 'JWT' },
    {
      iss: sa.client_email,
      scope: FCM_SCOPE,
      aud: 'https://oauth2.googleapis.com/token',
      exp: getNumericDate(3600),
      iat: getNumericDate(0),
    },
    key,
  );
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`FCM token fetch failed: ${await res.text()}`);
  const json = await res.json() as { access_token: string; expires_in: number };
  cachedToken = {
    token: json.access_token,
    expires: Date.now() + json.expires_in * 1000,
  };
  return json.access_token;
}

export async function sendPushToTokens(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string> = {},
): Promise<void> {
  if (tokens.length === 0) return;

  const raw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
  if (!raw) {
    console.warn('FIREBASE_SERVICE_ACCOUNT_JSON not set, skipping push');
    return;
  }
  let sa: ServiceAccount;
  try {
    sa = JSON.parse(raw);
  } catch (e) {
    console.error('Bad FIREBASE_SERVICE_ACCOUNT_JSON', e);
    return;
  }

  const accessToken = await getAccessToken(sa);
  const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;

  await Promise.all(tokens.map(async (token) => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          message: { token, notification: { title, body }, data },
        }),
      });
      if (!res.ok) {
        console.error(
          `FCM send failed for token ${token.slice(0, 12)}…:`,
          await res.text(),
        );
      }
    } catch (e) {
      console.error('FCM send threw', e);
    }
  }));
}

// Tiny structural type so the helper can be called with either the typed
// service-role client or `as never`.
type AdminClient = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => Promise<{ data: { token: string; platform: string }[] | null }>;
    };
  };
};

export type PlatformTokens = { android: string[]; ios: string[] };

export async function lookupTokensForUser(
  admin: AdminClient,
  userId: string,
): Promise<PlatformTokens> {
  const { data } = await admin.from('device_tokens').select('token,platform').eq('user_id', userId);
  const out: PlatformTokens = { android: [], ios: [] };
  for (const row of (data ?? [])) {
    if (row.platform === 'ios') out.ios.push(row.token);
    else out.android.push(row.token);
  }
  return out;
}
