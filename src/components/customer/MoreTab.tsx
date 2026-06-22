import { useState } from 'react';
import {
  FaPaw, FaFileContract, FaClipboardList, FaQuestionCircle,
  FaSignOutAlt, FaChevronRight, FaKey, FaUserSlash,
} from 'react-icons/fa';
import Sheet from '../shared/Sheet';
import ContractView from './ContractView';
import DailyReportsHistory from './DailyReportsHistory';
import DogProfileSheet from './DogProfileSheet';
import AccountSettingsCard from './AccountSettingsCard';
import DeleteAccountSheet from './DeleteAccountSheet';
import type { Dog } from '../../lib/customerApi';

const STORAGE_KEY = 'cleverdog-onboarding-v1';

const TYPE_LABEL: Record<string, string> = {
  fulltime: 'Heltid',
  'parttime-3': 'Deltid 3 dgr/v',
  'parttime-2': 'Deltid 2 dgr/v',
  singleDay: 'Enstaka dag',
  boarding: 'Pensionat',
};

type MoreTabProps = {
  dog: Dog;
  onUpdateDog: (d: Dog) => void;
  onLogout: () => void;
  onAccountDeleted: () => void;
  onShowOnboarding: () => void;
};

type OpenSheet = 'dog' | 'contract' | 'reports' | 'password' | 'delete-account' | null;

function MoreRow({
  icon,
  label,
  sublabel,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-colors active:scale-[0.98] ${
        danger ? 'hover:bg-red-50' : 'hover:bg-gray-50'
      }`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          danger ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
        }`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm ${danger ? 'text-red-700' : ''}`}>{label}</p>
        {sublabel && <p className="text-xs text-gray-500 mt-0.5">{sublabel}</p>}
      </div>
      <FaChevronRight className="text-gray-300 text-xs shrink-0" />
    </button>
  );
}

function DogHero({ dog }: { dog: Dog }) {
  return (
    <div className="bg-white rounded-3xl shadow-card p-4 sm:p-5 flex items-center gap-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-50 to-transparent rounded-bl-full pointer-events-none" />
      <div className="relative w-20 h-20 rounded-2xl bg-orange-100 overflow-hidden flex items-center justify-center text-3xl font-bold text-orange-700 shrink-0 ring-2 ring-white shadow-card">
        {dog.photo_url
          ? <img src={dog.photo_url} alt={dog.name} className="w-full h-full object-cover" />
          : dog.name?.[0]?.toUpperCase()}
      </div>
      <div className="relative min-w-0 flex-1">
        <h1 className="text-2xl font-bold tracking-tight truncate">{dog.name}</h1>
        <p className="text-sm text-gray-500 truncate">{dog.breed}{dog.age ? ` · ${dog.age}` : ''}</p>
        {dog.type && (
          <span className="inline-flex items-center mt-2 text-[11px] font-semibold text-orange-800 bg-orange-100 px-2 py-0.5 rounded-full">
            {TYPE_LABEL[dog.type] ?? dog.type}
          </span>
        )}
      </div>
    </div>
  );
}

export default function MoreTab({ dog, onUpdateDog, onLogout, onAccountDeleted, onShowOnboarding }: MoreTabProps) {
  const [openSheet, setOpenSheet] = useState<OpenSheet>(null);

  const handleShowOnboarding = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* blocked */ }
    onShowOnboarding();
  };

  return (
    <div className="space-y-2">
      <div className="bg-white rounded-2xl shadow-card divide-y divide-gray-100">
        <MoreRow
          icon={<FaPaw />}
          label="Hundinfo & hälsa"
          sublabel="Grundinfo, ras, vaccinationer, veterinär"
          onClick={() => setOpenSheet('dog')}
        />
        <MoreRow
          icon={<FaFileContract />}
          label="Kontrakt"
          sublabel="Se ditt avtal"
          onClick={() => setOpenSheet('contract')}
        />
        <MoreRow
          icon={<FaClipboardList />}
          label="Rapport-historik"
          sublabel="Senaste 14 dagarnas dagsrapporter"
          onClick={() => setOpenSheet('reports')}
        />
        <MoreRow
          icon={<FaQuestionCircle />}
          label="Visa guide igen"
          sublabel="Kom igång-guiden för appen"
          onClick={handleShowOnboarding}
        />
        <MoreRow
          icon={<FaKey />}
          label="Byt lösenord"
          sublabel="Uppdatera kontots lösenord"
          onClick={() => setOpenSheet('password')}
        />
      </div>

      <div className="bg-white rounded-2xl shadow-card">
        <MoreRow
          icon={<FaSignOutAlt />}
          label="Logga ut"
          sublabel="Du behöver logga in igen nästa gång"
          onClick={onLogout}
          danger
        />
      </div>

      <div className="bg-white rounded-2xl shadow-card mt-3">
        <MoreRow
          icon={<FaUserSlash />}
          label="Radera konto"
          sublabel="Tar bort din profil och din data permanent"
          onClick={() => setOpenSheet('delete-account')}
          danger
        />
      </div>

      {/* Hundinfo & hälsa-sheet — iOS Settings-stil */}
      <Sheet open={openSheet === 'dog'} onClose={() => setOpenSheet(null)} title="Hundinfo & hälsa">
        <DogProfileSheet dog={dog} onUpdate={onUpdateDog} />
      </Sheet>

      {/* Kontrakt-sheet */}
      <Sheet open={openSheet === 'contract'} onClose={() => setOpenSheet(null)} title="Kontrakt">
        <div className="p-4">
          <ContractView dog={dog} />
        </div>
      </Sheet>

      {/* Rapport-historik-sheet */}
      <Sheet open={openSheet === 'reports'} onClose={() => setOpenSheet(null)} title="Rapport-historik">
        <div className="p-4">
          <DailyReportsHistory dogId={dog.id} dogName={dog.name} />
        </div>
      </Sheet>

      {/* Byt lösenord-sheet */}
      <Sheet open={openSheet === 'password'} onClose={() => setOpenSheet(null)} title="Byt lösenord">
        <AccountSettingsCard />
      </Sheet>

      {/* Radera konto-sheet (Apple/Play-krav: in-app account deletion) */}
      <Sheet open={openSheet === 'delete-account'} onClose={() => setOpenSheet(null)} title="Radera konto">
        <DeleteAccountSheet onDeleted={onAccountDeleted} />
      </Sheet>
    </div>
  );
}
