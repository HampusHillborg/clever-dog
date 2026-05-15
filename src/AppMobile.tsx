import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, BrowserRouter, Navigate, useNavigate } from 'react-router-dom';
import './i18n';
import ProtectedCustomerRoute from './components/customer/ProtectedCustomerRoute';
import { isAdminUser } from './lib/customerAuth';
import { supabase } from './lib/supabase';
import { initDeepLinks } from './lib/deepLinks';
import { initPushNotifications } from './lib/pushNotifications';
import NotificationToast from './components/customer/NotificationToast';
import { isNativeApp } from './lib/platform';
import { StatusBar, Style } from '@capacitor/status-bar';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const AcceptInvitePage = lazy(() => import('./pages/AcceptInvitePage'));
const CustomerDashboardPage = lazy(() => import('./pages/CustomerDashboardPage'));
const CustomerDogPage = lazy(() => import('./pages/CustomerDogPage'));
const AdminMobilePage = lazy(() => import('./pages/AdminMobilePage'));

const Loading = () => (
  <div className="h-screen flex items-center justify-center">Laddar…</div>
);

function DeepLinkBridge() {
  const navigate = useNavigate();
  useEffect(() => { initDeepLinks(navigate); }, [navigate]);
  return null;
}

// Boot-time auth side-effects: kick off push registration for authenticated
// customers so they get notified without having to re-login.
function BootEffects() {
  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const admin = await isAdminUser();
      if (!admin) void initPushNotifications();
    })();
  }, []);
  return null;
}

export default function AppMobile() {
  useEffect(() => {
    if (!isNativeApp()) return;
    // Dark icons/text on the cream background.
    StatusBar.setStyle({ style: Style.Light }).catch(() => {});
    StatusBar.setBackgroundColor({ color: '#fcf5ee' }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-light">
      <NotificationToast />
      <BrowserRouter>
        <DeepLinkBridge />
        <BootEffects />
        <Routes>
          <Route path="/" element={<Navigate to="/kund" replace />} />
          <Route
            path="/admin"
            element={<Suspense fallback={<Loading />}><AdminMobilePage /></Suspense>}
          />
          <Route
            path="/admin/*"
            element={<Suspense fallback={<Loading />}><AdminMobilePage /></Suspense>}
          />
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
      </BrowserRouter>
    </div>
  );
}
