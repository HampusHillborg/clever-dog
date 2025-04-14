import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { FaWalking, FaUsers, FaHeart } from 'react-icons/fa';

const SocialWalksSection: React.FC = () => {
  const { t } = useTranslation();
  // Use state to hold the image path
  const [imagePath, setImagePath] = useState('');

  // Dynamically import the image on component mount
  useEffect(() => {
    // Add a cache-busting query parameter
    const timestamp = new Date().getTime();
    import(`../assets/images/gallery/social_walk.jpeg?t=${timestamp}`)
      .then(module => {
        setImagePath(module.default);
      })
      .catch(error => {
        console.error('Failed to load image:', error);
        // Fallback to a direct path if dynamic import fails
        setImagePath('/src/assets/images/gallery/social_walk.jpeg');
      });
  }, []);

  return (
    <section id="social-walks" className="section bg-white">
      <div className="container">
        <motion.h2 
          className="section-title"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {t('socialWalks.title')}
        </motion.h2>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="order-2 md:order-1"
          >
            {imagePath && (
              <img 
                src={imagePath} 
                alt="Dogs on a social walk" 
                className="rounded-lg shadow-lg object-cover w-full h-80 md:h-96"
                loading="lazy"
                width="1200"
                height="800"
              />
            )}
          </motion.div>

          {/* Text Content */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="space-y-6 order-1 md:order-2"
          >
            <p className="text-lg">
              {t('socialWalks.description')}
            </p>

            {/* Benefits */}
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-primary/10 rounded-full mt-1">
                  <FaWalking className="text-primary text-xl" />
                </div>
                <div>
                  <h3 className="font-medium text-lg">{t('socialWalks.benefits.structuredWalks.title')}</h3>
                  <p>{t('socialWalks.benefits.structuredWalks.description')}</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="p-3 bg-primary/10 rounded-full mt-1">
                  <FaUsers className="text-primary text-xl" />
                </div>
                <div>
                  <h3 className="font-medium text-lg">{t('socialWalks.benefits.socialization.title')}</h3>
                  <p>{t('socialWalks.benefits.socialization.description')}</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="p-3 bg-primary/10 rounded-full mt-1">
                  <FaHeart className="text-primary text-xl" />
                </div>
                <div>
                  <h3 className="font-medium text-lg">{t('socialWalks.benefits.strengthenedBonds.title')}</h3>
                  <p>{t('socialWalks.benefits.strengthenedBonds.description')}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default SocialWalksSection; 