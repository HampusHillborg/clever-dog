import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { isNativeApp } from './platform';

// All wrappers swallow errors so calling code never has to worry about
// availability (web returns no-op, older iOS / Android may reject).

export const tapLight = () => {
  if (!isNativeApp()) return;
  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
};

export const tapMedium = () => {
  if (!isNativeApp()) return;
  Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
};

export const tapHeavy = () => {
  if (!isNativeApp()) return;
  Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
};

export const notifySuccess = () => {
  if (!isNativeApp()) return;
  Haptics.notification({ type: NotificationType.Success }).catch(() => {});
};

export const notifyWarning = () => {
  if (!isNativeApp()) return;
  Haptics.notification({ type: NotificationType.Warning }).catch(() => {});
};
