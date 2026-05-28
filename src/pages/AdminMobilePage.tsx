import { useEffect, useState } from 'react';
import { FaEnvelope, FaCalendarAlt, FaSignOutAlt, FaDog, FaInbox } from 'react-icons/fa';
import { supabase } from '../lib/supabase';
import { signOutCustomer } from '../lib/customerAuth';
import { getCurrentUser, type UserRole } from '../lib/auth';
import MessagesAdminTab from '../components/admin/MessagesAdminTab';
import TodayAttendanceTab from '../components/admin/TodayAttendanceTab';
import BookingRequestsTab from '../components/admin/BookingRequestsTab';
import { useAdminBadges } from '../components/admin/useAdminBadges';
import { getStaffSchedules, type StaffSchedule } from '../lib/database';
import { todayLocalIso, toLocalIsoDate } from '../lib/localDate';
import dogLogo from '../assets/images/logos/Logo.png';

type Tab = 'today' | 'bookings' | 'messages' | 'schedule';

const TAB_LABEL: Record<Tab, string> = {
  today: 'Idag',
  bookings: 'Förfrågningar',
  messages: 'Meddelanden',
  schedule: 'Mitt schema',
};

export default function AdminMobilePage() {
  const [tab, setTab] = useState<Tab>('today');
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    (async () => {
      const user = await getCurrentUser();
      if (user) setRole(user.role);
    })();
  }, []);

  const canManageBookings = role === 'admin' || role === 'platschef';
  const badges = useAdminBadges(canManageBookings);

  const logout = async () => {
    await signOutCustomer();
    window.location.replace('/login');
  };

  return (
    <div className="min-h-screen bg-light flex flex-col">
      <header className="bg-white/85 backdrop-blur-md border-b border-gray-200/70 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <img src={dogLogo} alt="" className="h-8 w-8 object-contain shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">CleverDog · Personal</p>
            <h1 className="font-bold text-base truncate">{TAB_LABEL[tab]}</h1>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-9 h-9 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors"
          aria-label="Logga ut"
        >
          <FaSignOutAlt className="text-sm" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pb-28">
        <div className="p-3 sm:p-4 max-w-3xl mx-auto w-full">
          {tab === 'today' && <TodayAttendanceTab />}
          {tab === 'bookings' && canManageBookings && <BookingRequestsTab />}
          {tab === 'messages' && <MessagesAdminTab />}
          {tab === 'schedule' && <MyScheduleView />}
        </div>
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200/70 z-20"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex max-w-3xl mx-auto px-2 py-1.5">
          <TabButton active={tab === 'today'} onClick={() => setTab('today')}
                     icon={<FaDog />} label="Idag" />
          {canManageBookings && (
            <TabButton active={tab === 'bookings'} onClick={() => setTab('bookings')}
                       icon={<FaInbox />} label="Förfrågningar" badge={badges.pendingBookings} />
          )}
          <TabButton active={tab === 'messages'} onClick={() => setTab('messages')}
                     icon={<FaEnvelope />} label="Meddelanden" />
          <TabButton active={tab === 'schedule'} onClick={() => setTab('schedule')}
                     icon={<FaCalendarAlt />} label="Schema" />
        </div>
      </nav>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, badge }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-colors active:scale-95 min-w-0"
    >
      <span
        className={`relative flex items-center justify-center w-10 h-10 rounded-2xl transition-all ${
          active
            ? 'bg-orange-100 text-orange-700'
            : 'text-gray-400'
        }`}
      >
        <span className="text-lg">{icon}</span>
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
      <span className={`text-[10px] font-medium truncate max-w-full ${active ? 'text-orange-700' : 'text-gray-500'}`}>
        {label}
      </span>
    </button>
  );
}

function MyScheduleView() {
  const [schedules, setSchedules] = useState<StaffSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!supabase) { setLoading(false); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const today = todayLocalIso();
      const horizon = new Date();
      horizon.setMonth(horizon.getMonth() + 2);
      const end = toLocalIsoDate(horizon);
      const data = await getStaffSchedules(session.user.id, today, end);
      setSchedules(data);
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-center text-gray-400 mt-8">Laddar schema…</p>;
  if (schedules.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow p-6 text-center text-gray-500">
        Inga inplanerade pass de närmaste 2 månaderna.
      </div>
    );
  }

  const grouped = groupByMonth(schedules);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Mitt schema</h2>
      {grouped.map(({ month, items }) => (
        <div key={month}>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2 px-1">
            {month}
          </h3>
          <div className="bg-white rounded-2xl shadow divide-y">
            {items.map(s => (
              <div key={s.id} className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{formatDate(s.date)}</p>
                  <p className="text-sm text-gray-600">
                    {s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)} · Staffanstorp
                  </p>
                  {s.notes && <p className="text-xs text-gray-500 mt-1">{s.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const MONTHS = ['Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December'];

function groupByMonth(schedules: StaffSchedule[]): { month: string; items: StaffSchedule[] }[] {
  const byKey = new Map<string, StaffSchedule[]>();
  for (const s of schedules) {
    const key = s.date.slice(0, 7);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(s);
  }
  return Array.from(byKey.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, items]) => {
      const [y, m] = key.split('-');
      return { month: `${MONTHS[parseInt(m, 10) - 1]} ${y}`, items };
    });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const weekday = ['Sön','Mån','Tis','Ons','Tor','Fre','Lör'][d.getDay()];
  return `${weekday} ${d.getDate()}/${d.getMonth() + 1}`;
}

