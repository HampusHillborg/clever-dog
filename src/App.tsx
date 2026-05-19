import { lazy, Suspense } from 'react'
import { Routes, Route, BrowserRouter } from 'react-router-dom'
import './i18n'  // Import i18n configuration
import ProtectedCustomerRoute from './components/customer/ProtectedCustomerRoute'
// Lazy load components
const StaffanstorpPage = lazy(() => import('./pages/StaffanstorpPage'))
const AdminPage = lazy(() => import('./components/AdminPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const AcceptInvitePage = lazy(() => import('./pages/AcceptInvitePage'))
const CustomerDashboardPage = lazy(() => import('./pages/CustomerDashboardPage'))
const CustomerDogPage = lazy(() => import('./pages/CustomerDogPage'))
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'))
import { BookingProvider } from './components/BookingContext'
import './App.css'

const Loading = () => <div className="h-screen flex items-center justify-center">Loading...</div>

function App() {
  return (
    <BookingProvider>
      <div className="min-h-screen bg-light">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={
              <Suspense fallback={<Loading />}><StaffanstorpPage /></Suspense>
            } />
            <Route path="/staffanstorp" element={
              <Suspense fallback={<Loading />}><StaffanstorpPage /></Suspense>
            } />
            <Route path="/admin" element={
              <Suspense fallback={<Loading />}><AdminPage /></Suspense>
            } />
            <Route path="/login" element={
              <Suspense fallback={<Loading />}><LoginPage /></Suspense>
            } />
            <Route path="/login/accept-invite" element={
              <Suspense fallback={<Loading />}><AcceptInvitePage /></Suspense>
            } />
            <Route path="/kund" element={
              <Suspense fallback={<Loading />}>
                <ProtectedCustomerRoute><CustomerDashboardPage /></ProtectedCustomerRoute>
              </Suspense>
            } />
            <Route path="/kund/hund/:id" element={
              <Suspense fallback={<Loading />}>
                <ProtectedCustomerRoute><CustomerDogPage /></ProtectedCustomerRoute>
              </Suspense>
            } />
            <Route path="/privacy" element={
              <Suspense fallback={<Loading />}><PrivacyPolicyPage /></Suspense>
            } />
            <Route path="/integritetspolicy" element={
              <Suspense fallback={<Loading />}><PrivacyPolicyPage /></Suspense>
            } />
          </Routes>
        </BrowserRouter>
      </div>
    </BookingProvider>
  )
}

export default App
