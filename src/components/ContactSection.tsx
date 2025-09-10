import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { FaMapMarkerAlt, FaEnvelope, FaInstagram, FaFacebookF } from 'react-icons/fa';

interface ContactSectionProps {
  location?: string;
}

const ContactSection: React.FC<ContactSectionProps> = ({ location }) => {
  const { t } = useTranslation();
  
  // Always use mailto protocol for email links
  const emailLink = "mailto:cleverdog.aw@gmail.com";

  return (
    <section id="contact" className="section bg-light">
      <div className="container">
        <motion.h2 
          className="section-title"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {t('contact.title')}
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact Information */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-white p-6 rounded-lg shadow-md"
          >
            <h3 className="text-2xl font-bold mb-6">{t('contact.getInTouch')}</h3>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-primary/10 rounded-full mt-1">
                  <FaMapMarkerAlt className="text-primary text-xl" />
                </div>
                <div>
                  <h4 className="font-medium">{t('about.address')}</h4>
                  <p>{location === 'malmo' ? 'Sadelgatan 6, Malmö' : 'Malmövägen 7, Staffanstorp'}</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="p-3 bg-primary/10 rounded-full mt-1">
                  <FaEnvelope className="text-primary text-xl" />
                </div>
                <div>
                  <h4 className="font-medium">{t('about.email')}</h4>
                   <a href={emailLink} className="hover:text-primary">
                     cleverdog.aw@gmail.com
                   </a>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="p-3 bg-primary/10 rounded-full mt-1">
                  <FaInstagram className="text-primary text-xl" />
                </div>
                <div>
                  <h4 className="font-medium">{t('about.instagram')}</h4>
                  <a href="https://www.instagram.com/cleverdog_hunddagis/" target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                    @cleverdog_hunddagis
                  </a>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="p-3 bg-primary/10 rounded-full mt-1">
                  <FaFacebookF className="text-primary text-xl" />
                </div>
                <div>
                  <h4 className="font-medium">{t('about.facebook')}</h4>
                  <a href="https://www.facebook.com/profile.php?id=61555454325558" target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                    Clever Dog
                  </a>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Map */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="h-full"
          >
            <div className="bg-white p-6 rounded-lg shadow-md h-full">
              <h3 className="text-2xl font-bold mb-6">{t('contact.location')}</h3>
              <div className="h-[350px] rounded-lg overflow-hidden">
                <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2241.611005496342!2d13.204780177205092!3d55.64265047373066!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4653a2fd38b9b54f%3A0x4019b1eef694a1eb!2sMalm%C3%B6v%C3%A4gen%207%2C%20245%2038%20Staffanstorp!5e0!3m2!1ssv!2sse!4v1689775458050!5m2!1ssv!2sse" 
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  allowFullScreen 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Clever Dog Map Location"
                ></iframe>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection; 