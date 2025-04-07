import { useEffect } from 'react'
import './i18n'  // Import i18n configuration
import Navbar from './components/Navbar'
import HeroSection from './components/HeroSection'
import AboutSection from './components/AboutSection'
import SocialWalksSection from './components/SocialWalksSection'
import PricingSection from './components/PricingSection'
import SustainabilitySection from './components/SustainabilitySection'
import SocialMediaSection from './components/SocialMediaSection'
import ContactSection from './components/ContactSection'
import Footer from './components/Footer'
import { BookingProvider } from './components/BookingContext'
import './App.css'

function App() {
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
        <main>
          <HeroSection />
          <AboutSection />
          <SocialWalksSection />
          <PricingSection />
          <SustainabilitySection />
          <SocialMediaSection />
          <ContactSection />
        </main>
        <Footer />
      </div>
    </BookingProvider>
  )
}

export default App
