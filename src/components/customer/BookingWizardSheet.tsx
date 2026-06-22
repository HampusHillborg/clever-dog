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
import { getDayCapacityOverview, capacityLevel, type DayCapacity, type CapacityLevel } from '../../lib/capacity';

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

// Antal nätter mellan in- och utcheckning. Incheckning 10/3 → utcheckning
// 11/3 = 1 natt (inte 2). Tidigare fanns ett "+1" här som räknade en natt
// för mycket.
const nightsBetween = (start: string, end: string) =>
  Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000));

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
  /** Callback to warn about soft-limit before confirming a date. */
  onSoftWarn?: (iso: string, confirm: () => void) => void;
  /** Callback to warn that dagis is normally closed on weekends. */
  onWeekendWarn?: (iso: string, confirm: () => void) => void;
  /** Vilken månad kalendern öppnas på (0-indexerad). Default = innevarande. */
  initialYear?: number;
  initialMonth?: number;
};

const CAP_DOT: Record<CapacityLevel, string> = {
  free: 'bg-green-500',
  busy: 'bg-yellow-500',
  full: 'bg-red-500',
};

function MiniCalendar({ kind, start, end, onPickStart, onPickEnd, onSoftWarn, onWeekendWarn, initialYear, initialMonth }: MiniCalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(initialYear ?? today.getFullYear());
  const [month, setMonth] = useState(initialMonth ?? today.getMonth()); // 0-indexed
  const [closures, setClosures] = useState<Set<string>>(new Set());
  const [capMap, setCapMap] = useState<Map<string, DayCapacity>>(new Map());

  const todayIso = todayLocalIso();
  const range = isRangeType(kind);

  useEffect(() => {
    const lastDay = new Date(year, month + 1, 0).getDate();
    const startIso = isoDate(year, month + 1, 1);
    const endIso = isoDate(year, month + 1, lastDay);
    getClosures(startIso, endIso).then(map => setClosures(new Set(map.keys())));
    getDayCapacityOverview(startIso, endIso).then(rows => {
      const m = new Map<string, DayCapacity>();
      for (const r of rows) m.set(r.date, r);
      setCapMap(m);
    });
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

  const handleCellTap = (iso: string, weekday: number) => {
    const cap = capMap.get(iso);
    const level = cap ? capacityLevel(cap) : 'free';

    const doPickSingle = () => {
      if (!range) {
        onPickStart(iso);
      } else {
        if (!start || (start && end)) {
          onPickStart(iso);
          onPickEnd('');
        } else if (iso === start) {
          // Tryck igen på incheckningsdagen → avmarkera. (Tidigare satte detta
          // utcheckning = incheckning och gav en meningslös "1 natt" på en dag.)
          onPickStart('');
          onPickEnd('');
        } else if (iso < start) {
          onPickStart(iso);
          onPickEnd('');
        } else {
          onPickEnd(iso);
        }
      }
    };

    // Dagis (extra/enstaka dag) på helg: varna om att dagiset normalt är stängt.
    // Pensionat (range) påverkas inte.
    if (!range && isWeekend(weekday) && onWeekendWarn) {
      onWeekendWarn(iso, doPickSingle);
    } else if (level === 'busy' && onSoftWarn) {
      // Show warning, let callback confirm
      onSoftWarn(iso, doPickSingle);
    } else {
      doPickSingle();
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
          // Helger spärras inte längre hårt: pensionat går alltid att boka, och
          // dagis (extra/enstaka dag) går att boka mot en varning (se
          // onWeekendWarn). Endast admin-satta stängningar spärrar dagen.
          const isClosed = closures.has(iso);
          const isStart = iso === start;
          const isEnd = iso === end;
          const inRange = isInRange(iso);
          const isToday = iso === todayIso;

          // Capacity
          const cap = capMap.get(iso);
          const level = cap ? capacityLevel(cap) : null;
          const isFull = level === 'full';

          const disabled = isPast || isClosed || isFull;

          let cellClass = 'aspect-square min-h-[40px] min-w-[40px] rounded-lg flex flex-col items-center justify-center text-xs font-medium transition-all border relative ';

          if (isFull) {
            cellClass += 'opacity-40 pointer-events-none border-red-100 text-red-300 ';
          } else if (disabled) {
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

          const dotColor = level ? CAP_DOT[level] : null;
          const fullTitle = isFull ? 'Dagiset är fullt detta datum' : (isClosed && !isPast ? 'Stängt' : undefined);

          return (
            <button
              key={iso}
              onClick={() => !disabled && handleCellTap(iso, weekday)}
              disabled={disabled}
              className={cellClass}
              title={fullTitle}
              aria-label={iso}
            >
              <span className="leading-none">{d}</span>
              {dotColor && !isPast && (
                <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${dotColor}`} />
              )}
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
  /** Om satt hoppas steg 1 (typ-val) över och wizarden börjar på steg 2. */
  initialType?: BookingTypeKind;
  /** Vilken månad datumväljaren ska öppnas på (matchar kalendervyn). */
  initialYear?: number;
  initialMonth?: number;
};

export default function BookingWizardSheet({ open, onClose, dog, onSuccess, initialType, initialYear, initialMonth }: Props) {
  const [step, setStep] = useState<WizardStep>(initialType ? 2 : 1);
  const [selectedKind, setSelectedKind] = useState<BookingTypeKind | null>(initialType ?? null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Soft-limit warning modal
  const [softWarnDate, setSoftWarnDate] = useState<string | null>(null);
  const [softWarnConfirm, setSoftWarnConfirm] = useState<(() => void) | null>(null);
  // Helg-varning (dagis normalt stängt) modal
  const [weekendWarnDate, setWeekendWarnDate] = useState<string | null>(null);
  const [weekendWarnConfirm, setWeekendWarnConfirm] = useState<(() => void) | null>(null);

  // Load customer ID once.
  useEffect(() => {
    getCustomerForUser().then(c => setCustomerId(c?.id ?? null));
  }, []);

  // Reset wizard when sheet closes.
  useEffect(() => {
    if (!open) {
      // Delay reset so the closing animation isn't jarring.
      const t = setTimeout(() => {
        setStep(initialType ? 2 : 1);
        setSelectedKind(initialType ?? null);
        setStartDate(null);
        setEndDate(null);
        setNote('');
        setSubmitError(null);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open, initialType]);

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

  // Validation for step 2 → 3 advance.
  const canProceedToSummary = (() => {
    if (!selectedKind || !startDate) return false;
    if (isRangeType(selectedKind) && !endDate) return false;
    return true;
  })();

  const handleSubmit = async () => {
    setSubmitError(null);
    try {
      if (!selectedKind || !startDate) {
        throw new Error('Välj typ och datum först.');
      }
      // Lös kund-id vid submit om det inte hunnit laddas (annars kunde knappen
      // se "död" ut och inget hände — "fastnar"-buggen).
      let cid = customerId;
      if (!cid) {
        cid = (await getCustomerForUser())?.id ?? null;
        setCustomerId(cid);
      }
      if (!cid) {
        throw new Error('Hittade ingen kundkoppling till ditt konto. Kontakta personalen.');
      }

      const endDateFinal = isRangeType(selectedKind) ? (endDate || startDate) : startDate;
      if (endDateFinal < startDate) throw new Error('Slutdatum måste vara på eller efter startdatum.');

      // Alla förfrågningar via guiden ska godkännas av personalen.
      const status = 'pending';

      const booking = await upsertBooking({
        dog_id: dog.id,
        customer_id: cid,
        start_date: startDate,
        end_date: endDateFinal,
        booking_type: selectedKind,
        status,
        notes: note.trim() || undefined,
      });

      sendNotification({ kind: 'booking_request', booking_id: booking.id });
      onSuccess?.();
      onClose();
    } catch (e) {
      // Visa felet för användaren — SaveButton sväljer annars meddelandet och
      // det ser ut som att ingenting händer. Supabase-fel är inte Error-
      // instanser utan objekt med .message, så hantera båda.
      const msg =
        e instanceof Error ? e.message
        : (e && typeof e === 'object' && 'message' in e) ? String((e as { message: unknown }).message)
        : 'Kunde inte skicka förfrågan.';
      setSubmitError(msg);
      throw e; // låt SaveButton gå till sitt error-läge ("Försök igen")
    }
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

  const handleSoftWarn = (iso: string, confirm: () => void) => {
    setSoftWarnDate(iso);
    setSoftWarnConfirm(() => confirm);
  };

  const closeSoftWarn = () => {
    setSoftWarnDate(null);
    setSoftWarnConfirm(null);
  };

  const confirmSoftWarn = () => {
    if (softWarnConfirm) softWarnConfirm();
    closeSoftWarn();
  };

  const handleWeekendWarn = (iso: string, confirm: () => void) => {
    setWeekendWarnDate(iso);
    setWeekendWarnConfirm(() => confirm);
  };

  const closeWeekendWarn = () => {
    setWeekendWarnDate(null);
    setWeekendWarnConfirm(null);
  };

  const confirmWeekendWarn = () => {
    if (weekendWarnConfirm) weekendWarnConfirm();
    closeWeekendWarn();
  };

  const renderStep2 = () => (
    <div className="px-5 pb-5">
      <MiniCalendar
        kind={selectedKind!}
        start={startDate}
        end={endDate}
        onPickStart={setStartDate}
        onPickEnd={setEndDate}
        onSoftWarn={handleSoftWarn}
        onWeekendWarn={handleWeekendWarn}
        initialYear={initialYear}
        initialMonth={initialMonth}
      />

      <div className="flex gap-2 mt-5">
        <button
          onClick={() => initialType ? onClose() : setStep(1)}
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

        {/* Alla bokningar via guiden måste godkännas av personalen. */}
        <div className="rounded-xl px-3 py-2.5 text-sm flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-800">
          <span className="w-2 h-2 rounded-full shrink-0 bg-blue-400" />
          Personalen svarar inom 24 h — du ser svaret i appen.
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

        {submitError && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-800">
            {submitError}
          </div>
        )}

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
            className="flex-1"
          >
            Skicka förfrågan
          </SaveButton>
        </div>
      </div>
    );
  };

  const stepTitle = step === 1 ? 'Välj typ' : step === 2 ? 'Välj datum' : 'Bekräfta';
  const sheetTitle = initialType === 'boarding'
    ? `Boka pensionat — ${stepTitle}`
    : initialType
      ? `Boka enstaka dag — ${stepTitle}`
      : `Boka ny dag eller pensionat — ${stepTitle}`;

  const softWarnDateFmt = softWarnDate
    ? new Date(softWarnDate + 'T00:00:00').toLocaleDateString('sv-SE', {
        weekday: 'long', day: 'numeric', month: 'long',
      })
    : '';

  const weekendWarnDateFmt = weekendWarnDate
    ? new Date(weekendWarnDate + 'T00:00:00').toLocaleDateString('sv-SE', {
        weekday: 'long', day: 'numeric', month: 'long',
      })
    : '';

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={sheetTitle}
        blockBackdropClose={step === 3}
      >
        <div className="pt-3">
          {!initialType && <StepDots step={step} />}
          {step === 1 && renderStep1()}
          {step === 2 && selectedKind && renderStep2()}
          {step === 3 && selectedKind && startDate && renderStep3()}
        </div>
      </Sheet>

      {/* Soft-limit warning modal */}
      <Sheet
        open={!!softWarnDate}
        onClose={closeSoftWarn}
        title="Många hundar denna dag"
      >
        <div className="px-5 py-5 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-yellow-100 text-yellow-700 flex items-center justify-center mx-auto text-xl">
            ⚠️
          </div>
          <p className="text-sm text-gray-700 text-center">
            Vi har redan en del hundar inbokade <span className="font-semibold">{softWarnDateFmt}</span>.
            Om du kan välja en lugnare dag uppskattar vi det!
          </p>
          <div className="flex gap-2">
            <button
              onClick={closeSoftWarn}
              className={`${BTN.secondary} flex-1`}
            >
              Välj annan dag
            </button>
            <button
              onClick={confirmSoftWarn}
              className={`${BTN.primary} flex-1`}
            >
              Boka ändå
            </button>
          </div>
        </div>
      </Sheet>

      {/* Helg-varning: dagis normalt stängt */}
      <Sheet
        open={!!weekendWarnDate}
        onClose={closeWeekendWarn}
        title="Dagiset är normalt stängt"
      >
        <div className="px-5 py-5 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto text-xl">
            ⚠️
          </div>
          <p className="text-sm text-gray-700 text-center">
            Hunddagiset är normalt <span className="font-semibold">stängt på helger</span>.
            Du kan ändå skicka en förfrågan för <span className="font-semibold">{weekendWarnDateFmt}</span> —
            personalen återkommer med besked om det går att lösa.
          </p>
          <div className="flex gap-2">
            <button
              onClick={closeWeekendWarn}
              className={`${BTN.secondary} flex-1`}
            >
              Välj annan dag
            </button>
            <button
              onClick={confirmWeekendWarn}
              className={`${BTN.primary} flex-1`}
            >
              Skicka ändå
            </button>
          </div>
        </div>
      </Sheet>
    </>
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
