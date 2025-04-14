import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, useReducedMotion } from "framer-motion";

const InfoSection: React.FC = () => {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Check if user has previously closed the info section
    const infoSectionClosed = localStorage.getItem('infoSectionClosed');
    if (infoSectionClosed === 'true') {
      setIsVisible(false);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    // Remember user preference
    localStorage.setItem('infoSectionClosed', 'true');
  };

  if (!isVisible) return null;

  return (
    <section className="bg-amber-100 py-4">
      <div className="container mx-auto px-4">
        <motion.div 
          className="p-4 rounded-lg max-w-3xl mx-auto relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: prefersReducedMotion ? 0.3 : 0.6 }}
        >
          <button 
            onClick={handleClose}
            className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
            aria-label="Close"
          >
            <span className="sr-only">Close</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h3 className="font-bold text-xl mb-2">{t('infoSection.title')}</h3>
          <div className="text-sm md:text-base">
            {t('infoSection.content')}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default InfoSection;
