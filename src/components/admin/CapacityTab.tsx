import { useEffect, useState } from 'react';
import { FaPlus, FaTrash, FaChartBar } from 'react-icons/fa';
import {
  getCapacityDefaults, setCapacityDefault,
  getCapacityOverrides, setCapacityOverride, deleteCapacityOverride,
  getLocationSettings, setLocationSettings,
  type CapacityDefault, type CapacityOverride, type LocationSettings,
} from '../../lib/capacity';
import { BTN } from '../../lib/uiTokens';
import Sheet from '../shared/Sheet';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEEKDAY_LABELS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];

const fmtDate = (iso: string): string => {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('sv-SE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
};

// ---------------------------------------------------------------------------
// Weekday row
// ---------------------------------------------------------------------------

type WeekdayRowProps = {
  row: CapacityDefault;
  onSaved: () => void;
};

function WeekdayRow({ row, onSaved }: WeekdayRowProps) {
  const [soft, setSoft] = useState<string>(row.soft_limit?.toString() ?? '');
  const [hard, setHard] = useState<string>(row.hard_limit?.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync when parent data changes (e.g. after refresh)
  useEffect(() => {
    setSoft(row.soft_limit?.toString() ?? '');
    setHard(row.hard_limit?.toString() ?? '');
  }, [row.soft_limit, row.hard_limit]);

  const parseVal = (v: string): number | null => {
    const n = parseInt(v, 10);
    return isNaN(n) || n < 0 ? null : n;
  };

  const save = async () => {
    setSaving(true);
    try {
      await setCapacityDefault(row.weekday, parseVal(soft), parseVal(hard));
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      onSaved();
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const handleBlur = () => {
    const newSoft = parseVal(soft);
    const newHard = parseVal(hard);
    if (newSoft !== row.soft_limit || newHard !== row.hard_limit) {
      void save();
    }
  };

  const label = WEEKDAY_LABELS[row.weekday] ?? `Dag ${row.weekday}`;
  const isZeroDay = parseVal(hard) === 0;

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className="w-24 text-sm font-medium text-gray-700 shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 flex-1">
        <label className="text-xs text-gray-500 shrink-0">Mjuk</label>
        <input
          type="number"
          min={0}
          value={soft}
          onChange={e => setSoft(e.target.value)}
          onBlur={handleBlur}
          className="w-16 h-10 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          placeholder="—"
          aria-label={`Mjuk gräns ${label}`}
        />
        <label className="text-xs text-gray-500 shrink-0">Hård</label>
        <input
          type="number"
          min={0}
          value={hard}
          onChange={e => setHard(e.target.value)}
          onBlur={handleBlur}
          className="w-16 h-10 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          placeholder="—"
          aria-label={`Hård gräns ${label}`}
        />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isZeroDay && (
          <span className="text-xs text-red-600 font-medium">stängt</span>
        )}
        {saving && <span className="text-xs text-gray-400">sparar…</span>}
        {saved && !saving && <span className="text-xs text-green-600">✓</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Override sheet
// ---------------------------------------------------------------------------

type AddOverrideSheetProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

function AddOverrideSheet({ open, onClose, onSaved }: AddOverrideSheetProps) {
  const [date, setDate] = useState('');
  const [soft, setSoft] = useState('');
  const [hard, setHard] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setDate('');
    setSoft('');
    setHard('');
    setNote('');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const parseVal = (v: string): number | null => {
    const n = parseInt(v, 10);
    return isNaN(n) || n < 0 ? null : n;
  };

  const handleSave = async () => {
    setError('');
    if (!date) { setError('Välj ett datum.'); return; }
    setSaving(true);
    try {
      await setCapacityOverride(
        date,
        parseVal(soft), parseVal(hard),
        note.trim() || null,
      );
      onSaved();
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte spara');
    }
    setSaving(false);
  };

  return (
    <Sheet open={open} onClose={handleClose} title="Lägg till specialdag" blockBackdropClose>
      <div className="px-5 py-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full h-11 border border-gray-200 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mjuk gräns</label>
            <input
              type="number"
              min={0}
              value={soft}
              onChange={e => setSoft(e.target.value)}
              placeholder="(tom = standard)"
              className="w-full h-11 border border-gray-200 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hård gräns</label>
            <input
              type="number"
              min={0}
              value={hard}
              onChange={e => setHard(e.target.value)}
              placeholder="(tom = standard)"
              className="w-full h-11 border border-gray-200 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Anteckning (visas inte för kunder)</label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="t.ex. semester, helgdag, etc."
            className="w-full h-11 border border-gray-200 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={handleClose} className={`${BTN.secondary} flex-1`}>
            Avbryt
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`${BTN.primary} flex-1`}
          >
            {saving ? 'Sparar…' : 'Spara'}
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center">
          Lämna mjuk/hård tomma för att ärva veckodagens standard.
          Sätt hård = 0 för att stänga dagen.
        </p>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function CapacityTab() {
  const [defaults, setDefaults] = useState<CapacityDefault[]>([]);
  const [overrides, setOverrides] = useState<CapacityOverride[]>([]);
  const [settings, setSettings] = useState<LocationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingOverride, setAddingOverride] = useState(false);
  const [togglingBoarding, setTogglingBoarding] = useState(false);

  const refresh = async () => {
    const [d, o, s] = await Promise.all([
      getCapacityDefaults(),
      getCapacityOverrides(),
      getLocationSettings(),
    ]);
    setDefaults(d);
    setOverrides(o);
    setSettings(s);
    setLoading(false);
  };

  useEffect(() => { void refresh(); }, []);

  const handleToggleBoarding = async () => {
    if (!settings) return;
    setTogglingBoarding(true);
    try {
      await setLocationSettings({
        count_boarding_in_dagis: !settings.count_boarding_in_dagis,
      });
      await refresh();
    } catch (e) {
      console.error(e);
    }
    setTogglingBoarding(false);
  };

  const handleDeleteOverride = async (date: string) => {
    if (!confirm(`Ta bort specialdag ${fmtDate(date)}?`)) return;
    try {
      await deleteCapacityOverride(date);
      await refresh();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-xl" />
        ))}
      </div>
    );
  }

  const countBoarding = settings?.count_boarding_in_dagis ?? false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-orange-100 text-primary flex items-center justify-center shrink-0">
          <FaChartBar />
        </div>
        <div>
          <h2 className="font-bold text-lg">Dagis-kapacitet</h2>
          <p className="text-xs text-gray-500">Sätt gränser per veckodag. Mjuk = varning, Hård = spärr. 0 = stängt.</p>
        </div>
      </div>

      {/* Location settings toggle */}
      <div className="bg-white rounded-2xl shadow-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-800">Räkna pensionatshundar mot dagis-kapacitet</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Om på: hundar i pensionat räknas in i dagis-totalen och kan utlösa gränserna.
            </p>
          </div>
          <button
            onClick={handleToggleBoarding}
            disabled={togglingBoarding}
            className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${
              countBoarding ? 'bg-primary' : 'bg-gray-300'
            } disabled:opacity-50`}
            aria-label="Räkna pensionat mot kapacitet"
            role="switch"
            aria-checked={countBoarding}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                countBoarding ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Weekday defaults */}
      <div className="bg-white rounded-2xl shadow-card p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Standard per veckodag
        </h3>
        <p className="text-xs text-gray-400 mb-3">
          Auto-sparas när du klickar bort från ett fält.
        </p>
        <div>
          {defaults.map(row => (
            <WeekdayRow
              key={row.weekday}
              row={row}
              onSaved={refresh}
            />
          ))}
        </div>
        {defaults.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            Inga rader hittades. Kontakta support.
          </p>
        )}
      </div>

      {/* Overrides */}
      <div className="bg-white rounded-2xl shadow-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Specialdagar
          </h3>
          <button
            onClick={() => setAddingOverride(true)}
            className={`${BTN.ghost} flex items-center gap-1.5 text-sm`}
          >
            <FaPlus className="text-xs" /> Lägg till
          </button>
        </div>

        {overrides.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            Inga specialdagar inlagda. Lägg till semester, helgdagar, etc.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {overrides.map(o => (
              <div key={o.date} className="flex items-start gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 capitalize">
                    {fmtDate(o.date)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Mjuk: {o.soft_limit ?? 'standard'} · Hård: {o.hard_limit ?? 'standard'}
                    {o.note && ` · "${o.note}"`}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteOverride(o.date)}
                  className="w-9 h-9 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-600 flex items-center justify-center transition-colors shrink-0"
                  aria-label={`Ta bort ${o.date}`}
                >
                  <FaTrash className="text-xs" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddOverrideSheet
        open={addingOverride}
        onClose={() => setAddingOverride(false)}
        onSaved={refresh}
      />
    </div>
  );
}
