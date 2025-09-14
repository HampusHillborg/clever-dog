import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaMapMarkerAlt, FaPhone, FaEnvelope, FaInstagram, FaFacebook } from 'react-icons/fa';

const MalmoAboutSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section id="about" className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t('about.title')} - Malmö
            </h2>
            <p className="text-lg text-gray-600">
              {t('locationSelector.malmo.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div>
              <div className="mb-8">
                <p className="text-gray-700 mb-4 leading-relaxed">
                  {t('about.bioMalmo')}
                </p>
                <p className="text-gray-700 mb-4 leading-relaxed">
                  {t('about.bio2Malmo')}
                </p>
                <p className="text-gray-700 mb-6 leading-relaxed">
                  {t('about.bio3Malmo')}
                </p>
              </div>

              {/* Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-orange-50 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-900 mb-2">{t('pricing.daycare')}</h4>
                  <p className="text-sm text-orange-700">
                    {t('locationSelector.malmo.services.daycare')}
                  </p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-900 mb-2">{t('pricing.partTime')}</h4>
                  <p className="text-sm text-orange-700">
                    {t('pricing.twoDaysWeek')} / {t('pricing.threeDaysWeek')}
                  </p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-900 mb-2">{t('pricing.socialWalk')}</h4>
                  <p className="text-sm text-orange-700">
                    {t('locationSelector.malmo.services.socialWalks')}
                  </p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-900 mb-2">{t('locationSelector.malmo.services.training')}</h4>
                  <p className="text-sm text-orange-700">
                    {t('locationSelector.malmo.services.training')}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
                {t('contact.title')}
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                    <FaMapMarkerAlt className="text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{t('about.address')}</p>
                    <p className="text-gray-600">Sadelgatan 6, 213 77 Malmö</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                    <FaPhone className="text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Telefon</p>
                    <p className="text-gray-600">+46 xxx xxx xxx</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                    <FaEnvelope className="text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{t('about.email')}</p>
                    <p className="text-gray-600">cleverdog.aw@gmail.com</p>
                  </div>
                </div>
              </div>

              {/* Social Media */}
              <div className="mt-6 pt-6 border-t border-orange-200">
                <p className="text-center text-gray-600 mb-4">{t('social.followUs')}</p>
                <div className="flex justify-center space-x-4">
                  <a 
                    href="#" 
                    className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center hover:bg-orange-600 transition-colors"
                  >
                    <FaInstagram className="text-white" />
                  </a>
                  <a 
                    href="#" 
                    className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center hover:bg-orange-600 transition-colors"
                  >
                    <FaFacebook className="text-white" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Strategic Location */}
          <div className="mt-12 bg-blue-50 rounded-2xl p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
              {t('footer.locationTitle')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
              <div>
                <h4 className="font-semibold text-blue-900 mb-2">Malmö Centrum</h4>
                <p className="text-blue-700">Centralt läge på Sadelgatan 6</p>
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
          <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
            <p className="text-green-800 text-center">
              {t('pricing.countyBoard')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MalmoAboutSection;
