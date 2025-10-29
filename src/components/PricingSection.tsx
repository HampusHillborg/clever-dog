import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { FaDog, FaWalking, FaCalendarAlt, FaBed, FaCalendarWeek } from 'react-icons/fa';

interface PricingSectionProps {
  location?: string;
}

interface PricingItem {
  title: string;
  icon: React.ReactElement;
  price: string;
  description: string;
  details: string;
  type: 'monthly' | 'single';
  holidayPrice?: string;
  isGroupWalk?: boolean;
  extraInfo?: string;
}

const PricingSection: React.FC<PricingSectionProps> = ({ location }) => {
  const { t } = useTranslation();

  // Updated pricing data - show all services for both locations
  const pricingData: PricingItem[] = [
    {
      title: t('pricing.fullMonth'),
      icon: <FaCalendarAlt />,
      price: '3500',
      description: t('pricing.fiveDaysWeek'),
      details: '07:00 - 18:00 (Fre 07:00 - 17:00)',
      type: 'monthly'
    },
    {
      title: t('pricing.partTime'),
      icon: <FaCalendarWeek />,
      price: '2500',
      description: t('pricing.twoDaysWeek'),
      details: '07:00 - 18:00 (Fre 07:00 - 17:00)',
      type: 'monthly'
    },
    {
      title: t('pricing.singleDay'),
      icon: <FaDog />,
      price: '300',
      description: t('pricing.oneDay'),
      details: '07:00 - 18:00 (Fre 07:00 - 17:00)',
      type: 'single'
    },
    {
      title: t('pricing.walkOnly'),
      icon: <FaWalking />,
      price: '300',
      description: '1-1,5 h',
      details: t('pricing.socialWalk'),
      type: 'single',
      isGroupWalk: true
    },
    {
      title: t('pricing.boarding'),
      icon: <FaBed />,
      price: '400',
      description: t('pricing.overnight'),
      details: t('pricing.boardingCheckIn', 'Incheckning pensionat: 10-12 och 15-17'),
      type: 'single',
      holidayPrice: '800',
      extraInfo: t('pricing.boardingExtraFee', 'Andra tider mot tillägg 200 kr per påbörjad timme')
    }
  ];

  // Filter by type for layout and location
  const monthlyPlans = pricingData.filter(item => item.type === 'monthly');
  const singleServices = pricingData.filter(item => item.type === 'single');
  

  return (
    <section id="pricing" className="section bg-light">
      <div className="container">
        <motion.h2 
          className="section-title"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {t('pricing.title')}
        </motion.h2>
        
        <div className="mb-8">
          <h3 className="text-xl font-bold text-center mb-6">{t('pricing.monthlyTitle')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {monthlyPlans.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-lg shadow-md overflow-hidden"
              >
                <div className="p-6 text-center">
                  <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
                    <span className="text-primary text-2xl">{item.icon}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-gray-600 mb-2">{item.description}</p>
                  <p className="text-gray-500 text-sm mb-4">{item.details}</p>
                  <div className="text-3xl font-bold text-primary mb-1">
                    {item.price} {t('pricing.currency')}
                  </div>
                  <p className="text-sm text-gray-600">{t('pricing.perMonth')}</p>
                  <p className="text-sm text-red-600 mt-2 font-medium">{t('pricing.closedOnHolidays')}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-xl font-bold text-center mb-6">{t('pricing.singleTitle')}</h3>
          <div className={`grid grid-cols-1 gap-6 ${singleServices.length === 2 ? 'md:grid-cols-2 max-w-4xl mx-auto' : 'md:grid-cols-3'}`}>
            {singleServices.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-lg shadow-md overflow-hidden"
              >
                <div className="p-6 text-center">
                  <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
                    <span className="text-primary text-2xl">{item.icon}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-gray-600 mb-2">{item.description}</p>
                  <p className="text-gray-500 text-sm mb-4">{item.details}</p>
                  <div className="text-3xl font-bold text-primary mb-1">
                    {item.price} {t('pricing.currency')}
                  </div>
                  {item.holidayPrice ? (
                    <>
                      <p className="text-sm text-gray-600 mb-4">{t('pricing.per24h')}</p>
                      {item.extraInfo && (
                        <div className="mb-3 p-2 bg-orange-50 rounded-md border border-orange-200">
                          <p className="text-xs text-orange-700 font-medium">{item.extraInfo}</p>
                        </div>
                      )}
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-sm font-medium text-gray-700">{t('pricing.holidayRate')}</p>
                        <div className="text-lg font-bold text-secondary">
                          {item.holidayPrice} {t('pricing.currency')}
                        </div>
                        <p className="text-xs text-gray-500">{t('pricing.holidayDescription')}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600">{t('pricing.perOccasion')}</p>
                      {item.isGroupWalk && (
                        <p className="text-xs text-gray-500 mt-2">* {t('pricing.walkNote')}</p>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div 
          className="mt-12 p-6 bg-white rounded-lg shadow-md text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-lg">
            {t('pricing.notes')}
            <br />
            {t('pricing.contactNote')}
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection; 