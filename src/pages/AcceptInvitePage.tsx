import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import dogLogo from '../assets/images/logos/Logo.png';

export default function AcceptInvitePage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      setHasToken(!!session);
      if (!session) {
        setError('Ogiltig eller utgången inbjudningslänk. Kontakta oss för en ny.');
      }
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

    const { error: linkErr } = await supabase
      .from('customers')
      .update({
        auth_user_id: data.user.id,
        invite_status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('email', data.user.email ?? '');
    if (linkErr) {
      setError(`Konto skapat men koppling misslyckades: ${linkErr.message}`);
      setLoading(false);
      return;
    }

    navigate('/kund', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-light px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <img src={dogLogo} alt="CleverDog" className="h-16 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-center mb-1">Välkommen!</h1>
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
