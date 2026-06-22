// Delade valideringshjälpare för telefon och e-post.

// Tecken vi tillåter i ett telefonnummer: siffror, mellanslag, +, -, ( ).
const PHONE_ALLOWED = /[0-9+\-()\s]/g;

// Rensa bort allt som inte är tillåtet i ett telefonnummer (t.ex. bokstäver).
// Används on-change så att fältet aldrig kan innehålla bokstäver.
export const sanitizePhoneInput = (value: string): string =>
  (value.match(PHONE_ALLOWED) ?? []).join('');

// Ett giltigt nummer har minst 6 siffror (utöver ev. +, mellanslag, bindestreck).
export const isValidPhone = (value: string): boolean => {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 6 && digits.length <= 15;
};

// Enkel men robust e-postvalidering. Tom sträng räknas inte som giltig.
export const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

// Returnerar ett felmeddelande (sv) eller null om värdet är giltigt/tomt.
// Tomt värde tillåts — obligatoriskhet hanteras separat.
export const phoneError = (value: string): string | null => {
  const v = value.trim();
  if (!v) return null;
  if (!isValidPhone(v)) return 'Ange ett giltigt telefonnummer (endast siffror).';
  return null;
};

export const emailError = (value: string): string | null => {
  const v = value.trim();
  if (!v) return null;
  if (!isValidEmail(v)) return 'Ange en giltig e-postadress.';
  return null;
};
