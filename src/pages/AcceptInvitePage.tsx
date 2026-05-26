import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import dogLogo from '../assets/images/logos/Logo.png';

export default function AcceptInvitePage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    // Initial check — Supabase may not have parsed the hash yet on first paint.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) setHasToken(true);
    });

    // The hash → session conversion fires SIGNED_IN async, so listen for it.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session) setHasToken(true);
    });

    // After 2s of nothing, assume the link is bad and show an error so the
    // user isn't stuck with greyed-out fields forever.
    const timeout = setTimeout(() => {
      if (cancelled) return;
      setHasToken((current) => {
        if (!current) {
          setError('Ogiltig eller utgången inbjudningslänk. Kontakta oss för en ny.');
        }
        return current;
      });
    }, 2000);

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (password.length < 8) return setError('Lösenord måste vara minst 8 tecken');
    if (password !== confirm) return setError('Lösenorden matchar inte');
    if (!supabase) return setError('Supabase ej konfigurerad');

    setLoading(true);

    const { data: pwData, error: pwErr } = await supabase.auth.updateUser({ password });
    if (pwErr || !pwData.user) {
      setError(pwErr?.message ?? 'Kunde inte sätta lösenord');
      setLoading(false);
      return;
    }

    setInfo('Lösenord sparat — kopplar konto…');

    // Try the customer claim first. It's the cheapest "is this a customer
    // invite?" probe — succeeds when a customers row with this email exists,
    // raises a known exception otherwise. No need to trust user_metadata.
    const { error: claimErr } = await supabase.rpc('claim_customer_invite');

    if (!claimErr) {
      window.location.assign('/kund');
      return;
    }

    // Not a customer — see if this user is a staff member.
    const { data: adminRow } = await supabase
      .from('admin_users').select('id').eq('id', pwData.user.id).maybeSingle();

    if (adminRow) {
      window.location.assign('/admin');
      return;
    }

    // Neither customer nor staff — bail out clearly instead of looping.
    console.error('accept-invite: no role match', claimErr);
    setError(
      'Ditt lösenord är sparat men inget konto matchade din inbjudan. '
      + 'Kontakta supporten så hjälper vi dig logga in.'
    );
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-white px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 sm:p-10">
        <img src={dogLogo} alt="Clever Dog" className="h-16 mx-auto mb-6" />

        <h1 className="text-2xl font-bold text-center text-gray-900 mb-1">Välkommen!</h1>
        <p className="text-center text-gray-500 mb-8 text-sm">
          Välj ett lösenord för ditt konto. Minst 8 tecken.
        </p>

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
            />
          </div>

          {info && (
            <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 p-3 rounded-lg">{info}</p>
          )}
          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !hasToken}
            className="w-full rounded-lg bg-primary text-white py-3 font-semibold text-base hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
          >
            {loading ? 'Skapar konto…' : 'Skapa konto'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Du loggar in automatiskt när du har sparat ditt lösenord.
        </p>
      </div>
    </div>
  );
}
