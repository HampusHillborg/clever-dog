import { useEffect, useState } from 'react';
import { FaCalendarTimes, FaPlus, FaTrash } from 'react-icons/fa';
import { listClosuresInRange, addClosure, removeClosure, type Closure } from '../../lib/closures';

const fmtDate = (iso: string): string => {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('sv-SE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
};

export default function ClosuresAdminTab() {
  const [items, setItems] = useState<Closure[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const horizon = new Date(today);
  horizon.setFullYear(today.getFullYear() + 2);

  const refresh = async () => {
    const data = await listClosuresInRange(todayIso, horizon.toISOString().slice(0, 10));
    setItems(data);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  const add = async () => {
    setError('');
    if (!date) { setError('Välj ett datum.'); return; }
    if (!reason.trim()) { setError('Skriv en anledning som kunderna ser.'); return; }
    setAdding(true);
    try {
      await addClosure(date, reason.trim());
      setDate('');
      setReason('');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte spara');
    }
    setAdding(false);
  };

  const remove = async (id: string) => {
    if (!confirm('Ta bort denna stängd dag?')) return;
    try {
      await removeClosure(id);
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Kunde inte ta bort');
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Stängda dagar</h2>
        <p className="text-sm text-gray-600 mt-1">
          Egna stängningar utöver svenska röda dagar (semestrar, utbildning, klämdagar).
          Kunder ser anledningen i sin kalender.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-card p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <FaPlus className="text-orange-500 text-sm" />
          <h3 className="font-semibold">Lägg till stängning</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
              Datum
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={todayIso}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-primary"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
              Anledning (visas för kunder)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="T.ex. Personalutbildning"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-primary"
            />
          </div>
        </div>
        {error && (
          <div className="mt-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}
        <div className="mt-3 flex justify-end">
          <button
            onClick={add}
            disabled={adding || !date || !reason.trim()}
            className="px-4 py-2 rounded-xl bg-primary text-white font-semibold hover:bg-orange-600 disabled:opacity-50 active:scale-[0.98] transition-all"
          >
            {adding ? 'Sparar…' : 'Lägg till'}
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2 px-1">
          Kommande stängningar
        </h3>
        {loading ? (
          <p className="text-gray-400 text-sm px-1">Laddar…</p>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-card p-8 text-center">
            <FaCalendarTimes className="text-3xl text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Inga egna stängningar inplanerade.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-card divide-y divide-gray-100">
            {items.map(c => (
              <div key={c.id} className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <FaCalendarTimes className="text-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm capitalize">{fmtDate(c.date)}</p>
                  <p className="text-xs text-gray-600">{c.reason}</p>
                </div>
                <button
                  onClick={() => remove(c.id)}
                  className="w-9 h-9 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center"
                  title="Ta bort"
                  aria-label="Ta bort"
                >
                  <FaTrash className="text-xs" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
