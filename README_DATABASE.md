# Databas Migrering - Supabase

All data från admin-sidan sparas nu i Supabase istället för localStorage!

## ✅ Vad är klart

- ✅ **Supabase client** installerad och konfigurerad
- ✅ **Database schema** skapat (`supabase-schema.sql`)
- ✅ **Database helper-funktioner** för alla CRUD-operationer
- ✅ **AdminPage uppdaterad** att använda databas
- ✅ **Automatisk fallback** till localStorage om Supabase inte är konfigurerad

## 📋 Nästa steg

### 1. Skapa Supabase-konto och projekt
Se `SUPABASE_SETUP.md` för detaljerade instruktioner.

### 2. Sätt upp miljövariabler

**Lokal utveckling:**
Skapa `.env.local`:
```env
VITE_SUPABASE_URL=https://ditt-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=din-anon-key
```

**Netlify produktion:**
Lägg till i Netlify → Site settings → Environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 3. Kör SQL-schemat
Kopiera innehållet i `supabase-schema.sql` och kör det i Supabase SQL Editor.

## 🔄 Data migrering

Systemet fungerar automatiskt även utan databas (använder localStorage). 

När Supabase är konfigurerad:
- All ny data sparas automatiskt i databasen
- Data från localStorage används som fallback om databasen inte finns
- Du kan manuellt migrera gamla data genom att lägga till dem igen i admin-panelen

## 📁 Filer

- `supabase-schema.sql` - Databas schema
- `src/lib/supabase.ts` - Supabase client setup
- `src/lib/database.ts` - Alla database operations
- `SUPABASE_SETUP.md` - Detaljerad setup guide

## ✨ Funktioner

- ✅ **Dogs** - Sparas i `dogs` tabellen
- ✅ **Boarding Records** - Sparas i `boarding_records` tabellen  
- ✅ **Planning History** - Sparas i `planning_history` tabellen
- ✅ **Automatisk backup** till localStorage
- ✅ **Error handling** med fallback

## 🎉 Klart!

När Supabase är konfigurerad så kommer allt automatiskt att fungera!

