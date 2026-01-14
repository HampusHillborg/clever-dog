import { lazy, Suspense } from 'react'
import { Routes, Route, BrowserRouter } from 'react-router-dom'
import './i18n'  // Import i18n configuration
// Lazy load components
const LocationSelector = lazy(() => import('./components/LocationSelector'))
const StaffanstorpPage = lazy(() => import('./pages/StaffanstorpPage'))
const MalmoPage = lazy(() => import('./pages/MalmoPage'))
const AdminPage = lazy(() => import('./components/AdminPage'))
import { BookingProvider } from './components/BookingContext'
import './App.css'

function App() {
  return (
    <BookingProvider>
      <div className="min-h-screen bg-light">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={
              <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>
                <LocationSelector />
              </Suspense>
            } />
            <Route path="/staffanstorp" element={
              <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>
                <StaffanstorpPage />
              </Suspense>
            } />
            {/* Malmö route removed - page is hidden due to municipality rejection */}
            {/* <Route path="/malmo" element={
              <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>
                <MalmoPage />
              </Suspense>
            } /> */}
            <Route path="/admin" element={
              <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>
                <AdminPage />
              </Suspense>
            } />
          </Routes>
        </BrowserRouter>
      </div>
    </BookingProvider>
  )
}

export default App
