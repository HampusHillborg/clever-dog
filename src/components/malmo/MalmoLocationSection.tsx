import React from 'react';
import { useTranslation } from 'react-i18next';

const MalmoLocationSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Strategic Location */}
          <div className="bg-blue-50 rounded-2xl p-8 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
              {t('footer.locationTitle')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
              <div>
                <h4 className="font-semibold text-blue-900 mb-2">Jägersro, Malmö</h4>
                <p className="text-blue-700">Centralt läge i Malmö</p>
              </div>
              <div>
                <h4 className="font-semibold text-blue-900 mb-2">Lättillgängligt</h4>
                <p className="text-blue-700">Perfekt för Malmöområdet</p>
              </div>
            </div>
            <p className="text-center text-blue-700 mt-4 text-sm">
              {t('footer.welcomeDogs')} Malmöområdet inklusive Limhamn, Hyllie, Oxie, Husie och närliggande områden.
            </p>
          </div>

          {/* Permission Notice */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <p className="text-green-800 text-center">
              {t('pricing.countyBoard')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MalmoLocationSection;
