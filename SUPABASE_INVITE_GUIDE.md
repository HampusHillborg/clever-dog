# Guide: Bjuda in användare i Supabase

Detta dokument beskriver hur du fixar så att invite-funktionen fungerar korrekt i Supabase.

## Problem och lösningar

### Problem 1: Email templates är inte konfigurerade

Supabase behöver email templates för att skicka inbjudningar.

**Lösning:**

1. Gå till **Authentication > Email Templates** i Supabase Dashboard
2. Välj **"Invite user"** template
3. Kontrollera att följande variabler finns:
   - `{{ .Email }}` - Användarens email
   - `{{ .Token }}` - Verifierings-token
   - `{{ .TokenHash }}` - Hash av token
   - `{{ .SiteURL }}` - Din site URL

**Standard template (svenska) - HTML-format för klickbar länk:**

För att länken ska vara klickbar måste du använda HTML-format. Här är ett fungerande template:

**Subject:** Du har blivit inbjuden till CleverDog Admin

**Body (HTML):**

```html
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">Hej!</h2>
    
    <p>Du har blivit inbjuden att skapa ett konto på CleverDog Admin.</p>
    
    <p>Klicka på knappen nedan för att skapa ditt konto och sätta ett lösenord:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" 
         style="background-color: #2563eb; color: white; padding: 12px 24px; 
                text-decoration: none; border-radius: 5px; display: inline-block; 
                font-weight: bold;">
        Skapa mitt konto
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666;">
      Eller kopiera och klistra in denna länk i din webbläsare:<br>
      <a href="{{ .ConfirmationURL }}" style="color: #2563eb; word-break: break-all;">{{ .ConfirmationURL }}</a>
    </p>
    
    <p style="font-size: 12px; color: #999; margin-top: 30px;">
      Om du inte begärt denna inbjudan kan du ignorera detta meddelande.
    </p>
    
    <p style="margin-top: 30px;">
      Med vänliga hälsningar,<br>
      <strong>CleverDog Team</strong>
    </p>
  </div>
</body>
</html>
```

**Body (Plain Text - alternativ):**

Om du föredrar plain text, använd detta (länken blir fortfarande klickbar i de flesta email-klienter):

```
Hej!

Du har blivit inbjuden att skapa ett konto på CleverDog Admin.

Klicka på länken nedan för att skapa ditt konto och sätta ett lösenord:

{{ .ConfirmationURL }}

Om länken inte fungerar, kopiera och klistra in den i din webbläsare.

Om du inte begärt denna inbjudan kan du ignorera detta meddelande.

Med vänliga hälsningar,
CleverDog Team
```

**Viktigt:** 
- `{{ .ConfirmationURL }}` genereras automatiskt av Supabase och innehåller både token och redirect-URL
- För HTML-template: Välj "HTML" som format i Supabase Email Templates
- För plain text: Välj "Plain Text" som format

### Problem 2: SMTP är inte konfigurerad

Supabase kan använda sin egen SMTP-server (begränsad) eller din egen.

**Lösning A: Använd Supabase's standard SMTP (enkelt, men begränsat)**

1. Gå till **Authentication > Settings** i Supabase Dashboard
2. Under **"SMTP Settings"**, kontrollera att "Enable Custom SMTP" är **av** (använder Supabase's standard)

**Lösning B: Konfigurera egen SMTP (rekommenderas för produktion)**

1. Gå till **Authentication > Settings**
2. Aktivera **"Enable Custom SMTP"**
3. Fyll i dina SMTP-inställningar:
   - **Host**: smtp.gmail.com (för Gmail) eller din provider
   - **Port**: 587 (för TLS) eller 465 (för SSL)
   - **User**: Din email
   - **Password**: Din email-lösenord eller app-specifikt lösenord
   - **Sender email**: Din email
   - **Sender name**: CleverDog Admin

### Problem 3: Site URL är fel

Supabase behöver veta vilken URL att skicka användare till efter att de accepterar inbjudan.

**Lösning:**

1. Gå till **Authentication > URL Configuration**
2. Sätt **"Site URL"** till din applikations URL:
   - Development: `http://localhost:5173` (eller din port)
   - Production: `https://din-domän.se`
3. Lägg till **Redirect URLs**:
   - `http://localhost:5173/**`
   - `https://din-domän.se/**`

### Problem 4: Email confirmation är aktiverad

Om email confirmation är aktiverad måste användaren klicka på länken i mailet först.

**Lösning:**

1. Gå till **Authentication > Settings**
2. Under **"User Management"**, sätt **"Enable email confirmations"** till:
   - **På** (säkrare - användaren måste bekräfta email först)
   - **Av** (användaren kan logga in direkt efter att de accepterar inbjudan)

### Problem 5: Trigger fungerar inte för inbjudna användare

När en användare accepterar en inbjudan måste trigger skapa en post i `admin_users`.

**Kontrollera att trigger finns:**

Kör detta i SQL Editor för att kontrollera:

```sql
-- Kontrollera att trigger finns
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table, 
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

Om trigger inte finns, kör hela `supabase-schema-auth.sql` igen.

## Steg-för-steg: Bjuda in en användare

### Metod 1: Via Supabase Dashboard (Rekommenderad)

1. **Konfigurera email först:**
   - Gå till Authentication > Email Templates
   - Kontrollera att "Invite user" template är korrekt
   - Gå till Authentication > Settings
   - Kontrollera Site URL och Redirect URLs

2. **Bjud in användaren:**
   - Gå till **Authentication > Users**
   - Klicka på **"Invite user"** (eller "+" knappen)
   - Ange email-adressen
   - **VIKTIGT:** I fältet "Redirect to" (eller "Redirect URL"), ange:
     - Development: `/admin`
     - Production: `/admin`
   - Välj roll (detta är bara för visning, den faktiska rollen sätts i `admin_users`)
   - Klicka **"Send invitation"**

   **OBS:** Om det inte finns ett "Redirect to"-fält i invite-formuläret, används Site URL från URL Configuration istället. Se till att Site URL är satt till `/admin` eller din fullständiga URL med `/admin` i slutet.

3. **Användaren får ett email:**
   - De får en inbjudningslänk via email
   - De klickar på länken
   - De sätter sitt lösenord
   - De loggar in

4. **Verifiera att användaren skapades korrekt:**

```sql
-- Kontrollera att användaren finns i admin_users
SELECT * FROM admin_users WHERE email = 'användarens@email.se';
```

Om användaren inte finns, skapas den automatiskt av trigger när de först loggar in.

5. **Sätt användarens roll (om den inte är rätt):**

```sql
-- Gör till admin
UPDATE admin_users 
SET role = 'admin' 
WHERE email = 'användarens@email.se';

-- Gör till platschef
UPDATE admin_users 
SET role = 'platschef' 
WHERE email = 'användarens@email.se';

-- Gör till anställd (standard)
UPDATE admin_users 
SET role = 'employee' 
WHERE email = 'användarens@email.se';
```

### Metod 2: Manuellt skapa användare (Alternativ)

Om invite inte fungerar:

1. **Skapa användaren manuellt:**
   - Gå till Authentication > Users
   - Klicka på **"Add user"** (inte Invite)
   - Ange email och lösenord
   - Välj "Auto Confirm User" om du vill att de ska kunna logga in direkt
   - Klicka "Create user"

2. **Kontrollera att posten skapades i admin_users:**
   - Vänta några sekunder (för trigger att köra)
   - Kör SQL:
   ```sql
   SELECT * FROM admin_users WHERE email = 'användarens@email.se';
   ```

3. **Om posten inte finns, skapa den manuellt:**

```sql
-- Hitta användarens ID först
SELECT id, email FROM auth.users WHERE email = 'användarens@email.se';

-- Skapa posten i admin_users (ersätt USER_ID med id från ovan)
INSERT INTO admin_users (id, email, role)
VALUES ('USER_ID', 'användarens@email.se', 'employee');
```

## Testa invite-funktionen

1. **Skicka en test-inbjudan:**
   - Använd en email som du har tillgång till
   - Bjud in användaren via Dashboard

2. **Kontrollera email:**
   - Kolla spam-mappen om mailet inte kommer
   - Klicka på länken i mailet

3. **Sätt lösenord:**
   - Användaren ska få en sida där de kan sätta lösenord
   - Efter att lösenord är satt, logga in

4. **Verifiera login:**
   - Användaren ska kunna logga in med email och lösenord
   - Deras roll ska vara korrekt

## Felsökning

### Mailet kommer inte fram

- **Kolla spam-mappen**
- **Kontrollera SMTP-inställningar** (Authentication > Settings > SMTP Settings)
- **Kontrollera email template** (Authentication > Email Templates)
- **Testa med en annan email-provider**

### "Invalid or expired token"

- **Kontrollera Site URL** - Ska vara `/admin` eller din fullständiga URL med `/admin`
- **Kontrollera Redirect URLs** - Måste innehålla `/admin` och `/admin/*`
- **Kontrollera att användaren klickar på länken inom 24 timmar** (standard timeout)
- **Kontrollera att token inte redan används** - Varje token kan bara användas en gång

### "Redirect URL mismatch"

- **Se till att Redirect URLs matchar exakt** - `/admin` måste vara inkluderat
- **Kontrollera att du använder rätt URL i invite-formuläret** - Om det finns ett "Redirect to"-fält, sätt det till `/admin`
- **Site URL ska peka på admin-sidan** - `https://din-domän.se/admin` eller `http://localhost:5173/admin`

### Användaren kan inte logga in efter att de accepterat inbjudan

- **Kontrollera att posten finns i admin_users:**
  ```sql
  SELECT * FROM admin_users WHERE email = 'användarens@email.se';
  ```
- **Om den inte finns, skapa den manuellt** (se Metod 2 ovan)
- **Kontrollera att trigger finns** (se Problem 5 ovan)

### Användaren har fel roll

- **Uppdatera rollen:**
  ```sql
  UPDATE admin_users 
  SET role = 'admin' 
  WHERE email = 'användarens@email.se';
  ```

## Ytterligare konfiguration

### Aktivera email confirmation (Rekommenderat för produktion)

1. Gå till Authentication > Settings
2. Aktivera "Enable email confirmations"
3. Detta kräver att användare bekräftar sin email innan de kan logga in

### Anpassa email templates

1. Gå till Authentication > Email Templates
2. Välj den template du vill anpassa
3. Använd variabler:
   - `{{ .Email }}` - Användarens email
   - `{{ .Token }}` - Verifierings-token
   - `{{ .SiteURL }}` - Din site URL
   - `{{ .RedirectTo }}` - Redirect URL

### Begränsa antal inbjudningar

Supabase har inga inbyggda begränsningar, men du kan:
- Hålla koll manuellt
- Skapa en custom policy för att begränsa vem som kan bjuda in

## Säkerhetsrekommendationer

1. **Använd starka lösenord** - Minimum 12 tecken, kombinera bokstäver, siffror och specialtecken
2. **Aktivera MFA** (Multi-Factor Authentication) för admin-användare:
   - Authentication > Settings > Multi-factor Authentication
3. **Begränsa invite-rättigheter** - Endast admins ska kunna bjuda in
4. **Regelbundna granskningar** - Gå igenom användarlistan regelbundet
5. **Använd HTTPS** - Se till att din applikation endast används över HTTPS i produktion

