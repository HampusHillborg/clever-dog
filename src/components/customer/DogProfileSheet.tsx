/**
 * DogProfileSheet — iOS Settings-stil för "Hundinfo & hälsa"
 *
 * Ersätter den gamla 5-kort-stapeln (DogHero + Photo card + Grundinfo +
 * Hälsa & vet + Anteckningar + Vaccinationer) med en ren section-lista.
 * Caller (MoreTab) wraps this in <Sheet> already — inget Sheet-wrapper här.
 */
import { useState } from 'react';
import { FaChevronRight, FaCamera } from 'react-icons/fa';
import Sheet from '../shared/Sheet';
import SaveButton from '../shared/SaveButton';
import VaccinationsCard from './VaccinationsCard';
import { updateMyDog, uploadDogPhoto, removeDogPhoto, type Dog } from '../../lib/customerApi';
import { pickPhoto } from '../../lib/photoPicker';
import { sanitizePhoneInput, phoneError, emailError } from '../../lib/validation';

const TYPE_LABEL: Record<string, string> = {
  fulltime: 'Heltid',
  'parttime-3': 'Deltid 3 dgr/v',
  'parttime-2': 'Deltid 2 dgr/v',
  singleDay: 'Enstaka dag',
  boarding: 'Pensionat',
};

// ----- Primitives -----------------------------------------------------------

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold px-4 pt-5 pb-2">
      {children}
    </p>
  );
}

function Row({
  label,
  value,
  sublabel,
  onClick,
  warningIcon,
}: {
  label: string;
  value?: string | null;
  sublabel?: string;
  onClick: () => void;
  warningIcon?: boolean;
}) {
  const empty = !value;
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 text-left min-h-[44px]"
    >
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
          {label}
        </p>
        <p className={`text-sm mt-0.5 truncate ${empty ? 'text-gray-300' : 'text-gray-900'}`}>
          {warningIcon && !empty && (
            <span className="text-amber-600 mr-1">⚠</span>
          )}
          {value || 'Lägg till'}
        </p>
        {sublabel && (
          <p className="text-xs text-gray-500 mt-0.5">{sublabel}</p>
        )}
      </div>
      <FaChevronRight className="text-gray-300 text-xs shrink-0" />
    </button>
  );
}

// ----- FieldEditSheet -------------------------------------------------------

type FieldKind = 'text' | 'phone' | 'email';

type EditState = {
  field: keyof Dog;
  label: string;
  value: string;
  multiline: boolean;
  placeholder?: string;
  kind: FieldKind;
};

function FieldEditSheet({
  open,
  onClose,
  title,
  value: initialValue,
  multiline,
  placeholder,
  kind,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  value: string;
  multiline: boolean;
  placeholder?: string;
  kind: FieldKind;
  onSave: (newValue: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  // Sync when the sheet reopens for a different field
  const [lastInitial, setLastInitial] = useState(initialValue);
  if (initialValue !== lastInitial) {
    setDraft(initialValue);
    setLastInitial(initialValue);
    setError(null);
  }

  const validate = (v: string): string | null =>
    kind === 'phone' ? phoneError(v) : kind === 'email' ? emailError(v) : null;

  const handleChange = (raw: string) => {
    const v = kind === 'phone' ? sanitizePhoneInput(raw) : raw;
    setDraft(v);
    if (error) setError(validate(v));
  };

  const handleSave = async () => {
    const err = validate(draft);
    if (err) { setError(err); throw new Error(err); }
    await onSave(draft);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={title} blockBackdropClose>
      <div className="p-4 flex flex-col gap-4">
        {multiline ? (
          <textarea
            value={draft}
            onChange={(e) => handleChange(e.target.value)}
            rows={5}
            placeholder={placeholder}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:bg-white focus:border-orange-400 transition-colors resize-none"
            autoFocus
          />
        ) : (
          <input
            value={draft}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={placeholder}
            type={kind === 'email' ? 'email' : kind === 'phone' ? 'tel' : 'text'}
            inputMode={kind === 'phone' ? 'tel' : kind === 'email' ? 'email' : undefined}
            autoComplete={kind === 'phone' ? 'tel' : kind === 'email' ? 'email' : undefined}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:bg-white focus:border-orange-400 transition-colors"
            autoFocus
          />
        )}
        {error && (
          <p className="text-sm text-red-700 -mt-2">{error}</p>
        )}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Avbryt
          </button>
          <SaveButton onSave={handleSave} className="flex-1 py-3">
            Spara
          </SaveButton>
        </div>
      </div>
    </Sheet>
  );
}

// Härled fälttyp för validering utifrån kolumnnamnet.
const fieldKindFor = (field: keyof Dog): FieldKind => {
  const name = String(field);
  if (name === 'email') return 'email';
  if (name.includes('phone')) return 'phone';
  return 'text';
};

// ----- Main component -------------------------------------------------------

type Props = { dog: Dog; onUpdate: (d: Dog) => void };

export default function DogProfileSheet({ dog, onUpdate }: Props) {
  const [editState, setEditState] = useState<EditState | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);

  const openEdit = (
    field: keyof Dog,
    label: string,
    multiline = false,
    placeholder?: string,
  ) => {
    setEditState({
      field,
      label,
      value: (dog[field] as string | null | undefined) ?? '',
      multiline,
      placeholder,
      kind: fieldKindFor(field),
    });
  };

  const handleSave = async (newValue: string) => {
    if (!editState) return;
    const patch = { [editState.field]: newValue.trim() || null } as Partial<Dog>;
    const updated = await updateMyDog(dog.id, patch);
    onUpdate(updated as Dog);
  };

  const handlePhotoTap = async () => {
    const picked = await pickPhoto();
    if (!picked) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadDogPhoto(dog.id, picked.file);
      onUpdate({ ...dog, photo_url: url });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kunde inte ladda upp foto';
      alert(msg);
    }
    setUploadingPhoto(false);
  };

  const handleRemovePhoto = async () => {
    if (!dog.photo_url) return;
    if (!confirm('Ta bort profilbilden?')) return;
    setUploadingPhoto(true);
    try {
      await removeDogPhoto(dog.id, dog.photo_url);
      onUpdate({ ...dog, photo_url: null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kunde inte ta bort foto';
      alert(msg);
    }
    setUploadingPhoto(false);
  };

  return (
    <div className="pb-6">
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center pt-4 pb-2 px-4">
        {/* Photo */}
        <button
          onClick={() => (dog.photo_url ? setPhotoMenuOpen(true) : handlePhotoTap())}
          disabled={uploadingPhoto}
          className="relative w-24 h-24 rounded-[22px] bg-orange-100 overflow-hidden flex items-center justify-center text-4xl font-bold text-orange-700 shrink-0 ring-2 ring-white shadow-md active:scale-95 transition-transform"
          aria-label="Byt foto"
        >
          {dog.photo_url ? (
            <img src={dog.photo_url} alt={dog.name} className="w-full h-full object-cover" />
          ) : (
            dog.name?.[0]?.toUpperCase()
          )}
          {uploadingPhoto && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center text-xs font-semibold text-orange-700">
              …
            </div>
          )}
          {/* Camera overlay hint */}
          <div className="absolute bottom-0 right-0 w-7 h-7 bg-white rounded-tl-xl flex items-center justify-center shadow-sm">
            <FaCamera className="text-gray-500 text-xs" />
          </div>
        </button>

        {/* Name + breed + age */}
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 text-center leading-tight">
          {dog.name}
        </h1>
        {(dog.breed || dog.age) && (
          <p className="text-sm text-gray-500 text-center mt-0.5">
            {[dog.breed, dog.age].filter(Boolean).join(' · ')}
          </p>
        )}
        {dog.type && (
          <span className="mt-2 inline-flex items-center text-[11px] font-semibold text-orange-800 bg-orange-100 px-2.5 py-0.5 rounded-full">
            {TYPE_LABEL[dog.type] ?? dog.type}
          </span>
        )}
      </div>

      {/* ── GRUNDINFO ─────────────────────────────────────────────────── */}
      <SectionHeader>Grundinfo</SectionHeader>
      <div className="mx-4 bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
        <Row label="Telefon"          value={dog.phone}              onClick={() => openEdit('phone', 'Telefon', false, '070-000 00 00')} />
        <Row label="E-post"           value={dog.email}              onClick={() => openEdit('email', 'E-post', false, 'namn@exempel.se')} />
        <Row label="Adress"           value={dog.owner_address}      onClick={() => openEdit('owner_address', 'Adress', false, 'Storgatan 1')} />
        <Row label="Stad"             value={dog.owner_city}         onClick={() => openEdit('owner_city', 'Stad', false, 'Malmö')} />
        <Row label="Försäkringsbolag" value={dog.insurance_company}  onClick={() => openEdit('insurance_company', 'Försäkringsbolag', false, 'T.ex. Agria')} />
        <Row label="Försäkringsnr"    value={dog.insurance_number}   onClick={() => openEdit('insurance_number', 'Försäkringsnr', false, 'SE12345678')} />
        <Row label="Chip-nr"          value={dog.chip_number}        onClick={() => openEdit('chip_number', 'Chip-nr', false, '752...')} />
      </div>

      {/* ── HÄLSA & VETERINÄR ─────────────────────────────────────────── */}
      <SectionHeader>Hälsa & veterinär</SectionHeader>
      <div className="mx-4 bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
        <Row label="Veterinär"               value={dog.vet_name}                   onClick={() => openEdit('vet_name', 'Veterinär', false, 'Djursjukhuset i Malmö')} />
        <Row label="Vet · telefon"           value={dog.vet_phone}                  onClick={() => openEdit('vet_phone', 'Vet · telefon', false, '040-000 00 00')} />
        <Row label="Nödkontakt"              value={dog.emergency_contact_name}     onClick={() => openEdit('emergency_contact_name', 'Nödkontakt', false, 'Anna Svensson')} />
        <Row label="Nödkontakt · telefon"    value={dog.emergency_contact_phone}    onClick={() => openEdit('emergency_contact_phone', 'Nödkontakt · telefon', false, '070-000 00 00')} />
        <Row
          label="Medicinska noter"
          value={dog.medical_notes}
          warningIcon
          onClick={() =>
            openEdit(
              'medical_notes',
              'Medicinska noter',
              true,
              'T.ex. Hjärtmedicin Vetmedin morgon + kväll. Allergisk mot kyckling.',
            )
          }
        />
      </div>

      {/* ── MINA ANTECKNINGAR ─────────────────────────────────────────── */}
      <SectionHeader>Mina anteckningar</SectionHeader>
      <div className="mx-4 bg-white rounded-2xl shadow-sm overflow-hidden">
        <Row
          label="Anteckningar"
          value={dog.customer_notes}
          sublabel="Beteenden, vanor, småsaker — personalen läser dessa"
          onClick={() =>
            openEdit(
              'customer_notes',
              'Mina anteckningar',
              true,
              'Skriv något om din hund…',
            )
          }
        />
      </div>

      {/* ── VACCINATIONER ─────────────────────────────────────────────── */}
      <SectionHeader>Vaccinationer</SectionHeader>
      <div className="mx-4">
        <VaccinationsCard dogId={dog.id} />
      </div>

      {/* ── Foto-meny (byt/ta bort) ───────────────────────────────────── */}
      <Sheet open={photoMenuOpen} onClose={() => setPhotoMenuOpen(false)} title="Profilbild">
        <div className="p-4 flex flex-col gap-2">
          <button
            onClick={() => { setPhotoMenuOpen(false); handlePhotoTap(); }}
            className="w-full py-3 rounded-xl bg-gray-100 font-medium text-gray-800 hover:bg-gray-200 active:scale-[0.98] transition-all"
          >
            Byt foto
          </button>
          <button
            onClick={() => { setPhotoMenuOpen(false); handleRemovePhoto(); }}
            className="w-full py-3 rounded-xl bg-red-50 font-medium text-red-600 hover:bg-red-100 active:scale-[0.98] transition-all"
          >
            Ta bort foto
          </button>
          <button
            onClick={() => setPhotoMenuOpen(false)}
            className="w-full py-3 rounded-xl text-gray-500 font-medium hover:bg-gray-50"
          >
            Avbryt
          </button>
        </div>
      </Sheet>

      {/* ── Field edit sub-sheet ──────────────────────────────────────── */}
      {editState && (
        <FieldEditSheet
          open={editState !== null}
          onClose={() => setEditState(null)}
          title={editState.label}
          value={editState.value}
          multiline={editState.multiline}
          placeholder={editState.placeholder}
          kind={editState.kind}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
