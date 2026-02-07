import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { FaInstagram } from 'react-icons/fa';

const SocialMediaSection: React.FC = () => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    const sectionElement = document.getElementById('social-media');
    if (sectionElement) {
      observer.observe(sectionElement);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    // Only load Instagram embed script when section becomes visible
    if (!isVisible) return;

    if (document.getElementById('instagram-embed-script')) return;

    const script = document.createElement('script');
    script.id = 'instagram-embed-script';
    script.src = 'https://www.instagram.com/embed.js';
    script.async = true;
    script.defer = true;

    script.onload = () => {
      // @ts-ignore
      if (window.instgrm) {
        // @ts-ignore
        window.instgrm.Embeds.process();
      }
    };

    document.body.appendChild(script);

    return () => {
      const scriptElem = document.getElementById('instagram-embed-script');
      if (scriptElem) document.body.removeChild(scriptElem);
    };
  }, [isVisible]);

  return (
    <section id="social-media" className="section bg-white">
      <div className="container">
        <motion.h2
          className="section-title"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="gradient-text-coral">{t('social.title')}</span>
        </motion.h2>

        <div className="mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <h3 className="text-2xl font-bold flex items-center justify-center gap-2">
              <FaInstagram className="text-primary" /> {t('social.followUs')}
            </h3>
            <p className="text-gray-600 mb-4">
              <a
                href="https://www.instagram.com/cleverdog_hunddagis/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                @cleverdog_hunddagis
              </a>
            </p>
          </motion.div>

          {/* Instagram Profile Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex justify-center"
          >
            {isVisible && (
              <iframe
                title="Instagram Profile"
                src="https://www.instagram.com/cleverdog_hunddagis/embed"
                width="540"
                height="680"
                loading="lazy"
                frameBorder="0"
                scrolling="no"
                allowTransparency={true}
                className="instagram-profile-embed"
                style={{
                  background: '#FFF',
                  border: '1px solid #e6e6e6',
                  borderRadius: '3px',
                  boxShadow: '0 0 1px 0 rgba(0,0,0,0.5), 0 1px 10px 0 rgba(0,0,0,0.15)',
                  maxWidth: '100%',
                }}
              ></iframe>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex justify-center mt-8"
          >
            <motion.a
              href="https://www.instagram.com/cleverdog_hunddagis/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-full hover:from-orange-600 hover:to-pink-600 transition-all duration-300 shadow-md hover:shadow-lg"
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <span>{t('social.visitInstagram')}</span>
              <FaInstagram />
            </motion.a>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default SocialMediaSection;
