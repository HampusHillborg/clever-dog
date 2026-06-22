# Push-notiser – vad som krävs för att de ska fungera

Notiserna består av **två delar**:

1. **Notiscenter i appen (klockan uppe till höger)** – fungerar redan utan extra
   konfiguration. `send-notification`-edge-funktionen skriver en rad i
   `notifications`-tabellen för varje händelse (bokningsbeslut, nya
   meddelanden) och appen visar dem med ett oläst-märke. Inget Firebase krävs
   för detta.

2. **Push-notiser (banner på telefonen även när appen är stängd)** – kräver
   externa nycklar som måste läggas in som *secrets* i Supabase. Det är
   förmodligen det som saknas idag.

## Secrets som edge-funktionen läser

Sätt dessa i Supabase → Project Settings → Edge Functions → Secrets
(eller `supabase secrets set NAME=value`):

### Android + iOS via Firebase Cloud Messaging (FCM)
- `FIREBASE_SERVICE_ACCOUNT_JSON` – hela innehållet i service-account-JSON-filen
  (Firebase Console → Project settings → Service accounts → *Generate new
  private key*). Klistra in som en rad.

### iOS direkt via APNs (om ni vill skicka utan att gå via Firebase)
- `APNS_AUTH_KEY_P8` – hela .p8-filen (inkl. `BEGIN/END`-raderna)
- `APNS_KEY_ID` – 10-teckens key-id
- `APNS_TEAM_ID` – 10-teckens team-id
- `APNS_BUNDLE_ID` – default `se.cleverdog.kundportal`
- `APNS_ENV` – `production` (default) eller `sandbox` (debug-byggen via Xcode)

> iOS kan skötas helt via Firebase om APNs-nyckeln laddas upp i Firebase-projektet.
> Då räcker `FIREBASE_SERVICE_ACCOUNT_JSON`.

## Klient-sida (redan på plats)
- `@capacitor/push-notifications` är installerat och `initPushNotifications()`
  registrerar token i `device_tokens`.
- **Android:** `google-services.json` måste ligga i `android/app/`.
- **iOS:** Push Notifications-capability + `GoogleService-Info.plist` i Xcode.

## Så testar du att det fungerar
1. Sätt secrets enligt ovan och redeploya `send-notification` vid behov.
2. Installera native-appen på en riktig enhet (push fungerar inte i webbläsare),
   tillåt notiser, och kontrollera att en rad dyker upp i `device_tokens`.
3. Skicka ett test-meddelande från admin → kunden ska få både en notis i
   notiscentret och en push-banner.
4. Felsök via Supabase → Edge Functions → Logs. Saknade secrets loggar t.ex.
   `FIREBASE_SERVICE_ACCOUNT_JSON not set, skipping push`.
