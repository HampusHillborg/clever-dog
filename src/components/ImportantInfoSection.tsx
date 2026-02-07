import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaShieldAlt, FaHome, FaHeart, FaCertificate } from 'react-icons/fa';
import { motion } from 'framer-motion';
import FloatingPaws from './shared/FloatingPaws';

const cardHoverSpring = { type: 'spring' as const, stiffness: 300, damping: 20 };

const ImportantInfoSection: React.FC = () => {
  const { t } = useTranslation();

  const infoSections = [
    {
      icon: FaShieldAlt,
      title: t('importantInfo.vaccination.title'),
      content: t('importantInfo.vaccination.content')
    },
    {
      icon: FaHeart,
      title: t('importantInfo.health.title'),
      content: t('importantInfo.health.content')
    },
    {
      icon: FaHome,
      title: t('importantInfo.requirements.title'),
      content: t('importantInfo.requirements.content')
    },
    {
      icon: FaCertificate,
      title: t('importantInfo.approval.title'),
      content: t('importantInfo.approval.content')
    }
  ];

  return (
    <section id="important-info" className="py-16 bg-gray-50 section-with-paws">
      <FloatingPaws count={15} color="#F97316" opacity={0.18} />
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t('importantInfo.title')}
            </h2>
            <p className="text-lg text-gray-600">
              {t('importantInfo.subtitle')}
            </p>
          </div>

          <div className="space-y-8">
            {infoSections.map((section, index) => (
              <motion.div
                key={index}
                className="fun-card-hover p-8"
                whileHover={{ scale: 1.02, y: -4 }}
                transition={cardHoverSpring}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <div className="flex items-start space-x-4">
                  <div className="icon-circle">
                    <section.icon className="text-white text-xl" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      {section.title}
                    </h3>
                    <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {section.content}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ImportantInfoSection;
