# Store listing — CleverDog kundportal

Texter att klistra in i Google Play Console och App Store Connect.
Bundle ID: `se.cleverdog.kundportal`. App-namn: **CleverDog**.

---

## Google Play Store

### App name (50 tecken)

```
CleverDog
```

### Short description (80 tecken)

Säg till vilken som passar bäst — bocka av en, så är det den vi använder.

**Alternativ A (funktionsfokus):**
```
Boka, chatta och följ din hunds dag på CleverDog dagis och pensionat.
```
(70 tecken)

**Alternativ B (relationsfokus):**
```
Allt om din hunds dag hos CleverDog – bokning, dagsrapport och chatt.
```
(70 tecken)

### Full description (4000 tecken)

```
CleverDog är kundappen för dig som har hund hos Clever Dog i Malmö – hunddagis,
pensionat och hundutbildning. Här samlar du allt du behöver för din hunds vardag
hos oss på ett ställe.

Funktioner

• Daglig rapport – se hur dagen varit för din hund: humör, aktivitet, mat och
  små guldkorn från personalen.
• Bokningar – se inbokade dagar, boka enstaka dagis-dagar, ansök om pensionat,
  och avboka direkt i appen.
• Kalender – snabb överblick över heltids- och deltidsschema, plus stängda
  dagar och röda dagar.
• Chatt med personalen – meddelanden direkt till oss på dagiset utan att behöva
  ringa eller skicka mejl.
• Album – bilder och rapporter från din hunds dagar samlade på ett ställe.
• Hundprofil – uppdatera ras, ålder, vaccinationer, veterinärkontakt och egna
  anteckningar om din hund.
• Kontrakt – läs igenom och spara ditt avtal i mobilen.
• Personal-presentation – se vilka som tar hand om din hund.

Push-notiser
Du får aviseringar när personalen postar en ny dagsrapport, när din bokning
bekräftas eller om vi behöver höra av oss om något.

Privacy & säkerhet
Appen samlar bara in det vi behöver för att kunna sköta din hund och hantera
din bokning. Vi använder inga reklam-trackers eller analysverktyg som spårar
ditt beteende i appen. All trafik mellan appen och våra servrar är krypterad,
och du kan när som helst radera ditt konto direkt i appen under
"Mer → Radera konto".

Läs mer i vår integritetspolicy: https://cleverdog.se/privacy

Vem är appen för?
Appen är endast för befintliga kunder hos Clever Dog. Du loggar in med
inbjudan från oss – om du är intresserad av en plats för din hund, hör av dig
via cleverdog.se.

Support
Frågor om appen eller ditt konto? Mejla info@cleverdog.se.
```

### Category

`Lifestyle` (Livsstil)

### Tags / keywords (Play Console)

`hund`, `hunddagis`, `pensionat`, `bokning`, `husdjur`

### Content rating

Family / 3+ (inget olämpligt innehåll, inga ads, ingen användargenererad
publik feed). Fyll i Content Rating Questionnaire i Play Console.

### Target audience

13+. Appen riktar sig till hundägare (vuxna). Ingen marknadsföring mot barn.

### Privacy policy URL

```
https://cleverdog.se/privacy
```

### Support email

```
info@cleverdog.se
```

### Website

```
https://cleverdog.se
```

---

## App Store (Apple)

### Name (30 tecken)

```
CleverDog
```

### Subtitle (30 tecken)

```
Din hunds dag i appen
```

### Promotional Text (170 tecken, kan uppdateras utan ny review)

```
Daglig rapport, bokning, chatt med personalen och allt du behöver för din
hunds vardag hos Clever Dog – samlat på ett ställe.
```

### Description (4000 tecken)

Samma som Play Stores fulla beskrivning ovan — Apple tar samma format.

### Keywords (100 tecken, kommaseparerad)

```
hund,hunddagis,pensionat,bokning,husdjur,clever dog,malmö,hundträning
```

### Support URL

```
https://cleverdog.se
```

### Marketing URL (frivillig)

```
https://cleverdog.se
```

### Privacy Policy URL

```
https://cleverdog.se/privacy
```

### Age Rating

4+ (inget olämpligt, inga ads, ingen användargenererad publik feed)

### App Privacy (Data collected → Linked to user)

Fyll i App Store Connect → App Privacy så här:

**Contact Info**
- Name — Linked to user — App Functionality
- Email Address — Linked to user — App Functionality
- Phone Number — Linked to user — App Functionality
- Physical Address — Linked to user — App Functionality

**Identifiers**
- User ID — Linked to user — App Functionality
- (Apple kallar push-token *Device ID* — beroende på hur Apple klassar det
  räcker det att ange detta under "User ID". Push-token är inte en personlig
  identifierare i sig.)

**Sensitive Info**
- Other Financial Info → ✗ (vi tar inga betalningar i appen)
- Health & Fitness → ✗ (vaccinationsuppgifter gäller hunden, inte människan,
  och räknas inte som hälsodata enligt Apple)
- Government ID → ✓ JA, personnummer (svensk Government ID).
  Linked to user — App Functionality (used för att identifiera kunden i
  kontrakt och fakturering).

**User Content**
- Other User Content — Linked to user — App Functionality (chatt-meddelanden
  och hundanteckningar)

**Diagnostics / Analytics**
- Ingenting. Vi använder inga analytics-SDK.

**Used to Track You**
- Nej. Klicka "No" på "Are these data used for tracking purposes?"

### Account Deletion within app

Apple frågar om appen har in-app konto-radering. Svara **YES**, peka på
"Settings → Mer → Radera konto" i appens beskrivning.

### Export Compliance

ITSAppUsesNonExemptEncryption = false (vi använder bara standard HTTPS/TLS).

---

## Screenshots — vad som behövs

### Play Store
- Minst 2 telefonskärmar (max 8). Föredra **1080×1920** eller högre, PNG/JPEG.
- Feature graphic: **1024×500** (krävs).
- App-ikon: **512×512** (redan i `resources/icon.png`).

### App Store
- iPhone 6.7" (1290×2796): minst 3 screenshots, max 10. **OBLIGATORISKT**.
- iPhone 6.5" och 5.5" stöds — Apple skalar 6.7" automatiskt sedan iOS 16,
  men om du vill polera, lämna i båda.
- iPad 12.9" och 11" (om du stöder iPad — om inte, hoppa över).

### Förslag på screenshots (samma motiv för båda)

1. **Hem-fliken** med en daglig rapport synlig — mest "wow"-faktorn.
2. **Album-fliken** med foton.
3. **Kalender-fliken** med några inbokade dagar.
4. **Chat-fliken** med ett meddelande från personalen.
5. **Hundprofil-sheet** (Mer → Hundinfo & hälsa).

Använd din egen testdata (din egen hund, eller en demo-kund) och ta
screenshots på en Pixel-emulator (Android) och en iPhone-simulator (iOS).
Lägg på en kort caption-text ovanför varje bild, t.ex. "Daglig rapport,
direkt i mobilen" — det höjer konvertering rejält.
```
