import { useEffect, useState } from 'react';
import { FaCheck, FaUndo } from 'react-icons/fa';
import {
  getTodaysScheduledDogs, checkInDog, checkOutDog, undoCheckIn, undoCheckOut,
  type AttendanceEntry,
} from '../../lib/attendance';

const typeLabel = (t: string | undefined): string => {
  if (t === 'boarding') return 'Pensionat';
  if (t === 'extra') return 'Extra';
  if (t === 'single_day') return 'Enstaka';
  return 'Dagis';
};

const fmtTime = (iso: string | null): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

export default function TodayAttendanceTab() {
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = async () => setEntries(await getTodaysScheduledDogs());
  useEffect(() => { refresh().finally(() => setLoading(false)); }, []);

  const act = async (dogId: string, fn: () => Promise<void>) => {
    setBusy(dogId);
    try {
      await fn();
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Något gick fel');
    }
    setBusy(null);
  };

  if (loading) return <p className="text-gray-400">Laddar hundar…</p>;

  const pending = entries.filter(e => !e.checked_in_at);
  const here = entries.filter(e => e.checked_in_at && !e.checked_out_at);
  const gone = entries.filter(e => e.checked_in_at && e.checked_out_at);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Idag · {entries.length} hundar</h2>

      <Section title={`Att checka in (${pending.length})`} color="text-yellow-800">
        {pending.map(e => (
          <Row key={e.dog_id} entry={e} busy={busy === e.dog_id}>
            <button
              onClick={() => act(e.dog_id, () => checkInDog(e.dog_id))}
              disabled={busy === e.dog_id}
              className="bg-green-500 text-white px-4 py-2 rounded-lg disabled:opacity-50 flex items-center gap-1"
            >
              <FaCheck /> Checka in
            </button>
          </Row>
        ))}
      </Section>

      <Section title={`Här just nu (${here.length})`} color="text-green-800">
        {here.map(e => (
          <Row key={e.dog_id} entry={e} busy={busy === e.dog_id}>
            <div className="flex gap-2">
              <button
                onClick={() => act(e.dog_id, () => undoCheckIn(e.dog_id))}
                disabled={busy === e.dog_id}
                className="text-gray-500 px-2 py-2 rounded-lg disabled:opacity-50"
                title="Ångra incheckning"
              >
                <FaUndo />
              </button>
              <button
                onClick={() => act(e.dog_id, () => checkOutDog(e.dog_id))}
                disabled={busy === e.dog_id}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg disabled:opacity-50"
              >
                Checka ut
              </button>
            </div>
          </Row>
        ))}
      </Section>

      <Section title={`Hämtade (${gone.length})`} color="text-gray-500">
        {gone.map(e => (
          <Row key={e.dog_id} entry={e} busy={busy === e.dog_id}>
            <button
              onClick={() => act(e.dog_id, () => undoCheckOut(e.dog_id))}
              disabled={busy === e.dog_id}
              className="text-gray-500 px-2 py-2 rounded-lg disabled:opacity-50"
              title="Ångra utcheckning"
            >
              <FaUndo />
            </button>
          </Row>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, color, children }: {
  title: string; color: string; children: React.ReactNode;
}) {
  const arr = Array.isArray(children) ? children : [children];
  const filtered = arr.filter(Boolean);
  if (filtered.length === 0) return null;
  return (
    <div>
      <h3 className={`text-sm font-semibold uppercase tracking-wide mb-2 ${color}`}>{title}</h3>
      <div className="bg-white rounded-2xl shadow divide-y">{filtered}</div>
    </div>
  );
}

function Row({ entry, busy, children }: {
  entry: AttendanceEntry; busy: boolean; children: React.ReactNode;
}) {
  return (
    <div className={`p-3 flex items-center justify-between gap-3 ${busy ? 'opacity-50' : ''}`}>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{entry.dog_name}</p>
        <p className="text-xs text-gray-500 truncate">{entry.breed} · {entry.owner}</p>
        <p className="text-xs text-gray-600 mt-0.5">
          <span className="inline-block bg-gray-100 px-2 py-0.5 rounded">{typeLabel(entry.booking_type)}</span>
          {entry.checked_in_at && <span className="ml-2">In {fmtTime(entry.checked_in_at)}</span>}
          {entry.checked_out_at && <span className="ml-2">Ut {fmtTime(entry.checked_out_at)}</span>}
        </p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
