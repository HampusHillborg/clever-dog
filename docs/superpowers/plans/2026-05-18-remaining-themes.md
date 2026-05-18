# Remaining Themes Implementation Plan (Tema 1 + 4 + 2 + 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development.

**Goal:** Slutföra resterande UX v2-teman från specen: Profil-rensning + Mer-flik + "Idag jobbar" (Tema 1), Adminappens "Idag"-vy (Tema 4), Bokningswizard (Tema 2), Meddelanden 2.0 (Tema 3).

**Spec:** [`docs/superpowers/specs/2026-05-18-customer-admin-ux-v2-design.md`](../specs/2026-05-18-customer-admin-ux-v2-design.md) sektion 4–9.

**Beroenden:** Foundation (uiTokens, Sheet, SaveButton, EmptyState) + Multi-Owner (RLS, push fan-out, attribution) är redan klara på `feat/ux-v2-foundation-multi-owner`-branchen.

**Tech Stack:** React + TypeScript + Tailwind, Vite, Capacitor (iOS/Android), Supabase (Postgres + RLS + Edge Functions on Deno), `react-icons/fa`, befintliga foundation-komponenter från `src/components/shared/`.

**Ordning:** Tema 1 → Tema 4 → Tema 2 → Tema 3 (i sektion-ordning under).

---

## Tema 1: Profil-rensning + Mer-flik + Idag jobbar (5 tasks)

Tre punkter ur specen: profil-fliken ska bara visa hund-relaterat, "Mer"-flik tar över för konto-/kontrakts-/historik-grejer, "Idag jobbar"-rad på Hem, personalkort utan titlar.

### Task 1A: SQL-migration för `staff_working_today` RPC

**Goal:** Lägg till en RPC som returnerar lista av personalnamn för dagens skift på Staffanstorp. Behövs för Hem-rad.

**Files:**
- Create: `supabase/migrations/20260518_003_staff_working_today.sql`

**Acceptance:**
- [ ] `staff_working_today(loc text default 'staffanstorp')` returnerar setof med en `name`-kolumn
- [ ] `security definer`, pinnad search_path, `revoke from anon` / `grant to authenticated`
- [ ] Filtrerar bort `shift_type='absent'` (eller motsvarande "borta"-state om kolumnen heter annorlunda — verifiera schema först)
- [ ] Applicerad via `mcp__supabase__apply_migration`
- [ ] Returnerar 0 rader om inget schema finns för idag (tom array, inget fel)

**Steps:**
1. Verifiera staff_schedules-schemat: `select column_name, data_type from information_schema.columns where table_name='staff_schedules'` via `mcp__supabase__execute_sql`. Justera SQL nedan utifrån faktiska kolumnnamn.
2. Skriv migration. Förslag på SQL (justeras efter schemat):

```sql
create or replace function public.staff_working_today(loc text default 'staffanstorp')
returns table (name text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select distinct e.name
  from public.staff_schedules s
  join public.employees e on e.id = s.employee_id
  where s.date = current_date
    and s.location = loc
    and (s.shift_type is null or s.shift_type <> 'absent')
  order by e.name;
$$;
revoke execute on function public.staff_working_today(text) from anon;
grant execute on function public.staff_working_today(text) to authenticated;
```
3. Applicera via MCP.
4. Verifiera: `select * from staff_working_today('staffanstorp')`.
5. Commit.

### Task 1B: "Idag jobbar"-rad på Hem + StaffCard utan titlar

**Goal:** Visa "👋 Idag jobbar: Anna, Erik, Sara"-rad ovanför NextDayCard. Om inget schema finns för idag → rendera ingenting. Ta bort role-label från StaffDirectoryCard (kunden ska bara se namn, inte titlar).

**Files:**
- Modify: `src/components/customer/HomeFeedTab.tsx` (lägg till strip ovanför NextDayCard)
- Modify: `src/lib/customerApi.ts` (ny `getStaffWorkingToday()`-helper som anropar RPC)
- Modify: `src/components/customer/StaffDirectoryCard.tsx` (ta bort `roleLabel`-anropet, dra in firstNameOf-helpern istället)

**Acceptance:**
- [ ] Helper `getStaffWorkingToday(): Promise<string[]>` anropar `staff_working_today` RPC
- [ ] HomeFeedTab fetchar i samma Promise.all som övriga fetches
- [ ] Visas som diskret rad (text-xs, gray-700), inte ett eget kort
- [ ] Tom array → renderar ingenting (inget tomt-tillstånd-meddelande)
- [ ] StaffDirectoryCard visar bara namn (helst förnamn via firstNameOf), inga "Ägare/Platschef/Personal"-etiketter
- [ ] `npm run build` passerar

**Steps:** standard. Använd `firstNameOf` från Task 0 där det blir tydligare.

### Task 1C: Kugghjul i CustomerHeader → AccountSettings-sheet

**Goal:** Lägg till en gear-knapp i CustomerHeader till höger om logga-ut, som öppnar en bottom-sheet med AccountSettingsCard's innehåll.

**Files:**
- Modify: `src/components/customer/CustomerHeader.tsx` (lägg till gear-knapp + sheet)
- Modify: `src/components/customer/AccountSettingsCard.tsx` (extrahera form-innehåll till en exporterad sub-komponent om det blir renare, annars använd kortet direkt i Sheet)

**Acceptance:**
- [ ] Gear-ikon (FaCog) syns mellan namnet och logga-ut-knappen
- [ ] Klick öppnar `<Sheet>` från `src/components/shared/Sheet.tsx` med titel "Kontoinställningar"
- [ ] AccountSettings-formuläret fungerar identiskt inuti sheet:n
- [ ] Sheet stängs vid Spara eller backdrop-click
- [ ] `npm run build` passerar

### Task 1D: "Mer"-flik i bottom-nav

**Goal:** Lägg till en 5:e flik "Mer" i bottom-navet på CustomerDogPage, med listinnehåll: Kontrakt, Rapport-historik, Personal (full lista), Visa guide igen, Logga ut.

**Files:**
- Create: `src/components/customer/MoreTab.tsx`
- Modify: `src/pages/CustomerDogPage.tsx` (lägg till `'more'` i TabKey + ny TabButton + render block; bottom-nav får 5 flikar istället för 4)
- Existing components reused: `ContractView`, `DailyReportsHistory`, `StaffDirectoryCard`, `OnboardingSheet`

**Acceptance:**
- [ ] Bottom-nav har 5 flikar: Hem, Kalender, Album, Meddelanden, Mer
- [ ] MoreTab visar lista med åtgärder, var och en med ikon + label + chevron
- [ ] Tap "Kontrakt" → öppnar ContractView (i sheet eller egen vy — välj det enklare)
- [ ] Tap "Rapport-historik" → öppnar DailyReportsHistory
- [ ] Tap "Personal" → öppnar StaffDirectoryCard (full lista)
- [ ] Tap "Visa guide igen" → sätter localStorage så att OnboardingSheet visas igen
- [ ] Tap "Logga ut" → samma logout-flöde som befintlig knapp
- [ ] `npm run build` passerar

### Task 1E: Profil-fliken rensad

**Goal:** Ta bort ContractView, AccountSettingsCard, StaffDirectoryCard, DailyReportsHistory från Profil-fliken på CustomerDogPage. Behåll bara DogInfoTab + VaccinationsCard.

**Files:**
- Modify: `src/pages/CustomerDogPage.tsx` (i Profil-fliken-render-blocket)

**Acceptance:**
- [ ] Profil-fliken visar: hund-foto-header, DogInfoTab (grundinfo + hälsa), VaccinationsCard
- [ ] Inga andra kort
- [ ] Inga obrukade imports kvarstår
- [ ] `npm run build` passerar

---

## Tema 4: Adminappens "Idag"-vy (4 tasks)

Optimistic UI, filter, batch-actions, multi-report. Levererar tidsbesparing till personalen direkt.

### Task 4A: Optimistic check-in/out i TodayAttendanceTab

**Goal:** Lokal state-update direkt vid tap, async i bakgrunden, rollback + toast vid fel.

**Files:**
- Modify: `src/components/admin/TodayAttendanceTab.tsx`

**Acceptance:**
- [ ] Tap "Checka in" → hunden flyttar från Pending → Här inom <100ms (UI-update före async-svar)
- [ ] Vid fel: rollback + toast "Kunde inte spara — försök igen"
- [ ] Vid lyckat svar: grön checkmark-animation i 1s
- [ ] Samma för "Checka ut"
- [ ] `npm run build` passerar

### Task 4B: Filter + sortering i TodayAttendanceTab

**Goal:** Chips för bokningstyp (Alla / Dagis / Extra / Pensionat) ovanför listan. Sorteringsmeny (Namn ▲ default / Senaste ändring / Status).

**Files:**
- Modify: `src/components/admin/TodayAttendanceTab.tsx`

**Acceptance:**
- [ ] 4 chips ovanför listan. Aktiv chip har annan färg
- [ ] Filter applicerar mot alla tre sektioner (Pending/Här/Gått)
- [ ] Sortmeny syns som dropdown till höger om filter-chips
- [ ] State sparas i localStorage så valet bevaras mellan sessioner
- [ ] `npm run build` passerar

### Task 4C: Batch-action "Markera alla väntande som ankomna"

**Goal:** Knapp ovanför Pending-sektionen som syns när pending.length >= 3. Klick → batch-update till Supabase + optimistic UI.

**Files:**
- Modify: `src/components/admin/TodayAttendanceTab.tsx`
- Modify: `src/lib/database.ts` (om en batch-checkin-helper inte finns, lägg till en)

**Acceptance:**
- [ ] Knapp syns endast när det finns 3+ pending hundar
- [ ] Klick → alla pending → Här samtidigt med optimistic UI
- [ ] Vid fel: toast + reload
- [ ] Användarens haptik triggar (tapMedium)
- [ ] `npm run build` passerar

### Task 4D: Samma dagsrapport till flera hundar + collapsible sektioner

**Goal:** I DailyReportModal, efter Spara: checkbox "Använd samma rapport för andra hundar idag". Om kryssad → följdsteg med lista över dagens andra hundar att applicera rapporten på. Plus: Pending/Här/Gått-sektionerna kan kollapsas, valet sparas i localStorage.

**Files:**
- Modify: `src/components/admin/DailyReportModal.tsx`
- Modify: `src/components/admin/TodayAttendanceTab.tsx` (collapsible-state)
- Modify: `src/lib/database.ts` (om batch-insert av dog_daily_reports inte finns)

**Acceptance:**
- [ ] DailyReportModal har en checkbox "Använd samma rapport för andra hundar idag" under formuläret
- [ ] Om kryssad: ett följdsteg visar lista över dagens andra hundar (med checkbox per hund)
- [ ] Submit skapar en rapport-rad per kryssad hund (samma fält-värden)
- [ ] TodayAttendanceTab har collapsible-knappar (chevron-ikoner) på varje sektion
- [ ] Default: Pending + Här öppna, Gått stängd
- [ ] State sparas i localStorage med nycklarna `admin.today.<section>.collapsed`
- [ ] `npm run build` passerar

---

## Tema 2: Bokningswizard (3 tasks)

En knapp ersätter tre, exakt pris istället för "ungefärligt", tydlig svarstid.

### Task 2A: bookingPricing.ts (exakt pris-helper)

**Goal:** Ren helper som tar `(type, days, dogType)` och returnerar exakt pris från `prices.ts`. Beslut: extra-dag på heltid/deltid räknas som 0 kr (ingår i abonnemang) eller fast pris — verifiera med användaren OM oklart, annars använd PRICES.staffanstorp.extra om finns, annars 0 kr för extra-dag och dokumentera valet.

**Files:**
- Create: `src/lib/bookingPricing.ts`
- Read-only: `src/lib/prices.ts` (för att förstå prismodellen)

**Acceptance:**
- [ ] `calcBookingPrice(type, days, dogType)` exporterad
- [ ] Hanterar 'extra', 'boarding', 'single_day' korrekt mappat mot prices.ts
- [ ] Returnerar nummer i kr (heltal)
- [ ] Edge case: 0 dagar → 0 kr (eller throw — välj det säkraste)
- [ ] `npm run build` passerar

### Task 2B: BookingWizardSheet (3-stegs wizard)

**Goal:** Ny komponent som ersätter `BookingRequestModal`. Tre steg i en Sheet: typ → datum → bekräfta. Filtrera tillgängliga typer per `dog.type`.

**Files:**
- Create: `src/components/customer/BookingWizardSheet.tsx`
- Foundation reused: `Sheet`, `SaveButton`, `BTN` tokens

**Acceptance:**
- [ ] Sheet öppnas vid prop `open=true`, stänger vid backdrop/ESC
- [ ] Steg 1: 3 typ-kort (Extra dagisdag / Pensionat / Enstaka dag), filtreras per dog.type så irrelevanta typer döljs (heltid ser inte "Enstaka dag"; pensionatsabonnemang ser bara pensionat)
- [ ] Steg 2: mini-kalender. Extra/Enstaka: tap en dag. Pensionat: tap start, tap slut.
- [ ] Validering: stängd dag (closure_dates) → blockerad med text; befintlig bokning samma dag → blockerad
- [ ] Steg 3: sammanfattning (hund/typ/datum) + exakt pris från `calcBookingPrice` + svarstid ("Direkt bekräftat" eller "Personalen svarar inom 24 h") + valfri anteckning + Skicka-knapp via SaveButton
- [ ] Skicka → skriver till `bookings` med rätt `booking_type` och `status` (extra=confirmed för heltid/deltid; boarding+single_day=pending)
- [ ] Stänger sheet + toast vid framgång
- [ ] `npm run build` passerar

### Task 2C: Byt ut två knappar mot en i BookingCalendar

**Goal:** Ersätt "Begär pensionat" + "Begär enstaka dag"-knapparna ovanför kalendern med en enda "Boka ny dag eller pensionat"-knapp som öppnar BookingWizardSheet.

**Files:**
- Modify: `src/components/customer/BookingCalendar.tsx`
- Remove/Replace: `src/components/customer/BookingRequestModal.tsx` (kan tas bort om inget annat importerar den, eller behållas som intern komponent som wizarden använder)

**Acceptance:**
- [ ] En primary-knapp ovanför kalendern: "Boka ny dag eller pensionat"
- [ ] Tap öppnar BookingWizardSheet (Task 2B)
- [ ] Befintliga avboka-flöden (klick på fast dag → avboka) fungerar oförändrat
- [ ] Inga obrukade imports
- [ ] `npm run build` passerar

---

## Tema 3: Meddelanden 2.0 (4 tasks)

Read-receipts, datumgruppering, sender-tydlighet. Tangentbordet/scroll polish.

### Task 3A: DB-migration för `read_at` på messages

**Goal:** Lägg till `read_at timestamptz` på messages. Behåll `is_read` för bakåtkompatibilitet — sätt båda när ett meddelande markeras läst.

**Files:**
- Create: `supabase/migrations/20260518_004_messages_read_at.sql`

**Acceptance:**
- [ ] Migration lägger till nullable `read_at timestamptz` på `public.messages`
- [ ] Befintliga rader får `read_at = updated_at` om `is_read=true`, annars NULL (för historik-visning)
- [ ] Applicerad via MCP
- [ ] Verifiera kolumnen finns

### Task 3B: Read-receipts logik i markMessagesRead

**Goal:** När ett meddelande markeras läst sätt både `is_read=true` och `read_at=now()`. Båda kund- och admin-sidan.

**Files:**
- Modify: `src/lib/customerApi.ts` (uppdatera `markMessagesRead`)
- Modify motsvarande staff-helper om den finns separat (`src/lib/database.ts` eller MessagesAdminTab inline)

**Acceptance:**
- [ ] Uppdaterar både `is_read` och `read_at`
- [ ] Backward compatible (gamla klienter som bara läser `is_read` funkar fortfarande)
- [ ] `npm run build` passerar

### Task 3C: Read-receipt UI + datumgruppering i MessagesTab

**Goal:** Under eget senaste meddelande visa "✓ Skickat HH:MM" eller "✓✓ Läst HH:MM". Datum-stickers ("Idag" / "Igår" / "Måndag 12 maj") mellan dag-byten.

**Files:**
- Modify: `src/components/customer/MessagesTab.tsx`
- (ev.) Create: `src/lib/messageGrouping.ts` om logiken blir komplex nog att bryta ut

**Acceptance:**
- [ ] Under SENASTE eget meddelande i en sammanhängande svit: liten grå text "✓ Skickat 14:30" eller "✓✓ Läst 14:32"
- [ ] Inte under alla meddelanden (undvik visuellt brus) — bara senaste
- [ ] Mellan datum-byten: en gråtext-rubrik "Idag" / "Igår" / "Måndag 12 maj" / "11 maj 2026"
- [ ] Tidsstämpel per meddelande visar bara HH:MM (datum kommer från sticker)
- [ ] `npm run build` passerar

### Task 3D: Read-receipts + datumgruppering i MessagesAdminTab

**Goal:** Samma som 3C men för admin-sidan av chatten.

**Files:**
- Modify: `src/components/admin/MessagesAdminTab.tsx`

**Acceptance:**
- [ ] Under SENASTE eget staff-meddelande i en svit: read-receipt
- [ ] Datum-stickers fungerar identiskt
- [ ] `npm run build` passerar

---

## Implementationsordning + total

16 tasks. Föreslagen ordning:

1. Task 1A → 1B → 1C → 1D → 1E (Tema 1, 5 tasks)
2. Task 4A → 4B → 4C → 4D (Tema 4, 4 tasks)
3. Task 2A → 2B → 2C (Tema 2, 3 tasks)
4. Task 3A → 3B → 3C → 3D (Tema 3, 4 tasks)

Tema 1 först eftersom det är mest synligt för kunden (bättre navigation). Tema 4 nästa för personalens vardag. Tema 2 sedan (booking) och Tema 3 sist (chat polish).

## Test-strategi

För varje task:
- TS-build: `npm run build`
- Manuell smoke på key flow (varierar per task)
- Inga formella enhetstester (projektet har inget ramverk)

Efter alla 16 tasks: gemensam `npm run app:sync` + APK-build + install + sanity-test på emulator. Slut-commit + ev. PR till main.
