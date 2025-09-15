import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaBars, FaTimes } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import LanguageSwitcher from './LanguageSwitcher';
import { useBooking } from './BookingContext';
import dogLogo from '../assets/images/logos/Logo.png';

interface NavbarProps {
  location?: string;
}

const Navbar: React.FC<NavbarProps> = ({ location: _location }) => {
  const { t } = useTranslation();
  const { openBookingForm } = useBooking();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const goToHomepage = () => {
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-md w-full">
      <div className="container flex items-center justify-between py-4">
        {/* Logo */}
        <button 
          onClick={goToHomepage}
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
          {/* Main Navigation Links */}
          <div className="flex items-center space-x-6">
            <a href="#about" className="font-medium hover:text-primary text-sm whitespace-nowrap transition-colors">
              {t('about.title')}
            </a>
            <a href="#pricing" className="font-medium hover:text-primary text-sm whitespace-nowrap transition-colors">
              {t('pricing.title')}
            </a>
            <a href="#team" className="font-medium hover:text-primary text-sm whitespace-nowrap transition-colors">
              {t('navbar.team')}
            </a>
            <a href="#work-with-us" className="font-medium hover:text-primary text-sm whitespace-nowrap transition-colors">
              {t('navbar.workWithUs')}
            </a>
            <a href="#contact" className="font-medium hover:text-primary text-sm whitespace-nowrap transition-colors">
              {t('contact.title')}
            </a>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-200">
            <button 
              onClick={() => openBookingForm()} 
              className="btn btn-primary text-sm whitespace-nowrap"
              aria-label={t('bookCta')}
            >
              {t('bookCta')}
            </button>
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
            {/* Navigation Links */}
            <div className="space-y-3">
              <a href="#about" className="block font-medium hover:text-primary py-2" onClick={toggleMenu}>
                {t('about.title')}
              </a>
              <a href="#pricing" className="block font-medium hover:text-primary py-2" onClick={toggleMenu}>
                {t('pricing.title')}
              </a>
              <a href="#team" className="block font-medium hover:text-primary py-2" onClick={toggleMenu}>
                {t('navbar.team')}
              </a>
              <a href="#work-with-us" className="block font-medium hover:text-primary py-2" onClick={toggleMenu}>
                {t('navbar.workWithUs')}
              </a>
              <a href="#contact" className="block font-medium hover:text-primary py-2" onClick={toggleMenu}>
                {t('contact.title')}
              </a>
            </div>
            
            {/* Action Button */}
            <div className="pt-4 border-t border-gray-200">
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
        </div>
      )}
    </nav>
  );
};

export default Navbar; 