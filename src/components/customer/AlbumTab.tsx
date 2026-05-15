import { useEffect, useState } from 'react';
import { FaImages } from 'react-icons/fa';
import { getDogActivities, type Dog, type DogActivity } from '../../lib/customerApi';

const fmtWhen = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return `Idag ${d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return `Igår ${d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export default function AlbumTab({ dog }: { dog: Dog }) {
  const [items, setItems] = useState<DogActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<DogActivity | null>(null);

  useEffect(() => {
    setLoading(true);
    getDogActivities(dog.id).then(d => {
      setItems(d);
      setLoading(false);
    });
  }, [dog.id]);

  if (loading) return <AlbumSkeleton />;
  if (items.length === 0) return <EmptyAlbum />;

  return (
    <>
      <div className="space-y-4">
        {items.map(item => (
          <article
            key={item.id}
            className="bg-white rounded-2xl shadow-card overflow-hidden"
          >
            {item.photo_url && (
              <button
                onClick={() => setLightbox(item)}
                className="block w-full"
              >
                <img
                  src={item.photo_url}
                  alt=""
                  className="w-full max-h-[60vh] object-cover bg-gray-100"
                  loading="lazy"
                />
              </button>
            )}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 font-semibold text-xs flex items-center justify-center">
                  {(item.posted_by_name ?? 'P')[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">
                    {item.posted_by_name ?? 'Personal'}
                  </p>
                  <p className="text-[11px] text-gray-500">{fmtWhen(item.created_at)}</p>
                </div>
              </div>
              {item.body && (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.body}</p>
              )}
            </div>
          </article>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 bg-dark/90 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox.photo_url ?? ''}
            alt=""
            className="max-w-full max-h-[85vh] rounded-xl shadow-lift object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

function EmptyAlbum() {
  return (
    <div className="bg-white rounded-2xl shadow-card p-8 text-center">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center mb-3">
        <FaImages className="text-2xl" />
      </div>
      <h2 className="font-semibold text-base mb-1">Inga bilder än</h2>
      <p className="text-sm text-gray-500 max-w-xs mx-auto leading-snug">
        Personalen postar bilder och uppdateringar från dagen här när de finns.
      </p>
    </div>
  );
}

function AlbumSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[0, 1].map(i => (
        <div key={i} className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="w-full h-64 bg-gray-100" />
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gray-100" />
              <div className="space-y-1 flex-1">
                <div className="h-3 w-24 bg-gray-100 rounded" />
                <div className="h-2.5 w-16 bg-gray-100 rounded" />
              </div>
            </div>
            <div className="h-4 w-full bg-gray-100 rounded" />
            <div className="h-4 w-3/4 bg-gray-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
