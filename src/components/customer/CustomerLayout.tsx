import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSignOutAlt } from 'react-icons/fa';
import { getCustomerForUser, signOutCustomer, type Customer } from '../../lib/customerAuth';
import dogLogo from '../../assets/images/logos/Logo.png';

const initialsFor = (name: string | null | undefined): string => {
  if (!name) return '?';
  return name.split(/\s+/).filter(Boolean).slice(0, 2)
    .map(p => p[0]!.toUpperCase()).join('');
};

export default function CustomerLayout({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    getCustomerForUser().then(setCustomer);
  }, []);

  const logout = async () => {
    await signOutCustomer();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-light">
      <header className="bg-white/85 backdrop-blur-md sticky top-0 z-30 border-b border-gray-200/70">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src={dogLogo} alt="" className="h-9 w-9 object-contain shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Kund­portal</p>
              <p className="font-semibold text-sm truncate">{customer?.name ?? '…'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex w-9 h-9 rounded-full bg-orange-100 text-orange-700 items-center justify-center font-semibold text-sm">
              {initialsFor(customer?.name)}
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Logga ut"
            >
              <FaSignOutAlt className="text-xs" />
              <span className="hidden sm:inline">Logga ut</span>
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
