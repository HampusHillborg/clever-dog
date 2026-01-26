import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaCalendarAlt, FaDog, FaCut, FaBed } from 'react-icons/fa';
import { IconType } from 'react-icons';

interface ServiceItem {
  icon: IconType;
  title: string;
  details: string[];
  price: string;
  period: string;
  note?: string;
  holidayRate?: string;
  holidayPrice?: string;
  holidayDetails?: string;
  withFoodPrice?: string;
}

const StaffanstorpPricingSection: React.FC = () => {
  const { t } = useTranslation();

  const passes: ServiceItem[] = [
    {
      icon: FaCalendarAlt,
      title: t('pricing.fullMonth'),
      details: [
        t('pricing.fiveDaysWeek'),
        t('pricing.openingHours')
      ],
      price: '3700',
      period: t('pricing.perMonth'),
      note: t('pricing.closedOnHolidays'),
      withFoodPrice: '3850'
    },
    {
      icon: FaCalendarAlt,
      title: t('pricing.partTime3Days'),
      details: [
        t('pricing.threeDaysWeek'),
        t('pricing.openingHours')
      ],
      price: '3100',
      period: t('pricing.perMonth'),
      note: t('pricing.closedOnHolidays'),
      withFoodPrice: '3250'
    },
    {
      icon: FaCalendarAlt,
      title: t('pricing.partTime2Days'),
      details: [
        t('pricing.twoDaysWeek'),
        t('pricing.openingHours')
      ],
      price: '2800',
      period: t('pricing.perMonth'),
      note: t('pricing.closedOnHolidays')
    }
  ];

  const individualServices: ServiceItem[] = [
    {
      icon: FaDog,
      title: t('pricing.singleDay'),
      details: [
        t('pricing.oneDay'),
        t('pricing.openingHours')
      ],
      price: '350',
      period: t('pricing.perOccasion')
    },
    {
      icon: FaCut,
      title: t('pricing.nailClipping'),
      details: [
        t('pricing.nailClippingDesc')
      ],
      price: '160',
      period: t('pricing.perOccasion')
    },
    {
      icon: FaBed,
      title: t('pricing.boarding'),
      details: [
        t('pricing.overnight')
      ],
      price: '400',
      period: t('pricing.per24h'),
      holidayRate: t('pricing.holidayRate'),
      holidayPrice: '800',
      holidayDetails: t('pricing.holidayDescription')
    }
  ];

  const groomingServices: ServiceItem[] = [
    {
      icon: FaCut,
      title: t('pricing.groomingServices'),
      details: [
        t('pricing.comingSoon')
      ],
      price: '',
      period: ''
    }
  ];

  return (
    <section id="pricing" className="py-16 bg-gradient-to-br from-orange-50 to-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('pricing.title')} - Staffanstorp
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('pricing.notes')}
          </p>
        </div>

        {/* Passes Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
          {passes.map((pass, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <pass.icon className="text-white text-2xl" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{pass.title}</h3>
                <div className="space-y-1 text-gray-600">
                  {pass.details.map((detail, idx) => (
                    <p key={idx} className="text-sm">{detail}</p>
                  ))}
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-500 mb-1">{pass.price} SEK</div>
                {pass.withFoodPrice && (
                  <div className="text-lg font-semibold text-gray-700 mb-1">{pass.withFoodPrice} SEK {t('pricing.withFood', 'med mat')}</div>
                )}
                <div className="text-sm text-gray-500 mb-4">{pass.period}</div>
                <p className="text-xs text-red-500">{pass.note}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Individual Services Section */}
        <div className="max-w-4xl mx-auto mb-12">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">{t('pricing.individualServices')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {individualServices.map((service, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <div className="text-center mb-4">
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <service.icon className="text-white text-lg" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-3">{service.title}</h4>
                  <div className="space-y-1 text-gray-600">
                    {service.details.map((detail, idx) => (
                      <p key={idx} className="text-sm">{detail}</p>
                    ))}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-500 mb-1">{service.price} SEK</div>
                  <div className="text-sm text-gray-500 mb-3">{service.period}</div>
                  {service.holidayRate && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-600 mb-1">{service.holidayRate}</p>
                      <div className="text-xl font-bold text-green-500 mb-1">{service.holidayPrice} SEK</div>
                      <p className="text-xs text-gray-500">{service.holidayDetails}</p>
                    </div>
                  )}
                  {service.note && (
                    <p className="text-xs text-gray-500 mt-2">{service.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Grooming Services Section */}
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">{t('pricing.groomingServices')}</h3>
          <div className="grid grid-cols-1 gap-6">
            {groomingServices.map((service, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <div className="text-center mb-4">
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <service.icon className="text-white text-lg" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-3">{service.title}</h4>
                  <div className="space-y-1 text-gray-600">
                    {service.details.map((detail, idx) => (
                      <p key={idx} className="text-sm">{detail}</p>
                    ))}
                  </div>
                </div>
                <div className="text-center">
                  {service.price ? (
                    <>
                      <div className="text-2xl font-bold text-orange-500 mb-1">{service.price} SEK</div>
                      <div className="text-sm text-gray-500 mb-3">{service.period}</div>
                    </>
                  ) : (
                    <div className="text-2xl font-bold text-orange-500 mb-1">{t('pricing.comingSoon')}</div>
                  )}
                  {service.note && (
                    <p className="text-xs text-gray-500 mt-2">{service.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Information */}
        <div className="mt-12 bg-orange-50 rounded-2xl p-6 max-w-4xl mx-auto">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            {t('pricing.importantInfo')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <p className="mb-2">
                {t('pricing.familyDiscount')}
              </p>
              <p className="mb-2">
                {t('pricing.payment')}
              </p>
              <p className="mb-2">
                <strong>{t('pricing.boardingCheckIn')}</strong>
              </p>
            </div>
            <div>
              <p className="mb-2">
                {t('pricing.cancellation')}
              </p>
              <p className="mb-2">
                <strong>{t('pricing.boardingExtraFee')}</strong>
              </p>
              <p className="mb-2">
                {t('pricing.contactEmail')}
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-8">
          <p className="text-gray-600 mb-4">
            {t('pricing.contactNote')}
          </p>
          <a 
            href="#contact" 
            className="inline-flex items-center bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-3 rounded-full font-medium hover:from-orange-600 hover:to-orange-700 transition-all duration-300"
          >
            {t('pricing.contactForInfo')}
          </a>
        </div>
      </div>
    </section>
  );
};

export default StaffanstorpPricingSection;
