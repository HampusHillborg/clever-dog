import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useBooking } from './BookingContext';

// Import the hero image from assets
import heroBackground from '../assets/images/hero/hero8.jpg';

const HeroSection: React.FC = () => {
  const { t } = useTranslation();
  const { openBookingForm } = useBooking();

  return (
    <div className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0" 
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${heroBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Content */}
      <div className="container relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            {t('welcome')}
          </h1>
          <p className="text-xl text-white mb-8 max-w-2xl mx-auto">
            {t('heroDescription')}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a href="#about" className="btn btn-primary">
              {t('cta')}
            </a>
            <button 
              onClick={openBookingForm}
              className="btn bg-white text-primary hover:bg-gray-100"
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
        <div className="w-8 h-12 border-2 border-white rounded-full flex justify-center pt-2">
          <div className="w-1 h-3 bg-white rounded-full animate-bounce" />
        </div>
      </motion.div>
    </div>
  );
};

export default HeroSection; 