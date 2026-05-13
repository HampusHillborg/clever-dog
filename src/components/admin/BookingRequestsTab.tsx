import { useEffect, useState } from 'react';
import { FaCheck, FaTimes } from 'react-icons/fa';
import { getPendingBookings, approveBooking, rejectBooking, type PendingBooking } from '../../lib/database';

export default function BookingRequestsTab() {
  const [items, setItems] = useState<PendingBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    setItems(await getPendingBookings());
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  const approve = async (id: string) => {
    await approveBooking(id);
    refresh();
  };
  const reject = async (id: string) => {
    const response = prompt('Anledning (visas för kunden, frivilligt):') ?? undefined;
    await rejectBooking(id, response);
    refresh();
  };

  if (loading) return <div>Laddar förfrågningar…</div>;
  if (items.length === 0) return <div className="text-gray-500">Inga väntande förfrågningar.</div>;

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-bold mb-3">Bokningsförfrågningar</h2>
      {items.map(b => (
        <div key={b.id} className="bg-white rounded-2xl shadow p-4 flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="font-semibold">{b.dogs?.name ?? '?'} ({b.dogs?.breed ?? '?'}) — {b.customers?.name ?? '?'}</p>
            <p className="text-sm text-gray-500">{b.customers?.email ?? ''}</p>
            <p className="mt-1 text-sm">
              <span className="font-medium">
                {b.booking_type === 'boarding' ? 'Pensionat' : 'Enstaka dag'}
              </span>:{' '}
              {b.start_date}{b.end_date !== b.start_date ? ` → ${b.end_date}` : ''}
            </p>
            {b.notes && <p className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded">{b.notes}</p>}
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => approve(b.id)}
                    className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600" title="Godkänn">
              <FaCheck />
            </button>
            <button onClick={() => reject(b.id)}
                    className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600" title="Avslå">
              <FaTimes />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
