-- In-app notification center. Rows are written by the send-notification edge
-- function (service role) so a user always has a history even when a push is
-- not delivered (e.g. Firebase/APNs not configured, permission denied).
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_recipient_created_idx
  ON public.notifications (recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_recipient_unread_idx
  ON public.notifications (recipient_user_id, created_at DESC)
  WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recipients read own notifications" ON public.notifications;
CREATE POLICY "recipients read own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (recipient_user_id = auth.uid());

DROP POLICY IF EXISTS "recipients update own notifications" ON public.notifications;
CREATE POLICY "recipients update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (recipient_user_id = auth.uid())
  WITH CHECK (recipient_user_id = auth.uid());

-- Inserts come from the edge function via service role, which bypasses RLS.

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
