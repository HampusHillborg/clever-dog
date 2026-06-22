import dogLogo from '../../assets/images/logos/Logo.png';
import { firstNameOf } from '../../lib/customerApi';
import NotificationCenter from './NotificationCenter';

// Minimal header — logo + "Inloggad som [namn]" + notisklocka. Inställningar
// och logga-ut bor under Mer-fliken eftersom kunder rör dem sällan.
export default function CustomerHeader({ customerName }: {
  customerName: string;
}) {
  const first = customerName ? firstNameOf(customerName) : 'kund';

  return (
    <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center gap-3">
      <img src={dogLogo} alt="" className="h-8 w-8 object-contain shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold leading-none">Inloggad som</p>
        <p className="font-semibold text-sm truncate leading-tight mt-0.5">{first}</p>
      </div>

      <NotificationCenter />
    </div>
  );
}
