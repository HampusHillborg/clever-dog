import { useEffect, useState } from 'react';

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
    <div className="fixed top-4 left-4 right-4 z-[100] space-y-2 pointer-events-none">
      {items.map((t) => (
        <div
          key={t.id}
          className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 pointer-events-auto"
        >
          <p className="font-semibold text-sm">{t.title}</p>
          <p className="text-sm text-gray-700 mt-0.5">{t.body}</p>
        </div>
      ))}
    </div>
  );
}
