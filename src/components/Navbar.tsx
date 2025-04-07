import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaBars, FaTimes, FaDog } from 'react-icons/fa';
import LanguageSwitcher from './LanguageSwitcher';
import { useBooking } from './BookingContext';

const Navbar: React.FC = () => {
  const { t } = useTranslation();
  const { openBookingForm } = useBooking();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-md">
      <div className="container flex items-center justify-between py-4">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <FaDog className="text-3xl text-primary" />
          <span className="text-xl font-bold">Clever Dog</span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex md:items-center md:space-x-8">
          <a href="#about" className="font-medium hover:text-primary">
            {t('about.title')}
          </a>
          <a href="#social-walks" className="font-medium hover:text-primary">
            {t('socialWalks.title')}
          </a>
          <a href="#pricing" className="font-medium hover:text-primary">
            {t('pricing.title')}
          </a>
          <a href="#contact" className="font-medium hover:text-primary">
            {t('contact.title')}
          </a>
          <button 
            onClick={openBookingForm} 
            className="btn btn-primary"
          >
            {t('bookCta')}
          </button>
          <LanguageSwitcher />
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center md:hidden">
          <LanguageSwitcher />
          <button onClick={toggleMenu} className="p-2 ml-4 text-gray-600">
            {isMenuOpen ? <FaTimes className="text-2xl" /> : <FaBars className="text-2xl" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="container pb-4 md:hidden">
          <div className="flex flex-col space-y-4">
            <a href="#about" className="font-medium hover:text-primary" onClick={toggleMenu}>
              {t('about.title')}
            </a>
            <a href="#social-walks" className="font-medium hover:text-primary" onClick={toggleMenu}>
              {t('socialWalks.title')}
            </a>
            <a href="#pricing" className="font-medium hover:text-primary" onClick={toggleMenu}>
              {t('pricing.title')}
            </a>
            <a href="#contact" className="font-medium hover:text-primary" onClick={toggleMenu}>
              {t('contact.title')}
            </a>
            <button 
              onClick={() => {
                toggleMenu(); 
                openBookingForm();
              }}
              className="w-full btn btn-primary text-center"
            >
              {t('bookCta')}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar; 