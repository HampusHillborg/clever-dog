import { useCallback, useEffect, useRef, useState } from 'react';
import { FaBell, FaCalendarCheck, FaCommentDots, FaRegBell } from 'react-icons/fa';
import Sheet from '../shared/Sheet';
import { supabase } from '../../lib/supabase';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationsRead,
  type AppNotification,
} from '../../lib/customerApi';

const relativeTime = (iso: string): string => {
  const then = new Date(iso).getTime();
  const diffMin = Math.round((Date.now() - then) / 60000);
  if (diffMin < 1) return 'Nyss';
  if (diffMin < 60) return `${diffMin} min sedan`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH} tim sedan`;
  return new Date(iso).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
};

const iconFor = (kind: string) => {
  if (kind === 'staff_message' || kind === 'customer_message') return <FaCommentDots />;
  if (kind === 'booking_decision' || kind === 'booking_request') return <FaCalendarCheck />;
  return <FaRegBell />;
};

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const refreshCount = useCallback(async () => {
    setUnread(await getUnreadNotificationCount());
  }, []);
  const refreshCountRef = useRef(refreshCount);
  refreshCountRef.current = refreshCount;

  // Initial + polling + förgrund-fokus + realtime för olästa-räknaren.
  useEffect(() => {
    refreshCountRef.current();
    const interval = setInterval(() => refreshCountRef.current(), 20000);
    const onVisible = () => { if (document.visibilityState === 'visible') refreshCountRef.current(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
    if (supabase) {
      channel = supabase
        .channel('notifications-bell')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
          refreshCountRef.current();
        })
        .subscribe();
    }
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      if (channel && supabase) supabase.removeChannel(channel);
    };
  }, []);

  const openCenter = async () => {
    setOpen(true);
    setLoading(true);
    const list = await getNotifications();
    setItems(list);
    setLoading(false);
    // Markera allt som läst när centret öppnas.
    if (list.some(n => !n.read_at)) {
      await markNotificationsRead();
      setUnread(0);
    }
  };

  return (
    <>
      <button
        onClick={openCenter}
        className="relative w-10 h-10 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 active:scale-95 transition-all shrink-0"
        aria-label="Notiser"
      >
        <FaBell className="text-base" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Notiser">
        <div className="p-4">
          {loading ? (
            <p className="text-gray-400 text-sm text-center py-8">Laddar…</p>
          ) : items.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-3">
                <FaRegBell className="text-xl" />
              </div>
              <p className="font-semibold text-sm">Inga notiser än</p>
              <p className="text-sm text-gray-500 mt-1">
                Här samlas svar på bokningar och meddelanden från personalen.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map(n => (
                <li
                  key={n.id}
                  className={`flex items-start gap-3 p-3 rounded-2xl border ${
                    n.read_at ? 'border-gray-100 bg-white' : 'border-orange-200 bg-orange-50/60'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                    {iconFor(n.kind)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-tight">{n.title}</p>
                    {n.body && <p className="text-sm text-gray-600 mt-0.5 leading-snug">{n.body}</p>}
                    <p className="text-[11px] text-gray-400 mt-1">{relativeTime(n.created_at)}</p>
                  </div>
                  {!n.read_at && <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0 mt-1.5" />}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Sheet>
    </>
  );
}
