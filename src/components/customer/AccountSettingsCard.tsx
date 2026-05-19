import { useState } from 'react';
import { FaCog, FaKey, FaInfoCircle } from 'react-icons/fa';
import { supabase } from '../../lib/supabase';

// Embedded at Vite build time so we always know which bundle is on the device.
const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? 'dev';

// Logga-ut-flödet bor i MoreTab — kunden ska inte ha en destruktiv knapp
// gömd i en inställnings-vy som confirm()-blockerar Capacitor WebView.
export default function AccountSettingsCard() {
  const [changing, setChanging] = useState(false);
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const changePassword = async () => {
    setMsg(null);
    if (pw1.length < 8) { setMsg({ kind: 'err', text: 'Lösenord behöver minst 8 tecken.' }); return; }
    if (pw1 !== pw2) { setMsg({ kind: 'err', text: 'Lösenorden matchar inte.' }); return; }
    if (!supabase) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    setSaving(false);
    if (error) {
      setMsg({ kind: 'err', text: error.message });
    } else {
      setMsg({ kind: 'ok', text: 'Lösenord uppdaterat.' });
      setPw1('');
      setPw2('');
      setTimeout(() => setChanging(false), 800);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <FaCog className="text-gray-500 text-sm" />
        <h3 className="font-semibold text-base">Kontoinställningar</h3>
      </div>

      {!changing ? (
        <button
          onClick={() => setChanging(true)}
          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 text-left"
        >
          <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-700 flex items-center justify-center">
            <FaKey className="text-sm" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">Byt lösenord</p>
            <p className="text-xs text-gray-500">Minst 8 tecken</p>
          </div>
        </button>
      ) : (
        <div className="space-y-3 p-3 rounded-xl bg-gray-50">
          <input
            type="password"
            value={pw1}
            onChange={e => setPw1(e.target.value)}
            placeholder="Nytt lösenord"
            autoComplete="new-password"
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:border-primary"
          />
          <input
            type="password"
            value={pw2}
            onChange={e => setPw2(e.target.value)}
            placeholder="Bekräfta nytt lösenord"
            autoComplete="new-password"
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:border-primary"
          />
          {msg && (
            <div className={`rounded-lg px-3 py-2 text-xs ${
              msg.kind === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {msg.text}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => { setChanging(false); setPw1(''); setPw2(''); setMsg(null); }}
              className="flex-1 py-2 rounded-xl text-gray-700 font-medium hover:bg-gray-100 text-sm"
            >
              Avbryt
            </button>
            <button
              onClick={changePassword}
              disabled={saving || !pw1 || !pw2}
              className="flex-1 py-2 rounded-xl bg-primary text-white font-semibold disabled:opacity-50 text-sm"
            >
              {saving ? 'Sparar…' : 'Spara'}
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
        <FaInfoCircle />
        <span>CleverDog v{APP_VERSION}</span>
      </div>
    </div>
  );
}
