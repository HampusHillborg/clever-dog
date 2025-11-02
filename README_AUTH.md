# Authentication Setup Guide

Detta dokument beskriver hur du sätter upp autentisering för CleverDog Admin Panel.

## Steg 1: Kör SQL-scriptet i Supabase

1. Öppna Supabase Dashboard
2. Gå till SQL Editor
3. Kör filen `supabase-schema-auth.sql`
   - Detta skapar `admin_users`-tabellen
   - Sätter upp automatiska triggers för att skapa användarposter
   - Konfigurerar Row Level Security (RLS)

## Steg 2: Skapa första admin-användaren

### Alternativ A: Via Supabase Dashboard

1. Gå till Authentication > Users i Supabase Dashboard
2. Klicka på "Add user" eller "Invite user"
3. Ange en e-postadress och lösenord
4. Efter att användaren är skapad, uppdatera rollen i `admin_users`-tabellen:

```sql
UPDATE admin_users 
SET role = 'admin' 
WHERE email = 'din@epost.se';
```

### Alternativ B: Via SQL

```sql
-- Först skapa användaren via Supabase Auth (via dashboard eller API)
-- Sedan uppdatera rollen:
UPDATE admin_users 
SET role = 'admin' 
WHERE email = 'din@epost.se';
```

## Steg 3: Skapa fler användare

### För anställda:

1. Gå till Authentication > Users i Supabase Dashboard
2. Lägg till användare med e-post och lösenord
3. De får automatiskt rollen 'employee' (standard)

### För att ändra roll:

```sql
-- Gör en användare till admin:
UPDATE admin_users 
SET role = 'admin' 
WHERE email = 'anstalld@epost.se';

-- Eller tillbaka till anställd:
UPDATE admin_users 
SET role = 'employee' 
WHERE email = 'admin@epost.se';
```

## Steg 4: Konfigurera miljövariabler

Kontrollera att dina miljövariabler är satta:

```
VITE_SUPABASE_URL=din-supabase-url
VITE_SUPABASE_ANON_KEY=din-anon-key
```

Dessa hittar du i Supabase Dashboard under Settings > API.

## Säkerhetsfunktioner

### Row Level Security (RLS)

- Användare kan endast se sin egen data i `admin_users`
- Autentiserade användare kan läsa alla användardata (för admin-panelens funktionalitet)

### Automatisk rollhantering

- Nya användare får automatiskt rollen 'employee' när de registreras
- Admin-rollen måste sättas manuellt via SQL eller av en befintlig admin

## Development Mode

I development (localhost) om Supabase inte är konfigurerad:
- Systemet faller tillbaka på auto-login
- E-post som innehåller "employee" eller "anstalld" → anställd-roll
- Annars → admin-roll

## Användning

### Logga in

1. Ange din e-postadress
2. Ange ditt lösenord
3. Klicka "Logga in"

### Roller

- **Admin**: Full tillgång till allt (kontrakt, statistik, inställningar, hundar)
- **Anställd**: Begränsad tillgång (ser hundar, kan planera, kalender, pensionat, snabbstatistik)

## Felsökning

### "Autentisering är inte konfigurerad"
- Kontrollera att `VITE_SUPABASE_URL` och `VITE_SUPABASE_ANON_KEY` är satta

### "Ogiltigt e-postadress eller lösenord"
- Kontrollera att användaren finns i Supabase Auth
- Kontrollera att lösenordet är korrekt
- Kontrollera att `admin_users`-tabellen har en post för användaren

### Användaren har fel roll
- Uppdatera rollen i `admin_users`-tabellen via SQL

## Säkerhetsrekommendationer

1. **Använd starka lösenord**: Minimum 8 tecken, kombinera bokstäver, siffror och specialtecken
2. **Begränsa admin-roller**: Endast de som behöver full tillgång ska ha admin-roll
3. **Regelbundna granskningar**: Gå igenom användarlistan regelbundet
4. **HTTPS**: Se till att din applikation endast används över HTTPS i produktion

