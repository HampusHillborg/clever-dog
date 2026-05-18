import { useMemo, useState } from 'react';
import { FaTimes, FaMoon, FaSun, FaInfoCircle } from 'react-icons/fa';
import { upsertBooking } from '../../lib/bookingHelpers';
import { sendNotification } from '../../lib/notifications';
import { PRICES } from '../../lib/prices';

type Props = {
  dogId: string;
  customerId: string;
  type: 'boarding' | 'single_day';
  onClose: () => void;
  onSaved: () => void;
};

const nightsBetween = (start: string, end: string): number => {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
};

const fmtKr = (n: number) => `${Math.round(n).toLocaleString('sv-SE')} kr`;

export default function BookingRequestModal({ dogId, customerId, type, onClose, onSaved }: Props) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const title = type === 'boarding' ? 'Begär pensionat' : 'Begär enstaka dag';
  const today = new Date().toISOString().slice(0, 10);

  // Estimate based on default Staffanstorp tier — final amount lands in
  // Ekonomi-fliken after staff approves and dates are confirmed.
  const estimate = useMemo(() => {
    if (!start) return null;
    if (type === 'boarding') {
      const nights = nightsBetween(start, end || start);
      const total = nights * PRICES.staffanstorp.boarding;
      return { nights, total };
    }
    return { nights: 1, total: PRICES.staffanstorp.singleDay };
  }, [start, end, type]);

  const save = async () => {
    if (!start) { alert('Välj startdatum'); return; }
    const endDate = type === 'boarding' ? (end || start) : start;
    if (endDate < start) { alert('Slutdatum måste vara på eller efter startdatum'); return; }

    setSaving(true);
    try {
      const booking = await upsertBooking({
        dog_id: dogId,
        customer_id: customerId,
        start_date: start,
        end_date: endDate,
        booking_type: type,
        status: 'pending',
        notes: notes || undefined,
      });
      sendNotification({ kind: 'booking_request', booking_id: booking.id });
      onSaved();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Kunde inte skicka';
      alert(msg);
    }
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 bg-dark/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-lift animate-slide-in-top flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              type === 'boarding' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {type === 'boarding' ? <FaMoon /> : <FaSun />}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Förfrågan</p>
              <p className="font-semibold text-base truncate">{title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-500 flex items-center justify-center"
            aria-label="Stäng"
          >
            <FaTimes className="text-sm" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          <Field label={type === 'boarding' ? 'Incheckningsdag' : 'Datum'}>
            <input
              type="date"
              value={start}
              min={today}
              onChange={e => setStart(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-primary"
            />
          </Field>

          {type === 'boarding' && (
            <Field label="Utcheckningsdag">
              <input
                type="date"
                value={end}
                min={start || today}
                onChange={e => setEnd(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-primary"
              />
            </Field>
          )}

          <Field label="Anteckningar (frivilligt)">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder={type === 'boarding'
                ? 'Allt vi behöver veta — mat, mediciner, vad som lugnar honom/henne…'
                : 'Något särskilt?'}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-primary resize-none"
            />
          </Field>

          {estimate && (
            <div className="rounded-xl bg-orange-50 border border-orange-200 p-3 flex items-start gap-2.5">
              <FaInfoCircle className="text-orange-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-wide text-orange-900 font-semibold">
                  Ungefärligt pris
                </p>
                <p className="text-sm text-orange-900 mt-0.5">
                  {type === 'boarding'
                    ? `${estimate.nights} nätter × ${fmtKr(PRICES.staffanstorp.boarding)}`
                    : `1 dag × ${fmtKr(PRICES.staffanstorp.singleDay)}`}
                  <span className="font-bold ml-1.5">= {fmtKr(estimate.total)}</span>
                </p>
                <p className="text-[11px] text-orange-700 mt-1">
                  Exakt belopp bestäms när personalen godkänner och syns sedan i Ekonomi.
                </p>
              </div>
            </div>
          )}
        </div>

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
            disabled={saving || !start}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-orange-600 disabled:opacity-50 active:scale-[0.98] transition-all shadow-card"
          >
            {saving ? 'Skickar…' : 'Skicka förfrågan'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
