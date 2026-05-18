import { FaSignOutAlt } from 'react-icons/fa';
import dogLogo from '../../assets/images/logos/Logo.png';

const initialsFor = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
};

const firstNameOf = (name: string): string => {
  const first = name.trim().split(/\s+/)[0];
  return first ?? '';
};

export default function CustomerHeader({ customerName, onLogout }: {
  customerName: string;
  onLogout: () => void;
}) {
  const initials = customerName ? initialsFor(customerName) : '?';
  const first = customerName ? firstNameOf(customerName) : 'kund';

  return (
    <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center gap-3">
      <img src={dogLogo} alt="" className="h-8 w-8 object-contain shrink-0" />

      <div className="flex-1 min-w-0 flex items-center gap-2.5">
        <div
          className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-semibold flex items-center justify-center text-sm shrink-0 ring-1 ring-slate-200"
          aria-hidden="true"
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold leading-none">Inloggad</p>
          <p className="font-semibold text-sm truncate leading-tight mt-0.5">{first}</p>
        </div>
      </div>

      <button
        onClick={onLogout}
        className="w-9 h-9 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors shrink-0"
        aria-label="Logga ut"
      >
        <FaSignOutAlt className="text-sm" />
      </button>
    </div>
  );
}
