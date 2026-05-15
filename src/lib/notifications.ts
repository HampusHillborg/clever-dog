// Fire-and-forget wrapper around the send-notification edge function.
// Never throws to callers — email failure must not block booking actions.

import { supabase } from './supabase';

type NotificationPayload =
  | { kind: 'booking_request'; booking_id: string }
  | { kind: 'booking_decision'; booking_id: string }
  | { kind: 'customer_message'; message_id: string }
  | { kind: 'staff_message'; message_id: string }
  | { kind: 'application_decision'; application_id: string };

export const sendNotification = async (payload: NotificationPayload): Promise<void> => {
  if (!supabase) return;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const baseUrl = (supabase as unknown as { supabaseUrl: string }).supabaseUrl;
    const url = `${baseUrl}/functions/v1/send-notification`;
    await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${session.access_token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.warn('sendNotification failed (non-fatal)', e);
  }
};
