import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import dogLogo from '../assets/images/logos/Logo.png';

type AccountType = 'staff' | 'customer';

export default function AcceptInvitePage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>('customer');

  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setHasToken(false);
        setError('Ogiltig eller utgången inbjudningslänk. Kontakta oss för en ny.');
        return;
      }

      // 1. Trust the metadata set at invite time when present.
      const meta = session.user.user_metadata as { account_type?: string } | null;
      if (meta?.account_type === 'staff') {
        setAccountType('staff');
        setHasToken(true);
        return;
      }
      if (meta?.account_type === 'customer') {
        setAccountType('customer');
        setHasToken(true);
        return;
      }

      // 2. No metadata — figure it out from the actual DB rows.
      //    A customers row matching the session email proves this is a
      //    customer invite, regardless of whether the on-signup trigger
      //    happened to create an admin_users row.
      const email = session.user.email ?? '';
      const { data: customerRow } = await supabase
        .from('customers').select('id').eq('email', email).maybeSingle();

      if (customerRow) {
        setAccountType('customer');
        setHasToken(true);
        return;
      }

      // 3. No customer row but the session belongs to an admin — likely the
      //    admin clicked the invite link while still signed in. Tell them
      //    instead of silently overwriting their admin password.
      const { data: adminRow } = await supabase
        .from('admin_users').select('id').eq('id', session.user.id).maybeSingle();
      if (adminRow) {
        setHasToken(false);
        setWarning(
          'Du är inloggad som admin. Logga ut och öppna inbjudningslänken igen '
          + 'i ett privat fönster, så att inte din admin-session krockar med kundens.'
        );
        return;
      }

      // 4. Fallback — treat as customer.
      setAccountType('customer');
      setHasToken(true);
    })();
  }, []);

  const signOutAndReload = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.assign('/login');
  };

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
      window.location.assign('/admin');
      return;
    }

    const { error: claimErr } = await supabase.rpc('claim_customer_invite');
    if (claimErr) {
      console.error('claim_customer_invite failed', claimErr);
      setError(`Konto skapat men koppling misslyckades: ${claimErr.message}`);
      setLoading(false);
      return;
    }

    window.location.assign('/kund');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-white px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 sm:p-10">
        <img src={dogLogo} alt="Clever Dog" className="h-16 mx-auto mb-6" />

        <h1 className="text-2xl font-bold text-center text-gray-900 mb-1">
          {accountType === 'staff' ? 'Välkommen till personalen!' : 'Välkommen!'}
        </h1>
        <p className="text-center text-gray-500 mb-8 text-sm">
          Välj ett lösenord för ditt konto. Minst 8 tecken.
        </p>

        {warning && (
          <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
            <p className="font-semibold mb-2">Inloggad som admin</p>
            <p className="mb-3">{warning}</p>
            <button
              onClick={signOutAndReload}
              className="w-full rounded-lg bg-amber-600 text-white py-2.5 font-semibold hover:bg-amber-700 transition"
            >
              Logga ut admin
            </button>
          </div>
        )}

        {!warning && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="pw" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Lösenord
              </label>
              <input
                id="pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                required
                minLength={8}
                autoFocus
                disabled={!hasToken}
              />
            </div>

            <div>
              <label htmlFor="pw2" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Bekräfta lösenord
              </label>
              <input
                id="pw2"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                required
                minLength={8}
                disabled={!hasToken}
              />
            </div>

            {error && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !hasToken}
              className="w-full rounded-lg bg-primary text-white py-3 font-semibold text-base hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
            >
              {loading ? 'Sparar…' : 'Skapa konto'}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          Du loggar in automatiskt när du har sparat ditt lösenord.
        </p>
      </div>
    </div>
  );
}
