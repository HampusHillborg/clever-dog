/**
 * Helpers för chat-rendering: datum-stickers och read-receipt-logik.
 */

/** Formaterar ett ISO-datum som HH:MM (sv-SE, lokal tid). */
export const fmtHm = (iso: string): string =>
  new Date(iso).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });

/**
 * Returnerar en human-läsbar etikett för det datum som ISO-strängen tillhör.
 * Används för datum-stickers i chat-listan.
 *
 * Idag       → "Idag"
 * Igår       → "Igår"
 * Samma år   → "måndag 12 maj"
 * Äldre      → "11 maj 2026"
 */
export const dayLabel = (iso: string): string => {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (dayStart.getTime() === today.getTime()) return 'Idag';
  if (dayStart.getTime() === yesterday.getTime()) return 'Igår';

  // Inom samma kalenderår
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' });
};

/**
 * Returnerar true om meddelandet på `index` är det SISTA meddelandet i en
 * sammanhängande svit från `ownRole`.
 *
 * "Sammanhängande svit" = på rad från samma avsändar-roll, utan att
 * motparten skrivit däremellan. Vi visar receipt bara under det sista
 * meddelandet i sviten för att undvika visuellt brus.
 *
 * @param messages  Meddelandelistan i kronologisk ordning (äldst → nyast).
 * @param index     Positionen för meddelandet vi frågar om.
 * @param ownRole   Den roll vars meddelanden vi spårar ('customer' | 'staff').
 */
export const isLastOwnInSequence = (
  messages: Array<{ sender_role: string }>,
  index: number,
  ownRole: string,
): boolean => {
  if (messages[index].sender_role !== ownRole) return false;
  const next = messages[index + 1];
  // Sista i listan, eller nästa är från motparten
  return !next || next.sender_role !== ownRole;
};
