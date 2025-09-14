import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaInstagram, FaFacebookF, FaMapMarkerAlt } from 'react-icons/fa';
import LanguageSwitcher from './LanguageSwitcher';
import dogLogo from '../assets/images/logos/Logo.png';

interface FooterProps {
  location?: string;
}

const Footer: React.FC<FooterProps> = ({ location }) => {
  const { t, i18n } = useTranslation();
  const currentYear = new Date().getFullYear();
  const isSwedish = i18n.language === 'sv';

  return (
    <footer className="bg-gray-900 text-white py-8 md:py-12">
      <div className="container px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {/* Logo and Info */}
          <div>
            <div className="flex flex-col items-center md:items-start">
              <div className="flex items-center space-x-2 mb-4">
                <img 
                  src={dogLogo} 
                  alt="Clever Dog Logo" 
                  className="h-10 md:h-12 w-auto"
                />
                <span className="text-lg md:text-xl font-bold text-orange-500">Clever Dog</span>
              </div>
              <p className="text-gray-400 text-center md:text-left mb-2 text-sm md:text-base">
                {location === 'malmo' 
                  ? (isSwedish ? 'Hunddagis i Malmö med fokus på trygghet, glädje och utveckling' : 'Dog daycare in Malmö focusing on safety, joy and development')
                  : (isSwedish ? 'Hunddagis i Staffanstorp med fokus på trygghet, glädje och utveckling' : t('heroDescription'))
                }
              </p>
              <p className="text-gray-400 text-center md:text-left mb-4 text-sm">
                <FaMapMarkerAlt className="inline mr-1" /> 
                {location === 'malmo' ? 'Centralt beläget i Malmö' : '10 min från Lund | 15 min från Malmö'}
              </p>
              <div className="flex space-x-4">
                <a 
                  href="https://www.instagram.com/CleverDog_" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                  aria-label="Instagram"
                >
                  <FaInstagram className="text-lg md:text-xl" />
                </a>
                <a 
                  href="https://www.facebook.com/profile.php?id=61555454325558" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                  aria-label="Facebook"
                >
                  <FaFacebookF className="text-lg md:text-xl" />
                </a>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-col items-center">
            <h3 className="text-base md:text-lg font-bold mb-3 md:mb-4">{t('footer.quickLinks')}</h3>
            <ul className="space-y-2 text-center md:text-left">
              <li>
                <a href="#about" className="text-gray-400 hover:text-primary text-sm md:text-base">
                  {t('about.title')}
                </a>
              </li>
              <li>
                <a href="#social-walks" className="text-gray-400 hover:text-primary text-sm md:text-base">
                  {t('socialWalks.title')}
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-gray-400 hover:text-primary text-sm md:text-base">
                  {t('pricing.title')}
                </a>
              </li>
              <li>
                <a href="#sustainability" className="text-gray-400 hover:text-primary text-sm md:text-base">
                  {t('sustainability.title')}
                </a>
              </li>
              <li>
                <a href="#contact" className="text-gray-400 hover:text-primary text-sm md:text-base">
                  {t('contact.title')}
                </a>
              </li>
            </ul>
          </div>

          {/* Contact and Language */}
          <div className="flex flex-col items-center md:items-end">
            <h3 className="text-base md:text-lg font-bold mb-3 md:mb-4">{t('contact.title')}</h3>
            <address className="text-gray-400 mb-4 md:mb-6 text-center md:text-right not-italic text-sm md:text-base">
              {location === 'malmo' ? (
                <>
                  Jägersro<br />
                  Malmö<br />
                  <a href="mailto:cleverdog.malmo@gmail.com" className="hover:text-primary">
                    cleverdog.malmo@gmail.com
                  </a>
                </>
              ) : (
                <>
                  Malmövägen 7<br />
                  Staffanstorp<br />
                  <a href="mailto:cleverdog.aw@gmail.com" className="hover:text-primary">
                    cleverdog.aw@gmail.com
                  </a>
                </>
              )}
            </address>
            <LanguageSwitcher />
          </div>
        </div>

        {/* Area Service Information for SEO - Hårdkodad på svenska för SEO */}
        <div className="border-t border-gray-800 mt-6 md:mt-8 pt-6 md:pt-8 text-xs text-gray-600">
          {location === 'malmo' ? (
            <div>
              <h4 className="text-sm text-gray-500 mb-3">
                Perfekt läge för hundägare i hela regionen
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="mb-2">
                    <strong>Jägersro, Malmö</strong><br />
                    Centralt läge i Malmö<br />
                    Lättillgängligt<br />
                    Perfekt för Malmöområdet
                  </p>
                </div>
                <div>
                  <p className="mb-2">
                    Vi välkomnar hundar från hela regionen inklusive:
                  </p>
                  <p>
                    Malmöområdet inklusive Limhamn, Hyllie, Oxie, Husie och närliggande områden.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h4 className="text-sm text-gray-500 mb-3">
                {i18n.language === 'sv' 
                  ? 'Perfekt läge för hundägare i hela regionen' 
                  : t('footer.locationTitle')}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="mb-2">
                    {i18n.language === 'sv'
                      ? 'Med vårt strategiska läge i Staffanstorp är vi lättillgängliga för hundägare från hela sydvästra Skåne:' 
                      : t('footer.strategicLocation')}
                  </p>
                  <ul className="list-disc pl-5 mb-2 space-y-1">
                    <li><strong>Lund:</strong> {i18n.language === 'sv' ? 'Endast 10 minuters bilresa' : t('footer.travelTimes.lund')}</li>
                    <li><strong>Malmö:</strong> {i18n.language === 'sv' ? 'Bara 15 minuter med bil' : t('footer.travelTimes.malmo')}</li>
                    <li><strong>Staffanstorp:</strong> {i18n.language === 'sv' ? 'Centralt läge på Malmövägen' : t('footer.travelTimes.staffanstorp')}</li>
                  </ul>
                </div>
                <div>
                  <p className="mb-2">
                    {i18n.language === 'sv' ? 'Vi välkomnar hundar från hela regionen inklusive:' : t('footer.welcomeDogs')}
                  </p>
                  <p>
                    {/* Alltid på svenska för SEO */}
                    Lund, Dalby, Södra Sandby, Veberöd, Genarp, Hjärup, Lomma, Bjärred, Åkarp, Arlöv, Burlöv samt hela Malmö med områden som Limhamn, Hyllie, Oxie och Husie.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-800 mt-4 pt-4 text-center text-gray-500 text-xs md:text-sm">
          <p>{t('footer.copyright').replace('2025', currentYear.toString())}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 