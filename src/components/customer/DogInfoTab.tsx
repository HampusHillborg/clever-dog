import { useState } from 'react';
import { FaEdit, FaSave, FaTimes } from 'react-icons/fa';
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

export default function DogInfoTab({ dog, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<Dog>>(dog);
  const [saving, setSaving] = useState(false);

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
    try {
      const url = await uploadDogPhoto(dog.id, file);
      onUpdate({ ...dog, photo_url: url });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kunde inte ladda upp';
      alert(msg);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow p-6 space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-3xl text-gray-500 shrink-0">
          {dog.photo_url
            ? <img src={dog.photo_url} alt={dog.name} className="w-full h-full object-cover" />
            : dog.name?.[0]?.toUpperCase()}
        </div>
        <button
          type="button"
          className="text-sm text-primary hover:underline"
          onClick={async () => {
            const picked = await pickPhoto();
            if (picked) handlePhotoUpload(picked.file);
          }}
        >
          Byt foto
        </button>
      </div>

      {!editing ? (
        <>
          <div className="flex justify-between">
            <h2 className="font-semibold">Grundinfo</h2>
            <button onClick={() => { setDraft(dog); setEditing(true); }}
                    className="flex items-center gap-2 text-sm text-primary hover:underline">
              <FaEdit /> Redigera
            </button>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
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
          <div className="flex justify-between">
            <h2 className="font-semibold">Redigera grundinfo</h2>
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="text-gray-500"><FaTimes /></button>
              <button onClick={save} disabled={saving} className="text-primary"><FaSave /></button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FIELDS.map(([key, label]) => (
              <label key={String(key)} className="block">
                <span className="text-xs text-gray-500">{label}</span>
                <input
                  value={(draft[key] as string | null | undefined) ?? ''}
                  onChange={e => setDraft({ ...draft, [key]: e.target.value })}
                  className="mt-1 w-full rounded-lg border-gray-300"
                />
              </label>
            ))}
          </div>
        </>
      )}

      <div className="border-t pt-4">
        <h3 className="font-semibold mb-2">Mina anteckningar</h3>
        <CustomerNotesEditor dog={dog} onUpdate={onUpdate} />
      </div>
    </div>
  );
}

function Item({ k, v }: { k: string; v: string | null | undefined }) {
  return <div><dt className="text-gray-500 text-xs">{k}</dt><dd>{v || '—'}</dd></div>;
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
        placeholder="T.ex. allergier, mediciner, mat, beteenden personalen bör känna till…"
        className="w-full rounded-lg border-gray-300"
      />
      {dirty && (
        <button onClick={save} disabled={saving}
                className="mt-2 bg-primary text-white px-4 py-2 rounded-lg text-sm">
          {saving ? 'Sparar…' : 'Spara anteckningar'}
        </button>
      )}
    </div>
  );
}
