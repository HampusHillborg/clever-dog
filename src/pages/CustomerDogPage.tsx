import { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FaHome, FaCalendarAlt, FaCommentDots, FaImages, FaUser,
  FaSyncAlt,
} from 'react-icons/fa';
import { usePullToRefresh } from '../lib/pullToRefresh';
import HomeFeedTab from '../components/customer/HomeFeedTab';
import DogInfoTab from '../components/customer/DogInfoTab';
import BookingCalendar from '../components/customer/BookingCalendar';
import MessagesTab from '../components/customer/MessagesTab';
import ContractView from '../components/customer/ContractView';
import AlbumTab from '../components/customer/AlbumTab';
import NotificationToast from '../components/customer/NotificationToast';
import DailyReportsHistory from '../components/customer/DailyReportsHistory';
import VaccinationsCard from '../components/customer/VaccinationsCard';
import AccountSettingsCard from '../components/customer/AccountSettingsCard';
import StaffDirectoryCard from '../components/customer/StaffDirectoryCard';
import CustomerHeader from '../components/customer/CustomerHeader';
import DogPills from '../components/customer/DogPills';
import OnboardingSheet, { hasSeenOnboarding } from '../components/customer/OnboardingSheet';
import { getMyDog, getMyDogs, type Dog } from '../lib/customerApi';
import { getCustomerForUser, signOutCustomer } from '../lib/customerAuth';

type TabKey = 'home' | 'calendar' | 'album' | 'messages' | 'profile';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'home',     label: 'Hem',      icon: <FaHome /> },
  { key: 'calendar', label: 'Kalender', icon: <FaCalendarAlt /> },
  { key: 'album',    label: 'Album',    icon: <FaImages /> },
  { key: 'messages', label: 'Chat',     icon: <FaCommentDots /> },
  { key: 'profile',  label: 'Profil',   icon: <FaUser /> },
];

const TYPE_LABEL: Record<string, string> = {
  fulltime: 'Heltid',
  'parttime-3': 'Deltid 3 dgr/v',
  'parttime-2': 'Deltid 2 dgr/v',
  singleDay: 'Enstaka dag',
  boarding: 'Pensionat',
};

export default function CustomerDogPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dog, setDog] = useState<Dog | null>(null);
  const [allDogs, setAllDogs] = useState<Dog[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [tab, setTab] = useState<TabKey>('home');
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(() => !hasSeenOnboarding());
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = useCallback(async () => {
    if (!id) return;
    const d = await getMyDog(id);
    setDog(d);
    // Bump tick so child tabs re-fetch their own data through their useEffect deps.
    setRefreshTick(t => t + 1);
  }, [id]);

  const { ref: scrollRef, pulledPx, refreshing } = usePullToRefresh<HTMLElement>(refresh);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([getMyDog(id), getMyDogs(), getCustomerForUser()]).then(([d, all, c]) => {
      setDog(d);
      setAllDogs(all);
      setCustomerName(c?.name ?? '');
      setLoading(false);
    });
  }, [id]);

  const logout = async () => {
    await signOutCustomer();
    navigate('/login', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-light pb-24">
        <DogPageSkeleton />
      </div>
    );
  }

  if (!dog) return (
    <div className="min-h-screen bg-light flex flex-col items-center justify-center p-6">
      <p className="text-gray-500 mb-3">Hunden hittades inte.</p>
      <Link to="/kund" className="text-primary text-sm font-medium hover:underline">
        Till hundlistan
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-light flex flex-col">
      <NotificationToast />
      {showOnboarding && <OnboardingSheet onDone={() => setShowOnboarding(false)} />}

      <header className="bg-white/85 backdrop-blur-md sticky top-0 z-30 border-b border-gray-200/70">
        <CustomerHeader customerName={customerName} onLogout={logout} />
        {/* Hund-väljaren göms på Chat-fliken eftersom chatten är per-kund
            (inte per-hund) — en gemensam familjetråd med dagiset. */}
        {tab !== 'messages' && (
          <DogPills
            dogs={allDogs}
            activeId={dog.id}
            onPick={(other) => navigate(`/kund/hund/${other.id}`)}
          />
        )}
      </header>

      <main ref={scrollRef} className="flex-1 max-w-3xl w-full mx-auto px-4 pt-5 pb-28 overflow-y-auto relative">
        {/* Pull-to-refresh indicator */}
        {(pulledPx > 0 || refreshing) && (
          <div
            className="absolute top-0 left-0 right-0 flex items-center justify-center pointer-events-none transition-all"
            style={{ height: `${Math.max(pulledPx, refreshing ? 48 : 0)}px` }}
          >
            <div
              className={`w-9 h-9 rounded-full bg-white shadow-card flex items-center justify-center text-primary ${refreshing ? 'animate-spin' : ''}`}
              style={{ transform: `rotate(${pulledPx * 4}deg)` }}
            >
              <FaSyncAlt className="text-sm" />
            </div>
          </div>
        )}
        {tab === 'home' && <HomeFeedTab key={refreshTick} dog={dog} onJumpTo={(t) => setTab(t)} />}
        {tab === 'calendar' && <BookingCalendar key={refreshTick} dog={dog} />}
        {tab === 'album' && <AlbumTab key={refreshTick} dog={dog} />}
        {tab === 'messages' && <MessagesTab key={refreshTick} dog={dog} />}
        {tab === 'profile' && (
          <div key={refreshTick} className="space-y-4">
            <DogHero dog={dog} />
            <DogInfoTab dog={dog} onUpdate={setDog} />
            <VaccinationsCard dogId={dog.id} />
            <DailyReportsHistory dogId={dog.id} dogName={dog.name} />
            <ContractView dog={dog} />
            <StaffDirectoryCard />
            <AccountSettingsCard />
          </div>
        )}
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200/70 z-20"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex max-w-3xl mx-auto px-2 py-1.5">
          {TABS.map(t => (
            <TabButton key={t.key}
              active={tab === t.key}
              onClick={() => setTab(t.key)}
              icon={t.icon}
              label={t.label}
            />
          ))}
        </div>
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
      className="flex-1 flex flex-col items-center gap-0.5 py-1 px-1 rounded-xl transition-colors active:scale-95"
    >
      <span
        className={`flex items-center justify-center w-10 h-10 rounded-2xl transition-all ${
          active ? 'bg-orange-100 text-orange-700' : 'text-gray-400'
        }`}
      >
        <span className="text-base">{icon}</span>
      </span>
      <span className={`text-[10px] font-medium ${active ? 'text-orange-700' : 'text-gray-500'}`}>
        {label}
      </span>
    </button>
  );
}

function DogHero({ dog }: { dog: Dog }) {
  return (
    <div className="bg-white rounded-3xl shadow-card p-4 sm:p-5 flex items-center gap-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-50 to-transparent rounded-bl-full pointer-events-none" />
      <div className="relative w-20 h-20 rounded-2xl bg-orange-100 overflow-hidden flex items-center justify-center text-3xl font-bold text-orange-700 shrink-0 ring-2 ring-white shadow-card">
        {dog.photo_url
          ? <img src={dog.photo_url} alt={dog.name} className="w-full h-full object-cover" />
          : dog.name?.[0]?.toUpperCase()}
      </div>
      <div className="relative min-w-0 flex-1">
        <h1 className="text-2xl font-bold tracking-tight truncate">{dog.name}</h1>
        <p className="text-sm text-gray-500 truncate">{dog.breed}{dog.age ? ` · ${dog.age}` : ''}</p>
        {dog.type && (
          <span className="inline-flex items-center mt-2 text-[11px] font-semibold text-orange-800 bg-orange-100 px-2 py-0.5 rounded-full">
            {TYPE_LABEL[dog.type] ?? dog.type}
          </span>
        )}
      </div>
    </div>
  );
}

function DogPageSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="bg-white border-b border-gray-200 max-w-3xl mx-auto px-4 py-2.5 flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-100 rounded" />
        <div className="w-9 h-9 bg-gray-100 rounded-full" />
        <div className="flex-1 space-y-1">
          <div className="h-2 w-16 bg-gray-100 rounded" />
          <div className="h-3 w-24 bg-gray-100 rounded" />
        </div>
        <div className="w-9 h-9 bg-gray-100 rounded-full" />
      </div>
      <div className="max-w-3xl mx-auto px-4 pt-5 space-y-4">
        <div className="bg-white rounded-3xl shadow-card p-5 flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-gray-100 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-32 bg-gray-100 rounded" />
            <div className="h-4 w-24 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-5 space-y-3">
          <div className="h-4 w-24 bg-gray-100 rounded" />
          <div className="h-4 w-full bg-gray-100 rounded" />
          <div className="h-4 w-3/4 bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  );
}
