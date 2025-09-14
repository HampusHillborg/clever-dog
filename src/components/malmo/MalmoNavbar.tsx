import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaBars, FaTimes } from 'react-icons/fa';
import LanguageSwitcher from '../LanguageSwitcher';
import InformationDropdown from '../InformationDropdown';
import { useBooking } from '../BookingContext';
import dogLogo from '../../assets/images/logos/Logo.png';

const MalmoNavbar: React.FC = () => {
  const { t } = useTranslation();
  const { openBookingForm } = useBooking();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-md w-full">
      <div className="container flex items-center justify-between py-4">
        {/* Logo */}
        <button 
          onClick={scrollToTop}
          className="flex items-center space-x-2 hover:opacity-80 transition-opacity logo-button"
          aria-label="Go to homepage"
        >
          <img 
            src={dogLogo} 
            alt="Clever Dog Logo" 
            className="h-8 w-auto sm:h-10"
          />
          <span className="text-lg sm:text-xl font-bold text-orange-500">Clever Dog</span>
        </button>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex lg:items-center lg:justify-end lg:flex-1 lg:space-x-6">
          <a href="#about" className="font-semibold hover:text-orange-600 text-base whitespace-nowrap transition-colors duration-200">
            {t('navbar.about')}
          </a>
          <a href="#pricing" className="font-semibold hover:text-orange-600 text-base whitespace-nowrap transition-colors duration-200">
            {t('navbar.pricing')}
          </a>
          <a href="#team" className="font-semibold hover:text-orange-600 text-base whitespace-nowrap transition-colors duration-200">
            {t('navbar.team')}
          </a>
          <a href="#work-with-us" className="font-semibold hover:text-orange-600 text-base whitespace-nowrap transition-colors duration-200">
            {t('navbar.workWithUs')}
          </a>
          <InformationDropdown />
          <a href="#sustainability" className="font-semibold hover:text-orange-600 text-base whitespace-nowrap transition-colors duration-200">
            {t('navbar.sustainability')}
          </a>
          <a href="#contact" className="font-semibold hover:text-orange-600 text-base whitespace-nowrap transition-colors duration-200">
            {t('navbar.contact')}
          </a>
          <button 
            onClick={openBookingForm} 
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-base whitespace-nowrap px-6 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg ml-2"
            aria-label={t('bookCta')}
          >
            {t('bookCta')}
          </button>
          <div className="ml-2">
            <LanguageSwitcher />
          </div>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center space-x-2 lg:hidden">
          <LanguageSwitcher />
          <button 
            onClick={toggleMenu} 
            className="p-1.5 text-gray-600"
            aria-label={isMenuOpen ? t('closeMenu', 'Close menu') : t('openMenu', 'Open menu')}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <FaTimes className="text-xl" /> : <FaBars className="text-xl" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="container pb-4 lg:hidden">
          <div className="flex flex-col space-y-4">
            <a href="#about" className="font-medium hover:text-primary" onClick={toggleMenu}>
              {t('navbar.about')}
            </a>
            <a href="#pricing" className="font-medium hover:text-primary" onClick={toggleMenu}>
              {t('navbar.pricing')}
            </a>
            <a href="#team" className="font-medium hover:text-primary" onClick={toggleMenu}>
              {t('navbar.team')}
            </a>
            <a href="#work-with-us" className="font-medium hover:text-primary" onClick={toggleMenu}>
              {t('navbar.workWithUs')}
            </a>
            <a href="#important-info" className="font-medium hover:text-primary" onClick={toggleMenu}>
              {t('navbar.importantInfo')}
            </a>
            <a href="#daycare-schedule" className="font-medium hover:text-primary" onClick={toggleMenu}>
              {t('navbar.schedule')}
            </a>
            <a href="#sustainability" className="font-medium hover:text-primary" onClick={toggleMenu}>
              {t('navbar.sustainability')}
            </a>
            <a href="#contact" className="font-medium hover:text-primary" onClick={toggleMenu}>
              {t('navbar.contact')}
            </a>
            <button 
              onClick={() => {
                toggleMenu(); 
                openBookingForm();
              }}
              className="w-full btn btn-primary text-center"
              aria-label={t('bookCta')}
            >
              {t('bookCta')}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default MalmoNavbar;
