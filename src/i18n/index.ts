import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import svTranslations from './locales/sv.json';
import enTranslations from './locales/en.json';
import plTranslations from './locales/pl.json';

if (!import.meta.env.SSR) i18n.use(LanguageDetector);

i18n
  .use(initReactI18next)
  .init({
    resources: {
      sv: svTranslations,
      en: enTranslations,
      pl: plTranslations,
    },
    fallbackLng: 'sv',
    lng: import.meta.env.SSR ? 'sv' : undefined,
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n; 