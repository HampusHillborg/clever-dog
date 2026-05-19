import { useEffect, useMemo, useState } from 'react';
import { FaMoon, FaSun, FaCalendarDay, FaChevronLeft, FaChevronRight, FaInfoCircle } from 'react-icons/fa';
import Sheet from '../shared/Sheet';
import SaveButton from '../shared/SaveButton';
import { BTN } from '../../lib/uiTokens';
import { upsertBooking } from '../../lib/bookingHelpers';
import { sendNotification } from '../../lib/notifications';
import { getClosures } from '../../lib/closures';
import { getCustomerForUser } from '../../lib/customerAuth';
import { todayLocalIso } from '../../lib/localDate';
import { calcBookingPrice, type BookingTypeKind } from '../../lib/bookingPricing';
import { PRICES } from '../../lib/prices';
import type { Dog } from '../../lib/customerApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WizardStep = 1 | 2 | 3;

type BookingOption = {
  kind: BookingTypeKind;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  color: string;
  ringColor: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const pad = (n: number) => n.toString().padStart(2, '0');
const isoDate = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const toMonFirst = (jsDay: number) => (jsDay + 6) % 7;

const MONTHS_SV = [
  'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
  'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December',
];
const WEEKDAYS_SV = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

const nightsBetween = (start: string, end: string) =>
  Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1);

const fmtKr = (n: number) => `${Math.round(n).toLocaleString('sv-SE')} kr`;

const fmtDate = (iso: string): string => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m} ${y}`;
};

// Determine which booking options to show based on dog subscription type.
const optionsForDogType = (dogType: string | null | undefined): BookingOption[] => {
  const all: BookingOption[] = [
    {
      kind: 'extra',
      label: 'Extra dagisdag',
      sublabel: 'Utöver ditt abonnemang',
      icon: <FaCalendarDay />,
      color: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      ringColor: 'ring-emerald-400',
    },
    {
      kind: 'boarding',
      label: 'Pensionat',
      sublabel: 'En eller flera övernattningar',
      icon: <FaMoon />,
      color: 'bg-purple-50 border-purple-200 text-purple-900',
      ringColor: 'ring-purple-400',
    },
    {
      kind: 'single_day',
      label: 'Enstaka dag',
      sublabel: 'Utan abonnemang',
      icon: <FaSun />,
      color: 'bg-amber-50 border-amber-200 text-amber-900',
      ringColor: 'ring-amber-400',
    },
  ];

  if (dogType === 'fulltime' || dogType === 'parttime-3' || dogType === 'parttime-2') {
    // Subscribers can request extra days and boarding.
    return all.filter(o => o.kind === 'extra' || o.kind === 'boarding');
  }
  if (dogType === 'boarding') {
    // Boarding-only customers only do boarding.
    return all.filter(o => o.kind === 'boarding');
  }
  if (dogType === 'singleDay') {
    // Single-day customers buy individual days.
    return all.filter(o => o.kind === 'single_day');
  }
  // Unknown / null — show all options.
  return all;
};

// Is a booking type a range (boarding) or single day (extra, single_day)?
const isRangeType = (kind: BookingTypeKind) => kind === 'boarding';

// ---------------------------------------------------------------------------
// MiniCalendar
// ---------------------------------------------------------------------------

type MiniCalendarProps = {
  kind: BookingTypeKind;
  start: string | null;
  end: string | null;
  onPickStart: (d: string) => void;
  onPickEnd: (d: string) => void;
};

function MiniCalendar({ kind, start, end, onPickStart, onPickEnd }: MiniCalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [closures, setClosures] = useState<Set<string>>(new Set());

  const todayIso = todayLocalIso();
  const range = isRangeType(kind);

  useEffect(() => {
    const lastDay = new Date(year, month + 1, 0).getDate();
    const startIso = isoDate(year, month + 1, 1);
    const endIso = isoDate(year, month + 1, lastDay);
    getClosures(startIso, endIso).then(map => setClosures(new Set(map.keys())));
  }, [year, month]);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const lastDayNum = new Date(year, month + 1, 0).getDate();
  const firstWeekday = toMonFirst(new Date(year, month, 1).getDay());

  const handleCellTap = (iso: string) => {
    if (!range) {
      onPickStart(iso);
      return;
    }
    // Range mode: first tap = start, second tap = end (must be >= start).
    if (!start || (start && end)) {
      // Reset and set new start.
      onPickStart(iso);
      onPickEnd('');
      return;
    }
    if (iso < start) {
      // Tapped before start → reset, make this the new start.
      onPickStart(iso);
      onPickEnd('');
    } else {
      onPickEnd(iso);
    }
  };

  const isInRange = (iso: string) => {
    if (!range || !start || !end) return false;
    return iso >= start && iso <= end;
  };

  const isWeekend = (weekday: number) => weekday >= 5; // Sat=5, Sun=6

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Föregående månad"
        >
          <FaChevronLeft className="text-sm" />
        </button>
        <span className="font-semibold text-sm">{MONTHS_SV[month]} {year}</span>
        <button
          onClick={nextMonth}
          className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Nästa månad"
        >
          <FaChevronRight className="text-sm" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAYS_SV.map(w => (
          <div key={w} className="text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wide py-1">
            {w}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: firstWeekday }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {Array.from({ length: lastDayNum }).map((_, i) => {
          const d = i + 1;
          const iso = isoDate(year, month + 1, d);
          const weekday = toMonFirst(new Date(year, month, d).getDay());
          const isPast = iso < todayIso;
          const isClosed = closures.has(iso) || isWeekend(weekday);
          const isStart = iso === start;
          const isEnd = iso === end;
          const inRange = isInRange(iso);
          const isToday = iso === todayIso;
          const disabled = isPast || isClosed;

          let cellClass = 'aspect-square min-h-[36px] min-w-[36px] rounded-lg flex items-center justify-center text-xs font-medium transition-all border ';

          if (disabled) {
            cellClass += 'opacity-30 pointer-events-none border-gray-100 text-gray-400 ';
          } else if (isStart || isEnd) {
            cellClass += 'bg-primary text-white border-primary shadow-sm ';
          } else if (inRange) {
            cellClass += 'bg-orange-100 text-orange-900 border-orange-200 ';
          } else if (isToday) {
            cellClass += 'border-primary text-primary font-bold hover:bg-orange-50 ';
          } else {
            cellClass += 'border-gray-200 text-gray-800 hover:bg-gray-50 hover:border-gray-300 ';
          }

          return (
            <button
              key={iso}
              onClick={() => !disabled && handleCellTap(iso)}
              disabled={disabled}
              className={cellClass}
              title={isClosed && !isPast ? 'Stängt' : undefined}
              aria-label={iso}
            >
              {d}
            </button>
          );
        })}
      </div>

      {/* Range hint */}
      {range && (
        <p className="text-xs text-gray-500 mt-3 text-center">
          {!start
            ? 'Tryck på incheckning'
            : !end
              ? `Incheckning ${fmtDate(start)} — tryck på utcheckning`
              : `${fmtDate(start)} → ${fmtDate(end)} (${nightsBetween(start, end)} nätter)`}
        </p>
      )}
      {!range && start && (
        <p className="text-xs text-gray-500 mt-3 text-center">
          Valt datum: {fmtDate(start)}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

function StepDots({ step }: { step: WizardStep }) {
  return (
    <div className="flex items-center gap-1.5 justify-center mt-1 mb-4">
      {([1, 2, 3] as WizardStep[]).map(s => (
        <div
          key={s}
          className={`h-1.5 rounded-full transition-all ${
            s === step ? 'w-6 bg-primary' : s < step ? 'w-3 bg-primary/40' : 'w-3 bg-gray-200'
          }`}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  dog: Dog;
  onSuccess?: () => void;
};

export default function BookingWizardSheet({ open, onClose, dog, onSuccess }: Props) {
  const [step, setStep] = useState<WizardStep>(1);
  const [selectedKind, setSelectedKind] = useState<BookingTypeKind | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);

  // Load customer ID once.
  useEffect(() => {
    getCustomerForUser().then(c => setCustomerId(c?.id ?? null));
  }, []);

  // Reset wizard when sheet closes.
  useEffect(() => {
    if (!open) {
      // Delay reset so the closing animation isn't jarring.
      const t = setTimeout(() => {
        setStep(1);
        setSelectedKind(null);
        setStartDate(null);
        setEndDate(null);
        setNote('');
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  const options = optionsForDogType(dog.type);

  // Auto-advance to single option.
  useEffect(() => {
    if (open && options.length === 1 && step === 1) {
      setSelectedKind(options[0].kind);
    }
  }, [open, options.length]);

  // Computed price.
  const days = useMemo(() => {
    if (!selectedKind || !startDate) return 0;
    if (isRangeType(selectedKind)) {
      const ed = endDate || startDate;
      return nightsBetween(startDate, ed);
    }
    return 1;
  }, [selectedKind, startDate, endDate]);

  const price = useMemo(() => {
    if (!selectedKind || days <= 0) return 0;
    return calcBookingPrice(selectedKind, days, dog.type);
  }, [selectedKind, days, dog.type]);

  const isInstantConfirm =
    selectedKind === 'extra' &&
    (dog.type === 'fulltime' || dog.type === 'parttime-3' || dog.type === 'parttime-2');

  // Validation for step 2 → 3 advance.
  const canProceedToSummary = (() => {
    if (!selectedKind || !startDate) return false;
    if (isRangeType(selectedKind) && !endDate) return false;
    return true;
  })();

  const handleSubmit = async () => {
    if (!selectedKind || !startDate || !customerId) {
      throw new Error('Saknar obligatoriska fält');
    }
    const endDateFinal = isRangeType(selectedKind) ? (endDate || startDate) : startDate;
    if (endDateFinal < startDate) throw new Error('Slutdatum måste vara på eller efter startdatum');

    const status = isInstantConfirm ? 'confirmed' : 'pending';

    const booking = await upsertBooking({
      dog_id: dog.id,
      customer_id: customerId,
      start_date: startDate,
      end_date: endDateFinal,
      booking_type: selectedKind,
      status,
      notes: note.trim() || undefined,
    });

    sendNotification({ kind: 'booking_request', booking_id: booking.id });
    onSuccess?.();
    onClose();
  };

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const renderStep1 = () => (
    <div className="px-5 pb-5">
      <p className="text-sm text-gray-600 mb-4">Välj typ av bokning:</p>
      <div className="space-y-2.5">
        {options.map(opt => {
          const selected = selectedKind === opt.kind;
          return (
            <button
              key={opt.kind}
              onClick={() => setSelectedKind(opt.kind)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all ${
                selected
                  ? `border-primary bg-orange-50 ring-2 ${opt.ringColor} ring-offset-1`
                  : `${opt.color} hover:brightness-95`
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 ${
                selected ? 'bg-primary text-white' : 'bg-white/70'
              }`}>
                {opt.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{opt.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{opt.sublabel}</p>
              </div>
              <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                selected ? 'border-primary bg-primary' : 'border-gray-300'
              }`}>
                {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => { if (selectedKind) setStep(2); }}
        disabled={!selectedKind}
        className={`${BTN.primary} w-full mt-5`}
      >
        Välj datum →
      </button>
    </div>
  );

  const renderStep2 = () => (
    <div className="px-5 pb-5">
      <MiniCalendar
        kind={selectedKind!}
        start={startDate}
        end={endDate}
        onPickStart={setStartDate}
        onPickEnd={setEndDate}
      />

      <div className="flex gap-2 mt-5">
        <button
          onClick={() => setStep(1)}
          className={`${BTN.secondary} flex-1`}
        >
          ← Tillbaka
        </button>
        <button
          onClick={() => canProceedToSummary && setStep(3)}
          disabled={!canProceedToSummary}
          className={`${BTN.primary} flex-1`}
        >
          Granska →
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => {
    const endDateDisplay = isRangeType(selectedKind!) ? (endDate || startDate!) : startDate!;
    const optionInfo = options.find(o => o.kind === selectedKind);

    return (
      <div className="px-5 pb-5 space-y-4">
        {/* Summary card */}
        <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          <SummaryRow label="Typ" value={optionInfo?.label ?? selectedKind!} />
          <SummaryRow
            label={isRangeType(selectedKind!) ? 'Period' : 'Datum'}
            value={
              isRangeType(selectedKind!)
                ? `${fmtDate(startDate!)} → ${fmtDate(endDateDisplay)} (${days} nätter)`
                : fmtDate(startDate!)
            }
          />
          <SummaryRow
            label="Pris"
            value={price > 0 ? fmtKr(price) : 'Bestäms av personal'}
            valueClass={price > 0 ? 'font-bold text-gray-900' : 'text-gray-500 italic text-sm'}
          />
        </div>

        {/* Price breakdown */}
        {price > 0 && (
          <div className="rounded-xl bg-orange-50 border border-orange-200 p-3 flex items-start gap-2.5">
            <FaInfoCircle className="text-orange-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-orange-900 uppercase tracking-wide mb-0.5">Prisuppskattning</p>
              <p className="text-sm text-orange-900">
                {isRangeType(selectedKind!)
                  ? `${days} nätter × ${fmtKr(PRICES.staffanstorp.boarding)}`
                  : `1 dag × ${fmtKr(PRICES.staffanstorp.singleDay)}`}
                <span className="font-bold ml-1.5">= {fmtKr(price)}</span>
              </p>
            </div>
          </div>
        )}

        {/* Response time */}
        <div className={`rounded-xl px-3 py-2.5 text-sm flex items-center gap-2 ${
          isInstantConfirm
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-blue-50 border border-blue-200 text-blue-800'
        }`}>
          <span className={`w-2 h-2 rounded-full shrink-0 ${isInstantConfirm ? 'bg-green-500' : 'bg-blue-400'}`} />
          {isInstantConfirm
            ? 'Direkt bekräftat — extra dagar på abonnemang godkänns automatiskt.'
            : 'Personalen svarar inom 24 h — du ser svaret i appen.'}
        </div>

        {/* Note */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
            Anteckning (frivilligt)
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            placeholder={
              selectedKind === 'boarding'
                ? 'Mat, mediciner, rutiner — allt vi behöver veta…'
                : 'Något vi bör känna till?'
            }
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-primary resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => setStep(2)}
            className={`${BTN.secondary} flex-1`}
          >
            ← Tillbaka
          </button>
          <SaveButton
            onSave={handleSubmit}
            disabled={!customerId}
            className="flex-1"
          >
            Skicka förfrågan
          </SaveButton>
        </div>
      </div>
    );
  };

  const stepTitle = step === 1 ? 'Välj typ' : step === 2 ? 'Välj datum' : 'Bekräfta';

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Boka ny dag eller pensionat — ${stepTitle}`}
      blockBackdropClose={step === 3}
    >
      <div className="pt-3">
        <StepDots step={step} />
        {step === 1 && renderStep1()}
        {step === 2 && selectedKind && renderStep2()}
        {step === 3 && selectedKind && startDate && renderStep3()}
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-start justify-between px-4 py-2.5 gap-4">
      <span className="text-xs text-gray-500 font-medium uppercase tracking-wide shrink-0">{label}</span>
      <span className={`text-sm text-right ${valueClass ?? 'text-gray-800'}`}>{value}</span>
    </div>
  );
}
