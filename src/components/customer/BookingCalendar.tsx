import { useEffect, useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import type { Dog } from '../../lib/customerApi';
import { getCustomerForUser } from '../../lib/customerAuth';
import {
  getDaysForMonth, upsertBooking, deleteBooking,
  type DayInfo, type DayStatus,
} from '../../lib/bookingHelpers';
import BookingRequestModal from './BookingRequestModal';

const MONTHS = [
  'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
  'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December',
];
const WEEKDAYS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

const STATUS_STYLE: Record<DayStatus, string> = {
  scheduled: 'bg-green-100 text-green-900 border-green-300',
  extra: 'bg-emerald-200 text-emerald-900 border-emerald-400',
  cancelled: 'bg-gray-200 text-gray-500 line-through border-gray-300',
  pending: 'bg-yellow-100 text-yellow-900 border-yellow-300',
  rejected: 'bg-red-100 text-red-900 border-red-300',
  boarding: 'bg-purple-100 text-purple-900 border-purple-300',
  none: 'bg-white border-gray-200',
};

const STATUS_LABEL: Record<DayStatus, string> = {
  scheduled: 'Inbokad',
  extra: 'Extra-dag',
  cancelled: 'Avbokad',
  pending: 'Väntar svar',
  rejected: 'Avslagen',
  boarding: 'Pensionat',
  none: 'Ledig',
};

export default function BookingCalendar({ dog }: { dog: Dog }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [days, setDays] = useState<DayInfo[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestType, setRequestType] = useState<'boarding' | 'single_day' | null>(null);

  const refresh = async () => {
    setLoading(true);
    setDays(await getDaysForMonth(dog.id, year, month));
    setLoading(false);
  };

  useEffect(() => {
    getCustomerForUser().then(c => setCustomerId(c?.id ?? null));
  }, []);

  useEffect(() => { refresh(); }, [dog.id, year, month]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const firstDayWeekday = days[0]?.weekday ?? 0;

  const handleAction = async (action: 'add_extra' | 'cancel' | 'undo') => {
    if (!selectedDay || !customerId) return;
    try {
      if (action === 'add_extra') {
        await upsertBooking({
          dog_id: dog.id, customer_id: customerId,
          start_date: selectedDay.date, end_date: selectedDay.date,
          booking_type: 'extra', status: 'confirmed',
        });
      } else if (action === 'cancel') {
        if (selectedDay.bookingId) {
          await upsertBooking({
            id: selectedDay.bookingId,
            dog_id: dog.id, customer_id: customerId,
            start_date: selectedDay.date, end_date: selectedDay.date,
            booking_type: 'cancelled', status: 'cancelled',
          });
        } else {
          await upsertBooking({
            dog_id: dog.id, customer_id: customerId,
            start_date: selectedDay.date, end_date: selectedDay.date,
            booking_type: 'cancelled', status: 'cancelled',
          });
        }
      } else if (action === 'undo' && selectedDay.bookingId) {
        await deleteBooking(selectedDay.bookingId);
      }
      setSelectedDay(null);
      refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Kunde inte uppdatera';
      alert(msg);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <div className="flex gap-2 mb-3 flex-wrap">
        <button onClick={() => setRequestType('boarding')}
                className="bg-purple-100 text-purple-900 px-3 py-1.5 rounded-lg text-sm hover:bg-purple-200">
          + Begär pensionat
        </button>
        <button onClick={() => setRequestType('single_day')}
                className="bg-yellow-100 text-yellow-900 px-3 py-1.5 rounded-lg text-sm hover:bg-yellow-200">
          + Begär enstaka dag
        </button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded"><FaChevronLeft /></button>
        <h3 className="font-semibold">{MONTHS[month]} {year}</h3>
        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded"><FaChevronRight /></button>
      </div>

      {loading ? <p>Laddar…</p> : (
        <div className="grid grid-cols-7 gap-1 text-xs">
          {WEEKDAYS.map(w => (
            <div key={w} className="text-center font-semibold text-gray-500 py-1">{w}</div>
          ))}
          {Array.from({ length: firstDayWeekday }).map((_, i) => <div key={`pad-${i}`} />)}
          {days.map(d => {
            const dayNum = parseInt(d.date.slice(8), 10);
            return (
              <button
                key={d.date}
                onClick={() => setSelectedDay(d)}
                className={`aspect-square rounded border text-center flex items-center justify-center hover:ring-2 hover:ring-primary ${STATUS_STYLE[d.status]}`}
                title={STATUS_LABEL[d.status]}
              >
                {dayNum}
              </button>
            );
          })}
        </div>
      )}

      <Legend />

      {selectedDay && (
        <DayActions day={selectedDay} onClose={() => setSelectedDay(null)} onAction={handleAction} />
      )}

      {requestType && customerId && (
        <BookingRequestModal
          dogId={dog.id}
          customerId={customerId}
          type={requestType}
          onClose={() => setRequestType(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-300" /> Inbokad</span>
      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-200 border border-emerald-400" /> Extra</span>
      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-200 border border-gray-300" /> Avbokad</span>
      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300" /> Väntar</span>
      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-100 border border-purple-300" /> Pensionat</span>
    </div>
  );
}

function DayActions({ day, onClose, onAction }: {
  day: DayInfo;
  onClose: () => void;
  onAction: (a: 'add_extra' | 'cancel' | 'undo') => void;
}) {
  const niceDate = day.date.split('-').reverse().join('/');
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold mb-1">{niceDate}</h3>
        <p className="text-sm text-gray-500 mb-4">Status: {STATUS_LABEL[day.status]}</p>
        <div className="space-y-2">
          {day.status === 'none' && (
            <button onClick={() => onAction('add_extra')}
                    className="w-full bg-emerald-500 text-white rounded-lg py-2">Boka extra dag</button>
          )}
          {(day.status === 'scheduled' || day.status === 'extra') && (
            <button onClick={() => onAction('cancel')}
                    className="w-full bg-gray-500 text-white rounded-lg py-2">Avboka denna dag</button>
          )}
          {day.status === 'cancelled' && day.bookingId && (
            <button onClick={() => onAction('undo')}
                    className="w-full bg-primary text-white rounded-lg py-2">Ångra avbokning</button>
          )}
          <button onClick={onClose} className="w-full text-gray-500 py-2">Stäng</button>
        </div>
      </div>
    </div>
  );
}
