# Kund- & Adminapp UX v2 — Design Spec

**Datum:** 2026-05-18
**Status:** Utkast — godkänd design, uppdaterad efter WIP-inventering 2026-05-18 (multi-owner-fixar + greeting-bugg)
**Ägare:** Hampus Hillborg
**Föregående spec:** [`2026-05-13-customer-portal-design.md`](./2026-05-13-customer-portal-design.md) (v1, levererad)

## 0. Inventering — WIP som redan är delvis byggt

När specen skrevs fanns oincheckad WIP som bygger delar av Tema 1. Innan vi börjar implementera ska denna kod committas eller integreras i tema-arbetet, inte dubbleras:

**Nya filer (oincheckade):**
- `src/components/customer/CustomerHeader.tsx` — sticky-header med kundens förnamn + initialer-avatar + logga-ut-knapp
- `src/components/customer/DogPills.tsx` — horisontell pill-rad för multi-hund-väljaren (visas bara om kund har 2+ hundar)

**Modifierade filer (oincheckade):**
- `src/pages/CustomerDashboardPage.tsx` — krymt till en redirect till `/kund/hund/:firstDogId`, visar bara empty-state om kunden saknar hundar
- `src/pages/CustomerDogPage.tsx` — använder CustomerHeader + DogPills istället för gammal DogSwitcher; hämtar `customerName` via `getCustomerForUser()` och propsar in
- `src/pages/AdminMobilePage.tsx` — ny "Förfrågningar"-flik (gated till admin/platschef) med röd badge-räknare
- `src/components/admin/TodayAttendanceTab.tsx` — row-omdesign: action-knappar (rapport, kamera) flyttade till en rad under hund-namn istället för bredvid

**Detta innebär att Tema 1 är ca 40% förbyggt redan.** Spec-sektionerna nedan markerar vad som är gjort vs vad som återstår.

## 0.1 Akut bugg: greeting på Hem-fliken

`src/components/customer/HomeFeedTab.tsx:99` säger `Hej {dog.name}!` — det är hunden som hälsas, inte kunden. Ska vara `Hej {customerFirstName}!`.

**Fix:** Propsa ner `customerName` (eller bara förnamnet) från `CustomerDogPage.tsx:48` till `HomeFeedTab`. CustomerHeader gör redan denna split med `firstNameOf(name)` — extrahera helpern och återanvänd.

Detta är en 5-minuters quick win och bör committas direkt (eller som första PR i Tema 1).

---

## 1. Syfte

Polera och rensa kundportalen + adminappen så att de blir *extremt enkla* att använda — både för slutkund och för personal som jobbar i appen dagligen. Ingen ny funktionalitet i denna iteration; målet är att minska friktion, eliminera designinkonsistenser och omorganisera information som idag är gömd eller spridd.

Specen är paketerad som **Foundation + 4 teman** (Approach C i brainstorm-sessionen 2026-05-18). Varje tema är självständigt levererbart efter Foundation, så implementation kan ske i ordning utan stora beroenden.

## 2. Scope

### In scope
- **Greeting-fix** (sektion 0.1) — Hej-strängen ska säga kundens namn, inte hundens
- **Foundation** — låsa knappstil, statusfärger, sheet/modal-regel, empty state-mall, save-knapp-beteende, tap-target-regel
- **Tema 0.5 — Multi-owner fungerar end-to-end** — bookings + messages + push-notiser fungerar för co-owners, admin ser alla ägare per hund
- **Tema 1 — Profil-fliken** rensad: bara hund-relaterad info; Kontrakt / Inställningar / Personal / Rapport-historik flyttas ut
- **Tema 1b — "Idag jobbar"-rad** på Hem-fliken, hämtad från `staff_schedules`
- **Tema 1c — Personalkort utan titlar** (Ägare/Platschef/Personal-etiketter bort på kundsidan)
- **Tema 2 — Bokningswizard**: en ingång istället för tre; exakt pris istället för "ungefärligt"
- **Tema 3 — Meddelanden 2.0**: read-receipts, datumgruppering, ren sender-tydlighet
- **Tema 4 — Adminappens "Idag"-vy**: optimistic UI, filtrering, batch-actions, samma dagsrapport till flera hundar

### Out of scope (för denna iteration)
- Typing indicator i meddelanden (kräver Realtime, lämnas till senare)
- Bilagor i meddelanden
- Helt nya features (fakturasystem, hälsotidslinje, kameralive) — separat brainstorm vid senare tillfälle
- Översättning av kundportalen till engelska
- Borttagning av kvarvarande Malmö-CHECK-constraints i DB

### Funktionalitet som MÅSTE fortsätta fungera (regressions att undvika)
- Inbjudningsflödet `auth.admin.inviteUserByEmail` → `/login/accept-invite`
- Befintliga bokningar (scheduled, extra, cancelled, boarding, single_day) i `bookings`-tabellen — wizarden skriver till samma tabell, ändrar inte schemat
- Push-notifikationer (FCM + APNs) via `send-notification` edge function
- Pull-to-refresh på alla flikar
- Native kamera-picker för hundprofilbilder (Capacitor)
- Admins befintliga vyer på desktop (`AdminPage.tsx`) — denna spec rör främst kundappen + `AdminMobilePage.tsx`
- Daily report-modellen (humör/mat/energi/bajs/note) — vi ändrar UI runt den, inte datamodellen
- Vaccinations-statuslogiken (`expired` / `expiring` / `ok` / `missing`)

## 3. Foundation (Steg 0)

### 3.1 Designprinciper
- En primär åtgärd per skärm/sektion. Sekundära åtgärder är diskreta.
- Tomma tillstånd är *tysta* (visa inget) om det inte ser trasigt ut; annars en kort empty-state med en CTA.
- Allt klickbart är minst 44×44px tap-target.
- Mobil får alltid bottom sheets, desktop får centrerade modaler — samma komponent.
- Sparningar är alltid synliga: spinner under sparning, checkmark efteråt. Aldrig tysta saves.

### 3.2 Nya delade komponenter

```
src/lib/
  uiTokens.ts          # Knapp-, status-, padding-tokens
src/components/shared/
  Sheet.tsx            # Bottom sheet (mobil) / centrerad modal (desktop), drag-handle
  EmptyState.tsx       # Standardiserad tom-vy med ikon + rubrik + CTA
  SaveButton.tsx       # idle → "Sparar..." → checkmark (1.2s) → idle
  Toast.tsx            # Återanvänd om finns; annars dela från NotificationToast
```

### 3.3 Token-definitioner

**Knappstilar (exakt 3):**
```ts
// uiTokens.ts
export const BTN = {
  primary: 'bg-primary text-white font-semibold py-3 px-5 rounded-xl shadow-card active:scale-[0.98] transition',
  secondary: 'bg-white text-dark border border-gray-200 font-semibold py-3 px-5 rounded-xl active:scale-[0.98] transition',
  ghost: 'text-primary font-medium py-2 px-3 rounded-lg active:bg-orange-50 transition',
} as const;
```

**Statusfärger (exakt 4):**
```ts
export const STATUS = {
  confirmed: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },  // scheduled + extra slås ihop
  pending:   { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  warning:   { bg: 'bg-red-50', text: 'text-red-800', dot: 'bg-red-500', border: 'border-red-200' },
} as const;
```

Konsekvens: i `BookingCalendar.tsx` slås `STATUS_STYLE.scheduled` (grön) och `STATUS_STYLE.extra` (emerald) ihop till bara `confirmed` (grön). `boarding` får sin egen badge ovanpå (t.ex. en liten 🏖️-ikon i hörnet av cellen) men cellen färgas grön som vanlig bekräftad bokning. Eliminerar grön-vs-smaragd-förvirringen på mobil.

### 3.4 Filer som ska migreras till foundation
- `BookingCalendar.tsx:55–63` (STATUS_STYLE)
- `DailyReportModal.tsx:196–212` (knappstilar)
- `BookingRequestModal.tsx:76–78` (sheet-stil)
- `AdminMobilePage.tsx:59–64` (tab-stilar — granskas men ändras inte tvunget)
- `DogInfoTab.tsx:150–156` + `:260–314` (Spara-knappar)

### 3.5 Test
- Visuell smoke: öppna varje skärm som rör vid någon foundation-komponent, jämför före/efter — inga regressions.
- `npm run build` ska passera utan TS-errors.

## 3.6 Tema 0.5 — Multi-owner fungerar end-to-end

### 3.6.1 Bakgrund — nuläget (2026-05-18)

DB-schemat (`customer_dogs`, M:N via `primary key (customer_id, dog_id)`) tillåter att flera kunder är kopplade till samma hund. Men implementeringen är ojämn:

| Yta | Status | Anledning |
|---|---|---|
| Lista hundar | ✅ Funkar | `getMyDogs` filtrerar via `customer_dogs`-länken |
| Hund-info / hälsa / vacciner | ✅ Funkar | RLS filtrerar via subquery på `customer_dogs` |
| Daglig rapport, album | ✅ Funkar | Samma RLS-mönster |
| **Bokningar** | ❌ Brutet | RLS-policyn `customer_id = current_customer_id()` (migration `20260513_002_customer_portal_rls.sql:56,66,70`) — bara den kund som *skapade* bokningen ser den. Co-owner ser inte partnerns bokningar i sin kalender |
| **Meddelanden** | ❌ Brutet | RLS: `customer_id = current_customer_id()` (rad 104, 109, 116) — varje kunds konversation är privat. Co-owner ser inte partnerns chat |
| **Push-notiser** | ❌ Brutet | `supabase/functions/send-notification/index.ts:193,269` slår på `booking.customer_id` resp. `msg.customer_id` — bara en kunds device-tokens hämtas |
| Admin: visa alla ägare per hund | ❌ Saknas | `AdminPage.tsx:1564` använder `.limit(1).maybeSingle()` — bara första ägaren visas |
| Admin UI: lägga flera ägare per hund | ⚠️ Funkar tekniskt | Bara via "redigera kund A → kryssa hund X" + "redigera kund B → kryssa hund X". Ingen översikt över co-owners |

**Konsekvens:** Mamma och pappa båda inbjudna till samma hund → ser hunden, kan läsa rapporter — men kan inte se varandras bokningar eller chat-konversationer. Notiser går bara till en av dem.

### 3.6.2 Mål

En hund med två (eller fler) co-owners ska bete sig som om båda är "samma användare" mot hundens timeline: båda ser samma bokningar, samma chat, båda får notiser.

### 3.6.3 Datamodell-beslut: behåll `customer_id` på bookings + messages

Vi *behåller* `customer_id` på `bookings` och `messages` som "vem initierade raden" (för audit/visning av avsändare), men ändrar **RLS** så att läs-/skrivåtkomst baseras på `dog_id`-länken istället för `customer_id`.

```sql
-- ny helper för att hitta alla customer_ids som är kopplade till en hund
create or replace function public.dog_co_owners(p_dog_id uuid)
returns setof uuid
language sql stable security definer
set search_path = public, pg_temp
as $$
  select customer_id from public.customer_dogs where dog_id = p_dog_id;
$$;
revoke execute on function public.dog_co_owners(uuid) from anon;
grant execute on function public.dog_co_owners(uuid) to authenticated;

-- och: en boolean-helper "ser jag denna hund?"
create or replace function public.customer_sees_dog(p_dog_id uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.customer_dogs
    where dog_id = p_dog_id
      and customer_id = public.current_customer_id()
  );
$$;
revoke execute on function public.customer_sees_dog(uuid) from anon;
grant execute on function public.customer_sees_dog(uuid) to authenticated;
```

**Ny RLS för bookings:**
```sql
drop policy if exists "customers read own bookings" on public.bookings;
create policy "co-owners read bookings" on public.bookings
  for select using (public.customer_sees_dog(dog_id) or public.is_admin_user());

drop policy if exists "customers insert own bookings" on public.bookings;
create policy "co-owners insert bookings" on public.bookings
  for insert with check (
    public.customer_sees_dog(dog_id)
    and customer_id = public.current_customer_id() -- vi sätter alltid initiatör
  );

drop policy if exists "customers update own bookings" on public.bookings;
create policy "co-owners update bookings" on public.bookings
  for update using (public.customer_sees_dog(dog_id) or public.is_admin_user());
```

**Ny RLS för messages:** samma mönster — `dog_id`-baserad åtkomst. Detta kräver att alla meddelanden har `dog_id` satt (idag är det `references dogs(id) on delete set null` — kan vara null för "allmänna" konversationer). Beslut: i v2 *kräver* vi `dog_id` på alla nya meddelanden för att RLS ska fungera. Befintliga rader med `dog_id IS NULL` (commit 5964453) hanteras med en separat fall-back-policy:

```sql
drop policy if exists "customers read own messages" on public.messages;
create policy "co-owners read messages" on public.messages
  for select using (
    (dog_id is not null and public.customer_sees_dog(dog_id))
    or (dog_id is null and customer_id = public.current_customer_id())  -- legacy
    or public.is_admin_user()
  );

drop policy if exists "customers insert own messages" on public.messages;
create policy "co-owners insert messages" on public.messages
  for insert with check (
    dog_id is not null
    and public.customer_sees_dog(dog_id)
    and customer_id = public.current_customer_id()
    and sender_user_id = auth.uid()
  );
```

(Vi kräver `dog_id is not null` vid INSERT så vi inte skapar nya rader utan koppling. Befintliga null-rader fortsätter funka för läsning.)

### 3.6.4 Push-notiser till alla co-owners

`supabase/functions/send-notification/index.ts` slår på `booking.customer_id` / `msg.customer_id` och hämtar en kunds devices. Ny logik:

För `booking_decision`:
- Hämta `booking.dog_id` → kör `dog_co_owners(dog_id)` → fan-out push till alla co-owners device-tokens

För `staff_message`:
- Hämta `msg.dog_id` → kör `dog_co_owners(dog_id)` → fan-out till alla co-owners

Edge function-ändringen är begränsad till SQL-query och fan-out-loopen. Datamodellen för `push_subscriptions` behöver inte ändras.

### 3.6.5 Admin: "Vem äger denna hund?"

I `AdminPage.tsx:1559–1569` (hund-redigerings-flöde): ersätt `.limit(1).maybeSingle()` med ett anrop som returnerar ALLA länkade kunder, och visa dem som en lista i hund-redigerarens "Ägare"-sektion.

Ny helper i `database.ts`:
```ts
export const getDogCustomers = async (dogId: string): Promise<Customer[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('customer_dogs')
    .select('customer:customers(*)')
    .eq('dog_id', dogId);
  if (error) { console.error('getDogCustomers', error); return []; }
  return (data ?? []).map((r: any) => r.customer).filter(Boolean) as Customer[];
};
```

UI: i hund-redigeraren, sektion "Ägare", lista alla länkade kunder med möjlighet att lägga till/ta bort. Symmetriskt mot `CustomersTab.tsx`s hund-väljare.

### 3.6.6 Kund-UI: visa avsändare bland co-owners

På chat-sidan (Tema 3) och bokningar-vyn ska kunden se *vilken* co-owner som skickade meddelandet / skapade bokningen, så det inte blir förvirrande.

- Messages: bredvid varje kund-meddelandes bubbla, om sender_user_id != min user_id → visa "(från Pappa)" eller motsvarande små förtydligare.
- Bokningskalendern: vid tap på en bokning → popover visar "Bokad av Pappa 12 maj" om annan co-owner skapade.

### 3.6.7 Filer

**Nya migrations:**
- `supabase/migrations/<timestamp>_co_owners_rls.sql` — `dog_co_owners()`, `customer_sees_dog()`, nya RLS-policies på bookings + messages

**Modifierade:**
- `supabase/functions/send-notification/index.ts` — fan-out till alla co-owners
- `src/lib/database.ts` — ny `getDogCustomers(dogId)`
- `src/components/AdminPage.tsx` — ersätt `limit(1).maybeSingle()`-lookup med multi-owner-vy
- `src/components/customer/MessagesTab.tsx` — visa avsändare när annan co-owner
- `src/components/customer/BookingCalendar.tsx` — visa "Bokad av X" i popover när annan co-owner skapade bokningen

### 3.6.8 Funktionalitet som inte får tappas
- Existerande single-owner-fall (vanligaste) måste fortsätta funka oförändrat — testa med en kund + en hund efter RLS-ändring
- Befintliga meddelanden med `dog_id IS NULL` ska fortsätta läsbara (legacy-fallback i RLS)
- Admin-fall-back: admin ska se ALLT som tidigare via `is_admin_user()`
- Push-notiser till befintliga single-owner-fall ska fortsätta funka oförändrat (fan-out till en kund = samma som idag)

### 3.6.9 Test
- **RLS-smoke**: skapa två test-kunder A + B, länka båda till samma hund. Logga in som A → boka extra dag. Logga in som B → ska se bokningen i sin kalender.
- A skickar meddelande om hunden → B ser konversationen.
- Admin godkänner bokningen → båda A och B får push.
- Skapa hund-only-för-A → logga in som B → ska INTE se den.
- `npm run build` passerar; befintliga single-owner-flöden fungerar.

## 4. Tema 1 — Profil-fliken rensad + omorganiserad

### 4.1 Före (nuläget i `CustomerDogPage.tsx:145–154`)
```
Profil-fliken innehåller:
  ├── DogInfoTab (grundinfo + hälsa-sektion)
  ├── VaccinationsCard
  ├── ContractView
  ├── AccountSettingsCard
  ├── StaffDirectoryCard
  └── DailyReportsHistory
```

### 4.2 Efter
```
Profil-fliken innehåller bara hund-relaterat:
  ├── Hund-header (foto, namn, typ-chip)
  ├── DogInfoTab.GrundinfoKort (egen edit-sheet)
  ├── DogInfoTab.HalsaVetKort (egen edit-sheet — redan separerat sen commit af5e3b7)
  └── VaccinationsCard (eget kort, sticky tills åtgärdat)

Allt annat flyttas:
  - ContractView      → "Mer"-flik i bottom-nav
  - AccountSettingsCard → kugghjuls-ikon i CustomerLayout.tsx-headern
  - StaffDirectoryCard  → "Mer"-flik (full lista) + komprimerad "Idag jobbar"-rad på Hem
  - DailyReportsHistory → "Mer"-flik eller egen sida (med sök + månadsgruppering)
```

### 4.3 Bottom-nav-uppdatering

Idag har kundappen bottom-nav med flikar `Hem · Kalender · Album · Meddelanden · Profil`. Ny version:

```
Hem · Kalender · Album · Meddelanden · Mer
```

"Mer"-fliken är en lista (inte en grid) med:
- 📄 Kontrakt
- 📅 Rapport-historik
- 👥 Personalen (full lista, utan titlar)
- ❓ Visa guide igen (öppnar OnboardingSheet)
- 🚪 Logga ut

Profil-fliken nås från Hem-fliken via tap på hund-kortet, eller från Hem-headerns hund-väljare när flera hundar.

> **Obs — `CustomerDogPage.tsx` har idag fyra flikar inkl. Profil.** Profil blir kvar som flik på *hund-specifika* sidan (per hund), men dess innehåll rensas enligt 4.2. Bottom-navet på `CustomerDashboardPage.tsx` får den nya "Mer"-fliken på app-rotnivå.

### 4.4 Kugghjul → kontoinställningar

`CustomerLayout.tsx` får en ⚙️-ikon i headern (höger). Tap öppnar bottom sheet med `AccountSettingsCard`s innehåll. Ingen separat sida — sheet räcker.

### 4.5 Vaccinations-sticky-beteende

Idag (`HomeFeedTab.tsx:107–109`): vaccinations-varning visas bara om kunden är på Hem-fliken. Lämnar man → borta. Ny logik:

- Varningen visas på Hem som idag (orange/röd beroende på status).
- **Plus:** ett badge på Profil-flikens ikon i bottom-nav (eller på hund-väljaren på Hem) tills vaccinationen är uppdaterad i admin.
- Badge tas bort när admin sätter nytt `expires_on` som inte är `expired` eller `expiring`.

Inget nytt UI för kunden att uppdatera själv — vaccinationsuppdatering är fortfarande admin-only (kunden ser bara status). Det är en regel sedan v1 och vi ändrar den inte här.

### 4.6 Filer
**Modifierade:**
- `src/pages/CustomerDashboardPage.tsx` — ny bottom-nav-flik "Mer"
- `src/pages/CustomerDogPage.tsx` — Profil-flik rensad, lyfter bort 4 kort
- `src/components/customer/CustomerLayout.tsx` — kugghjul-ikon för kontoinställningar
- `src/components/customer/HomeFeedTab.tsx` — badge på navigationsindikator när vaccin går ut (om vi inte gör det rent på navet)
- `src/components/customer/StaffDirectoryCard.tsx` — ta bort `roleLabel`-anrop (rad 7–11, 54)

**Nya:**
- `src/components/customer/MoreTab.tsx` — listan i "Mer"-fliken
- `src/components/customer/ReportHistoryPage.tsx` — egen sida för rapporthistorik med sök + månadsgruppering (kan vara en route eller en full-screen sheet — beslut vid implementation)

### 4.7 Funktionalitet att inte tappa
- AccountSettings-flödet (ändra mejl, lösenord, telefon) — flyttas från kort till sheet, exakt samma form-fält och submit-logik.
- ContractView's PDF-nedladdning fortsätter funka, bara öppnas från ny plats.
- StaffDirectoryCard's avatar+namn-visning fortsätter funka, bara utan title-rad och i ny plats.
- DailyReportsHistory-API:t (`getReportHistory` eller motsvarande) återanvänds — bara UI runt det ändras.

### 4.8 Test
- Smoke: ny kund loggar in, ser bara hund-relaterad info i Profil, navigerar till "Mer" → öppnar Kontrakt → ser PDF.
- Kund med utgången vaccination: ser varning på Hem + badge tills admin uppdaterar.
- Tap på kugghjul → AccountSettings-sheet öppnas, kund ändrar telefonnummer → sparas, sheet stängs.

## 5. Tema 1b — "Idag jobbar"-rad på Hem

### 5.1 UI
En diskret rad ovanför `NextDayCard` i `HomeFeedTab.tsx`:

```
👋 Idag jobbar: Anna, Erik, Sara
```

- Liten text (text-xs eller text-sm), grå-svart färg, inget eget kort med padding.
- Tap på raden → öppnar "Mer → Personalen" med full lista.
- **Tomt tillstånd:** om schemat inte är ifyllt för idag eller om inga skift finns → rendera ingenting (raden visas inte alls). Vi vill inte ha "Inget schema lagt"-text som ser trasigt ut när admin glömt.

### 5.2 Datakälla
Befintlig `staff_schedules`-tabell. Vi behöver en RPC eller view som returnerar dagens skift för Staffanstorp.

**Förslag — ny Supabase RPC:**
```sql
create or replace function staff_working_today(loc text default 'staffanstorp')
returns table (name text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select distinct e.name
  from staff_schedules s
  join employees e on e.id = s.employee_id
  where s.date = current_date
    and s.location = loc
    and (s.shift_type is null or s.shift_type != 'absent')
  order by e.name;
$$;
revoke execute on function staff_working_today(text) from anon;
grant execute on function staff_working_today(text) to authenticated;
```

Kallas från `HomeFeedTab.tsx` parallellt med övriga fetches (lägg in i `Promise.all` på rad 66–72).

### 5.3 Filer
- `supabase/migrations/<timestamp>_staff_working_today.sql` — ny migration
- `src/components/customer/HomeFeedTab.tsx` — render `TodayStaffStrip` (intern komponent eller ny fil) ovanför `NextDayCard`

### 5.4 Funktionalitet att inte tappa
- Befintlig `StaffDirectoryCard` (som flyttas till "Mer") fortsätter visa hela personalen. "Idag jobbar"-raden är en *delmängd* av samma data.

### 5.5 Test
- Lägg upp ett schema för idag i admin → kund öppnar Hem → raden visas med rätt namn.
- Inget schema för idag → kund öppnar Hem → raden visas INTE.
- Schema har `shift_type='absent'` på en person → den personen exkluderas.

## 6. Tema 1c — Personalkort utan titlar

`StaffDirectoryCard.tsx:7–11` (`roleLabel`) tas bort från kund-renderingen. Två val:

- **A.** Behåll funktionen i kod, men anropa den inte i kundkortet (rad 54).
- **B.** Ta bort funktionen helt om den inte används någon annanstans.

Grep för `roleLabel` i kodbasen → om StaffDirectoryCard är enda användaren, gör B.

Renderingen blir:
```tsx
<p className="text-sm font-medium truncate">{s.name}</p>
{/* roleLabel-raden tas bort */}
```

### Funktionalitet att inte tappa
- Admin-vyer som visar personalens roller (för internt schema/admin) måste fortsätta visa titlar. Kontrollera att inga delade komponenter används.

## 7. Tema 2 — Bokningswizard

### 7.1 UI-flöde

På `BookingCalendar.tsx` (rad 204–212): ersätt de två separata knapparna ("Begär pensionat" + "Begär enstaka dag") med EN knapp ovanför kalendern:

> **+ Boka ny dag eller pensionat**

Tap → öppnar `BookingWizardSheet` (ny komponent som ersätter `BookingRequestModal.tsx`):

**Steg 1 — "Vad behöver din hund?"**
- 3 kort i bottom sheet:
  - 🐕 **Extra dagisdag** (visas bara för heltid/deltid-hundar; bokar en dag utöver fast schema)
  - 🏖️ **Pensionat** (visas alltid; övernattning, intervall)
  - 📅 **Enstaka dag** (visas bara för hundar utan abonnemang, t.ex. typ `singleDay`)
- Filtrering sker via `dog.type` — heltid ser inte "Enstaka dag", pensionatsabonnemangshundar ser bara pensionat.

**Steg 2 — "Vilka datum?"**
- Kompakt mini-kalender inuti sheet:
  - **Extra dag / Enstaka dag:** tap = en dag, ingen range
  - **Pensionat:** tap startdatum → tap slutdatum → range markeras
- Validering live:
  - Dagiset stängt (closure_dates) → visa "Dagiset är stängt detta datum" i sheet, knapp inaktiv
  - Befintlig bokning samma dag → visa "Du har redan en bokning denna dag"
  - Pensionat överlappar dagis-fast-dagar → tillåts, men info-text "Detta ersätter dina dagis-dagar under perioden"

**Steg 3 — "Bekräfta"**
- Sammanfattning:
  - Hund: [namn]
  - Typ: [Extra dagisdag / Pensionat / Enstaka dag]
  - Datum: [singel / range]
  - **Pris: 350 kr** (exakt, från `prices.ts × antal dagar`)
  - Svarstid: "Direkt bekräftat" (extra dag på heltidsabonnemang) ELLER "Personalen svarar inom 24 timmar" (pensionat / enstaka dag, dvs `status='pending'`)
- Anteckningar (textarea, valfri)
- Knapp: **Skicka** (primary)
- Toast på framgång: "Skickat — vi svarar snart" (eller "Bekräftat!") + haptik (native via Capacitor Haptics, redan inhookat)

### 7.2 Pris-logiken

`src/lib/prices.ts` har redan prismodellen. Ny helper:

```ts
// src/lib/bookingPricing.ts
export function calcBookingPrice(
  type: 'extra' | 'boarding' | 'single_day',
  days: number,
  dogType: DogType,
): number {
  // För extra dag på heltid/deltid: 0 kr (ingår i abonnemang? eller fast extra-pris)
  // För enstaka dag: PRICES.staffanstorp.singleDay
  // För pensionat: PRICES.staffanstorp.boardingPerNight × days
  // (Hampus konfirmerar exakt prismodell vid implementation)
}
```

**Öppen fråga:** är extra-dag gratis (ingår i abonnemang) eller har den ett pris? Beslut innan implementation.

### 7.3 Filer
**Modifierade:**
- `src/components/customer/BookingCalendar.tsx` — en knapp istället för två (rad 204–212)
- `src/components/customer/BookingRequestModal.tsx` — ersätts av wizarden eller bibehålls som intern del av wizarden

**Nya:**
- `src/components/customer/BookingWizardSheet.tsx` — 3-stegs wizard
- `src/lib/bookingPricing.ts` — exakt prisberäkning
- (ev.) `src/components/shared/MiniCalendar.tsx` — om vi inte kan återanvända befintlig kalender

### 7.4 Datamodell
**Inga schemaändringar.** `bookings`-tabellen tar redan emot alla varianter via `booking_type` + `status`. Wizarden skriver:
- Extra dag (heltids-/deltidshund): `booking_type='extra'`, `status='confirmed'`
- Pensionat: `booking_type='boarding'`, `status='pending'`
- Enstaka dag: `booking_type='single_day'`, `status='pending'`

### 7.5 Funktionalitet att inte tappa
- Avboka fast dag — fortsätter via tap på dag → "Avboka" (oförändrat flöde i kalendern)
- Avboka pensionat — fortsätter fungera (commit a080c42 "boarding cancel")
- Admin-godkännandeflödet i `BookingRequestsTab.tsx` — wizarden skriver till samma tabell, så admin-vyn ändras inte
- Push-notiser vid `booking_decision` — strukturen är oförändrad

### 7.6 Test
- Heltidshund: öppna wizard → bara Extra dag + Pensionat visas, inte Enstaka dag
- Boka extra dag → direkt confirmed, kalendern visar grön prick
- Begär pensionat 3 nätter → status=pending, pris visas korrekt, admin ser i Förfrågningar-kön
- Closure-datum: försök boka stängd dag → blockerat med tydlig text
- `npm run build` passerar

## 8. Tema 3 — Meddelanden 2.0

### 8.1 Read-receipts

**DB:**
```sql
alter table messages add column if not exists read_at timestamptz;
```
(`is_read` finns redan från v1; `read_at` lägger till tidsstämpel för "Läst HH:MM"-rendering. Behåll `is_read` för bakåtkompatibilitet — sätt `is_read=true` när `read_at` sätts.)

**Logik:**
- Kund öppnar `MessagesTab` → markera alla staff-meddelanden där `read_at IS NULL` med nuvarande tid
- Admin öppnar `MessagesAdminTab` för en konversation → samma för kundens meddelanden
- Detta ersätter befintlig `is_read`-uppdatering med en utvidgning

**UI på kundsidan (`MessagesTab.tsx`):**
- Under egna meddelandebubblor: liten grå text
  - Ej läst: `✓ Skickat 14:30`
  - Läst: `✓✓ Läst 14:32` (lite mörkare grön/grå)
- Bara på senaste egna meddelandet i varje konversations-svit (inte alla — undvik visuellt brus)

**UI på adminsidan (`MessagesAdminTab.tsx`):**
- Samma princip, under egna staff-bubblor

### 8.2 Datumgruppering

Ersätt timestamps per meddelande med "sticky-headers" mellan dagar:
- `Idag` / `Igår` / `Måndag 12 maj` / `11 maj 2026`
- Tidsstämpel under varje meddelande blir kortare (bara HH:MM) — datum kommer från header

Helper: lägg gruppering i `MessagesTab.tsx` (eller bryt ut till `src/lib/messageGrouping.ts` om återanvänds i admin).

### 8.3 Sender-tydlighet

- Kund: högerställd, orange (`bg-primary text-white`)
- Staff: vänsterställd, vit (`bg-white`)
  - Ovanför första meddelandet i en sammanhängande staff-svit: liten avatar (initialer) + förnamn
  - Inga titlar. Bara namn.
- Använd `BTN`-tokens från foundation för Skicka-knappen.

### 8.4 Tangentbord + scroll

- `keyboardWillShow` (Capacitor) → scroll-to-bottom så senaste meddelandet syns ovanför tangentbordet
- Safe-area-bottom respekteras (idag är input-fältet ev. för nära nedre kanten på iOS — verifiera)

### 8.5 Filer
- `supabase/migrations/<timestamp>_messages_read_at.sql`
- `src/components/customer/MessagesTab.tsx`
- `src/components/admin/MessagesAdminTab.tsx`
- (ev.) `src/lib/messageGrouping.ts`

### 8.6 Funktionalitet att inte tappa
- Push-notiser vid `staff_message` / `customer_message` — oförändrat
- `is_read`-uppdateringar på admin-sidan (`MessagesAdminTab.tsx:69`) — utvidgas men ändras inte i grunden
- Kund-meddelanden med `dog_id IS NULL` (general staff messages) — fix från commit 5964453 ska bevaras

### 8.7 Test
- Kund skickar → "✓ Skickat HH:MM" → admin öppnar → kund ser "✓✓ Läst HH:MM" inom några sekunder vid refresh
- Konversation över flera dagar → datum-headers visas korrekt
- Push-notis tappas på → öppnar rätt konversation (oförändrat)
- Tangentbord öppnas → senaste meddelandet syns

## 9. Tema 4 — Adminappens "Idag"-vy

### 9.1 Optimistic UI

`TodayAttendanceTab.tsx:46–57` — check-in/ut idag väntar på Supabase-svar innan UI uppdateras.

**Ny logik:**
1. Användaren tappar Checka in → lokal state ändras direkt → spinner på just den hunden
2. Supabase-anrop sker i bakgrunden
3. Lyckas → spinner tas bort, små grön checkmark blinkar 1s
4. Misslyckas → rollback + toast "Kunde inte spara — försök igen", behåll lokal state om felet är nätverk (för retry)

### 9.2 Filtrering + sortering

Ovanför listan, kompakt rad:
- **Chips för bokningstyp:** `Alla · Dagis · Extra · Pensionat`
- **Sorteringsmeny (dropdown):** `Namn ▲` (default) · `Senaste ändring ▼` · `Status`

### 9.3 Batch-actions

**Knapp ovanför Pending-sektionen** (synlig när `pending.length >= 3`):
- **"Markera alla väntande som ankomna"** → en batch-update till Supabase
- Optimistic samma princip som 9.1

**Long-press på hund-rad → multi-select mode:**
- Bottom action bar dyker upp: `Checka in (3) · Checka ut (3) · Avbryt`
- Tap på fler rader för att lägga till
- Action bar utför batch-update

Capacitor Haptics: long-press triggar `Haptics.impact({ style: 'medium' })`.

### 9.4 Samma dagsrapport till flera hundar

I `DailyReportModal.tsx` efter spara (rad ~196 där "Spara"-knappen ligger):
- Checkbox: **"Använd samma rapport för andra hundar idag"**
- Om kryssad → öppnar ett följdsteg (i samma modal/sheet): lista över dagens andra hundar med checkboxes
- Submit → en rapport per kryssad hund (samma fält-värden men separat row)

Användningsfall: alla mår bra på en lugn dag, personalen vill inte fylla i samma sak 8 gånger.

### 9.5 Collapsible sektioner

`TodayAttendanceTab.tsx:70–72`: tre sektioner Pending / Här / Gått.

- Default: Pending + Här öppna, Gått stängd
- Användarens collapse-state sparas i localStorage så valet bevaras

### 9.6 Filer
- `src/components/admin/TodayAttendanceTab.tsx`
- `src/components/admin/DailyReportModal.tsx`

### 9.7 Funktionalitet att inte tappa
- Existerande check-in/out-mutation på `dogs`-tabellen (`checked_in_at` / `checked_out_at` eller motsvarande) — vi behåller samma mutation, lägger bara optimistic UI ovanpå
- DailyReportModal's befintliga formulär (humör/mat/energi/bajs/note) — utvidgas inte, multipliceras bara över flera hundar vid behov
- BookingRequestsTab — oförändrad

### 9.8 Test
- 20 hundar i listan → check-in en hund → UI uppdaterar inom 100ms (utan Supabase-svar)
- Stäng wifi → check-in → toast "Kunde inte spara" → rollback
- 5 hundar pending → "Markera alla väntande som ankomna" → alla flyttar till Här direkt
- DailyReportModal: spara med "Använd samma för andra" → 4 rader skapas (en per hund) i DB
- Collapse "Gått"-sektionen → reload → fortfarande stängd

## 10. Implementationsordning

| # | Tema | Storlek | Beroenden |
|---|---|---|---|
| Pre-0 | **Greeting-fix** + commita WIP (CustomerHeader, DogPills, AdminMobilePage Förfrågningar-flik, TodayAttendance row-omdesign) | XS | — |
| 0 | Foundation (tokens, Sheet, SaveButton, EmptyState) | S | Pre-0 committat |
| 0.5 | **Multi-owner-fixar** (RLS, push fan-out, admin co-owner-vy) | M | Foundation |
| 1 | Profil-rensning + Mer-flik + kugghjul + StaffCard utan titlar + "Idag jobbar" | M (delvis förbyggt) | Foundation, 0.5 |
| 4 | Adminappens Idag-vy (optimistic, filter, batch, multi-report) | M | Foundation |
| 2 | Bokningswizard | M | Foundation, 0.5 |
| 3 | Meddelanden 2.0 (read-receipts, gruppering) | S | Foundation, 0.5, DB-migration |

Anledning till ordning:

- **Pre-0** (greeting-fix + commita WIP) först eftersom det är trivialt och rensar oincheckad kod som annars kommer i vägen.
- **Foundation** låser designspråket.
- **Tema 0.5 (Multi-owner)** kommer tidigt eftersom Tema 2 (bokningswizard) och Tema 3 (meddelanden) båda är beroende av att den underliggande datamodellen är multi-owner-säker — bygger vi om bokningsflödet ovanpå brutet RLS får vi göra om det. Pris-prio: hellre fixa RLS innan vi rör boknings-UI.
- **Tema 1** efter (störst kund-värde, mest synlig förändring; redan ~40% byggt i WIP).
- **Tema 4** parallellt eller efter Tema 1 (personalens dagliga arbete, oberoende av kund-UI).
- **Tema 2** efter (bokningar är inte daglig friktion utan veckovis), kräver multi-owner-fix.
- **Tema 3** sist (read-receipts ger inkrementellt värde), kräver multi-owner-fix.

## 11. Testplan — övergripande

För varje tema, kör:
1. **TypeScript-build:** `npm run build` — måste passera
2. **Manuell smoke på web:** vanlig webbläsare, testa golden path + 1 edge case
3. **Manuell smoke på Android:** `npm run app:sync && npm run app:android` (emulator eller device)
4. **iOS:** push till `main` → Codemagic-build → TestFlight → snabb-test på iPhone

Smoke-testflöden per tema är specificerade i 3.5, 4.8, 5.5, 7.6, 8.7, 9.8.

## 12. Öppna frågor

- **Pris på extra-dag:** ingår i abonnemang eller fast pris? Behöver bekräftas innan Tema 2 implementeras.
- **Rapport-historik som egen route vs full-screen sheet:** beslut vid implementation av Tema 1 — beror på hur bottom-nav-strukturen designas.
- **Vaccinations-badge:** på bottom-nav-Profil eller på hund-väljaren på Hem? Beror på UI-test vid implementation.
- **Long-press på admin-listan på iOS:** Capacitor + iOS Safari har historiskt klurigheter med long-press. Verifiera vid implementation, fallback till "Välj flera"-knapp om det krånglar.

## 13. Status

**Designen presenterad 2026-05-18, godkänd ("Kör") av användaren med tillägget "se till så att alla funktionalitet funkar" — fångat i sektion 2 "Funktionalitet som MÅSTE fortsätta fungera" + per-tema-funktionalitetslistor och testplaner.**

**Uppdaterad 2026-05-18:** Efter inventering av oincheckad WIP och verifiering av multi-owner-stöd lades tre saker till:
1. Sektion 0 (WIP-inventering) — flaggar att Tema 1 är ~40% förbyggt och måste committas/integreras före vidare arbete
2. Sektion 0.1 (greeting-fix) — `HomeFeedTab.tsx:99` säger "Hej {dog.name}" istället för kundens namn
3. Sektion 3.6 (Tema 0.5 — Multi-owner) — RLS på bookings + messages filtrerar idag på `customer_id` istället för `dog_id`-koppling, så co-owners ser inte varandras bokningar/chat; push fan-outs är också single-owner. Lades till som blocker före Tema 2 och 3.

Klar för spec-review → implementationsplan via `writing-plans`-skill (sannolikt en plan per tema, börjar med Pre-0 → Foundation → Tema 0.5).
