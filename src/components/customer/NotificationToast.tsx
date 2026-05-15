import { useEffect, useState } from 'react';
import { FaBell } from 'react-icons/fa';

export type ToastPayload = { title: string; body: string };

// Module-level dispatcher updated by the mounted component. Lets non-React
// code (push listeners) trigger a toast without prop-drilling.
let pushToast: (p: ToastPayload) => void = () => {};
export const showToast = (p: ToastPayload) => pushToast(p);

export default function NotificationToast() {
  const [items, setItems] = useState<(ToastPayload & { id: number })[]>([]);

  useEffect(() => {
    pushToast = (p) => {
      const id = Date.now() + Math.random();
      setItems((cur) => [...cur, { ...p, id }]);
      setTimeout(() => {
        setItems((cur) => cur.filter((x) => x.id !== id));
      }, 5000);
    };
    return () => { pushToast = () => {}; };
  }, []);

  return (
    <div
      className="fixed top-4 left-4 right-4 z-[100] space-y-2 pointer-events-none max-w-md mx-auto"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {items.map((t) => (
        <div
          key={t.id}
          className="bg-white border border-gray-200/80 rounded-2xl shadow-pop p-3.5 pointer-events-auto flex items-start gap-3 animate-slide-in-top"
        >
          <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
            <FaBell className="text-sm" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight truncate">{t.title}</p>
            {t.body && <p className="text-sm text-gray-600 mt-0.5 leading-snug">{t.body}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
