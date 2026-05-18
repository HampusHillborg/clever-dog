import { useEffect, useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import type { Dog } from '../../lib/customerApi';
import { getCustomerForUser } from '../../lib/customerAuth';
import {
  getDaysForMonth, upsertBooking, deleteBooking,
  type DayInfo, type DayStatus,
} from '../../lib/bookingHelpers';
import { sendNotification } from '../../lib/notifications';
import { getHolidayInfo, holidayName } from '../../lib/swedishHolidays';
import { getClosures } from '../../lib/closures';
import { tapLight, notifySuccess } from '../../lib/haptics';
import BookingRequestModal from './BookingRequestModal';

// Days/week the customer may self-book for part-time dogs. Null for
// fulltime or unknown types (no quota enforcement).
const quotaForType = (type: string | null | undefined): number | null => {
  if (type === 'parttime-3') return 3;
  if (type === 'parttime-2') return 2;
  return null;
};

const isPartTime = (type: string | null | undefined): boolean =>
  type === 'parttime-3' || type === 'parttime-2';

// ISO week key — same week for Mon..Sun, used to group day picks.
const isoWeekKey = (dateIso: string): string => {
  const d = new Date(dateIso);
  d.setHours(0, 0, 0, 0);
  // Move to Thursday of the same week (ISO weeks are anchored on Thursday).
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(
    ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
  );
  return `${d.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
};

// Cutoff: any date that is today or earlier is locked from customer edits.
const isLockedDate = (dateIso: string): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateIso);
  d.setHours(0, 0, 0, 0);
  return d.getTime() <= today.getTime();
};

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

// Short labels shown in calendar cells under the date number.
const cellLabel = (status: DayStatus, bookingType?: string): string => {
  if (status === 'pending') {
    if (bookingType === 'boarding') return 'Pens. ?';
    if (bookingType === 'single_day') return 'Enstaka ?';
    if (bookingType === 'extra') return 'Extra ?';
    return '?';
  }
  if (status === 'rejected') return 'Avslagen';
  if (status === 'cancelled') return 'Avb.';
  if (status === 'boarding') return 'Pens.';
  if (status === 'extra') return 'Extra';
  if (status === 'scheduled') return 'Dagis';
  return '';
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
  const [closures, setClosures] = useState<Map<string, string>>(new Map());

  const refresh = async () => {
    setLoading(true);
    const lastDay = new Date(year, month + 1, 0).getDate();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const startIso = `${year}-${pad(month + 1)}-01`;
    const endIso = `${year}-${pad(month + 1)}-${pad(lastDay)}`;
    const [d, c] = await Promise.all([
      getDaysForMonth(dog.id, year, month),
      getClosures(startIso, endIso),
    ]);
    setDays(d);
    setClosures(c);
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

  const quota = quotaForType(dog.type);
  const partTime = isPartTime(dog.type);

  // Counts confirmed scheduled days (recurring or hand-picked) in the ISO
  // week containing `dateIso`. Cancelled days don't count; pending requests
  // (extra) don't count either.
  const picksInWeek = (dateIso: string): number => {
    const key = isoWeekKey(dateIso);
    return days.filter(d => isoWeekKey(d.date) === key && d.status === 'scheduled').length;
  };

  const handleAction = async (action: 'add_extra' | 'cancel' | 'undo' | 'cancel_request' | 'pick_day' | 'cancel_boarding') => {
    if (!selectedDay || !customerId) return;
    try {
      if (action === 'pick_day') {
        if (quota !== null && picksInWeek(selectedDay.date) >= quota) {
          alert(`Du har redan valt ${quota} dagar denna vecka.`);
          return;
        }
        tapLight();
        await upsertBooking({
          dog_id: dog.id, customer_id: customerId,
          start_date: selectedDay.date, end_date: selectedDay.date,
          booking_type: 'scheduled', status: 'confirmed',
        });
        notifySuccess();
      } else if (action === 'add_extra') {
        const booking = await upsertBooking({
          dog_id: dog.id, customer_id: customerId,
          start_date: selectedDay.date, end_date: selectedDay.date,
          booking_type: 'extra', status: 'pending',
        });
        sendNotification({ kind: 'booking_request', booking_id: booking.id });
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
      } else if (action === 'cancel_request' && selectedDay.bookingId) {
        await deleteBooking(selectedDay.bookingId);
      } else if (action === 'cancel_boarding' && selectedDay.bookingId) {
        if (!confirm('Avboka hela pensionat-bokningen? Detta tar bort alla nätter.')) {
          return;
        }
        await deleteBooking(selectedDay.bookingId);
      }
      setSelectedDay(null);
      refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Kunde inte uppdatera';
      alert(msg);
    }
  };

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="bg-white rounded-2xl shadow-card p-4 sm:p-5">
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setRequestType('boarding')}
                className="bg-purple-50 text-purple-900 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-purple-100 transition-colors border border-purple-200">
          + Begär pensionat
        </button>
        <button onClick={() => setRequestType('single_day')}
                className="bg-amber-50 text-amber-900 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-amber-100 transition-colors border border-amber-200">
          + Begär enstaka dag
        </button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Föregående månad"
        >
          <FaChevronLeft className="text-sm" />
        </button>
        <h3 className="font-semibold text-base">{MONTHS[month]} {year}</h3>
        <button
          onClick={nextMonth}
          className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Nästa månad"
        >
          <FaChevronRight className="text-sm" />
        </button>
      </div>

      {loading ? (
        <CalendarSkeleton />
      ) : (
        <div className="grid grid-cols-7 gap-1 text-xs">
          {WEEKDAYS.map(w => (
            <div key={w} className="text-center font-semibold text-gray-400 py-1 text-[10px] uppercase tracking-wide">{w}</div>
          ))}
          {Array.from({ length: firstDayWeekday }).map((_, i) => <div key={`pad-${i}`} />)}
          {days.map(d => {
            const dayNum = parseInt(d.date.slice(8), 10);
            const customClosure = closures.get(d.date);
            const holiday = getHolidayInfo(d.date);
            const closed = !!customClosure || holiday.kind === 'closed';
            const halfDay = !customClosure && holiday.kind === 'half_day';
            const closureReason = customClosure ?? (holiday.kind === 'closed' ? (holidayName(d.date) ?? 'Helg') : null);
            const label = closed
              ? null
              : halfDay
                ? '→ 14'
                : cellLabel(d.status, d.bookingType);
            const isToday = d.date === todayIso;
            const cellClass = closed
              ? 'pattern-stripes-closed text-rose-400 border-rose-200'
              : halfDay
                ? 'pattern-stripes-half text-amber-700 border-amber-300'
                : `${STATUS_STYLE[d.status]} border-2`;
            const title = closed
              ? `Stängt · ${closureReason ?? 'Helg'}`
              : halfDay
                ? `Öppet till 14:00 · dagen före ${holiday.beforeName}`
                : STATUS_LABEL[d.status];
            const labelClass = halfDay
              ? 'text-[9px] font-semibold leading-tight mt-0.5 truncate w-full text-amber-800'
              : 'text-[8px] leading-tight mt-0.5 truncate w-full';
            return (
              <button
                key={d.date}
                onClick={() => closed ? undefined : setSelectedDay(d)}
                disabled={closed}
                className={`aspect-square rounded-lg border ${closed ? '' : 'hover:scale-[1.04] active:scale-95'} flex flex-col items-center justify-center px-0.5 transition-transform ${cellClass} ${isToday ? 'ring-2 ring-primary ring-offset-1' : ''} ${closed ? 'cursor-default' : ''}`}
                title={title}
              >
                <span className={`leading-none text-sm ${isToday ? 'font-bold' : closed ? 'font-medium opacity-60' : 'font-medium'}`}>
                  {dayNum}
                </span>
                {label && <span className={labelClass}>{label}</span>}
              </button>
            );
          })}
        </div>
      )}

      <Legend />

      {partTime && quota !== null && (
        <div className="mt-3 rounded-xl bg-orange-50 border border-orange-200 px-3 py-2.5 flex items-start gap-2">
          <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
            {quota}
          </div>
          <p className="text-xs text-orange-900 leading-snug">
            <span className="font-semibold">Deltidsplats:</span> du väljer själv {quota} dagar per vecka.
            Ändringar måste göras senast dagen innan.
          </p>
        </div>
      )}

      {selectedDay && (
        <DayActions
          day={selectedDay}
          partTime={partTime}
          quota={quota}
          picksThisWeek={picksInWeek(selectedDay.date)}
          onClose={() => setSelectedDay(null)}
          onAction={handleAction}
        />
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

function CalendarSkeleton() {
  return (
    <div className="grid grid-cols-7 gap-1 animate-pulse">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={`h-${i}`} className="h-4 bg-gray-100 rounded" />
      ))}
      {Array.from({ length: 35 }).map((_, i) => (
        <div key={`c-${i}`} className="aspect-square bg-gray-100 rounded-lg" />
      ))}
    </div>
  );
}

function Legend() {
  const items: { color: string; label: string }[] = [
    { color: 'bg-green-100 border-green-300', label: 'Inbokad' },
    { color: 'bg-emerald-200 border-emerald-400', label: 'Extra' },
    { color: 'bg-yellow-100 border-yellow-300', label: 'Väntar' },
    { color: 'bg-purple-100 border-purple-300', label: 'Pensionat' },
    { color: 'pattern-stripes-closed border-rose-200', label: 'Stängt' },
    { color: 'pattern-stripes-half border-amber-300', label: 'Öppet → 14' },
  ];
  return (
    <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-gray-600">
      {items.map(i => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className={`w-3 h-3 rounded border ${i.color}`} />
          <span>{i.label}</span>
        </span>
      ))}
    </div>
  );
}

function DayActions({ day, partTime, quota, picksThisWeek, onClose, onAction }: {
  day: DayInfo;
  partTime: boolean;
  quota: number | null;
  picksThisWeek: number;
  onClose: () => void;
  onAction: (a: 'add_extra' | 'cancel' | 'undo' | 'cancel_request' | 'pick_day' | 'cancel_boarding') => void;
}) {
  const niceDate = day.date.split('-').reverse().join('/');
  const locked = isLockedDate(day.date);
  const isWeekday = day.weekday < 5; // 0=Mon ... 4=Fri
  const quotaFull = quota !== null && picksThisWeek >= quota;
  const canPick = partTime && day.status === 'none' && isWeekday && !locked && !quotaFull;
  const canUnpick = partTime && day.status === 'scheduled' && !locked;

  return (
    <div className="fixed inset-0 bg-dark/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl p-6 max-w-sm w-full shadow-lift animate-slide-in-top"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />
        <h3 className="font-bold text-lg mb-1 tracking-tight">{niceDate}</h3>
        <p className="text-sm text-gray-500 mb-3">Status: <span className="font-medium text-gray-700">{STATUS_LABEL[day.status]}</span></p>

        {partTime && quota !== null && (
          <p className="text-xs text-gray-600 mb-2">
            {picksThisWeek} av {quota} dagar valda denna vecka
            {quotaFull && day.status === 'none' && ' · kvoten är full'}
          </p>
        )}

        {day.status === 'rejected' && day.adminResponse && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-xs font-semibold text-red-800 mb-1">Avslag-anledning</p>
            <p className="text-sm text-red-900 whitespace-pre-wrap">{day.adminResponse}</p>
          </div>
        )}
        {day.status === 'rejected' && !day.adminResponse && (
          <p className="text-sm text-gray-600 mb-4 italic">Ingen anledning angiven.</p>
        )}
        {day.status !== 'rejected' && <div className="mb-2" />}

        {locked && (day.status === 'scheduled' || day.status === 'none') && (
          <p className="text-xs text-gray-500 mb-3 italic">
            Dagen är passerad eller pågående och kan inte ändras.
          </p>
        )}

        <div className="space-y-2">
          {canPick && (
            <button onClick={() => onAction('pick_day')}
                    className="w-full bg-green-500 text-white rounded-lg py-2">Välj denna dag</button>
          )}
          {canUnpick && (
            <button onClick={() => onAction('cancel')}
                    className="w-full bg-gray-500 text-white rounded-lg py-2">Avboka denna dag</button>
          )}
          {!partTime && day.status === 'none' && !locked && (
            <button onClick={() => onAction('add_extra')}
                    className="w-full bg-emerald-500 text-white rounded-lg py-2">Begär extra dag</button>
          )}
          {!partTime && (day.status === 'scheduled' || day.status === 'extra') && !locked && (
            <button onClick={() => onAction('cancel')}
                    className="w-full bg-gray-500 text-white rounded-lg py-2">Avboka denna dag</button>
          )}
          {partTime && day.status === 'none' && !locked && !quotaFull && day.weekday >= 5 && (
            <button onClick={() => onAction('add_extra')}
                    className="w-full bg-emerald-500 text-white rounded-lg py-2">Begär extra dag</button>
          )}
          {day.status === 'pending' && day.bookingId && (
            <button onClick={() => onAction('cancel_request')}
                    className="w-full bg-gray-500 text-white rounded-lg py-2">Avbryt förfrågan</button>
          )}
          {day.status === 'boarding' && day.bookingId && !locked && (
            <button onClick={() => onAction('cancel_boarding')}
                    className="w-full bg-gray-500 text-white rounded-lg py-2">Avboka pensionat</button>
          )}
          {day.status === 'cancelled' && day.bookingId && !locked && (
            <button onClick={() => onAction('undo')}
                    className="w-full bg-primary text-white rounded-lg py-2">Ångra avbokning</button>
          )}
          <button onClick={onClose} className="w-full text-gray-500 py-2">Stäng</button>
        </div>
      </div>
    </div>
  );
}
