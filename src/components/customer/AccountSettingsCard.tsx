import { useState } from 'react';
import { FaInfoCircle } from 'react-icons/fa';
import { supabase } from '../../lib/supabase';

// Embedded at Vite build time so we always know which bundle is on the device.
const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? 'dev';

// Lösenord-byte-formulär. Render:as utan eget kort-wrapper eftersom
// kallsidan (MoreTab) wrapper:ar i en Sheet med egen titel.
export default function AccountSettingsCard() {
  const [pwCurrent, setPwCurrent] = useState('');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const changePassword = async () => {
    setMsg(null);
    if (!pwCurrent) { setMsg({ kind: 'err', text: 'Fyll i ditt nuvarande lösenord.' }); return; }
    if (pw1.length < 8) { setMsg({ kind: 'err', text: 'Nytt lösenord behöver minst 8 tecken.' }); return; }
    if (pw1 !== pw2) { setMsg({ kind: 'err', text: 'Lösenorden matchar inte.' }); return; }
    if (pw1 === pwCurrent) { setMsg({ kind: 'err', text: 'Nytt lösenord får inte vara samma som det nuvarande.' }); return; }
    if (!supabase) return;
    setSaving(true);

    // Verifiera nuvarande lösenord genom att logga in på nytt. Supabase saknar
    // ett separat "verify password"-API, så re-auth är det säkra sättet.
    const { data: { user } } = await supabase.auth.getUser();
    const email = user?.email;
    if (!email) {
      setSaving(false);
      setMsg({ kind: 'err', text: 'Kunde inte verifiera kontot. Logga in igen.' });
      return;
    }
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: pwCurrent });
    if (signInErr) {
      setSaving(false);
      setMsg({ kind: 'err', text: 'Nuvarande lösenord stämmer inte.' });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: pw1 });
    setSaving(false);
    if (error) {
      setMsg({ kind: 'err', text: error.message });
    } else {
      setMsg({ kind: 'ok', text: 'Lösenord uppdaterat.' });
      setPwCurrent('');
      setPw1('');
      setPw2('');
    }
  };

  return (
    <div className="p-4">
      <div className="space-y-3">
        <label className="block">
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Nuvarande lösenord</span>
          <input
            type="password"
            value={pwCurrent}
            onChange={e => setPwCurrent(e.target.value)}
            placeholder="Ditt nuvarande lösenord"
            autoComplete="current-password"
            className="mt-1 w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-primary outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Nytt lösenord</span>
          <input
            type="password"
            value={pw1}
            onChange={e => setPw1(e.target.value)}
            placeholder="Minst 8 tecken"
            autoComplete="new-password"
            className="mt-1 w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-primary outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Bekräfta lösenord</span>
          <input
            type="password"
            value={pw2}
            onChange={e => setPw2(e.target.value)}
            placeholder="Skriv samma igen"
            autoComplete="new-password"
            className="mt-1 w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-primary outline-none"
          />
        </label>
        {msg && (
          <div className={`rounded-xl px-3 py-2.5 text-sm ${
            msg.kind === 'ok'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {msg.text}
          </div>
        )}
        <button
          onClick={changePassword}
          disabled={saving || !pwCurrent || !pw1 || !pw2}
          className="w-full py-3 rounded-xl bg-primary text-white font-semibold disabled:opacity-50 active:scale-[0.98] transition-all"
        >
          {saving ? 'Sparar…' : 'Spara nytt lösenord'}
        </button>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
        <FaInfoCircle />
        <span>CleverDog v{APP_VERSION}</span>
      </div>
    </div>
  );
}
