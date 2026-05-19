import { useState } from 'react';
import { FaCog } from 'react-icons/fa';
import dogLogo from '../../assets/images/logos/Logo.png';
import { firstNameOf } from '../../lib/customerApi';
import Sheet from '../shared/Sheet';
import AccountSettingsCard from './AccountSettingsCard';

// Logga-ut-knappen flyttades till Mer-fliken eftersom kunder loggar ut sällan
// och vi vill inte ha en "destruktiv" knapp synlig hela tiden i headern.
export default function CustomerHeader({ customerName }: {
  customerName: string;
}) {
  const first = customerName ? firstNameOf(customerName) : 'kund';
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center gap-3">
        <img src={dogLogo} alt="" className="h-8 w-8 object-contain shrink-0" />

        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold leading-none">Inloggad som</p>
          <p className="font-semibold text-sm truncate leading-tight mt-0.5">{first}</p>
        </div>

        <button
          onClick={() => setShowSettings(true)}
          className="w-9 h-9 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors shrink-0"
          aria-label="Kontoinställningar"
        >
          <FaCog className="text-sm" />
        </button>
      </div>

      <Sheet open={showSettings} onClose={() => setShowSettings(false)} title="Kontoinställningar">
        <div className="p-4">
          <AccountSettingsCard />
        </div>
      </Sheet>
    </>
  );
}
