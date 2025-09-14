import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaChevronDown } from 'react-icons/fa';

const InformationDropdown: React.FC = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="font-semibold hover:text-orange-600 text-base whitespace-nowrap flex items-center space-x-1.5 transition-colors duration-200 group"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="group-hover:text-orange-600 transition-colors duration-200">
          {t('navbar.importantInfo')}
        </span>
        <FaChevronDown 
          className={`text-sm transition-all duration-300 ease-in-out ${
            isOpen ? 'rotate-180 text-orange-600' : 'text-gray-500 group-hover:text-orange-600'
          }`} 
        />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-3 w-52 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
          <div className="py-2">
            <a
              href="#important-info"
              className="block px-5 py-3 text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-all duration-200 border-l-4 border-transparent hover:border-orange-500"
              onClick={() => setIsOpen(false)}
            >
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span>{t('navbar.importantInfo')}</span>
              </div>
            </a>
            <a
              href="#daycare-schedule"
              className="block px-5 py-3 text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-all duration-200 border-l-4 border-transparent hover:border-orange-500"
              onClick={() => setIsOpen(false)}
            >
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span>{t('navbar.schedule')}</span>
              </div>
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default InformationDropdown;
