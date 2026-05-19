import type { Dog } from '../../lib/customerApi';

// Diskret tab-bar-stil istället för fyllda pills. Aktiv hund får
// orange text + underline; inaktiv är muted grå. Inget avatar-i-pill
// (för mycket visuellt brus), inga ringar/skuggor. Renderar inget
// alls om kunden bara har en hund.
export default function DogPills({ dogs, activeId, onPick }: {
  dogs: Dog[];
  activeId: string;
  onPick: (dog: Dog) => void;
}) {
  if (dogs.length <= 1) return null;

  return (
    <div className="max-w-3xl mx-auto px-4">
      <div className="flex gap-5 overflow-x-auto -mx-1 px-1 scrollbar-none">
        {dogs.map(d => {
          const active = d.id === activeId;
          return (
            <button
              key={d.id}
              onClick={() => onPick(d)}
              className={`shrink-0 py-2 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                active
                  ? 'text-primary border-primary'
                  : 'text-gray-400 border-transparent hover:text-gray-700'
              }`}
            >
              {d.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
