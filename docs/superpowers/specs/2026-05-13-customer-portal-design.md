# Kundportal — Design Spec

**Datum:** 2026-05-13
**Status:** Utkast — under intern test
**Ägare:** Hampus Hillborg

---

## 1. Syfte

Bygg en kundportal där hundägare kan logga in, se sin hund, boka dagar (kopplat till sin abonnemangstyp), skicka meddelanden till personalen, ladda ner kontrakt och hantera sin hunds info. Portalen är initialt dold bakom `/login` (ingen länk från publika sidan) under testfas. Samtidigt rensas Malmö-spår ur admin (endast Staffanstorp finns), och admin får statistik/ekonomi-vy samt en kö för bokningsförfrågningar.

## 2. Scope

### In scope
- Inbjudningsbaserad onboarding (admin skapar kund + bjuder in när redo)
- Kunddashboard med hundar (flera per konto), bokningskalender, meddelanden, kontrakt
- Bokningslogik: hybrid (fasta veckodagar + extra-dagar för dagis); pensionat/enstaka dag som godkännandepliktig förfrågan
- Admin-utökningar: kund-CRUD, invite-knapp, förfrågningskö, statistik (förväntad intäkt, antal hundar per typ)
- Borttagning av Malmö från admin och kodbas

### Out of scope (för v1)
- Fakturasystem / Stripe-integration
- Avbokningsspärr / 24h-regler (kan läggas på senare)
- Push-notifikationer eller SMS
- Publik länk till `/login` från landningssidan
- Migration av befintliga `owner`-text → automatiskt kopplade kunder (manuell process)

## 3. Användarflöden

### 3.1 Admin skapar kund + bjuder in
1. Admin → ny flik "Kunder" → "Skapa kund" → fyller email, namn, telefon, adress, kopplar 1+ hundar
2. Kund-record skapas med `invite_status='not_invited'`
3. När admin är redo: klickar "Bjud in" → Supabase Auth `inviteUserByEmail` triggar mejl med magic-link → `invite_status='invited'`
4. Kund klickar länken → landar på `/login/accept-invite?token=…` → sätter lösenord → konto aktivt, `invite_status='accepted'`

### 3.2 Kund loggar in och bokar
1. `/login` → email + lösen → dashboard
2. Dashboard visar lista av hundar (om flera) → klicka hund → hund-detalj med tre flikar: **Info**, **Kalender**, **Meddelanden**
3. **Kalender**-flik: månadsvy. Fasta veckodagar (från `recurring_schedule`) är markerade som "Inbokad". Kunden kan:
   - Klicka en fast dag → toggle "Avboka denna dag" (status: `cancelled`)
   - Klicka en extra dag → toggle "Boka extra dag" (status: `extra`, direkt bekräftad om typen är heltid/deltid)
   - Knapp "Begär pensionat" → modal med datumintervall → skapar `booking` med `status='pending'`, hamnar i admin-kön
   - Knapp "Begär enstaka dag" → samma flöde
4. Inga av/ombok-spärrar i v1

### 3.3 Admin godkänner förfrågan
1. Admin-flik "Förfrågningar" listar alla `bookings` med `status='pending'`
2. Admin klickar Godkänn / Avslå → status sätts → kunden ser uppdaterad status i sin kalender vid nästa load
3. (Email-notis ut till kund: utanför v1, men strukturen finns för det)

### 3.4 Admin ser statistik
1. Ny flik / sektion "Statistik & Ekonomi"
2. Visar förväntad månadsintäkt: SUM av `dog.type` mappad mot pris från `prices.ts`
3. Antal hundar per typ (Heltid / Deltid-3 / Deltid-2 / Pensionat-månad / Enstaka)
4. Beläggningsgrad per veckodag (kommande månaden) — bonus om enkel

## 4. Datamodell

### 4.1 Nya tabeller (Supabase)

```sql
-- Kunder (1:1 mot Supabase auth.users när konto är aktiverat)
create table customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null unique,
  email text not null unique,
  name text not null,
  phone text,
  address text,
  city text,
  personal_number text,
  invite_status text not null default 'not_invited'
    check (invite_status in ('not_invited','invited','accepted','disabled')),
  invited_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Koppling kund <-> hund (många-till-många, en kund kan ha flera hundar)
create table customer_dogs (
  customer_id uuid references customers(id) on delete cascade,
  dog_id uuid references dogs(id) on delete cascade,
  is_primary_owner boolean default true,
  created_at timestamptz default now(),
  primary key (customer_id, dog_id)
);

-- Bokningar (enskilda dagar och pensionatsperioder)
create table bookings (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references dogs(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  start_date date not null,
  end_date date not null, -- = start_date för dagis-bokningar; intervall för pensionat
  booking_type text not null
    check (booking_type in ('scheduled','extra','cancelled','boarding','single_day')),
  status text not null default 'confirmed'
    check (status in ('confirmed','pending','rejected','cancelled')),
  notes text,
  admin_response text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Fasta veckodagar för dagis-hundar
create table recurring_schedule (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references dogs(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0=mån, 6=sön
  active boolean default true,
  created_at timestamptz default now(),
  unique (dog_id, weekday)
);

-- Meddelanden mellan kund och personal
create table messages (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  dog_id uuid references dogs(id) on delete set null,
  sender_role text not null check (sender_role in ('customer','staff')),
  sender_user_id uuid references auth.users(id),
  body text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Hund-foto storage: använd Supabase Storage bucket "dog-photos",
-- spara filnamn på dogs.photo_url (ny kolumn)
alter table dogs add column photo_url text;
alter table dogs add column customer_notes text; -- Kundens egna anteckningar
```

### 4.2 Ändringar i befintliga tabeller
- `dogs`: lägg till `photo_url` (text) och `customer_notes` (text)
- `dogs.locations`: kvar tekniskt, men inga `'malmo'`-värden ska skapas framåt; ev. backfill-migrering att rensa
- Befintliga `dogs.email`, `dogs.owner`, `dogs.phone` används för matching vid invite

### 4.3 Row-Level Security (RLS)

**Kritiskt** — kunder får bara se sina egna hundar/bokningar/meddelanden:

```sql
alter table customers enable row level security;
alter table customer_dogs enable row level security;
alter table bookings enable row level security;
alter table recurring_schedule enable row level security;
alter table messages enable row level security;

-- Kund kan läsa/uppdatera bara sin egen rad
create policy "customers can read own row" on customers
  for select using (auth.uid() = auth_user_id);
create policy "customers can update own row" on customers
  for update using (auth.uid() = auth_user_id);

-- Kund kan se sina kopplade hundar
create policy "customers can read own dog links" on customer_dogs
  for select using (
    customer_id in (select id from customers where auth_user_id = auth.uid())
  );

-- Kund kan se sina hundars bokningar och skapa nya
create policy "customers can read own bookings" on bookings
  for select using (
    customer_id in (select id from customers where auth_user_id = auth.uid())
  );
create policy "customers can insert own bookings" on bookings
  for insert with check (
    customer_id in (select id from customers where auth_user_id = auth.uid())
  );
create policy "customers can update own bookings" on bookings
  for update using (
    customer_id in (select id from customers where auth_user_id = auth.uid())
      and status != 'rejected'
  );

-- Liknande för messages och recurring_schedule
-- Admin/employee bypass: via auth.jwt() ->> 'role' eller via admin_users-koll
create policy "admins can do everything on bookings" on bookings
  for all using (
    exists (select 1 from admin_users where id = auth.uid())
  );
-- (motsvarande policies för övriga tabeller)
```

Admin/employee fortsätter att använda service-role för icke-kund-operationer där det redan görs.

## 5. Arkitektur — frontkod

### 5.1 Filstruktur (nya filer)

```
src/
  pages/
    LoginPage.tsx              # /login — email+lösen, "Glömt lösen", "Acceptera invite"
    CustomerDashboardPage.tsx  # /kund — landar här efter login
    CustomerDogPage.tsx        # /kund/hund/:id — flikar Info/Kalender/Meddelanden
  components/
    customer/
      CustomerLayout.tsx       # Header med kundens namn + logga ut
      DogCard.tsx              # Hund i dashboard-listan
      DogInfoTab.tsx           # Visa+redigera grundinfo, foto, anteckningar
      BookingCalendar.tsx      # Månadsvy med fasta+extra dagar
      BookingRequestModal.tsx  # Pensionat / enstaka dag
      MessagesTab.tsx          # Chat-liknande UI
      ContractView.tsx         # Visa kontrakt + ladda ner PDF
      ProtectedCustomerRoute.tsx  # Auth-gate
  lib/
    customerApi.ts             # Alla supabase-anrop för kundsidan
    bookingHelpers.ts          # Generera fasta dagar för månad, kollidera bokningar
```

### 5.2 Routes (App.tsx)

```tsx
<Route path="/login" element={<LoginPage />} />
<Route path="/login/accept-invite" element={<AcceptInvitePage />} />
<Route path="/kund" element={<ProtectedCustomerRoute><CustomerDashboardPage /></ProtectedCustomerRoute>} />
<Route path="/kund/hund/:id" element={<ProtectedCustomerRoute><CustomerDogPage /></ProtectedCustomerRoute>} />
```

`ProtectedCustomerRoute` kollar via `getCurrentUser()`/`onAuthStateChange` att användaren är inloggad OCH har en koppling i `customers`-tabellen (inte admin-roll); annars redirect till `/login`.

**Ingen länk till `/login` från `StaffanstorpPage`, `Navbar` eller `Footer`** i v1.

### 5.3 Admin-utökningar (i `AdminPage.tsx`)

Existerande admin är en stor fil. Vi bryter ut nya features till underkomponenter snarare än att lägga mer i en monolit:

```
src/components/admin/
  CustomersTab.tsx           # Listning, skapa, redigera, "Bjud in"-knapp
  BookingRequestsTab.tsx     # Pending bookings — godkänn/avslå
  StatsTab.tsx               # Förväntad intäkt, antal per typ
```

`AdminPage.tsx` får nya flikar i sin befintliga navigering.

## 6. Auth-flöde — detaljer

### 6.1 Invite (admin → kund)
- Admin trycker "Bjud in" på en kund → frontend anropar Supabase edge function eller direkt admin-API `auth.admin.inviteUserByEmail(email, { redirectTo: '/login/accept-invite' })`
- Eftersom anon-key inte får göra admin-anrop: vi behöver antingen
  - **(a)** En Supabase Edge Function som körs med service_role och tar emot invite-request från admin-frontend (med admin-token), eller
  - **(b)** Använda `signInWithOtp` som "magic link" istället för formell invite
- **Rekommendation: (a)** — formell invite ger renaste UX och spårar `invite_status` korrekt

### 6.2 Skydd mot fel roll
- Vid login: kolla om user finns i `admin_users` ELLER `customers` — visa olika vyer baserat på vilken
- Admin som loggar in på `/login` → redirect till `/admin`
- Kund som råkar gå till `/admin` → 404 / redirect till `/kund`

## 7. UI / UX

Återanvänd Tailwind-klasser och stilsetting som matchar existerande Staffanstorp-design (jordnära färger, rundade hörn, framer-motion-fades).

**Dashboard:**
- Hälsning "Hej, {namn}!" + lista av hund-kort med foto + namn + typ + nästa inbokade dag
- Klick → hund-detaljvy

**Bokningskalender:**
- Stor månadsvy. Färgkodning:
  - **Grön**: bekräftad inbokning (fast eller extra)
  - **Grå**: avbokad
  - **Gul**: pending förfrågan
  - **Röd ram**: avslagen
- Klick på dag → liten popover med åtgärder
- "Begär pensionat / enstaka dag" som tydliga knappar ovanför kalendern

**Meddelanden:**
- Klassisk chat-vy: senaste först eller äldsta först (välj senast); textfält i botten
- Personalens svar visas vänsterställt, kundens högerställt

## 8. Borttagning av Malmö

### Filer att ta bort
- `src/pages/MalmoPage.tsx`
- Hela `src/components/malmo/` (MalmoNavbar, MalmoHero, MalmoAbout, MalmoBookingForm, MalmoPricing, MalmoTeam)
- Eventuella malmö-bilder under `src/assets/` om de bara används där

### Filer att uppdatera
- `src/App.tsx`: ta bort den utkommenterade malmö-routen helt
- `src/components/AdminPage.tsx`: ta bort malmö-filter, location-toggle blir bara Staffanstorp (eller helt bort)
- `src/components/LocationSelector.tsx`: ta bort eller förenkla
- `src/lib/supabase.ts`: `locations`-typ från `'malmo' | 'staffanstorp'` → bara `'staffanstorp'`
- `src/lib/prices.ts`: ta bort malmö-priser om de finns
- `src/lib/database.ts`: rensa malmö-grenar i logik
- i18n-strängar: leta `malmo` och rensa

### Databas
- **Inga data tas bort i denna v1**. Befintliga `boarding_records.location = 'malmo'` och hundars `locations` med malmö lämnas orörda (historiska data). Men inga *nya* rader skapas med malmö.
- Optionell migrering senare: `update dogs set locations = array_remove(locations, 'malmo')`

## 9. Felhantering & validering

- **Invite-flöde**: dubbletter (samma email) → frontend visar tydligt fel, ingen extra rad skapas
- **Bokningskonflikter**: en hund kan inte ha överlappande pensionatsbokning + dagis samma datum → backend (eller frontend före insert) validerar
- **RLS-misslyckande**: alla supabase-fel surfar i UI som vänligt felmeddelande (inte stack trace)
- **Foto-uploads**: max 5 MB, jpg/png/webp, klient-side validering före upload

## 10. Testning

- **Manuell smoke-test**: skapa kund i admin → bjud in → acceptera → logga in → boka extra dag → begär pensionat → admin godkänner → kund ser bekräftad
- **RLS-test**: skapa två kunder, försök läsa annans data via direkt API-anrop → ska ge 403
- **Borttagning av Malmö**: bygg-steg ska passera (`npm run build`), inga import-fel
- Inga formella enhetstester i v1 (projektet har inget test-ramverk idag); lägg till om vi vill senare

## 11. Implementations-ordning (preliminär)

1. **Migrering**: skapa nya Supabase-tabeller + RLS-policies + storage bucket
2. **Backend-helpers**: edge function för invite + `customerApi.ts`
3. **Auth-flöde**: LoginPage, AcceptInvitePage, ProtectedCustomerRoute
4. **Kunddashboard + hundvy + info-flik**
5. **Bokningskalender + recurring_schedule + extra/avboka**
6. **Förfrågningsflöde**: pensionat/enstaka dag på kundsidan + admin-kö
7. **Meddelanden**: kundvy + admin-vy
8. **Kontrakt-vy** (återanvänd befintlig PDF-generator)
9. **Admin-stats + förväntad intäkt**
10. **Malmö-rensning** (kan göras parallellt när som helst)

## 12. Öppna frågor / framtida iterationer

- Av/ombok-regler (tidsgräns, max-antal extra dagar)
- Bekräftelsemejl vid bokning
- Push-notifikationer
- Kundens fakturahistorik (kräver fakturasystem först)
- Mobil-app vs PWA
- Backfill av befintliga kunder från `dogs.owner` (manuell idag)

---

## 13. Status

**Designen godkänd av användaren 2026-05-13 efter brainstorming-session. Klar för implementationsplan.**
