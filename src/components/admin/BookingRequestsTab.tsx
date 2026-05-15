import { useEffect, useState } from 'react';
import { FaCheck, FaTimes } from 'react-icons/fa';
import {
  getPendingBookings, getDecidedBookings,
  approveBooking, rejectBooking,
  type PendingBooking,
} from '../../lib/database';
import { sendNotification } from '../../lib/notifications';

const typeLabel = (t: string) =>
  t === 'boarding' ? 'Pensionat' : t === 'extra' ? 'Extra dag' : 'Enstaka dag';

const formatRange = (b: PendingBooking) =>
  b.start_date === b.end_date ? b.start_date : `${b.start_date} → ${b.end_date}`;

const PAGE_SIZE = 10;

export default function BookingRequestsTab() {
  const [pending, setPending] = useState<PendingBooking[]>([]);
  const [history, setHistory] = useState<PendingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [rejectTarget, setRejectTarget] = useState<PendingBooking | null>(null);
  const [rejectionDraft, setRejectionDraft] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const [p, h] = await Promise.all([
      getPendingBookings(),
      getDecidedBookings(PAGE_SIZE, 0),
    ]);
    setPending(p);
    setHistory(h);
    setHasMore(h.length === PAGE_SIZE);
    setLoading(false);
  };

  const loadMore = async () => {
    setLoadingMore(true);
    const next = await getDecidedBookings(PAGE_SIZE, history.length);
    setHistory(prev => [...prev, ...next]);
    setHasMore(next.length === PAGE_SIZE);
    setLoadingMore(false);
  };

  useEffect(() => { refresh(); }, []);

  const approve = async (id: string) => {
    await approveBooking(id);
    sendNotification({ kind: 'booking_decision', booking_id: id });
    refresh();
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    const reason = rejectionDraft.trim();
    if (!reason) {
      alert('Du måste ange en anledning.');
      return;
    }
    setRejecting(true);
    try {
      await rejectBooking(rejectTarget.id, reason);
      sendNotification({ kind: 'booking_decision', booking_id: rejectTarget.id });
      setRejectTarget(null);
      setRejectionDraft('');
      await refresh();
    } finally {
      setRejecting(false);
    }
  };

  if (loading) return <div>Laddar förfrågningar…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-3">
          Bokningsförfrågningar — Aktiva ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <div className="text-gray-500 bg-white rounded-2xl shadow p-4">
            Inga väntande förfrågningar.
          </div>
        ) : (
          <div className="space-y-2">
            {pending.map(b => (
              <div key={b.id} className="bg-white rounded-2xl shadow p-4 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="font-semibold">{b.dogs?.name ?? '?'} ({b.dogs?.breed ?? '?'}) — {b.customers?.name ?? '?'}</p>
                  <p className="text-sm text-gray-500">{b.customers?.email ?? ''}</p>
                  <p className="mt-1 text-sm">
                    <span className="font-medium">{typeLabel(b.booking_type)}</span>: {formatRange(b)}
                  </p>
                  {b.notes && <p className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded">{b.notes}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => approve(b.id)}
                          className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600" title="Godkänn">
                    <FaCheck />
                  </button>
                  <button onClick={() => { setRejectTarget(b); setRejectionDraft(b.admin_response ?? ''); }}
                          className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600" title="Avslå">
                    <FaTimes />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
          Historik
        </h3>
        <div className="space-y-2">
          {history.length === 0 ? (
            <div className="text-gray-500 bg-white rounded-2xl shadow p-4">Ingen historik ännu.</div>
          ) : history.map(b => {
            const approved = b.status === 'confirmed';
            return (
              <div key={b.id} className="bg-white rounded-2xl shadow p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{b.dogs?.name ?? '?'} — {b.customers?.name ?? '?'}</p>
                      <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                        approved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {approved ? 'Godkänd' : 'Avslagen'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{b.customers?.email ?? ''}</p>
                    <p className="mt-1 text-sm">
                      <span className="font-medium">{typeLabel(b.booking_type)}</span>: {formatRange(b)}
                    </p>
                    {!approved && (
                      b.admin_response
                        ? <p className="mt-2 text-xs text-red-900 bg-red-50 border border-red-200 rounded px-2 py-1">
                            <span className="font-semibold">Anledning:</span> {b.admin_response}
                          </p>
                        : <p className="mt-2 text-xs text-gray-500 italic">Ingen anledning angiven.</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-2 text-sm text-gray-600 hover:text-gray-900 bg-white rounded-2xl shadow disabled:opacity-50"
            >
              {loadingMore ? 'Laddar…' : 'Visa fler'}
            </button>
          )}
        </div>
      </div>

      {rejectTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Avslå förfrågan
            </h3>
            <p className="text-sm text-gray-600 mb-1">
              {rejectTarget.dogs?.name} — {typeLabel(rejectTarget.booking_type)} {formatRange(rejectTarget)}
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Anledningen skickas till kunden via mejl och visas i kundens kalender.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Anledning <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rejectionDraft}
              onChange={(e) => setRejectionDraft(e.target.value)}
              rows={5}
              autoFocus
              placeholder="T.ex. Tyvärr fullbokat på det datumet."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setRejectTarget(null); setRejectionDraft(''); }}
                disabled={rejecting}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-50"
              >
                Avbryt
              </button>
              <button
                onClick={confirmReject}
                disabled={rejecting || !rejectionDraft.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {rejecting ? 'Sparar…' : 'Avslå & skicka mejl'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
