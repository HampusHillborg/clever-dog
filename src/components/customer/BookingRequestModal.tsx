import { useState } from 'react';
import { upsertBooking } from '../../lib/bookingHelpers';
import { sendNotification } from '../../lib/notifications';

type Props = {
  dogId: string;
  customerId: string;
  type: 'boarding' | 'single_day';
  onClose: () => void;
  onSaved: () => void;
};

export default function BookingRequestModal({ dogId, customerId, type, onClose, onSaved }: Props) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const title = type === 'boarding' ? 'Begär pensionat' : 'Begär enstaka dag';

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
      // Notify admin (fire-and-forget)
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-1">{title}</h3>
        <p className="text-sm text-gray-500 mb-4">Förfrågan måste godkännas av personalen.</p>
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm">Startdatum</span>
            <input type="date" value={start} onChange={e => setStart(e.target.value)}
                   className="mt-1 w-full rounded-lg border-gray-300" />
          </label>
          {type === 'boarding' && (
            <label className="block">
              <span className="text-sm">Slutdatum</span>
              <input type="date" value={end} onChange={e => setEnd(e.target.value)}
                     className="mt-1 w-full rounded-lg border-gray-300" />
            </label>
          )}
          <label className="block">
            <span className="text-sm">Anteckningar (frivilligt)</span>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                      className="mt-1 w-full rounded-lg border-gray-300" />
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-gray-500">Avbryt</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg">
            {saving ? 'Skickar…' : 'Skicka förfrågan'}
          </button>
        </div>
      </div>
    </div>
  );
}
