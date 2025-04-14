import { useEffect, lazy, Suspense } from 'react'
import './i18n'  // Import i18n configuration
import Navbar from './components/Navbar'
import HeroSection from './components/HeroSection'
import InfoSection from './components/InfoSection'  // Import the InfoSection component
// Lazy load components not needed for initial render
const AboutSection = lazy(() => import('./components/AboutSection'))
const SocialWalksSection = lazy(() => import('./components/SocialWalksSection'))
const PricingSection = lazy(() => import('./components/PricingSection'))
const SustainabilitySection = lazy(() => import('./components/SustainabilitySection'))
const SocialMediaSection = lazy(() => import('./components/SocialMediaSection'))
const GoogleReviewsSection = lazy(() => import('./components/GoogleReviewsSection'))
const ContactSection = lazy(() => import('./components/ContactSection'))
const Footer = lazy(() => import('./components/Footer'))
import { BookingProvider } from './components/BookingContext'
import './App.css'

// Preload hero images - critical for FCP
const preloadHeroImages = () => {
  const sizes = ['small', 'medium', 'large'];
  sizes.forEach(size => {
    const img = new Image();
    img.src = `/src/assets/images/hero/heroweb-${size}.webp`;
    img.fetchPriority = 'high';
  });
};

function App() {
  // Preload hero images immediately
  useEffect(() => {
    preloadHeroImages();
  }, []);

  // Add effect to handle anchor links smooth scrolling
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'A' && target.getAttribute('href')?.startsWith('#')) {
        e.preventDefault()
        const id = target.getAttribute('href')?.substring(1)
        if (id) {
          const element = document.getElementById(id)
          if (element) {
            window.scrollTo({
              top: element.offsetTop - 80, // Adjust for navbar height
              behavior: 'smooth',
            })
          }
        }
      }
    }

    document.addEventListener('click', handleAnchorClick)
    return () => document.removeEventListener('click', handleAnchorClick)
  }, [])

  return (
    <BookingProvider>
      <div className="min-h-screen bg-light">
        <Navbar />
        <InfoSection />  {/* Add the InfoSection component */}
        <main>
          <HeroSection />
          <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>
            <AboutSection />
            <SocialWalksSection />
            <PricingSection />
            <SustainabilitySection />
            <SocialMediaSection />
            <GoogleReviewsSection />
            <ContactSection />
          </Suspense>
        </main>
        <Suspense fallback={<div className="h-16">Loading...</div>}>
          <Footer />
        </Suspense>
      </div>
    </BookingProvider>
  )
}

export default App
