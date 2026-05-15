# Store submission checklist

This is the **manual setup** needed to ship CleverDog to App Store + Google
Play. Code-wise we're ready; this captures everything outside the repo.

---

## Part A — Account enrollment (do once)

### A1. Apple Developer Program

- https://developer.apple.com/programs/enroll/
- **Cost:** $99/year
- **Enroll as:** Organization (if CleverDog AB), needs a D-U-N-S number
  (~3 days to get one if you don't have one; free).
- **Or:** Individual ($99/yr, faster but the App Store listing shows your
  personal name as the seller).
- Wait for Apple email confirming enrollment (1–2 business days).

### A2. Apple App Store Connect

- https://appstoreconnect.apple.com
- After enrollment, go to **My Apps** → **+** → **New App**
- **Platform:** iOS
- **Name:** CleverDog
- **Primary Language:** Swedish
- **Bundle ID:** Select `se.cleverdog.kundportal` (you'll need to register
  this first under Developer Portal → Identifiers → App IDs → Create →
  Explicit Bundle ID).
- **SKU:** `cleverdog-kundportal-ios` (anything unique).
- **User Access:** Full access.

### A3. App Store Connect API key (for Codemagic to upload builds)

- App Store Connect → **Users and Access** → **Integrations** → **App Store
  Connect API** → **Generate API Key**.
- **Name:** Codemagic CI
- **Access:** Admin (needed for TestFlight + App Store submissions).
- Download the `.p8` file (you can only download once — keep it safe).
- Note the **Issuer ID** and **Key ID**.

### A4. Google Play Console

- https://play.google.com/console/signup
- **Cost:** $25 (one-time, lifetime).
- **Type:** Organization (or Personal).
- Verify identity (driver's license / passport).
- After approval (~24h), **Create app**:
  - **App name:** CleverDog
  - **Default language:** Swedish (sv-SE)
  - **App or game:** App
  - **Free or paid:** Free
  - Accept declarations.

### A5. Google Play API service account (for Codemagic to upload AABs)

- Play Console → **Setup** → **API access** → **Choose service account** →
  **Link Google Cloud project**.
- In Google Cloud Console for the linked project:
  - IAM → Service Accounts → **Create service account**:
    - Name: `codemagic-publisher`
    - Role: skip (no project roles needed)
  - Create key → JSON → download.
- Back in Play Console → **Grant access** to that service account:
  - Role: **Release manager** (or **Admin** if you're not sure).
  - App permissions: **Add app** → CleverDog → grant.

### A6. Generate Android signing keystore

- Run locally **once** (Windows):
  ```powershell
  keytool -genkey -v -keystore cleverdog-release.keystore -alias cleverdog -keyalg RSA -keysize 2048 -validity 10000
  ```
- Use a strong password — **store it in 1Password or similar; if you lose
  it you can NEVER update the app.**
- Note the **alias** (cleverdog), **keystore password**, and **key password**.

---

## Part B — Codemagic setup

### B1. Connect repository

- https://codemagic.io → **Sign up** with GitHub.
- Add app → Select `HampusHillborg/clever-dog`.
- Codemagic auto-detects `codemagic.yaml`.

### B2. Environment groups (Codemagic UI → Teams → Environment variables)

Create three groups:

#### `google_play`
- `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS` = paste the JSON from A5
  (whole file content, mark as **Secure**).

#### `app_store_connect` (set up after A3)
- Codemagic UI → **Teams** → **Integrations** → **App Store Connect** →
  Connect using the API key from A3.
- This makes the `auth: integration` line in codemagic.yaml work without
  extra env vars.

#### `cleverdog_supabase`
- `VITE_SUPABASE_URL` = your Supabase URL
- `VITE_SUPABASE_ANON_KEY` = your Supabase anon key

### B3. Code signing identities

Codemagic UI → **Teams** → **Code signing identities** → **Android keystore**:
- Upload `cleverdog-release.keystore` (from A6)
- **Reference name:** `cleverdog-keystore` (must match the name in
  `codemagic.yaml`)
- Enter keystore password, alias, key password.

For iOS, the App Store Connect integration handles signing automatically —
no manual upload needed.

### B4. Trigger first build

- Push to `main` → Codemagic auto-builds.
- Watch the dashboard. Common first-build failures:
  - Android: gradle dependency download timeout → just retry.
  - iOS: signing issues → ensure A3 API key has Admin role; ensure A2 app
    record exists.

---

## Part C — Store listing content (before public release)

### C1. Required files / text

| Asset | Required | Notes |
|-------|----------|-------|
| App icon 1024x1024 | Yes | Already configured in repo, but replace the placeholder per `docs/mobile-app/README.md`. |
| Screenshots: iOS 6.7" (iPhone 15 Pro Max) — 3 minimum | Yes | 1290x2796 px. Take from emulator or Codemagic preview. |
| Screenshots: iOS 6.5" (iPhone 11 Pro Max) — 3 minimum | Yes | 1242x2688 px. |
| Screenshots: Android phone — 2 minimum | Yes | 1080x1920 px minimum. |
| Android feature graphic | Yes | 1024x500 px (banner shown on Play Store). |
| Privacy policy URL | Yes | `https://cleverdog.se/privacy` — add a mobile section noting we collect device push tokens. |
| App description (4000 char) | Yes | Lead with: customer portal for booking pensionat and daycare, push notifications, biometric login. |
| Promotional text (170 char) | iOS only | "Hantera dina dagisbokningar, prata med personalen och få notiser direkt i mobilen." |
| Support URL | Yes | `https://cleverdog.se/kontakt` |
| Demo account | Yes | A real customer account (email + password) that Apple's reviewer can use. |

### C2. Privacy policy mobile addendum

Add this to your existing `https://cleverdog.se/privacy`:

> **Mobilappen (iOS och Android)**
>
> När du loggar in i CleverDog-appen registrerar vi en anonym
> notifieringstoken (Apple Push Notification service eller Firebase Cloud
> Messaging) så att vi kan skicka dig pushnotiser om dina bokningar och
> meddelanden. Token är inte personligt identifierbar och kan inte spåra
> dig utanför appen. När du loggar ut tas token bort. Vi delar aldrig
> tokens med tredje part utöver det som krävs för att leverera notisen
> (Apple, Google, Supabase).
>
> Vi använder inte annonsspårning eller analytics i appen.

### C3. iOS Info.plist usage descriptions (CRITICAL — Apple rejects without these)

Codemagic will create the iOS project on first build. After that, edit
`ios/App/App/Info.plist` (or have Codemagic do it via a script) to add:

```xml
<key>NSCameraUsageDescription</key>
<string>CleverDog behöver tillgång till kameran för att du ska kunna ta foton på din hund.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>CleverDog behöver tillgång till dina foton för att du ska kunna välja en bild på din hund.</string>
```

### C4. Submission flow

#### iOS — TestFlight first, then App Store

1. Codemagic builds and uploads to TestFlight automatically.
2. App Store Connect → CleverDog → TestFlight → **Add new build** (auto).
3. Test internally with 2–3 people.
4. App Store → **+ Version** → 1.0.0 → fill in metadata from C1.
5. **Submit for review**.
6. Wait 1–3 days. Common rejection causes:
   - "Insufficient functionality vs. web" → emphasize native push,
     biometric login, camera, calendar.
   - Missing demo account.
   - Privacy policy doesn't mention push tokens.

#### Google Play — Internal → Production

1. Codemagic uploads AAB to Internal Testing track.
2. Play Console → **Internal testing** → **Create new release** → review
   the AAB → roll out.
3. Add internal testers (your email + 2 colleagues' Google accounts).
4. Test for a few days.
5. **Promote to Production** when ready, fill in:
   - Store listing (C1)
   - Content rating questionnaire
   - Target audience
   - Data safety form (declare push tokens, contact email).
6. Submit. Google review is typically 1–7 days first time.

---

## Part D — Post-launch

- Set up **Codemagic notifications** to Slack / email so you know when
  builds fail.
- Set up **Firebase Crashlytics** if you want crash reporting (optional).
- App version bumps: edit `android/app/build.gradle` (versionCode +
  versionName) and `ios/App/App.xcodeproj` (Codemagic can auto-increment).
- Privacy policy updates require re-acceptance in some jurisdictions —
  keep changes minimal and dated.
