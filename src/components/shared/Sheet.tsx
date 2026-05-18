import { useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  // När true: stänger inte vid klick utanför (för formulär med osparad data)
  blockBackdropClose?: boolean;
};

export default function Sheet({ open, onClose, title, children, blockBackdropClose }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={blockBackdropClose ? undefined : onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg sm:w-[92%] rounded-t-3xl sm:rounded-3xl shadow-pop max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag-handle (mobil) — visuell hint, inte interaktiv */}
        <div className="sm:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {title && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-lg">{title}</h2>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full hover:bg-gray-100 text-gray-500 flex items-center justify-center"
              aria-label="Stäng"
            >
              <FaTimes className="text-sm" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
