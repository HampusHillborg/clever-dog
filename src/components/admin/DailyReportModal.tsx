import { useEffect, useState } from 'react';
import { FaTimes, FaSmile, FaMeh, FaFrown, FaCheck } from 'react-icons/fa';
import {
  getDailyReport, upsertDailyReport, upsertDailyReportBulk,
  type DailyReportPatch, type DailyReport,
} from '../../lib/customerApi';

type Mood = NonNullable<DailyReportPatch['mood']>;
type Food = NonNullable<DailyReportPatch['food_eaten']>;
type Activity = NonNullable<DailyReportPatch['activity_level']>;

export type OtherDogItem = { id: string; name: string };

export default function DailyReportModal({ dogId, dogName, otherDogsToday = [], onClose, onSaved }: {
  dogId: string;
  dogName: string;
  otherDogsToday?: OtherDogItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<DailyReport | null>(null);

  const [mood, setMood] = useState<Mood | null>(null);
  const [food, setFood] = useState<Food | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [pooped, setPooped] = useState<boolean | null>(null);
  const [note, setNote] = useState('');

  // Multi-report state
  const [applyToOthers, setApplyToOthers] = useState(false);
  const [otherDogIds, setOtherDogIds] = useState<string[]>([]);

  useEffect(() => {
    getDailyReport(dogId).then(r => {
      setExisting(r);
      if (r) {
        setMood((r.mood as Mood | null) ?? null);
        setFood((r.food_eaten as Food | null) ?? null);
        setActivity((r.activity_level as Activity | null) ?? null);
        setPooped(r.pooped);
        setNote(r.note ?? '');
      }
      setLoading(false);
    });
  }, [dogId]);

  const toggleOtherDog = (id: string) => {
    setOtherDogIds(cur =>
      cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]
    );
  };

  const toggleAllOthers = () => {
    if (otherDogIds.length === otherDogsToday.length) {
      setOtherDogIds([]);
    } else {
      setOtherDogIds(otherDogsToday.map(d => d.id));
    }
  };

  const save = async () => {
    setSaving(true);
    const patch: DailyReportPatch = {
      mood,
      food_eaten: food,
      activity_level: activity,
      pooped,
      note: note.trim() || null,
    };
    try {
      await upsertDailyReport(dogId, patch);
      if (applyToOthers && otherDogIds.length > 0) {
        await upsertDailyReportBulk(otherDogIds, patch);
      }
      onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Kunde inte spara');
    }
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 bg-dark/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-lift animate-slide-in-top max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Dagrapport</p>
            <p className="font-semibold text-base truncate">{dogName}</p>
            {existing?.posted_by_name && (
              <p className="text-[11px] text-gray-400 mt-0.5">
                Senast uppdaterad av {existing.posted_by_name}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-500 flex items-center justify-center shrink-0"
            aria-label="Stäng"
          >
            <FaTimes className="text-sm" />
          </button>
        </div>

        {loading ? (
          <div className="p-6 text-center text-gray-400 text-sm">Laddar…</div>
        ) : (
          <div className="p-4 space-y-5 overflow-y-auto">
            <Field label="Humör">
              <ToggleGroup
                options={[
                  { value: 'happy', label: 'Glad', icon: <FaSmile className="text-green-500" /> },
                  { value: 'neutral', label: 'Okej', icon: <FaMeh className="text-yellow-500" /> },
                  { value: 'rough', label: 'Tråkig', icon: <FaFrown className="text-red-500" /> },
                ]}
                value={mood}
                onChange={v => setMood(v as Mood | null)}
              />
            </Field>

            <Field label="Åt sin mat">
              <ToggleGroup
                options={[
                  { value: 'all', label: 'Allt' },
                  { value: 'some', label: 'Lite' },
                  { value: 'none', label: 'Inget' },
                ]}
                value={food}
                onChange={v => setFood(v as Food | null)}
              />
            </Field>

            <Field label="Energinivå">
              <ToggleGroup
                options={[
                  { value: 'low', label: 'Lugn' },
                  { value: 'normal', label: 'Normal' },
                  { value: 'high', label: 'Energisk' },
                ]}
                value={activity}
                onChange={v => setActivity(v as Activity | null)}
              />
            </Field>

            <Field label="Bajs">
              <ToggleGroup
                options={[
                  { value: 'yes', label: 'Ja' },
                  { value: 'no', label: 'Nej' },
                ]}
                value={pooped === true ? 'yes' : pooped === false ? 'no' : null}
                onChange={v => setPooped(v === 'yes' ? true : v === 'no' ? false : null)}
              />
            </Field>

            <Field label="Anteckning till ägaren">
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
                placeholder="T.ex. 'Lekte mest med Max idag, fick lite extra vatten efter promenaden.'"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:bg-white focus:border-primary transition-colors resize-none"
              />
            </Field>

            <p className="text-xs text-gray-500 leading-snug">
              Alla fält är frivilliga. Kunden ser bara det du fyllt i — tomma fält
              visas inte. Du kan komma tillbaka och fylla i mer under dagen.
            </p>

            {/* Multi-report section */}
            {otherDogsToday.length > 0 && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <label className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={applyToOthers}
                    onChange={e => {
                      setApplyToOthers(e.target.checked);
                      if (!e.target.checked) setOtherDogIds([]);
                    }}
                    className="w-4 h-4 rounded accent-orange-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Använd samma rapport för andra hundar idag
                  </span>
                </label>

                {applyToOthers && (
                  <div className="border-t border-gray-100 p-3 space-y-1">
                    <button
                      type="button"
                      onClick={toggleAllOthers}
                      className="text-xs text-primary font-semibold mb-2 hover:underline"
                    >
                      {otherDogIds.length === otherDogsToday.length ? 'Avmarkera alla' : 'Markera alla'}
                    </button>
                    {otherDogsToday.map(dog => (
                      <label key={dog.id} className="flex items-center gap-3 py-1 cursor-pointer hover:bg-gray-50 rounded-lg px-1">
                        <input
                          type="checkbox"
                          checked={otherDogIds.includes(dog.id)}
                          onChange={() => toggleOtherDog(dog.id)}
                          className="w-4 h-4 rounded accent-orange-500"
                        />
                        <span className="text-sm text-gray-700">{dog.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="p-4 border-t border-gray-100 flex gap-2 shrink-0">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-gray-700 font-medium hover:bg-gray-100 disabled:opacity-50"
          >
            Avbryt
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-orange-600 disabled:opacity-50 active:scale-[0.98] transition-all shadow-card flex items-center justify-center gap-1.5"
          >
            <FaCheck className="text-xs" />
            {saving ? 'Sparar…' : applyToOthers && otherDogIds.length > 0 ? `Spara (${1 + otherDogIds.length} hundar)` : 'Spara rapport'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">{label}</p>
      {children}
    </div>
  );
}

function ToggleGroup<T extends string>({ options, value, onChange }: {
  options: Array<{ value: T; label: string; icon?: React.ReactNode }>;
  value: T | null;
  onChange: (v: T | null) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(active ? null : opt.value)}
            className={`flex-1 px-3 py-2 rounded-xl border text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
              active
                ? 'bg-orange-50 border-orange-300 text-orange-900'
                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
