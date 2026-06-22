import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaTimes } from 'react-icons/fa';

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  // När true: stänger inte vid klick utanför (för formulär med osparad data)
  blockBackdropClose?: boolean;
};

// Hur långt man måste dra ner innan släpp stänger arket.
const DISMISS_PX = 90;

export default function Sheet({ open, onClose, title, children, blockBackdropClose }: SheetProps) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef<number | null>(null);

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

  // Nollställ drag-läget varje gång arket öppnas.
  useEffect(() => {
    if (open) { setDragY(0); setDragging(false); startYRef.current = null; }
  }, [open]);

  if (!open) return null;

  // Drag-att-stänga: greppzonen är drag-handtaget + titelraden. Vi rör inte
  // innehållets scroll — bara den övre "streck"-ytan som ser dragbar ut.
  const onTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0]!.clientY;
    setDragging(true);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startYRef.current === null) return;
    const dy = e.touches[0]!.clientY - startYRef.current;
    setDragY(Math.max(0, dy));
  };
  const onTouchEnd = () => {
    // Formulär med osparad data (blockBackdropClose) stängs inte av drag —
    // arket studsar tillbaka istället så inget oavsiktligt tappas bort.
    const shouldClose = dragY > DISMISS_PX && !blockBackdropClose;
    setDragging(false);
    startYRef.current = null;
    if (shouldClose) onClose();
    else setDragY(0);
  };

  const dragBind = {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel: onTouchEnd,
  };

  // Portala till body så `position: fixed` escapar parent stacking contexts
  // (t.ex. sticky header med backdrop-blur som annars fångar fixed-barn och
  // klipper dem till headerns box istället för viewporten).
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={blockBackdropClose ? undefined : onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg sm:w-[92%] rounded-t-3xl sm:rounded-3xl shadow-pop max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragging ? 'none' : 'transform 0.25s ease',
        }}
      >
        {/* Drag-handle (mobil) — dra ner för att stänga. */}
        <div
          className="sm:hidden flex justify-center pt-2.5 pb-1.5 cursor-grab active:cursor-grabbing touch-none"
          {...dragBind}
        >
          <div className="w-10 h-1.5 rounded-full bg-gray-300" />
        </div>

        {title && (
          <div
            className="flex items-center justify-between px-5 py-3 border-b border-gray-100 sm:cursor-default touch-none"
            {...dragBind}
          >
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

        {/* min-h-0 krävs för att flex-barnet ska kunna krympa och scrolla
            inuti den höjdbegränsade (max-h) föräldern — annars klipps innehåll
            och kalendern går inte att scrolla. */}
        <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
