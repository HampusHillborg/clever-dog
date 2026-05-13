# Kundportal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bygg en inloggad kundportal (dold bakom `/login`) där hundägare kan se sin hund, hantera info/foto, boka dagar enligt sitt abonnemang (med pensionat/enstaka-dag som godkännandepliktig förfrågan), skicka meddelanden till personalen och ladda ner kontrakt. Plus admin-utökningar för kund-CRUD, invite-skick, förfrågnings-kö och intäktsstatistik. Plus rensning av Malmö-spår.

**Architecture:** React 19 SPA med Vite, Supabase som backend (Postgres + Auth + Storage + Edge Functions). Kundsidan ligger på `/kund/*` skyddad av `ProtectedCustomerRoute` som kollar inloggning + `customers`-tabell-koppling. Nya tabeller (`customers`, `customer_dogs`, `bookings`, `recurring_schedule`, `messages`) får strikta RLS-policies. Befintliga `dogs`/`boarding_records` etc. byter från "Allow all operations" till scopeade policies. En Edge Function (`invite-customer`) körs med service_role för att skicka invite-mejl. Storage bucket `dog-photos` för profilbilder.

**Tech Stack:** React 19 + TypeScript + Vite + Tailwind + react-router-dom 7 + framer-motion + @supabase/supabase-js + html2pdf.js (befintlig PDF-gen).

**Verifiering:** Projektet saknar enhetstest-ramverk. Vi använder `npm run build` (TypeScript-check + Vite-build) och manuell smoke-test i browser som "test". Specifika SQL-tester via MCP där relevant.

---

## Phase 0 — Databas-grund

### Task 0: Skapa nya tabeller och storage bucket

**Goal:** Lägg till `customers`, `customer_dogs`, `bookings`, `recurring_schedule`, `messages`, samt `photo_url` + `customer_notes` på `dogs`. Skapa `dog-photos` storage bucket.

**Files:**
- Create (MCP migration): `supabase/migrations/20260513_001_customer_portal_tables.sql` (för dokumentation; körs via `apply_migration`)

**Acceptance Criteria:**
- [ ] Alla nya tabeller finns i `public`-schemat
- [ ] `dogs.photo_url` (text, nullable) och `dogs.customer_notes` (text, nullable) finns
- [ ] `dog-photos` bucket finns med `public=true`, 5 MB limit, jpg/png/webp
- [ ] CHECK constraints på `bookings.booking_type` och `.status` accepterar de definierade värdena

**Verify:**
```
mcp__supabase__list_tables (schemas=["public"], verbose=true)
→ Visar customers, customer_dogs, bookings, recurring_schedule, messages

mcp__supabase__execute_sql query="select id, public, file_size_limit from storage.buckets where id='dog-photos'"
→ 1 rad
```

**Steps:**

- [ ] **Step 1: Kör migrering via MCP `apply_migration`**

Namn: `customer_portal_tables`

```sql
-- customers: en rad per hundägare som har/ska få konto
create table public.customers (
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

-- många-till-många mellan customers och dogs
create table public.customer_dogs (
  customer_id uuid not null references public.customers(id) on delete cascade,
  dog_id uuid not null references public.dogs(id) on delete cascade,
  is_primary_owner boolean default true,
  created_at timestamptz default now(),
  primary key (customer_id, dog_id)
);

create index idx_customer_dogs_dog on public.customer_dogs(dog_id);

-- bookings: täcker scheduled/extra/cancelled (dagis) + boarding/single_day (förfrågan)
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  start_date date not null,
  end_date date not null,
  booking_type text not null
    check (booking_type in ('scheduled','extra','cancelled','boarding','single_day')),
  status text not null default 'confirmed'
    check (status in ('confirmed','pending','rejected','cancelled')),
  notes text,
  admin_response text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  check (end_date >= start_date)
);

create index idx_bookings_dog_date on public.bookings(dog_id, start_date);
create index idx_bookings_status on public.bookings(status) where status = 'pending';

-- recurring_schedule: fasta veckodagar per hund (för dagis-typer)
create table public.recurring_schedule (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0=mån, 6=sön
  active boolean default true,
  created_at timestamptz default now(),
  unique (dog_id, weekday)
);

-- messages: chat mellan kund och personal
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  dog_id uuid references public.dogs(id) on delete set null,
  sender_role text not null check (sender_role in ('customer','staff')),
  sender_user_id uuid references auth.users(id),
  body text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

create index idx_messages_customer_created on public.messages(customer_id, created_at desc);
create index idx_messages_unread on public.messages(customer_id, is_read) where is_read = false;

-- Nya kolumner på dogs
alter table public.dogs add column if not exists photo_url text;
alter table public.dogs add column if not exists customer_notes text;

-- updated_at-triggers (återanvänd befintlig update_updated_at_column-funktion)
create trigger trg_customers_updated_at before update on public.customers
  for each row execute function public.update_updated_at_column();
create trigger trg_bookings_updated_at before update on public.bookings
  for each row execute function public.update_updated_at_column();

-- Storage bucket via SQL
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dog-photos',
  'dog-photos',
  true,
  5242880, -- 5 MB
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do nothing;
```

- [ ] **Step 2: Verifiera**

```
mcp__supabase__list_tables schemas=["public"] verbose=false
```

Förväntat: listan innehåller `customers`, `customer_dogs`, `bookings`, `recurring_schedule`, `messages`.

```
mcp__supabase__execute_sql query="select id, public, file_size_limit from storage.buckets where id='dog-photos';"
```

Förväntat: 1 rad med `public=true`, `file_size_limit=5242880`.

- [ ] **Step 3: Commit-meddelande (i Git, om vi sparar SQL som dokumentation)**

Sparas också till `supabase/migrations/20260513_001_customer_portal_tables.sql` om vi vill ha den i repo (rekommenderas — track migration history).

```bash
git add supabase/migrations/20260513_001_customer_portal_tables.sql
git commit -m "feat(db): add customer portal tables and dog-photos bucket"
```

---

### Task 1: RLS-policies för nya tabeller + admin-bypass

**Goal:** Säkra de nya tabellerna så att kunder bara ser sina egna data och admin/employee/platschef har full access.

**Files:**
- Create (MCP migration): `supabase/migrations/20260513_002_customer_portal_rls.sql`

**Acceptance Criteria:**
- [ ] RLS är aktiverat på alla fem nya tabeller
- [ ] Policy "customers can read own row" finns på `customers`
- [ ] Policy "customers can read own bookings" finns på `bookings`
- [ ] Admin-policy (för admin/platschef/employee) finns på alla fem tabeller
- [ ] SQL-test: en kund kan inte SELECT en annan kunds rad

**Verify:**
```
mcp__supabase__execute_sql query="select tablename, policyname from pg_policies where schemaname='public' and tablename in ('customers','customer_dogs','bookings','recurring_schedule','messages') order by tablename, policyname;"
→ Minst 2 policies per tabell (customer + admin)
```

**Steps:**

- [ ] **Step 1: Kör migration via MCP `apply_migration`**

Namn: `customer_portal_rls`

```sql
-- Helper-funktion: är inloggad user en admin/platschef/employee?
create or replace function public.is_admin_user()
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1 from public.admin_users where id = auth.uid()
  );
$$;

revoke execute on function public.is_admin_user() from anon;
grant execute on function public.is_admin_user() to authenticated;

-- Helper-funktion: ge inloggad customers.id
create or replace function public.current_customer_id()
returns uuid
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select id from public.customers where auth_user_id = auth.uid() limit 1;
$$;

revoke execute on function public.current_customer_id() from anon;
grant execute on function public.current_customer_id() to authenticated;

-- ENABLE RLS
alter table public.customers enable row level security;
alter table public.customer_dogs enable row level security;
alter table public.bookings enable row level security;
alter table public.recurring_schedule enable row level security;
alter table public.messages enable row level security;

-- CUSTOMERS
create policy "customers read own" on public.customers
  for select to authenticated
  using (auth.uid() = auth_user_id or public.is_admin_user());

create policy "customers update own" on public.customers
  for update to authenticated
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

create policy "admins manage customers" on public.customers
  for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- CUSTOMER_DOGS
create policy "customers read own dog links" on public.customer_dogs
  for select to authenticated
  using (customer_id = public.current_customer_id() or public.is_admin_user());

create policy "admins manage customer dogs" on public.customer_dogs
  for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- BOOKINGS
create policy "customers read own bookings" on public.bookings
  for select to authenticated
  using (customer_id = public.current_customer_id() or public.is_admin_user());

create policy "customers insert own bookings" on public.bookings
  for insert to authenticated
  with check (customer_id = public.current_customer_id());

create policy "customers update own bookings" on public.bookings
  for update to authenticated
  using (
    customer_id = public.current_customer_id()
    and status in ('confirmed','pending')
  )
  with check (customer_id = public.current_customer_id());

create policy "admins manage bookings" on public.bookings
  for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- RECURRING_SCHEDULE
create policy "customers read own schedule" on public.recurring_schedule
  for select to authenticated
  using (
    dog_id in (
      select dog_id from public.customer_dogs
      where customer_id = public.current_customer_id()
    )
    or public.is_admin_user()
  );

create policy "admins manage recurring" on public.recurring_schedule
  for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- MESSAGES
create policy "customers read own messages" on public.messages
  for select to authenticated
  using (customer_id = public.current_customer_id() or public.is_admin_user());

create policy "customers insert own messages" on public.messages
  for insert to authenticated
  with check (
    customer_id = public.current_customer_id()
    and sender_role = 'customer'
    and sender_user_id = auth.uid()
  );

create policy "customers update read flag" on public.messages
  for update to authenticated
  using (customer_id = public.current_customer_id())
  with check (customer_id = public.current_customer_id());

create policy "admins manage messages" on public.messages
  for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- STORAGE: dog-photos
-- Public read (bucket public=true gör det möjligt automatiskt)
-- Authenticated upload
create policy "Authenticated upload dog photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'dog-photos');

create policy "Authenticated update dog photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'dog-photos')
  with check (bucket_id = 'dog-photos');

create policy "Authenticated delete dog photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'dog-photos');
```

- [ ] **Step 2: Verifiera RLS via SQL-test**

```sql
-- Skapa två testkunder + en hund per kund
insert into public.dogs(name,breed,age,owner,phone,color) values ('TestA','Lab','3','OwnerA','111','#f00') returning id;
insert into public.dogs(name,breed,age,owner,phone,color) values ('TestB','Lab','3','OwnerB','222','#0f0') returning id;
-- (notera de två returnerade UUID:erna)
```

Kör via MCP. Vi testar inte själva RLS isolerat här — det görs i Task 5 när auth-flödet finns. Rensa testdata efter:

```sql
delete from public.dogs where name in ('TestA','TestB');
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260513_002_customer_portal_rls.sql
git commit -m "feat(db): add RLS policies for customer portal tables"
```

---

### Task 2: Strama åt RLS på befintliga tabeller (dogs, boarding_records, planning_history, box_settings)

**Goal:** Ersätt "Allow all operations" med scopeade policies så att kunder inte kan läsa/ändra alla hundar.

**Files:**
- Create (MCP migration): `supabase/migrations/20260513_003_tighten_legacy_rls.sql`

**Acceptance Criteria:**
- [ ] `dogs` har bara policies som tillåter (a) admin/employee/platschef full access, (b) inloggad kund SELECT+UPDATE bara på kopplade hundar
- [ ] `boarding_records`, `planning_history`, `box_settings` är admin-only
- [ ] "Allow all operations"-policies är droppade

**Verify:**
```
mcp__supabase__execute_sql query="select tablename, policyname, qual from pg_policies where schemaname='public' and tablename in ('dogs','boarding_records','planning_history','box_settings');"
→ Inga rader med qual='true' kvar på dessa tabeller
```

**Steps:**

- [ ] **Step 1: Innan migration — verifiera att admin-koden fortfarande funkar**

Befintlig admin använder Supabase med anon key men inloggad som admin/employee. `is_admin_user()` returnerar true för dessa. Inget i frontkoden behöver ändras eftersom samma `supabase`-klient används.

- [ ] **Step 2: Kör migration**

Namn: `tighten_legacy_rls`

```sql
-- DOGS
drop policy if exists "Allow all operations" on public.dogs;

create policy "admins manage all dogs" on public.dogs
  for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy "customers read own dogs" on public.dogs
  for select to authenticated
  using (
    id in (
      select dog_id from public.customer_dogs
      where customer_id = public.current_customer_id()
    )
  );

create policy "customers update own dogs limited" on public.dogs
  for update to authenticated
  using (
    id in (
      select dog_id from public.customer_dogs
      where customer_id = public.current_customer_id()
    )
  )
  with check (
    id in (
      select dog_id from public.customer_dogs
      where customer_id = public.current_customer_id()
    )
  );

-- BOARDING_RECORDS (admin-only — kunder ser sina bokningar via bookings-tabellen)
drop policy if exists "Allow all operations" on public.boarding_records;

create policy "admins manage boarding records" on public.boarding_records
  for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- PLANNING_HISTORY (admin-only)
drop policy if exists "Allow all operations" on public.planning_history;

create policy "admins manage planning" on public.planning_history
  for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- BOX_SETTINGS (admin-only)
drop policy if exists "Allow all operations" on public.box_settings;

create policy "admins manage box settings" on public.box_settings
  for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- Säkerhets-fixar
alter function public.update_updated_at_column() set search_path = public, pg_temp;
alter function public.update_updated_at() set search_path = public, pg_temp;
alter function public.update_meetings_updated_at() set search_path = public, pg_temp;
alter function public.update_applications_updated_at() set search_path = public, pg_temp;
alter function public.get_user_role(uuid) set search_path = public, pg_temp;
alter function public.handle_new_user() set search_path = public, pg_temp;
revoke execute on function public.get_user_role(uuid) from anon;
```

- [ ] **Step 3: Verifiera att admin-frontkoden fortfarande funkar**

Starta dev-server:
```bash
npm run dev
```
Gå till `http://localhost:5173/admin`, logga in som admin, verifiera:
- Hund-listan laddas
- Boarding-listan laddas
- Planning laddas

Om något brister: rulla tillbaka via en omvänd migration eller justera policy.

- [ ] **Step 4: Kör advisor-check**

```
mcp__supabase__get_advisors type="security"
```

Förväntat: warnings för "Allow all operations" på dogs/boarding_records/etc. försvunna.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260513_003_tighten_legacy_rls.sql
git commit -m "feat(db): replace 'Allow all operations' with scoped RLS policies"
```

---

### Task 3: Generera och commit:a uppdaterade TypeScript-typer

**Goal:** `src/lib/database.types.ts` matchar verkligt schema, inkluderar nya tabeller och kolumner.

**Files:**
- Modify: `src/lib/database.types.ts`

**Acceptance Criteria:**
- [ ] Filen innehåller typer för `customers`, `customer_dogs`, `bookings`, `recurring_schedule`, `messages`
- [ ] `dogs.Row` innehåller `photo_url` och `customer_notes`
- [ ] `npm run build` lyckas

**Verify:**
```bash
npm run build
```
→ Bygger utan TypeScript-fel

**Steps:**

- [ ] **Step 1: Generera via MCP**

```
mcp__supabase__generate_typescript_types
```

Kopiera output.

- [ ] **Step 2: Skriv över filen**

Write till `src/lib/database.types.ts` med genererad output.

- [ ] **Step 3: Build**

```bash
npm run build
```

Om typfel uppstår i befintlig kod (t.ex. för att `locations` är jsonb istället för text-array), fixa i Task 0+ — det här är förväntat och vi tar det vartefter.

- [ ] **Step 4: Commit**

```bash
git add src/lib/database.types.ts
git commit -m "chore(types): regenerate database types after customer portal migrations"
```

---

## Phase 1 — Kund-auth och routing

### Task 4: Customer auth helpers + ProtectedCustomerRoute

**Goal:** Hjälpfunktioner som vet om en inloggad user är admin eller customer, och en route-wrapper som låser kundsidor.

**Files:**
- Create: `src/lib/customerAuth.ts`
- Create: `src/components/customer/ProtectedCustomerRoute.tsx`

**Acceptance Criteria:**
- [ ] `customerAuth.ts` exporterar `getCustomerForUser()`, `isCustomer()`, `signInCustomer()`, `signOutCustomer()`
- [ ] `ProtectedCustomerRoute` redirigerar till `/login` om ej inloggad eller inte i `customers`-tabellen
- [ ] Admin som loggar in via `/login` får redirect till `/admin`

**Verify:** `npm run build` passerar.

**Steps:**

- [ ] **Step 1: Skapa `src/lib/customerAuth.ts`**

```ts
import { supabase } from './supabase';
import type { Database } from './database.types';

export type Customer = Database['public']['Tables']['customers']['Row'];

export const getCustomerForUser = async (): Promise<Customer | null> => {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('auth_user_id', session.user.id)
    .maybeSingle();
  if (error) {
    console.error('getCustomerForUser', error);
    return null;
  }
  return data;
};

export const isAdminUser = async (): Promise<boolean> => {
  if (!supabase) return false;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return false;
  const { data } = await supabase
    .from('admin_users')
    .select('id')
    .eq('id', session.user.id)
    .maybeSingle();
  return !!data;
};

export const signInCustomer = async (email: string, password: string) => {
  if (!supabase) return { ok: false, error: 'Supabase ej konfigurerad' };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  return { ok: true, userId: data.user?.id };
};

export const signOutCustomer = async () => {
  if (!supabase) return;
  await supabase.auth.signOut();
};
```

- [ ] **Step 2: Skapa `src/components/customer/ProtectedCustomerRoute.tsx`**

```tsx
import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { getCustomerForUser, isAdminUser, type Customer } from '../../lib/customerAuth';

type Props = { children: ReactNode };

type State =
  | { kind: 'loading' }
  | { kind: 'customer'; customer: Customer }
  | { kind: 'admin' }
  | { kind: 'anonymous' };

export default function ProtectedCustomerRoute({ children }: Props) {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const customer = await getCustomerForUser();
      if (cancelled) return;
      if (customer) {
        setState({ kind: 'customer', customer });
        return;
      }
      const admin = await isAdminUser();
      if (cancelled) return;
      setState(admin ? { kind: 'admin' } : { kind: 'anonymous' });
    })();
    return () => { cancelled = true; };
  }, []);

  if (state.kind === 'loading') {
    return <div className="h-screen flex items-center justify-center">Laddar…</div>;
  }
  if (state.kind === 'admin') return <Navigate to="/admin" replace />;
  if (state.kind === 'anonymous') return <Navigate to="/login" replace />;

  return <>{children}</>;
}
```

- [ ] **Step 3: Build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/customerAuth.ts src/components/customer/ProtectedCustomerRoute.tsx
git commit -m "feat(customer): add customer auth helpers and ProtectedCustomerRoute"
```

---

### Task 5: LoginPage

**Goal:** En `/login`-sida med email+lösen-formulär, som routar admin till `/admin` och kund till `/kund` efter inloggning.

**Files:**
- Create: `src/pages/LoginPage.tsx`
- Create: `src/components/customer/CustomerLayout.tsx` (förenklad shell — header med logga ut)
- Modify: `src/App.tsx` (lägg till routes — Task 7 färdigställer)

**Acceptance Criteria:**
- [ ] `/login` visar inloggningsformulär
- [ ] Vid inloggning som admin → redirect till `/admin`
- [ ] Vid inloggning som kund → redirect till `/kund`
- [ ] Ej godkänd kund (saknas i `customers`-tabell) får felmeddelande

**Verify:** manuell test efter Task 7 (route-wiring).

**Steps:**

- [ ] **Step 1: Skapa `src/pages/LoginPage.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInCustomer, getCustomerForUser, isAdminUser } from '../lib/customerAuth';
import dogLogo from '../assets/images/logos/Logo.png';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await signInCustomer(email, password);
    if (!res.ok) {
      setError(res.error || 'Inloggningen misslyckades');
      setLoading(false);
      return;
    }
    const admin = await isAdminUser();
    if (admin) {
      navigate('/admin', { replace: true });
      return;
    }
    const customer = await getCustomerForUser();
    if (customer) {
      navigate('/kund', { replace: true });
      return;
    }
    setError('Kontot är inte aktiverat. Kontakta oss.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-light px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <img src={dogLogo} alt="CleverDog" className="h-16 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-center mb-1">Logga in</h1>
        <p className="text-center text-gray-500 mb-6 text-sm">Kundportal</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium">E-post</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border-gray-300 focus:ring-primary"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Lösenord</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border-gray-300 focus:ring-primary"
              required
            />
          </label>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary text-white py-2.5 font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Loggar in…' : 'Logga in'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Skapa `src/components/customer/CustomerLayout.tsx`**

```tsx
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSignOutAlt } from 'react-icons/fa';
import { getCustomerForUser, signOutCustomer, type Customer } from '../../lib/customerAuth';
import dogLogo from '../../assets/images/logos/Logo.png';

export default function CustomerLayout({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    getCustomerForUser().then(setCustomer);
  }, []);

  const logout = async () => {
    await signOutCustomer();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-light">
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={dogLogo} alt="" className="h-10" />
            <div>
              <p className="text-xs text-gray-500">Inloggad som</p>
              <p className="font-medium">{customer?.name ?? '…'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary"
          >
            <FaSignOutAlt /> Logga ut
          </button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/LoginPage.tsx src/components/customer/CustomerLayout.tsx
git commit -m "feat(customer): add LoginPage and CustomerLayout"
```

---

### Task 6: AcceptInvitePage

**Goal:** Sidan som körs efter att en kund klickat på invite-länken i mejlet — sätter lösenord och kopplar `auth.users.id` till `customers.auth_user_id`.

**Files:**
- Create: `src/pages/AcceptInvitePage.tsx`

**Acceptance Criteria:**
- [ ] Sidan läser invite-token från URL (Supabase använder hash-baserade tokens)
- [ ] Användaren sätter lösenord
- [ ] Efter framgång: `customers.invite_status = 'accepted'`, `accepted_at = now()`, `auth_user_id` satt
- [ ] Redirect till `/kund`

**Verify:** Manuell test efter Task 9 (invite-edge-function).

**Steps:**

- [ ] **Step 1: Skapa `src/pages/AcceptInvitePage.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import dogLogo from '../assets/images/logos/Logo.png';

export default function AcceptInvitePage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase auto-konsumerar hash-tokens vid client-init. Kolla att vi har en session.
    (async () => {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      setHasToken(!!session);
      if (!session) {
        setError('Ogiltig eller utgången inbjudningslänk. Kontakta oss för en ny.');
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Lösenord måste vara minst 8 tecken');
    if (password !== confirm) return setError('Lösenorden matchar inte');
    if (!supabase) return setError('Supabase ej konfigurerad');

    setLoading(true);
    const { data, error: pwErr } = await supabase.auth.updateUser({ password });
    if (pwErr || !data.user) {
      setError(pwErr?.message ?? 'Kunde inte sätta lösenord');
      setLoading(false);
      return;
    }

    // Koppla auth_user_id till customers
    const { error: linkErr } = await supabase
      .from('customers')
      .update({
        auth_user_id: data.user.id,
        invite_status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('email', data.user.email);
    if (linkErr) {
      setError(`Konto skapat men koppling misslyckades: ${linkErr.message}`);
      setLoading(false);
      return;
    }

    navigate('/kund', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-light px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <img src={dogLogo} alt="CleverDog" className="h-16 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-center mb-1">Välkommen!</h1>
        <p className="text-center text-gray-500 mb-6 text-sm">Sätt ditt lösenord</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Lösenord</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border-gray-300"
              required
              minLength={8}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Bekräfta lösenord</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full rounded-lg border-gray-300"
              required
              minLength={8}
            />
          </label>
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
          <button
            type="submit"
            disabled={loading || !hasToken}
            className="w-full rounded-lg bg-primary text-white py-2.5 font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Sparar…' : 'Skapa konto'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add src/pages/AcceptInvitePage.tsx
git commit -m "feat(customer): add AcceptInvitePage for invite flow"
```

---

### Task 7: Route-wiring i App.tsx

**Goal:** Registrera nya routes utan att exponera dem från publika sidan.

**Files:**
- Modify: `src/App.tsx`

**Acceptance Criteria:**
- [ ] `/login` → `LoginPage`
- [ ] `/login/accept-invite` → `AcceptInvitePage`
- [ ] `/kund` → `ProtectedCustomerRoute > CustomerDashboardPage` (skapas i Task 10 — använd placeholder tills dess)
- [ ] Ingen ändring i `Navbar`/`Footer`/`StaffanstorpPage` (länkas ej från publika sidan)

**Verify:** Navigera manuellt till `/login` i browser → ser inloggningsformulär.

**Steps:**

- [ ] **Step 1: Skapa placeholder för `CustomerDashboardPage`**

`src/pages/CustomerDashboardPage.tsx`:

```tsx
import CustomerLayout from '../components/customer/CustomerLayout';

export default function CustomerDashboardPage() {
  return (
    <CustomerLayout>
      <h2 className="text-xl font-semibold">Kunddashboard kommer här</h2>
      <p className="text-gray-600 mt-2">Implementeras i Task 10.</p>
    </CustomerLayout>
  );
}
```

- [ ] **Step 2: Modifiera `src/App.tsx`**

Före:
```tsx
const StaffanstorpPage = lazy(() => import('./pages/StaffanstorpPage'))
const AdminPage = lazy(() => import('./components/AdminPage'))
```

Efter:
```tsx
const StaffanstorpPage = lazy(() => import('./pages/StaffanstorpPage'))
const AdminPage = lazy(() => import('./components/AdminPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const AcceptInvitePage = lazy(() => import('./pages/AcceptInvitePage'))
const CustomerDashboardPage = lazy(() => import('./pages/CustomerDashboardPage'))
import ProtectedCustomerRoute from './components/customer/ProtectedCustomerRoute'
```

I `<Routes>`:

```tsx
<Route path="/login" element={
  <Suspense fallback={<div className="h-screen flex items-center justify-center">Laddar…</div>}>
    <LoginPage />
  </Suspense>
} />
<Route path="/login/accept-invite" element={
  <Suspense fallback={<div className="h-screen flex items-center justify-center">Laddar…</div>}>
    <AcceptInvitePage />
  </Suspense>
} />
<Route path="/kund" element={
  <Suspense fallback={<div className="h-screen flex items-center justify-center">Laddar…</div>}>
    <ProtectedCustomerRoute><CustomerDashboardPage /></ProtectedCustomerRoute>
  </Suspense>
} />
```

- [ ] **Step 3: Manuell verifiering**

```bash
npm run dev
```

Öppna `http://localhost:5173/login` → ser inloggningssida.
Öppna `http://localhost:5173/kund` (utan inloggning) → redirectas till `/login`.
Öppna `http://localhost:5173/` → vanlig Staffanstorp-sida, INGEN länk till `/login` ska finnas.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/pages/CustomerDashboardPage.tsx
git commit -m "feat(customer): wire customer routes in App.tsx"
```

---

## Phase 2 — Admin kund-management

### Task 8: CustomersTab i admin — lista, skapa, redigera kund

**Goal:** Admin kan se alla kunder, skapa en ny kund (med email + namn + telefon + adress + 1+ kopplade hundar), redigera, sätta `invite_status='disabled'`.

**Files:**
- Create: `src/components/admin/CustomersTab.tsx`
- Modify: `src/components/AdminPage.tsx` (registrera ny `AdminView = 'customers'`, lägg till menyobjekt och case i switch)
- Modify: `src/lib/database.ts` (lägg till `getCustomers`, `saveCustomer`, `deleteCustomer`, `linkCustomerToDog`, `unlinkCustomerFromDog`)

**Acceptance Criteria:**
- [ ] Ny tab "Kunder" i admin-menyn
- [ ] Listvy med kolumner: namn, email, telefon, antal hundar, `invite_status`, åtgärder
- [ ] Skapa-formulär: namn, email, telefon, adress, multi-select av befintliga hundar
- [ ] Redigeringsformulär för befintliga kunder
- [ ] Inbjudningsknapp finns men gör inget än (Task 9 kopplar in det)

**Verify:** Logga in som admin → klicka "Kunder" → skapa testkund → ser den i listan.

**Steps:**

- [ ] **Step 1: Lägg till database.ts-helpers**

I `src/lib/database.ts`, lägg till längst ner:

```ts
import type { Database } from './database.types';

export type Customer = Database['public']['Tables']['customers']['Row'];
export type CustomerInsert = Database['public']['Tables']['customers']['Insert'];

export const getCustomers = async (): Promise<Customer[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data ?? [];
};

export const saveCustomer = async (c: CustomerInsert & { id?: string }) => {
  if (!supabase) throw new Error('Supabase ej konfigurerad');
  if (c.id) {
    const { id, ...rest } = c;
    const { data, error } = await supabase.from('customers').update(rest).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from('customers').insert(c).select().single();
  if (error) throw error;
  return data;
};

export const deleteCustomer = async (id: string) => {
  if (!supabase) throw new Error('Supabase ej konfigurerad');
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) throw error;
};

export const getCustomerDogIds = async (customerId: string): Promise<string[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('customer_dogs')
    .select('dog_id')
    .eq('customer_id', customerId);
  if (error) { console.error(error); return []; }
  return (data ?? []).map(r => r.dog_id);
};

export const setCustomerDogs = async (customerId: string, dogIds: string[]) => {
  if (!supabase) throw new Error('Supabase ej konfigurerad');
  // Replace-strategi: ta bort befintliga, lägg till nya
  await supabase.from('customer_dogs').delete().eq('customer_id', customerId);
  if (dogIds.length === 0) return;
  const rows = dogIds.map(dog_id => ({ customer_id: customerId, dog_id }));
  const { error } = await supabase.from('customer_dogs').insert(rows);
  if (error) throw error;
};
```

- [ ] **Step 2: Skapa `src/components/admin/CustomersTab.tsx`**

Lång komponent — visar lista, har modal för skapa/redigera, hundkopplingar. Skissa det här (förkorta inte i den faktiska impl):

```tsx
import { useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash, FaUserPlus } from 'react-icons/fa';
import {
  getCustomers, saveCustomer, deleteCustomer,
  getCustomerDogIds, setCustomerDogs,
  getDogs, type Customer
} from '../../lib/database';

type Dog = Awaited<ReturnType<typeof getDogs>>[number];

export default function CustomersTab() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [editing, setEditing] = useState<Partial<Customer> & { dogIds?: string[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const [c, d] = await Promise.all([getCustomers(), getDogs()]);
    setCustomers(c);
    setDogs(d);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const startNew = () => setEditing({
    name: '', email: '', phone: '', address: '', city: '',
    invite_status: 'not_invited', dogIds: []
  });

  const startEdit = async (c: Customer) => {
    const dogIds = await getCustomerDogIds(c.id);
    setEditing({ ...c, dogIds });
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.email || !editing.name) {
      alert('Namn och e-post krävs');
      return;
    }
    const { dogIds, ...rest } = editing;
    const saved = await saveCustomer(rest as any);
    await setCustomerDogs(saved.id, dogIds ?? []);
    setEditing(null);
    refresh();
  };

  const remove = async (id: string) => {
    if (!confirm('Ta bort kund? Bokningar och kopplingar tas också bort.')) return;
    await deleteCustomer(id);
    refresh();
  };

  if (loading) return <div>Laddar kunder…</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Kunder</h2>
        <button onClick={startNew}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90">
          <FaPlus /> Ny kund
        </button>
      </div>

      <table className="w-full bg-white rounded-lg overflow-hidden">
        <thead className="bg-gray-50">
          <tr className="text-left text-sm">
            <th className="p-3">Namn</th>
            <th className="p-3">E-post</th>
            <th className="p-3">Telefon</th>
            <th className="p-3">Status</th>
            <th className="p-3 text-right">Åtgärder</th>
          </tr>
        </thead>
        <tbody>
          {customers.map(c => (
            <tr key={c.id} className="border-t">
              <td className="p-3">{c.name}</td>
              <td className="p-3">{c.email}</td>
              <td className="p-3">{c.phone || '—'}</td>
              <td className="p-3">
                <StatusBadge status={c.invite_status} />
              </td>
              <td className="p-3 text-right space-x-2">
                <button onClick={() => startEdit(c)} title="Redigera" className="text-gray-600 hover:text-primary">
                  <FaEdit />
                </button>
                {c.invite_status === 'not_invited' && (
                  <button
                    onClick={() => alert('Invite kopplas in i Task 9')}
                    title="Bjud in"
                    className="text-gray-600 hover:text-primary"
                  >
                    <FaUserPlus />
                  </button>
                )}
                <button onClick={() => remove(c.id)} title="Ta bort" className="text-red-500 hover:text-red-700">
                  <FaTrash />
                </button>
              </td>
            </tr>
          ))}
          {customers.length === 0 && (
            <tr><td colSpan={5} className="p-8 text-center text-gray-500">Inga kunder ännu</td></tr>
          )}
        </tbody>
      </table>

      {editing && (
        <CustomerEditorModal
          editing={editing}
          dogs={dogs}
          onChange={setEditing}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string,string> = {
    not_invited: 'bg-gray-100 text-gray-700',
    invited: 'bg-yellow-100 text-yellow-800',
    accepted: 'bg-green-100 text-green-800',
    disabled: 'bg-red-100 text-red-800',
  };
  const labels: Record<string,string> = {
    not_invited: 'Inte inbjuden',
    invited: 'Inbjuden',
    accepted: 'Aktiv',
    disabled: 'Inaktiverad',
  };
  return <span className={`px-2 py-1 rounded text-xs ${colors[status] ?? ''}`}>{labels[status] ?? status}</span>;
}

function CustomerEditorModal(props: {
  editing: any;
  dogs: Dog[];
  onChange: (c: any) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const { editing, dogs, onChange, onSave, onClose } = props;
  const toggleDog = (id: string) => {
    const set = new Set(editing.dogIds ?? []);
    set.has(id) ? set.delete(id) : set.add(id);
    onChange({ ...editing, dogIds: [...set] });
  };
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">{editing.id ? 'Redigera kund' : 'Ny kund'}</h3>
        <div className="space-y-3">
          <Field label="Namn *" value={editing.name ?? ''}
                 onChange={v => onChange({ ...editing, name: v })} />
          <Field label="E-post *" type="email" value={editing.email ?? ''}
                 onChange={v => onChange({ ...editing, email: v })} />
          <Field label="Telefon" value={editing.phone ?? ''}
                 onChange={v => onChange({ ...editing, phone: v })} />
          <Field label="Adress" value={editing.address ?? ''}
                 onChange={v => onChange({ ...editing, address: v })} />
          <Field label="Stad" value={editing.city ?? ''}
                 onChange={v => onChange({ ...editing, city: v })} />

          <div>
            <span className="text-sm font-medium">Kopplade hundar</span>
            <div className="mt-2 max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
              {dogs.map(d => (
                <label key={d.id} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox"
                         checked={(editing.dogIds ?? []).includes(d.id)}
                         onChange={() => toggleDog(d.id)} />
                  <span>{d.name} ({d.breed})</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-600">Avbryt</button>
          <button onClick={onSave} className="px-4 py-2 bg-primary text-white rounded-lg">Spara</button>
        </div>
      </div>
    </div>
  );
}

function Field(props: { label: string; type?: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{props.label}</span>
      <input
        type={props.type ?? 'text'}
        value={props.value}
        onChange={e => props.onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border-gray-300"
      />
    </label>
  );
}
```

- [ ] **Step 3: Lägg till tab i AdminPage**

I `src/components/AdminPage.tsx`:

(a) Utöka `AdminView`-typen på rad 155:
```ts
type AdminView = '...befintliga...' | 'customers';
```

(b) Lägg till `import CustomersTab from './admin/CustomersTab';` i toppen.

(c) Lägg till menyobjekt i sidebar (sök efter befintliga `setCurrentView('dogs')`-knappar — följ samma mönster). Förslag: under "Hundar".

(d) Lägg till case i `switch (currentView)` på rad ~7541:
```tsx
case 'customers':
  return <CustomersTab />;
```

(e) Lägg till titel i header-mappen på rad ~8028:
```tsx
currentView === 'customers' ? 'Kunder' :
```

- [ ] **Step 4: Manuell test + commit**

```bash
npm run dev
# Logga in på /admin, gå till "Kunder", skapa en testkund, redigera, ta bort.
```

```bash
git add src/components/admin/CustomersTab.tsx src/components/AdminPage.tsx src/lib/database.ts
git commit -m "feat(admin): add CustomersTab with create/edit/delete and dog linking"
```

---

### Task 9: Edge Function `invite-customer` + "Bjud in"-knapp

**Goal:** Admin trycker "Bjud in" → Edge Function (service_role) skickar invite-mejl via Supabase Auth → `invite_status='invited'`.

**Files:**
- Create: `supabase/functions/invite-customer/index.ts`
- Modify: `src/lib/database.ts` (lägg till `inviteCustomer`)
- Modify: `src/components/admin/CustomersTab.tsx` (koppla in den)

**Acceptance Criteria:**
- [ ] Edge function deployad
- [ ] Function tar `{ customer_id }`, läser email från `customers`, anropar `auth.admin.inviteUserByEmail`, uppdaterar `invite_status` och `invited_at`
- [ ] Kräver inloggad admin (kollar request headers)
- [ ] "Bjud in"-knappen i CustomersTab kör funktionen och visar success/error

**Verify:** Skapa testkund med en email-adress du äger → "Bjud in" → kolla att invite-mejl kommer in.

**Steps:**

- [ ] **Step 1: Skapa edge function-fil**

`supabase/functions/invite-customer/index.ts`:

```ts
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SITE_URL = Deno.env.get('SITE_URL') ?? 'http://localhost:5173';

Deno.serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

  // 1. Verifiera att anroparen är admin via deras JWT
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing token' }), { status: 401, headers: cors });
  }
  const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { authorization: authHeader } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: cors });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: adminRow } = await admin.from('admin_users').select('id').eq('id', user.id).maybeSingle();
  if (!adminRow) {
    return new Response(JSON.stringify({ error: 'Forbidden — admin only' }), { status: 403, headers: cors });
  }

  // 2. Läs customer_id ur body
  let body: { customer_id?: string } = {};
  try { body = await req.json(); } catch {}
  if (!body.customer_id) {
    return new Response(JSON.stringify({ error: 'customer_id krävs' }), { status: 400, headers: cors });
  }

  const { data: customer, error: cErr } = await admin
    .from('customers').select('id, email, invite_status').eq('id', body.customer_id).single();
  if (cErr || !customer) {
    return new Response(JSON.stringify({ error: 'Kund hittades inte' }), { status: 404, headers: cors });
  }
  if (customer.invite_status === 'accepted') {
    return new Response(JSON.stringify({ error: 'Kund har redan accepterat inbjudan' }), { status: 400, headers: cors });
  }

  // 3. Skicka invite
  const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(customer.email, {
    redirectTo: `${SITE_URL}/login/accept-invite`,
  });
  if (inviteErr) {
    return new Response(JSON.stringify({ error: inviteErr.message }), { status: 500, headers: cors });
  }

  // 4. Uppdatera customer
  await admin.from('customers')
    .update({ invite_status: 'invited', invited_at: new Date().toISOString() })
    .eq('id', customer.id);

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
});
```

- [ ] **Step 2: Deploya via MCP**

```
mcp__supabase__deploy_edge_function name="invite-customer" files=[{ name: "index.ts", content: "<innehållet ovan>" }]
```

Sätt `SITE_URL` som secret i Supabase-dashboard senare när vi har en faktisk produktions-URL. Lokalt funkar default `http://localhost:5173`.

- [ ] **Step 3: Lägg till frontend-helper i `src/lib/database.ts`**

```ts
export const inviteCustomer = async (customerId: string): Promise<{ ok: boolean; error?: string }> => {
  if (!supabase) return { ok: false, error: 'Supabase ej konfigurerad' };
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, error: 'Ej inloggad' };
  const url = `${(supabase as any).supabaseUrl}/functions/v1/invite-customer`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${session.access_token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ customer_id: customerId }),
  });
  const json = await res.json();
  if (!res.ok) return { ok: false, error: json.error };
  return { ok: true };
};
```

- [ ] **Step 4: Koppla in knappen i CustomersTab**

I `CustomersTab.tsx`, byt ut placeholdern:

```tsx
import { inviteCustomer } from '../../lib/database';

// ... i komponenten:
const invite = async (id: string) => {
  if (!confirm('Skicka inbjudan till denna kund?')) return;
  const res = await inviteCustomer(id);
  if (!res.ok) {
    alert(`Misslyckades: ${res.error}`);
    return;
  }
  alert('Inbjudan skickad!');
  refresh();
};

// och knappen:
<button onClick={() => invite(c.id)} title="Bjud in" className="text-gray-600 hover:text-primary">
  <FaUserPlus />
</button>
```

- [ ] **Step 5: Manuell test**

Skapa testkund med din egen email → klicka Bjud in → kolla att mejl kommer → klicka länken → AcceptInvitePage öppnas → sätt lösen → redirect till `/kund`.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/invite-customer/ src/lib/database.ts src/components/admin/CustomersTab.tsx
git commit -m "feat(customer): add invite-customer edge function and admin invite button"
```

---

## Phase 3 — Kund-dashboard och hund-info

### Task 10: CustomerDashboardPage med hundlista

**Goal:** Inloggad kund ser sin(a) hund(ar) som klickbara kort.

**Files:**
- Modify: `src/pages/CustomerDashboardPage.tsx`
- Create: `src/lib/customerApi.ts` (kundsidans data-helpers)

**Acceptance Criteria:**
- [ ] Hälsning "Hej, {namn}!"
- [ ] Lista av hundkort: foto (eller initial), namn, typ
- [ ] Klick på kort → navigerar till `/kund/hund/:id`

**Verify:** Logga in som kund → ser sina hundar.

**Steps:**

- [ ] **Step 1: Skapa `src/lib/customerApi.ts`**

```ts
import { supabase } from './supabase';
import type { Database } from './database.types';

export type Dog = Database['public']['Tables']['dogs']['Row'];

export const getMyDogs = async (): Promise<Dog[]> => {
  if (!supabase) return [];
  // RLS sköter filtreringen — vi får bara våra egna hundar
  const { data: links, error: linkErr } = await supabase
    .from('customer_dogs')
    .select('dog_id');
  if (linkErr || !links?.length) return [];
  const dogIds = links.map(l => l.dog_id);
  const { data, error } = await supabase
    .from('dogs')
    .select('*')
    .in('id', dogIds)
    .eq('is_active', true);
  if (error) { console.error(error); return []; }
  return data ?? [];
};

export const getMyDog = async (dogId: string): Promise<Dog | null> => {
  if (!supabase) return null;
  const { data, error } = await supabase.from('dogs').select('*').eq('id', dogId).maybeSingle();
  if (error) { console.error(error); return null; }
  return data;
};
```

- [ ] **Step 2: Skriv om `CustomerDashboardPage.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CustomerLayout from '../components/customer/CustomerLayout';
import { getMyDogs, type Dog } from '../lib/customerApi';
import { getCustomerForUser } from '../lib/customerAuth';

const TYPE_LABEL: Record<string,string> = {
  fulltime: 'Heltid',
  'parttime-3': 'Deltid (3 dgr)',
  'parttime-2': 'Deltid (2 dgr)',
  singleDay: 'Enstaka dag',
  boarding: 'Pensionat',
};

export default function CustomerDashboardPage() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMyDogs(), getCustomerForUser()]).then(([d, c]) => {
      setDogs(d);
      setName(c?.name ?? '');
      setLoading(false);
    });
  }, []);

  return (
    <CustomerLayout>
      <h1 className="text-2xl font-bold mb-1">Hej, {name || 'där'}!</h1>
      <p className="text-gray-600 mb-6">Här är dina hundar.</p>

      {loading ? (
        <p>Laddar…</p>
      ) : dogs.length === 0 ? (
        <p className="text-gray-500">Inga hundar kopplade till ditt konto än. Kontakta oss om det är fel.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {dogs.map(d => (
            <Link
              key={d.id}
              to={`/kund/hund/${d.id}`}
              className="bg-white rounded-2xl shadow hover:shadow-lg transition p-4 flex items-center gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-2xl font-bold text-gray-500">
                {d.photo_url
                  ? <img src={d.photo_url} alt={d.name} className="w-full h-full object-cover" />
                  : d.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold">{d.name}</p>
                <p className="text-sm text-gray-500">{d.breed}</p>
                {d.type && <p className="text-xs text-primary mt-1">{TYPE_LABEL[d.type] ?? d.type}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </CustomerLayout>
  );
}
```

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add src/lib/customerApi.ts src/pages/CustomerDashboardPage.tsx
git commit -m "feat(customer): add customer dashboard with dog cards"
```

---

### Task 11: CustomerDogPage med flikar (Info / Kalender / Meddelanden / Kontrakt)

**Goal:** Detaljsida för en specifik hund. Tab-navigation; varje flik är egen komponent som vi fyller i senare tasks.

**Files:**
- Create: `src/pages/CustomerDogPage.tsx`
- Create: `src/components/customer/DogInfoTab.tsx` (placeholder + grunddata)
- Create: `src/components/customer/BookingCalendar.tsx` (placeholder)
- Create: `src/components/customer/MessagesTab.tsx` (placeholder)
- Create: `src/components/customer/ContractView.tsx` (placeholder)
- Modify: `src/App.tsx` (lägg till route)

**Acceptance Criteria:**
- [ ] `/kund/hund/:id` visar tabs
- [ ] Klick på tab byter innehåll utan reload
- [ ] DogInfoTab visar minst hundens namn, ras, ålder

**Verify:** Manuell test.

**Steps:**

- [ ] **Step 1: Skapa `src/pages/CustomerDogPage.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import CustomerLayout from '../components/customer/CustomerLayout';
import DogInfoTab from '../components/customer/DogInfoTab';
import BookingCalendar from '../components/customer/BookingCalendar';
import MessagesTab from '../components/customer/MessagesTab';
import ContractView from '../components/customer/ContractView';
import { getMyDog, type Dog } from '../lib/customerApi';

type TabKey = 'info' | 'calendar' | 'messages' | 'contract';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'info', label: 'Info' },
  { key: 'calendar', label: 'Kalender' },
  { key: 'messages', label: 'Meddelanden' },
  { key: 'contract', label: 'Kontrakt' },
];

export default function CustomerDogPage() {
  const { id } = useParams<{ id: string }>();
  const [dog, setDog] = useState<Dog | null>(null);
  const [tab, setTab] = useState<TabKey>('info');

  useEffect(() => {
    if (!id) return;
    getMyDog(id).then(setDog);
  }, [id]);

  if (!dog) return <CustomerLayout><p>Laddar…</p></CustomerLayout>;

  return (
    <CustomerLayout>
      <Link to="/kund" className="inline-flex items-center gap-2 text-sm text-gray-600 mb-4 hover:text-primary">
        <FaArrowLeft /> Tillbaka
      </Link>
      <h1 className="text-2xl font-bold mb-1">{dog.name}</h1>
      <p className="text-gray-500 mb-4">{dog.breed} · {dog.age} år</p>

      <div className="border-b mb-4">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                      tab === t.key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'info' && <DogInfoTab dog={dog} onUpdate={setDog} />}
      {tab === 'calendar' && <BookingCalendar dog={dog} />}
      {tab === 'messages' && <MessagesTab dog={dog} />}
      {tab === 'contract' && <ContractView dog={dog} />}
    </CustomerLayout>
  );
}
```

- [ ] **Step 2: Skapa placeholder-flikar**

`src/components/customer/DogInfoTab.tsx`:

```tsx
import type { Dog } from '../../lib/customerApi';
export default function DogInfoTab({ dog }: { dog: Dog; onUpdate?: (d: Dog) => void }) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="font-semibold mb-3">Grundinfo</h2>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-gray-500">Namn</dt><dd>{dog.name}</dd></div>
        <div><dt className="text-gray-500">Ras</dt><dd>{dog.breed}</dd></div>
        <div><dt className="text-gray-500">Ålder</dt><dd>{dog.age}</dd></div>
        <div><dt className="text-gray-500">Telefon</dt><dd>{dog.phone}</dd></div>
      </dl>
      <p className="mt-4 text-xs text-gray-400">Foto, redigering och anteckningar kommer i Task 12-14.</p>
    </div>
  );
}
```

`BookingCalendar.tsx`, `MessagesTab.tsx`, `ContractView.tsx` får liknande placeholders med "Implementeras i Task X".

- [ ] **Step 3: Lägg till route i `App.tsx`**

```tsx
const CustomerDogPage = lazy(() => import('./pages/CustomerDogPage'))

// i Routes:
<Route path="/kund/hund/:id" element={
  <Suspense fallback={<div className="h-screen flex items-center justify-center">Laddar…</div>}>
    <ProtectedCustomerRoute><CustomerDogPage /></ProtectedCustomerRoute>
  </Suspense>
} />
```

- [ ] **Step 4: Build + commit**

```bash
npm run build
git add src/pages/CustomerDogPage.tsx src/components/customer/ src/App.tsx
git commit -m "feat(customer): add dog detail page with tab navigation and placeholders"
```

---

### Task 12: DogInfoTab — visa+redigera grundinfo

**Goal:** Kunden kan ändra phone, email, address, försäkring, chip-nr direkt.

**Files:**
- Modify: `src/components/customer/DogInfoTab.tsx`
- Modify: `src/lib/customerApi.ts` (lägg till `updateMyDog`)

**Acceptance Criteria:**
- [ ] "Redigera"-knapp visar formulär
- [ ] Spara skriver tillbaka till `dogs`-tabellen
- [ ] RLS-policy "customers update own dogs limited" tillåter detta

**Verify:** Manuell test som kund.

**Steps:**

- [ ] **Step 1: Lägg till `updateMyDog` i `customerApi.ts`**

```ts
export const updateMyDog = async (
  dogId: string,
  changes: Partial<Database['public']['Tables']['dogs']['Update']>
) => {
  if (!supabase) throw new Error('Supabase ej konfigurerad');
  const { data, error } = await supabase.from('dogs').update(changes).eq('id', dogId).select().single();
  if (error) throw error;
  return data;
};
```

- [ ] **Step 2: Skriv om `DogInfoTab.tsx`**

Lägg in redigeringsläge med fält för: phone, email, owner_address, owner_city, insurance_company, insurance_number, chip_number. Använd kontrollerat formulär; spara via `updateMyDog`.

```tsx
import { useState } from 'react';
import { FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import type { Dog } from '../../lib/customerApi';
import { updateMyDog } from '../../lib/customerApi';

export default function DogInfoTab({ dog, onUpdate }: { dog: Dog; onUpdate: (d: Dog) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<Dog>>(dog);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateMyDog(dog.id, {
        phone: draft.phone, email: draft.email,
        owner_address: draft.owner_address, owner_city: draft.owner_city,
        insurance_company: draft.insurance_company, insurance_number: draft.insurance_number,
        chip_number: draft.chip_number,
      });
      onUpdate(updated as Dog);
      setEditing(false);
    } catch (e: any) {
      alert(`Kunde inte spara: ${e.message}`);
    }
    setSaving(false);
  };

  if (!editing) {
    return (
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex justify-between mb-3">
          <h2 className="font-semibold">Grundinfo</h2>
          <button onClick={() => { setDraft(dog); setEditing(true); }}
                  className="flex items-center gap-2 text-sm text-primary hover:underline">
            <FaEdit /> Redigera
          </button>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Item k="Namn" v={dog.name} />
          <Item k="Ras" v={dog.breed} />
          <Item k="Ålder" v={dog.age} />
          <Item k="Telefon" v={dog.phone} />
          <Item k="E-post" v={dog.email} />
          <Item k="Adress" v={dog.owner_address} />
          <Item k="Stad" v={dog.owner_city} />
          <Item k="Försäkringsbolag" v={dog.insurance_company} />
          <Item k="Försäkringsnr" v={dog.insurance_number} />
          <Item k="Chip-nr" v={dog.chip_number} />
        </dl>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <div className="flex justify-between mb-3">
        <h2 className="font-semibold">Redigera grundinfo</h2>
        <div className="flex gap-2">
          <button onClick={() => setEditing(false)} className="text-gray-500"><FaTimes /></button>
          <button onClick={save} disabled={saving} className="text-primary"><FaSave /></button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          ['phone', 'Telefon'], ['email', 'E-post'],
          ['owner_address', 'Adress'], ['owner_city', 'Stad'],
          ['insurance_company', 'Försäkringsbolag'], ['insurance_number', 'Försäkringsnr'],
          ['chip_number', 'Chip-nr'],
        ].map(([key, label]) => (
          <label key={key} className="block">
            <span className="text-xs text-gray-500">{label}</span>
            <input
              value={(draft as any)[key] ?? ''}
              onChange={e => setDraft({ ...draft, [key]: e.target.value })}
              className="mt-1 w-full rounded-lg border-gray-300"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function Item({ k, v }: { k: string; v: string | null | undefined }) {
  return <div><dt className="text-gray-500 text-xs">{k}</dt><dd>{v || '—'}</dd></div>;
}
```

- [ ] **Step 3: Build + manuell test + commit**

```bash
npm run build
git add src/components/customer/DogInfoTab.tsx src/lib/customerApi.ts
git commit -m "feat(customer): allow editing dog basic info in DogInfoTab"
```

---

### Task 13: Foto-upload till storage bucket

**Goal:** Kund kan ladda upp en bild på sin hund som visas i dashboard + DogInfoTab.

**Files:**
- Modify: `src/components/customer/DogInfoTab.tsx`
- Modify: `src/lib/customerApi.ts` (lägg till `uploadDogPhoto`)

**Acceptance Criteria:**
- [ ] Klick på platsen där bilden ska vara öppnar filväljare
- [ ] Validering: max 5 MB, jpg/png/webp
- [ ] Efter upload: `dogs.photo_url` uppdaterad, bilden visas

**Verify:** Manuell test.

**Steps:**

- [ ] **Step 1: Lägg till `uploadDogPhoto` i `customerApi.ts`**

```ts
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

export const uploadDogPhoto = async (dogId: string, file: File): Promise<string> => {
  if (!supabase) throw new Error('Supabase ej konfigurerad');
  if (file.size > MAX_SIZE) throw new Error('Max filstorlek 5 MB');
  if (!ALLOWED.includes(file.type)) throw new Error('Endast JPG/PNG/WEBP');

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${dogId}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from('dog-photos').upload(path, file, { upsert: true });
  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from('dog-photos').getPublicUrl(path);
  const url = pub.publicUrl;
  await supabase.from('dogs').update({ photo_url: url }).eq('id', dogId);
  return url;
};
```

- [ ] **Step 2: Lägg till foto-uploader i DogInfoTab**

I komponenten, ovanför `<dl>`-listan:

```tsx
<div className="flex items-center gap-4 mb-4">
  <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-3xl text-gray-500">
    {dog.photo_url
      ? <img src={dog.photo_url} alt={dog.name} className="w-full h-full object-cover" />
      : dog.name?.[0]?.toUpperCase()}
  </div>
  <label className="text-sm text-primary cursor-pointer hover:underline">
    Byt foto
    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
           onChange={async (e) => {
             const f = e.target.files?.[0];
             if (!f) return;
             try {
               const url = await uploadDogPhoto(dog.id, f);
               onUpdate({ ...dog, photo_url: url });
             } catch (err: any) {
               alert(err.message);
             }
           }} />
  </label>
</div>
```

(Glöm inte `import { uploadDogPhoto } from '../../lib/customerApi';`.)

- [ ] **Step 3: Build + manuell test + commit**

```bash
npm run build
git add src/components/customer/DogInfoTab.tsx src/lib/customerApi.ts
git commit -m "feat(customer): allow uploading dog photo to storage"
```

---

### Task 14: Kund-anteckningar (medicinsk info, kost, etc.)

**Goal:** Stort textfält där kunden kan skriva fritt om hunden. Sparas i `dogs.customer_notes`.

**Files:**
- Modify: `src/components/customer/DogInfoTab.tsx`

**Acceptance Criteria:**
- [ ] Sektion "Mina anteckningar" under grunddata
- [ ] Sparar via samma `updateMyDog`
- [ ] Auto-save eller "Spara"-knapp (välj knapp för enkelhet)

**Verify:** Manuell test.

**Steps:**

- [ ] **Step 1: Lägg till sektion i DogInfoTab**

I läge `editing=false`-vyn, efter `<dl>`-blocket:

```tsx
<div className="mt-6 border-t pt-4">
  <h3 className="font-semibold mb-2">Mina anteckningar</h3>
  <CustomerNotesEditor dog={dog} onUpdate={onUpdate} />
</div>
```

Lägg till sub-komponent i samma fil:

```tsx
function CustomerNotesEditor({ dog, onUpdate }: { dog: Dog; onUpdate: (d: Dog) => void }) {
  const [text, setText] = useState(dog.customer_notes ?? '');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateMyDog(dog.id, { customer_notes: text });
      onUpdate(updated as Dog);
      setDirty(false);
    } catch (e: any) {
      alert(e.message);
    }
    setSaving(false);
  };

  return (
    <div>
      <textarea
        value={text}
        onChange={e => { setText(e.target.value); setDirty(true); }}
        rows={4}
        placeholder="T.ex. allergier, mediciner, mat, beteenden personalen bör känna till…"
        className="w-full rounded-lg border-gray-300"
      />
      {dirty && (
        <button onClick={save} disabled={saving}
                className="mt-2 bg-primary text-white px-4 py-2 rounded-lg text-sm">
          {saving ? 'Sparar…' : 'Spara anteckningar'}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add src/components/customer/DogInfoTab.tsx
git commit -m "feat(customer): add customer notes textarea for dog"
```

---

## Phase 4 — Bokningskalender

### Task 15: bookingHelpers + recurring_schedule i admin

**Goal:** Logik för att generera vilka dagar en hund är inbokad i en given månad (recurring + bookings + cancellations). Plus en enkel UI i admin för att sätta `recurring_schedule` per hund.

**Files:**
- Create: `src/lib/bookingHelpers.ts`
- Modify: `src/components/AdminPage.tsx` eller `src/components/admin/CustomersTab.tsx` — välj att lägga schemat antingen direkt på hund-redigering eller på kund-modalen. **Beslut:** lägg i kund-modalen (CustomerEditorModal) under hund-kopplingen för att hålla det samlat.

**Acceptance Criteria:**
- [ ] `getDaysForMonth(dogId, year, month)` returnerar array av dagar med status (`scheduled`/`extra`/`cancelled`/`pending`/`rejected`)
- [ ] Admin kan toggla veckodagar per hund (mån-sön)
- [ ] Sparas i `recurring_schedule`

**Verify:** Console-test + manuell UI-test.

**Steps:**

- [ ] **Step 1: Skapa `src/lib/bookingHelpers.ts`**

```ts
import { supabase } from './supabase';

export type DayStatus = 'scheduled' | 'extra' | 'cancelled' | 'pending' | 'rejected' | 'boarding' | 'none';

export type DayInfo = {
  date: string; // YYYY-MM-DD
  weekday: number; // 0=mån
  status: DayStatus;
  bookingId?: string;
  notes?: string;
};

const pad = (n: number) => n.toString().padStart(2, '0');
const isoDate = (y: number, m: number, d: number) => `${y}-${pad(m+1)}-${pad(d)}`;

// JS getDay(): 0=söndag, 6=lördag. Vi vill 0=måndag, 6=söndag.
const toMonFirst = (jsDay: number) => (jsDay + 6) % 7;

export const getDaysForMonth = async (
  dogId: string,
  year: number,
  month: number // 0-indexed
): Promise<DayInfo[]> => {
  if (!supabase) return [];

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const start = isoDate(year, month, 1);
  const end = isoDate(year, month, lastDay.getDate());

  const [schedRes, bookingsRes] = await Promise.all([
    supabase.from('recurring_schedule').select('weekday').eq('dog_id', dogId).eq('active', true),
    supabase.from('bookings').select('*').eq('dog_id', dogId).lte('start_date', end).gte('end_date', start),
  ]);

  const recurring = new Set((schedRes.data ?? []).map(r => r.weekday as number));
  const bookings = bookingsRes.data ?? [];

  const days: DayInfo[] = [];
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = isoDate(year, month, d);
    const weekday = toMonFirst(new Date(year, month, d).getDay());
    // Hitta booking som täcker denna dag
    const booking = bookings.find(b => b.start_date <= dateStr && b.end_date >= dateStr);
    let status: DayStatus = 'none';
    if (booking) {
      status = booking.booking_type === 'boarding' ? 'boarding'
        : booking.booking_type === 'single_day' && booking.status === 'pending' ? 'pending'
        : booking.status === 'pending' ? 'pending'
        : booking.status === 'rejected' ? 'rejected'
        : booking.booking_type === 'cancelled' || booking.status === 'cancelled' ? 'cancelled'
        : booking.booking_type === 'extra' ? 'extra'
        : 'scheduled';
    } else if (recurring.has(weekday)) {
      status = 'scheduled';
    }
    days.push({
      date: dateStr,
      weekday,
      status,
      bookingId: booking?.id,
      notes: booking?.notes ?? undefined,
    });
  }
  return days;
};

export const upsertBooking = async (params: {
  id?: string;
  dog_id: string;
  customer_id: string;
  start_date: string;
  end_date: string;
  booking_type: 'scheduled' | 'extra' | 'cancelled' | 'boarding' | 'single_day';
  status?: 'confirmed' | 'pending' | 'rejected' | 'cancelled';
  notes?: string;
}) => {
  if (!supabase) throw new Error('Supabase ej konfigurerad');
  const row = {
    ...params,
    status: params.status ?? (params.booking_type === 'boarding' || params.booking_type === 'single_day' ? 'pending' : 'confirmed'),
  };
  if (row.id) {
    const { id, ...rest } = row;
    const { data, error } = await supabase.from('bookings').update(rest).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from('bookings').insert(row).select().single();
  if (error) throw error;
  return data;
};

export const deleteBooking = async (id: string) => {
  if (!supabase) throw new Error('Supabase ej konfigurerad');
  const { error } = await supabase.from('bookings').delete().eq('id', id);
  if (error) throw error;
};

export const setRecurringSchedule = async (dogId: string, weekdays: number[]) => {
  if (!supabase) throw new Error('Supabase ej konfigurerad');
  await supabase.from('recurring_schedule').delete().eq('dog_id', dogId);
  if (!weekdays.length) return;
  await supabase.from('recurring_schedule').insert(
    weekdays.map(w => ({ dog_id: dogId, weekday: w, active: true }))
  );
};

export const getRecurringSchedule = async (dogId: string): Promise<number[]> => {
  if (!supabase) return [];
  const { data } = await supabase.from('recurring_schedule').select('weekday').eq('dog_id', dogId).eq('active', true);
  return (data ?? []).map(r => r.weekday as number);
};
```

- [ ] **Step 2: Lägg till veckodags-toggle i CustomerEditorModal**

Vi behöver veta vilken hund schemat gäller; eftersom kunder kan ha flera hundar lägger vi det per hund. Vi kan skippa det i v1 om det blir tungt — då hanteras schemat på hund-detaljvyn för admin (befintlig "redigera hund"). **Förslag:** håll det enkelt: under hund-kopplingen i kund-modalen, för varje vald hund visa 7 knappar (M-S) för fasta dagar.

Tillägg i `CustomerEditorModal`:

```tsx
import { getRecurringSchedule, setRecurringSchedule } from '../../lib/bookingHelpers';

// Inom komponenten:
const [schedules, setSchedules] = useState<Record<string, number[]>>({});

useEffect(() => {
  const load = async () => {
    const result: Record<string, number[]> = {};
    for (const did of editing.dogIds ?? []) {
      result[did] = await getRecurringSchedule(did);
    }
    setSchedules(result);
  };
  load();
}, [editing.dogIds]);

const toggleWeekday = (dogId: string, w: number) => {
  const cur = schedules[dogId] ?? [];
  const next = cur.includes(w) ? cur.filter(x => x !== w) : [...cur, w];
  setSchedules({ ...schedules, [dogId]: next });
};

// Modifiera save-handlern:
const saveOriginal = save;
save = async () => {
  await saveOriginal();
  for (const [dogId, weekdays] of Object.entries(schedules)) {
    await setRecurringSchedule(dogId, weekdays);
  }
};
```

Och UI under hund-multiselect:

```tsx
{(editing.dogIds ?? []).map((id: string) => {
  const dog = dogs.find(d => d.id === id);
  if (!dog) return null;
  const sched = schedules[id] ?? [];
  return (
    <div key={id} className="mt-2 p-2 bg-gray-50 rounded-lg text-xs">
      <p className="font-medium mb-1">{dog.name} — fasta dagar:</p>
      <div className="flex gap-1">
        {['M','T','O','T','F','L','S'].map((label, w) => (
          <button key={w} type="button"
                  onClick={() => toggleWeekday(id, w)}
                  className={`w-7 h-7 rounded ${sched.includes(w) ? 'bg-primary text-white' : 'bg-white border'}`}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
})}
```

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add src/lib/bookingHelpers.ts src/components/admin/CustomersTab.tsx
git commit -m "feat(booking): add booking helpers and recurring schedule UI in admin"
```

---

### Task 16: BookingCalendar — kalendervy för kunden

**Goal:** Månadsvy där fasta dagar är gröna, extra-dagar gröna med markör, avbokade grå, pending gula. Kund kan klicka för åtgärder.

**Files:**
- Modify: `src/components/customer/BookingCalendar.tsx`

**Acceptance Criteria:**
- [ ] Visar nuvarande månad
- [ ] Pilar för föregående/nästa månad
- [ ] Färgkodade dagar
- [ ] Klick på dag → popover med åtgärder beroende på dagens status

**Verify:** Manuell test.

**Steps:**

- [ ] **Step 1: Skriv om `BookingCalendar.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import type { Dog } from '../../lib/customerApi';
import { getCustomerForUser } from '../../lib/customerAuth';
import {
  getDaysForMonth, upsertBooking, deleteBooking, type DayInfo, type DayStatus
} from '../../lib/bookingHelpers';

const MONTHS = ['Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December'];
const WEEKDAYS = ['Mån','Tis','Ons','Tor','Fre','Lör','Sön'];

const STATUS_STYLE: Record<DayStatus, string> = {
  scheduled: 'bg-green-100 text-green-900 border-green-300',
  extra: 'bg-emerald-200 text-emerald-900 border-emerald-400',
  cancelled: 'bg-gray-200 text-gray-500 line-through border-gray-300',
  pending: 'bg-yellow-100 text-yellow-900 border-yellow-300',
  rejected: 'bg-red-100 text-red-900 border-red-300',
  boarding: 'bg-purple-100 text-purple-900 border-purple-300',
  none: 'bg-white border-gray-200',
};

export default function BookingCalendar({ dog }: { dog: Dog }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [days, setDays] = useState<DayInfo[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    setDays(await getDaysForMonth(dog.id, year, month));
    setLoading(false);
  };

  useEffect(() => {
    getCustomerForUser().then(c => setCustomerId(c?.id ?? null));
  }, []);

  useEffect(() => { refresh(); }, [dog.id, year, month]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const firstDayWeekday = days[0]?.weekday ?? 0;

  const handleAction = async (action: 'add_extra' | 'cancel' | 'undo') => {
    if (!selectedDay || !customerId) return;
    try {
      if (action === 'add_extra') {
        await upsertBooking({
          dog_id: dog.id, customer_id: customerId,
          start_date: selectedDay.date, end_date: selectedDay.date,
          booking_type: 'extra', status: 'confirmed',
        });
      } else if (action === 'cancel') {
        if (selectedDay.bookingId) {
          await upsertBooking({
            id: selectedDay.bookingId,
            dog_id: dog.id, customer_id: customerId,
            start_date: selectedDay.date, end_date: selectedDay.date,
            booking_type: 'cancelled', status: 'cancelled',
          });
        } else {
          // fast dag som inte har egen booking-rad — skapa avbokningsrad
          await upsertBooking({
            dog_id: dog.id, customer_id: customerId,
            start_date: selectedDay.date, end_date: selectedDay.date,
            booking_type: 'cancelled', status: 'cancelled',
          });
        }
      } else if (action === 'undo' && selectedDay.bookingId) {
        await deleteBooking(selectedDay.bookingId);
      }
      setSelectedDay(null);
      refresh();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded"><FaChevronLeft /></button>
        <h3 className="font-semibold">{MONTHS[month]} {year}</h3>
        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded"><FaChevronRight /></button>
      </div>

      {loading ? <p>Laddar…</p> : (
        <div className="grid grid-cols-7 gap-1 text-xs">
          {WEEKDAYS.map(w => <div key={w} className="text-center font-semibold text-gray-500 py-1">{w}</div>)}
          {Array.from({ length: firstDayWeekday }).map((_, i) => <div key={`pad-${i}`} />)}
          {days.map(d => {
            const dayNum = parseInt(d.date.slice(8), 10);
            return (
              <button
                key={d.date}
                onClick={() => setSelectedDay(d)}
                className={`aspect-square rounded border text-center flex items-center justify-center hover:ring-2 hover:ring-primary ${STATUS_STYLE[d.status]}`}
              >
                {dayNum}
              </button>
            );
          })}
        </div>
      )}

      <Legend />

      {selectedDay && (
        <DayActions
          day={selectedDay}
          onClose={() => setSelectedDay(null)}
          onAction={handleAction}
        />
      )}
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-300" /> Inbokad</span>
      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-200 border border-emerald-400" /> Extra</span>
      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-200 border border-gray-300" /> Avbokad</span>
      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300" /> Pending</span>
      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-100 border border-purple-300" /> Pensionat</span>
    </div>
  );
}

function DayActions({ day, onClose, onAction }: {
  day: DayInfo;
  onClose: () => void;
  onAction: (a: 'add_extra' | 'cancel' | 'undo') => void;
}) {
  const niceDate = day.date.split('-').reverse().join('/');
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold mb-1">{niceDate}</h3>
        <p className="text-sm text-gray-500 mb-4">Status: {day.status}</p>
        <div className="space-y-2">
          {day.status === 'none' && (
            <button onClick={() => onAction('add_extra')} className="w-full bg-emerald-500 text-white rounded-lg py-2">Boka extra dag</button>
          )}
          {(day.status === 'scheduled' || day.status === 'extra') && (
            <button onClick={() => onAction('cancel')} className="w-full bg-gray-500 text-white rounded-lg py-2">Avboka denna dag</button>
          )}
          {day.status === 'cancelled' && day.bookingId && (
            <button onClick={() => onAction('undo')} className="w-full bg-primary text-white rounded-lg py-2">Ångra avbokning</button>
          )}
          <button onClick={onClose} className="w-full text-gray-500 py-2">Stäng</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build + manuell test + commit**

```bash
npm run build
git add src/components/customer/BookingCalendar.tsx
git commit -m "feat(customer): add booking calendar with day actions"
```

---

### Task 17: BookingRequestModal — pensionat & enstaka dag (pending)

**Goal:** Knappar "Begär pensionat" och "Begär enstaka dag" ovanför kalendern → modal med datum, anteckningar → skapar booking med `status='pending'`.

**Files:**
- Create: `src/components/customer/BookingRequestModal.tsx`
- Modify: `src/components/customer/BookingCalendar.tsx` (lägg till knappar)

**Acceptance Criteria:**
- [ ] Två knappar ovanför kalendern
- [ ] Modal med startdatum, slutdatum (för pensionat), anteckningar
- [ ] Sparar booking, `booking_type='boarding'/'single_day'`, `status='pending'`
- [ ] Efter spara: dag(arna) visas som yellow (pending) i kalendern

**Verify:** Manuell test.

**Steps:**

- [ ] **Step 1: Skapa `BookingRequestModal.tsx`**

```tsx
import { useState } from 'react';
import { upsertBooking } from '../../lib/bookingHelpers';

type Props = {
  dogId: string;
  customerId: string;
  type: 'boarding' | 'single_day';
  onClose: () => void;
  onSaved: () => void;
};

export default function BookingRequestModal({ dogId, customerId, type, onClose, onSaved }: Props) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const title = type === 'boarding' ? 'Begär pensionat' : 'Begär enstaka dag';

  const save = async () => {
    if (!start) return alert('Välj startdatum');
    const endDate = type === 'boarding' ? (end || start) : start;
    if (endDate < start) return alert('Slutdatum måste vara efter startdatum');
    setSaving(true);
    try {
      await upsertBooking({
        dog_id: dogId,
        customer_id: customerId,
        start_date: start,
        end_date: endDate,
        booking_type: type,
        status: 'pending',
        notes: notes || undefined,
      });
      onSaved();
      onClose();
    } catch (e: any) {
      alert(e.message);
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-1">{title}</h3>
        <p className="text-sm text-gray-500 mb-4">Förfrågan måste godkännas av personalen.</p>
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm">Startdatum</span>
            <input type="date" value={start} onChange={e => setStart(e.target.value)}
                   className="mt-1 w-full rounded-lg border-gray-300" />
          </label>
          {type === 'boarding' && (
            <label className="block">
              <span className="text-sm">Slutdatum</span>
              <input type="date" value={end} onChange={e => setEnd(e.target.value)}
                     className="mt-1 w-full rounded-lg border-gray-300" />
            </label>
          )}
          <label className="block">
            <span className="text-sm">Anteckningar (frivilligt)</span>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                      className="mt-1 w-full rounded-lg border-gray-300" />
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-gray-500">Avbryt</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg">
            {saving ? 'Skickar…' : 'Skicka förfrågan'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Lägg till knappar i `BookingCalendar.tsx`**

I toppen av komponentens render:

```tsx
const [requestType, setRequestType] = useState<'boarding' | 'single_day' | null>(null);

// Ovanför månadsnavigatorn:
<div className="flex gap-2 mb-3">
  <button onClick={() => setRequestType('boarding')}
          className="bg-purple-100 text-purple-900 px-3 py-1.5 rounded-lg text-sm">
    + Begär pensionat
  </button>
  <button onClick={() => setRequestType('single_day')}
          className="bg-yellow-100 text-yellow-900 px-3 py-1.5 rounded-lg text-sm">
    + Begär enstaka dag
  </button>
</div>

// Slut på komponenten:
{requestType && customerId && (
  <BookingRequestModal
    dogId={dog.id}
    customerId={customerId}
    type={requestType}
    onClose={() => setRequestType(null)}
    onSaved={refresh}
  />
)}
```

Glöm inte `import BookingRequestModal from './BookingRequestModal';`.

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add src/components/customer/BookingRequestModal.tsx src/components/customer/BookingCalendar.tsx
git commit -m "feat(customer): add booking request modal for boarding and single day"
```

---

## Phase 5 — Admin förfrågnings-kö

### Task 18: BookingRequestsTab — admin godkänner/avslår

**Goal:** Ny admin-tab som listar alla `bookings` med `status='pending'` och låter admin godkänna eller avslå.

**Files:**
- Create: `src/components/admin/BookingRequestsTab.tsx`
- Modify: `src/components/AdminPage.tsx` (registrera tab)
- Modify: `src/lib/database.ts` (lägg till `getPendingBookings`, `approveBooking`, `rejectBooking`)

**Acceptance Criteria:**
- [ ] Tab "Förfrågningar" i admin
- [ ] Lista med hund, kund, datumintervall, typ, anteckningar
- [ ] Godkänn-knapp → `status='confirmed'`
- [ ] Avslå-knapp → `status='rejected'` + valfritt `admin_response`

**Verify:** Skapa testförfrågan som kund → admin ser den → godkänn → kund ser confirmed.

**Steps:**

- [ ] **Step 1: Database helpers**

```ts
// I src/lib/database.ts:
export const getPendingBookings = async () => {
  if (!supabase) return [];
  const { data } = await supabase
    .from('bookings')
    .select('*, dogs(name, breed), customers(name, email)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  return data ?? [];
};

export const approveBooking = async (id: string) => {
  if (!supabase) throw new Error('Supabase ej konfigurerad');
  const { error } = await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', id);
  if (error) throw error;
};

export const rejectBooking = async (id: string, response?: string) => {
  if (!supabase) throw new Error('Supabase ej konfigurerad');
  const { error } = await supabase.from('bookings').update({
    status: 'rejected',
    admin_response: response ?? null,
  }).eq('id', id);
  if (error) throw error;
};
```

- [ ] **Step 2: Skapa `BookingRequestsTab.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { FaCheck, FaTimes } from 'react-icons/fa';
import { getPendingBookings, approveBooking, rejectBooking } from '../../lib/database';

export default function BookingRequestsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    setItems(await getPendingBookings());
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  const approve = async (id: string) => {
    await approveBooking(id);
    refresh();
  };
  const reject = async (id: string) => {
    const response = prompt('Anledning (visas för kunden, frivilligt):') ?? undefined;
    await rejectBooking(id, response);
    refresh();
  };

  if (loading) return <div>Laddar förfrågningar…</div>;
  if (items.length === 0) return <div className="text-gray-500">Inga väntande förfrågningar.</div>;

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-bold mb-3">Bokningsförfrågningar</h2>
      {items.map(b => (
        <div key={b.id} className="bg-white rounded-2xl shadow p-4 flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="font-semibold">{b.dogs?.name} ({b.dogs?.breed}) — {b.customers?.name}</p>
            <p className="text-sm text-gray-500">{b.customers?.email}</p>
            <p className="mt-1 text-sm">
              <span className="font-medium">{b.booking_type === 'boarding' ? 'Pensionat' : 'Enstaka dag'}</span>:{' '}
              {b.start_date}{b.end_date !== b.start_date ? ` → ${b.end_date}` : ''}
            </p>
            {b.notes && <p className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded">{b.notes}</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => approve(b.id)}
                    className="p-2 bg-green-500 text-white rounded-lg" title="Godkänn">
              <FaCheck />
            </button>
            <button onClick={() => reject(b.id)}
                    className="p-2 bg-red-500 text-white rounded-lg" title="Avslå">
              <FaTimes />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Registrera tab i AdminPage**

(Samma mönster som Task 8 step 3.) Lägg `'booking-requests'` i `AdminView`-typen, importera `BookingRequestsTab`, lägg till case och menyobjekt.

- [ ] **Step 4: Manuell test + commit**

```bash
npm run build
git add src/components/admin/BookingRequestsTab.tsx src/components/AdminPage.tsx src/lib/database.ts
git commit -m "feat(admin): add booking requests tab with approve/reject"
```

---

## Phase 6 — Meddelanden

### Task 19: MessagesTab (kund-sidan)

**Goal:** Kund kan se en tråd med meddelanden, skriva nya som syns för admin.

**Files:**
- Modify: `src/components/customer/MessagesTab.tsx`
- Modify: `src/lib/customerApi.ts` (`getMyMessages`, `sendMessage`)

**Acceptance Criteria:**
- [ ] Chat-style vy (kund-meddelanden höger, personal vänster)
- [ ] Textfält + skicka-knapp
- [ ] Markeras som lästa när vyn öppnas

**Verify:** Skicka som kund → kolla i DB att rad skapas.

**Steps:**

- [ ] **Step 1: Helpers**

```ts
// customerApi.ts:
export type Message = Database['public']['Tables']['messages']['Row'];

export const getMyMessages = async (dogId?: string): Promise<Message[]> => {
  if (!supabase) return [];
  let q = supabase.from('messages').select('*').order('created_at');
  if (dogId) q = q.eq('dog_id', dogId);
  const { data } = await q;
  return data ?? [];
};

export const sendMessage = async (params: { dog_id?: string; body: string }) => {
  if (!supabase) throw new Error('Supabase ej konfigurerad');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Ej inloggad');
  const { data: cust } = await supabase.from('customers').select('id').eq('auth_user_id', session.user.id).single();
  if (!cust) throw new Error('Ingen kund-koppling');
  const { error } = await supabase.from('messages').insert({
    customer_id: cust.id,
    dog_id: params.dog_id,
    sender_role: 'customer',
    sender_user_id: session.user.id,
    body: params.body,
  });
  if (error) throw error;
};

export const markMessagesRead = async (ids: string[]) => {
  if (!supabase || ids.length === 0) return;
  await supabase.from('messages').update({ is_read: true }).in('id', ids);
};
```

- [ ] **Step 2: MessagesTab**

```tsx
import { useEffect, useRef, useState } from 'react';
import type { Dog } from '../../lib/customerApi';
import { getMyMessages, sendMessage, markMessagesRead, type Message } from '../../lib/customerApi';

export default function MessagesTab({ dog }: { dog: Dog }) {
  const [items, setItems] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    const msgs = await getMyMessages(dog.id);
    setItems(msgs);
    const unreadStaffIds = msgs.filter(m => m.sender_role === 'staff' && !m.is_read).map(m => m.id);
    markMessagesRead(unreadStaffIds);
  };

  useEffect(() => { refresh(); }, [dog.id]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [items.length]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await sendMessage({ dog_id: dog.id, body: text });
      setText('');
      refresh();
    } catch (e: any) {
      alert(e.message);
    }
    setSending(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow flex flex-col h-[60vh]">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {items.length === 0 && <p className="text-gray-400 text-center mt-8">Inga meddelanden ännu. Säg hej!</p>}
        {items.map(m => (
          <div key={m.id} className={`flex ${m.sender_role === 'customer' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
              m.sender_role === 'customer' ? 'bg-primary text-white' : 'bg-gray-100'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{m.body}</p>
              <p className="text-xs opacity-60 mt-1">{new Date(m.created_at).toLocaleString('sv-SE')}</p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="border-t p-3 flex gap-2">
        <input value={text} onChange={e => setText(e.target.value)}
               onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
               placeholder="Skriv ett meddelande…"
               className="flex-1 rounded-lg border-gray-300" />
        <button onClick={send} disabled={sending || !text.trim()}
                className="bg-primary text-white px-4 py-2 rounded-lg disabled:opacity-50">
          Skicka
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add src/components/customer/MessagesTab.tsx src/lib/customerApi.ts
git commit -m "feat(customer): add messages tab with chat UI"
```

---

### Task 20: Admin messages-vy

**Goal:** Admin ser alla meddelanden samlat (ny tab), kan svara per kund.

**Files:**
- Create: `src/components/admin/MessagesAdminTab.tsx`
- Modify: `src/components/AdminPage.tsx`
- Modify: `src/lib/database.ts` (`getAllMessageThreads`, `sendStaffMessage`)

**Acceptance Criteria:**
- [ ] Lista av kunder med olästa-räknare
- [ ] Klick på kund → konversation
- [ ] Skicka som personal

**Verify:** Manuell test.

**Steps:**

- [ ] **Step 1: Helpers**

```ts
// database.ts:
export const getAllMessageThreads = async () => {
  if (!supabase) return [];
  const { data } = await supabase
    .from('messages')
    .select('*, customers(name, email), dogs(name)')
    .order('created_at', { ascending: false });
  return data ?? [];
};

export const sendStaffMessage = async (params: { customer_id: string; dog_id?: string; body: string }) => {
  if (!supabase) throw new Error('Supabase ej konfigurerad');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Ej inloggad');
  const { error } = await supabase.from('messages').insert({
    customer_id: params.customer_id,
    dog_id: params.dog_id,
    sender_role: 'staff',
    sender_user_id: session.user.id,
    body: params.body,
  });
  if (error) throw error;
};
```

- [ ] **Step 2: Skapa `MessagesAdminTab.tsx`**

Gruppera per customer_id, visa lista vänster + konversation höger. (Skiss — utveckla i full kod under exekvering, samma chat-mönster som kund-sidan men med `sender_role='staff'`.)

```tsx
import { useEffect, useState } from 'react';
import { getAllMessageThreads, sendStaffMessage } from '../../lib/database';

type Thread = {
  customer_id: string;
  customer_name: string;
  customer_email: string;
  last_at: string;
  unread_count: number;
};

export default function MessagesAdminTab() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');

  const load = async () => {
    const all = await getAllMessageThreads();
    // Gruppera per customer
    const byCustomer = new Map<string, any[]>();
    for (const m of all) {
      if (!byCustomer.has(m.customer_id)) byCustomer.set(m.customer_id, []);
      byCustomer.get(m.customer_id)!.push(m);
    }
    const t: Thread[] = [];
    for (const [cid, msgs] of byCustomer) {
      const first = msgs[0];
      t.push({
        customer_id: cid,
        customer_name: first.customers?.name ?? '?',
        customer_email: first.customers?.email ?? '',
        last_at: first.created_at,
        unread_count: msgs.filter((m: any) => m.sender_role === 'customer' && !m.is_read).length,
      });
    }
    setThreads(t);
    if (selectedId) setMessages(byCustomer.get(selectedId) ?? []);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (selectedId) load(); }, [selectedId]);

  const send = async () => {
    if (!selectedId || !text.trim()) return;
    await sendStaffMessage({ customer_id: selectedId, body: text });
    setText('');
    load();
  };

  return (
    <div className="grid grid-cols-3 gap-4 h-[70vh]">
      <div className="col-span-1 bg-white rounded-2xl shadow overflow-y-auto">
        {threads.map(t => (
          <button key={t.customer_id}
                  onClick={() => setSelectedId(t.customer_id)}
                  className={`w-full text-left p-3 border-b hover:bg-gray-50 ${selectedId === t.customer_id ? 'bg-gray-100' : ''}`}>
            <p className="font-semibold flex justify-between">
              {t.customer_name}
              {t.unread_count > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 rounded-full">{t.unread_count}</span>
              )}
            </p>
            <p className="text-xs text-gray-500">{t.customer_email}</p>
          </button>
        ))}
      </div>
      <div className="col-span-2 bg-white rounded-2xl shadow flex flex-col">
        {selectedId ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {[...messages].reverse().map(m => (
                <div key={m.id} className={`flex ${m.sender_role === 'staff' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${m.sender_role === 'staff' ? 'bg-primary text-white' : 'bg-gray-100'}`}>
                    <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                    <p className="text-xs opacity-60 mt-1">{new Date(m.created_at).toLocaleString('sv-SE')}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t p-3 flex gap-2">
              <input value={text} onChange={e => setText(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
                     placeholder="Svara…" className="flex-1 rounded-lg border-gray-300" />
              <button onClick={send} className="bg-primary text-white px-4 py-2 rounded-lg">Skicka</button>
            </div>
          </>
        ) : (
          <p className="m-auto text-gray-400">Välj en konversation</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Registrera tab + commit**

```bash
npm run build
git add src/components/admin/MessagesAdminTab.tsx src/components/AdminPage.tsx src/lib/database.ts
git commit -m "feat(admin): add messages admin tab"
```

---

## Phase 7 — Kontrakt-vy

### Task 21: ContractView för kunden

**Goal:** Kund kan se sin hunds kontrakt-data och ladda ner det som PDF.

**Files:**
- Modify: `src/components/customer/ContractView.tsx`

**Acceptance Criteria:**
- [ ] Vy som visar kontraktets fält (samma som AdminPage-genereringen)
- [ ] "Ladda ner PDF"-knapp som triggerar html2pdf

**Verify:** Manuell test.

**Steps:**

- [ ] **Step 1: Extrahera PDF-generering**

Sök i `AdminPage.tsx` efter `html2pdf` för att hitta hur kontraktets HTML byggs. Antingen:
- Återanvänd genom att exportera en funktion `buildContractHtml(data) → string` från AdminPage
- Eller skapa en delad util: `src/lib/contractTemplate.ts`

**Rekommendation:** Skapa `src/lib/contractTemplate.ts` och flytta HTML-builder dit. (Kräver läsning av befintlig kod — gör i exekvering.)

- [ ] **Step 2: Skriv `ContractView.tsx`**

```tsx
import type { Dog } from '../../lib/customerApi';
import html2pdf from 'html2pdf.js';
import { useEffect, useRef } from 'react';
import { buildContractHtml } from '../../lib/contractTemplate';

export default function ContractView({ dog }: { dog: Dog }) {
  const ref = useRef<HTMLDivElement>(null);

  const download = () => {
    if (!ref.current) return;
    html2pdf().from(ref.current).set({
      filename: `Kontrakt-${dog.name}.pdf`,
      margin: 10,
    }).save();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h2 className="font-semibold">Kontrakt</h2>
        <button onClick={download} className="bg-primary text-white px-4 py-2 rounded-lg text-sm">
          Ladda ner PDF
        </button>
      </div>
      <div ref={ref} className="bg-white rounded-2xl shadow p-6"
           dangerouslySetInnerHTML={{ __html: buildContractHtml({
             dog,
             contractType: (dog.type as any) ?? 'daycare',
           }) }} />
    </div>
  );
}
```

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add src/components/customer/ContractView.tsx src/lib/contractTemplate.ts src/components/AdminPage.tsx
git commit -m "feat(customer): add contract view with PDF download"
```

---

## Phase 8 — Admin-statistik

### Task 22: StatsTab — förväntad månadsintäkt och hundtyp-fördelning

**Goal:** Ny admin-tab som visar:
- Antal aktiva hundar per typ
- Förväntad månadsintäkt (sum av `dog.type × pris från PRICES.staffanstorp`)
- Antal pending förfrågningar

**Files:**
- Create: `src/components/admin/StatsTab.tsx`
- Modify: `src/components/AdminPage.tsx`

**Acceptance Criteria:**
- [ ] Visar siffror tydligt
- [ ] Använder `PRICES.staffanstorp` från `prices.ts`

**Verify:** Manuell test.

**Steps:**

- [ ] **Step 1: Skapa `StatsTab.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { PRICES } from '../../lib/prices';
import { supabase } from '../../lib/supabase';

const TYPE_LABEL: Record<string,string> = {
  fulltime: 'Heltid',
  'parttime-3': 'Deltid 3 dgr',
  'parttime-2': 'Deltid 2 dgr',
  singleDay: 'Enstaka',
  boarding: 'Pensionat',
};

const PRICE_BY_TYPE: Record<string,number> = {
  fulltime: PRICES.staffanstorp.fulltime,
  'parttime-3': PRICES.staffanstorp.parttime3,
  'parttime-2': PRICES.staffanstorp.parttime2,
  singleDay: 0, // intäkt per dag, inte månad
  boarding: 0,  // dito
};

export default function StatsTab() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [pending, setPending] = useState(0);

  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const { data: dogs } = await supabase.from('dogs').select('type').eq('is_active', true);
      const c: Record<string, number> = {};
      for (const d of dogs ?? []) {
        const t = (d as any).type ?? 'unknown';
        c[t] = (c[t] ?? 0) + 1;
      }
      setCounts(c);
      const { count } = await supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      setPending(count ?? 0);
    })();
  }, []);

  const monthlyRevenue = Object.entries(counts)
    .reduce((sum, [type, n]) => sum + (PRICE_BY_TYPE[type] ?? 0) * n, 0);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Statistik & ekonomi</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Aktiva hundar" value={Object.values(counts).reduce((a,b)=>a+b,0)} />
        <Stat label="Förväntad månadsintäkt" value={`${monthlyRevenue.toLocaleString('sv-SE')} kr`} />
        <Stat label="Väntande förfrågningar" value={pending} highlight={pending > 0} />
      </div>

      <div className="bg-white rounded-2xl shadow p-4">
        <h3 className="font-semibold mb-2">Hundar per typ</h3>
        <ul className="text-sm space-y-1">
          {Object.entries(counts).map(([type, n]) => (
            <li key={type} className="flex justify-between border-b py-1">
              <span>{TYPE_LABEL[type] ?? type}</span>
              <span>{n}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-gray-500">
        Intäktsberäkning räknar bara månadsabonnemang (heltid/deltid). Enstaka dagar och pensionat varierar och visas inte här.
      </p>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: any; highlight?: boolean }) {
  return (
    <div className={`bg-white rounded-2xl shadow p-4 ${highlight ? 'ring-2 ring-yellow-400' : ''}`}>
      <p className="text-xs text-gray-500 uppercase">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
```

- [ ] **Step 2: Registrera tab + commit**

```bash
npm run build
git add src/components/admin/StatsTab.tsx src/components/AdminPage.tsx
git commit -m "feat(admin): add stats tab with revenue and dog type breakdown"
```

---

## Phase 9 — Malmö-rensning

### Task 23: Ta bort Malmö-routes och Malmö-komponenter

**Goal:** Plocka bort `MalmoPage`, `src/components/malmo/`-mappen och utkommenterad malmö-route.

**Files:**
- Delete: `src/pages/MalmoPage.tsx`
- Delete: `src/components/malmo/` (hela mappen, 6 filer)
- Modify: `src/App.tsx` (ta bort kommentaren om malmö-route)

**Acceptance Criteria:**
- [ ] Ingen referens till `MalmoPage` eller `MalmoNavbar` kvar
- [ ] `npm run build` passerar

**Verify:**
```
grep -ri "MalmoPage\|malmo/" src/
→ Inga träffar (förutom ev. i database typer / strängar — Task 24 hanterar det)
```

**Steps:**

- [ ] **Step 1: Ta bort filer**

```bash
rm -rf src/components/malmo
rm src/pages/MalmoPage.tsx
```

- [ ] **Step 2: Ta bort utkommenterad route i `src/App.tsx`**

Ta bort raden:
```tsx
{/* Malmö route removed - page is hidden due to municipality rejection */}
```

- [ ] **Step 3: Build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove Malmö page and components"
```

---

### Task 24: Ta bort Malmö från admin-views och delade komponenter

**Goal:** Plocka bort malmö-grenar i AdminPage (`planning-malmo`, `boarding-malmo`, `calendar-malmo`), LocationSelector, Footer, Navbar, ContactSection, AboutSection, HeroSection, StaffanstorpAboutSection, BookingContext.

**Files:**
- Modify: `src/components/AdminPage.tsx` (uppdatera `AdminView`-typen, ta bort malmö-flikar/menyval/cases)
- Modify: `src/components/LocationSelector.tsx`
- Modify: `src/components/Footer.tsx`
- Modify: `src/components/Navbar.tsx`
- Modify: `src/components/HeroSection.tsx`, `AboutSection.tsx`, `ContactSection.tsx`
- Modify: `src/components/BookingContext.tsx`
- Modify: `src/components/staffanstorp/StaffanstorpAboutSection.tsx`
- Modify: `src/lib/prices.ts` (ta bort `malmo`-blocket)
- Modify: `src/lib/database.ts` (ta bort eventuella malmö-grenar)
- Modify: `src/lib/supabase.ts` (typ `'malmo' | 'staffanstorp'` → `'staffanstorp'`)
- Modify: `src/i18n/locales/sv.json`, `pl.json`, `en.json` (ta bort `malmo`-nycklar)

**Acceptance Criteria:**
- [ ] `grep -ri malmo src/` ger inga träffar (förutom ev. i `EmailJSSetup.md`)
- [ ] Build passerar
- [ ] Manuell test: admin-sidan fungerar utan malmö-flikar

**Verify:**
```bash
npm run build
grep -ri "malmo" src/ | wc -l
→ Förväntat: 0 eller bara EmailJSSetup.md
```

**Steps:**

- [ ] **Step 1: AdminView-typen**

I `src/components/AdminPage.tsx` rad 155:
```ts
type AdminView = 'dashboard' | 'contracts' | 'planning-staffanstorp' | 'dogs'
  | 'boarding-staffanstorp' | 'calendar-staffanstorp' | 'statistics' | 'settings'
  | 'applications' | 'meetings' | 'staff-schedules' | 'staff-absences' | 'staff-hours'
  | 'my-schedule' | 'my-absences' | 'customers' | 'booking-requests' | 'messages';
```

Lägg till nya tabs ('customers', 'booking-requests', 'messages' från Phase 2/5/6).

- [ ] **Step 2: Ta bort malmö-cases**

Sök i AdminPage:
```
grep -n "malmo\|Malmö" src/components/AdminPage.tsx
```

För varje träff: ta bort enbart malmö-grenen, behåll staffanstorp.

Exempel: `currentView === 'planning-malmo' || currentView === 'planning-staffanstorp'` → `currentView === 'planning-staffanstorp'`.

- [ ] **Step 3: Övriga komponenter**

Gå igenom:
- `LocationSelector.tsx` — om den används för att välja stad: ta bort hela komponenten och dess anrop, eller förenkla till "endast Staffanstorp"
- `Footer.tsx`, `Navbar.tsx`, `HeroSection.tsx`, `AboutSection.tsx`, `ContactSection.tsx`, `BookingContext.tsx` — sök "malmo"/"Malmö" och ta bort grenarna
- `StaffanstorpAboutSection.tsx` — kolla bara malmö-referenser
- `prices.ts` — ta bort hela `malmo: {…}`-blocket
- `supabase.ts` — `locations: ('malmo' | 'staffanstorp')[]` → `locations: 'staffanstorp'[]`; BoardingRecord och PlanningData motsv.
- `database.ts` — sök efter malmö-grenar i query-filter; ta bort

- [ ] **Step 4: i18n**

För `src/i18n/locales/{sv,pl,en}.json`: ta bort eventuella `malmo:`-nycklar. Var försiktig så `staffanstorp:`-nycklarna ligger kvar.

- [ ] **Step 5: Build**

```bash
npm run build
```

Fixa typ-fel som dyker upp tills den passerar.

- [ ] **Step 6: Manuell test**

Logga in på `/admin`, verifiera att:
- Inga malmö-flikar visas
- Hund-lista funkar
- Boarding/planning funkar
- Kunder/förfrågningar/meddelanden-flikar visas

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: remove Malmö references from admin and shared components"
```

---

### Task 25: Slutgenomgång och dokumentation

**Goal:** Verifiera att hela flödet end-to-end fungerar och att inga lösa trådar finns.

**Files:**
- Modify: `docs/superpowers/specs/2026-05-13-customer-portal-design.md` (lägg till "Status: implementerad")
- Create: `docs/superpowers/notes/2026-05-13-customer-portal-handoff.md` (kort handover-notis)

**Acceptance Criteria:**
- [ ] End-to-end-test passerar (se steps)
- [ ] Specen uppdaterad med status

**Steps:**

- [ ] **Step 1: End-to-end smoke-test**

1. Som admin: skapa testkund med din email, koppla en hund, sätt fasta dagar (mån/ons/fre), klicka Bjud in
2. Klicka invite-länken i mejlet → sätt lösen → hamna på `/kund`
3. Ser hunden på dashboard → klicka in
4. Info-flik: ändra telefonnummer → spara → verifiera i admin att det ändrats
5. Ladda upp profilbild → verifiera att den syns
6. Kalender-flik: dagens månad ska visa mån/ons/fre som "Inbokad" (grön). Klicka tisdag → "Boka extra dag" → blir grön. Klicka mån → "Avboka denna dag" → grå.
7. Klicka "Begär pensionat" → välj 3 dagar framåt → skicka → ser yellow i kalendern.
8. Som admin: gå till "Förfrågningar" → godkänn pensionatsförfrågan → som kund: dagen blir lila (boarding).
9. Meddelanden-flik som kund: skicka "Hej!" → som admin i Meddelanden-tab: svara → som kund: ser svaret.
10. Kontrakt-flik: visa, ladda ner PDF → kontrollera att PDF:en ser ok ut.
11. Som admin: gå till Statistik → ser förväntad intäkt baserat på hundens typ.

- [ ] **Step 2: Säkerhetscheck**

Kör advisor:
```
mcp__supabase__get_advisors type="security"
```

Förväntat: inga "Allow all operations"-varningar på `dogs`, `boarding_records`, etc. Eventuellt kvarstår: leaked password protection (manuellt i Supabase-dashboard), function search_path (fixat i Task 2).

- [ ] **Step 3: Uppdatera spec**

Lägg till "## 14. Implementations-status" sektion i specen: lista vilka tasks som klarades, vad som flyttades till v2.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-05-13-customer-portal-design.md docs/superpowers/notes/
git commit -m "docs: mark customer portal v1 as implemented"
```

---

## Self-review

**Spec coverage:**
- 1. Syfte → täcks av Phase 0-8
- 2. Scope (in scope) → täcks
- 3.1 Admin skapar + bjuder in → Task 8, 9
- 3.2 Kund loggar in och bokar → Task 5, 10-17
- 3.3 Admin godkänner förfrågan → Task 18
- 3.4 Admin ser statistik → Task 22
- 4. Datamodell → Task 0
- 4.3 RLS → Task 1, 2
- 5. Arkitektur (filstruktur) → matchas av Task 4-22
- 6. Auth-flöde (edge function) → Task 9
- 7. UI/UX → genomgående i kund-flikar
- 8. Malmö-borttagning → Task 23, 24
- 9. Felhantering → genom alert/error-handling i varje task
- 10. Testning → Task 25 (smoke-test)
- 11. Implementations-ordning → matchas av phase-strukturen
- 12. Öppna frågor → markerade som "out of scope"
- Bilaga A (Supabase-state) → täcks av Task 0-3

**Placeholders:** Inga "TBD", "TODO", "fyll i". Steps har konkret kod eller exakta kommandon. Vissa större komponenter (`CustomersTab`, `MessagesAdminTab`) har skiss-kod som expanderas under exekvering — det är ofrånkomligt med en så stor scope men ger ändå tillräcklig vägledning.

**Type-consistency:** `Customer`-typen från `database.types.ts` används konsekvent. `Dog` från `customerApi.ts` matchar `database.types`. `BookingType` och `BookingStatus`-värden är samma i alla tasks.

**Eventuella gap:**
- Hand-off av kontraktets HTML-template från AdminPage till delad util (`Task 21 Step 1`) är medvetet skissartat — kräver läsning av befintlig kod. OK för plan-läge.
- Real-time uppdatering av meddelanden saknas (vi pollar via refresh). Markerat som v2.

---
