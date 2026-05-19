import { useEffect, useRef, useState } from 'react';
import { FaCheck, FaSpinner, FaTimes } from 'react-icons/fa';
import { BTN } from '../../lib/uiTokens';

type State = 'idle' | 'saving' | 'saved' | 'error';

export default function SaveButton({
  onSave,
  children,
  disabled,
  className,
}: {
  onSave: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const [state, setState] = useState<State>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handle = async () => {
    if (state !== 'idle' || disabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setState('saving');
    try {
      await onSave();
      setState('saved');
      timerRef.current = setTimeout(() => setState('idle'), 1200);
    } catch (e) {
      console.error('SaveButton onSave failed:', e);
      setState('error');
      timerRef.current = setTimeout(() => setState('idle'), 2000);
    }
  };

  const content = (() => {
    switch (state) {
      case 'saving':
        return <><FaSpinner className="animate-spin" /> Sparar…</>;
      case 'saved':
        return <><FaCheck /> Sparat</>;
      case 'error':
        return <><FaTimes /> Försök igen</>;
      default:
        return children;
    }
  })();

  return (
    <button
      onClick={handle}
      disabled={disabled || state !== 'idle'}
      className={`${BTN.primary} inline-flex items-center justify-center gap-2 ${className ?? ''}`}
    >
      {content}
    </button>
  );
}
