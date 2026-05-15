import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock, FaPaw } from 'react-icons/fa';
import { signInCustomer, signOutCustomer, getCustomerForUser, isAdminUser } from '../lib/customerAuth';
import { supabase } from '../lib/supabase';
import { initPushNotifications } from '../lib/pushNotifications';
import dogLogo from '../assets/images/logos/Logo.png';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await signInCustomer(email, password);
    if (!res.ok) {
      setError(res.error || 'Inloggningen misslyckades');
      setLoading(false);
      return;
    }
    const admin = await isAdminUser();
    if (admin) {
      navigate('/admin', { replace: true });
      return;
    }
    let customer = await getCustomerForUser();
    if (!customer && supabase) {
      const { error: claimErr } = await supabase.rpc('claim_customer_invite');
      if (!claimErr) {
        customer = await getCustomerForUser();
      } else {
        console.error('auto-claim failed', claimErr);
      }
    }
    if (customer) {
      void initPushNotifications();
      navigate('/kund', { replace: true });
      return;
    }
    await signOutCustomer();
    setError('Detta konto är inte kopplat till någon kund eller anställd. Kontakta oss.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-light flex items-center justify-center px-4 py-8">
      {/* Decorative ambient blobs — keep them subtle */}
      <div className="absolute top-[-10%] left-[-15%] w-80 h-80 rounded-full bg-orange-200/40 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-96 h-96 rounded-full bg-orange-100/60 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white shadow-card mb-4">
            <img src={dogLogo} alt="CleverDog" className="h-12 w-12 object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-dark mb-1">Välkommen tillbaka</h1>
          <p className="text-gray-600 text-sm">Logga in på din CleverDog-portal</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl shadow-pop p-6 space-y-4"
        >
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
              E-post
            </label>
            <div className="relative">
              <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="namn@exempel.se"
                className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base placeholder:text-gray-400 focus:bg-white focus:border-primary transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
              Lösenord
            </label>
            <div className="relative">
              <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base placeholder:text-gray-400 focus:bg-white focus:border-primary transition-colors"
                required
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-800">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full py-3.5 rounded-xl bg-primary text-white font-semibold hover:bg-orange-600 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-card hover:shadow-pop"
          >
            {loading ? 'Loggar in…' : 'Logga in'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-6 flex items-center justify-center gap-1.5">
          <FaPaw className="text-orange-300" />
          <span>Hund­dagis & pensionat i Staffanstorp</span>
        </p>
      </div>
    </div>
  );
}
