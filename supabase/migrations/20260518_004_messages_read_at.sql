-- Lägg till read_at-tidsstämpel på messages för read-receipts.
-- Behåller is_read som boolean-flagga för bakåtkompatibilitet — när vi
-- markerar ett meddelande läst sätter vi BÅDA fälten.

alter table public.messages
  add column if not exists read_at timestamptz;

-- Backfill: gamla rader där is_read=true får en best-guess-timestamp.
-- Använd created_at (eller skapelsedatum) som approximation eftersom
-- vi inte har bättre data. Detta är kosmetiskt för historik-visning;
-- nya read-receipts från och med nu får riktig tid.
update public.messages
set read_at = created_at
where is_read = true and read_at is null;

-- Index för read-vs-unread-sortering om vi behöver det senare. Använd
-- partial index för att hålla det litet.
create index if not exists idx_messages_unread_at
  on public.messages (customer_id, created_at desc)
  where read_at is null;
