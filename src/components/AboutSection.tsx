import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaMapMarkerAlt, FaEnvelope, FaInstagram, FaFacebookF } from 'react-icons/fa';
import { motion, useReducedMotion } from 'framer-motion';

const AboutSection: React.FC = () => {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  // Check if device is mobile
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

  // Simpler animations for mobile or reduced motion
  const shouldUseSimpleAnimations = isMobile || prefersReducedMotion;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldUseSimpleAnimations ? 0.1 : 0.2
      }
    }
  };

  const itemVariants = shouldUseSimpleAnimations 
    ? {
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { duration: 0.3 }
        }
      }
    : {
        hidden: { y: 20, opacity: 0 },
        visible: {
          y: 0,
          opacity: 1,
          transition: { duration: 0.6 }
        }
      };

  return (
    <section id="about" className="section bg-light">
      <div className="container">
        <motion.h2 
          className="section-title"
          initial={shouldUseSimpleAnimations ? { opacity: 0 } : { opacity: 0, y: -20 }}
          whileInView={shouldUseSimpleAnimations ? { opacity: 1 } : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: shouldUseSimpleAnimations ? 0.3 : 0.6 }}
        >
          {t('about.title')}
        </motion.h2>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {/* Text Content */}
          <motion.div variants={itemVariants} className="space-y-6">
            <p className="text-lg">{t('about.bio')}</p>
            <p className="text-lg">{t('about.bio2')}</p>
            <p className="text-lg highlight-text">{t('about.bio3')}</p>
            <p className="text-lg font-medium">{t('about.permission')}</p>
          </motion.div>

          {/* Contact Info */}
          <motion.div variants={itemVariants} className="bg-white p-6 rounded-lg shadow-md space-y-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <FaMapMarkerAlt className="text-primary text-xl" />
              </div>
              <div>
                <h3 className="font-medium text-gray-700">{t('about.address')}</h3>
                <p>Malmövägen 7, Staffanstorp</p>
                <p className="text-sm text-gray-600">10 min från Lund | 15 min från Malmö</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <FaEnvelope className="text-primary text-xl" />
              </div>
              <div>
                <h3 className="font-medium text-gray-700">{t('about.email')}</h3>
                <a href="mailto:cleverdog.aw@gmail.com" className="hover:text-primary">
                  cleverdog.aw@gmail.com
                </a>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <FaInstagram className="text-primary text-xl" />
              </div>
              <div>
                <h3 className="font-medium text-gray-700">{t('about.instagram')}</h3>
                <a href="https://www.instagram.com/CleverDog_" target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                  CleverDog_
                </a>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <FaFacebookF className="text-primary text-xl" />
              </div>
              <div>
                <h3 className="font-medium text-gray-700">{t('about.facebook')}</h3>
                <a href="https://www.facebook.com/profile.php?id=61555454325558" target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                  Clever Dog
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutSection; 