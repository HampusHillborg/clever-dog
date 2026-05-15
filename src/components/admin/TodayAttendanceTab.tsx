import { useEffect, useState } from 'react';
import { FaCheck, FaUndo, FaDog, FaCamera } from 'react-icons/fa';
import {
  getTodaysScheduledDogs, checkInDog, checkOutDog, undoCheckIn, undoCheckOut,
  type AttendanceEntry,
} from '../../lib/attendance';
import PostActivityModal from './PostActivityModal';

const typeLabel = (t: string | undefined): string => {
  if (t === 'boarding') return 'Pensionat';
  if (t === 'extra') return 'Extra';
  if (t === 'single_day') return 'Enstaka';
  return 'Dagis';
};

const typeStyle = (t: string | undefined): string => {
  if (t === 'boarding') return 'bg-purple-100 text-purple-800';
  if (t === 'extra') return 'bg-emerald-100 text-emerald-800';
  if (t === 'single_day') return 'bg-amber-100 text-amber-800';
  return 'bg-gray-100 text-gray-700';
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
  const [postingFor, setPostingFor] = useState<AttendanceEntry | null>(null);

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

  if (loading) return <TodaySkeleton />;

  const pending = entries.filter(e => !e.checked_in_at);
  const here = entries.filter(e => e.checked_in_at && !e.checked_out_at);
  const gone = entries.filter(e => e.checked_in_at && e.checked_out_at);
  const todayStr = new Date().toLocaleDateString('sv-SE', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">{todayStr}</p>
          <h2 className="text-2xl font-bold tracking-tight">Idag · {entries.length} hundar</h2>
        </div>
        <div className="flex gap-2 text-xs">
          <Pill color="yellow" label={`${pending.length} att checka in`} />
          <Pill color="green" label={`${here.length} här`} />
          <Pill color="gray" label={`${gone.length} hämtade`} />
        </div>
      </div>

      {entries.length === 0 && (
        <div className="bg-white rounded-2xl shadow-card p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-700 mx-auto mb-3 flex items-center justify-center">
            <FaDog className="text-xl" />
          </div>
          <p className="font-semibold mb-1">Inga hundar inplanerade idag</p>
          <p className="text-sm text-gray-500">Njut av en lugn dag, eller dubbelkolla schemaläggningen.</p>
        </div>
      )}

      <Section title={`Att checka in (${pending.length})`} headerClass="text-yellow-800">
        {pending.map(e => (
          <Row key={e.dog_id} entry={e} busy={busy === e.dog_id} onPost={() => setPostingFor(e)}>
            <button
              onClick={() => act(e.dog_id, () => checkInDog(e.dog_id))}
              disabled={busy === e.dog_id}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl font-medium disabled:opacity-50 flex items-center gap-1.5 shadow-card active:scale-95 transition-all"
            >
              <FaCheck className="text-xs" /> Checka in
            </button>
          </Row>
        ))}
      </Section>

      <Section title={`Här just nu (${here.length})`} headerClass="text-green-800">
        {here.map(e => (
          <Row key={e.dog_id} entry={e} busy={busy === e.dog_id} onPost={() => setPostingFor(e)}>
            <div className="flex gap-1.5">
              <button
                onClick={() => act(e.dog_id, () => undoCheckIn(e.dog_id))}
                disabled={busy === e.dog_id}
                className="w-10 h-10 rounded-xl hover:bg-gray-100 text-gray-500 flex items-center justify-center disabled:opacity-50"
                title="Ångra incheckning"
              >
                <FaUndo className="text-xs" />
              </button>
              <button
                onClick={() => act(e.dog_id, () => checkOutDog(e.dog_id))}
                disabled={busy === e.dog_id}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium disabled:opacity-50 shadow-card active:scale-95 transition-all"
              >
                Checka ut
              </button>
            </div>
          </Row>
        ))}
      </Section>

      <Section title={`Hämtade (${gone.length})`} headerClass="text-gray-500">
        {gone.map(e => (
          <Row key={e.dog_id} entry={e} busy={busy === e.dog_id} muted onPost={() => setPostingFor(e)}>
            <button
              onClick={() => act(e.dog_id, () => undoCheckOut(e.dog_id))}
              disabled={busy === e.dog_id}
              className="w-10 h-10 rounded-xl hover:bg-gray-100 text-gray-500 flex items-center justify-center disabled:opacity-50"
              title="Ångra utcheckning"
            >
              <FaUndo className="text-xs" />
            </button>
          </Row>
        ))}
      </Section>

      {postingFor && (
        <PostActivityModal
          dogId={postingFor.dog_id}
          dogName={postingFor.dog_name}
          onClose={() => setPostingFor(null)}
          onPosted={() => setPostingFor(null)}
        />
      )}
    </div>
  );
}

function Pill({ color, label }: { color: 'yellow' | 'green' | 'gray'; label: string }) {
  const styles: Record<typeof color, string> = {
    yellow: 'bg-yellow-100 text-yellow-800',
    green: 'bg-green-100 text-green-800',
    gray: 'bg-gray-100 text-gray-700',
  };
  return <span className={`px-2.5 py-1 rounded-full font-medium ${styles[color]}`}>{label}</span>;
}

function Section({ title, headerClass, children }: {
  title: string; headerClass: string; children: React.ReactNode;
}) {
  const arr = Array.isArray(children) ? children : [children];
  const filtered = arr.filter(Boolean);
  if (filtered.length === 0) return null;
  return (
    <div>
      <h3 className={`text-xs font-semibold uppercase tracking-wide mb-2 px-1 ${headerClass}`}>{title}</h3>
      <div className="bg-white rounded-2xl shadow-card divide-y divide-gray-100 overflow-hidden">{filtered}</div>
    </div>
  );
}

function Row({ entry, busy, muted, onPost, children }: {
  entry: AttendanceEntry;
  busy: boolean;
  muted?: boolean;
  onPost?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`p-3 flex items-center justify-between gap-3 transition-opacity ${busy ? 'opacity-50' : muted ? 'opacity-70' : ''}`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-11 h-11 rounded-xl bg-orange-100 text-orange-700 font-semibold flex items-center justify-center text-base shrink-0">
          {entry.dog_name[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{entry.dog_name}</p>
          <p className="text-xs text-gray-500 truncate">{entry.breed} · {entry.owner}</p>
          <div className="flex items-center gap-2 mt-1 text-[11px]">
            <span className={`px-1.5 py-0.5 rounded font-medium ${typeStyle(entry.booking_type)}`}>
              {typeLabel(entry.booking_type)}
            </span>
            {entry.checked_in_at && (
              <span className="text-gray-500">In <strong className="text-gray-700">{fmtTime(entry.checked_in_at)}</strong></span>
            )}
            {entry.checked_out_at && (
              <span className="text-gray-500">Ut <strong className="text-gray-700">{fmtTime(entry.checked_out_at)}</strong></span>
            )}
          </div>
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-1.5">
        {onPost && (
          <button
            onClick={onPost}
            className="w-10 h-10 rounded-xl text-orange-700 bg-orange-50 hover:bg-orange-100 flex items-center justify-center"
            title="Posta uppdatering till album"
            aria-label="Posta uppdatering"
          >
            <FaCamera className="text-sm" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

function TodaySkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-7 w-40 bg-gray-100 rounded" />
      <div className="bg-white rounded-2xl shadow-card divide-y divide-gray-100 overflow-hidden">
        {[0, 1, 2].map(i => (
          <div key={i} className="p-3 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gray-100" />
            <div className="flex-1 space-y-1">
              <div className="h-4 w-32 bg-gray-100 rounded" />
              <div className="h-3 w-24 bg-gray-100 rounded" />
            </div>
            <div className="w-28 h-10 bg-gray-100 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
