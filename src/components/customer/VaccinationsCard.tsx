import { useEffect, useState } from 'react';
import { FaSyringe, FaCheck, FaExclamationTriangle, FaPlus, FaEdit, FaTimes } from 'react-icons/fa';
import {
  getVaccinations, upsertVaccination, deleteVaccination,
  VACCINE_LABELS, vaccinationStatus,
  type Vaccination, type VaccinationPatch,
} from '../../lib/customerApi';

const fmtDate = (iso: string): string =>
  new Date(iso + 'T00:00:00').toLocaleDateString('sv-SE', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

const daysUntil = (iso: string): number => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(iso + 'T00:00:00');
  return Math.floor((d.getTime() - today.getTime()) / 86400000);
};

type VaccineKey = 'rabies' | 'dhppi' | 'kennel_cough' | 'other';
const DEFAULT_ROWS: VaccineKey[] = ['rabies', 'dhppi', 'kennel_cough'];

export default function VaccinationsCard({ dogId }: { dogId: string }) {
  const [items, setItems] = useState<Vaccination[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<VaccineKey | null>(null);
  const [showAddOther, setShowAddOther] = useState(false);

  const refresh = async () => {
    setItems(await getVaccinations(dogId));
    setLoading(false);
  };
  useEffect(() => { refresh(); }, [dogId]);

  const byType = (key: string) => items.find(v => v.vaccine_type === key) ?? null;
  const otherEntries = items.filter(v => v.vaccine_type === 'other');

  return (
    <div className="bg-white rounded-2xl shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FaSyringe className="text-red-600 text-sm" />
          <h3 className="font-semibold text-base">Vaccinationer</h3>
        </div>
        <button
          onClick={() => setShowAddOther(true)}
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          <FaPlus className="text-xs" /> Annat
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Laddar…</p>
      ) : (
        <div className="space-y-2">
          {DEFAULT_ROWS.map(key => (
            <VaccinationRow
              key={key}
              vaccineType={key}
              vaccination={byType(key)}
              onEdit={() => setEditing(key)}
            />
          ))}
          {otherEntries.map(v => (
            <VaccinationRow
              key={v.id}
              vaccineType="other"
              vaccination={v}
              customLabel={v.label}
              onEdit={() => setEditing('other')}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500 mt-4 leading-snug">
        Personalen uppdaterar vaccinationer i samband med vet-besök. Du kan
        själv lägga in datum från ditt vaccinationsintyg.
      </p>

      {editing && (
        <EditVaccinationModal
          dogId={dogId}
          vaccineType={editing}
          existing={editing === 'other'
            ? null
            : byType(editing) ?? null}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}

      {showAddOther && (
        <EditVaccinationModal
          dogId={dogId}
          vaccineType="other"
          existing={null}
          isNew
          onClose={() => setShowAddOther(false)}
          onSaved={() => { setShowAddOther(false); refresh(); }}
        />
      )}
    </div>
  );
}

function VaccinationRow({ vaccineType, vaccination, customLabel, onEdit }: {
  vaccineType: VaccineKey;
  vaccination: Vaccination | null;
  customLabel?: string | null;
  onEdit: () => void;
}) {
  const status = vaccinationStatus(vaccination?.expires_on);
  const label = customLabel ?? VACCINE_LABELS[vaccineType];

  const statusBadge = () => {
    if (status === 'expired') return { text: 'Utgånget', class: 'bg-red-100 text-red-800', icon: <FaExclamationTriangle /> };
    if (status === 'expiring') {
      const days = vaccination ? daysUntil(vaccination.expires_on) : 0;
      return { text: `${days} dgr kvar`, class: 'bg-amber-100 text-amber-800', icon: <FaExclamationTriangle /> };
    }
    if (status === 'valid') return { text: 'OK', class: 'bg-green-100 text-green-800', icon: <FaCheck /> };
    return { text: 'Saknas', class: 'bg-gray-100 text-gray-600', icon: null };
  };

  const badge = statusBadge();

  return (
    <button
      onClick={onEdit}
      className="w-full flex items-center gap-3 p-2.5 hover:bg-gray-50 rounded-lg text-left"
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{label}</p>
        {vaccination?.expires_on && (
          <p className="text-xs text-gray-500">
            Går ut {fmtDate(vaccination.expires_on)}
          </p>
        )}
      </div>
      <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${badge.class}`}>
        {badge.icon}
        {badge.text}
      </span>
      <FaEdit className="text-gray-300 text-xs shrink-0" />
    </button>
  );
}

function EditVaccinationModal({ dogId, vaccineType, existing, isNew, onClose, onSaved }: {
  dogId: string;
  vaccineType: VaccineKey;
  existing: Vaccination | null;
  isNew?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(existing?.label ?? '');
  const [givenOn, setGivenOn] = useState(existing?.given_on ?? '');
  const [expiresOn, setExpiresOn] = useState(existing?.expires_on ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setError('');
    if (!expiresOn) { setError('Datum när vaccinet går ut krävs.'); return; }
    setSaving(true);
    try {
      const patch: VaccinationPatch = {
        vaccine_type: vaccineType,
        label: vaccineType === 'other' ? (label.trim() || null) : null,
        given_on: givenOn || null,
        expires_on: expiresOn,
        notes: notes.trim() || null,
      };
      await upsertVaccination(dogId, patch);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte spara');
    }
    setSaving(false);
  };

  const remove = async () => {
    if (!existing) return;
    if (!confirm('Ta bort denna vaccination?')) return;
    setSaving(true);
    try {
      await deleteVaccination(existing.id);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte ta bort');
    }
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 bg-dark/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center animate-fade-in p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-lift animate-slide-in-top max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
              {isNew ? 'Ny vaccination' : 'Redigera vaccination'}
            </p>
            <p className="font-semibold text-base">{VACCINE_LABELS[vaccineType]}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-500 flex items-center justify-center"
            aria-label="Stäng"
          >
            <FaTimes className="text-sm" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          {vaccineType === 'other' && (
            <Field label="Vaccin / namn">
              <input
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="T.ex. Borrelia"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-primary"
              />
            </Field>
          )}
          <Field label="Givet (frivilligt)">
            <input
              type="date"
              value={givenOn}
              onChange={e => setGivenOn(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-primary"
            />
          </Field>
          <Field label="Går ut *">
            <input
              type="date"
              value={expiresOn}
              onChange={e => setExpiresOn(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-primary"
            />
          </Field>
          <Field label="Anteckning">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="T.ex. veterinär, batchnummer…"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-primary resize-none"
            />
          </Field>
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 flex gap-2 shrink-0">
          {existing && !isNew && (
            <button
              onClick={remove}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl text-red-600 font-medium hover:bg-red-50 disabled:opacity-50"
            >
              Ta bort
            </button>
          )}
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-gray-700 font-medium hover:bg-gray-100 disabled:opacity-50"
          >
            Avbryt
          </button>
          <button
            onClick={save}
            disabled={saving || !expiresOn}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-orange-600 disabled:opacity-50 active:scale-[0.98] transition-all"
          >
            {saving ? 'Sparar…' : 'Spara'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
