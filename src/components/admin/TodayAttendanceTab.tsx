import { useEffect, useRef, useState } from 'react';
import { FaCheck, FaUndo, FaDog, FaCamera, FaPlus, FaClipboardCheck, FaChevronDown } from 'react-icons/fa';
import {
  getTodaysScheduledDogs, checkInDog, checkOutDog, undoCheckIn, undoCheckOut,
  checkOutGuest, undoCheckOutGuest, removeAttendanceEntry, checkInBulk,
  type AttendanceEntry,
} from '../../lib/attendance';
import PostActivityModal from './PostActivityModal';
import DogInfoModal from './DogInfoModal';
import AddDogToTodayModal from './AddDogToTodayModal';
import DailyReportModal from './DailyReportModal';
import { tapMedium } from '../../lib/haptics';
import { showToast } from '../customer/NotificationToast';
import { getDayCapacityOverview, capacityLevel, type DayCapacity } from '../../lib/capacity';
import { todayLocalIso } from '../../lib/localDate';

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

type FilterType = 'all' | 'dagis' | 'extra' | 'boarding';
type SortType = 'name' | 'recent' | 'status';

const FILTER_KEY = 'admin.today.filter';
const SORT_KEY = 'admin.today.sort';

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'Alla' },
  { value: 'dagis', label: 'Dagis' },
  { value: 'extra', label: 'Extra' },
  { value: 'boarding', label: 'Pensionat' },
];

const SORT_OPTIONS: { value: SortType; label: string }[] = [
  { value: 'name', label: 'Namn ▲' },
  { value: 'recent', label: 'Senaste ändring' },
  { value: 'status', label: 'Status' },
];

function filterEntry(e: AttendanceEntry, filter: FilterType): boolean {
  if (filter === 'all') return true;
  if (filter === 'dagis') return !e.booking_type || e.booking_type === 'scheduled' || e.booking_type === 'manual';
  if (filter === 'extra') return e.booking_type === 'extra';
  if (filter === 'boarding') return e.booking_type === 'boarding';
  return true;
}

function sortEntries(arr: AttendanceEntry[], sort: SortType): AttendanceEntry[] {
  return [...arr].sort((a, b) => {
    if (sort === 'name') return a.dog_name.localeCompare(b.dog_name, 'sv');
    if (sort === 'recent') {
      const ta = a.checked_out_at ?? a.checked_in_at ?? '';
      const tb = b.checked_out_at ?? b.checked_in_at ?? '';
      return tb.localeCompare(ta);
    }
    if (sort === 'status') {
      // pending(0) < here(1) < gone(2)
      const rank = (e: AttendanceEntry) => !e.checked_in_at ? 0 : !e.checked_out_at ? 1 : 2;
      return rank(a) - rank(b);
    }
    return 0;
  });
}

export default function TodayAttendanceTab() {
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [todayCap, setTodayCap] = useState<DayCapacity | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [justCheckedIn, setJustCheckedIn] = useState<string | null>(null);
  const [postingFor, setPostingFor] = useState<AttendanceEntry | null>(null);
  const [reportingFor, setReportingFor] = useState<AttendanceEntry | null>(null);
  const [infoFor, setInfoFor] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('name');
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState<Record<'pending' | 'here' | 'gone', boolean>>({
    pending: false, here: false, gone: true,
  });

  const refresh = async () => setEntries(await getTodaysScheduledDogs());
  useEffect(() => {
    refresh().finally(() => setLoading(false));
    const today = todayLocalIso();
    getDayCapacityOverview(today, today).then(rows => {
      setTodayCap(rows[0] ?? null);
    });
  }, []);

  // Load persisted filter/sort/collapsed
  useEffect(() => {
    const f = localStorage.getItem(FILTER_KEY) as FilterType | null;
    const s = localStorage.getItem(SORT_KEY) as SortType | null;
    if (f && FILTER_OPTIONS.some(o => o.value === f)) setFilter(f);
    if (s && SORT_OPTIONS.some(o => o.value === s)) setSort(s);
    try {
      const c = localStorage.getItem('admin.today.collapsed');
      if (c) setCollapsed(prev => ({ ...prev, ...JSON.parse(c) }));
    } catch { /* ignore */ }
  }, []);

  // Persist filter/sort/collapsed on change
  useEffect(() => { localStorage.setItem(FILTER_KEY, filter); }, [filter]);
  useEffect(() => { localStorage.setItem(SORT_KEY, sort); }, [sort]);
  useEffect(() => { localStorage.setItem('admin.today.collapsed', JSON.stringify(collapsed)); }, [collapsed]);

  const toggleCollapsed = (section: 'pending' | 'here' | 'gone') => {
    setCollapsed(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Close sort dropdown on outside click
  useEffect(() => {
    if (!sortOpen) return;
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [sortOpen]);

  const keyFor = (e: AttendanceEntry) => e.dog_id ?? `guest:${e.id}`;

  // Optimistic check-in: immediately move dog to "here", then call backend
  const handleCheckIn = (e: AttendanceEntry) => {
    if (!e.dog_id) return;
    const k = keyFor(e);
    tapMedium();
    const now = new Date().toISOString();
    const prev = entries;
    // Optimistic update
    setEntries(cur => cur.map(entry =>
      keyFor(entry) === k ? { ...entry, checked_in_at: now } : entry
    ));
    setJustCheckedIn(k);
    setTimeout(() => setJustCheckedIn(v => v === k ? null : v), 1000);

    void checkInDog(e.dog_id).catch(() => {
      setEntries(prev);
      showToast({ title: 'Kunde inte spara', body: 'Försök igen' });
    });
  };

  // Optimistic check-out: immediately move dog to "gone", then call backend
  const handleCheckOut = (e: AttendanceEntry) => {
    const k = keyFor(e);
    tapMedium();
    const now = new Date().toISOString();
    const prev = entries;
    // Optimistic update
    setEntries(cur => cur.map(entry =>
      keyFor(entry) === k ? { ...entry, checked_out_at: now } : entry
    ));

    const fn = e.dog_id ? checkOutDog(e.dog_id) : checkOutGuest(e.id!);
    void fn.catch(() => {
      setEntries(prev);
      showToast({ title: 'Kunde inte spara', body: 'Försök igen' });
    });
  };

  // Undo check-in (optimistic)
  const handleUndoCheckIn = (e: AttendanceEntry) => {
    const k = keyFor(e);
    tapMedium();
    const prev = entries;
    setEntries(cur => cur.map(entry =>
      keyFor(entry) === k ? { ...entry, checked_in_at: null } : entry
    ));

    const fn = e.dog_id ? undoCheckIn(e.dog_id) : removeAttendanceEntry(e.id!);
    void fn.catch(() => {
      setEntries(prev);
      showToast({ title: 'Kunde inte spara', body: 'Försök igen' });
    });
  };

  // Undo check-out (optimistic)
  const handleUndoCheckOut = (e: AttendanceEntry) => {
    const k = keyFor(e);
    tapMedium();
    const prev = entries;
    setEntries(cur => cur.map(entry =>
      keyFor(entry) === k ? { ...entry, checked_out_at: null } : entry
    ));

    const fn = e.dog_id ? undoCheckOut(e.dog_id) : undoCheckOutGuest(e.id!);
    void fn.catch(() => {
      setEntries(prev);
      showToast({ title: 'Kunde inte spara', body: 'Försök igen' });
    });
  };

  // Batch check-in all pending dogs (optimistic)
  const handleBatchCheckIn = (pendingEntries: AttendanceEntry[]) => {
    const dogIds = pendingEntries.map(e => e.dog_id).filter((id): id is string => Boolean(id));
    if (dogIds.length === 0) return;
    tapMedium();
    const now = new Date().toISOString();
    const prev = entries;
    const pendingKeys = new Set(pendingEntries.map(e => keyFor(e)));
    setEntries(cur => cur.map(entry =>
      pendingKeys.has(keyFor(entry)) ? { ...entry, checked_in_at: now } : entry
    ));

    void checkInBulk(dogIds).catch(() => {
      setEntries(prev);
      showToast({ title: 'Batch-incheckning misslyckades', body: 'Försök igen' });
    });
  };

  if (loading) return <TodaySkeleton />;

  const filtered = sortEntries(entries.filter(e => filterEntry(e, filter)), sort);
  const pending = filtered.filter(e => !e.checked_in_at);
  const here = filtered.filter(e => e.checked_in_at && !e.checked_out_at);
  const gone = filtered.filter(e => e.checked_in_at && e.checked_out_at);
  const todayStr = new Date().toLocaleDateString('sv-SE', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sort)?.label ?? 'Sortera';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">{todayStr}</p>
          <h2 className="text-2xl font-bold tracking-tight">
            Idag · {entries.length} hundar
            {todayCap && todayCap.hard_limit != null && (
              <span className={`ml-2 text-base font-semibold ${
                capacityLevel(todayCap) === 'full'
                  ? 'text-red-600'
                  : capacityLevel(todayCap) === 'busy'
                    ? 'text-yellow-600'
                    : 'text-green-600'
              }`}>
                ({todayCap.booked}/{todayCap.hard_limit})
              </span>
            )}
          </h2>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Pill color="yellow" label={`${pending.length} att checka in`} />
          <Pill color="green" label={`${here.length} här`} />
          <Pill color="gray" label={`${gone.length} hämtade`} />
        </div>
      </div>

      {/* Filter chips + sort */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-1 flex-wrap">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filter === opt.value
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="relative shrink-0" ref={sortRef}>
          <button
            onClick={() => setSortOpen(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            {currentSortLabel}
            <FaChevronDown className={`text-[10px] transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lift border border-gray-100 overflow-hidden z-20 min-w-[160px]">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setSort(opt.value); setSortOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    sort === opt.value
                      ? 'bg-orange-50 text-primary font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => setAdding(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white shadow-card border border-dashed border-gray-300 text-gray-600 hover:text-primary hover:border-primary hover:bg-orange-50/40 transition-colors"
      >
        <FaPlus className="text-xs" />
        <span className="text-sm font-medium">Lägg till hund manuellt</span>
      </button>

      {entries.length === 0 && (
        <div className="bg-white rounded-2xl shadow-card p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-700 mx-auto mb-3 flex items-center justify-center">
            <FaDog className="text-xl" />
          </div>
          <p className="font-semibold mb-1">Inga hundar inplanerade idag</p>
          <p className="text-sm text-gray-500">Njut av en lugn dag, eller dubbelkolla schemaläggningen.</p>
        </div>
      )}

      {pending.length >= 3 && (
        <button
          onClick={() => handleBatchCheckIn(pending)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-500 hover:bg-green-600 active:scale-[0.98] text-white font-semibold shadow-card transition-all"
        >
          <FaCheck className="text-sm" />
          Markera alla väntande som ankomna ({pending.length})
        </button>
      )}

      <CollapsibleSection
        title={`Att checka in (${pending.length})`}
        headerClass="text-yellow-800"
        collapsed={collapsed.pending}
        onToggle={() => toggleCollapsed('pending')}
      >
        {pending.map(e => {
          const k = keyFor(e);
          return (
            <Row key={k} entry={e} busy={busy === k} justCheckedIn={justCheckedIn === k} onPost={e.dog_id ? () => setPostingFor(e) : undefined} onReport={e.dog_id ? () => setReportingFor(e) : undefined} onInfo={e.dog_id ? () => setInfoFor(e.dog_id!) : undefined}>
              <button
                onClick={() => handleCheckIn(e)}
                disabled={!e.dog_id}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl font-medium disabled:opacity-50 flex items-center gap-1.5 shadow-card active:scale-95 transition-all"
              >
                <FaCheck className="text-xs" /> Checka in
              </button>
            </Row>
          );
        })}
      </CollapsibleSection>

      <CollapsibleSection
        title={`Här just nu (${here.length})`}
        headerClass="text-green-800"
        collapsed={collapsed.here}
        onToggle={() => toggleCollapsed('here')}
      >
        {here.map(e => {
          const k = keyFor(e);
          return (
            <Row key={k} entry={e} busy={busy === k} justCheckedIn={justCheckedIn === k} onPost={e.dog_id ? () => setPostingFor(e) : undefined} onReport={e.dog_id ? () => setReportingFor(e) : undefined} onInfo={e.dog_id ? () => setInfoFor(e.dog_id!) : undefined}>
              <div className="flex gap-1.5">
                <button
                  onClick={() => handleUndoCheckIn(e)}
                  disabled={busy === k}
                  className="w-10 h-10 rounded-xl hover:bg-gray-100 text-gray-500 flex items-center justify-center disabled:opacity-50"
                  title="Ångra incheckning"
                >
                  <FaUndo className="text-xs" />
                </button>
                <button
                  onClick={() => handleCheckOut(e)}
                  disabled={busy === k}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium disabled:opacity-50 shadow-card active:scale-95 transition-all"
                >
                  Checka ut
                </button>
              </div>
            </Row>
          );
        })}
      </CollapsibleSection>

      <CollapsibleSection
        title={`Hämtade (${gone.length})`}
        headerClass="text-gray-500"
        collapsed={collapsed.gone}
        onToggle={() => toggleCollapsed('gone')}
      >
        {gone.map(e => {
          const k = keyFor(e);
          return (
            <Row key={k} entry={e} busy={busy === k} muted justCheckedIn={false} onPost={e.dog_id ? () => setPostingFor(e) : undefined} onReport={e.dog_id ? () => setReportingFor(e) : undefined} onInfo={e.dog_id ? () => setInfoFor(e.dog_id!) : undefined}>
              <button
                onClick={() => handleUndoCheckOut(e)}
                disabled={busy === k}
                className="w-10 h-10 rounded-xl hover:bg-gray-100 text-gray-500 flex items-center justify-center disabled:opacity-50"
                title="Ångra utcheckning"
              >
                <FaUndo className="text-xs" />
              </button>
            </Row>
          );
        })}
      </CollapsibleSection>

      {postingFor && postingFor.dog_id && (
        <PostActivityModal
          dogId={postingFor.dog_id}
          dogName={postingFor.dog_name}
          onClose={() => setPostingFor(null)}
          onPosted={() => setPostingFor(null)}
        />
      )}

      {reportingFor && reportingFor.dog_id && (
        <DailyReportModal
          dogId={reportingFor.dog_id}
          dogName={reportingFor.dog_name}
          otherDogsToday={entries
            .filter(e => e.dog_id && e.dog_id !== reportingFor.dog_id)
            .map(e => ({ id: e.dog_id!, name: e.dog_name }))}
          onClose={() => setReportingFor(null)}
          onSaved={() => setReportingFor(null)}
        />
      )}

      {infoFor && (
        <DogInfoModal dogId={infoFor} onClose={() => setInfoFor(null)} />
      )}

      {adding && (
        <AddDogToTodayModal
          excludeDogIds={entries.map(e => e.dog_id).filter((id): id is string => Boolean(id))}
          onClose={() => setAdding(false)}
          onAdded={() => { setAdding(false); refresh(); }}
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

function CollapsibleSection({ title, headerClass, collapsed, onToggle, children }: {
  title: string;
  headerClass: string;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const arr = Array.isArray(children) ? children : [children];
  const filtered = arr.filter(Boolean);
  if (filtered.length === 0) return null;
  return (
    <div>
      <button
        onClick={onToggle}
        className={`flex items-center gap-1.5 w-full text-left mb-2 px-1 group`}
      >
        <h3 className={`text-xs font-semibold uppercase tracking-wide flex-1 ${headerClass}`}>{title}</h3>
        <FaChevronDown
          className={`text-[10px] transition-transform text-gray-400 group-hover:text-gray-600 ${collapsed ? '' : 'rotate-180'}`}
        />
      </button>
      {!collapsed && (
        <div className="bg-white rounded-2xl shadow-card divide-y divide-gray-100 overflow-hidden">{filtered}</div>
      )}
    </div>
  );
}

function Row({ entry, busy, muted, justCheckedIn, onPost, onReport, onInfo, children }: {
  entry: AttendanceEntry;
  busy: boolean;
  muted?: boolean;
  justCheckedIn: boolean;
  onPost?: () => void;
  onReport?: () => void;
  onInfo?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`p-3 transition-all ${busy ? 'opacity-50' : muted ? 'opacity-70' : ''} ${justCheckedIn ? 'bg-green-50 animate-pulse' : ''}`}>
      <button
        onClick={onInfo}
        disabled={!onInfo}
        className="flex items-center gap-3 w-full text-left hover:bg-gray-50 -m-1 p-1 rounded-lg disabled:hover:bg-transparent"
      >
        <div className="w-11 h-11 rounded-xl bg-orange-100 text-orange-700 font-semibold flex items-center justify-center text-base shrink-0">
          {entry.dog_name[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{entry.dog_name}</p>
          <p className="text-xs text-gray-500 truncate">{entry.breed} · {entry.owner}</p>
          <div className="flex items-center gap-2 mt-1 text-[11px] flex-wrap">
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
      </button>
      <div className="mt-2.5 pl-14 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {onReport && (
            <button
              onClick={onReport}
              className="w-9 h-9 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center"
              title="Dagrapport"
              aria-label="Dagrapport"
            >
              <FaClipboardCheck className="text-sm" />
            </button>
          )}
          {onPost && (
            <button
              onClick={onPost}
              className="w-9 h-9 rounded-lg text-orange-700 bg-orange-50 hover:bg-orange-100 flex items-center justify-center"
              title="Posta uppdatering till album"
              aria-label="Posta uppdatering"
            >
              <FaCamera className="text-sm" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {children}
        </div>
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
