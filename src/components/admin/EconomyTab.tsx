import { useEffect, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { computeBillingForMonth, type CustomerCost } from '../../lib/billing';

const MONTHS = [
  'Januari','Februari','Mars','April','Maj','Juni',
  'Juli','Augusti','September','Oktober','November','December',
];

const formatKr = (n: number): string =>
  `${Math.round(n).toLocaleString('sv-SE')} kr`;

const dogTypeLabel = (t: string | null): string => {
  if (t === 'fulltime') return 'Heltid';
  if (t === 'parttime-3') return 'Deltid 3';
  if (t === 'parttime-2') return 'Deltid 2';
  return '—';
};

export default function EconomyTab() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [costs, setCosts] = useState<CustomerCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CustomerCost | null>(null);

  useEffect(() => {
    setLoading(true);
    computeBillingForMonth(year, month).then(c => {
      setCosts(c);
      setLoading(false);
    });
  }, [year, month]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const totals = costs.reduce(
    (acc, c) => ({
      inkl: acc.inkl + c.total_inkl_moms,
      excl: acc.excl + c.total_excl_moms,
      vat: acc.vat + c.vat,
    }),
    { inkl: 0, excl: 0, vat: 0 },
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-lg sm:text-xl font-bold">Ekonomi · per kund</h2>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded">←</button>
          <span className="font-semibold min-w-[140px] text-center">
            {MONTHS[month]} {year}
          </span>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded">→</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <Stat label="Omsättning inkl moms" value={formatKr(totals.inkl)} highlight />
        <Stat label="Exkl moms" value={formatKr(totals.excl)} />
        <Stat label="Varav moms (25%)" value={formatKr(totals.vat)} />
      </div>

      {loading ? (
        <p className="text-gray-400">Beräknar…</p>
      ) : costs.length === 0 ? (
        <p className="text-gray-500 bg-white rounded-2xl shadow p-6 text-center">
          Inga fakturerbara kunder denna månad.
        </p>
      ) : (
        <div className="bg-white rounded-2xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3">Kund</th>
                <th className="p-3 text-right whitespace-nowrap">Grundavgift</th>
                <th className="p-3 text-right whitespace-nowrap">Extra dagar</th>
                <th className="p-3 text-right whitespace-nowrap">Pensionat</th>
                <th className="p-3 text-right whitespace-nowrap">Totalt</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {costs.map(c => {
                const monthlyBase = c.dogs.reduce((s, d) => s + d.monthly_base, 0);
                const extras = c.dogs.reduce((s, d) => s + d.extra_days_cost, 0);
                const boarding = c.dogs.reduce((s, d) => s + d.boarding_cost, 0);
                return (
                  <tr
                    key={c.customer_id}
                    onClick={() => setSelected(c)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="p-3">
                      <p className="font-semibold">{c.customer_name}</p>
                      <p className="text-xs text-gray-500">{c.customer_email}</p>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">{formatKr(monthlyBase)}</td>
                    <td className="p-3 text-right whitespace-nowrap">{formatKr(extras)}</td>
                    <td className="p-3 text-right whitespace-nowrap">{formatKr(boarding)}</td>
                    <td className="p-3 text-right whitespace-nowrap font-semibold">
                      {formatKr(c.total_inkl_moms)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <DetailModal cost={selected} year={year} month={month} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-1 ${highlight ? 'text-xl font-bold text-gray-900' : 'text-lg font-semibold text-gray-700'}`}>
        {value}
      </p>
    </div>
  );
}

function DetailModal({ cost, year, month, onClose }: {
  cost: CustomerCost;
  year: number;
  month: number;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">{cost.customer_name}</h3>
            <p className="text-sm text-gray-500">{MONTHS[month]} {year} · {cost.customer_email}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <FaTimes className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {cost.dogs.map(dog => (
            <div key={dog.dog_id} className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="font-semibold">{dog.dog_name}</p>
                  <p className="text-xs text-gray-500">
                    {dogTypeLabel(dog.dog_type)} · {dog.location === 'malmo' ? 'Malmö' : 'Staffanstorp'}
                  </p>
                </div>
                <p className="font-semibold">{formatKr(dog.subtotal)}</p>
              </div>
              <div className="text-sm space-y-1">
                <Line label="Grundavgift" value={formatKr(dog.monthly_base)} />
                {dog.extra_days_count > 0 && (
                  <Line
                    label={`Extra dagar (${dog.extra_days_count} st)`}
                    value={formatKr(dog.extra_days_cost)}
                  />
                )}
                {dog.boarding_nights > 0 && (
                  <Line
                    label={`Pensionat (${dog.boarding_nights} nätter)`}
                    value={formatKr(dog.boarding_cost)}
                  />
                )}
              </div>
            </div>
          ))}

          <div className="border-t pt-4 space-y-1 text-sm">
            <Line label="Exkl moms" value={formatKr(cost.total_excl_moms)} />
            <Line label="Moms (25%)" value={formatKr(cost.vat)} />
            <Line label="Totalt inkl moms" value={formatKr(cost.total_inkl_moms)} bold />
          </div>
        </div>
      </div>
    </div>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-bold text-base' : ''}`}>
      <span className="text-gray-700">{label}</span>
      <span>{value}</span>
    </div>
  );
}
