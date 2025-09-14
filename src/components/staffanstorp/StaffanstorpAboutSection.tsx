import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaMapMarkerAlt, FaPhone, FaEnvelope, FaInstagram, FaFacebook } from 'react-icons/fa';

const StaffanstorpAboutSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section id="about" className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t('about.title')} - Staffanstorp
            </h2>
            <p className="text-lg text-gray-600">
              {t('locationSelector.staffanstorp.subtitle')}
            </p>
          </div>

          {/* Biography Section */}
          <div className="mb-12">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                {t('about.bio')}
              </p>
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                {t('about.bio2')}
              </p>
              <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                {t('about.bio3')}
              </p>
            </div>
          </div>

          {/* Services and Contact Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Services */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center lg:text-left">
                {t('pricing.ourServices')}
              </h3>
              <div className="space-y-4">
                <div className="bg-orange-50 rounded-xl p-6 flex items-center space-x-4">
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-lg">🐕</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-orange-900 mb-1">{t('pricing.daycare')}</h4>
                    <p className="text-sm text-orange-700">
                      {t('locationSelector.staffanstorp.services.daycare')}
                    </p>
                  </div>
                </div>
                <div className="bg-orange-50 rounded-xl p-6 flex items-center space-x-4">
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-lg">🏠</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-orange-900 mb-1">{t('pricing.boarding')}</h4>
                    <p className="text-sm text-orange-700">
                      {t('locationSelector.staffanstorp.services.boarding')}
                    </p>
                  </div>
                </div>
                <div className="bg-orange-50 rounded-xl p-6 flex items-center space-x-4">
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-lg">🚶</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-orange-900 mb-1">{t('pricing.socialWalk')}</h4>
                    <p className="text-sm text-orange-700">
                      {t('locationSelector.staffanstorp.services.socialWalks')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                {t('contact.title')}
              </h3>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <FaMapMarkerAlt className="text-white text-lg" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-lg">Address</p>
                    <p className="text-gray-600 mb-1">Malmövägen 7, Staffanstorp</p>
                    <p className="text-orange-600 text-sm font-medium">10 min från Lund | 15 min från Malmö</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <FaEnvelope className="text-white text-lg" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-lg">Email</p>
                    <p className="text-gray-600">cleverdog.aw@gmail.com</p>
                  </div>
                </div>

                <a 
                  href="https://www.instagram.com/cleverdog_hunddagis" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center space-x-4 hover:bg-orange-100 rounded-lg p-2 -m-2 transition-colors"
                >
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <FaInstagram className="text-white text-lg" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-lg">Instagram</p>
                    <p className="text-gray-600">@cleverdog_hunddagis</p>
                  </div>
                </a>

                <a 
                  href="https://www.facebook.com/people/CleverDog/61555454325558/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center space-x-4 hover:bg-orange-100 rounded-lg p-2 -m-2 transition-colors"
                >
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <FaFacebook className="text-white text-lg" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-lg">Facebook</p>
                    <p className="text-gray-600">Clever Dog</p>
                  </div>
                </a>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default StaffanstorpAboutSection;
