import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CustomerLayout from '../components/customer/CustomerLayout';
import { getMyDogs, type Dog } from '../lib/customerApi';
import { getCustomerForUser } from '../lib/customerAuth';

const TYPE_LABEL: Record<string, string> = {
  fulltime: 'Heltid',
  'parttime-3': 'Deltid (3 dgr)',
  'parttime-2': 'Deltid (2 dgr)',
  singleDay: 'Enstaka dag',
  boarding: 'Pensionat',
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

  return (
    <CustomerLayout>
      <h1 className="text-2xl font-bold mb-1">Hej, {name || 'där'}!</h1>
      <p className="text-gray-600 mb-6">Här är dina hundar.</p>

      {loading ? (
        <p>Laddar…</p>
      ) : dogs.length === 0 ? (
        <p className="text-gray-500">Inga hundar kopplade till ditt konto än. Kontakta oss om det är fel.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {dogs.map(d => (
            <Link
              key={d.id}
              to={`/kund/hund/${d.id}`}
              className="bg-white rounded-2xl shadow hover:shadow-lg transition p-4 flex items-center gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-2xl font-bold text-gray-500">
                {d.photo_url
                  ? <img src={d.photo_url} alt={d.name} className="w-full h-full object-cover" />
                  : d.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold">{d.name}</p>
                <p className="text-sm text-gray-500">{d.breed}</p>
                {d.type && <p className="text-xs text-primary mt-1">{TYPE_LABEL[d.type] ?? d.type}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </CustomerLayout>
  );
}
