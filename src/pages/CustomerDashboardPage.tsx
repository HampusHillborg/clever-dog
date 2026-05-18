import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPaw } from 'react-icons/fa';
import CustomerLayout from '../components/customer/CustomerLayout';
import { getMyDogs } from '../lib/customerApi';

export default function CustomerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getMyDogs().then(d => {
      // The dog page's pill row handles dog switching, so any customer with at
      // least one dog goes straight there. This dashboard only renders the
      // empty state for accounts with zero dogs.
      if (d.length >= 1) {
        navigate(`/kund/hund/${d[0]!.id}`, { replace: true });
        return;
      }
      setLoading(false);
    });
  }, [navigate]);

  if (loading) {
    return (
      <CustomerLayout>
        <div className="bg-white rounded-2xl shadow-card p-8 animate-pulse">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-100 mb-4" />
          <div className="h-4 w-32 mx-auto bg-gray-100 rounded mb-2" />
          <div className="h-3 w-48 mx-auto bg-gray-100 rounded" />
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="bg-white rounded-2xl shadow-card p-8 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center mb-4">
          <FaPaw className="text-2xl" />
        </div>
        <h2 className="font-semibold text-lg mb-1">Inga hundar kopplade än</h2>
        <p className="text-sm text-gray-500 max-w-xs mx-auto">
          Det ser ut som att ditt konto inte är kopplat till någon hund. Hör av dig till oss så fixar vi det.
        </p>
      </div>
    </CustomerLayout>
  );
}
