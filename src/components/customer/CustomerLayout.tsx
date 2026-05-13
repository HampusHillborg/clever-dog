import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSignOutAlt } from 'react-icons/fa';
import { getCustomerForUser, signOutCustomer, type Customer } from '../../lib/customerAuth';
import dogLogo from '../../assets/images/logos/Logo.png';

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
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={dogLogo} alt="" className="h-10" />
            <div>
              <p className="text-xs text-gray-500">Inloggad som</p>
              <p className="font-medium">{customer?.name ?? '…'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary"
          >
            <FaSignOutAlt /> Logga ut
          </button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
