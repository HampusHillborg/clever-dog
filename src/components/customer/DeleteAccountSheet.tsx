import { useEffect, useState } from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import { supabase } from '../../lib/supabase';

type Props = {
  /** Called after the account is successfully deleted; parent should sign out + navigate. */
  onDeleted: () => void;
};

export default function DeleteAccountSheet({ onDeleted }: Props) {
  const [email, setEmail] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!cancelled) setEmail(session?.user?.email ?? null);
    })();
    return () => { cancelled = true; };
  }, []);

  const canSubmit = !!email && confirmation.trim().toLowerCase() === email.toLowerCase() && !deleting;

  const handleDelete = async () => {
    if (!supabase || !canSubmit) return;
    setErrorMsg(null);
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setErrorMsg('Du är inte inloggad. Logga in igen och försök på nytt.');
        return;
      }
      const { data, error } = await supabase.functions.invoke('delete-account', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) {
        setErrorMsg(error.message || 'Kunde inte radera kontot. Försök igen.');
        return;
      }
      if (data && typeof data === 'object' && 'error' in data) {
        setErrorMsg((data as { error: string }).error);
        return;
      }
      onDeleted();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Något gick fel. Försök igen.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex gap-3">
        <FaExclamationTriangle className="text-red-600 text-xl shrink-0 mt-0.5" />
        <div className="text-sm text-red-900 space-y-2">
          <p className="font-semibold">Detta går inte att ångra.</p>
          <p>När du raderar ditt konto försvinner permanent:</p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>Din profil (namn, kontaktuppgifter, personnummer)</li>
            <li>Dina meddelanden med personalen</li>
            <li>Hundprofiler där du är ensam ägare</li>
            <li>Bokningar kopplade till hundar du var ensam ägare av</li>
          </ul>
          <p className="pt-1">
            Har hunden flera ägare behålls hundens profil för medägaren.
            Historiska bokningar utan kopplad kund kan sparas av Clever Dog
            för bokförings­krav.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block">
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Skriv din email för att bekräfta
          </span>
          <input
            type="email"
            value={confirmation}
            onChange={e => setConfirmation(e.target.value)}
            placeholder={email ?? 'din@email.se'}
            autoComplete="off"
            spellCheck={false}
            className="mt-1 w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-red-500 outline-none"
          />
        </label>
        {email && (
          <p className="text-xs text-gray-500">
            Inloggad som <span className="font-medium text-gray-700">{email}</span>.
          </p>
        )}
      </div>

      {errorMsg && (
        <div className="rounded-xl px-3 py-2.5 text-sm bg-red-50 text-red-800 border border-red-200">
          {errorMsg}
        </div>
      )}

      <button
        onClick={handleDelete}
        disabled={!canSubmit}
        className="w-full py-3 rounded-xl bg-red-600 text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
      >
        {deleting ? 'Raderar konto…' : 'Radera mitt konto permanent'}
      </button>
    </div>
  );
}
