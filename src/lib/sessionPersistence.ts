import { Preferences } from '@capacitor/preferences';
import { isNativeApp } from './platform';

// A Supabase-compatible storage adapter. On native, the auth session lives
// in Capacitor Preferences (Android SharedPreferences / iOS UserDefaults) so
// it survives app restarts and webview clears. On web, falls back to
// localStorage unchanged.
export const capacitorStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (!isNativeApp()) return localStorage.getItem(key);
    const { value } = await Preferences.get({ key });
    return value ?? null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (!isNativeApp()) { localStorage.setItem(key, value); return; }
    await Preferences.set({ key, value });
  },
  removeItem: async (key: string): Promise<void> => {
    if (!isNativeApp()) { localStorage.removeItem(key); return; }
    await Preferences.remove({ key });
  },
};
