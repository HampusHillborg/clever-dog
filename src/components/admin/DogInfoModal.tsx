import { useEffect, useState } from 'react';
import { FaTimes, FaPhone, FaEnvelope, FaMapMarkerAlt, FaIdCard, FaStickyNote } from 'react-icons/fa';
import { supabase } from '../../lib/supabase';

type DogRow = {
  id: string;
  name: string;
  breed: string;
  age: string | null;
  gender: string | null;
  type: string | null;
  owner: string;
  phone: string | null;
  email: string | null;
  owner_address: string | null;
  owner_city: string | null;
  owner_personal_number: string | null;
  chip_number: string | null;
  insurance_company: string | null;
  insurance_number: string | null;
  notes: string | null;
  customer_notes: string | null;
  photo_url: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  fulltime: 'Heltid',
  'parttime-3': 'Deltid 3 dgr/v',
  'parttime-2': 'Deltid 2 dgr/v',
  singleDay: 'Enstaka dag',
  boarding: 'Pensionat',
};

export default function DogInfoModal({ dogId, onClose }: {
  dogId: string;
  onClose: () => void;
}) {
  const [dog, setDog] = useState<DogRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!supabase) { setLoading(false); return; }
      const { data } = await supabase
        .from('dogs')
        .select('id, name, breed, age, gender, type, owner, phone, email, owner_address, owner_city, owner_personal_number, chip_number, insurance_company, insurance_number, notes, customer_notes, photo_url')
        .eq('id', dogId)
        .maybeSingle();
      setDog((data as DogRow | null) ?? null);
      setLoading(false);
    })();
  }, [dogId]);

  return (
    <div
      className="fixed inset-0 bg-dark/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-lift animate-slide-in-top max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
          <div className="flex items-start justify-between gap-3 mb-4">
            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Hundinfo</p>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-500 flex items-center justify-center shrink-0 -mt-1 -mr-1"
              aria-label="Stäng"
            >
              <FaTimes className="text-sm" />
            </button>
          </div>
          {loading ? (
            <div className="animate-pulse flex items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-gray-100" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-32 bg-gray-100 rounded" />
                <div className="h-3 w-24 bg-gray-100 rounded" />
              </div>
            </div>
          ) : dog ? (
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-orange-100 overflow-hidden flex items-center justify-center text-2xl font-bold text-orange-700 shrink-0">
                {dog.photo_url
                  ? <img src={dog.photo_url} alt={dog.name} className="w-full h-full object-cover" />
                  : dog.name[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="text-xl font-bold tracking-tight truncate">{dog.name}</h3>
                <p className="text-sm text-gray-500 truncate">
                  {dog.breed}{dog.age ? ` · ${dog.age}` : ''}{dog.gender ? ` · ${dog.gender}` : ''}
                </p>
                {dog.type && (
                  <span className="inline-flex items-center mt-1 text-[10px] font-semibold text-orange-800 bg-orange-100 px-1.5 py-0.5 rounded-full">
                    {TYPE_LABEL[dog.type] ?? dog.type}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Hundinformation hittades inte.</p>
          )}
        </div>

        {/* Body */}
        {dog && (
          <div className="px-5 py-4 space-y-4 overflow-y-auto">
            <Group title="Ägare">
              <Item icon={<FaIdCard />} label="Namn" value={dog.owner} />
              <Item icon={<FaPhone />} label="Telefon" value={dog.phone} href={dog.phone ? `tel:${dog.phone}` : undefined} />
              <Item icon={<FaEnvelope />} label="E-post" value={dog.email} href={dog.email ? `mailto:${dog.email}` : undefined} />
              <Item icon={<FaMapMarkerAlt />} label="Adress"
                value={[dog.owner_address, dog.owner_city].filter(Boolean).join(', ') || null} />
            </Group>

            {(dog.chip_number || dog.insurance_company || dog.insurance_number) && (
              <Group title="Hund">
                <Item label="Chip-nr" value={dog.chip_number} />
                <Item label="Försäkringsbolag" value={dog.insurance_company} />
                <Item label="Försäkringsnr" value={dog.insurance_number} />
              </Group>
            )}

            {(dog.notes || dog.customer_notes) && (
              <Group title="Anteckningar">
                {dog.customer_notes && (
                  <div className="rounded-xl bg-orange-50 border border-orange-200 px-3 py-2.5">
                    <p className="text-[11px] font-semibold text-orange-900 mb-1 flex items-center gap-1">
                      <FaStickyNote className="text-xs" /> Från ägaren
                    </p>
                    <p className="text-sm text-orange-900 whitespace-pre-wrap leading-snug">{dog.customer_notes}</p>
                  </div>
                )}
                {dog.notes && (
                  <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5">
                    <p className="text-[11px] font-semibold text-gray-700 mb-1">Interna noter</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-snug">{dog.notes}</p>
                  </div>
                )}
              </Group>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Item({ icon, label, value, href }: {
  icon?: React.ReactNode;
  label: string;
  value: string | null | undefined;
  href?: string;
}) {
  if (!value) return null;
  const content = (
    <div className="flex items-start gap-2.5 text-sm">
      {icon && <span className="text-gray-400 mt-0.5 w-4 shrink-0">{icon}</span>}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">{label}</p>
        <p className="text-dark truncate">{value}</p>
      </div>
    </div>
  );
  if (href) {
    return <a href={href} className="block py-1 hover:bg-gray-50 rounded -mx-1 px-1">{content}</a>;
  }
  return <div className="py-1">{content}</div>;
}
