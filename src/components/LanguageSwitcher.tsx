import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (language: string) => {
    i18n.changeLanguage(language);
  };

  return (
    <div className="flex items-center space-x-2" role="group" aria-label="Language switcher">
      <button
        className={`px-2 py-1 text-sm rounded ${
          i18n.language === 'sv' 
            ? 'bg-primary text-white' 
            : 'bg-gray-200 text-gray-800'
        }`}
        onClick={() => changeLanguage('sv')}
        aria-label="Switch to Swedish"
        aria-pressed={i18n.language === 'sv'}
      >
        Svenska
      </button>
      <span className="text-gray-600" aria-hidden="true">|</span>
      <button
        className={`px-2 py-1 text-sm rounded ${
          i18n.language === 'en' 
            ? 'bg-primary text-white' 
            : 'bg-gray-200 text-gray-800'
        }`}
        onClick={() => changeLanguage('en')}
        aria-label="Switch to English"
        aria-pressed={i18n.language === 'en'}
      >
        English
      </button>
      <span className="text-gray-600" aria-hidden="true">|</span>
      <button
        className={`px-2 py-1 text-sm rounded ${
          i18n.language === 'pl' 
            ? 'bg-primary text-white' 
            : 'bg-gray-200 text-gray-800'
        }`}
        onClick={() => changeLanguage('pl')}
        aria-label="Switch to Polish"
        aria-pressed={i18n.language === 'pl'}
      >
        Polski
      </button>
    </div>
  );
};

export default LanguageSwitcher; 