-- Enable Supabase Realtime for the messages table.
-- Without this the supabase_realtime publication contains no tables, so the
-- chat clients (customer app + admin web) never receive postgres_changes
-- events and only update on a manual refresh / view switch.
alter publication supabase_realtime add table public.messages;

-- REPLICA IDENTITY FULL makes UPDATE/DELETE realtime payloads include the full
-- previous row. Needed so read-receipt updates (is_read/read_at) carry enough
-- columns (customer_id, dog_id, sender_role) for RLS to authorise delivery.
alter table public.messages replica identity full;
