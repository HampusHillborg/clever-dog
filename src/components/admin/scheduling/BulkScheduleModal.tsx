import React, { useEffect, useMemo, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import type { Employee, StaffSchedule } from '../../../lib/database';
import { addDays, expandDateRange, parseISODate, toISODate, weekdayLong } from './dateUtils';

interface BulkScheduleModalProps {
  employees: Employee[];
  existingSchedules: StaffSchedule[]; // used to detect conflicts
  defaultEmployeeId?: string;
  defaultFromDate: string;
  onSave: (
    rows: Omit<StaffSchedule, 'id' | 'created_at' | 'updated_at'>[],
    deleteIds: string[],
  ) => Promise<void>;
  onClose: () => void;
}

interface DayConfig {
  selected: boolean;
  start: string;
  end: string;
}

type ConflictResolution = 'skip' | 'overwrite';

const INITIAL_DAYS: DayConfig[] = Array.from({ length: 7 }, (_, i) => ({
  selected: i < 5, // default Mon–Fri
  start: '09:00',
  end: '17:00',
}));

const BulkScheduleModal: React.FC<BulkScheduleModalProps> = ({
  employees,
  existingSchedules,
  defaultEmployeeId,
  defaultFromDate,
  onSave,
  onClose,
}) => {
  // Default to a sensible 4-week window from the chosen "from" date.
  const initialTo = toISODate(addDays(parseISODate(defaultFromDate), 27));

  const [employeeId, setEmployeeId] = useState(defaultEmployeeId || '');
  const [fromDate, setFromDate] = useState(defaultFromDate);
  const [toDate, setToDate] = useState(initialTo);
  const [notes, setNotes] = useState('');
  const [days, setDays] = useState<DayConfig[]>(INITIAL_DAYS);
  const [conflictChoices, setConflictChoices] = useState<Record<string, ConflictResolution>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const activeEmployees = useMemo(() => employees.filter(e => e.is_active), [employees]);

  // Build the proposed list of (date, start, end). Then split into "new" vs "conflict".
  const { proposed, conflicts } = useMemo(() => {
    const proposed: { date: string; start: string; end: string; weekdayMon0: number }[] = [];
    if (!employeeId || !fromDate || !toDate) {
      return { proposed, conflicts: [] as typeof proposed };
    }
    if (parseISODate(toDate) < parseISODate(fromDate)) {
      return { proposed, conflicts: [] as typeof proposed };
    }
    for (let wd = 0; wd < 7; wd++) {
      const cfg = days[wd];
      if (!cfg.selected) continue;
      if (!cfg.start || !cfg.end) continue;
      const dates = expandDateRange(fromDate, toDate, [wd]);
      for (const d of dates) {
        proposed.push({ date: d, start: cfg.start, end: cfg.end, weekdayMon0: wd });
      }
    }
    proposed.sort((a, b) => a.date.localeCompare(b.date));

    const existingByDate = new Map<string, StaffSchedule>();
    for (const s of existingSchedules) {
      if (s.employee_id === employeeId) {
        existingByDate.set(s.date, s);
      }
    }
    const conflicts = proposed.filter(p => existingByDate.has(p.date));
    return { proposed, conflicts };
  }, [employeeId, fromDate, toDate, days, existingSchedules]);

  // Initialise resolution state for any newly-detected conflicts (default skip).
  useEffect(() => {
    setConflictChoices(prev => {
      const next: Record<string, ConflictResolution> = {};
      for (const c of conflicts) {
        next[c.date] = prev[c.date] || 'skip';
      }
      return next;
    });
  }, [conflicts]);

  const toCreate = useMemo(() => {
    return proposed.filter(p => {
      const conflicting = conflicts.some(c => c.date === p.date);
      if (!conflicting) return true;
      return conflictChoices[p.date] === 'overwrite';
    });
  }, [proposed, conflicts, conflictChoices]);

  const skippedCount = conflicts.filter(c => conflictChoices[c.date] !== 'overwrite').length;

  const setDay = (idx: number, patch: Partial<DayConfig>) => {
    setDays(prev => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  };

  const conflictingExisting = useMemo(() => {
    const byDate = new Map<string, StaffSchedule>();
    for (const s of existingSchedules) {
      if (s.employee_id === employeeId) byDate.set(s.date, s);
    }
    return byDate;
  }, [existingSchedules, employeeId]);

  const handleSave = async () => {
    setError('');
    if (!employeeId) { setError('Välj en anställd'); return; }
    if (!fromDate || !toDate) { setError('Välj från- och till-datum'); return; }
    if (parseISODate(toDate) < parseISODate(fromDate)) { setError('Till-datum måste vara efter från-datum'); return; }
    if (!days.some(d => d.selected)) { setError('Välj minst en veckodag'); return; }
    if (toCreate.length === 0) { setError('Inga dagar att skapa — alla träffar är konflikter som hoppas över'); return; }

    setSaving(true);
    try {
      const rows = toCreate.map(p => ({
        employee_id: employeeId,
        date: p.date,
        start_time: p.start,
        end_time: p.end,
        notes: notes.trim() || undefined,
      }));
      // Existing rows that should be replaced.
      const deleteIds = conflicts
        .filter(c => conflictChoices[c.date] === 'overwrite')
        .map(c => conflictingExisting.get(c.date)?.id)
        .filter((id): id is string => !!id);
      await onSave(rows, deleteIds);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Kunde inte spara');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
          <h3 className="text-lg sm:text-xl font-bold">Skapa schema för period</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Stäng">
            <FaTimes />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-md text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Anställd *</label>
            <select
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Välj anställd</option>
              {activeEmployees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Från datum *</label>
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Till datum *</label>
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Veckodagar och tider</label>
            <div className="space-y-2">
              {days.map((cfg, idx) => (
                <div key={idx} className="flex items-center gap-2 sm:gap-3">
                  <label className="flex items-center gap-2 w-28 sm:w-32 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cfg.selected}
                      onChange={e => setDay(idx, { selected: e.target.checked })}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className={cfg.selected ? 'font-medium text-gray-900' : 'text-gray-400'}>
                      {weekdayLong(idx)}
                    </span>
                  </label>
                  <input
                    type="time"
                    value={cfg.start}
                    disabled={!cfg.selected}
                    onChange={e => setDay(idx, { start: e.target.value })}
                    className="px-2 py-1.5 border border-gray-300 rounded-md text-sm w-24 sm:w-28 disabled:bg-gray-50 disabled:text-gray-400"
                  />
                  <span className="text-gray-400">–</span>
                  <input
                    type="time"
                    value={cfg.end}
                    disabled={!cfg.selected}
                    onChange={e => setDay(idx, { end: e.target.value })}
                    className="px-2 py-1.5 border border-gray-300 rounded-md text-sm w-24 sm:w-28 disabled:bg-gray-50 disabled:text-gray-400"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Anteckning (valfritt, sätts på alla pass)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Preview */}
          <div className="border-t border-gray-200 pt-4">
            <h4 className="font-semibold text-gray-800 mb-2">Förhandsgranskning</h4>
            {proposed.length === 0 ? (
              <p className="text-sm text-gray-500">
                Inga dagar matchar än — välj anställd, datum och minst en veckodag.
              </p>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900">{toCreate.length}</span>
                  <span className="text-gray-600">pass kommer skapas</span>
                  {skippedCount > 0 && (
                    <span className="text-gray-500">· {skippedCount} hoppas över</span>
                  )}
                </div>
                {conflicts.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <div className="text-sm font-medium text-yellow-900 mb-2">
                      {conflicts.length} dag{conflicts.length === 1 ? '' : 'ar'} har redan ett pass:
                    </div>
                    <ul className="space-y-1.5">
                      {conflicts.map(c => {
                        const existing = conflictingExisting.get(c.date);
                        const choice = conflictChoices[c.date] || 'skip';
                        return (
                          <li key={c.date} className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-mono text-gray-700 w-24">{c.date}</span>
                            <span className="text-gray-500">
                              befintligt: {existing?.start_time?.slice(0, 5)}–{existing?.end_time?.slice(0, 5)}
                            </span>
                            <span className="text-gray-400">→</span>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name={`conflict-${c.date}`}
                                checked={choice === 'skip'}
                                onChange={() => setConflictChoices(prev => ({ ...prev, [c.date]: 'skip' }))}
                                className="accent-primary"
                              />
                              <span>hoppa över</span>
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name={`conflict-${c.date}`}
                                checked={choice === 'overwrite'}
                                onChange={() => setConflictChoices(prev => ({ ...prev, [c.date]: 'overwrite' }))}
                                className="accent-primary"
                              />
                              <span>skriv över</span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="text-[11px] text-yellow-800 mt-2">
                      "Skriv över" tar bort det befintliga passet och ersätter med det nya.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 sm:p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Avbryt
          </button>
          <button
            onClick={handleSave}
            disabled={saving || toCreate.length === 0}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50"
          >
            {saving ? 'Sparar...' : `Spara ${toCreate.length} pass`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkScheduleModal;
