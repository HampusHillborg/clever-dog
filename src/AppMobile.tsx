import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, BrowserRouter, Navigate, useNavigate } from 'react-router-dom';
import './i18n';
import ProtectedCustomerRoute from './components/customer/ProtectedCustomerRoute';
import MobileAuthGate from './components/MobileAuthGate';
import { isAdminUser } from './lib/customerAuth';
import { supabase } from './lib/supabase';
import { initDeepLinks } from './lib/deepLinks';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const AcceptInvitePage = lazy(() => import('./pages/AcceptInvitePage'));
const CustomerDashboardPage = lazy(() => import('./pages/CustomerDashboardPage'));
const CustomerDogPage = lazy(() => import('./pages/CustomerDogPage'));

const Loading = () => (
  <div className="h-screen flex items-center justify-center">Laddar…</div>
);

function DeepLinkBridge() {
  const navigate = useNavigate();
  useEffect(() => { initDeepLinks(navigate); }, [navigate]);
  return null;
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'loading' | 'admin' | 'ok'>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabase) {
        if (!cancelled) setState('ok');
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!cancelled) setState('ok');
        return;
      }
      const admin = await isAdminUser();
      if (!cancelled) setState(admin ? 'admin' : 'ok');
    })();
    return () => { cancelled = true; };
  }, []);

  if (state === 'loading') return <Loading />;
  if (state === 'admin') return <MobileAuthGate />;
  return <>{children}</>;
}

export default function AppMobile() {
  return (
    <div className="min-h-screen bg-light">
      <BrowserRouter>
        <DeepLinkBridge />
        <AdminGuard>
          <Routes>
            <Route path="/" element={<Navigate to="/kund" replace />} />
            <Route
              path="/login"
              element={<Suspense fallback={<Loading />}><LoginPage /></Suspense>}
            />
            <Route
              path="/login/accept-invite"
              element={<Suspense fallback={<Loading />}><AcceptInvitePage /></Suspense>}
            />
            <Route
              path="/kund"
              element={
                <Suspense fallback={<Loading />}>
                  <ProtectedCustomerRoute><CustomerDashboardPage /></ProtectedCustomerRoute>
                </Suspense>
              }
            />
            <Route
              path="/kund/hund/:id"
              element={
                <Suspense fallback={<Loading />}>
                  <ProtectedCustomerRoute><CustomerDogPage /></ProtectedCustomerRoute>
                </Suspense>
              }
            />
            <Route path="*" element={<Navigate to="/kund" replace />} />
          </Routes>
        </AdminGuard>
      </BrowserRouter>
    </div>
  );
}
