import React from 'react';
import type { StaffSchedule, StaffAbsence } from '../../../lib/database';

interface ShiftCellProps {
  schedule?: StaffSchedule;
  absence?: StaffAbsence;
  onClick: () => void;
}

const ABSENCE_LABEL: Record<StaffAbsence['type'], string> = {
  sick: 'Sjuk',
  vacation: 'Semester',
  personal: 'Ledig',
  other: 'Frånvaro',
};

const absenceClasses = (status: StaffAbsence['status'], type: StaffAbsence['type']): string => {
  if (status === 'pending') return 'bg-yellow-50 text-yellow-800 border-yellow-300';
  if (type === 'sick') return 'bg-red-50 text-red-800 border-red-200';
  if (type === 'vacation') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
};

const ShiftCell: React.FC<ShiftCellProps> = ({ schedule, absence, onClick }) => {
  if (absence) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`w-full h-full min-h-[44px] px-2 py-1 rounded border text-xs font-medium text-left transition-colors hover:brightness-95 ${absenceClasses(absence.status, absence.type)}`}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="truncate">{ABSENCE_LABEL[absence.type]}</span>
          {absence.status === 'pending' && (
            <span className="shrink-0 text-[10px] uppercase tracking-wide opacity-75">väntar</span>
          )}
        </div>
      </button>
    );
  }

  if (schedule && schedule.start_time && schedule.end_time) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full h-full min-h-[44px] px-2 py-1 rounded border border-primary/30 bg-primary/10 text-primary-dark text-xs font-semibold text-left transition-colors hover:bg-primary/20"
        title={schedule.notes || undefined}
      >
        <div>{schedule.start_time.slice(0, 5)}–{schedule.end_time.slice(0, 5)}</div>
        {schedule.notes && (
          <div className="text-[10px] font-normal text-gray-600 truncate">{schedule.notes}</div>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Lägg till pass"
      className="w-full h-full min-h-[44px] rounded border border-dashed border-gray-200 text-gray-300 text-lg leading-none transition-colors hover:border-primary hover:text-primary hover:bg-primary/5"
    >
      +
    </button>
  );
};

export default ShiftCell;
