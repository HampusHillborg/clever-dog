import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (language: string) => {
    i18n.changeLanguage(language);
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        className={`px-2 py-1 text-sm rounded ${
          i18n.language === 'sv' ? 'bg-primary text-white' : 'bg-gray-200'
        }`}
        onClick={() => changeLanguage('sv')}
      >
        Svenska
      </button>
      <span className="text-gray-400">|</span>
      <button
        className={`px-2 py-1 text-sm rounded ${
          i18n.language === 'en' ? 'bg-primary text-white' : 'bg-gray-200'
        }`}
        onClick={() => changeLanguage('en')}
      >
        English
      </button>
    </div>
  );
};

export default LanguageSwitcher; 