import { useEffect, useState } from 'react';
import { FaEnvelope, FaCalendarAlt, FaSignOutAlt, FaDog } from 'react-icons/fa';
import { supabase } from '../lib/supabase';
import { signOutCustomer } from '../lib/customerAuth';
import MessagesAdminTab from '../components/admin/MessagesAdminTab';
import TodayAttendanceTab from '../components/admin/TodayAttendanceTab';
import { getStaffSchedules, type StaffSchedule } from '../lib/database';

type Tab = 'today' | 'messages' | 'schedule';

export default function AdminMobilePage() {
  const [tab, setTab] = useState<Tab>('today');

  const logout = async () => {
    await signOutCustomer();
    window.location.replace('/login');
  };

  return (
    <div className="min-h-screen bg-light flex flex-col">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <h1 className="font-bold text-lg">CleverDog · Personal</h1>
        <button
          onClick={logout}
          className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1"
        >
          <FaSignOutAlt /> Logga ut
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        <div className="p-3">
          {tab === 'today' && <TodayAttendanceTab />}
          {tab === 'messages' && <MessagesAdminTab />}
          {tab === 'schedule' && <MyScheduleView />}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex z-20"
           style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <TabButton active={tab === 'today'} onClick={() => setTab('today')}
                   icon={<FaDog />} label="Idag" />
        <TabButton active={tab === 'messages'} onClick={() => setTab('messages')}
                   icon={<FaEnvelope />} label="Meddelanden" />
        <TabButton active={tab === 'schedule'} onClick={() => setTab('schedule')}
                   icon={<FaCalendarAlt />} label="Mitt schema" />
      </nav>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1 py-3 ${
        active ? 'text-primary' : 'text-gray-500'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-xs">{label}</span>
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
      const today = new Date().toISOString().slice(0, 10);
      const horizon = new Date();
      horizon.setMonth(horizon.getMonth() + 2);
      const end = horizon.toISOString().slice(0, 10);
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
                    {s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)} · {locationLabel(s.location)}
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

function locationLabel(loc: string): string {
  if (loc === 'malmo') return 'Malmö';
  if (loc === 'staffanstorp') return 'Staffanstorp';
  return loc;
}
