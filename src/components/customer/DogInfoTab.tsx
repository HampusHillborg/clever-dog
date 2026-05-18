import { useState } from 'react';
import {
  FaEdit, FaSave, FaTimes, FaCamera, FaStickyNote, FaUserMd, FaExclamationTriangle,
} from 'react-icons/fa';
import { updateMyDog, uploadDogPhoto, type Dog } from '../../lib/customerApi';
import { pickPhoto } from '../../lib/photoPicker';

type Props = { dog: Dog; onUpdate: (d: Dog) => void };

const FIELDS: Array<[keyof Dog, string]> = [
  ['phone', 'Telefon'],
  ['email', 'E-post'],
  ['owner_address', 'Adress'],
  ['owner_city', 'Stad'],
  ['insurance_company', 'Försäkringsbolag'],
  ['insurance_number', 'Försäkringsnr'],
  ['chip_number', 'Chip-nr'],
];

const VET_FIELDS: Array<[keyof Dog, string]> = [
  ['vet_name', 'Veterinär'],
  ['vet_phone', 'Veterinär · telefon'],
  ['emergency_contact_name', 'Nödkontakt'],
  ['emergency_contact_phone', 'Nödkontakt · telefon'],
];

export default function DogInfoTab({ dog, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<Dog>>(dog);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateMyDog(dog.id, {
        phone: draft.phone ?? dog.phone,
        email: draft.email ?? null,
        owner_address: draft.owner_address ?? null,
        owner_city: draft.owner_city ?? null,
        insurance_company: draft.insurance_company ?? null,
        insurance_number: draft.insurance_number ?? null,
        chip_number: draft.chip_number ?? null,
        vet_name: draft.vet_name ?? null,
        vet_phone: draft.vet_phone ?? null,
        emergency_contact_name: draft.emergency_contact_name ?? null,
        emergency_contact_phone: draft.emergency_contact_phone ?? null,
        medical_notes: draft.medical_notes ?? null,
      });
      onUpdate(updated as Dog);
      setEditing(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Kunde inte spara';
      alert(`Kunde inte spara: ${msg}`);
    }
    setSaving(false);
  };

  const handlePhotoUpload = async (file: File) => {
    setUploadingPhoto(true);
    try {
      const url = await uploadDogPhoto(dog.id, file);
      onUpdate({ ...dog, photo_url: url });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kunde inte ladda upp';
      alert(msg);
    }
    setUploadingPhoto(false);
  };

  return (
    <div className="space-y-4">
      {/* Photo card */}
      <div className="bg-white rounded-2xl shadow-card p-5 flex items-center gap-4">
        <div className="relative w-24 h-24 rounded-2xl bg-orange-100 overflow-hidden flex items-center justify-center text-3xl font-bold text-orange-700 shrink-0 ring-2 ring-white shadow-card">
          {dog.photo_url
            ? <img src={dog.photo_url} alt={dog.name} className="w-full h-full object-cover" />
            : dog.name?.[0]?.toUpperCase()}
          {uploadingPhoto && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center text-xs font-semibold text-orange-700">…</div>
          )}
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1">Profilbild</p>
          <p className="text-sm text-gray-600 mb-2">Hjälper oss känna igen din hund.</p>
          <button
            type="button"
            onClick={async () => {
              const picked = await pickPhoto();
              if (picked) handlePhotoUpload(picked.file);
            }}
            disabled={uploadingPhoto}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-orange-700 disabled:opacity-50"
          >
            <FaCamera className="text-xs" />
            {dog.photo_url ? 'Byt foto' : 'Lägg till foto'}
          </button>
        </div>
      </div>

      {/* Info card */}
      <div className="bg-white rounded-2xl shadow-card p-5">
        {!editing ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-base">Grundinfo</h2>
              <button
                onClick={() => { setDraft(dog); setEditing(true); }}
                className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-orange-700 px-2 py-1 rounded-lg hover:bg-orange-50"
              >
                <FaEdit className="text-xs" /> Redigera
              </button>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Item k="Namn" v={dog.name} />
              <Item k="Ras" v={dog.breed} />
              <Item k="Ålder" v={dog.age} />
              <Item k="Telefon" v={dog.phone} />
              <Item k="E-post" v={dog.email} />
              <Item k="Adress" v={dog.owner_address} />
              <Item k="Stad" v={dog.owner_city} />
              <Item k="Försäkringsbolag" v={dog.insurance_company} />
              <Item k="Försäkringsnr" v={dog.insurance_number} />
              <Item k="Chip-nr" v={dog.chip_number} />
            </dl>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-base">Redigera grundinfo</h2>
              <div className="flex gap-1">
                <button
                  onClick={() => setEditing(false)}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-500 flex items-center justify-center"
                  aria-label="Avbryt"
                >
                  <FaTimes className="text-xs" />
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="w-8 h-8 rounded-lg bg-primary text-white hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center"
                  aria-label="Spara"
                >
                  <FaSave className="text-xs" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FIELDS.map(([key, label]) => (
                <label key={String(key)} className="block">
                  <span className="text-xs font-medium text-gray-600">{label}</span>
                  <input
                    value={(draft[key] as string | null | undefined) ?? ''}
                    onChange={e => setDraft({ ...draft, [key]: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:bg-white focus:border-primary transition-colors"
                  />
                </label>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Health & vet card */}
      <div className="bg-white rounded-2xl shadow-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <FaUserMd className="text-red-600 text-sm" />
          <h3 className="font-semibold text-base">Hälsa & veterinär</h3>
        </div>
        {!editing ? (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Item k="Veterinär" v={dog.vet_name} />
            <Item k="Veterinär · telefon" v={dog.vet_phone} />
            <Item k="Nödkontakt" v={dog.emergency_contact_name} />
            <Item k="Nödkontakt · telefon" v={dog.emergency_contact_phone} />
          </dl>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {VET_FIELDS.map(([key, label]) => (
              <label key={String(key)} className="block">
                <span className="text-xs font-medium text-gray-600">{label}</span>
                <input
                  value={(draft[key] as string | null | undefined) ?? ''}
                  onChange={e => setDraft({ ...draft, [key]: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:bg-white focus:border-primary transition-colors"
                />
              </label>
            ))}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-red-700 mb-1.5 flex items-center gap-1.5">
            <FaExclamationTriangle className="text-xs" />
            Akuta uppgifter — allergier, mediciner, kroniska sjukdomar
          </p>
          {!editing ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {dog.medical_notes || <span className="text-gray-300">—</span>}
            </p>
          ) : (
            <textarea
              value={draft.medical_notes ?? ''}
              onChange={e => setDraft({ ...draft, medical_notes: e.target.value })}
              rows={3}
              placeholder="T.ex. 'Hjärtmedicin Vetmedin morgon + kväll. Allergisk mot kyckling. Tål inte sömnmedicin.'"
              className="w-full rounded-xl border border-red-200 bg-red-50/30 px-3 py-2.5 text-sm focus:bg-white focus:border-red-400 transition-colors resize-none"
            />
          )}
        </div>
      </div>

      {/* Notes card */}
      <div className="bg-white rounded-2xl shadow-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <FaStickyNote className="text-orange-500 text-sm" />
          <h3 className="font-semibold text-base">Mina anteckningar</h3>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Beteenden, vanor, småsaker — personalen läser dessa.
        </p>
        <CustomerNotesEditor dog={dog} onUpdate={onUpdate} />
      </div>
    </div>
  );
}

function Item({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">{k}</dt>
      <dd className="text-dark mt-0.5">{v || <span className="text-gray-300">—</span>}</dd>
    </div>
  );
}

function CustomerNotesEditor({ dog, onUpdate }: Props) {
  const [text, setText] = useState(dog.customer_notes ?? '');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateMyDog(dog.id, { customer_notes: text });
      onUpdate(updated as Dog);
      setDirty(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Kunde inte spara';
      alert(msg);
    }
    setSaving(false);
  };

  return (
    <div>
      <textarea
        value={text}
        onChange={e => { setText(e.target.value); setDirty(true); }}
        rows={4}
        placeholder="Skriv något…"
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:bg-white focus:border-primary transition-colors resize-none"
      />
      {dirty && (
        <button
          onClick={save}
          disabled={saving}
          className="mt-3 inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50 active:scale-95 transition-all"
        >
          {saving ? 'Sparar…' : 'Spara anteckningar'}
        </button>
      )}
    </div>
  );
}
