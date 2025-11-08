# Guide: Skapa Anställda med Inloggningskonton

Denna guide beskriver hur du konfigurerar och använder funktionaliteten för att skapa anställda med inloggningskonton direkt från admin-panelen.

## Översikt

- **Admin** kan skapa nya inloggningskonton för anställda genom att ange ett lösenord när de skapar en ny anställd
- **Platschef** kan länka till befintliga konton genom att ange e-postadressen (kan inte skapa nya konton)
- Alla anställda skapas i både `admin_users`-tabellen (för autentisering) och `employees`-tabellen (för anställd-information)

## Steg 1: Kör SQL-schemat

Kör `supabase-schema-staff-scheduling.sql` i Supabase SQL Editor för att skapa:
- `employees`-tabellen
- `staff_schedules`-tabellen
- `staff_absences`-tabellen
- Nödvändiga policies och indexes

**Viktigt:** Detta schema fixar även SQL-syntaxfelet i `staff_absences`-policies genom att dela upp SELECT och INSERT i separata policies (PostgreSQL-krav).

## Steg 2: Konfigurera Netlify Environment Variables

För att Netlify Function `create-staff-user.js` ska fungera, måste du konfigurera följande environment variables i Netlify Dashboard:

1. Gå till din Netlify site → **Site settings** → **Environment variables**
2. Lägg till följande variabler:

```
SUPABASE_URL=din-supabase-url
SUPABASE_ANON_KEY=din-anon-key
SUPABASE_SERVICE_ROLE_KEY=din-service-role-key
```

### Hitta dina Supabase-nycklar:

1. Öppna Supabase Dashboard
2. Gå till **Settings** → **API**
3. Kopiera:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

**VARNING:** Service Role Key har full åtkomst till din databas. Håll den hemlig och exponera den ALDRIG i frontend-koden.

## Steg 3: Installera Dependencies

Netlify Function använder `@supabase/supabase-js`. Kontrollera att den är installerad:

```bash
npm install @supabase/supabase-js
```

Om du använder Netlify CLI lokalt, installera även:

```bash
npm install -g netlify-cli
```

## Steg 4: Testa Lokalt (Valfritt)

För att testa Netlify Functions lokalt:

```bash
netlify dev
```

Detta startar en lokal utvecklingsserver som kan köra Netlify Functions.

## Steg 5: Använda Funktionen från Admin-panelen

### För Admin:

1. Logga in som admin
2. Gå till **Inställningar** (Settings)
3. Scrolla ner till **Anställda**-sektionen
4. Klicka på **Lägg till anställd**
5. Fyll i formuläret:
   - **Namn** (obligatoriskt)
   - **E-postadress** (obligatoriskt)
   - **Lösenord** (för att skapa nytt konto) - lämna tomt för att länka till befintligt konto
   - **Telefon** (valfritt)
   - **Plats** (valfritt: Malmö eller Staffanstorp)
   - **Roll** (Anställd eller Platschef)
6. Klicka på **Spara**

**Om lösenord anges:**
- Ett nytt inloggningskonto skapas automatiskt i Supabase Auth
- En post skapas i `admin_users`-tabellen (via trigger)
- En post skapas i `employees`-tabellen med alla detaljer

**Om lösenord lämnas tomt:**
- Systemet försöker hitta en befintlig användare med samma e-postadress
- Om användare hittas: länkas till den anställd-posten
- Om ingen användare hittas: du får en fråga om du vill skapa ett nytt konto

### För Platschef:

1. Logga in som platschef
2. Gå till **Inställningar** (Settings)
3. Scrolla ner till **Anställda**-sektionen
4. Klicka på **Lägg till anställd**
5. Fyll i formuläret (lösenord-fältet visas INTE för platschef):
   - **Namn** (obligatoriskt)
   - **E-postadress** (obligatoriskt) - måste matcha ett befintligt konto
   - **Telefon** (valfritt)
   - **Plats** (valfritt)
   - **Roll** (Anställd eller Platschef)
6. Klicka på **Spara**

**Viktigt:** Platschef kan endast länka till befintliga konton. Om e-postadressen inte finns kommer ett felmeddelande visas.

## Säkerhet

### Backend-validering (Netlify Function):

- Verifierar att endast admin kan skapa nya konton (kontrollerar roll i `admin_users`)
- Validerar e-postadressformat
- Validerar lösenordslängd (minst 6 tecken)
- Använder Supabase Admin API (Service Role Key) för att skapa användare
- Skapar automatiskt post i `admin_users` (via trigger eller manuellt)
- Skapar post i `employees` med alla detaljer

### Frontend-validering:

- Lösenord-fältet visas endast för admin när man skapar ny anställd
- Platschef kan inte se eller använda lösenord-fältet
- Validering av obligatoriska fält och e-postformat

## Felsökning

### "Only admin users can create staff accounts"
- Kontrollera att du är inloggad som admin (inte platschef eller employee)
- Kontrollera att din roll i `admin_users`-tabellen är 'admin'

### "Server configuration error"
- Kontrollera att alla environment variables är satta i Netlify Dashboard
- Kontrollera att `SUPABASE_SERVICE_ROLE_KEY` är korrekt (inte anon key)

### "Failed to create user account"
- Kontrollera att e-postadressen inte redan finns i Supabase Auth
- Kontrollera att lösenordet är minst 6 tecken långt
- Kontrollera Supabase logs för mer detaljerad felinformation

### "Användare med denna e-postadress finns inte"
- För platschef: kontrollera att användaren redan finns i Supabase Auth
- För admin: ange ett lösenord för att skapa nytt konto, eller skapa användaren först i Supabase Dashboard

## Ytterligare Information

- Anställda kan redigeras och tas bort från admin-panelen
- När en anställd tas bort tas även deras konto bort från Supabase Auth (via CASCADE)
- Rollen i `admin_users` kontrollerar åtkomstnivå (admin/employee/platschef)
- Rollen i `employees` är bara metadata (employee/platschef)

## Support

Om du stöter på problem:
1. Kontrollera Netlify Function logs i Netlify Dashboard
2. Kontrollera Supabase logs i Supabase Dashboard
3. Kontrollera browser console för frontend-fel

