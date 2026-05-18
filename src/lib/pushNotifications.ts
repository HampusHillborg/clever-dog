import { PushNotifications, type Token } from '@capacitor/push-notifications';
import { supabase } from './supabase';
import { isNativeApp, isPushEnabled, platform } from './platform';
import { showToast } from '../components/customer/NotificationToast';

let initialized = false;

export const initPushNotifications = async (): Promise<void> => {
  if (!isNativeApp() || !isPushEnabled() || !supabase || initialized) return;
  initialized = true;

  try {
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== 'granted') {
      initialized = false; // allow retry later
      return;
    }

    await PushNotifications.register();
  } catch (e) {
    // FCM not configured (missing google-services.json) or any other
    // native-side failure — log and continue so the app stays usable.
    console.warn('[push] init skipped:', e);
    initialized = false;
    return;
  }

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

  // App foreground: OS won't show a banner, so we surface our own toast.
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    showToast({
      title: notification.title ?? 'CleverDog',
      body: notification.body ?? '',
    });
  });

  // Tap on a notification (banner or notification tray) — route by kind.
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const kind = action.notification.data?.kind;
    const target = kind === 'staff_message' ? '/kund?tab=messages' : '/kund';
    // Hard navigate so even a cold start lands on the right screen.
    window.location.href = target;
  });
};

export const unregisterPushToken = async (): Promise<void> => {
  if (!isNativeApp() || !supabase) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  await supabase.from('device_tokens').delete().eq('user_id', session.user.id);
};
