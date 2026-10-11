import { useEffect, type ReactNode } from 'react';

export default function PrerenderReady({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.getElementById('root')?.removeAttribute('data-prerendered');
  }, []);
  return children;
}
