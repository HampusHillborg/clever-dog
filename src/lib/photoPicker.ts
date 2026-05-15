import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { isNativeApp } from './platform';

export type PickedPhoto = { file: File };

// Unified picker. On native it shows the OS action sheet (Camera / Photo
// Library). On web it falls back to a programmatic <input type=file>.
export async function pickPhoto(): Promise<PickedPhoto | null> {
  if (isNativeApp()) {
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Prompt,
    });
    if (!photo.webPath) return null;
    const res = await fetch(photo.webPath);
    const blob = await res.blob();
    const ext = photo.format ?? 'jpg';
    const file = new File([blob], `photo-${Date.now()}.${ext}`, {
      type: blob.type || `image/${ext}`,
    });
    return { file };
  }

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = () => {
      const f = input.files?.[0];
      resolve(f ? { file: f } : null);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
