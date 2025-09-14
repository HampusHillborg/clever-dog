import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FaMapMarkerAlt, FaArrowRight } from 'react-icons/fa';
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
      description: 'Etablerat hunddagis & pensionat',
      gradient: 'from-orange-400 to-orange-600',
      hoverGradient: 'from-orange-500 to-orange-700',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
    },
    {
      id: 'malmo',
      name: 'Malmö Jägersro',
      description: 'Modernt hunddagis i Malmö',
      gradient: 'from-blue-400 to-blue-600',
      hoverGradient: 'from-blue-500 to-blue-700',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    }
  ];

  const handleLocationSelect = (locationId: string) => {
    navigate(`/${locationId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img src={dogLogo} alt="Clever Dog" className="h-10 w-auto mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Clever Dog</h1>
                <p className="text-gray-500 text-sm">Professionell hundomsorg i Skåne</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-1">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Logo */}
            <div className="mb-8">
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-white to-orange-50 flex items-center justify-center shadow-lg border-2 border-white">
                <img src={dogLogo} alt="Clever Dog" className="h-12 w-auto" />
              </div>
            </div>
            
            {/* Title */}
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Välkommen till Clever Dog
            </h1>
            <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
              Välj din närmaste plats för professionell hundomsorg
            </p>

            {/* Location Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              {locations.map((location, index) => (
                <motion.button
                  key={location.id}
                  onClick={() => handleLocationSelect(location.id)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  className="group relative w-full"
                >
                  <div className="relative bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-300 p-8">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-5">
                      <div className={`absolute inset-0 bg-gradient-to-br ${location.gradient}`}></div>
                    </div>
                    
                    {/* Content */}
                    <div className="relative z-10">
                      {/* Icon */}
                      <div className="flex items-center justify-center mb-6">
                        <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${location.gradient} flex items-center justify-center shadow-lg`}>
                          <FaMapMarkerAlt className="text-white text-2xl" />
                        </div>
                      </div>
                      
                      {/* Location Info */}
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">
                        {location.name}
                      </h3>
                      
                      <p className="text-gray-600 mb-6">
                        {location.description}
                      </p>
                      
                      {/* Action Button */}
                      <div className={`inline-flex items-center space-x-2 bg-gradient-to-r ${location.gradient} text-white px-6 py-3 rounded-full font-medium group-hover:scale-105 transition-transform duration-300`}>
                        <span>Besök denna plats</span>
                        <FaArrowRight className="text-sm" />
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200">
        <div className="max-w-4xl mx-auto text-center py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center space-x-3">
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
