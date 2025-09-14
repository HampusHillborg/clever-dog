import React from 'react';
import { useTranslation } from 'react-i18next';

const StaffanstorpLocationSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t('contact.location')}
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              {t('footer.welcomeDogs')} {t('footer.areasList')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StaffanstorpLocationSection;
