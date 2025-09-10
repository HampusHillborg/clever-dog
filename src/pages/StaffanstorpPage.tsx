import React, { useEffect, lazy, Suspense } from 'react';
import '../i18n';  // Import i18n configuration
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
// Direct import for PricingSection to test
import PricingSection from '../components/PricingSection';
// Lazy load other components
const AboutSection = lazy(() => import('../components/AboutSection'));
const SocialWalksSection = lazy(() => import('../components/SocialWalksSection'));
const SustainabilitySection = lazy(() => import('../components/SustainabilitySection'));
const SocialMediaSection = lazy(() => import('../components/SocialMediaSection'));
const GoogleReviewsSection = lazy(() => import('../components/GoogleReviewsSection'));
const ContactSection = lazy(() => import('../components/ContactSection'));
const Footer = lazy(() => import('../components/Footer'));

// Preload hero images - critical for FCP
const preloadHeroImages = () => {
  const sizes = ['small', 'medium', 'large'];
  sizes.forEach(size => {
    const img = new Image();
    img.src = `/src/assets/images/hero/heroweb-${size}.webp`;
    img.fetchPriority = 'high';
  });
};

const StaffanstorpPage: React.FC = () => {
  // Preload hero images immediately
  useEffect(() => {
    preloadHeroImages();
  }, []);

  // Add effect to handle anchor links smooth scrolling
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A' && target.getAttribute('href')?.startsWith('#')) {
        e.preventDefault();
        const id = target.getAttribute('href')?.substring(1);
        if (id) {
          const element = document.getElementById(id);
          if (element) {
            window.scrollTo({
              top: element.offsetTop - 80, // Adjust for navbar height
              behavior: 'smooth',
            });
          }
        }
      }
    };

    document.addEventListener('click', handleAnchorClick);
    return () => document.removeEventListener('click', handleAnchorClick);
  }, []);

  return (
    <>
      <Navbar location="staffanstorp" />
      <main>
        <HeroSection location="staffanstorp" />
        {/* PricingSection direct - no lazy loading */}
        <PricingSection location="staffanstorp" />
        
        <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>
          <AboutSection location="staffanstorp" />
          <SocialWalksSection location="staffanstorp" />
          <SustainabilitySection />
          <SocialMediaSection />
          <GoogleReviewsSection />
          <ContactSection location="staffanstorp" />
        </Suspense>
      </main>
      <Suspense fallback={<div className="h-16">Loading...</div>}>
        <Footer />
      </Suspense>
    </>
  );
};

export default StaffanstorpPage;
