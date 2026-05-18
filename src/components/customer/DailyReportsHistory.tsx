import { useEffect, useState } from 'react';
import { FaClipboardCheck, FaSmile, FaMeh, FaFrown } from 'react-icons/fa';
import { getRecentDailyReports, type DailyReport } from '../../lib/customerApi';

const fmtDate = (iso: string): string => {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' });
};

const moodIcon = (m: string | null) => {
  if (m === 'happy') return <FaSmile className="text-green-600" />;
  if (m === 'neutral') return <FaMeh className="text-yellow-600" />;
  if (m === 'rough') return <FaFrown className="text-red-600" />;
  return null;
};

const summarize = (r: DailyReport): string => {
  const parts: string[] = [];
  if (r.food_eaten === 'all') parts.push('åt allt');
  else if (r.food_eaten === 'some') parts.push('åt lite');
  else if (r.food_eaten === 'none') parts.push('ville inte äta');
  if (r.activity_level === 'high') parts.push('energisk');
  else if (r.activity_level === 'low') parts.push('lugn');
  if (r.pooped === true) parts.push('bajsade');
  return parts.join(' · ');
};

export default function DailyReportsHistory({ dogId, dogName }: { dogId: string; dogName: string }) {
  const [items, setItems] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecentDailyReports(dogId, 14).then(d => {
      setItems(d);
      setLoading(false);
    });
  }, [dogId]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-card p-5 animate-pulse">
        <div className="h-4 w-32 bg-gray-100 rounded mb-3" />
        <div className="space-y-2">
          <div className="h-10 bg-gray-100 rounded" />
          <div className="h-10 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <FaClipboardCheck className="text-emerald-600 text-sm" />
        <h3 className="font-semibold text-base">{dogName}s dagrapporter</h3>
      </div>
      <p className="text-xs text-gray-500 mb-4">Senaste 14 dagarna.</p>
      <div className="space-y-2">
        {items.map(r => {
          const mood = moodIcon(r.mood);
          const summary = summarize(r);
          return (
            <div key={r.id} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-b-0">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                {mood ?? <FaClipboardCheck className="text-emerald-600 text-xs" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-semibold text-sm capitalize">{fmtDate(r.date)}</p>
                  {r.posted_by_name && (
                    <p className="text-[11px] text-gray-400 shrink-0">{r.posted_by_name}</p>
                  )}
                </div>
                {summary && <p className="text-xs text-gray-600 mt-0.5">{summary}</p>}
                {r.note && (
                  <p className="text-sm text-gray-800 mt-1.5 leading-snug whitespace-pre-wrap">{r.note}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
