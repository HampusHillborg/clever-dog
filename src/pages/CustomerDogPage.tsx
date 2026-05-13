import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import CustomerLayout from '../components/customer/CustomerLayout';
import DogInfoTab from '../components/customer/DogInfoTab';
import BookingCalendar from '../components/customer/BookingCalendar';
import MessagesTab from '../components/customer/MessagesTab';
import ContractView from '../components/customer/ContractView';
import { getMyDog, type Dog } from '../lib/customerApi';

type TabKey = 'info' | 'calendar' | 'messages' | 'contract';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'info', label: 'Info' },
  { key: 'calendar', label: 'Kalender' },
  { key: 'messages', label: 'Meddelanden' },
  { key: 'contract', label: 'Kontrakt' },
];

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

  if (loading) return <CustomerLayout><p>Laddar…</p></CustomerLayout>;
  if (!dog) return (
    <CustomerLayout>
      <p className="text-gray-500">Hunden hittades inte eller är inte kopplad till ditt konto.</p>
      <Link to="/kund" className="text-primary hover:underline">← Tillbaka</Link>
    </CustomerLayout>
  );

  return (
    <CustomerLayout>
      <Link to="/kund" className="inline-flex items-center gap-2 text-sm text-gray-600 mb-4 hover:text-primary">
        <FaArrowLeft /> Tillbaka
      </Link>
      <h1 className="text-2xl font-bold mb-1">{dog.name}</h1>
      <p className="text-gray-500 mb-4">{dog.breed} · {dog.age}</p>

      <div className="border-b mb-4">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                tab === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'info' && <DogInfoTab dog={dog} onUpdate={setDog} />}
      {tab === 'calendar' && <BookingCalendar dog={dog} />}
      {tab === 'messages' && <MessagesTab dog={dog} />}
      {tab === 'contract' && <ContractView dog={dog} />}
    </CustomerLayout>
  );
}
