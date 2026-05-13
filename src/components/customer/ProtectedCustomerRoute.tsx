import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { getCustomerForUser, isAdminUser, type Customer } from '../../lib/customerAuth';

type Props = { children: ReactNode };

type State =
  | { kind: 'loading' }
  | { kind: 'customer'; customer: Customer }
  | { kind: 'admin' }
  | { kind: 'anonymous' };

export default function ProtectedCustomerRoute({ children }: Props) {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const customer = await getCustomerForUser();
      if (cancelled) return;
      if (customer) {
        setState({ kind: 'customer', customer });
        return;
      }
      const admin = await isAdminUser();
      if (cancelled) return;
      setState(admin ? { kind: 'admin' } : { kind: 'anonymous' });
    })();
    return () => { cancelled = true; };
  }, []);

  if (state.kind === 'loading') {
    return <div className="h-screen flex items-center justify-center">Laddar…</div>;
  }
  if (state.kind === 'admin') return <Navigate to="/admin" replace />;
  if (state.kind === 'anonymous') return <Navigate to="/login" replace />;

  return <>{children}</>;
}
