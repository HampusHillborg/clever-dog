import { useEffect, useRef, useState } from 'react';
import { getCustomers, type Customer } from '../../lib/database';

type Props = {
  value: string;
  customerId: string | null;
  onChange: (name: string, customerId: string | null) => void;
  emailHint?: string;
};

export default function OwnerInput({ value, customerId, onChange, emailHint }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getCustomers().then(setCustomers);
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const query = value.toLowerCase().trim();
  const matches = query
    ? customers.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query),
      )
    : customers;
  const exactMatch = customers.find(c => c.name.toLowerCase() === query);

  const pick = (c: Customer) => {
    onChange(c.name, c.id);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value, null)}
        onFocus={() => setOpen(true)}
        placeholder="Namn på ägaren"
        className="w-full p-2 border border-gray-300 rounded"
      />
      {customerId && (
        <p className="text-xs text-green-700 mt-1">
          ✓ Kopplas till befintlig kund
        </p>
      )}
      {value && !customerId && !exactMatch && (
        <p className="text-xs text-blue-700 mt-1">
          Ny kund skapas vid spara{emailHint ? ` (med email ${emailHint})` : ' (lägg till email i kund-fliken senare)'}
        </p>
      )}

      {open && (matches.length > 0 || query) && (
        <div className="absolute z-40 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {matches.length === 0 && (
            <div className="p-3 text-sm text-gray-500">Ingen befintlig kund matchar — en ny skapas vid spara.</div>
          )}
          {matches.map(c => (
            <button
              type="button"
              key={c.id}
              onClick={() => pick(c)}
              className={`w-full text-left px-3 py-2 hover:bg-gray-100 text-sm border-b last:border-b-0 ${
                c.id === customerId ? 'bg-blue-50' : ''
              }`}
            >
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-gray-500">
                {c.email} {c.phone ? `· ${c.phone}` : ''}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
