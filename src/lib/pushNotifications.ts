import { PushNotifications, type Token } from '@capacitor/push-notifications';
import { supabase } from './supabase';
import { isNativeApp, platform } from './platform';

let initialized = false;

export const initPushNotifications = async (): Promise<void> => {
  if (!isNativeApp() || !supabase || initialized) return;
  initialized = true;

  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
    perm = await PushNotifications.requestPermissions();
  }
  if (perm.receive !== 'granted') {
    initialized = false; // allow retry later
    return;
  }

  await PushNotifications.register();

  PushNotifications.addListener('registration', async (token: Token) => {
    console.log('[push] token registered');
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await supabase.from('device_tokens').upsert(
      {
        user_id: session.user.id,
        token: token.value,
        platform: platform() === 'ios' ? 'ios' : 'android',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' },
    );
    if (error) console.error('[push] device_tokens upsert failed', error);
  });

  PushNotifications.addListener('registrationError', (err) => {
    console.error('[push] registration error', err);
  });
};

export const unregisterPushToken = async (): Promise<void> => {
  if (!isNativeApp() || !supabase) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  await supabase.from('device_tokens').delete().eq('user_id', session.user.id);
};
