import { useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash, FaUserPlus } from 'react-icons/fa';
import {
  getCustomers, saveCustomer, deleteCustomer,
  getCustomerDogIds, setCustomerDogs,
  getDogs, inviteCustomer,
  type Customer,
} from '../../lib/database';

type DogLite = { id: string; name: string; breed: string };

type EditingState =
  | (Partial<Customer> & { dogIds?: string[] })
  | null;

export default function CustomersTab() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [dogs, setDogs] = useState<DogLite[]>([]);
  const [editing, setEditing] = useState<EditingState>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const [c, d] = await Promise.all([getCustomers(), getDogs()]);
    setCustomers(c);
    setDogs(d.map(x => ({ id: x.id, name: x.name, breed: x.breed })));
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const startNew = () =>
    setEditing({
      name: '', email: '', phone: '', address: '', city: '',
      invite_status: 'not_invited', dogIds: [],
    });

  const startEdit = async (c: Customer) => {
    const dogIds = await getCustomerDogIds(c.id);
    setEditing({ ...c, dogIds });
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.email || !editing.name) {
      alert('Namn och e-post krävs');
      return;
    }
    const { dogIds, ...rest } = editing;
    const payload = rest as Customer;
    const saved = await saveCustomer(payload);
    await setCustomerDogs(saved.id, dogIds ?? []);
    setEditing(null);
    refresh();
  };

  const remove = async (id: string) => {
    if (!confirm('Ta bort kund? Bokningar och kopplingar tas också bort.')) return;
    await deleteCustomer(id);
    refresh();
  };

  const invite = async (id: string) => {
    if (!confirm('Skicka inbjudan till denna kund?')) return;
    const res = await inviteCustomer(id);
    if (!res.ok) {
      alert(`Misslyckades: ${res.error}`);
      return;
    }
    alert('Inbjudan skickad!');
    refresh();
  };

  if (loading) return <div>Laddar kunder…</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Kunder</h2>
        <button onClick={startNew}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90">
          <FaPlus /> Ny kund
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full bg-white rounded-lg overflow-hidden text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="p-3">Namn</th>
              <th className="p-3">E-post</th>
              <th className="p-3">Telefon</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Åtgärder</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.id} className="border-t">
                <td className="p-3">{c.name}</td>
                <td className="p-3">{c.email}</td>
                <td className="p-3">{c.phone || '—'}</td>
                <td className="p-3">
                  <StatusBadge status={c.invite_status} />
                </td>
                <td className="p-3 text-right space-x-2">
                  <button onClick={() => startEdit(c)} title="Redigera"
                          className="text-gray-600 hover:text-primary"><FaEdit /></button>
                  {c.invite_status !== 'accepted' && (
                    <button onClick={() => invite(c.id)} title="Bjud in"
                            className="text-gray-600 hover:text-primary"><FaUserPlus /></button>
                  )}
                  <button onClick={() => remove(c.id)} title="Ta bort"
                          className="text-red-500 hover:text-red-700"><FaTrash /></button>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500">Inga kunder ännu</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <CustomerEditorModal
          editing={editing}
          dogs={dogs}
          onChange={setEditing}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    not_invited: 'bg-gray-100 text-gray-700',
    invited: 'bg-yellow-100 text-yellow-800',
    accepted: 'bg-green-100 text-green-800',
    disabled: 'bg-red-100 text-red-800',
  };
  const labels: Record<string, string> = {
    not_invited: 'Inte inbjuden',
    invited: 'Inbjuden',
    accepted: 'Aktiv',
    disabled: 'Inaktiverad',
  };
  return <span className={`px-2 py-1 rounded text-xs ${styles[status] ?? ''}`}>{labels[status] ?? status}</span>;
}

function CustomerEditorModal(props: {
  editing: NonNullable<EditingState>;
  dogs: DogLite[];
  onChange: (c: EditingState) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const { editing, dogs, onChange, onSave, onClose } = props;
  const toggleDog = (id: string) => {
    const cur = new Set(editing.dogIds ?? []);
    if (cur.has(id)) cur.delete(id); else cur.add(id);
    onChange({ ...editing, dogIds: [...cur] });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
           onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4">{editing.id ? 'Redigera kund' : 'Ny kund'}</h3>
        <div className="space-y-3">
          <Field label="Namn *" value={editing.name ?? ''}
                 onChange={v => onChange({ ...editing, name: v })} />
          <Field label="E-post *" type="email" value={editing.email ?? ''}
                 onChange={v => onChange({ ...editing, email: v })} />
          <Field label="Telefon" value={editing.phone ?? ''}
                 onChange={v => onChange({ ...editing, phone: v })} />
          <Field label="Adress" value={editing.address ?? ''}
                 onChange={v => onChange({ ...editing, address: v })} />
          <Field label="Stad" value={editing.city ?? ''}
                 onChange={v => onChange({ ...editing, city: v })} />

          <div>
            <span className="text-sm font-medium">Kopplade hundar</span>
            <div className="mt-2 max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
              {dogs.length === 0 && <p className="text-sm text-gray-500 p-2">Inga hundar finns ännu.</p>}
              {dogs.map(d => (
                <label key={d.id} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox"
                         checked={(editing.dogIds ?? []).includes(d.id)}
                         onChange={() => toggleDog(d.id)} />
                  <span>{d.name} <span className="text-gray-400">({d.breed})</span></span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-600">Avbryt</button>
          <button onClick={onSave} className="px-4 py-2 bg-primary text-white rounded-lg">Spara</button>
        </div>
      </div>
    </div>
  );
}

function Field(props: { label: string; type?: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{props.label}</span>
      <input
        type={props.type ?? 'text'}
        value={props.value}
        onChange={e => props.onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border-gray-300"
      />
    </label>
  );
}
