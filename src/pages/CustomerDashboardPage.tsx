import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaChevronRight, FaPaw } from 'react-icons/fa';
import CustomerLayout from '../components/customer/CustomerLayout';
import { getMyDogs, type Dog } from '../lib/customerApi';
import { getCustomerForUser } from '../lib/customerAuth';

const TYPE_LABEL: Record<string, string> = {
  fulltime: 'Heltid',
  'parttime-3': 'Deltid · 3 dgr/v',
  'parttime-2': 'Deltid · 2 dgr/v',
  singleDay: 'Enstaka dag',
  boarding: 'Pensionat',
};

const greetingFor = (now = new Date()): string => {
  const h = now.getHours();
  if (h < 5) return 'God natt';
  if (h < 10) return 'God morgon';
  if (h < 14) return 'Hej';
  if (h < 18) return 'God eftermiddag';
  return 'God kväll';
};

export default function CustomerDashboardPage() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMyDogs(), getCustomerForUser()]).then(([d, c]) => {
      setDogs(d);
      setName(c?.name ?? '');
      setLoading(false);
    });
  }, []);

  const firstName = name ? name.split(' ')[0] : '';

  return (
    <CustomerLayout>
      <div className="mb-6">
        <p className="text-sm text-gray-500 mb-1">{greetingFor()},</p>
        <h1 className="text-3xl font-bold tracking-tight">
          {firstName || 'där'} 👋
        </h1>
        <p className="text-gray-600 mt-1">
          {dogs.length === 0 ? 'Vi förbereder din portal.' :
            dogs.length === 1 ? 'Här är din hund.' :
            `Här är dina ${dogs.length} hundar.`}
        </p>
      </div>

      {loading ? (
        <DogCardsSkeleton />
      ) : dogs.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {dogs.map(d => (
            <Link
              key={d.id}
              to={`/kund/hund/${d.id}`}
              className="group relative bg-white rounded-2xl shadow-card hover:shadow-pop active:scale-[0.99] transition-all p-4 flex items-center gap-4 overflow-hidden"
            >
              {/* Subtle accent corner */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-50 to-transparent rounded-bl-full opacity-60" />

              <div className="relative w-16 h-16 rounded-2xl bg-orange-100 overflow-hidden flex items-center justify-center text-2xl font-bold text-orange-700 shrink-0 ring-2 ring-white shadow-card">
                {d.photo_url
                  ? <img src={d.photo_url} alt={d.name} className="w-full h-full object-cover" />
                  : d.name?.[0]?.toUpperCase()}
              </div>
              <div className="relative flex-1 min-w-0">
                <p className="font-semibold text-base truncate">{d.name}</p>
                <p className="text-sm text-gray-500 truncate">{d.breed}</p>
                {d.type && (
                  <span className="inline-flex items-center mt-1.5 text-[11px] font-medium text-orange-800 bg-orange-100 px-2 py-0.5 rounded-full">
                    {TYPE_LABEL[d.type] ?? d.type}
                  </span>
                )}
              </div>
              <FaChevronRight className="relative text-gray-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </CustomerLayout>
  );
}

function DogCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {[0, 1].map(i => (
        <div key={i} className="bg-white rounded-2xl shadow-card p-4 flex items-center gap-4 animate-pulse">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 bg-gray-100 rounded" />
            <div className="h-3 w-16 bg-gray-100 rounded" />
            <div className="h-4 w-20 bg-gray-100 rounded-full mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl shadow-card p-8 text-center">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center mb-4">
        <FaPaw className="text-2xl" />
      </div>
      <h2 className="font-semibold text-lg mb-1">Inga hundar kopplade än</h2>
      <p className="text-sm text-gray-500 max-w-xs mx-auto">
        Det ser ut som att ditt konto inte är kopplat till någon hund. Hör av dig till oss så fixar vi det.
      </p>
    </div>
  );
}
