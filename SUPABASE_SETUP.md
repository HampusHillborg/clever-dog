# Supabase Setup Guide for Clever Dog Admin

Detta guide visar hur du sätter upp Supabase (gratis databas) för Clever Dog admin-panelen.

## Steg 1: Skapa Supabase-konto

1. Gå till [supabase.com](https://supabase.com)
2. Klicka på "Start your project" eller "Sign Up"
3. Skapa ett konto (använd GitHub för snabbare registrering)
4. Skapa ett nytt projekt:
   - Namn: `clever-dog` (eller valfritt)
   - Database Password: Välj ett starkt lösenord (spara detta!)
   - Region: Välj närmast dig (t.ex. `West EU` för Sverige)
   - Plan: **Free** (gratis tier)

## Steg 2: Skapa databas-tabeller

1. I Supabase dashboard, gå till "SQL Editor" (vänstermenyn)
2. Öppna filen `supabase-schema.sql` från projektet
3. Kopiera hela SQL-koden
4. Klistra in den i SQL Editor
5. Klicka på "Run" (eller Ctrl+Enter)

Detta skapar tre tabeller:
- `dogs` - Alla hundar
- `boarding_records` - Hundpensionat historik
- `planning_history` - Planeringskalender

## Steg 3: Hämta API-nycklar

1. Gå till "Settings" → "API" (vänstermenyn)
2. Hitta dessa värden:
   - **Project URL** (t.ex. `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon public** key (lång sträng under "Project API keys")

## Steg 4: Konfigurera miljövariabler

### För lokal utveckling:

1. Skapa fil `.env.local` i projektets root (samma nivå som `package.json`)
2. Lägg till:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=din-anon-key-här
```

3. Starta om utvecklingsservern (`npm run dev`)

### För produktion (Netlify):

1. Gå till ditt Netlify dashboard
2. Välj ditt projekt
3. Gå till "Site settings" → "Environment variables"
4. Lägg till:
   - Key: `VITE_SUPABASE_URL`, Value: din Project URL
   - Key: `VITE_SUPABASE_ANON_KEY`, Value: din anon key
5. Re-deploya siten

## Steg 5: Migrera befintlig data (valfritt)

Om du redan har data i localStorage som du vill migrera:

1. Öppna admin-sidan i webbläsaren
2. Öppna Developer Tools (F12)
3. I Console, kör detta script:

```javascript
// Hämta data från localStorage
const dogs = JSON.parse(localStorage.getItem('cleverDogs') || '[]');
const boarding = JSON.parse(localStorage.getItem('cleverBoarding') || '[]');
const planning = JSON.parse(localStorage.getItem('cleverPlanningHistory') || '[]');

console.log('Dogs:', dogs.length);
console.log('Boarding:', boarding.length);
console.log('Planning:', planning.length);

// Kopiera dessa värden och använd Supabase dashboard för att importera,
// eller skriv ett migration script
```

4. Du kan också manuellt importera via Supabase Table Editor eller använda SQL INSERT-statements.

## Verifiera att det fungerar

1. Öppna admin-sidan
2. Lägg till en ny hund
3. Kontrollera i Supabase Dashboard → Table Editor → `dogs` att hunden syns där

## Fallback till localStorage

Om Supabase inte är konfigurerad eller går ner, kommer systemet automatiskt att använda localStorage som fallback. Din app fungerar även utan databas!

## Säkerhet

- **Anon Key** är safe att använda i frontend (den har Row Level Security aktiverat)
- För produktion, överväg att skapa en service role key och använda den via Netlify Functions för extra säkerhet
- RLS-policies kan justeras i Supabase dashboard → Authentication → Policies

## Support

Om du stöter på problem:
1. Kontrollera att miljövariablerna är korrekt satta
2. Kontrollera Supabase dashboard för fel i "Logs"
3. Öppna browser console för fel-meddelanden

## Gratis Tier Begränsningar

Supabase Free tier inkluderar:
- ✅ 500 MB databas
- ✅ 2 GB bandbredd/månad
- ✅ 500 MB filstorage
- ✅ Obegränsade API-anrop

Detta är mer än tillräckligt för en hunddagis admin-panel!

