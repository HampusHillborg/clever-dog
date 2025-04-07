import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaMapMarkerAlt, FaEnvelope, FaInstagram, FaFacebookF } from 'react-icons/fa';
import LanguageSwitcher from './LanguageSwitcher';
import dogLogo from '../assets/images/logos/Logo.png';

const Footer: React.FC = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo and Info */}
          <div>
            <div className="flex flex-col items-center md:items-start">
              <div className="flex items-center space-x-2 mb-4">
                <img 
                  src={dogLogo} 
                  alt="Clever Dog Logo" 
                  className="h-12 w-auto"
                />
                <span className="text-xl font-bold text-orange-500">Clever Dog</span>
              </div>
              <p className="text-gray-400 text-center md:text-left mb-4">
                Hunddagis i Staffanstorp med fokus på trygghet, glädje och utveckling
              </p>
              <div className="flex space-x-4">
                <a 
                  href="https://www.instagram.com/CleverDog_" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  <FaInstagram className="text-xl" />
                </a>
                <a 
                  href="https://www.facebook.com/profile.php?id=61555454325558" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  <FaFacebookF className="text-xl" />
                </a>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-col items-center">
            <h3 className="text-lg font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-center md:text-left">
              <li>
                <a href="#about" className="text-gray-400 hover:text-primary">
                  {t('about.title')}
                </a>
              </li>
              <li>
                <a href="#social-walks" className="text-gray-400 hover:text-primary">
                  {t('socialWalks.title')}
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-gray-400 hover:text-primary">
                  {t('pricing.title')}
                </a>
              </li>
              <li>
                <a href="#sustainability" className="text-gray-400 hover:text-primary">
                  {t('sustainability.title')}
                </a>
              </li>
              <li>
                <a href="#contact" className="text-gray-400 hover:text-primary">
                  {t('contact.title')}
                </a>
              </li>
            </ul>
          </div>

          {/* Contact and Language */}
          <div className="flex flex-col items-center md:items-end">
            <h3 className="text-lg font-bold mb-4">{t('contact.title')}</h3>
            <address className="text-gray-400 mb-6 text-center md:text-right not-italic">
              Malmövägen 7<br />
              Staffanstorp<br />
              <a href="mailto:cleverdog.aw@gmail.com" className="hover:text-primary">
                cleverdog.aw@gmail.com
              </a>
            </address>
            <LanguageSwitcher />
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500 text-sm">
          <p>{t('footer.copyright').replace('2025', currentYear.toString())}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 