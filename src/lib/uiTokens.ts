// Centrala design-tokens som alla teman drar från.
// Tre knappstilar — använd EXAKT en av dessa per knapp.
// Fyra statusfärger — slå ihop scheduled/extra till "confirmed" så vi inte har
// grön-vs-smaragd-förvirring på mobil.

export const BTN = {
  primary:
    'bg-primary text-white font-semibold py-3 px-5 rounded-xl shadow-card active:scale-[0.98] transition disabled:opacity-50 disabled:active:scale-100',
  secondary:
    'bg-white text-dark border border-gray-200 font-semibold py-3 px-5 rounded-xl active:scale-[0.98] transition disabled:opacity-50',
  ghost:
    'text-primary font-medium py-2 px-3 rounded-lg active:bg-orange-50 transition disabled:opacity-50',
} as const;

export const STATUS = {
  confirmed: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  pending:   { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  warning:   {
    bg: 'bg-red-50',
    text: 'text-red-800',
    dot: 'bg-red-500',
    border: 'border-red-200',
  },
} as const;

export type ButtonKind = keyof typeof BTN;
export type StatusKind = keyof typeof STATUS;
