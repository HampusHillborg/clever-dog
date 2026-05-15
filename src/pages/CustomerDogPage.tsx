import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FaHome, FaCalendarAlt, FaCommentDots, FaImages, FaFileContract, FaChevronDown, FaSignOutAlt,
} from 'react-icons/fa';
import DogInfoTab from '../components/customer/DogInfoTab';
import BookingCalendar from '../components/customer/BookingCalendar';
import MessagesTab from '../components/customer/MessagesTab';
import ContractView from '../components/customer/ContractView';
import AlbumTab from '../components/customer/AlbumTab';
import NotificationToast from '../components/customer/NotificationToast';
import { getMyDog, getMyDogs, type Dog } from '../lib/customerApi';
import { signOutCustomer } from '../lib/customerAuth';
import dogLogo from '../assets/images/logos/Logo.png';

type TabKey = 'info' | 'calendar' | 'album' | 'messages' | 'contract';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'info',     label: 'Hem',          icon: <FaHome /> },
  { key: 'calendar', label: 'Kalender',     icon: <FaCalendarAlt /> },
  { key: 'album',    label: 'Album',        icon: <FaImages /> },
  { key: 'messages', label: 'Chat',         icon: <FaCommentDots /> },
  { key: 'contract', label: 'Kontrakt',     icon: <FaFileContract /> },
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
  const [tab, setTab] = useState<TabKey>('info');
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([getMyDog(id), getMyDogs()]).then(([d, all]) => {
      setDog(d);
      setAllDogs(all);
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

      <header className="bg-white/85 backdrop-blur-md sticky top-0 z-30 border-b border-gray-200/70">
        <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <img src={dogLogo} alt="" className="h-8 w-8 object-contain shrink-0" />

          <DogSwitcher
            current={dog}
            others={allDogs.filter(d => d.id !== dog.id)}
            open={pickerOpen}
            onToggle={() => setPickerOpen(v => !v)}
            onPick={(other) => {
              setPickerOpen(false);
              navigate(`/kund/hund/${other.id}`);
            }}
          />

          <button
            onClick={logout}
            className="w-9 h-9 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors shrink-0"
            aria-label="Logga ut"
          >
            <FaSignOutAlt className="text-sm" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 pt-5 pb-28 overflow-y-auto">
        {tab === 'info' && (
          <div className="space-y-4">
            <DogHero dog={dog} />
            <DogInfoTab dog={dog} onUpdate={setDog} />
          </div>
        )}
        {tab === 'calendar' && <BookingCalendar dog={dog} />}
        {tab === 'album' && <AlbumTab dog={dog} />}
        {tab === 'messages' && <MessagesTab dog={dog} />}
        {tab === 'contract' && <ContractView dog={dog} />}
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

function DogSwitcher({ current, others, open, onToggle, onPick }: {
  current: Dog;
  others: Dog[];
  open: boolean;
  onToggle: () => void;
  onPick: (d: Dog) => void;
}) {
  return (
    <div className="relative flex-1 flex justify-center">
      <button
        onClick={onToggle}
        disabled={others.length === 0}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors max-w-full ${
          others.length === 0 ? 'cursor-default' : 'hover:bg-gray-100'
        }`}
      >
        <span className="w-7 h-7 rounded-full bg-orange-100 overflow-hidden flex items-center justify-center text-xs font-bold text-orange-700 shrink-0">
          {current.photo_url
            ? <img src={current.photo_url} alt="" className="w-full h-full object-cover" />
            : current.name?.[0]?.toUpperCase()}
        </span>
        <span className="font-semibold text-sm truncate">{current.name}</span>
        {others.length > 0 && (
          <FaChevronDown className={`text-xs text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && others.length > 0 && (
        <div className="absolute top-full mt-1.5 bg-white rounded-2xl shadow-pop py-1.5 z-40 min-w-[200px] border border-gray-100">
          {others.map(d => (
            <button
              key={d.id}
              onClick={() => onPick(d)}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-left"
            >
              <span className="w-7 h-7 rounded-full bg-orange-100 overflow-hidden flex items-center justify-center text-xs font-bold text-orange-700 shrink-0">
                {d.photo_url
                  ? <img src={d.photo_url} alt="" className="w-full h-full object-cover" />
                  : d.name?.[0]?.toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{d.name}</p>
                <p className="text-xs text-gray-500 truncate">{d.breed}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
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
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex justify-between items-center">
        <div className="w-8 h-8 bg-gray-100 rounded" />
        <div className="w-32 h-8 bg-gray-100 rounded-full" />
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
