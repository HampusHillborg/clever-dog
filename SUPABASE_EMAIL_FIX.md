# Fix: "Error sending invite email" i Supabase

När du får felet "Error sending invite email" är det vanligtvis ett problem med email-konfigurationen.

## Snabb fix - Steg 1: Kontrollera Email Settings

1. Gå till **Authentication > Settings** i Supabase Dashboard
2. Scrolla ner till **"Email"** sektionen
3. Kontrollera följande:

### Email Confirmation
- **"Enable email confirmations"** - Detta ska vara **PÅ** för invite att fungera korrekt

### Email Rate Limiting
- Kontrollera att du inte har något rate limit som blockerar

### Email Provider
- Se till att antingen:
  - **Custom SMTP är AV** (använder Supabase's standard SMTP)
  - ELLER **Custom SMTP är PÅ** och korrekt konfigurerad

## Steg 2: Kontrollera SMTP-inställningar

### Alternativ A: Använd Supabase's standard SMTP (Enklast)

1. Gå till **Authentication > Settings > SMTP Settings**
2. Se till att **"Enable Custom SMTP"** är **AV**
3. Supabase kommer då att använda sin egen SMTP-server (begränsad, men fungerar)

**Begränsningar:**
- Max 3 emails per timme med gratis plan
- Max 3 emails per timme per användare
- Begränsad funktionalitet

### Alternativ B: Konfigurera egen SMTP (Rekommenderas för produktion)

1. Gå till **Authentication > Settings > SMTP Settings**
2. Aktivera **"Enable Custom SMTP"**
3. Fyll i dina SMTP-inställningar:

**För Gmail:**
```
Host: smtp.gmail.com
Port: 587 (för TLS) eller 465 (för SSL)
User: din-email@gmail.com
Password: Din app-specifika lösenord (inte vanligt lösenord!)
Sender email: din-email@gmail.com
Sender name: CleverDog Admin
```

**Viktigt för Gmail:**
- Du måste skapa ett "App Password" - inte ditt vanliga lösenord
- Gå till Google Account > Security > 2-Step Verification > App passwords
- Generera ett app-lösenord och använd det här

**För andra providers:**
- SendGrid, Mailgun, AWS SES, etc. - använd deras SMTP-inställningar

## Steg 3: Kontrollera Email Templates

1. Gå till **Authentication > Email Templates**
2. Välj **"Invite user"** template
3. Kontrollera att:
   - Format är valt (HTML eller Plain Text)
   - Template innehåller `{{ .ConfirmationURL }}` eller `{{ .Token }}`
   - Subject är satt

**Minimal fungerande template:**

**Subject:** Du har blivit inbjuden till CleverDog Admin

**Body (Plain Text):**
```
Hej!

Du har blivit inbjuden att skapa ett konto på CleverDog Admin.

Klicka på länken nedan:
{{ .ConfirmationURL }}

Med vänliga hälsningar,
CleverDog Team
```

## Steg 4: Kontrollera Auth Logs

1. Gå till **Authentication > Logs** i Supabase Dashboard
2. Leta efter felmeddelanden relaterade till invite
3. Kolla timestamp för när du försökte skicka invite
4. Felet kommer ofta visa exakt vad som är fel (t.ex. "SMTP connection failed")

## Steg 5: Testa med manuell användare först

Om invite fortfarande inte fungerar, testa att skapa en användare manuellt:

1. Gå till **Authentication > Users**
2. Klicka **"Add user"** (inte Invite)
3. Ange email och lösenord
4. Välj **"Auto Confirm User"**
5. Klicka "Create user"

Om detta fungerar, är problemet specifikt med invite-funktionen och kan vara:
- Email template-problem
- SMTP-rate limiting
- Site URL/Redirect URL-problem

## Vanliga fel och lösningar

### "SMTP connection failed"
- Kontrollera SMTP-inställningar (host, port, user, password)
- För Gmail: Använd App Password, inte vanligt lösenord
- Kontrollera att porten är öppen (587 för TLS, 465 för SSL)

### "Email quota exceeded"
- Du har överskridit Supabase's email-begränsning
- Vänta 1 timme eller konfigurera egen SMTP

### "Invalid sender email"
- Kontrollera att "Sender email" i SMTP Settings matchar SMTP User
- För Gmail: Sender email måste vara samma som Gmail-kontot

### "Template validation failed"
- Kontrollera att email template är korrekt formaterad
- Se till att alla variabler (som `{{ .ConfirmationURL }}`) är korrekt skrivna

## Snabb test-checklist

För att snabbt testa om invite fungerar:

1. ✅ **SMTP är konfigurerad** (antingen Supabase's standard eller egen)
2. ✅ **Email confirmation är aktiverad** (Authentication > Settings > Email)
3. ✅ **Site URL är satt** (`https://cleverdog.se/admin`)
4. ✅ **Redirect URL är satt** (`https://cleverdog.se/admin`)
5. ✅ **Email template är korrekt** (använder `{{ .ConfirmationURL }}`)
6. ✅ **Testa med din egen email** först

## Kontakta Supabase Support

Om inget av ovanstående fungerar:
1. Gå till Supabase Dashboard
2. Klicka på "Support" eller öppna ett ticket
3. Inkludera:
   - Ditt projekt-ID
   - Exakt felmeddelande
   - Timestamp när felet inträffade
   - Dina Auth Logs (screenshots)

