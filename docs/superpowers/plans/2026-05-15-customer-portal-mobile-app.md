# CleverDog Kundportal — Mobile App (iOS + Android) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap the existing React customer portal in a Capacitor shell so the same codebase ships as native iOS and Android apps, with push notifications for bookings/messages and role-based routing (admin → /admin web, customer → in-app /kund).

**Architecture:** Capacitor 6 wraps the existing Vite-built SPA. The web build is filtered to a customer-only entry (no marketing site, no admin) using a `VITE_APP_TARGET=app` env flag. Supabase auth/data layer is unchanged. Push notifications flow: Capacitor `@capacitor/push-notifications` registers a device token → stored in new `device_tokens` table → existing `send-notification` edge function fans out to FCM (Android) + APNs (iOS) via Firebase Admin SDK alongside the existing Resend email send. Deep links via custom URL scheme `cleverdog://` handle Supabase magic-link redirects.

**Tech Stack:** Capacitor 6, React 19 (existing), Vite 6 (existing), Supabase (existing), Firebase Admin SDK (new, edge function only), Resend (existing), Codemagic CI (for iOS builds from Windows).

**Critical platform note:** You are on Windows. **iOS builds require macOS (Xcode).** You have three options:
1. **Codemagic** — cloud CI that builds iOS + Android from your git repo, free tier covers small teams. Recommended for this project.
2. **MacInCloud / AWS EC2 Mac** — rent a Mac by the hour (~5 USD/hr).
3. **Buy a Mac mini** — only worth it if you'll work on iOS apps regularly.

The plan assumes Codemagic for iOS. All Android work happens locally on Windows.

---

## File Structure

```
clever-dog/
├── capacitor.config.ts                         # Capacitor app config (new)
├── android/                                     # Native Android project (auto-generated, committed)
├── ios/                                         # Native iOS project (auto-generated, committed)
├── src/
│   ├── main.tsx                                 # Modified: branch on VITE_APP_TARGET
│   ├── App.tsx                                  # Modified: hide marketing/admin routes when target=app
│   ├── AppMobile.tsx                            # NEW: mobile-only route tree
│   ├── lib/
│   │   ├── platform.ts                          # NEW: isNativeApp(), pushTokenRegister()
│   │   ├── deepLinks.ts                         # NEW: appUrlOpen handler
│   │   └── pushNotifications.ts                 # NEW: register + listener
│   └── components/
│       ├── customer/
│       │   └── NotificationToast.tsx            # NEW: in-app notification banner
│       └── MobileAuthGate.tsx                   # NEW: hides admins behind a "use the web portal" screen
├── supabase/
│   ├── migrations/
│   │   └── 20260520_001_device_tokens.sql       # NEW: device_tokens table + RLS
│   └── functions/
│       └── send-notification/
│           ├── index.ts                         # Modified: also send push via FCM
│           └── push.ts                          # NEW: Firebase Admin push helper
├── codemagic.yaml                               # NEW: CI config for iOS + Android builds
├── docs/
│   └── mobile-app/
│       ├── README.md                            # NEW: dev workflow
│       ├── firebase-setup.md                    # NEW: FCM/APNs setup walkthrough
│       └── store-submission.md                  # NEW: App Store + Play Store checklist
└── public/
    └── icon-source.png                          # NEW: 1024×1024 master icon for both stores
```

---

## Task 0: Install Capacitor and scaffold config

**Goal:** Add Capacitor dependencies and a working `capacitor.config.ts` pointing at the existing Vite `dist/` output.

**Files:**
- Create: `capacitor.config.ts`
- Modify: `package.json` (add scripts + deps)
- Create: `docs/mobile-app/README.md`

**Acceptance Criteria:**
- [ ] `npx cap --version` prints a version number
- [ ] `capacitor.config.ts` references `appId: 'se.cleverdog.kundportal'` and `webDir: 'dist'`
- [ ] `npm run build` still succeeds with no Capacitor errors

**Verify:** `npx cap --version` → prints `6.x` and `npm run build` → exits 0.

**Steps:**

- [ ] **Step 1: Install Capacitor packages**

```powershell
npm install --save @capacitor/core @capacitor/app @capacitor/preferences @capacitor/status-bar @capacitor/splash-screen
npm install --save-dev @capacitor/cli @capacitor/ios @capacitor/android
```

- [ ] **Step 2: Create `capacitor.config.ts`**

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'se.cleverdog.kundportal',
  appName: 'CleverDog',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#fcf5ee',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
```

- [ ] **Step 3: Add npm scripts to `package.json`**

In the `scripts` section, add:

```json
"app:build": "VITE_APP_TARGET=app vite build",
"app:sync": "npm run app:build && npx cap sync",
"app:android": "npm run app:sync && npx cap open android",
"app:ios": "npm run app:sync && npx cap open ios"
```

Note: on Windows PowerShell, `VITE_APP_TARGET=app` won't set the env var inline. Either install `cross-env` (`npm i -D cross-env`) and prefix each app:* script with `cross-env`, or document that users must run `$env:VITE_APP_TARGET='app'; npm run build; npx cap sync` manually. Use `cross-env` — simpler.

```json
"app:build": "cross-env VITE_APP_TARGET=app vite build"
```

- [ ] **Step 4: Create `docs/mobile-app/README.md`**

```markdown
# CleverDog Mobile App — Dev Workflow

## First-time setup
1. Install Android Studio (https://developer.android.com/studio) on Windows.
2. Sign up for Codemagic (https://codemagic.io) for iOS builds.
3. Run `npm install` (installs Capacitor too).
4. Run `npm run app:sync` to build the web app and sync into native projects.

## Daily loop (Android)
- Edit code in `src/`
- `npm run app:sync` to push changes into native
- `npm run app:android` opens Android Studio → click ▶ to run on emulator/device

## Daily loop (iOS)
- iOS builds happen on Codemagic. Push to `main` → Codemagic auto-builds and uploads to TestFlight.
- For quick iteration, use Android emulator on Windows — code is identical.

## When the web app changes
Anything you change in `src/` is automatically picked up by `npm run app:sync`. No need to "re-import" anything.
```

- [ ] **Step 5: Verify**

```powershell
npm run app:build
npx cap --version
```

Expected: build completes, `dist/` contains hashed assets, cap version prints (e.g. `6.1.0`).

- [ ] **Step 6: Commit**

```powershell
git add capacitor.config.ts package.json package-lock.json docs/mobile-app/README.md
git commit -m "feat(mobile): scaffold Capacitor for iOS+Android wrap"
```

---

## Task 1: App-only route tree (hide marketing + admin)

**Goal:** The mobile bundle excludes the marketing site (`/`, `/staffanstorp`) and admin (`/admin`). It contains only `/login`, `/login/accept-invite`, `/kund`, `/kund/hund/:id`. Admins who log in see a "Use the web portal" screen.

**Files:**
- Create: `src/AppMobile.tsx`
- Modify: `src/main.tsx`
- Create: `src/components/MobileAuthGate.tsx`
- Create: `src/lib/platform.ts`

**Acceptance Criteria:**
- [ ] When `VITE_APP_TARGET=app`, the built `dist/index.html` boots `AppMobile` and the bundle does NOT contain `AdminPage` or `StaffanstorpPage` chunks
- [ ] An admin who logs in via the app sees a screen: "Adminkonton använder webbportalen. Öppna admin.cleverdog.se i webbläsaren." with a sign-out button
- [ ] A customer logs in and is taken straight to `/kund`

**Verify:** Run `npm run app:build` then `Get-ChildItem dist/assets/js | Select-String -Pattern 'AdminPage'` → no matches.

**Steps:**

- [ ] **Step 1: Create `src/lib/platform.ts`**

```typescript
import { Capacitor } from '@capacitor/core';

export const isNativeApp = (): boolean => Capacitor.isNativePlatform();
export const platform = (): 'ios' | 'android' | 'web' => Capacitor.getPlatform() as 'ios' | 'android' | 'web';
export const isAppTarget = (): boolean => import.meta.env.VITE_APP_TARGET === 'app';
```

- [ ] **Step 2: Create `src/components/MobileAuthGate.tsx`**

```typescript
import { signOutCustomer } from '../lib/customerAuth';
import dogLogo from '../assets/images/logos/Logo.png';

export default function MobileAuthGate() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-light px-6 text-center">
      <img src={dogLogo} alt="CleverDog" className="h-16 mb-6" />
      <h1 className="text-xl font-bold mb-2">Adminkonton använder webbportalen</h1>
      <p className="text-gray-600 mb-6 max-w-sm">
        Den här appen är för kunder. Öppna admin-portalen i webbläsaren på din dator
        för att hantera bokningar och hundar.
      </p>
      <button
        onClick={async () => { await signOutCustomer(); window.location.replace('/login'); }}
        className="px-4 py-2 bg-primary text-white rounded-lg"
      >
        Logga ut
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/AppMobile.tsx`**

```typescript
import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, BrowserRouter, Navigate } from 'react-router-dom';
import './i18n';
import ProtectedCustomerRoute from './components/customer/ProtectedCustomerRoute';
import MobileAuthGate from './components/MobileAuthGate';
import { isAdminUser } from './lib/customerAuth';
import { supabase } from './lib/supabase';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const AcceptInvitePage = lazy(() => import('./pages/AcceptInvitePage'));
const CustomerDashboardPage = lazy(() => import('./pages/CustomerDashboardPage'));
const CustomerDogPage = lazy(() => import('./pages/CustomerDogPage'));

const Loading = () => <div className="h-screen flex items-center justify-center">Laddar…</div>;

function AdminGuard({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'loading' | 'admin' | 'ok'>('loading');
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase!.auth.getSession();
      if (!session) { setState('ok'); return; }
      setState((await isAdminUser()) ? 'admin' : 'ok');
    })();
  }, []);
  if (state === 'loading') return <Loading />;
  if (state === 'admin') return <MobileAuthGate />;
  return <>{children}</>;
}

export default function AppMobile() {
  return (
    <div className="min-h-screen bg-light">
      <BrowserRouter>
        <AdminGuard>
          <Routes>
            <Route path="/" element={<Navigate to="/kund" replace />} />
            <Route path="/login" element={<Suspense fallback={<Loading />}><LoginPage /></Suspense>} />
            <Route path="/login/accept-invite" element={<Suspense fallback={<Loading />}><AcceptInvitePage /></Suspense>} />
            <Route path="/kund" element={
              <Suspense fallback={<Loading />}>
                <ProtectedCustomerRoute><CustomerDashboardPage /></ProtectedCustomerRoute>
              </Suspense>
            } />
            <Route path="/kund/hund/:id" element={
              <Suspense fallback={<Loading />}>
                <ProtectedCustomerRoute><CustomerDogPage /></ProtectedCustomerRoute>
              </Suspense>
            } />
            <Route path="*" element={<Navigate to="/kund" replace />} />
          </Routes>
        </AdminGuard>
      </BrowserRouter>
    </div>
  );
}
```

- [ ] **Step 4: Modify `src/main.tsx`** to branch on `VITE_APP_TARGET`

Read the current `src/main.tsx` first (it imports `App`). Replace with:

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { isAppTarget } from './lib/platform';
import './index.css';

async function boot() {
  const { default: Root } = isAppTarget()
    ? await import('./AppMobile')
    : await import('./App');
  createRoot(document.getElementById('root')!).render(
    <StrictMode><Root /></StrictMode>
  );
}

boot();
```

- [ ] **Step 5: Verify chunks**

```powershell
npm run app:build
Get-ChildItem dist/assets/js | Select-String -Pattern 'AdminPage'
```

Expected: no matches (AdminPage is dynamically imported only by `App.tsx` which is never loaded when target=app).

- [ ] **Step 6: Commit**

```powershell
git add src/AppMobile.tsx src/main.tsx src/components/MobileAuthGate.tsx src/lib/platform.ts
git commit -m "feat(mobile): customer-only route tree for app target"
```

---

## Task 2: Add iOS + Android native platforms and first run

**Goal:** Both native projects exist, sync runs cleanly, and the app launches on Android emulator showing the login screen.

**Files:**
- Create: `android/` (full tree, auto-generated)
- Create: `ios/` (full tree, auto-generated, generated on Codemagic)
- Modify: `.gitignore` (verify Capacitor patterns)
- Modify: `capacitor.config.ts` (if android-specific config needed)

**Acceptance Criteria:**
- [ ] `android/` directory committed
- [ ] `npx cap sync android` runs without errors
- [ ] App launches on Android emulator, shows CleverDog login screen
- [ ] Tapping outside login on Android does not crash

**Verify:** Open Android Studio, run on emulator → see login form, attempt sign-in with a known customer account → land on `/kund`.

**Steps:**

- [ ] **Step 1: Add platforms**

```powershell
npx cap add android
```

(Skip `npx cap add ios` on Windows — Codemagic will generate the iOS project in CI.)

- [ ] **Step 2: First sync**

```powershell
npm run app:build
npx cap sync android
```

Expected: "Sync finished in X.XXs"

- [ ] **Step 3: Open Android Studio**

```powershell
npx cap open android
```

In Android Studio:
- Wait for Gradle sync (~5 min first time)
- Tools → Device Manager → Create Virtual Device → Pixel 7 → API 34 → Finish
- Click ▶ Run

Expected: app installs, splash screen, then login form visible.

- [ ] **Step 4: Smoke test login**

In the emulator, type a known customer email + password. Tap "Logga in". Should navigate to `/kund` and show the customer dashboard.

- [ ] **Step 5: Update `.gitignore`** (only if Capacitor added entries that conflict)

Inspect `.gitignore` after `cap add android` — Capacitor should NOT have added android/ to it. The `android/` folder should be committed in full (build outputs like `android/app/build/` are already ignored by the Android plugin's gitignore inside).

- [ ] **Step 6: Commit**

```powershell
git add android/ capacitor.config.ts
git commit -m "feat(mobile): add Android platform with working emulator launch"
```

---

## Task 3: Custom URL scheme + Supabase deep-link handler

**Goal:** App registers `cleverdog://` URL scheme. Tapping a magic link (e.g., password reset, invite) opens the app and routes correctly.

**Files:**
- Modify: `android/app/src/main/AndroidManifest.xml` (intent filter)
- Create: `src/lib/deepLinks.ts`
- Modify: `src/AppMobile.tsx` (wire up listener)
- Modify: Supabase Auth settings (manual step in dashboard)

**Acceptance Criteria:**
- [ ] Pasting `cleverdog://login/accept-invite?token=abc` into the Android browser address bar opens the app at `/login/accept-invite?token=abc`
- [ ] Supabase auth redirect URL list contains `cleverdog://login` and `cleverdog://login/accept-invite`

**Verify:** Run on emulator, open Chrome inside emulator, navigate to a test URL `cleverdog://kund` → app opens to dashboard.

**Steps:**

- [ ] **Step 1: Configure Android intent filter**

Open `android/app/src/main/AndroidManifest.xml`. Inside `<activity android:name="MainActivity" ...>`, add a second `<intent-filter>`:

```xml
<intent-filter android:autoVerify="false">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="cleverdog" />
</intent-filter>
```

- [ ] **Step 2: Create `src/lib/deepLinks.ts`**

```typescript
import { App, type URLOpenListenerEvent } from '@capacitor/app';
import { isNativeApp } from './platform';

export const initDeepLinks = (navigate: (path: string) => void) => {
  if (!isNativeApp()) return;
  App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
    const url = new URL(event.url);
    const path = `${url.pathname}${url.search}${url.hash}`;
    navigate(path || '/kund');
  });
};
```

- [ ] **Step 3: Wire listener in `src/AppMobile.tsx`**

Add a `DeepLinkBridge` component inside `BrowserRouter` that uses `useNavigate` and calls `initDeepLinks` once on mount.

```typescript
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { initDeepLinks } from './lib/deepLinks';

function DeepLinkBridge() {
  const navigate = useNavigate();
  useEffect(() => { initDeepLinks(navigate); }, [navigate]);
  return null;
}
```

Mount `<DeepLinkBridge />` directly under `<BrowserRouter>` inside the existing `<AdminGuard>` JSX block, before `<Routes>`.

- [ ] **Step 4: Update Supabase Auth redirect URLs**

In the Supabase dashboard → Authentication → URL Configuration → Redirect URLs, add:
- `cleverdog://login`
- `cleverdog://login/accept-invite`

Also ensure the existing web URLs (`https://cleverdog.se/login`, etc.) remain — keep both.

- [ ] **Step 5: Sync and test**

```powershell
npx cap sync android
npx cap open android
```

In emulator Chrome, navigate to `cleverdog://kund` → app opens to dashboard.

- [ ] **Step 6: Commit**

```powershell
git add android/app/src/main/AndroidManifest.xml src/lib/deepLinks.ts src/AppMobile.tsx
git commit -m "feat(mobile): cleverdog:// URL scheme + Supabase deep-link routing"
```

---

## Task 4: Native session persistence verification

**Goal:** A logged-in customer remains logged in after closing and reopening the app. No relogin required.

**Files:**
- Modify: `src/lib/supabase.ts` (verify auth options)
- Create: `src/lib/sessionPersistence.ts` (Capacitor Preferences storage adapter)

**Acceptance Criteria:**
- [ ] Login in app → force-quit app → reopen → user is on `/kund`, not `/login`
- [ ] Pulling app data offline doesn't crash; first network call refreshes UI

**Verify:** Manually: log in on Android emulator → swipe-up to close → reopen app → land on `/kund` directly.

**Steps:**

- [ ] **Step 1: Create `src/lib/sessionPersistence.ts`**

```typescript
import { Preferences } from '@capacitor/preferences';
import { isNativeApp } from './platform';

export const capacitorStorage = {
  getItem: async (key: string) => {
    if (!isNativeApp()) return localStorage.getItem(key);
    const { value } = await Preferences.get({ key });
    return value;
  },
  setItem: async (key: string, value: string) => {
    if (!isNativeApp()) { localStorage.setItem(key, value); return; }
    await Preferences.set({ key, value });
  },
  removeItem: async (key: string) => {
    if (!isNativeApp()) { localStorage.removeItem(key); return; }
    await Preferences.remove({ key });
  },
};
```

- [ ] **Step 2: Wire into `src/lib/supabase.ts`**

Change the `createClient` call to pass an `auth.storage` option:

```typescript
import { capacitorStorage } from './sessionPersistence';

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: capacitorStorage as never,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;
```

- [ ] **Step 3: Test on emulator**

```powershell
npm run app:sync
npx cap open android
```

Run → log in → swipe up → reopen → verify direct land on `/kund`.

- [ ] **Step 4: Commit**

```powershell
git add src/lib/sessionPersistence.ts src/lib/supabase.ts
git commit -m "feat(mobile): persist Supabase session via Capacitor Preferences"
```

---

## Task 5: device_tokens table + RLS

**Goal:** New `device_tokens` table maps `(user_id, token, platform)` so the edge function can look up where to send a push. Customers can insert/delete their own tokens.

**Files:**
- Create: `supabase/migrations/20260520_001_device_tokens.sql`

**Acceptance Criteria:**
- [ ] Table `public.device_tokens` exists with columns `id, user_id, token, platform, created_at`
- [ ] RLS enabled; customers can read/insert/delete only their own row
- [ ] Unique constraint on `(user_id, token)` to avoid duplicates

**Verify:** Apply migration → in SQL editor run `select * from pg_policies where tablename='device_tokens';` → 3+ policies returned.

**Steps:**

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260520_001_device_tokens.sql`:

```sql
create table public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios','android')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, token)
);

create index device_tokens_user_id_idx on public.device_tokens(user_id);

alter table public.device_tokens enable row level security;

create policy "users manage own tokens" on public.device_tokens
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "admins read all tokens" on public.device_tokens
  for select to authenticated
  using (public.is_admin_user());
```

- [ ] **Step 2: Apply to DB**

Use the Supabase MCP `apply_migration` tool with name `device_tokens` and the SQL above (or run via `supabase db push` if CLI is set up).

- [ ] **Step 3: Verify**

```sql
select column_name from information_schema.columns where table_name='device_tokens';
select policyname from pg_policies where tablename='device_tokens';
```

Expected columns: id, user_id, token, platform, created_at, updated_at. Policies: at least 2.

- [ ] **Step 4: Commit**

```powershell
git add supabase/migrations/20260520_001_device_tokens.sql
git commit -m "feat(mobile): device_tokens table for push notification routing"
```

---

## Task 6: Capacitor PushNotifications plugin + Firebase/APNs project setup

**Goal:** App requests push permission on first login, registers a token, and stores it in `device_tokens`. Firebase project is wired up for Android (FCM); APNs cert/key is uploaded to Firebase for iOS.

**Files:**
- Modify: `package.json` (add `@capacitor/push-notifications`)
- Create: `src/lib/pushNotifications.ts`
- Modify: `src/AppMobile.tsx` (init on login)
- Modify: `android/app/build.gradle` and `android/app/google-services.json` (Firebase config)
- Create: `docs/mobile-app/firebase-setup.md` (manual user steps)

**Acceptance Criteria:**
- [ ] Logging in on Android emulator triggers permission prompt, then logs the FCM token to console
- [ ] A row appears in `device_tokens` for the logged-in user
- [ ] `docs/mobile-app/firebase-setup.md` lists every manual step (Firebase console, APNs cert upload, GoogleService-Info.plist for iOS)

**Verify:** Watch Android Studio Logcat for "FCM token registered" → query `select * from device_tokens` → row exists.

**Steps:**

- [ ] **Step 1: Install plugin**

```powershell
npm install @capacitor/push-notifications
```

- [ ] **Step 2: Create Firebase project (manual)**

Walk the user through this. Save the instructions to `docs/mobile-app/firebase-setup.md`:

```markdown
# Firebase / FCM / APNs setup

## Android (FCM)

1. Go to https://console.firebase.google.com → Add project → name "CleverDog".
2. Add Android app → package name `se.cleverdog.kundportal` → register → download `google-services.json`.
3. Place the downloaded file at `android/app/google-services.json`.
4. In `android/build.gradle`, ensure the buildscript has:
   ```gradle
   classpath 'com.google.gms:google-services:4.4.2'
   ```
5. In `android/app/build.gradle`, at the bottom:
   ```gradle
   apply plugin: 'com.google.gms.google-services'
   ```
6. In Firebase console → Project Settings → Service accounts → Generate new private key. Save the JSON file as `firebase-admin-key.json` (DO NOT commit it).
7. Upload its contents to Supabase as a secret:
   ```powershell
   $key = Get-Content firebase-admin-key.json -Raw
   npx supabase secrets set FIREBASE_SERVICE_ACCOUNT_JSON="$key"
   ```

## iOS (APNs via Firebase)

1. In Apple Developer Portal (you'll need Apple Developer Program enrollment first — see store-submission.md), create an APNs Authentication Key (.p8).
2. In Firebase console → Project Settings → Cloud Messaging → APNs Authentication Key → upload .p8 and enter Key ID + Team ID.
3. Add iOS app to Firebase → bundle ID `se.cleverdog.kundportal` → download `GoogleService-Info.plist`.
4. Place at `ios/App/App/GoogleService-Info.plist` (path will exist after Codemagic's first iOS build).
```

- [ ] **Step 3: Create `src/lib/pushNotifications.ts`**

```typescript
import { PushNotifications, type Token } from '@capacitor/push-notifications';
import { supabase } from './supabase';
import { isNativeApp, platform } from './platform';

export const initPushNotifications = async (): Promise<void> => {
  if (!isNativeApp() || !supabase) return;

  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === 'prompt') {
    perm = await PushNotifications.requestPermissions();
  }
  if (perm.receive !== 'granted') return;

  await PushNotifications.register();

  PushNotifications.addListener('registration', async (token: Token) => {
    console.log('FCM token registered:', token.value);
    const { data: { session } } = await supabase!.auth.getSession();
    if (!session) return;
    await supabase!.from('device_tokens').upsert({
      user_id: session.user.id,
      token: token.value,
      platform: platform() === 'ios' ? 'ios' : 'android',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,token' });
  });

  PushNotifications.addListener('registrationError', (err) => {
    console.error('Push registration error:', err);
  });
};

export const unregisterPushToken = async (): Promise<void> => {
  if (!isNativeApp() || !supabase) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  await supabase.from('device_tokens').delete().eq('user_id', session.user.id);
};
```

- [ ] **Step 4: Call init on login success**

In `src/pages/LoginPage.tsx`, after the existing customer-routing line `navigate('/kund', { replace: true });`, add:

```typescript
import { initPushNotifications } from '../lib/pushNotifications';
// ...
if (customer) {
  void initPushNotifications();
  navigate('/kund', { replace: true });
  return;
}
```

Also call on app boot when an existing session is detected. In `src/AppMobile.tsx`, inside `AdminGuard`'s effect (after confirming `state === 'ok'` and the user is a customer), call `void initPushNotifications();`.

- [ ] **Step 5: Wire Firebase Android files (follow firebase-setup.md)**

The user places `google-services.json` and updates the gradle files.

- [ ] **Step 6: Run and verify**

```powershell
npm run app:sync
npx cap open android
```

Run on emulator (must be a Google Play emulator image — non-Play images don't have FCM). Log in → permission prompt → grant → check Logcat for "FCM token registered". Check `device_tokens` table for the new row.

- [ ] **Step 7: Commit**

```powershell
git add package.json package-lock.json src/lib/pushNotifications.ts src/AppMobile.tsx src/pages/LoginPage.tsx android/ docs/mobile-app/firebase-setup.md
git commit -m "feat(mobile): push notification registration via Firebase Cloud Messaging"
```

---

## Task 7: Edge function sends push alongside email

**Goal:** `send-notification` edge function fans out to FCM for `booking_decision`, `customer_message`, `staff_message`. Email still goes out (Resend); push is additive, non-fatal on failure.

**Files:**
- Create: `supabase/functions/send-notification/push.ts`
- Modify: `supabase/functions/send-notification/index.ts`

**Acceptance Criteria:**
- [ ] When admin approves/rejects a booking, push arrives on the customer's device with title + body
- [ ] When staff sends a message, push arrives with the message preview
- [ ] Email still arrives in all cases
- [ ] Push failure is logged but does not 500 the function

**Verify:** Trigger a booking approval from admin → customer's Android emulator receives a push notification showing "Din pensionat-bokning är godkänd".

**Steps:**

- [ ] **Step 1: Create `supabase/functions/send-notification/push.ts`**

```typescript
// Firebase Cloud Messaging via the HTTP v1 API.
// Uses a service-account JSON stored in FIREBASE_SERVICE_ACCOUNT_JSON.

import { create as createJWT, getNumericDate } from 'https://deno.land/x/djwt@v3.0.2/mod.ts';

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

let cachedToken: { token: string; expires: number } | null = null;

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.token;

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
  cachedToken = { token: json.access_token, expires: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buf;
}

export async function sendPushToTokens(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string> = {},
): Promise<void> {
  const raw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
  if (!raw) { console.warn('FIREBASE_SERVICE_ACCOUNT_JSON not set, skipping push'); return; }
  let sa: ServiceAccount;
  try { sa = JSON.parse(raw); } catch (e) { console.error('Bad service account JSON', e); return; }

  const accessToken = await getAccessToken(sa);
  const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;

  await Promise.all(tokens.map(async (token) => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ message: { token, notification: { title, body }, data } }),
      });
      if (!res.ok) console.error(`FCM send failed for token ${token.slice(0, 12)}…:`, await res.text());
    } catch (e) {
      console.error('FCM send threw', e);
    }
  }));
}

export async function lookupTokensForUser(
  admin: { from: (t: string) => { select: (s: string) => { eq: (c: string, v: string) => Promise<{ data: { token: string }[] | null }> } } },
  userId: string,
): Promise<string[]> {
  const { data } = await admin.from('device_tokens').select('token').eq('user_id', userId);
  return (data ?? []).map((r) => r.token);
}
```

- [ ] **Step 2: Wire into `index.ts`**

At the top of `supabase/functions/send-notification/index.ts`, import the helpers:

```typescript
import { sendPushToTokens, lookupTokensForUser } from './push.ts';
```

In the `booking_decision` branch, after the existing `sendEmail(...)`:

```typescript
// Push notification
const { data: customer } = await admin
  .from('customers')
  .select('auth_user_id')
  .eq('email', booking.customers?.email)
  .maybeSingle();
if (customer?.auth_user_id) {
  const tokens = await lookupTokensForUser(admin as never, customer.auth_user_id);
  if (tokens.length > 0) {
    await sendPushToTokens(
      tokens,
      subject,
      approved
        ? `Din bokning ${dates} har godkänts!`
        : `Din förfrågan blev avslagen. Se kalendern för detaljer.`,
      { kind: 'booking_decision', booking_id: booking.id },
    );
  }
}
```

In the `staff_message` branch, after `sendEmail`:

```typescript
if (msg.customers?.id) {
  const { data: customer } = await admin
    .from('customers')
    .select('auth_user_id')
    .eq('id', msg.customers.id)
    .maybeSingle();
  if (customer?.auth_user_id) {
    const tokens = await lookupTokensForUser(admin as never, customer.auth_user_id);
    if (tokens.length > 0) {
      await sendPushToTokens(
        tokens,
        'Nytt meddelande från CleverDog',
        msg.body.slice(0, 120),
        { kind: 'staff_message', message_id: msg.id },
      );
    }
  }
}
```

(Repeat for `booking_request` if you want admins to get push too — only if admin uses the web; skip for now.)

- [ ] **Step 3: Deploy edge function**

Use the Supabase MCP `deploy_edge_function` tool with `name: send-notification`, reading the modified files.

- [ ] **Step 4: Manual end-to-end test**

In admin → reject a pending booking. On the Android emulator (logged in as that customer), confirm push arrives within 30 sec.

- [ ] **Step 5: Commit**

```powershell
git add supabase/functions/send-notification/push.ts supabase/functions/send-notification/index.ts
git commit -m "feat(mobile): FCM push for booking decisions + staff messages"
```

---

## Task 8: Foreground notification handling + tap-to-navigate

**Goal:** When the app is open and a push arrives, show an in-app toast (don't rely on OS banner). When the user taps any notification (foreground or background), navigate to the relevant screen.

**Files:**
- Create: `src/components/customer/NotificationToast.tsx`
- Modify: `src/lib/pushNotifications.ts` (add foreground + actionPerformed listeners)
- Modify: `src/AppMobile.tsx` (mount toast)

**Acceptance Criteria:**
- [ ] Push received while app open → toast appears at top with title + body, auto-dismisses after 5s
- [ ] Push tap (any state) with `data.kind=booking_decision` → navigates to `/kund` (calendar tab)
- [ ] Push tap with `data.kind=staff_message` → navigates to `/kund` (messages tab)

**Verify:** Send a test push via FCM console with `data: { kind: 'staff_message' }` → tap notification → app opens to messages tab.

**Steps:**

- [ ] **Step 1: Create `src/components/customer/NotificationToast.tsx`**

```typescript
import { useEffect, useState } from 'react';

export type ToastPayload = { title: string; body: string };

let pushToast: (p: ToastPayload) => void = () => {};
export const showToast = (p: ToastPayload) => pushToast(p);

export default function NotificationToast() {
  const [items, setItems] = useState<(ToastPayload & { id: number })[]>([]);

  useEffect(() => {
    pushToast = (p) => {
      const id = Date.now();
      setItems((cur) => [...cur, { ...p, id }]);
      setTimeout(() => setItems((cur) => cur.filter((x) => x.id !== id)), 5000);
    };
    return () => { pushToast = () => {}; };
  }, []);

  return (
    <div className="fixed top-4 left-4 right-4 z-[100] space-y-2 pointer-events-none">
      {items.map((t) => (
        <div key={t.id} className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 pointer-events-auto animate-in slide-in-from-top">
          <p className="font-semibold text-sm">{t.title}</p>
          <p className="text-sm text-gray-700 mt-0.5">{t.body}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Extend `src/lib/pushNotifications.ts`**

Add inside `initPushNotifications`, after the `registrationError` listener:

```typescript
PushNotifications.addListener('pushNotificationReceived', (notification) => {
  // App in foreground
  showToast({
    title: notification.title ?? 'CleverDog',
    body: notification.body ?? '',
  });
});

PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
  const kind = action.notification.data?.kind;
  if (kind === 'staff_message') window.location.href = '/kund?tab=messages';
  else window.location.href = '/kund';
});
```

Import `showToast`:

```typescript
import { showToast } from '../components/customer/NotificationToast';
```

- [ ] **Step 3: Mount toast in `src/AppMobile.tsx`**

Just inside the top-level `<div className="min-h-screen bg-light">`, add:

```typescript
import NotificationToast from './components/customer/NotificationToast';
// ...
<NotificationToast />
```

- [ ] **Step 4: Test**

Trigger a push (admin sends a message). With the app open, verify the toast slides in. Background the app and trigger another → tap the OS notification → app should open to `/kund?tab=messages`.

- [ ] **Step 5: Commit**

```powershell
git add src/components/customer/NotificationToast.tsx src/lib/pushNotifications.ts src/AppMobile.tsx
git commit -m "feat(mobile): foreground toast + tap-to-navigate for push notifications"
```

---

## Task 9: Native polish — splash, icons, status bar, safe-area

**Goal:** App feels native: branded splash, app icon on home screen, status bar matches theme, content respects iPhone notch / Android camera cutouts.

**Files:**
- Create: `public/icon-source.png` (1024×1024 master, user-supplied)
- Modify: `android/app/src/main/res/` (icons, splash drawables — generated by tool)
- Modify: `src/index.css` (safe-area insets)
- Modify: `src/AppMobile.tsx` (StatusBar config on mount)

**Acceptance Criteria:**
- [ ] App icon shows CleverDog logo on home screen
- [ ] Launch shows splash with logo on `#fcf5ee` background, fades to login/dashboard
- [ ] Status bar text is dark on light background
- [ ] Login form is not clipped by notch on devices with one

**Verify:** Visual check on Android emulator with notched device profile (Pixel 7 Pro).

**Steps:**

- [ ] **Step 1: Master icon**

User supplies `public/icon-source.png` — 1024×1024 PNG, no transparency, full bleed of CleverDog logo on light background.

- [ ] **Step 2: Generate native icons + splash**

```powershell
npm install -D @capacitor/assets
npx capacitor-assets generate --assetPath public/icon-source.png --android
```

(iOS assets will be generated on Codemagic — same command run there.)

- [ ] **Step 3: Status bar config**

In `src/AppMobile.tsx`, add at the top of the `App` component:

```typescript
import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { isNativeApp } from './lib/platform';
// ...
useEffect(() => {
  if (!isNativeApp()) return;
  StatusBar.setStyle({ style: Style.Dark }); // dark text on light bg
  StatusBar.setBackgroundColor({ color: '#fcf5ee' });
}, []);
```

- [ ] **Step 4: Safe area in CSS**

In `src/index.css`, append:

```css
@supports (padding: env(safe-area-inset-top)) {
  body {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
  }
}
```

- [ ] **Step 5: Sync, run, eyeball**

```powershell
npm run app:sync
npx cap open android
```

Run on Pixel 7 Pro emulator → check icon, splash, status bar, notch clearance.

- [ ] **Step 6: Commit**

```powershell
git add public/icon-source.png android/app/src/main/res/ src/AppMobile.tsx src/index.css package.json
git commit -m "feat(mobile): app icon, splash, status bar, safe-area-insets"
```

---

## Task 10: Native camera + photo picker for dog photos

**Goal:** Uploading a dog photo opens the native camera/photo library picker on iOS and Android (not just the web `<input type=file>` which has poor UX on iOS).

**Files:**
- Modify: `package.json` (add `@capacitor/camera`)
- Modify: wherever dog photos are uploaded (find via grep)
- Create: `src/lib/photoPicker.ts` (web fallback + native picker)

**Acceptance Criteria:**
- [ ] Tapping "Lägg till foto" on iOS opens native action sheet (Camera / Photo Library)
- [ ] On Android opens native picker
- [ ] On web (npm run dev) still uses `<input type=file>`
- [ ] Selected image uploads to Supabase storage same as before

**Verify:** Manual: tap photo upload on Android emulator → native picker → select image → uploads → appears in dog detail view.

**Steps:**

- [ ] **Step 1: Find the existing upload flow**

```
Grep for "dog-photos" or "uploadDogPhoto" or "createObjectURL" in src/components/customer/ to locate.
```

(This task assumes the existing upload uses a `<input type=file>` and `supabase.storage.from('dog-photos').upload(...)`.)

- [ ] **Step 2: Install plugin**

```powershell
npm install @capacitor/camera
```

- [ ] **Step 3: Create `src/lib/photoPicker.ts`**

```typescript
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { isNativeApp } from './platform';

export async function pickPhoto(): Promise<{ blob: Blob; filename: string } | null> {
  if (isNativeApp()) {
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Prompt, // shows "Camera vs Photos" sheet
    });
    if (!photo.webPath) return null;
    const res = await fetch(photo.webPath);
    const blob = await res.blob();
    return { blob, filename: `photo-${Date.now()}.${photo.format ?? 'jpg'}` };
  }
  // Web fallback
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      resolve({ blob: file, filename: file.name });
    };
    input.click();
  });
}
```

- [ ] **Step 4: Replace upload-trigger UI in customer dog view**

Find the file that has the dog-photo `<input type=file>`. Replace the input + onChange handler with a button that calls `pickPhoto()` and uploads the resulting blob.

- [ ] **Step 5: Sync + test**

```powershell
npm run app:sync
npx cap open android
```

In emulator, log in → open a dog → tap photo upload → native picker → select → confirm upload completes and photo shows.

- [ ] **Step 6: Commit**

```powershell
git add package.json package-lock.json src/lib/photoPicker.ts src/components/customer/
git commit -m "feat(mobile): native camera picker for dog photo uploads"
```

---

## Task 11: Codemagic CI for iOS builds + TestFlight delivery

**Goal:** Pushing to `main` triggers a Codemagic workflow that builds the iOS app, uploads to TestFlight, and runs an internal track for Android.

**Files:**
- Create: `codemagic.yaml`
- Create: `docs/mobile-app/store-submission.md`

**Acceptance Criteria:**
- [ ] First Codemagic run succeeds (green) without your laptop being involved
- [ ] TestFlight shows the new build within ~30 min
- [ ] Google Play Internal Testing track shows the Android build

**Verify:** Push a commit → watch Codemagic dashboard → 15–25 min later, TestFlight notification arrives.

**Steps:**

- [ ] **Step 1: Sign up + connect repo**

User signs up at https://codemagic.io, connects the GitHub repo, picks "Add app".

- [ ] **Step 2: Pre-reqs (manual, captured in `docs/mobile-app/store-submission.md`)**

Write `docs/mobile-app/store-submission.md` capturing:
- Apple Developer Program enrollment ($99/year)
- App Store Connect — create app record, bundle ID `se.cleverdog.kundportal`
- Generate App Store Connect API key (Issuer ID, Key ID, .p8 file) — upload to Codemagic
- Google Play Console enrollment ($25 one-time)
- Generate Google Play service account JSON — upload to Codemagic
- Generate iOS distribution certificate + provisioning profile (Codemagic can auto-manage via App Store Connect integration)

- [ ] **Step 3: Write `codemagic.yaml`**

```yaml
workflows:
  ios-testflight:
    name: iOS TestFlight
    instance_type: mac_mini_m2
    environment:
      groups:
        - app_store_connect # contains APP_STORE_CONNECT_KEY_IDENTIFIER, APP_STORE_CONNECT_PRIVATE_KEY, APP_STORE_CONNECT_ISSUER_ID
      vars:
        APP_ID: se.cleverdog.kundportal
        XCODE_WORKSPACE: ios/App/App.xcworkspace
        XCODE_SCHEME: App
      node: 20
    triggering:
      events: [push]
      branch_patterns: [{ pattern: main, include: true }]
    scripts:
      - name: Install deps
        script: |
          npm ci
      - name: Build web + add iOS platform
        script: |
          npm run app:build
          npx cap add ios || npx cap sync ios
      - name: Install CocoaPods
        script: |
          cd ios/App && pod install
      - name: Set up signing
        script: |
          xcode-project use-profiles
      - name: Build IPA
        script: |
          xcode-project build-ipa --workspace "$XCODE_WORKSPACE" --scheme "$XCODE_SCHEME"
    artifacts:
      - build/ios/ipa/*.ipa
    publishing:
      app_store_connect:
        auth: integration
        submit_to_testflight: true

  android-internal:
    name: Android Internal
    instance_type: linux_x2
    environment:
      groups:
        - google_play # contains GCLOUD_SERVICE_ACCOUNT_CREDENTIALS
      android_signing:
        - cleverdog-keystore
      node: 20
    triggering:
      events: [push]
      branch_patterns: [{ pattern: main, include: true }]
    scripts:
      - name: Install deps
        script: |
          npm ci
      - name: Build web + sync Android
        script: |
          npm run app:build
          npx cap sync android
      - name: Build AAB
        script: |
          cd android && ./gradlew bundleRelease
    artifacts:
      - android/app/build/outputs/bundle/release/*.aab
    publishing:
      google_play:
        credentials: $GCLOUD_SERVICE_ACCOUNT_CREDENTIALS
        track: internal
```

- [ ] **Step 4: Trigger first build**

```powershell
git add codemagic.yaml docs/mobile-app/store-submission.md
git commit -m "ci(mobile): Codemagic workflow for iOS TestFlight + Android internal"
git push
```

Watch Codemagic dashboard. First build often fails on signing — iterate with the docs.

- [ ] **Step 5: Verify**

- TestFlight notification on your iPhone
- Google Play Console → Internal testing → see new build

---

## Task 12: Production submission to App Store + Play Store

**Goal:** App listings exist in both stores with screenshots, descriptions, privacy policy. First production build is submitted for review.

**Files:**
- Modify: `docs/mobile-app/store-submission.md` (full checklist)
- No code changes if everything else is in place

**Acceptance Criteria:**
- [ ] App Store listing complete: name, subtitle, description, keywords, screenshots (5.5", 6.7" iPhone), privacy policy URL
- [ ] Play Store listing complete: short + long description, screenshots, feature graphic, privacy policy URL
- [ ] Privacy policy hosted at `https://cleverdog.se/privacy` (mobile-specific section added)
- [ ] First production build submitted

**Verify:** Apple "Waiting for Review" + Google "In review" statuses visible.

**Steps:**

- [ ] **Step 1: Screenshots**

Take screenshots on the Android emulator (Pixel 7 Pro for 6.7" feel; resize for App Store). Required sizes:
- iOS 6.7" (1290×2796): 3 screenshots minimum
- iOS 5.5" (1242×2208): 3 screenshots minimum (legacy, still required)
- Android phone (1080×1920 minimum): 2 screenshots minimum
- Android feature graphic: 1024×500

Recommended screens to capture: login, calendar with bookings, dog detail, messages.

- [ ] **Step 2: Privacy policy update**

Add a mobile section to the existing privacy policy noting:
- We collect device push tokens (purpose: send notifications about your bookings)
- We do not track outside the app
- Data is stored in EU (Supabase eu-west-1)

- [ ] **Step 3: App Store Connect listing**

In App Store Connect → CleverDog → 1.0 → fill in:
- Promotional text (170 char)
- Description (4000 char) — emphasize features beyond a simple wrapper (calendar, push, biometric login if added)
- Keywords (100 char)
- Support URL: `https://cleverdog.se/kontakt`
- Privacy Policy URL
- Screenshots
- App Review Information → demo customer account (login + password)

Submit for review.

- [ ] **Step 4: Play Store listing**

In Google Play Console → CleverDog → fill in:
- Short description (80 char)
- Full description (4000 char)
- Feature graphic + screenshots
- Privacy policy URL
- Content rating questionnaire
- Target audience: 18+
- App access: pre-launch credentials (demo customer)
- Data safety questionnaire (device IDs, contact email)

Promote internal track build to production review.

- [ ] **Step 5: Wait + iterate**

Apple: 1–3 days, often a rejection on first attempt. Common reasons: insufficient functionality vs web (mitigate by highlighting push + camera), missing demo account, privacy policy gaps. Read the rejection, fix, resubmit (usually 1–2 days for re-review).

Google: 1–7 days first time, fast after.

- [ ] **Step 6: Commit docs**

```powershell
git add docs/mobile-app/store-submission.md
git commit -m "docs(mobile): production submission checklist"
```

---

## Self-Review Notes

- **Spec coverage:** All three asks covered — Capacitor wrap (tasks 0–4, 9–10), push notifications (tasks 5–8), role-based login (task 1 uses existing `/login` flow + `MobileAuthGate` for admins).
- **Engineering scope:** ~3–6 weeks calendar time for one engineer working part-time. Bulk of waiting is Apple review + Codemagic signing setup, not code.
- **Cost:** Apple Developer $99/yr + Google Play $25 one-time + Codemagic free tier covers ≤500 build minutes/month (enough for biweekly releases). Firebase free tier handles push easily for a small user base.
- **Known omissions deliberately left out** (can add later if needed): biometric login, offline message draft cache, in-app review prompt, deep-link banners.
