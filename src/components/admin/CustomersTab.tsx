import { useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash, FaUserPlus } from 'react-icons/fa';
import {
  getCustomers, saveCustomer, deleteCustomer,
  getCustomerDogIds, setCustomerDogs,
  getDogs, inviteCustomer,
  type Customer,
} from '../../lib/database';
import { getRecurringSchedule, setRecurringSchedule } from '../../lib/bookingHelpers';

const WEEKDAY_LABELS = ['M', 'T', 'O', 'T', 'F', 'L', 'S'];

type DogLite = { id: string; name: string; breed: string };

type EditingState =
  | (Partial<Customer> & { dogIds?: string[] })
  | null;

export default function CustomersTab() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [dogs, setDogs] = useState<DogLite[]>([]);
  const [editing, setEditing] = useState<EditingState>(null);
  const [schedules, setSchedules] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const [c, d] = await Promise.all([getCustomers(), getDogs()]);
      console.log('[CustomersTab] customers:', c.length, 'dogs:', d.length);
      setCustomers(c);
      setDogs(d.map(x => ({ id: x.id, name: x.name, breed: x.breed })));
    } catch (e) {
      console.error('[CustomersTab] refresh failed', e);
    }
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
    const initial: Record<string, number[]> = {};
    for (const did of dogIds) {
      initial[did] = await getRecurringSchedule(did);
    }
    setSchedules(initial);
    setEditing({ ...c, dogIds });
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.email || !editing.name) {
      alert('Namn och e-post krävs');
      return;
    }
    try {
      const { dogIds, ...rest } = editing;
      // Strip null/undefined optionals so insert payload is clean
      const payload = Object.fromEntries(
        Object.entries(rest).filter(([_, v]) => v !== null && v !== undefined && v !== '')
      ) as Customer;
      const saved = await saveCustomer(payload);
      if (dogIds && dogIds.length > 0) {
        await setCustomerDogs(saved.id, dogIds);
        for (const did of dogIds) {
          await setRecurringSchedule(did, schedules[did] ?? []);
        }
      }
      setEditing(null);
      setSchedules({});
      refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : JSON.stringify(e);
      console.error('saveCustomer failed', e);
      alert(`Kunde inte spara kund: ${msg}`);
    }
  };

  const toggleWeekday = async (dogId: string, w: number) => {
    const cur = schedules[dogId] ?? [];
    const next = cur.includes(w) ? cur.filter(x => x !== w) : [...cur, w];
    setSchedules({ ...schedules, [dogId]: next });
  };

  const ensureSchedule = async (dogId: string) => {
    if (schedules[dogId] !== undefined) return;
    const w = await getRecurringSchedule(dogId);
    setSchedules(s => ({ ...s, [dogId]: w }));
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
          schedules={schedules}
          onChange={(c) => {
            setEditing(c);
            for (const did of c?.dogIds ?? []) ensureSchedule(did);
          }}
          onToggleWeekday={toggleWeekday}
          onSave={save}
          onClose={() => { setEditing(null); setSchedules({}); }}
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
  schedules: Record<string, number[]>;
  onChange: (c: EditingState) => void;
  onToggleWeekday: (dogId: string, w: number) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const { editing, dogs, schedules, onChange, onToggleWeekday, onSave, onClose } = props;
  const toggleDog = (id: string) => {
    const cur = new Set(editing.dogIds ?? []);
    if (cur.has(id)) cur.delete(id); else cur.add(id);
    onChange({ ...editing, dogIds: [...cur] });
  };

  const linkedDogs = dogs.filter(d => (editing.dogIds ?? []).includes(d.id));

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

          {linkedDogs.length > 0 && (
            <div>
              <span className="text-sm font-medium">Fasta dagar per hund</span>
              <p className="text-xs text-gray-500 mb-2">Måndag = M, Söndag = S.</p>
              {linkedDogs.map(d => {
                const sched = schedules[d.id] ?? [];
                return (
                  <div key={d.id} className="mt-2 p-2 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium mb-1">{d.name}</p>
                    <div className="flex gap-1">
                      {WEEKDAY_LABELS.map((label, w) => (
                        <button key={w} type="button"
                                onClick={() => onToggleWeekday(d.id, w)}
                                className={`w-7 h-7 rounded text-sm ${
                                  sched.includes(w) ? 'bg-primary text-white' : 'bg-white border'
                                }`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
