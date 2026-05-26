import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import dogLogo from '../assets/images/logos/Logo.png';

type AccountType = 'staff' | 'customer';

export default function AcceptInvitePage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>('customer');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setHasToken(false);
        setError('Ogiltig eller utgången inbjudningslänk. Kontakta oss för en ny.');
        return;
      }

      // Two ways to know this is a staff invite:
      //   1. user_metadata.account_type === 'staff' (set by create-staff-user)
      //   2. an admin_users row already exists for this user
      const meta = session.user.user_metadata as { account_type?: string } | null;
      const metaIsStaff = meta?.account_type === 'staff';

      const { data: adminRow } = await supabase
        .from('admin_users').select('id').eq('id', session.user.id).maybeSingle();

      if (metaIsStaff || adminRow) {
        setAccountType('staff');
        setHasToken(true);
        return;
      }

      // Otherwise treat as customer invite.
      setAccountType('customer');
      setHasToken(true);
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Lösenord måste vara minst 8 tecken');
    if (password !== confirm) return setError('Lösenorden matchar inte');
    if (!supabase) return setError('Supabase ej konfigurerad');

    setLoading(true);
    const { data, error: pwErr } = await supabase.auth.updateUser({ password });
    if (pwErr || !data.user) {
      setError(pwErr?.message ?? 'Kunde inte sätta lösenord');
      setLoading(false);
      return;
    }

    if (accountType === 'staff') {
      // Staff already exist in admin_users (auto-created by trigger when the
      // invite was sent). Nothing extra to claim. Land them in the admin panel.
      navigate('/admin', { replace: true });
      return;
    }

    const { error: claimErr } = await supabase.rpc('claim_customer_invite');
    if (claimErr) {
      console.error('claim_customer_invite failed', claimErr);
      setError(`Konto skapat men koppling misslyckades: ${claimErr.message}`);
      setLoading(false);
      return;
    }

    navigate('/kund', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-light px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <img src={dogLogo} alt="CleverDog" className="h-16 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-center mb-1">
          {accountType === 'staff' ? 'Välkommen till personalen!' : 'Välkommen!'}
        </h1>
        <p className="text-center text-gray-500 mb-6 text-sm">Sätt ditt lösenord</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Lösenord</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border-gray-300"
              required
              minLength={8}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Bekräfta lösenord</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full rounded-lg border-gray-300"
              required
              minLength={8}
            />
          </label>
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
          <button
            type="submit"
            disabled={loading || !hasToken}
            className="w-full rounded-lg bg-primary text-white py-2.5 font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Sparar…' : 'Skapa konto'}
          </button>
        </form>
      </div>
    </div>
  );
}
