import React, { useEffect, useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { useBooking } from './BookingContext';
import TrustBanner from './TrustBanner';

// Import the hero images in different sizes
import heroBackgroundLarge from '../assets/images/hero/heroweb-large.webp';
// Import smaller versions - assuming these files exist or will be created
import heroBackgroundMedium from '../assets/images/hero/heroweb-medium.webp';
import heroBackgroundSmall from '../assets/images/hero/heroweb-small.webp';

// Memoize the button to prevent unnecessary re-renders
const BookingButton = memo(({ onClick, text }: { onClick: () => void, text: string }) => (
  <button 
    onClick={onClick}
    className="btn bg-white text-primary hover:bg-gray-100 text-sm md:text-base py-2 px-4 md:py-3 md:px-6"
  >
    {text}
  </button>
));

BookingButton.displayName = 'BookingButton';

// Malmö interest button
const MalmoButton = memo(({ onClick, text }: { onClick: () => void, text: string }) => (
  <button 
    onClick={onClick}
    className="btn bg-blue-600 text-white hover:bg-blue-700 text-sm md:text-base py-2 px-4 md:py-3 md:px-6"
  >
    {text}
  </button>
));

MalmoButton.displayName = 'MalmoButton';

// Content component separated for better performance
const ContentSection = memo(({ t, openBookingForm, openMalmoForm }: { t: any, openBookingForm: () => void, openMalmoForm: () => void }) => (
  <>
    <h1 className="text-3xl md:text-6xl font-bold text-white mb-4 md:mb-6">
      {t('welcome')}
    </h1>
    <p className="text-lg md:text-xl text-white mb-6 md:mb-8 max-w-2xl mx-auto">
      {t('heroDescription')}
    </p>
    <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4">
      <a href="#about" className="btn btn-primary text-sm md:text-base py-2 px-4 md:py-3 md:px-6">
        {t('cta')}
      </a>
      <BookingButton onClick={openBookingForm} text={t('bookCta')} />
    </div>
    <div className="mt-4 flex justify-center">
      <MalmoButton onClick={openMalmoForm} text={t('malmoCta')} />
    </div>
  </>
));

ContentSection.displayName = 'ContentSection';

// Optimize image loading with simple static component
const HeroImage = memo(({ alt }: { alt: string }) => (
  <picture>
    <source media="(max-width: 480px)" srcSet={heroBackgroundSmall} />
    <source media="(max-width: 1024px)" srcSet={heroBackgroundMedium} />
    <source media="(min-width: 1025px)" srcSet={heroBackgroundLarge} />
    <img
      src={heroBackgroundSmall} 
      alt={alt}
      width="1920"
      height="1080"
      loading="eager"
      fetchPriority="high"
      className="absolute inset-0 z-0 w-full h-full object-cover"
    />
  </picture>
));

HeroImage.displayName = 'HeroImage';

interface HeroSectionProps {
  location?: string;
}

const HeroSection: React.FC<HeroSectionProps> = ({ location: _location }) => {
  const { t } = useTranslation();
  const { openBookingForm, openMalmoForm } = useBooking();
  const prefersReducedMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  // Check if device is mobile - run only once to avoid layout thrashing
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  // Disable animations on mobile for better performance
  const shouldUseAnimations = !isMobile && !prefersReducedMotion;

  return (
    <div className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay - Responsive Image */}
      <HeroImage alt={t('heroImageAlt', 'Dog walking scenery')} />
      <div className="absolute inset-0 z-0 bg-black bg-opacity-50" />

      {/* Content */}
      <div className="container relative z-10 text-center px-4">
        {shouldUseAnimations ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <ContentSection t={t} openBookingForm={openBookingForm} openMalmoForm={openMalmoForm} />
            
            {/* Trust Banner - Add with animation */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.8 }}
              className="mt-8 flex justify-center"
            >
              <TrustBanner 
                variant="dark" 
                displayReview={!isMobile} 
                className="max-w-md"
              />
            </motion.div>
          </motion.div>
        ) : (
          <div>
            <ContentSection t={t} openBookingForm={openBookingForm} openMalmoForm={openMalmoForm} />
            
            {/* Trust Banner - No animation for mobile */}
            <div className="mt-6 flex justify-center">
              <TrustBanner 
                variant="dark" 
                compact={isMobile} 
                className="max-w-md"
              />
            </div>
          </div>
        )}
      </div>

      {/* Scroll down indicator - only show on desktop */}
      {shouldUseAnimations && (
        <motion.div 
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <div className="w-8 h-12 border-2 border-white rounded-full flex justify-center pt-2">
            <div className="w-1 h-3 bg-white rounded-full animate-bounce" />
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default memo(HeroSection); 