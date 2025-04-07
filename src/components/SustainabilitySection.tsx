import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
// Import the image from assets
import goalImage from '../assets/images/sustainability/goal8.png';

const SustainabilitySection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section id="sustainability" className="section bg-white">
      <div className="container">
        <motion.h2 
          className="section-title"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {t('sustainability.title')}
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="flex justify-center"
          >
            <img 
              src={goalImage} 
              alt="UN Global Goal #8: Decent Work and Economic Growth" 
              className="max-w-full h-auto max-h-80"
            />
          </motion.div>

          {/* Text Content */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <p className="text-lg font-medium">
              {t('sustainability.goal')}
            </p>
            <p className="text-lg">
              {t('sustainability.description')}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default SustainabilitySection; 