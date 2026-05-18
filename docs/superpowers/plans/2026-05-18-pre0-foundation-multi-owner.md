# Pre-0 + Foundation + Multi-Owner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix greeting bug, commit aligned WIP, establish shared design-system primitives (knappar, statusfärger, Sheet, SaveButton, EmptyState), and make multi-owner work end-to-end across bookings, messages, push, and admin.

**Architecture:** Three layers landed in order: (1) Pre-0 är en quick win + WIP-städning så foundationen byggs på rent läge. (2) Foundation introducerar gemensamma React-komponenter och TypeScript-tokens som senare teman lutar mot. (3) Multi-Owner flyttar RLS-åtkomst från `customer_id`-matchning till `dog_id`-baserad `customer_sees_dog()`-kontroll, fan-outar push till alla co-owners, och uppdaterar admin-vyn att visa alla ägare per hund.

**Tech Stack:** React + TypeScript + Tailwind, Vite, Capacitor (iOS/Android), Supabase (Postgres + RLS + Edge Functions on Deno), FCM + APNs via custom edge function. Inga test-ramverk finns — verifiering sker via `npm run build`, manuella smoke-tests och direkt SQL-kontroll mot Supabase.

**Spec:** [`docs/superpowers/specs/2026-05-18-customer-admin-ux-v2-design.md`](../specs/2026-05-18-customer-admin-ux-v2-design.md) sektion 0–3 (Pre-0, Foundation, Tema 0.5).

---

## Filstruktur — vad denna plan rör

```
src/
  lib/
    uiTokens.ts                    # NY — knapp- och statusfärgs-tokens
    database.ts                    # M — getDogCustomers() helper
    customerApi.ts                 # M — exportera firstNameOf
  components/
    shared/
      Sheet.tsx                    # NY — gemensam bottom-sheet/modal
      SaveButton.tsx               # NY — 3-state spara-knapp
      EmptyState.tsx               # NY — tom-vy-mall
    customer/
      HomeFeedTab.tsx              # M — greeting-fix (rad 99)
      CustomerHeader.tsx           # M — exportera firstNameOf, importera från lib
      MessagesTab.tsx              # M — visa co-owner-attribution
      BookingCalendar.tsx          # M — visa "Bokad av X" för co-owner-bokningar
    AdminPage.tsx                  # M — multi-owner-vy i hund-redigerare
  pages/
    CustomerDogPage.tsx            # M — propsa customerName till HomeFeedTab

supabase/
  migrations/
    20260518_001_co_owners_rls.sql # NY — dog_co_owners(), customer_sees_dog(), nya RLS
  functions/
    send-notification/index.ts     # M — fan-out push till alla co-owners
```

Tester körs som `npm run build` (TS-check) + manuella smoke-flöden där så anges. Inga nya enhetstest-filer eftersom projektet saknar test-ramverk.

---

## Task 0: Greeting-fix + commit WIP

**Goal:** Fix `Hej {dog.name}` → `Hej {customerFirstName}` och commita befintlig oincheckad WIP (CustomerHeader, DogPills, AdminMobile Förfrågningar-flik, TodayAttendance row-omdesign) som redan är aligned med specens Tema 1.

**Files:**
- Modify: `src/lib/customerApi.ts` (exportera firstNameOf-helper)
- Modify: `src/components/customer/CustomerHeader.tsx` (importera firstNameOf från lib istället för lokal kopia)
- Modify: `src/pages/CustomerDogPage.tsx` (propsa `customerFirstName` till HomeFeedTab)
- Modify: `src/components/customer/HomeFeedTab.tsx:99` (rendera customerName i greeting)
- Befintlig WIP (oincheckad) staged och committad samtidigt:
  - `src/components/customer/CustomerHeader.tsx` (ny)
  - `src/components/customer/DogPills.tsx` (ny)
  - `src/pages/CustomerDashboardPage.tsx` (m)
  - `src/pages/CustomerDogPage.tsx` (m)
  - `src/pages/AdminMobilePage.tsx` (m)
  - `src/components/admin/TodayAttendanceTab.tsx` (m)

**Acceptance Criteria:**
- [ ] HomeFeedTab visar "Hej Hampus!" (eller inloggad kunds förnamn) istället för hundens namn
- [ ] Tom kund-name → "Hej!" (utan namn, ej "Hej !")
- [ ] `firstNameOf()` finns på exakt ett ställe (i `customerApi.ts` eller en delad lib), inte duplicerat
- [ ] `npm run build` passerar utan TS-fel
- [ ] WIP committat i samma commit eller serie commits

**Verify:**
```bash
npm run build
```
→ Förväntat: TS-build passerar, ingen `Cannot find name 'firstNameOf'`-error. Manuellt öppna kundportalen → Hem-fliken visar kundens förnamn.

**Steps:**

- [ ] **Step 1: Lägg `firstNameOf` i `src/lib/customerApi.ts`**

Lägg till nära toppen av filen (efter typ-exporterna, t.ex. efter rad 16):

```ts
// Hämta förnamnet ur en hel namnsträng. Tom input → tom sträng.
export const firstNameOf = (name: string | null | undefined): string => {
  const first = (name ?? '').trim().split(/\s+/)[0];
  return first ?? '';
};
```

- [ ] **Step 2: Använd `firstNameOf` i `CustomerHeader.tsx`**

Ersätt den lokala kopian (rad 11–14 i `src/components/customer/CustomerHeader.tsx`):

```tsx
// OLD (ta bort):
const firstNameOf = (name: string): string => {
  const first = name.trim().split(/\s+/)[0];
  return first ?? '';
};

// NEW (importera istället, läggs överst i filen):
import { firstNameOf } from '../../lib/customerApi';
```

Resten av komponenten är oförändrad; `firstNameOf` används redan på rad 21.

- [ ] **Step 3: Propsa `customerFirstName` från `CustomerDogPage.tsx` till `HomeFeedTab`**

I `src/pages/CustomerDogPage.tsx`: state `customerName` finns redan (rad 48, hämtas via `getCustomerForUser()`). Lägg till import + propsa till HomeFeedTab.

Lägg till import överst:

```tsx
import { firstNameOf } from '../lib/customerApi';
```

Hitta där `<HomeFeedTab>` renderas (sök efter `<HomeFeedTab` i filen). Lägg till `customerFirstName`-prop:

```tsx
<HomeFeedTab
  dog={dog}
  onJumpTo={(t) => setTab(t)}
  customerFirstName={firstNameOf(customerName)}
/>
```

- [ ] **Step 4: Ta emot `customerFirstName` och använd i greeting i `HomeFeedTab.tsx`**

Modifiera komponentens props-typ (rad ~51):

```tsx
export default function HomeFeedTab({ dog, onJumpTo, customerFirstName }: {
  dog: Dog;
  onJumpTo: (tab: 'calendar' | 'album' | 'messages' | 'profile') => void;
  customerFirstName: string;
}) {
```

Ändra greetingen (rad 99):

```tsx
// OLD:
<h1 className="text-2xl font-bold tracking-tight mt-1">
  Hej {dog.name}!
</h1>

// NEW:
<h1 className="text-2xl font-bold tracking-tight mt-1">
  {customerFirstName ? `Hej ${customerFirstName}!` : 'Hej!'}
</h1>
```

- [ ] **Step 5: Verifiera TS-bygget**

Run:
```bash
npm run build
```
Förväntat: build lyckas. Om TS klagar på `customerFirstName` saknas i någon annan användning av `HomeFeedTab`, sök:

```bash
```

Använd `Grep` med pattern `<HomeFeedTab` så ser du alla call sites och kan lägga till proppen.

- [ ] **Step 6: Manuell smoke (web)**

Run:
```bash
npm run dev
```
Öppna `http://localhost:5173/login`, logga in som testkund (eller skapa via admin om saknas). Bekräfta att Hem-fliken säger "Hej {ditt förnamn}!" — inte hundens namn.

- [ ] **Step 7: Commita greeting-fix + befintlig WIP**

```bash
git add src/lib/customerApi.ts src/components/customer/CustomerHeader.tsx src/components/customer/DogPills.tsx src/pages/CustomerDogPage.tsx src/pages/CustomerDashboardPage.tsx src/pages/AdminMobilePage.tsx src/components/admin/TodayAttendanceTab.tsx src/components/customer/HomeFeedTab.tsx

git commit -m "$(cat <<'EOF'
fix: greeting visar kundens namn + commita Tema 1-WIP

HomeFeedTab:99 sa "Hej {dog.name}" — ska vara kundens förnamn.
Lyfter firstNameOf till customerApi.ts så CustomerHeader och nya
HomeFeedTab delar samma helper.

Commitar samtidigt oincheckad WIP som var aligned med UX v2-specen:
- CustomerHeader (sticky header med kundnamn + initialer)
- DogPills (multi-hund-väljare som horisontell pill-rad)
- CustomerDashboardPage krympt till redirect + empty-state
- AdminMobilePage får Förfrågningar-flik med badge
- TodayAttendanceTab row-omdesign (knappar under namn)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 1: Foundation — uiTokens.ts (knapp- och statusfärgs-tokens)

**Goal:** Lås knappstilar (3 typer) och statusfärger (4 typer) på ett ställe, så alla teman senare drar från samma källa.

**Files:**
- Create: `src/lib/uiTokens.ts`

**Acceptance Criteria:**
- [ ] `BTN.primary`, `BTN.secondary`, `BTN.ghost` exporterade som strängar (Tailwind-klasser)
- [ ] `STATUS.confirmed`, `STATUS.pending`, `STATUS.cancelled`, `STATUS.warning` exporterade som objekt med `bg`, `text`, `dot` (och `border` på `warning`)
- [ ] Filen är `as const`-typad så TS-narrowing fungerar
- [ ] `npm run build` passerar

**Verify:**
```bash
npm run build
```
→ Förväntat: passerar. Tokens kan importeras: `import { BTN, STATUS } from '../../lib/uiTokens';`

**Steps:**

- [ ] **Step 1: Skapa filen med tokens**

Skapa `src/lib/uiTokens.ts`:

```ts
// Centrala design-tokens som alla teman drar från.
// Tre knappstilar — använd EXAKT en av dessa per knapp.
// Fyra statusfärger — slå ihop scheduled/extra till "confirmed" så vi inte har
// grön-vs-smaragd-förvirring på mobil.

export const BTN = {
  primary:
    'bg-primary text-white font-semibold py-3 px-5 rounded-xl shadow-card active:scale-[0.98] transition disabled:opacity-50 disabled:active:scale-100',
  secondary:
    'bg-white text-dark border border-gray-200 font-semibold py-3 px-5 rounded-xl active:scale-[0.98] transition disabled:opacity-50',
  ghost:
    'text-primary font-medium py-2 px-3 rounded-lg active:bg-orange-50 transition disabled:opacity-50',
} as const;

export const STATUS = {
  confirmed: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  pending:   { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  warning:   {
    bg: 'bg-red-50',
    text: 'text-red-800',
    dot: 'bg-red-500',
    border: 'border-red-200',
  },
} as const;

export type ButtonKind = keyof typeof BTN;
export type StatusKind = keyof typeof STATUS;
```

- [ ] **Step 2: Verifiera TS-build**

Run:
```bash
npm run build
```
Förväntat: passerar.

- [ ] **Step 3: Commit**

```bash
git add src/lib/uiTokens.ts
git commit -m "feat(foundation): UI-tokens för knappar + statusfärger

3 knappstilar (primary/secondary/ghost), 4 statusfärger
(confirmed/pending/cancelled/warning). Senare teman lutar mot dessa
istället för inline-Tailwind per komponent.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Foundation — Sheet-komponent (bottom-sheet på mobil, modal på desktop)

**Goal:** En gemensam sheet/modal-komponent som ersätter ad-hoc-modaler i BookingRequestModal, DailyReportModal, etc. Mobil-först med drag-handle.

**Files:**
- Create: `src/components/shared/Sheet.tsx`

**Acceptance Criteria:**
- [ ] Visas som bottom-sheet på mobil (rounded-t-3xl, slutar nere vid skärmkanten)
- [ ] Visas som centrerad modal på sm-breakpoint och uppåt (rounded-3xl, max-h-90vh)
- [ ] Stödjer prop `open`, `onClose`, `title?`, `children`
- [ ] Stänger på klick utanför, ESC, eller drag-handle (mobil)
- [ ] Body-scroll låses när öppen
- [ ] `npm run build` passerar

**Verify:**
```bash
npm run build
```
→ Förväntat: passerar. Kan importeras `import Sheet from '../shared/Sheet';`. Manuell smoke kommer i Task 5+ när vi använder den.

**Steps:**

- [ ] **Step 1: Skapa Sheet-komponenten**

Skapa `src/components/shared/Sheet.tsx`:

```tsx
import { useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  // När true: stänger inte vid klick utanför (för formulär med osparad data)
  blockBackdropClose?: boolean;
};

export default function Sheet({ open, onClose, title, children, blockBackdropClose }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={blockBackdropClose ? undefined : onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg sm:w-[92%] rounded-t-3xl sm:rounded-3xl shadow-pop max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag-handle (mobil) — visuell hint, inte interaktiv (klick på backdrop räcker) */}
        <div className="sm:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {title && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-lg">{title}</h2>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full hover:bg-gray-100 text-gray-500 flex items-center justify-center"
              aria-label="Stäng"
            >
              <FaTimes className="text-sm" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: TS-build**

Run:
```bash
npm run build
```
Förväntat: passerar.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/Sheet.tsx
git commit -m "feat(foundation): gemensam Sheet-komponent (mobil bottom-sheet / desktop modal)

Drag-handle på mobil, centrerad modal på sm+, body-scroll-lock,
ESC + backdrop-click för stängning. Ersätter ad-hoc-modaler i
senare teman.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Foundation — SaveButton (3-state spara-knapp)

**Goal:** Knapp som visar `idle → saving → saved`-feedback automatiskt, så alla spara-knappar i appen får konsekvent beteende utan att varje komponent implementerar samma state-maskin.

**Files:**
- Create: `src/components/shared/SaveButton.tsx`

**Acceptance Criteria:**
- [ ] Default-state visar `children` (t.ex. "Spara")
- [ ] Under async-anrop visas spinner + texten "Sparar..."
- [ ] Efter lyckat anrop visas grön checkmark + "Sparat" i 1.2s, sedan tillbaka till idle
- [ ] Vid error visas röd ❌ + "Försök igen" i 2s, sedan tillbaka till idle
- [ ] Disabled när `disabled` prop satt eller under saving-state
- [ ] Stylas via BTN-tokens från Task 1

**Verify:**
```bash
npm run build
```
→ Förväntat: passerar.

**Steps:**

- [ ] **Step 1: Skapa SaveButton**

Skapa `src/components/shared/SaveButton.tsx`:

```tsx
import { useState } from 'react';
import { FaCheck, FaSpinner, FaTimes } from 'react-icons/fa';
import { BTN } from '../../lib/uiTokens';

type State = 'idle' | 'saving' | 'saved' | 'error';

export default function SaveButton({
  onSave,
  children,
  disabled,
  className,
}: {
  onSave: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const [state, setState] = useState<State>('idle');

  const handle = async () => {
    if (state !== 'idle' || disabled) return;
    setState('saving');
    try {
      await onSave();
      setState('saved');
      setTimeout(() => setState('idle'), 1200);
    } catch (e) {
      console.error('SaveButton onSave failed:', e);
      setState('error');
      setTimeout(() => setState('idle'), 2000);
    }
  };

  const content = (() => {
    switch (state) {
      case 'saving':
        return <><FaSpinner className="animate-spin" /> Sparar…</>;
      case 'saved':
        return <><FaCheck /> Sparat</>;
      case 'error':
        return <><FaTimes /> Försök igen</>;
      default:
        return children;
    }
  })();

  return (
    <button
      onClick={handle}
      disabled={disabled || state !== 'idle'}
      className={`${BTN.primary} inline-flex items-center justify-center gap-2 ${className ?? ''}`}
    >
      {content}
    </button>
  );
}
```

- [ ] **Step 2: TS-build**

Run:
```bash
npm run build
```
Förväntat: passerar.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/SaveButton.tsx
git commit -m "feat(foundation): SaveButton med 3-state-feedback

idle → saving (spinner) → saved (checkmark 1.2s) eller error
(röd ❌ 2s). Ersätter manuella state-machines i varje spara-flöde.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Foundation — EmptyState-komponent

**Goal:** Standardiserad tom-vy-mall med ikon, kort rubrik, en mening + en valfri CTA. Slutar med "tomt" som ser trasigt ut.

**Files:**
- Create: `src/components/shared/EmptyState.tsx`

**Acceptance Criteria:**
- [ ] Tar `icon`, `title`, `body`, `cta?` props
- [ ] Renderar centrerat med 44px-ikon ovanför titel
- [ ] CTA renderas som ghost-knapp via BTN-tokens
- [ ] `npm run build` passerar

**Verify:**
```bash
npm run build
```
→ Förväntat: passerar.

**Steps:**

- [ ] **Step 1: Skapa EmptyState**

Skapa `src/components/shared/EmptyState.tsx`:

```tsx
import { BTN } from '../../lib/uiTokens';

export default function EmptyState({
  icon,
  title,
  body,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  cta?: { label: string; onClick: () => void };
}) {
  return (
    <div className="text-center px-6 py-10">
      <div className="w-11 h-11 mx-auto rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center mb-3">
        <span className="text-xl">{icon}</span>
      </div>
      <h3 className="font-semibold text-base mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mx-auto">{body}</p>
      {cta && (
        <button onClick={cta.onClick} className={`${BTN.ghost} mt-4`}>
          {cta.label}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: TS-build**

Run:
```bash
npm run build
```
Förväntat: passerar.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/EmptyState.tsx
git commit -m "feat(foundation): EmptyState-komponent

Standardiserad tom-vy-mall: 44px-ikon, kort rubrik, mening, valfri
ghost-CTA. Senare teman ersätter inline empty-state-divs med denna.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Multi-Owner — SQL-migration för RLS via dog-koppling

**Goal:** Lägg till `dog_co_owners()` och `customer_sees_dog()` SQL-helpers, ersätt bookings + messages RLS-policies så åtkomst går via `dog_id`-länken istället för `customer_id`. Behåll legacy-fallback för meddelanden där `dog_id IS NULL`.

**Files:**
- Create: `supabase/migrations/20260518_001_co_owners_rls.sql`

**Acceptance Criteria:**
- [ ] `dog_co_owners(p_dog_id uuid)` returnerar setof uuid (alla customer_ids länkade till hunden)
- [ ] `customer_sees_dog(p_dog_id uuid)` returnerar boolean (är inloggad kund länkad?)
- [ ] Nya RLS-policies på `bookings` använder `customer_sees_dog(dog_id)` för SELECT/UPDATE och `customer_sees_dog(dog_id) AND customer_id = current_customer_id()` för INSERT
- [ ] Nya RLS-policies på `messages` följer samma mönster med fallback för legacy `dog_id IS NULL`-rader
- [ ] Migrationen är idempotent (`drop policy if exists` före `create policy`)
- [ ] Admin (`is_admin_user()`) behåller full access

**Verify:**
- Kör migrationen via Supabase MCP: `mcp__supabase__apply_migration` med name `co_owners_rls_v2`
- Sedan smoke-SQL (kör via `mcp__supabase__execute_sql`):
```sql
-- Förvänta: 1 om dog X har minst en kund kopplad (byt ut UUID mot riktig)
select count(*) from public.dog_co_owners('<någon-dog-uuid>'::uuid);
```

**Steps:**

- [ ] **Step 1: Skriv migrationen**

Skapa `supabase/migrations/20260518_001_co_owners_rls.sql`:

```sql
-- Multi-owner stöd: åtkomst till bookings/messages går via dog_id-länken,
-- inte via customer_id-matchning. Mamma + pappa båda kopplade till samma
-- hund ser då varandras bokningar och konversationer.

-- 1. Helpers ----------------------------------------------------------------

-- Returnera alla customer_ids länkade till en hund.
create or replace function public.dog_co_owners(p_dog_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select customer_id
  from public.customer_dogs
  where dog_id = p_dog_id;
$$;
revoke execute on function public.dog_co_owners(uuid) from anon;
grant execute on function public.dog_co_owners(uuid) to authenticated;

-- Är inloggad kund (via current_customer_id) länkad till denna hund?
create or replace function public.customer_sees_dog(p_dog_id uuid)
returns boolean
language sql
stable
security definer
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

-- 2. BOOKINGS — ersätt customer_id-baserade policies -------------------------

drop policy if exists "customers read own bookings" on public.bookings;
create policy "co-owners read bookings" on public.bookings
  for select to authenticated
  using (public.customer_sees_dog(dog_id) or public.is_admin_user());

drop policy if exists "customers insert own bookings" on public.bookings;
create policy "co-owners insert bookings" on public.bookings
  for insert to authenticated
  with check (
    public.customer_sees_dog(dog_id)
    and customer_id = public.current_customer_id()
  );

drop policy if exists "customers update own bookings" on public.bookings;
create policy "co-owners update bookings" on public.bookings
  for update to authenticated
  using (
    (public.customer_sees_dog(dog_id) and status in ('confirmed','pending'))
    or public.is_admin_user()
  )
  with check (public.customer_sees_dog(dog_id) or public.is_admin_user());

-- "admins manage bookings" finns redan från 20260513_002 — lämnas orörd.

-- 3. MESSAGES — ersätt customer_id-baserade policies, behåll legacy-fallback --

drop policy if exists "customers read own messages" on public.messages;
create policy "co-owners read messages" on public.messages
  for select to authenticated
  using (
    (dog_id is not null and public.customer_sees_dog(dog_id))
    or (dog_id is null and customer_id = public.current_customer_id())
    or public.is_admin_user()
  );

drop policy if exists "customers insert own messages" on public.messages;
create policy "co-owners insert messages" on public.messages
  for insert to authenticated
  with check (
    dog_id is not null
    and public.customer_sees_dog(dog_id)
    and customer_id = public.current_customer_id()
    and sender_role = 'customer'
    and sender_user_id = auth.uid()
  );

drop policy if exists "customers update read flag" on public.messages;
create policy "co-owners update read flag" on public.messages
  for update to authenticated
  using (
    (dog_id is not null and public.customer_sees_dog(dog_id))
    or (dog_id is null and customer_id = public.current_customer_id())
  )
  with check (
    (dog_id is not null and public.customer_sees_dog(dog_id))
    or (dog_id is null and customer_id = public.current_customer_id())
  );

-- "admins manage messages" finns redan från 20260513_002 — lämnas orörd.
```

- [ ] **Step 2: Applicera migrationen via Supabase MCP**

Använd verktyget `mcp__supabase__apply_migration`:
- `name`: `co_owners_rls_v2`
- `query`: hela SQL:n från Step 1

Förväntat: response `{"success": true}` eller motsvarande.

- [ ] **Step 3: Verifiera helpers fungerar**

Kör via `mcp__supabase__execute_sql`:

```sql
-- Sanity: helpers finns
select proname from pg_proc
where proname in ('dog_co_owners', 'customer_sees_dog');
-- Förvänta: 2 rader
```

Och:

```sql
-- Sanity: nya policies är på plats
select policyname from pg_policies
where tablename in ('bookings', 'messages')
  and policyname like 'co-owners%';
-- Förvänta: 6 rader (3 på bookings, 3 på messages)
```

- [ ] **Step 4: Smoke — befintliga single-owner-fall fungerar**

Logga in som befintlig testkund (eller skapa via admin). Öppna kalendern → ska se befintliga bokningar. Öppna meddelanden → ska se konversationen. Detta verifierar att RLS-ändringen inte bryter single-owner-fall.

- [ ] **Step 5: Smoke — multi-owner-fall fungerar**

Via admin: skapa testkund A och B, koppla båda till samma hund. Logga in som A → boka en extra dag. Logga ut, logga in som B → ska se A:s bokning i kalendern. A skickar meddelande → B ser i sin meddelandeflik.

Om det inte fungerar: kontrollera att hunden faktiskt är länkad till båda via:
```sql
select * from customer_dogs where dog_id = '<dog-uuid>';
-- Förvänta: 2 rader
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260518_001_co_owners_rls.sql
git commit -m "feat(rls): multi-owner-stöd för bookings + messages

Nya helpers: dog_co_owners(uuid), customer_sees_dog(uuid).
RLS på bookings + messages flyttas från customer_id-matchning
till dog_id-baserad customer_sees_dog()-kontroll. Co-owners
(mamma + pappa båda kopplade till samma hund) ser nu varandras
bokningar och konversationer. Legacy-fallback för meddelanden
med dog_id IS NULL behålls.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Multi-Owner — Push fan-out till alla co-owners

**Goal:** `send-notification` edge function ska skicka push till ALLA co-owners när en bokning godkänns/avslås eller staff skriver, inte bara den kund vars id råkar stå på raden.

**Files:**
- Modify: `supabase/functions/send-notification/index.ts`

**Acceptance Criteria:**
- [ ] `booking_decision`-grenen fan-outar push till alla `customer_dogs.customer_id` där `dog_id = booking.dog_id` (deras `auth_user_id`)
- [ ] `staff_message`-grenen fan-outar push till alla co-owners av `msg.dog_id` (med fallback till `msg.customer_id` när `dog_id IS NULL`, för legacy)
- [ ] Befintligt e-postutskick till kunden via `booking.customers.email` / `msg.customers.email` är oförändrat (bara push fan-outas)
- [ ] Single-owner-fallet beter sig identiskt med tidigare

**Verify:**
- Deploya edge function: `mcp__supabase__deploy_edge_function` med slug `send-notification`
- Manuell smoke: skapa bokning som co-owner A, admin godkänner → båda A och B ska få push på sina enheter

**Steps:**

- [ ] **Step 1: Lägg till helper för co-owner-auth_user_ids**

I `supabase/functions/send-notification/index.ts`, ovanför `Deno.serve` (efter `pushToUser`-funktionen, runt rad 32):

```ts
// Returnera alla auth_user_ids för kunder kopplade till en hund.
async function coOwnerAuthUserIds(
  admin: ReturnType<typeof createClient>,
  dogId: string | null,
  fallbackCustomerId: string | null,
): Promise<string[]> {
  if (!dogId) {
    // Legacy: meddelanden utan dog_id — använd customer_id direkt
    if (!fallbackCustomerId) return [];
    const { data } = await admin
      .from('customers')
      .select('auth_user_id')
      .eq('id', fallbackCustomerId)
      .maybeSingle();
    return cust(data) ? [cust(data)!] : [];
  }
  const { data } = await admin
    .from('customer_dogs')
    .select('customers(auth_user_id)')
    .eq('dog_id', dogId);
  const rows = (data ?? []) as Array<{ customers: { auth_user_id: string | null } | null }>;
  return rows
    .map(r => r.customers?.auth_user_id)
    .filter((u): u is string => !!u);
}

function cust(data: { auth_user_id: string | null } | null): string | null {
  return data?.auth_user_id ?? null;
}
```

- [ ] **Step 2: Använd fan-out i booking_decision-grenen**

Hitta `booking_decision`-grenen (rad ~158–209). Ersätt push-blocket (rad 192–208):

```ts
// OLD (ta bort):
// Push notification (non-fatal) — fan-out FCM + APNs in parallel.
if (booking.customer_id) {
  const { data: cust } = await admin
    .from('customers')
    .select('auth_user_id')
    .eq('id', booking.customer_id)
    .maybeSingle();
  if (cust?.auth_user_id) {
    const pushBody = approved
      ? `${escape(booking.dogs?.name)}: ${dates} är godkänd`
      : `Din förfrågan blev avslagen. Se kalendern för detaljer.`;
    await pushToUser(admin, cust.auth_user_id, subject, pushBody, {
      kind: 'booking_decision',
      booking_id: booking.id,
    });
  }
}

// NEW:
// Push notification (non-fatal) — fan-out till alla co-owners.
const recipients = await coOwnerAuthUserIds(admin, booking.dog_id ?? null, booking.customer_id ?? null);
const pushBody = approved
  ? `${escape(booking.dogs?.name)}: ${dates} är godkänd`
  : `Din förfrågan blev avslagen. Se kalendern för detaljer.`;
await Promise.all(
  recipients.map(uid =>
    pushToUser(admin, uid, subject, pushBody, {
      kind: 'booking_decision',
      booking_id: booking.id,
    }),
  ),
);
```

- [ ] **Step 3: Använd fan-out i staff_message-grenen**

Hitta `staff_message`-grenen (rad ~238–285). Ersätt push-blocket (rad 268–284):

```ts
// OLD (ta bort):
// Push notification — fan out to all of this customer's devices.
if (msg.customer_id) {
  const { data: cust } = await admin
    .from('customers')
    .select('auth_user_id')
    .eq('id', msg.customer_id)
    .maybeSingle();
  if (cust?.auth_user_id) {
    await pushToUser(
      admin,
      cust.auth_user_id,
      'Nytt meddelande från CleverDog',
      String(msg.body).slice(0, 120),
      { kind: 'staff_message', message_id: msg.id },
    );
  }
}

// NEW:
// Push notification — fan-out till alla co-owners.
const msgRecipients = await coOwnerAuthUserIds(admin, msg.dog_id ?? null, msg.customer_id ?? null);
await Promise.all(
  msgRecipients.map(uid =>
    pushToUser(
      admin,
      uid,
      'Nytt meddelande från CleverDog',
      String(msg.body).slice(0, 120),
      { kind: 'staff_message', message_id: msg.id },
    ),
  ),
);
```

- [ ] **Step 4: Verifiera lokalt att TS / Deno-typer går igenom**

Edge functions har egen TS-check vid deploy. Kör:

```bash
npm run build
```
(detta täcker bara frontend, men det är en grov sanity-check).

- [ ] **Step 5: Deploya edge function**

Använd `mcp__supabase__deploy_edge_function`:
- `name`: `send-notification`
- `files`: array med innehållet i `supabase/functions/send-notification/index.ts` + ev. `push.ts` och `apns.ts` (lämnas oförändrade)
- `entrypoint_path`: `index.ts`

Förväntat: deploy lyckas. Om Deno-typcheck-fel: läs felet och justera (vanligast: behov av explicit type-annotation på Promise.all-arrays).

- [ ] **Step 6: Smoke — single-owner**

Logga in som en single-owner-kund i mobilappen, skapa pensionatsförfrågan. Admin godkänner → kund får push. Detta verifierar att existerande flöden inte är brutna.

- [ ] **Step 7: Smoke — multi-owner**

Med två co-owner-kunder A + B + samma hund: A skapar pensionatsförfrågan. Admin godkänner → BÅDA A och B ska få push (verifiera på två enheter eller två Chrome-profiler om PWA).

- [ ] **Step 8: Commit**

```bash
git add supabase/functions/send-notification/index.ts
git commit -m "feat(notifications): push fan-out till alla co-owners

booking_decision och staff_message hämtar nu alla customer_dogs-länkade
auth_user_ids via ny coOwnerAuthUserIds()-helper och pushar till samtliga.
Legacy-fallback: meddelanden med dog_id IS NULL pushar bara till
msg.customer_id som tidigare.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Multi-Owner — Admin ser alla ägare per hund

**Goal:** Hund-redigerings-flödet i AdminPage ska visa ALLA länkade kunder, inte bara den första som `.limit(1).maybeSingle()` råkar plocka.

**Files:**
- Modify: `src/lib/database.ts` (lägg till getDogCustomers)
- Modify: `src/components/AdminPage.tsx` (använd nya helpern, rendera lista)

**Acceptance Criteria:**
- [ ] Ny export `getDogCustomers(dogId: string): Promise<Customer[]>` i database.ts
- [ ] AdminPage hund-redigerare visar lista med alla länkade kunders namn + e-post
- [ ] Lyfter befintligt anrop på rad 1559–1569 (som plockar första kunden) till att visa alla
- [ ] Befintliga single-owner-fall renderar som tidigare (bara en rad i listan)
- [ ] `npm run build` passerar

**Verify:**
```bash
npm run build
```
→ Manuell smoke: i admin, öppna en hund som har 2 co-owners → båda ska listas.

**Steps:**

- [ ] **Step 1: Lägg `getDogCustomers` i database.ts**

I `src/lib/database.ts`, nära de andra customer-portal-helpers (ca rad 1894 efter `getCustomerDogIds`), lägg till:

```ts
export const getDogCustomers = async (dogId: string): Promise<Customer[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('customer_dogs')
    .select('customer:customers(*)')
    .eq('dog_id', dogId);
  if (error) {
    console.error('getDogCustomers', error);
    return [];
  }
  // Supabase returnerar nested objekt: { customer: { ... } }
  const rows = (data ?? []) as Array<{ customer: Customer | null }>;
  return rows.map(r => r.customer).filter((c): c is Customer => !!c);
};
```

- [ ] **Step 2: Uppdatera AdminPage.tsx hund-redigerare**

I `src/components/AdminPage.tsx`, leta upp blocket på rad 1555–1580 där `linkedCustomerId` slås upp. Ersätt:

```tsx
// OLD (rad ~1559–1569, ta bort):
let linkedCustomerId: string | null = null;
try {
  const { supabase } = await import('../lib/supabase');
  if (supabase) {
    const { data } = await supabase
      .from('customer_dogs').select('customer_id').eq('dog_id', dog.id).limit(1).maybeSingle();
    linkedCustomerId = data?.customer_id ?? null;
  }
} catch (e) {
  console.error('lookup customer_dogs failed', e);
}

// NEW:
let linkedCustomers: Customer[] = [];
try {
  linkedCustomers = await getDogCustomers(dog.id);
} catch (e) {
  console.error('getDogCustomers failed', e);
}
```

Sök i samma fil efter `linkedCustomerId` (det används troligen för en owner-selector). Byt referenser så att:
- "Är hunden länkad?" → `linkedCustomers.length > 0`
- "Visa länkad kund" → renderas som lista (en rad per kund)

Eftersom AdminPage.tsx är stor (8000+ rader), gör detta i två sub-steg:

**Sub-step 2a:** Sök efter `linkedCustomerId` med Grep — hitta alla användare. Lista varje plats där den läses. (Förmodligen `editingDog`-state, owner-selector-rendering, ev. submit-logik.)

**Sub-step 2b:** För varje plats:
- Om bara används för "finns det en länk?" → ersätt med `linkedCustomers.length > 0`
- Om används för att slå upp kundnamn till visning → ersätt med `linkedCustomers.map(c => c.name).join(', ')` eller motsvarande lista-render
- Om används för att uppdatera EN kunds dog-länk → behåll men inse att vid multi-owner krävs admin lägga till varje kund separat (den UI-utvidgningen lämnas till framtida arbete; nu räcker det att admin SER alla)

- [ ] **Step 3: Lägg till import för Customer-typen om saknas**

I `src/components/AdminPage.tsx`, kolla att `Customer` och `getDogCustomers` är importerade från `../lib/database`:

```tsx
import { /* befintliga */, type Customer, getDogCustomers } from '../lib/database';
```

- [ ] **Step 4: TS-build**

```bash
npm run build
```
Förväntat: passerar. Om fel pekar på `linkedCustomerId` som fortfarande används — ersätt återstående.

- [ ] **Step 5: Manuell smoke**

Öppna admin (web): redigera en hund som har en kund kopplad → ska visa kundens namn. Skapa en till kund i CustomersTab och koppla samma hund → redigera hunden i admin → ska nu visa BÅDA kunderna.

- [ ] **Step 6: Commit**

```bash
git add src/lib/database.ts src/components/AdminPage.tsx
git commit -m "feat(admin): visa alla co-owners i hund-redigerare

Ersätter .limit(1).maybeSingle()-uppslag med ny getDogCustomers()-helper
som returnerar alla länkade kunder. Hund-redigeraren i AdminPage listar
nu samtliga ägare istället för bara den första som råkade plockas.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Multi-Owner — Kund-UI visar co-owner-attribution

**Goal:** På chat-sidan och i bokningskalendern ska kunden se vilken co-owner (om annan än hen själv) som skrev meddelandet eller skapade bokningen, så det inte blir förvirrande.

**Files:**
- Modify: `src/components/customer/MessagesTab.tsx`
- Modify: `src/components/customer/BookingCalendar.tsx`

**Acceptance Criteria:**
- [ ] I MessagesTab: om ett kund-meddelandes `sender_user_id` inte är min auth uid, visa liten gråtext "från {kundens förnamn}" ovanför bubblan
- [ ] I BookingCalendar: när jag tappar en bokning som skapats av annan co-owner, visa "Bokad av {förnamn}" i dagens popover
- [ ] Eget meddelande / egen bokning visar INGEN extra label (inte "från du")
- [ ] Single-owner-fall: inga labels visas (eftersom alla rader är skapade av mig)
- [ ] `npm run build` passerar

**Verify:**
```bash
npm run build
```
→ Manuell smoke med två co-owners A + B på samma hund: A skickar meddelande → B ser "från A" ovanför bubblan; A bokar dag → B ser "Bokad av A" i kalender-popover.

**Steps:**

- [ ] **Step 1: Hämta min user-id på MessagesTab**

I `src/components/customer/MessagesTab.tsx`, hitta huvud-komponentens state-deklarationer. Lägg till:

```tsx
import { supabase } from '../../lib/supabase';

// ... inuti komponenten:
const [myAuthUserId, setMyAuthUserId] = useState<string | null>(null);
useEffect(() => {
  supabase?.auth.getUser().then(({ data }) => setMyAuthUserId(data.user?.id ?? null));
}, []);
```

- [ ] **Step 2: Visa "från X" för kund-meddelanden från annan co-owner**

Hitta render-loopen där varje meddelande-bubbla skapas (sök efter `sender_role === 'customer'`). Lägg till en label ovanför bubblan när meddelandet är från en annan kund:

```tsx
{msg.sender_role === 'customer' && myAuthUserId && msg.sender_user_id && msg.sender_user_id !== myAuthUserId && (
  <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-0.5 text-right">
    från {firstNameOf(msg.sender_name ?? '')}
  </p>
)}
```

Importera `firstNameOf`:

```tsx
import { firstNameOf } from '../../lib/customerApi';
```

(Förutsatt att `messages.sender_name` finns enligt migration `20260601_001_messages_sender_name.sql`. Om kolumnen saknas i Database type-defs: regenerera types med `mcp__supabase__generate_typescript_types` efter Task 5.)

- [ ] **Step 3: Visa "Bokad av X" i BookingCalendar dag-popover**

I `src/components/customer/BookingCalendar.tsx`, hitta dag-popovern (sök efter "popover" eller där en bokning visas på klick). Lägg till en rad som visar bokningens skapare när det är en annan co-owner.

Först: hämta min user-id (samma pattern som Task 8 step 1). Sen i popovern, för bokningar med `customer_id != myCustomerId` (eller liknande):

```tsx
// I render-blocket för selected day:
{booking && bookingCreatorName && bookingCustomerId !== myCustomerId && (
  <p className="text-xs text-gray-500 italic">
    Bokad av {firstNameOf(bookingCreatorName)}
  </p>
)}
```

För att slå upp creator-namnet behöver vi joina `bookings.customer_id` mot `customers.name`. Lägg till i bookings-fetch (sök efter där bookings hämtas — sannolikt `getMyBookings` eller liknande i `customerApi.ts`):

```ts
// Befintlig select i customerApi.ts (eller bookingHelpers.ts):
.select('*, customers(name)')
```

Det ger `booking.customers.name` att rendera från.

Om RLS hindrar customers-join för andra co-owners: vi tillåter SELECT på customers via `is_admin_user() OR auth.uid() = auth_user_id`, men inte för "andra customers". Vi måste därför joina i en VIEW eller en RPC. **Beslut för v1:** håll det enkelt — om join inte funkar, visa bara `"Bokad av en annan ägare"` (utan namn) som fallback. Iterera till named-attribution senare om det blir prio.

Konkret fallback:

```tsx
{booking && bookingCustomerId !== myCustomerId && (
  <p className="text-xs text-gray-500 italic">
    Bokad av en annan ägare
  </p>
)}
```

- [ ] **Step 4: TS-build**

```bash
npm run build
```
Förväntat: passerar.

- [ ] **Step 5: Manuell smoke**

Med två co-owners A + B + samma hund (samma som Task 5 steg 5):
- Logga in som A → skicka meddelande → texten "från {A:s förnamn}" syns inte (det är mitt eget)
- Logga in som B → öppna chat → se "från {A:s förnamn}" ovanför A:s meddelande
- Logga in som A → boka dag → kalendern visar bokningen utan attribution
- Logga in som B → öppna kalender → tap på A:s bokning → "Bokad av en annan ägare" (eller med namn om join funkar)

- [ ] **Step 6: Commit**

```bash
git add src/components/customer/MessagesTab.tsx src/components/customer/BookingCalendar.tsx src/lib/customerApi.ts
git commit -m "feat(customer): visa co-owner-attribution i chat + kalender

Meddelanden från annan co-owner får liten "från X"-label ovanför bubblan.
Bokningar skapade av annan co-owner visar "Bokad av X" i dag-popover
(fallback till "Bokad av en annan ägare" när name-join blockeras av RLS).

Single-owner-fall renderar oförändrat — inga labels visas eftersom
sender_user_id alltid matchar inloggad användare.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

Efter att tasks 0–8 är skrivna gick jag igenom planen mot specen:

**1. Spec coverage:**
- Sektion 0 (WIP-inventering) → Task 0 commitar all WIP. ✓
- Sektion 0.1 (greeting-fix) → Task 0 fixar `HomeFeedTab.tsx:99`. ✓
- Sektion 3.1–3.4 (Foundation tokens + komponenter) → Task 1–4. ✓
- Sektion 3.6.3 (RLS + helpers) → Task 5. ✓
- Sektion 3.6.4 (push fan-out) → Task 6. ✓
- Sektion 3.6.5 (admin co-owner-vy) → Task 7. ✓
- Sektion 3.6.6 (kund-UI co-owner-attribution) → Task 8. ✓
- Sektion 3.5 (filer som ska migreras till foundation — BookingCalendar STATUS_STYLE, etc.) → INTE i denna plan. Det är *användning* av foundation, hör hemma i Tema 1/2-planerna. Acceptable; bara foundation-*komponenterna* skapas här. Inga skarpa migrationer i existing-files krävs ännu.

**2. Placeholder scan:** Inga TBD/TODO. Alla steg har kodblock eller exakta kommandon.

**3. Type consistency:**
- `Customer`-typ från `database.ts` används i Task 7 + 8. ✓
- `firstNameOf` exporteras från `customerApi.ts` i Task 0 och importeras i Task 0 (CustomerHeader), Task 8 (MessagesTab, BookingCalendar). ✓
- `BTN` + `STATUS` definieras i Task 1, används i Task 3 + Task 4. ✓
- `Sheet`-komponenten definieras i Task 2 men används inte i denna plan — den är *redo att användas* i Tema 1+. Acceptable.

**4. Spec-krav utan task:** Inga upptäckta. Den enda gråzonen är spec 3.6.6's "Bokad av X" med namn — task 8 har fallback om RLS blockerar customer-join. Detta är medvetet flaggat i planen och acceptabelt för v1.
