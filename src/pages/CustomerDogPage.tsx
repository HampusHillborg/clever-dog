import { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FaHome, FaCalendarAlt, FaCommentDots, FaImages,
  FaSyncAlt, FaEllipsisH, FaArrowLeft,
} from 'react-icons/fa';
import dogLogo from '../assets/images/logos/Logo.png';
import { usePullToRefresh } from '../lib/pullToRefresh';
import HomeFeedTab from '../components/customer/HomeFeedTab';
import BookingCalendar from '../components/customer/BookingCalendar';
import MessagesTab from '../components/customer/MessagesTab';
import AlbumTab from '../components/customer/AlbumTab';
import NotificationToast from '../components/customer/NotificationToast';
import CustomerHeader from '../components/customer/CustomerHeader';
import DogPills from '../components/customer/DogPills';
import OnboardingSheet, { hasSeenOnboarding } from '../components/customer/OnboardingSheet';
import MoreTab from '../components/customer/MoreTab';
import { getMyDog, getMyDogs, firstNameOf, getUnreadStaffMessageCount, type Dog } from '../lib/customerApi';
import { getCustomerForUser, signOutCustomer } from '../lib/customerAuth';

// Profil-fliken har tagits bort från bottom-nav. Hund-info + vaccinationer
// finns istället under Mer → "Hundinfo & hälsa" så vi håller navet till 5.
type TabKey = 'home' | 'calendar' | 'album' | 'messages' | 'more';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'home',     label: 'Hem',      icon: <FaHome /> },
  { key: 'calendar', label: 'Kalender', icon: <FaCalendarAlt /> },
  { key: 'album',    label: 'Album',    icon: <FaImages /> },
  { key: 'messages', label: 'Chat',     icon: <FaCommentDots /> },
  { key: 'more',     label: 'Mer',      icon: <FaEllipsisH /> },
];

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
  const [unreadChat, setUnreadChat] = useState(0);

  const refresh = useCallback(async () => {
    if (!id) return;
    const d = await getMyDog(id);
    setDog(d);
    // Bump tick so child tabs re-fetch their own data through their useEffect deps.
    setRefreshTick(t => t + 1);
  }, [id]);

  const { ref: scrollRef, pulledPx, refreshing } = usePullToRefresh<HTMLElement>(refresh);

  // Fetch unread badge whenever tab changes or data refreshes.
  // When user opens the Chat tab, MessagesTab marks messages as read,
  // so next tab change re-fetches and clears the badge.
  useEffect(() => {
    getUnreadStaffMessageCount().then(setUnreadChat);
  }, [tab, refreshTick]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    // allSettled så loading släpper även om en av fetcharna failar (t.ex.
    // nätverksbortfall). Annars hänger appen för evigt på skeleton.
    Promise.allSettled([getMyDog(id), getMyDogs(), getCustomerForUser()])
      .then(([dRes, allRes, cRes]) => {
        if (dRes.status === 'fulfilled') setDog(dRes.value);
        if (allRes.status === 'fulfilled') setAllDogs(allRes.value);
        if (cRes.status === 'fulfilled') setCustomerName(cRes.value?.name ?? '');
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

  // Chatten har en egen heltäckande "Messenger-skärm" — toppheader och bottennav
  // göms helt, en slim chat-header med tillbaka-pil ersätter dem. Detta ger
  // chatten hela viewporten och håller scrollen inuti meddelandelistan.
  if (tab === 'messages') {
    return (
      <div className="bg-stone-50 flex flex-col fixed inset-0 z-40">
        <NotificationToast />
        <header
          className="shrink-0 bg-white border-b border-gray-200/70 flex items-center gap-3 px-2 sm:px-3 py-2.5"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10px)' }}
        >
          <button
            onClick={() => setTab('home')}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 active:scale-95 transition-all"
            aria-label="Tillbaka"
          >
            <FaArrowLeft className="text-base" />
          </button>
          <img src={dogLogo} alt="" className="h-9 w-9 object-contain rounded-full shrink-0" />
          <div className="flex-1 min-w-0 leading-tight">
            <p className="font-semibold text-sm truncate">Personalen</p>
            <p className="text-[11px] text-gray-500 truncate">Clever Dog Staffanstorp</p>
          </div>
        </header>

        <main className="flex-1 min-h-0 flex flex-col w-full max-w-3xl mx-auto overflow-hidden">
          <MessagesTab key={refreshTick} dog={dog} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light flex flex-col">
      <NotificationToast />
      {showOnboarding && <OnboardingSheet onDone={() => setShowOnboarding(false)} />}

      <header className="bg-white/85 backdrop-blur-md sticky top-0 z-30 border-b border-gray-200/70">
        <CustomerHeader customerName={customerName} />
        <DogPills
          dogs={allDogs}
          activeId={dog.id}
          onPick={(other) => navigate(`/kund/hund/${other.id}`)}
        />
      </header>

      <main
        ref={scrollRef}
        className="flex-1 max-w-3xl w-full mx-auto px-4 pt-5 pb-28 overflow-y-auto relative"
      >
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
        {tab === 'home' && <HomeFeedTab key={refreshTick} dog={dog} onJumpTo={(t) => setTab(t)} customerFirstName={firstNameOf(customerName)} />}
        {tab === 'calendar' && <BookingCalendar key={refreshTick} dog={dog} />}
        {tab === 'album' && <AlbumTab key={refreshTick} dog={dog} />}
        {tab === 'more' && (
          <MoreTab
            key={refreshTick}
            dog={dog}
            onUpdateDog={setDog}
            onLogout={logout}
            onShowOnboarding={() => setShowOnboarding(true)}
          />
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
              badge={t.key === 'messages' ? unreadChat : undefined}
            />
          ))}
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
      className="flex-1 flex flex-col items-center gap-0.5 py-1 px-1 rounded-xl transition-colors active:scale-95"
    >
      <span
        className={`relative flex items-center justify-center w-10 h-10 rounded-2xl transition-all ${
          active ? 'bg-orange-100 text-orange-700' : 'text-gray-400'
        }`}
      >
        <span className="text-base">{icon}</span>
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
      <span className={`text-[10px] font-medium ${active ? 'text-orange-700' : 'text-gray-500'}`}>
        {label}
      </span>
    </button>
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
