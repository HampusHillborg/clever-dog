import React, { useMemo, useState } from 'react';
import type { Employee, StaffSchedule, StaffAbsence } from '../../../lib/database';
import WeekGrid from './WeekGrid';
import SingleDayModal from './SingleDayModal';
import BulkScheduleModal from './BulkScheduleModal';
import AbsencePopover from './AbsencePopover';
import { addDays, getWeekStart, toISODate } from './dateUtils';

interface StaffSchedulingTabProps {
  employees: Employee[];
  schedules: StaffSchedule[];
  absences: StaffAbsence[];
  onSaveSchedule: (payload: Omit<StaffSchedule, 'created_at' | 'updated_at'>) => Promise<void>;
  onDeleteSchedule: (id: string) => Promise<void>;
  onBulkSaveSchedules: (
    rows: Omit<StaffSchedule, 'id' | 'created_at' | 'updated_at'>[],
    deleteIds: string[],
  ) => Promise<void>;
  onApproveAbsence: (id: string) => Promise<void>;
  onRejectAbsence: (id: string) => Promise<void>;
}

type SingleEdit =
  | { mode: 'edit'; schedule: StaffSchedule }
  | { mode: 'create'; employeeId: string; date: string };

const StaffSchedulingTab: React.FC<StaffSchedulingTabProps> = ({
  employees,
  schedules,
  absences,
  onSaveSchedule,
  onDeleteSchedule,
  onBulkSaveSchedules,
  onApproveAbsence,
  onRejectAbsence,
}) => {
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [singleEdit, setSingleEdit] = useState<SingleEdit | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [absencePopover, setAbsencePopover] = useState<StaffAbsence | null>(null);

  const activeEmployees = useMemo(
    () => employees.filter(e => e.is_active).sort((a, b) => a.name.localeCompare(b.name, 'sv')),
    [employees],
  );

  const handleCellClick = (
    employeeId: string,
    dateISO: string,
    schedule?: StaffSchedule,
    absence?: StaffAbsence,
  ) => {
    if (absence) {
      setAbsencePopover(absence);
      return;
    }
    if (schedule) {
      setSingleEdit({ mode: 'edit', schedule });
      return;
    }
    setSingleEdit({ mode: 'create', employeeId, date: dateISO });
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      <WeekGrid
        weekStart={weekStart}
        employees={activeEmployees}
        schedules={schedules}
        absences={absences}
        onPrevWeek={() => setWeekStart(prev => addDays(prev, -7))}
        onNextWeek={() => setWeekStart(prev => addDays(prev, 7))}
        onToday={() => setWeekStart(getWeekStart(new Date()))}
        onCellClick={handleCellClick}
        onOpenBulk={() => setBulkOpen(true)}
      />

      {singleEdit && (
        <SingleDayModal
          employees={activeEmployees}
          editing={singleEdit.mode === 'edit' ? singleEdit.schedule : null}
          initialEmployeeId={singleEdit.mode === 'create' ? singleEdit.employeeId : undefined}
          initialDate={singleEdit.mode === 'create' ? singleEdit.date : undefined}
          onSave={onSaveSchedule}
          onDelete={onDeleteSchedule}
          onClose={() => setSingleEdit(null)}
        />
      )}

      {bulkOpen && (
        <BulkScheduleModal
          employees={activeEmployees}
          existingSchedules={schedules}
          defaultFromDate={toISODate(weekStart)}
          onSave={onBulkSaveSchedules}
          onClose={() => setBulkOpen(false)}
        />
      )}

      {absencePopover && (
        <AbsencePopover
          absence={absencePopover}
          employee={employees.find(e => e.id === absencePopover.employee_id)}
          onApprove={() => onApproveAbsence(absencePopover.id)}
          onReject={() => onRejectAbsence(absencePopover.id)}
          onClose={() => setAbsencePopover(null)}
        />
      )}
    </div>
  );
};

export default StaffSchedulingTab;
