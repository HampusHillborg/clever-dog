import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaEnvelope, FaHeart, FaUsers, FaHandsHelping } from 'react-icons/fa';

const WorkWithUsSection: React.FC = () => {
  const { t } = useTranslation();

  const benefits = [
    {
      icon: FaHeart,
      title: t('workWithUs.benefits.passion.title'),
      description: t('workWithUs.benefits.passion.description')
    },
    {
      icon: FaUsers,
      title: t('workWithUs.benefits.team.title'),
      description: t('workWithUs.benefits.team.description')
    },
    {
      icon: FaHandsHelping,
      title: t('workWithUs.benefits.growth.title'),
      description: t('workWithUs.benefits.growth.description')
    }
  ];

  return (
    <section id="work-with-us" className="py-16 bg-gradient-to-br from-orange-50 to-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('workWithUs.title')}
          </h2>
          <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
            {t('workWithUs.subtitle')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-lg">
                <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <benefit.icon className="text-white text-2xl" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {benefit.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-orange-100 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              {t('workWithUs.cta.title')}
            </h3>
            <p className="text-gray-700 mb-6">
              {t('workWithUs.cta.description')}
            </p>
            <div className="bg-white rounded-xl p-6 border-2 border-orange-200">
              <div className="text-center">
                <p className="text-lg font-semibold mb-4 text-gray-700">{t('workWithUs.cta.sendTo')}</p>
                <a
                  href="mailto:cleverdog.aw@gmail.com?subject=Ansökan om anställning - Clever Dog&body=Hej!%0A%0AJag är intresserad av att jobba hos er på Clever Dog.%0A%0ABerätta gärna mer om er och era öppna positioner.%0A%0AMvh"
                  className="inline-flex items-center space-x-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <FaEnvelope className="text-xl" />
                  <span className="text-lg">cleverdog.aw@gmail.com</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkWithUsSection;
