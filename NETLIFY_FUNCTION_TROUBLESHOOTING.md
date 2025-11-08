# Netlify Functions Setup Guide

## Problem: "Server configuration error" eller 500 Internal Server Error

Om du får detta fel när du försöker skapa en anställd, kontrollera följande:

## 1. Kontrollera Miljövariabler i Netlify

Gå till Netlify Dashboard → Din Site → **Site settings** → **Environment variables** och kontrollera att följande är satta:

- `SUPABASE_URL` - Din Supabase Project URL (t.ex. `https://xxxxx.supabase.co`)
- `SUPABASE_ANON_KEY` - Din Supabase anon public key
- `SUPABASE_SERVICE_ROLE_KEY` - Din Supabase service_role key (VARNING: Håll den hemlig!)

### Hitta dina Supabase-nycklar:

1. Öppna Supabase Dashboard
2. Gå till **Settings** → **API**
3. Kopiera:
   - **Project URL** → Använd som `SUPABASE_URL`
   - **anon public** key → Använd som `SUPABASE_ANON_KEY`
   - **service_role** key → Använd som `SUPABASE_SERVICE_ROLE_KEY` (denna är dold, klicka på "Reveal" för att se den)

## 2. Re-deploya efter att ha lagt till variabler

Efter att ha lagt till eller ändrat miljövariabler måste du re-deploya:

1. Gå till **Deploys** i Netlify Dashboard
2. Klicka på **Trigger deploy** → **Deploy site**
3. Vänta tills deployen är klar

## 3. Kontrollera Netlify Function Logs

För att se detaljerade felmeddelanden:

1. Gå till Netlify Dashboard → Din Site → **Functions**
2. Klicka på `create-staff-user`
3. Klicka på **Logs** för att se felmeddelanden

## 4. Verifiera att @supabase/supabase-js är installerat

Kontrollera att `@supabase/supabase-js` finns i `package.json` dependencies. Om den saknas:

```bash
npm install @supabase/supabase-js
```

## 5. Testa lokalt (valfritt)

För att testa funktionen lokalt:

```bash
npm install -g netlify-cli
netlify dev
```

Detta startar en lokal server där du kan testa funktionen.

## Vanliga problem och lösningar

### Problem: "Missing environment variables"
**Lösning:** Kontrollera att alla tre miljövariablerna är satta i Netlify Dashboard och att du har re-deployat efter att ha lagt till dem.

### Problem: "Invalid or expired session"
**Lösning:** Logga ut och logga in igen i admin-panelen för att få en ny session token.

### Problem: "Only admin users can create staff accounts"
**Lösning:** Kontrollera att din användare har rollen "admin" i `admin_users`-tabellen i Supabase.

### Problem: 500 Internal Server Error utan detaljer
**Lösning:** 
1. Kontrollera Netlify Function logs (se steg 3 ovan)
2. Kontrollera att alla miljövariabler är korrekt konfigurerade
3. Kontrollera att `@supabase/supabase-js` är installerat

## Ytterligare hjälp

Om problemet kvarstår efter att ha följt dessa steg, kontrollera:
- Netlify Function logs för detaljerade felmeddelanden
- Supabase Dashboard → Logs för att se om det finns fel från Supabase-sidan
- Browser Console (F12) för att se detaljerade felmeddelanden från frontend

