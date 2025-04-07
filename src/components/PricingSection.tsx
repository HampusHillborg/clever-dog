import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { FaDog, FaClock, FaWalking } from 'react-icons/fa';

const PricingSection: React.FC = () => {
  const { t } = useTranslation();

  // Placeholder pricing data
  const pricingData = [
    {
      title: t('pricing.fullDay'),
      icon: <FaDog />,
      price: '300',
      description: '08:00 - 17:00',
      discount: '4500',
      discountPeriod: t('pricing.perMonth')
    },
    {
      title: t('pricing.halfDay'),
      icon: <FaClock />,
      price: '200',
      description: '08:00 - 13:00 / 12:00 - 17:00',
      discount: '3000',
      discountPeriod: t('pricing.perMonth')
    },
    {
      title: t('pricing.walkOnly'),
      icon: <FaWalking />,
      price: '150',
      description: '30-60 min',
      discount: '2200',
      discountPeriod: t('pricing.perMonth')
    }
  ];

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pricingData.map((item, index) => (
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
                <p className="text-gray-600 mb-4">{item.description}</p>
                <div className="text-3xl font-bold text-primary mb-1">
                  {item.price} {t('pricing.currency')}
                </div>
                <p className="text-sm text-gray-600 mb-4">{t('pricing.perDay')}</p>
                
                <div className="pt-4 mt-4 border-t border-gray-100">
                  <p className="text-gray-700 font-medium mb-1">
                    {t('pricing.discount')}:
                  </p>
                  <div className="text-xl font-bold text-secondary">
                    {item.discount} {t('pricing.currency')}
                  </div>
                  <p className="text-sm text-gray-600">{item.discountPeriod}</p>
                </div>
              </div>
            </motion.div>
          ))}
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