import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

export default function CustomerDashboardPage() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([getMyDogs(), getCustomerForUser()]).then(([d, c]) => {
      setName(c?.name ?? '');
      // Single-dog accounts (the common case) should never see this list —
      // jump straight into the dog's page.
      if (d.length === 1) {
        navigate(`/kund/hund/${d[0]!.id}`, { replace: true });
        return;
      }
      setDogs(d);
      setLoading(false);
    });
  }, [navigate]);

  const firstName = name ? name.split(' ')[0] : '';

  if (loading) {
    return (
      <CustomerLayout>
        <DogListSkeleton />
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="mb-5">
        <p className="text-sm text-gray-500 mb-1">Inloggad som {firstName || 'kund'}</p>
        <h1 className="text-2xl font-bold tracking-tight">Välj hund</h1>
        <p className="text-gray-600 text-sm mt-1">
          Du har {dogs.length} hundar kopplade till ditt konto.
        </p>
      </div>

      {dogs.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-2">
          {dogs.map(d => (
            <Link
              key={d.id}
              to={`/kund/hund/${d.id}`}
              className="group bg-white rounded-2xl shadow-card hover:shadow-pop active:scale-[0.99] transition-all p-3 flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-xl bg-orange-100 overflow-hidden flex items-center justify-center text-lg font-bold text-orange-700 shrink-0">
                {d.photo_url
                  ? <img src={d.photo_url} alt={d.name} className="w-full h-full object-cover" />
                  : d.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{d.name}</p>
                <p className="text-xs text-gray-500 truncate">
                  {d.breed}
                  {d.type && <> · <span className="text-orange-700 font-medium">{TYPE_LABEL[d.type] ?? d.type}</span></>}
                </p>
              </div>
              <FaChevronRight className="text-gray-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 text-sm" />
            </Link>
          ))}
        </div>
      )}
    </CustomerLayout>
  );
}

function DogListSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-7 w-32 bg-gray-100 rounded mb-5" />
      {[0, 1].map(i => (
        <div key={i} className="bg-white rounded-2xl shadow-card p-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gray-100 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-24 bg-gray-100 rounded" />
            <div className="h-3 w-32 bg-gray-100 rounded" />
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
