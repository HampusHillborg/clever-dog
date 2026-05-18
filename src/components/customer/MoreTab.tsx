import { useState } from 'react';
import {
  FaFileContract, FaClipboardList, FaUsers, FaQuestionCircle,
  FaSignOutAlt, FaChevronRight,
} from 'react-icons/fa';
import Sheet from '../shared/Sheet';
import ContractView from './ContractView';
import DailyReportsHistory from './DailyReportsHistory';
import StaffDirectoryCard from './StaffDirectoryCard';
import type { Dog } from '../../lib/customerApi';

const STORAGE_KEY = 'cleverdog-onboarding-v1';

type MoreTabProps = {
  dog: Dog;
  onLogout: () => void;
  onShowOnboarding: () => void;
};

type OpenSheet = 'contract' | 'reports' | 'staff' | null;

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

export default function MoreTab({ dog, onLogout, onShowOnboarding }: MoreTabProps) {
  const [openSheet, setOpenSheet] = useState<OpenSheet>(null);

  const handleShowOnboarding = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* blocked */ }
    onShowOnboarding();
  };

  return (
    <div className="space-y-2">
      <div className="bg-white rounded-2xl shadow-card divide-y divide-gray-100">
        <MoreRow
          icon={<FaFileContract />}
          label="Kontrakt"
          sublabel="Se och ladda ner ditt avtal"
          onClick={() => setOpenSheet('contract')}
        />
        <MoreRow
          icon={<FaClipboardList />}
          label="Rapport-historik"
          sublabel="Senaste 14 dagarnas dagsrapporter"
          onClick={() => setOpenSheet('reports')}
        />
        <MoreRow
          icon={<FaUsers />}
          label="Personal"
          sublabel="Vilka tar hand om din hund"
          onClick={() => setOpenSheet('staff')}
        />
        <MoreRow
          icon={<FaQuestionCircle />}
          label="Visa guide igen"
          sublabel="Kom igång-guiden för appen"
          onClick={handleShowOnboarding}
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

      {/* Personal-sheet */}
      <Sheet open={openSheet === 'staff'} onClose={() => setOpenSheet(null)} title="Personal">
        <div className="p-4">
          <StaffDirectoryCard />
        </div>
      </Sheet>
    </div>
  );
}
