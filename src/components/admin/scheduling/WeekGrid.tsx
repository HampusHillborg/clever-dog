import React from 'react';
import { FaChevronLeft, FaChevronRight, FaPlus } from 'react-icons/fa';
import type { Employee, StaffSchedule, StaffAbsence } from '../../../lib/database';
import ShiftCell from './ShiftCell';
import {
  addDays,
  computeHours,
  formatRange,
  getWeekNumber,
  toISODate,
  weekdayShort,
} from './dateUtils';

interface WeekGridProps {
  weekStart: Date;
  employees: Employee[];
  schedules: StaffSchedule[];
  absences: StaffAbsence[];
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onCellClick: (employeeId: string, dateISO: string, schedule?: StaffSchedule, absence?: StaffAbsence) => void;
  onOpenBulk: () => void;
}

const WeekGrid: React.FC<WeekGridProps> = ({
  weekStart,
  employees,
  schedules,
  absences,
  onPrevWeek,
  onNextWeek,
  onToday,
  onCellClick,
  onOpenBulk,
}) => {
  const days: { date: Date; iso: string }[] = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    return { date: d, iso: toISODate(d) };
  });
  const weekEnd = days[6].date;
  const todayISO = toISODate(new Date());

  // Index schedules and absences for fast lookup.
  const scheduleAt = new Map<string, StaffSchedule>();
  for (const s of schedules) {
    scheduleAt.set(`${s.employee_id}|${s.date}`, s);
  }
  const absenceAt = new Map<string, StaffAbsence>();
  for (const a of absences) {
    if (a.status === 'rejected') continue;
    for (const day of days) {
      if (day.iso >= a.start_date && day.iso <= a.end_date) {
        absenceAt.set(`${a.employee_id}|${day.iso}`, a);
      }
    }
  }

  const weekHours = (employeeId: string): number => {
    let total = 0;
    for (const day of days) {
      const s = scheduleAt.get(`${employeeId}|${day.iso}`);
      if (s?.start_time && s?.end_time) {
        total += computeHours(s.start_time, s.end_time);
      }
    }
    return Math.round(total * 10) / 10;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header: nav + bulk button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 sm:p-6 border-b border-gray-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Personal Scheman</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Vecka {getWeekNumber(weekStart)} · {formatRange(weekStart, weekEnd)}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={onPrevWeek}
            className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
            aria-label="Föregående vecka"
          >
            <FaChevronLeft className="text-gray-600" />
          </button>
          <button
            onClick={onToday}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
          >
            Idag
          </button>
          <button
            onClick={onNextWeek}
            className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
            aria-label="Nästa vecka"
          >
            <FaChevronRight className="text-gray-600" />
          </button>
          <button
            onClick={onOpenBulk}
            className="flex items-center gap-2 bg-primary text-white px-3 py-2 rounded-md hover:bg-primary-dark text-sm ml-auto sm:ml-0"
          >
            <FaPlus className="text-xs" /> Skapa för period
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-separate border-spacing-y-1 min-w-[760px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white text-left font-semibold text-gray-700 px-4 py-2 align-bottom w-44">
                Anställd
              </th>
              {days.map(day => (
                <th
                  key={day.iso}
                  className={`px-2 py-2 text-center font-medium align-bottom ${day.iso === todayISO ? 'text-primary' : 'text-gray-600'}`}
                >
                  <div className="text-xs uppercase tracking-wide">{weekdayShort((day.date.getDay() + 6) % 7)}</div>
                  <div className={`text-base ${day.iso === todayISO ? 'font-bold' : 'font-semibold'}`}>{day.date.getDate()}</div>
                </th>
              ))}
              <th className="px-2 py-2 text-right font-semibold text-gray-600 w-16">Σ</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center text-gray-400 py-8">
                  Inga aktiva anställda. Lägg till medarbetare först.
                </td>
              </tr>
            ) : (
              employees.map(emp => {
                const hours = weekHours(emp.id);
                return (
                  <tr key={emp.id}>
                    <td className="sticky left-0 z-10 bg-white border-r border-gray-100 px-4 py-1 align-middle">
                      <div className="font-medium text-gray-900 truncate">{emp.name}</div>
                      {emp.position && <div className="text-xs text-gray-500 truncate">{emp.position}</div>}
                    </td>
                    {days.map(day => {
                      const key = `${emp.id}|${day.iso}`;
                      const schedule = scheduleAt.get(key);
                      const absence = absenceAt.get(key);
                      return (
                        <td key={day.iso} className="px-1 py-0.5 align-middle">
                          <ShiftCell
                            schedule={schedule}
                            absence={absence}
                            onClick={() => onCellClick(emp.id, day.iso, schedule, absence)}
                          />
                        </td>
                      );
                    })}
                    <td className="px-2 py-1 text-right font-semibold text-gray-700 align-middle">
                      {hours > 0 ? `${hours}h` : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WeekGrid;
