import type { Dog } from '../../lib/customerApi';

export default function DogPills({ dogs, activeId, onPick }: {
  dogs: Dog[];
  activeId: string;
  onPick: (dog: Dog) => void;
}) {
  if (dogs.length <= 1) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 pb-2">
      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-none">
        {dogs.map(d => {
          const active = d.id === activeId;
          return (
            <button
              key={d.id}
              onClick={() => onPick(d)}
              className={`flex items-center gap-2 pl-1 pr-3 py-1 rounded-full shrink-0 transition-all active:scale-95 ${
                active
                  ? 'bg-orange-100 text-orange-800 ring-1 ring-orange-300 shadow-sm'
                  : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50'
              }`}
            >
              <span
                className={`w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold shrink-0 ${
                  active ? 'bg-orange-200 text-orange-800' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {d.photo_url
                  ? <img src={d.photo_url} alt="" className="w-full h-full object-cover" />
                  : d.name?.[0]?.toUpperCase()}
              </span>
              <span className="text-sm font-semibold truncate max-w-[120px]">{d.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
