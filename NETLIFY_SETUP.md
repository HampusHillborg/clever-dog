# Netlify Setup för Supabase

Detta guide visar exakt hur du sätter upp Supabase på Netlify.

## ✅ Fungerar automatiskt på Netlify

Supabase client fungerar direkt i frontend och kräver ingen server-side kod. Det kommer att fungera perfekt på Netlify!

## 🔧 Steg för Steg Setup

### 1. Skapa Supabase-projekt
Följ instruktionerna i `SUPABASE_SETUP.md` steg 1-2 för att:
- Skapa Supabase-konto och projekt
- Kör SQL-schemat (`supabase-schema.sql`)

### 2. Hämta API-nycklar från Supabase

1. Gå till ditt Supabase-projekt dashboard
2. Klicka på "Settings" → "API" (i vänstermenyn)
3. Hitta dessa två värden:
   - **Project URL** (t.ex. `https://abcdefghijklmnop.supabase.co`)
   - **anon public** key (lång sträng under "Project API keys" → "anon public")

### 3. Lägg till miljövariabler i Netlify

**I Netlify Dashboard:**

1. Gå till ditt Netlify-projekt
2. Klicka på **"Site settings"** (inte Build settings)
3. I vänstermenyn, klicka på **"Environment variables"**
4. Klicka på **"Add a variable"**
5. Lägg till dessa två variabler:

   **Variabel 1:**
   - Key: `VITE_SUPABASE_URL`
   - Value: Din Project URL (t.ex. `https://abcdefghijklmnop.supabase.co`)
   - Scopes: Välj "All scopes" (Production, Deploy previews, Branch deploys)
   
   **Variabel 2:**
   - Key: `VITE_SUPABASE_ANON_KEY`
   - Value: Din anon public key (lång sträng)
   - Scopes: Välj "All scopes"

6. Klicka på **"Save"** för varje variabel

### 4. Re-deploya på Netlify

Efter att ha lagt till miljövariablerna:

1. Gå tillbaka till **"Deploys"** i Netlify
2. Klicka på **"Trigger deploy"** → **"Deploy site"**
3. Vänta tills deployen är klar

### 5. Verifiera att det fungerar

1. Öppna din live Netlify-site
2. Gå till admin-sidan
3. Försök lägga till en hund
4. Kontrollera i Supabase Dashboard → Table Editor → `dogs` att hunden syns där

## 🔍 Troubleshooting

### Problem: Data sparas inte i databasen

**Kontrollera:**
1. ✅ Är miljövariablerna satta korrekt? (gå till Netlify → Site settings → Environment variables)
2. ✅ Stämmer URL:en? (ska börja med `https://` och sluta med `.supabase.co`)
3. ✅ Är anon key korrekt? (kontrollera att du kopierade hela nyckeln)
4. ✅ Har du kört SQL-schemat? (Supabase → SQL Editor)

### Problem: Console-fel om "Supabase URL or Anon Key is missing"

Detta betyder att miljövariablerna inte är satta eller inte är tillgängliga.

**Lösning:**
1. Kontrollera att variablerna heter exakt `VITE_SUPABASE_URL` och `VITE_SUPABASE_ANON_KEY`
2. Kontrollera att de är satta för rätt scope (välj "All scopes")
3. Re-deploya efter att ha lagt till variablerna

### Problem: CORS-fel i browser console

Om du ser CORS-fel:
1. Gå till Supabase Dashboard → Settings → API
2. Under "Project URL", lägg till din Netlify URL till "Additional allowed origins" (valfritt, men kan hjälpa)

### Fallback fungerar

Om Supabase inte är konfigurerad, kommer systemet automatiskt att använda localStorage som fallback. Inga data går förlorade!

## 📝 Viktiga punkter

- ✅ `VITE_` prefix är viktigt - Vite läser bara miljövariabler som börjar med `VITE_`
- ✅ Använd **Site settings** → **Environment variables**, inte Build settings
- ✅ Re-deploya efter att ha lagt till variabler
- ✅ Anon key är säker att använda i frontend (RLS skyddar data)

## 🎉 Klart!

När du har satt upp miljövariablerna och re-deployat kommer allt att fungera automatiskt. Data kommer att sparas i Supabase istället för localStorage.

## 💡 Extra tips

### Lokal utveckling
Skapa en `.env.local` fil i projektets root:
```env
VITE_SUPABASE_URL=https://ditt-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=din-anon-key
```

### Testa innan deploy
Testa lokalt först med `npm run dev` och `.env.local` för att se att allt fungerar innan du deployar.

