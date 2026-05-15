import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    // Self-heal: if there's an invited customer row matching this email but
    // auth_user_id was never linked (e.g. UI hung mid-accept), claim it now.
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
    // No admin row, no customer row — refuse and sign out so the orphan
    // auth.users row can't be used to sneak into admin.
    await signOutCustomer();
    setError('Detta konto är inte kopplat till någon kund eller anställd. Kontakta oss.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-light px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <img src={dogLogo} alt="CleverDog" className="h-16 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-center mb-1">Logga in</h1>
        <p className="text-center text-gray-500 mb-6 text-sm">Kundportal</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium">E-post</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border-gray-300 focus:ring-primary"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Lösenord</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border-gray-300 focus:ring-primary"
              required
            />
          </label>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary text-white py-2.5 font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Loggar in…' : 'Logga in'}
          </button>
        </form>
      </div>
    </div>
  );
}
