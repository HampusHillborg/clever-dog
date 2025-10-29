import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaMapMarkerAlt, FaEnvelope, FaInstagram, FaFacebook, FaDog, FaCalendarAlt, FaCut, FaGraduationCap } from 'react-icons/fa';

const MalmoAboutSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section id="about" className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t('about.aboutUs')} - Malmö
            </h2>
            <p className="text-lg text-gray-600">
              {t('locationSelector.malmo.subtitle')}
            </p>
          </div>

          {/* Biography Section */}
          <div className="mb-12">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                {t('about.bioMalmo')}
              </p>
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                {t('about.bio2Malmo')}
              </p>
              <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                {t('about.bio3Malmo')}
              </p>
            </div>
          </div>

          {/* Services and Contact Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
            {/* Services Section */}
            <div className="flex flex-col">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                {t('pricing.ourServices')}
              </h3>
              <div className="space-y-4 flex-grow">
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-300 flex items-start space-x-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                    <FaDog className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1 text-lg">{t('pricing.daycare')}</h4>
                    <p className="text-sm text-gray-600">
                      Professionell hundomsorg i modern miljö
                    </p>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-300 flex items-start space-x-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                    <FaCalendarAlt className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1 text-lg">{t('pricing.partTime')}</h4>
                    <p className="text-sm text-gray-600">
                      {t('pricing.twoDaysWeek')} / {t('pricing.threeDaysWeek')}
                    </p>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-300 flex items-start space-x-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                    <FaCut className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1 text-lg">{t('locationSelector.malmo.services.grooming')}</h4>
                    <p className="text-sm text-gray-600">
                      Kloklippning, bad och styling
                    </p>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-300 flex items-start space-x-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                    <FaGraduationCap className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1 text-lg">{t('locationSelector.malmo.services.training')}</h4>
                    <p className="text-sm text-gray-600">
                      Professionell hundträning med erfarna tränare
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Section */}
            <div className="flex flex-col">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                {t('contact.title')}
              </h3>
              <div className="space-y-4 flex-grow">
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-300 flex items-start space-x-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                    <FaMapMarkerAlt className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1 text-lg">Address</h4>
                    <p className="text-sm text-gray-600 mb-1">Bellisgatan 13</p>
                    <p className="text-sm text-gray-600">Malmö 21232</p>
                    <p className="text-orange-600 text-xs font-medium mt-2">Centralt läge</p>
                  </div>
                </div>

                <a 
                  href="mailto:cleverdog.malmo@gmail.com"
                  className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 flex items-start space-x-4 group"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform">
                    <FaEnvelope className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1 text-lg">Email</h4>
                    <p className="text-sm text-gray-600 group-hover:text-orange-600 transition-colors break-all">
                      cleverdog.malmo@gmail.com
                    </p>
                  </div>
                </a>

                <a 
                  href="https://www.instagram.com/cleverdog_hunddagis" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 flex items-start space-x-4 group"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform">
                    <FaInstagram className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1 text-lg">Instagram</h4>
                    <p className="text-sm text-gray-600 group-hover:text-orange-600 transition-colors">
                      @cleverdog_hunddagis
                    </p>
                  </div>
                </a>

                <a 
                  href="https://www.facebook.com/people/CleverDog/61555454325558/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 flex items-start space-x-4 group"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform">
                    <FaFacebook className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1 text-lg">Facebook</h4>
                    <p className="text-sm text-gray-600 group-hover:text-orange-600 transition-colors">
                      Clever Dog
                    </p>
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

export default MalmoAboutSection;

