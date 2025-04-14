import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useBooking } from './BookingContext';

// Import the hero images in different sizes
import heroBackgroundLarge from '../assets/images/hero/heroweb.webp';
// Import smaller versions - assuming these files exist or will be created
import heroBackgroundMedium from '../assets/images/hero/heroweb-medium.webp';
import heroBackgroundSmall from '../assets/images/hero/heroweb-small.webp';

const HeroSection: React.FC = () => {
  const { t } = useTranslation();
  const { openBookingForm } = useBooking();

  return (
    <div className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay - Responsive Image */}
      <img
        src={heroBackgroundSmall} // Fallback for browsers that don't support srcset
        srcSet={`
          ${heroBackgroundSmall} 480w,
          ${heroBackgroundMedium} 800w,
          ${heroBackgroundLarge} 1920w
        `}
        sizes="100vw"
        alt={t('heroImageAlt', 'Dog walking scenery')}
        width="1920"
        height="1080"
        loading="eager"
        fetchPriority="high"
        className="absolute inset-0 z-0 w-full h-full object-cover"
      />
      <div 
        className="absolute inset-0 z-0 bg-black bg-opacity-50" 
      />

      {/* Content */}
      <div className="container relative z-10 text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
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
            <button 
              onClick={openBookingForm}
              className="btn bg-white text-primary hover:bg-gray-100 text-sm md:text-base py-2 px-4 md:py-3 md:px-6"
            >
              {t('bookCta')}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Scroll down indicator */}
      <motion.div 
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10"
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
      >
        <div className="w-6 h-10 md:w-8 md:h-12 border-2 border-white rounded-full flex justify-center pt-2">
          <div className="w-1 h-2 md:h-3 bg-white rounded-full animate-bounce" />
        </div>
      </motion.div>
    </div>
  );
};

export default HeroSection; 