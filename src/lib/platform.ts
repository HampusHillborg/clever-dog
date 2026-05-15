import { Capacitor } from '@capacitor/core';

export const isNativeApp = (): boolean => Capacitor.isNativePlatform();
export const platform = (): 'ios' | 'android' | 'web' =>
  Capacitor.getPlatform() as 'ios' | 'android' | 'web';
export const isAppTarget = (): boolean =>
  import.meta.env.VITE_APP_TARGET === 'app';

// Push must stay off until google-services.json (Android) and
// GoogleService-Info.plist (iOS) are committed. Otherwise the native
// Firebase init throws an IllegalStateException right after the user
// grants notification permission, which kills the Activity.
export const isPushEnabled = (): boolean =>
  import.meta.env.VITE_PUSH_ENABLED === 'true';
