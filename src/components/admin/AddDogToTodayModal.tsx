import { useEffect, useMemo, useState } from 'react';
import { FaTimes, FaSearch, FaUserPlus } from 'react-icons/fa';
import {
  addDogToToday, addGuestToToday, listAllDogsForPicker,
  type DogPickerItem,
} from '../../lib/attendance';

type Mode = 'list' | 'guest';

export default function AddDogToTodayModal({
  excludeDogIds,
  onClose,
  onAdded,
}: {
  excludeDogIds: string[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [mode, setMode] = useState<Mode>('list');
  const [all, setAll] = useState<DogPickerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestOwner, setGuestOwner] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listAllDogsForPicker().then(d => {
      setAll(d);
      setLoading(false);
    });
  }, []);

  const excludeSet = useMemo(() => new Set(excludeDogIds), [excludeDogIds]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all
      .filter(d => !excludeSet.has(d.id))
      .filter(d => !q ||
        d.name.toLowerCase().includes(q) ||
        d.breed.toLowerCase().includes(q) ||
        d.owner.toLowerCase().includes(q));
  }, [all, excludeSet, query]);

  const pickDog = async (d: DogPickerItem) => {
    setBusy(true);
    setError('');
    try {
      await addDogToToday(d.id);
      onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte lägga till');
    }
    setBusy(false);
  };

  const addGuest = async () => {
    setError('');
    const name = guestName.trim();
    if (!name) { setError('Hundens namn krävs.'); return; }
    setBusy(true);
    try {
      await addGuestToToday({ name, owner: guestOwner.trim() || undefined });
      onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte lägga till');
    }
    setBusy(false);
  };

  return (
    <div
      className="fixed inset-0 bg-dark/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-lift animate-slide-in-top max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Idag</p>
            <p className="font-semibold text-base">Lägg till hund</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-500 flex items-center justify-center shrink-0"
            aria-label="Stäng"
          >
            <FaTimes className="text-sm" />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="px-4 pt-3 shrink-0">
          <div className="bg-gray-100 rounded-xl p-1 flex">
            <ModeButton active={mode === 'list'} onClick={() => setMode('list')} label="Från listan" />
            <ModeButton active={mode === 'guest'} onClick={() => setMode('guest')} label="Ny för hand" />
          </div>
        </div>

        {mode === 'list' ? (
          <>
            <div className="px-4 py-3 shrink-0">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Sök hund, ras eller ägare"
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-primary"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-3">
              {loading ? (
                <p className="text-center text-gray-400 text-sm py-6">Laddar…</p>
              ) : filtered.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-6">
                  {all.length === 0 ? 'Inga hundar registrerade.' : 'Inga matchningar.'}
                </p>
              ) : (
                <div className="space-y-0.5">
                  {filtered.map(d => (
                    <button
                      key={d.id}
                      onClick={() => pickDog(d)}
                      disabled={busy}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-lg text-left disabled:opacity-50"
                    >
                      <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 font-semibold flex items-center justify-center shrink-0">
                        {d.name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{d.name}</p>
                        <p className="text-xs text-gray-500 truncate">{d.breed} · {d.owner}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-4 space-y-3 overflow-y-auto">
            <div className="rounded-xl bg-orange-50 border border-orange-200 px-3 py-2.5 flex items-start gap-2">
              <FaUserPlus className="text-orange-700 mt-0.5 shrink-0" />
              <p className="text-xs text-orange-900 leading-snug">
                Lägg till en hund som inte finns i systemet (provdag, gäst, walk-in).
                Den registreras bara i dagens incheckning.
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                Hundens namn *
              </label>
              <input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="T.ex. Buddy"
                autoFocus
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                Ägare (frivilligt)
              </label>
              <input
                value={guestOwner}
                onChange={(e) => setGuestOwner(e.target.value)}
                placeholder="Namn eller telefon"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-primary"
              />
            </div>
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
                {error}
              </div>
            )}
            <button
              onClick={addGuest}
              disabled={busy || !guestName.trim()}
              className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-orange-600 disabled:opacity-50 active:scale-[0.98] transition-all shadow-card"
            >
              {busy ? 'Lägger till…' : 'Lägg till och checka in'}
            </button>
          </div>
        )}

        {mode === 'list' && error && (
          <div className="px-4 pb-4">
            <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ModeButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-white text-dark shadow-card' : 'text-gray-500'
      }`}
    >
      {label}
    </button>
  );
}
