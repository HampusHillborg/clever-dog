import { FaStar, FaExternalLinkAlt } from 'react-icons/fa';

// Env var added in Netlify + .env.local. If missing, the card hides.
const PLACE_ID = import.meta.env.VITE_GOOGLE_PLACE_ID as string | undefined;

export default function GoogleReviewCTA() {
  if (!PLACE_ID) return null;
  const url = `https://search.google.com/local/writereview?placeid=${PLACE_ID}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white rounded-2xl shadow-card hover:shadow-pop transition-all active:scale-[0.99] overflow-hidden"
    >
      <div className="p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-300 to-amber-400 flex items-center justify-center shrink-0 shadow-card">
          <FaStar className="text-white text-xl" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
            Trivs ni hos oss?
          </p>
          <p className="font-semibold text-sm leading-tight mt-0.5">
            Lämna en recension på Google
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Det betyder mycket för oss och andra hundägare som letar dagis.
          </p>
        </div>
        <FaExternalLinkAlt className="text-gray-300 text-xs shrink-0" />
      </div>
    </a>
  );
}
