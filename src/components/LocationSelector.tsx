import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FaMapMarkerAlt, FaClock, FaPhone, FaEnvelope, FaArrowRight, FaBuilding, FaStar, FaHeart, FaPaw, FaRocket, FaCircle } from 'react-icons/fa';
import { motion } from 'framer-motion';
import LanguageSwitcher from './LanguageSwitcher';
import dogLogo from '../assets/images/logos/Logo.png';

const LocationSelector: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const locations = [
    {
      id: 'staffanstorp',
      name: 'Staffanstorp',
      subtitle: t('locationSelector.staffanstorp.subtitle'),
      description: t('locationSelector.staffanstorp.description'),
      address: 'Malmövägen 7, 245 32 Staffanstorp',
      services: [
        t('locationSelector.staffanstorp.services.daycare'),
        t('locationSelector.staffanstorp.services.boarding'),
        t('locationSelector.staffanstorp.services.grooming'),
        t('locationSelector.staffanstorp.services.socialWalks')
      ],
      status: 'open',
      statusText: t('locationSelector.staffanstorp.status'),
      phone: '+46 xxx xxx xxx',
      email: 'staffanstorp@cleverdog.se',
      gradient: 'from-orange-400 to-orange-600',
      hoverGradient: 'from-orange-500 to-orange-700',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      bgImage: 'bg-gradient-to-br from-orange-50 to-orange-100',
      rating: 4.9,
      reviews: 127,
      established: '2020'
    },
    {
      id: 'malmo',
      name: 'Malmö Jägersro',
      subtitle: t('locationSelector.malmo.subtitle'),
      description: t('locationSelector.malmo.description'),
      address: 'Sadelgatan 6, 213 77 Malmö',
      services: [
        t('locationSelector.malmo.services.daycare'),
        t('locationSelector.malmo.services.socialWalks'),
        t('locationSelector.malmo.services.training')
      ],
      status: 'open',
      statusText: t('locationSelector.malmo.status'),
      phone: '+46 xxx xxx xxx',
      email: 'malmo@cleverdog.se',
      gradient: 'from-blue-400 to-blue-600',
      hoverGradient: 'from-blue-500 to-blue-700',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      bgImage: 'bg-gradient-to-br from-blue-50 to-blue-100',
      rating: 4.8,
      reviews: 89,
      established: '2024'
    }
  ];

  const handleLocationSelect = (locationId: string) => {
    navigate(`/${locationId}`);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Award-Winning Hero Background */}
      <div className="absolute inset-0">
        {/* Primary Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-orange-100"></div>
        
        {/* Hero Dog Silhouettes - Decorative Background */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Large Dog Silhouette - Top Right */}
          <div className="absolute -top-20 -right-32 w-96 h-96 opacity-[0.04]">
            <svg viewBox="0 0 400 400" className="w-full h-full text-orange-600">
              <path fill="currentColor" d="M120 80c-20 0-35 15-35 35v40c0 15 10 25 25 30l-5 15c-2 8 3 15 12 15h15c8 0 15-7 15-15v-10h40v10c0 8 7 15 15 15h15c9 0 14-7 12-15l-5-15c15-5 25-15 25-30v-40c0-20-15-35-35-35H120zm40 40c8 0 15 7 15 15s-7 15-15 15-15-7-15-15 7-15 15-15zm80 0c8 0 15 7 15 15s-7 15-15 15-15-7-15-15 7-15 15-15zM80 220c-15 0-25 10-25 25v80c0 15 10 25 25 25h20v30c0 10 8 18 18 18s18-8 18-18v-30h60v30c0 10 8 18 18 18s18-8 18-18v-30h20c15 0 25-10 25-25v-80c0-15-10-25-25-25H80z"/>
            </svg>
          </div>
          
          {/* Medium Dog Silhouette - Bottom Left */}
          <div className="absolute -bottom-16 -left-24 w-72 h-72 opacity-[0.03] rotate-12">
            <svg viewBox="0 0 300 300" className="w-full h-full text-orange-500">
              <path fill="currentColor" d="M150 50c-25 0-45 20-45 45 0 15 7 28 18 36v24c0 12-10 22-22 22s-22-10-22-22v-20c0-8-7-15-15-15s-15 7-15 15v20c0 28 22 50 50 50h70c28 0 50-22 50-50v-20c0-8-7-15-15-15s-15 7-15 15v20c0 12-10 22-22 22s-22-10-22-22v-24c11-8 18-21 18-36 0-25-20-45-45-45zm-20 45c0-5 4-9 9-9s9 4 9 9-4 9-9 9-9-4-9-9zm40 0c0-5 4-9 9-9s9 4 9 9-4 9-9 9-9-4-9-9z"/>
            </svg>
          </div>
          
          {/* Small Paw Prints Pattern */}
          <div className="absolute top-32 left-20 opacity-[0.02]">
            <div className="grid grid-cols-8 gap-8 rotate-12">
              {[...Array(32)].map((_, i) => (
                <svg key={i} className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              ))}
            </div>
          </div>
        </div>
        
        {/* Gradient Overlays for Depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/30"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-orange-100/20 via-transparent to-transparent"></div>
        
        {/* Floating Geometric Elements */}
        <div className="absolute top-20 right-32 w-32 h-32 bg-gradient-to-br from-orange-200 to-orange-300 rounded-full opacity-20 blur-2xl animate-pulse"></div>
        <div className="absolute bottom-32 left-32 w-24 h-24 bg-gradient-to-br from-orange-300 to-orange-400 rounded-full opacity-15 blur-xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full opacity-10 blur-lg animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Simple Header */}
      <header className="relative z-10 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img src={dogLogo} alt="Clever Dog" className="h-10 w-auto mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Clever Dog
                </h1>
                <p className="text-gray-500 text-sm">{t('locationSelector.tagline')}</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-1">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Compact Welcome Section */}
            <div className="mb-8">
              {/* Simple Logo */}
              <div className="mb-8">
                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-white to-orange-50 flex items-center justify-center shadow-lg border-2 border-white">
                  <img src={dogLogo} alt="Clever Dog" className="h-12 w-auto" />
                </div>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
                {t('locationSelector.hero.title')}
              </h1>
              <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
                Välj din närmaste plats för professionell hundomsorg
              </p>
            </div>

            {/* Location Selection */}
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  Välj din plats
                </h2>
                <div className="w-16 h-0.5 bg-gradient-to-r from-orange-500 to-orange-600 mx-auto rounded-full"></div>
              </div>
              
                  <div className="flex justify-center max-w-lg mx-auto">
                    {/* Only show Staffanstorp for now */}
                    <motion.button
                      onClick={() => handleLocationSelect('staffanstorp')}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      whileHover={{ scale: 1.05, y: -5 }}
                      whileTap={{ scale: 0.95 }}
                      className="group relative w-full"
                    >
                      {/* Simple Card */}
                      <div className="relative bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 p-6">
                        {/* Location Icon */}
                        <div className="flex items-center justify-center mb-4">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg">
                            <FaMapMarkerAlt className="text-white text-xl" />
                          </div>
                        </div>
                        
                        {/* Location Info */}
                        <div className="text-center">
                          <h3 className="text-xl font-bold text-gray-900 mb-2">
                            Staffanstorp
                          </h3>
                          
                          <p className="text-gray-600 text-sm mb-4">
                            Malmövägen 7, 245 32 Staffanstorp
                          </p>
                          
                          {/* Status */}
                          <div className="inline-flex items-center space-x-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-medium mb-4">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>Öppet nu</span>
                          </div>
                          
                          {/* Action Text */}
                          <div className="text-sm font-medium bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300">
                            Klicka för att besöka →
                          </div>
                        </div>
                      </div>
                    </motion.button>
              </div>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-gray-500 text-sm mt-8"
              >
                Klicka på din föredragna plats för att komma till hunddagiset
              </motion.p>
            </div>
          </motion.div>
        </div>
      </main>

          {/* Simple Footer */}
          <footer className="relative z-10 bg-white border-t border-gray-200 mt-12">
            <div className="max-w-4xl mx-auto text-center py-6 px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-center space-x-3 mb-3">
                <img src={dogLogo} alt="Clever Dog" className="h-6 w-auto" />
                <p className="text-gray-600 font-medium">
                  © 2025 Clever Dog - Professionell hundomsorg med hjärta
                </p>
              </div>
            </div>
          </footer>
    </div>
  );
};

export default LocationSelector;
