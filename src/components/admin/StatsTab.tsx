import { useEffect, useState } from 'react';
import { PRICES } from '../../lib/prices';
import { supabase } from '../../lib/supabase';

const TYPE_LABEL: Record<string, string> = {
  fulltime: 'Heltid',
  'parttime-3': 'Deltid 3 dgr',
  'parttime-2': 'Deltid 2 dgr',
  singleDay: 'Enstaka',
  boarding: 'Pensionat',
};

const PRICE_BY_TYPE: Record<string, number> = {
  fulltime: PRICES.staffanstorp.fulltime,
  'parttime-3': PRICES.staffanstorp.parttime3,
  'parttime-2': PRICES.staffanstorp.parttime2,
  singleDay: 0,
  boarding: 0,
};

export default function StatsTab() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!supabase) { setLoading(false); return; }
      const { data: dogs } = await supabase.from('dogs').select('type').eq('is_active', true);
      const c: Record<string, number> = {};
      for (const d of dogs ?? []) {
        const t = (d as { type: string | null }).type ?? 'unknown';
        c[t] = (c[t] ?? 0) + 1;
      }
      setCounts(c);
      const { count } = await supabase
        .from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      setPending(count ?? 0);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div>Laddar statistik…</div>;

  const monthlyRevenue = Object.entries(counts).reduce(
    (sum, [type, n]) => sum + (PRICE_BY_TYPE[type] ?? 0) * n, 0
  );

  const totalDogs = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Statistik &amp; ekonomi</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Aktiva hundar" value={totalDogs} />
        <Stat label="Förväntad månadsintäkt" value={`${monthlyRevenue.toLocaleString('sv-SE')} kr`} />
        <Stat label="Väntande förfrågningar" value={pending} highlight={pending > 0} />
      </div>

      <div className="bg-white rounded-2xl shadow p-4">
        <h3 className="font-semibold mb-2">Hundar per typ</h3>
        <ul className="text-sm">
          {Object.entries(counts).map(([type, n]) => (
            <li key={type} className="flex justify-between border-b py-1.5">
              <span>{TYPE_LABEL[type] ?? type}</span>
              <span className="font-medium">{n}</span>
            </li>
          ))}
          {Object.keys(counts).length === 0 && (
            <li className="text-gray-500 py-2">Inga aktiva hundar.</li>
          )}
        </ul>
      </div>

      <p className="text-xs text-gray-500">
        Intäktsberäkning räknar bara månadsabonnemang (heltid/deltid). Enstaka dagar och pensionat varierar och visas inte här.
      </p>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <div className={`bg-white rounded-2xl shadow p-4 ${highlight ? 'ring-2 ring-yellow-400' : ''}`}>
      <p className="text-xs text-gray-500 uppercase">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
