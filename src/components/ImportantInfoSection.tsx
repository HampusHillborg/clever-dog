import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaShieldAlt, FaHome, FaHeart, FaCertificate } from 'react-icons/fa';

const ImportantInfoSection: React.FC = () => {
  const { t } = useTranslation();

  const infoSections = [
    {
      icon: FaShieldAlt,
      title: t('importantInfo.vaccination.title'),
      content: t('importantInfo.vaccination.content')
    },
    {
      icon: FaHeart,
      title: t('importantInfo.health.title'),
      content: t('importantInfo.health.content')
    },
    {
      icon: FaHome,
      title: t('importantInfo.requirements.title'),
      content: t('importantInfo.requirements.content')
    },
    {
      icon: FaCertificate,
      title: t('importantInfo.approval.title'),
      content: t('importantInfo.approval.content')
    }
  ];

  return (
    <section id="important-info" className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t('importantInfo.title')}
            </h2>
            <p className="text-lg text-gray-600">
              {t('importantInfo.subtitle')}
            </p>
          </div>

          <div className="space-y-8">
            {infoSections.map((section, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-lg">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <section.icon className="text-white text-xl" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      {section.title}
                    </h3>
                    <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {section.content}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ImportantInfoSection;
