import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaInstagram, FaFacebookF, FaMapMarkerAlt } from 'react-icons/fa';
import { motion } from 'framer-motion';
import LanguageSwitcher from './LanguageSwitcher';
import dogLogo from '../assets/images/logos/Logo.png';

interface FooterProps {
  location?: string;
}

const iconHoverSpring = { type: 'spring' as const, stiffness: 400, damping: 17 };

const Footer: React.FC<FooterProps> = ({ location }) => {
  const { t, i18n } = useTranslation();
  const currentYear = new Date().getFullYear();
  const isSwedish = i18n.language === 'sv';

  return (
    <footer className="bg-gray-900 text-white py-8 md:py-12">
      {/* Gradient strip at top */}
      <div className="h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 -mt-8 md:-mt-12 mb-8 md:mb-12" />

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
              <div className="text-gray-400 text-center md:text-left mb-4 text-sm">
                <p className="mb-2">
                  <FaMapMarkerAlt className="inline mr-1" />
                  {location === 'malmo' ? 'Bellisgatan 13, Malmö 21232' : 'Malmövägen 7, Staffanstorp'}
                </p>
                <p className="text-xs">
                  {location === 'malmo'
                    ? 'Perfekt för Malmöområdet'
                    : '10 min från Lund | 15 min från Malmö'
                  }
                </p>
              </div>
              <div className="flex space-x-4">
                <motion.a
                  href="https://www.instagram.com/CleverDog_"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                  aria-label="Instagram"
                  whileHover={{ scale: 1.2, rotate: 5 }}
                  transition={iconHoverSpring}
                >
                  <FaInstagram className="text-lg md:text-xl" />
                </motion.a>
                <motion.a
                  href="https://www.facebook.com/profile.php?id=61555454325558"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                  aria-label="Facebook"
                  whileHover={{ scale: 1.2, rotate: 5 }}
                  transition={iconHoverSpring}
                >
                  <FaFacebookF className="text-lg md:text-xl" />
                </motion.a>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-col items-center">
            <h3 className="text-base md:text-lg font-bold mb-3 md:mb-4">{t('footer.quickLinks')}</h3>
            <ul className="space-y-2 text-center md:text-left">
              <li>
                <a href={`/${location || ''}#about`} className="text-gray-400 hover:text-primary text-sm md:text-base">
                  {t('about.title')}
                </a>
              </li>
              <li>
                <a href={`/${location || ''}#pricing`} className="text-gray-400 hover:text-primary text-sm md:text-base">
                  {t('pricing.title')}
                </a>
              </li>
              <li>
                <a href={`/${location || ''}#important-info`} className="text-gray-400 hover:text-primary text-sm md:text-base">
                  {t('importantInfo.title')}
                </a>
              </li>
              <li>
                <a href={`/${location || ''}#daycare-schedule`} className="text-gray-400 hover:text-primary text-sm md:text-base">
                  {t('schedule.title')}
                </a>
              </li>
              <li>
                <a href={`/${location || ''}#sustainability`} className="text-gray-400 hover:text-primary text-sm md:text-base">
                  {t('sustainability.title')}
                </a>
              </li>
              <li>
                <a href={`/${location || ''}#contact`} className="text-gray-400 hover:text-primary text-sm md:text-base">
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
                  Bellisgatan 13<br />
                  Malmö 21232<br />
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

        {/* Enhanced Location Information */}
        <div className="border-t border-gray-800 mt-6 md:mt-8 pt-6 md:pt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Location Details */}
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center">
                <FaMapMarkerAlt className="mr-2" />
                {location === 'malmo' ? 'Vår plats i Malmö' : 'Vår plats i Staffanstorp'}
              </h4>
              <div className="text-xs text-gray-400 space-y-2">
                {location === 'malmo' ? (
                  <>
                    <p><strong>Adress:</strong> Bellisgatan 13, Malmö 21232</p>
                    <p><strong>Läge:</strong> Centralt beläget i Malmö</p>
                    <p><strong>Fördelar:</strong> Lättillgängligt, bra parkering</p>
                    <p><strong>Perfekt för:</strong> Malmöområdet och närliggande städer</p>
                  </>
                ) : (
                  <>
                    <p><strong>Adress:</strong> Malmövägen 7, Staffanstorp</p>
                    <p><strong>Läge:</strong> Strategiskt placerat mellan Lund och Malmö</p>
                    <p><strong>Resetider:</strong> 10 min från Lund, 15 min från Malmö</p>
                    <p><strong>Fördelar:</strong> Lättillgängligt, bra parkering, lugnt område</p>
                  </>
                )}
              </div>
            </div>

            {/* Service Areas */}
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-3">
                Vi välkomnar hundar från
              </h4>
              <div className="text-xs text-gray-400">
                {location === 'malmo' ? (
                  <p>
                    Malmöområdet inklusive Limhamn, Hyllie, Oxie, Husie,
                    Vellinge, Trelleborg, Svedala och närliggande områden.
                  </p>
                ) : (
                  <p>
                    Lund, Dalby, Södra Sandby, Veberöd, Genarp, Hjärup,
                    Lomma, Bjärred, Åkarp, Arlöv, Burlöv samt hela Malmö
                    med områden som Limhamn, Hyllie, Oxie och Husie.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-4 pt-4 text-center text-gray-500 text-xs md:text-sm">
          <p>{t('footer.copyright').replace('2025', currentYear.toString())}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
