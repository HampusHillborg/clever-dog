import React, { useState } from 'react';
import { FaTimes, FaCheck, FaBan } from 'react-icons/fa';
import type { StaffAbsence, Employee } from '../../../lib/database';

interface AbsencePopoverProps {
  absence: StaffAbsence;
  employee?: Employee;
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
  onClose: () => void;
}

const ABSENCE_LABEL: Record<StaffAbsence['type'], string> = {
  sick: 'Sjukfrånvaro',
  vacation: 'Semester',
  personal: 'Personlig ledighet',
  other: 'Annan frånvaro',
};

const STATUS_LABEL: Record<StaffAbsence['status'], string> = {
  pending: 'Väntar på godkännande',
  approved: 'Godkänd',
  rejected: 'Avslagen',
};

const AbsencePopover: React.FC<AbsencePopoverProps> = ({ absence, employee, onApprove, onReject, onClose }) => {
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState('');

  const handle = async (kind: 'approve' | 'reject') => {
    setError('');
    setBusy(kind);
    try {
      if (kind === 'approve') await onApprove();
      else await onReject();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Kunde inte uppdatera');
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold">{ABSENCE_LABEL[absence.type]}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Stäng">
            <FaTimes />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-3 text-sm">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-md">{error}</div>
          )}

          {employee && (
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">Anställd</div>
              <div className="font-medium text-gray-900">{employee.name}</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">Från</div>
              <div className="font-medium">{absence.start_date}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">Till</div>
              <div className="font-medium">{absence.end_date}</div>
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500">Status</div>
            <div className={`font-medium ${
              absence.status === 'approved' ? 'text-emerald-700' :
              absence.status === 'rejected' ? 'text-red-700' : 'text-yellow-700'
            }`}>
              {STATUS_LABEL[absence.status]}
            </div>
          </div>

          {absence.reason && (
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">Anledning</div>
              <div className="text-gray-800">{absence.reason}</div>
            </div>
          )}

          {absence.reviewed_at && (
            <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
              Granskad {new Date(absence.reviewed_at).toLocaleString('sv-SE')}
            </div>
          )}
        </div>

        {absence.status === 'pending' && (
          <div className="flex justify-end gap-2 p-4 sm:p-6 border-t border-gray-200">
            <button
              onClick={() => handle('reject')}
              disabled={busy !== null}
              className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-50"
            >
              <FaBan /> {busy === 'reject' ? 'Avslår...' : 'Avslå'}
            </button>
            <button
              onClick={() => handle('approve')}
              disabled={busy !== null}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
            >
              <FaCheck /> {busy === 'approve' ? 'Godkänner...' : 'Godkänn'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AbsencePopover;
