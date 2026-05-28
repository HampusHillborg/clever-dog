import React, { useEffect, useMemo, useState } from 'react';
import { FaTimes, FaTrash } from 'react-icons/fa';
import type { Employee, StaffSchedule } from '../../../lib/database';

interface SingleDayModalProps {
  employees: Employee[];
  // Either an existing schedule to edit, or initial employee/date for a new one.
  editing: StaffSchedule | null;
  initialEmployeeId?: string;
  initialDate?: string;
  onSave: (payload: Omit<StaffSchedule, 'created_at' | 'updated_at'>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onClose: () => void;
}

const SingleDayModal: React.FC<SingleDayModalProps> = ({
  employees,
  editing,
  initialEmployeeId,
  initialDate,
  onSave,
  onDelete,
  onClose,
}) => {
  const [employeeId, setEmployeeId] = useState(editing?.employee_id || initialEmployeeId || '');
  const [date, setDate] = useState(editing?.date || initialDate || '');
  const [startTime, setStartTime] = useState(editing?.start_time?.slice(0, 5) || '');
  const [endTime, setEndTime] = useState(editing?.end_time?.slice(0, 5) || '');
  const [notes, setNotes] = useState(editing?.notes || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const activeEmployees = useMemo(() => employees.filter(e => e.is_active), [employees]);

  // If parent swaps the editing target, reset state.
  useEffect(() => {
    setEmployeeId(editing?.employee_id || initialEmployeeId || '');
    setDate(editing?.date || initialDate || '');
    setStartTime(editing?.start_time?.slice(0, 5) || '');
    setEndTime(editing?.end_time?.slice(0, 5) || '');
    setNotes(editing?.notes || '');
    setError('');
  }, [editing, initialEmployeeId, initialDate]);

  const handleSave = async () => {
    setError('');
    if (!employeeId || !date || !startTime || !endTime) {
      setError('Alla obligatoriska fält måste fyllas i');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        id: editing?.id || '',
        employee_id: employeeId,
        date,
        start_time: startTime,
        end_time: endTime,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Kunde inte spara schemat');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing || !onDelete) return;
    if (!confirm('Ta bort detta pass?')) return;
    setDeleting(true);
    try {
      await onDelete(editing.id);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Kunde inte ta bort');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
          <h3 className="text-lg sm:text-xl font-bold">
            {editing ? 'Redigera pass' : 'Lägg till pass'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Stäng">
            <FaTimes />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Anställd *</label>
            <select
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              disabled={!!editing}
            >
              <option value="">Välj anställd</option>
              {activeEmployees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Datum *</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Starttid *</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sluttid *</label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Anteckningar</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-between items-center gap-2 p-4 sm:p-6 border-t border-gray-200">
          {editing && onDelete ? (
            <button
              onClick={handleDelete}
              disabled={deleting || saving}
              className="flex items-center gap-2 text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
            >
              <FaTrash /> {deleting ? 'Tar bort...' : 'Ta bort'}
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={saving || deleting}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Avbryt
            </button>
            <button
              onClick={handleSave}
              disabled={saving || deleting}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50"
            >
              {saving ? 'Sparar...' : editing ? 'Uppdatera' : 'Spara'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SingleDayModal;
