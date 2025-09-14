import React from 'react';
import { useTranslation } from 'react-i18next';

const MalmoTeamSection: React.FC = () => {
  const { t } = useTranslation();

  const teamMembers = [
    {
      name: 'Alicja W',
      role: t('pricing.team.alicja.role'),
      description: t('pricing.team.alicja.description'),
      dog: t('pricing.team.alicja.dog')
    },
    {
      name: 'Hampus H',
      role: t('pricing.team.hampus.role'),
      description: t('pricing.team.hampus.description'),
      dog: t('pricing.team.hampus.dog')
    },
    {
      name: 'Paulina M',
      role: t('pricing.team.paulina.role'),
      description: t('pricing.team.paulina.description'),
      dog: t('pricing.team.paulina.dog')
    }
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t('pricing.team.title')}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t('pricing.team.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{member.name}</h3>
                <p className="text-orange-600 font-semibold mb-4">{member.role}</p>
                <p className="text-gray-700 mb-4 leading-relaxed">{member.description}</p>
                <div className="bg-orange-50 rounded-lg p-4">
                  <p className="text-sm text-orange-800">
                    <span className="font-semibold">{t('pricing.team.dog')}:</span> {member.dog}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default MalmoTeamSection;
