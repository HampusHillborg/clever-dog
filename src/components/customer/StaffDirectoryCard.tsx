import { useEffect, useState } from 'react';
import { FaUserFriends } from 'react-icons/fa';
import { supabase } from '../../lib/supabase';

type StaffMember = { id: string; name: string; role: string | null };

const roleLabel = (r: string | null): string => {
  if (r === 'admin') return 'Ägare';
  if (r === 'platschef') return 'Platschef';
  return 'Personal';
};

const initials = (name: string): string =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]!.toUpperCase()).join('');

export default function StaffDirectoryCard() {
  const [items, setItems] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!supabase) { setLoading(false); return; }
      // staff_directory is defined in supabase/migrations but isn't in
      // the generated TS types, so cast to bypass the strict signature.
      const { data, error } = await (supabase.rpc as unknown as (
        name: string,
      ) => Promise<{ data: StaffMember[] | null; error: unknown }>)('staff_directory');
      if (error) console.error('staff_directory', error);
      setItems((data as StaffMember[] | null) ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <FaUserFriends className="text-orange-500 text-sm" />
        <h3 className="font-semibold text-base">Personalen</h3>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Vilka tar hand om din hund — och vem som hör av sig i chatten.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {items.map(s => (
          <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
            <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-700 font-semibold text-sm flex items-center justify-center shrink-0">
              {initials(s.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{s.name}</p>
              <p className="text-[11px] text-gray-500">{roleLabel(s.role)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
