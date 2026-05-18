import { useEffect, useState } from 'react';
import {
  FaCalendarAlt, FaImages, FaCommentDots, FaCheckCircle, FaClock,
} from 'react-icons/fa';
import { supabase } from '../../lib/supabase';
import {
  getDogActivities, getMyMessages, type Dog, type DogActivity, type Message,
} from '../../lib/customerApi';

type NextDay = {
  date: string;          // ISO YYYY-MM-DD
  status: 'today' | 'tomorrow' | 'future';
  bookingType: string;   // 'scheduled' | 'extra' | 'boarding' | 'single_day'
  daysAhead: number;
};

const WEEKDAYS = ['Söndag','Måndag','Tisdag','Onsdag','Torsdag','Fredag','Lördag'];
const MONTHS = ['januari','februari','mars','april','maj','juni','juli','augusti','september','oktober','november','december'];

const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

const fmtTimeShort = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Igår';
  return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
};

const bookingTypeLabel = (t: string): string => {
  if (t === 'boarding') return 'Pensionat';
  if (t === 'extra') return 'Extra-dag';
  if (t === 'single_day') return 'Enstaka dag';
  return 'Dagis';
};

export default function HomeFeedTab({ dog, onJumpTo }: {
  dog: Dog;
  onJumpTo: (tab: 'calendar' | 'album' | 'messages' | 'profile') => void;
}) {
  const [next, setNext] = useState<NextDay | null>(null);
  const [latestActivity, setLatestActivity] = useState<DogActivity | null>(null);
  const [latestMsg, setLatestMsg] = useState<Message | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [n, acts, msgs] = await Promise.all([
        getNextScheduledDay(dog.id),
        getDogActivities(dog.id, 1),
        getMyMessages(dog.id),
      ]);
      setNext(n);
      setLatestActivity(acts[0] ?? null);
      const sortedMsgs = [...msgs].reverse();
      setLatestMsg(sortedMsgs[0] ?? null);
      setUnreadCount(msgs.filter(m => m.sender_role === 'staff' && !m.is_read).length);
      setLoading(false);
    })();
  }, [dog.id]);

  if (loading) return <HomeSkeleton />;

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
          {new Date().toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 className="text-2xl font-bold tracking-tight mt-1">
          Hej {dog.name}!
        </h1>
      </div>

      {/* Next/today card — the headliner */}
      <NextDayCard next={next} onOpen={() => onJumpTo('calendar')} />

      {/* Latest album */}
      {latestActivity && (
        <button
          onClick={() => onJumpTo('album')}
          className="w-full text-left bg-white rounded-2xl shadow-card overflow-hidden hover:shadow-pop transition-all active:scale-[0.99]"
        >
          {latestActivity.photo_url && (
            <img
              src={latestActivity.photo_url}
              alt=""
              className="w-full h-48 object-cover bg-gray-100"
              loading="lazy"
            />
          )}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <FaImages className="text-orange-500 text-xs" />
              <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Senast från dagiset</p>
            </div>
            <p className="text-xs text-gray-500">
              <span className="font-semibold text-gray-800">{latestActivity.posted_by_name ?? 'Personal'}</span>
              <span> · {fmtTimeShort(latestActivity.created_at)}</span>
            </p>
            {latestActivity.body && (
              <p className="text-sm mt-2 leading-snug line-clamp-2">{latestActivity.body}</p>
            )}
          </div>
        </button>
      )}

      {/* Latest message */}
      {latestMsg && (
        <button
          onClick={() => onJumpTo('messages')}
          className="w-full text-left bg-white rounded-2xl shadow-card p-4 hover:shadow-pop transition-all active:scale-[0.99] flex items-start gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
            <FaCommentDots className="text-base" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
                {latestMsg.sender_role === 'staff' ? 'Från personalen' : 'Du skrev'}
              </p>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">
                  {unreadCount} ny{unreadCount === 1 ? '' : 'a'}
                </span>
              )}
            </div>
            <p className="text-sm font-medium truncate">
              {latestMsg.sender_role === 'staff' ? (latestMsg.sender_name ?? 'Personal') : 'Du'}
            </p>
            <p className="text-xs text-gray-600 line-clamp-1 mt-0.5">{latestMsg.body}</p>
            <p className="text-[11px] text-gray-400 mt-1">{fmtTimeShort(latestMsg.created_at)}</p>
          </div>
        </button>
      )}

      {/* Quick actions — chat lives on the message preview card above, not here */}
      <div className="grid grid-cols-2 gap-3">
        <QuickAction
          icon={<FaCalendarAlt />}
          label="Kalender"
          desc="Boka & se månaden"
          onClick={() => onJumpTo('calendar')}
        />
        <QuickAction
          icon={<FaImages />}
          label="Album"
          desc="Bilder från dagiset"
          onClick={() => onJumpTo('album')}
        />
      </div>
    </div>
  );
}

function NextDayCard({ next, onOpen }: { next: NextDay | null; onOpen: () => void }) {
  if (!next) {
    return (
      <div className="bg-white rounded-2xl shadow-card p-5">
        <div className="flex items-center gap-2 mb-2">
          <FaCalendarAlt className="text-gray-400 text-sm" />
          <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Nästa dag</p>
        </div>
        <p className="font-semibold text-base">Inget inbokat just nu</p>
        <p className="text-sm text-gray-500 mt-0.5">Boka en dag i kalendern när det passar.</p>
        <button
          onClick={onOpen}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-orange-700"
        >
          <FaCalendarAlt className="text-xs" /> Öppna kalender
        </button>
      </div>
    );
  }

  const today = next.status === 'today';
  const tomorrow = next.status === 'tomorrow';

  const badgeText = today ? 'IDAG' : tomorrow ? 'IMORGON' : `OM ${next.daysAhead} DAGAR`;
  const heroText = today ? 'Dagen är igång' :
    tomorrow ? 'Vi ses imorgon' : 'Nästa inbokning';

  return (
    <button
      onClick={onOpen}
      className="w-full text-left bg-gradient-to-br from-primary to-orange-600 text-white rounded-2xl shadow-pop p-5 active:scale-[0.99] transition-all relative overflow-hidden"
    >
      <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

      <div className="relative">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
          {today ? <FaCheckCircle className="text-[10px]" /> : <FaClock className="text-[10px]" />}
          {badgeText}
        </span>
        <p className="font-bold text-xl mt-2.5 tracking-tight">{heroText}</p>
        <p className="text-sm text-white/90 mt-0.5">{fmtDate(next.date)}</p>
        <div className="mt-3 inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold">
          {bookingTypeLabel(next.bookingType)}
        </div>
      </div>
    </button>
  );
}

function QuickAction({ icon, label, desc, onClick }: {
  icon: React.ReactNode; label: string; desc: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl shadow-card p-4 text-left hover:shadow-pop transition-all active:scale-[0.97]"
    >
      <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center mb-2">
        {icon}
      </div>
      <p className="font-semibold text-sm">{label}</p>
      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
    </button>
  );
}

function HomeSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div>
        <div className="h-3 w-32 bg-gray-100 rounded mb-2" />
        <div className="h-7 w-40 bg-gray-100 rounded" />
      </div>
      <div className="h-32 bg-gray-100 rounded-2xl" />
      <div className="h-48 bg-gray-100 rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-24 bg-gray-100 rounded-2xl" />
        <div className="h-24 bg-gray-100 rounded-2xl" />
      </div>
    </div>
  );
}

// Look up the next scheduled day for the dog: today if anything's planned,
// else the soonest upcoming confirmed booking or recurring weekday hit.
async function getNextScheduledDay(dogId: string): Promise<NextDay | null> {
  if (!supabase) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString().slice(0, 10);
  const horizon = new Date(today);
  horizon.setDate(today.getDate() + 60);
  const horizonIso = horizon.toISOString().slice(0, 10);

  const [bookingsRes, recurringRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('start_date, end_date, booking_type, status')
      .eq('dog_id', dogId)
      .gte('end_date', todayIso)
      .order('start_date', { ascending: true }),
    supabase
      .from('recurring_schedule')
      .select('weekday')
      .eq('dog_id', dogId)
      .eq('active', true),
  ]);

  const recurring = new Set((recurringRes.data ?? []).map(r => r.weekday as number));
  const bookings = (bookingsRes.data ?? []) as Array<{ start_date: string; end_date: string; booking_type: string; status: string }>;

  // Build a map of cancellation dates so we skip those.
  const cancelled = new Set<string>();
  const confirmed: Array<{ date: string; bookingType: string }> = [];
  for (const b of bookings) {
    if (b.booking_type === 'cancelled' || b.status === 'cancelled') {
      cancelled.add(b.start_date);
      continue;
    }
    if (b.status !== 'confirmed') continue;
    // expand multi-day bookings (boarding) into individual dates
    let cur = new Date(b.start_date);
    const end = new Date(b.end_date);
    while (cur <= end) {
      const iso = cur.toISOString().slice(0, 10);
      if (iso >= todayIso) {
        confirmed.push({ date: iso, bookingType: b.booking_type });
      }
      cur.setDate(cur.getDate() + 1);
    }
  }

  // Sweep day by day; first hit wins.
  const cursor = new Date(today);
  while (cursor.toISOString().slice(0, 10) <= horizonIso) {
    const iso = cursor.toISOString().slice(0, 10);
    if (cancelled.has(iso)) {
      cursor.setDate(cursor.getDate() + 1);
      continue;
    }
    const booked = confirmed.find(c => c.date === iso);
    if (booked) {
      return makeNext(iso, booked.bookingType, today);
    }
    // ISO weekday: 1=Mon..7=Sun; recurring_schedule uses 0=Mon..6=Sun
    const monFirst = (cursor.getDay() + 6) % 7;
    if (recurring.has(monFirst)) {
      return makeNext(iso, 'scheduled', today);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return null;
}

function makeNext(iso: string, bookingType: string, today: Date): NextDay {
  const d = new Date(iso);
  const days = Math.round((d.getTime() - today.getTime()) / 86400000);
  return {
    date: iso,
    bookingType,
    daysAhead: days,
    status: days === 0 ? 'today' : days === 1 ? 'tomorrow' : 'future',
  };
}
