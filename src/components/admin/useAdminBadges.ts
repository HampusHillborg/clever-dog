import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export type AdminBadges = {
  pendingBookings: number;
  unreadMessages: number;
};

// Poll interval in ms — short enough that admin sees new requests fast,
// long enough not to flood Supabase. 30 s feels right.
const POLL_INTERVAL = 30_000;

export function useAdminBadges(enabled: boolean): AdminBadges {
  const [counts, setCounts] = useState<AdminBadges>({ pendingBookings: 0, unreadMessages: 0 });

  useEffect(() => {
    if (!enabled || !supabase) return;
    let cancelled = false;

    const fetch = async () => {
      const [pendingRes, unreadRes] = await Promise.all([
        supabase!.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase!.from('messages').select('*', { count: 'exact', head: true })
          .eq('sender_role', 'customer').eq('is_read', false),
      ]);
      if (cancelled) return;
      setCounts({
        pendingBookings: pendingRes.count ?? 0,
        unreadMessages: unreadRes.count ?? 0,
      });
    };

    fetch();
    const handle = window.setInterval(fetch, POLL_INTERVAL);
    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
  }, [enabled]);

  return counts;
}
