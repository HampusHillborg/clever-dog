# CleverDog Mobile App — Dev Workflow

The kundportal (`/login`, `/kund`) is shipped as a native iOS + Android app using
Capacitor. The web build is the same code; Capacitor wraps it in a native shell.

## First-time setup

1. Install [Android Studio](https://developer.android.com/studio) on Windows.
   - During setup, install at minimum: Android SDK Platform 34, an emulator
     with Google Play Services (required for FCM push), and the build tools.
2. Sign up for [Codemagic](https://codemagic.io) for iOS builds (we don't have a Mac).
3. Run `npm install` (installs Capacitor with everything else).
4. Run `npm run app:sync` to build the customer-only web bundle and copy it
   into the Android project.

## Daily loop (Android — works on Windows)

- Edit code in `src/` as normal.
- `npm run app:sync` — rebuilds the web bundle (`VITE_APP_TARGET=app`) and
  syncs it into `android/`.
- `npm run app:android` — opens Android Studio. Click ▶ to run on emulator
  or a connected device.

## Daily loop (iOS — runs on Codemagic)

We can't build iOS apps on Windows. The workflow:

- Push to `main` → Codemagic auto-builds → uploads to TestFlight.
- Use Android emulator for fast iteration; the code is identical so anything
  that works on Android will work on iOS modulo platform-specific bugs.

## What goes into the app bundle?

When `VITE_APP_TARGET=app`, `src/main.tsx` loads `AppMobile.tsx` instead of
`App.tsx`. That excludes:

- Marketing site (`/`, `/staffanstorp`)
- Admin (`/admin`)

It includes:

- `/login` (same role-aware logic as web — admins see a "use the web portal"
  screen instead of being routed to `/admin`)
- `/login/accept-invite`
- `/kund` (customer dashboard)
- `/kund/hund/:id`

## Important env vars

The app uses the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as the
web. They're embedded into the JS bundle at build time. If you change them,
re-run `npm run app:sync`.
