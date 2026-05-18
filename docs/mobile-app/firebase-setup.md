# Firebase / FCM / APNs setup

This is the **one-time manual setup** you (Hampus) need to do before push
notifications will work on the app. Code is already wired up; it just needs
the secret keys/files.

## Step 1 — Create a Firebase project

1. Go to https://console.firebase.google.com and click **Add project**.
2. Name it **CleverDog** (any name; you'll only see it internally).
3. You can disable Google Analytics for this project — we don't need it.
4. Click **Create project** and wait ~30 seconds.

## Step 2 — Add Android app to the Firebase project

1. In the Firebase console, click the **Android** icon to "Add app".
2. **Android package name:** `se.cleverdog.kundportal`
   (this MUST match exactly, it's the appId in `capacitor.config.ts`).
3. **App nickname:** CleverDog (or whatever).
4. **Debug signing certificate SHA-1:** skip for now — only needed if you
   add Google Sign-In later.
5. Click **Register app**.
6. Download `google-services.json` and put it at:

   ```
   android/app/google-services.json
   ```

   (DO NOT commit this file — it's already gitignored.)

7. Skip the "Add Firebase SDK" and "Verify installation" steps — Capacitor's
   push plugin handles the SDK wiring.

8. **Enable push in the app build** by adding `VITE_PUSH_ENABLED=true` to
   your local `.env.local` (or set it inline when building). Push is gated
   behind this flag because without `google-services.json` the native
   Firebase init crashes the Activity right after the permission prompt.
   ```powershell
   echo "VITE_PUSH_ENABLED=true" >> .env.local
   npm run app:sync
   ```

## Step 3 — Generate a service account key for the edge function

The edge function needs to authenticate to the FCM HTTP v1 API. It uses a
service-account JSON.

1. In Firebase console → ⚙️ Project Settings → **Service accounts** tab.
2. Click **Generate new private key** → **Generate key**.
3. A JSON file downloads. Open it (it has `client_email`, `private_key`,
   `project_id` fields).
4. Upload its full contents as a Supabase secret:

   In Supabase dashboard → **Edge Functions** → **Secrets** → **Add new secret**:

   - **Name:** `FIREBASE_SERVICE_ACCOUNT_JSON`
   - **Value:** paste the entire JSON file content (including the curly braces)

   Save.

5. Delete the local JSON file when done — it's a privileged credential.

## Step 4 — Add iOS app to the Firebase project (later, when we have iOS builds)

This step happens **after** you've enrolled in the Apple Developer Program
and have Codemagic building iOS. For now, skip this and come back when the
iOS pipeline is set up.

When you're ready:

1. In Firebase console → Add app → **iOS** icon.
2. **Apple bundle ID:** `se.cleverdog.kundportal`.
3. Download `GoogleService-Info.plist`.
4. Add it to the iOS project at `ios/App/App/GoogleService-Info.plist`
   (this path will exist after Codemagic does its first `npx cap add ios`).

## Step 5 — Configure APNs (Apple Push Notification service) for iOS

We send to iOS directly via APNs HTTP/2 from our edge function (FCM is
Android-only in our setup), so the APNs key goes into **Supabase secrets**,
not Firebase.

1. In **Apple Developer Portal** → Certificates, IDs & Profiles → **Keys** →
   **Create a Key**.
2. Enable **Apple Push Notifications service (APNs)**.
3. Name it `CleverDog APNs`, click Continue → Register → **Download** the
   `.p8` file. (Apple lets you download once — keep it safe.)
4. Note the **Key ID** (10 chars, shown next to the key).
5. Find your **Team ID** in Apple Developer → Membership (10 chars).
6. In Supabase dashboard → **Edge Functions → Secrets**, add these three:

   - `APNS_AUTH_KEY_P8` → the **whole contents** of the .p8 file,
     including the `-----BEGIN PRIVATE KEY-----` / `-----END PRIVATE KEY-----`
     wrapping lines and the newlines between them. Paste as multi-line.
   - `APNS_KEY_ID` → e.g. `ABCD123456`
   - `APNS_TEAM_ID` → e.g. `XYZW987654`

   Optional:
   - `APNS_BUNDLE_ID` → defaults to `se.cleverdog.kundportal` if unset.
   - `APNS_ENV` → defaults to `production`. Set to `sandbox` only when
     pushing to debug builds installed via Xcode (not TestFlight).

7. After saving the secrets, the next push triggered to an iOS user will
   flow `Supabase edge function → Apple APNs → iPhone`. Check Supabase
   **Edge Functions → Logs** for `[apns]` entries when debugging.

## Step 6 — Add Supabase redirect URLs for the app

So that Supabase magic-link emails (password reset, invites) open the app
instead of the website:

1. Supabase dashboard → **Authentication** → **URL Configuration** →
   **Redirect URLs**.
2. Add both:
   - `cleverdog://login`
   - `cleverdog://login/accept-invite`
3. Keep the existing web URLs too (`https://cleverdog.se/login`, etc.).
4. Save.

## Step 7 — Verify push works

After dropping `google-services.json` in place and setting the
`FIREBASE_SERVICE_ACCOUNT_JSON` secret:

1. Run `npm run app:sync && npm run app:android` to rebuild + open
   Android Studio.
2. Start the emulator (must be a **Google Play** image, e.g. Pixel 7 with
   Play Services — not a "stock" AOSP emulator).
3. Log in to the app as a known customer.
4. Grant the notification permission when prompted.
5. Check **Android Studio Logcat**, filter for `[push]` — you should see
   `[push] token registered` within a second or two.
6. In the Supabase SQL editor:

   ```sql
   select user_id, platform, created_at from device_tokens order by created_at desc limit 5;
   ```

   You should see a new row.
7. In admin (web), approve or reject one of that customer's pending
   bookings. The Android emulator should show a push notification within
   ~30 sec.

If anything fails, check:

- Supabase **Edge Functions → Logs** for the `send-notification` function
- Android Studio **Logcat** for `[push]` entries
- Firebase Console → **Engagement → Messaging** → reports tab (sends show
  up here)
