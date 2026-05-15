import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaArrowLeft, FaInfoCircle, FaCalendarAlt, FaCommentDots, FaFileContract } from 'react-icons/fa';
import CustomerLayout from '../components/customer/CustomerLayout';
import DogInfoTab from '../components/customer/DogInfoTab';
import BookingCalendar from '../components/customer/BookingCalendar';
import MessagesTab from '../components/customer/MessagesTab';
import ContractView from '../components/customer/ContractView';
import { getMyDog, type Dog } from '../lib/customerApi';

type TabKey = 'info' | 'calendar' | 'messages' | 'contract';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'info',     label: 'Info',        icon: <FaInfoCircle /> },
  { key: 'calendar', label: 'Kalender',    icon: <FaCalendarAlt /> },
  { key: 'messages', label: 'Meddelanden', icon: <FaCommentDots /> },
  { key: 'contract', label: 'Kontrakt',    icon: <FaFileContract /> },
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
  const [dog, setDog] = useState<Dog | null>(null);
  const [tab, setTab] = useState<TabKey>('info');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getMyDog(id).then(d => {
      setDog(d);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <CustomerLayout>
        <div className="animate-pulse">
          <div className="h-4 w-24 bg-gray-100 rounded mb-6" />
          <div className="bg-white rounded-2xl shadow-card p-5 flex items-center gap-4 mb-4">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-6 w-32 bg-gray-100 rounded" />
              <div className="h-4 w-24 bg-gray-100 rounded" />
            </div>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  if (!dog) return (
    <CustomerLayout>
      <Link to="/kund" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary mb-4">
        <FaArrowLeft /> Tillbaka
      </Link>
      <div className="bg-white rounded-2xl shadow-card p-6 text-center">
        <p className="text-gray-500">Hunden hittades inte eller är inte kopplad till ditt konto.</p>
      </div>
    </CustomerLayout>
  );

  return (
    <CustomerLayout>
      <Link
        to="/kund"
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary mb-4 -ml-1 px-2 py-1.5 rounded-lg hover:bg-white/60 transition-colors"
      >
        <FaArrowLeft className="text-xs" /> Tillbaka
      </Link>

      {/* Hero card */}
      <div className="bg-white rounded-3xl shadow-card p-4 sm:p-5 flex items-center gap-4 mb-5 relative overflow-hidden">
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

      {/* Tab pills — horizontal scroll on narrow */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-none">
        {TABS.map(t => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2.5 rounded-full text-sm font-medium transition-all shrink-0 ${
                active
                  ? 'bg-primary text-white shadow-card'
                  : 'bg-white text-gray-700 hover:bg-gray-100 shadow-sm'
              }`}
            >
              <span className="text-xs">{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </div>

      <div>
        {tab === 'info' && <DogInfoTab dog={dog} onUpdate={setDog} />}
        {tab === 'calendar' && <BookingCalendar dog={dog} />}
        {tab === 'messages' && <MessagesTab dog={dog} />}
        {tab === 'contract' && <ContractView dog={dog} />}
      </div>
    </CustomerLayout>
  );
}
