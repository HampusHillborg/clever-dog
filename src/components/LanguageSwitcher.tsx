import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (language: string) => {
    i18n.changeLanguage(language);
  };

  return (
    <div className="flex items-center space-x-1" role="group" aria-label="Language switcher">
      <button
        className={`px-1.5 py-0.5 text-xs md:text-sm rounded ${
          i18n.language === 'sv' 
            ? 'bg-primary text-white' 
            : 'bg-gray-200 text-gray-800'
        }`}
        onClick={() => changeLanguage('sv')}
        aria-label="Switch to Swedish"
        aria-pressed={i18n.language === 'sv'}
      >
        SE
      </button>
      <span className="text-gray-600 text-xs" aria-hidden="true">|</span>
      <button
        className={`px-1.5 py-0.5 text-xs md:text-sm rounded ${
          i18n.language === 'en' 
            ? 'bg-primary text-white' 
            : 'bg-gray-200 text-gray-800'
        }`}
        onClick={() => changeLanguage('en')}
        aria-label="Switch to English"
        aria-pressed={i18n.language === 'en'}
      >
        EN
      </button>
      <span className="text-gray-600 text-xs" aria-hidden="true">|</span>
      <button
        className={`px-1.5 py-0.5 text-xs md:text-sm rounded ${
          i18n.language === 'pl' 
            ? 'bg-primary text-white' 
            : 'bg-gray-200 text-gray-800'
        }`}
        onClick={() => changeLanguage('pl')}
        aria-label="Switch to Polish"
        aria-pressed={i18n.language === 'pl'}
      >
        PL
      </button>
    </div>
  );
};

export default LanguageSwitcher; 