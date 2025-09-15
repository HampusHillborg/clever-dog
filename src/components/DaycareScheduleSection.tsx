import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaClock, FaUtensils, FaBed, FaPlay, FaUsers, FaHome } from 'react-icons/fa';

const DaycareScheduleSection: React.FC = () => {
  const { t } = useTranslation();

  const scheduleItems = [
    {
      time: '07:00 - 09:00',
      icon: FaClock,
      title: t('schedule.dropOff.title'),
      description: t('schedule.dropOff.description'),
      color: 'bg-blue-500'
    },
    {
      time: '09:00 - 11:45',
      icon: FaPlay,
      title: t('schedule.morningActivities.title'),
      description: t('schedule.morningActivities.description'),
      color: 'bg-green-500'
    },
    {
      time: '11:45 - 13:00',
      icon: FaUtensils,
      title: t('schedule.lunch.title'),
      description: t('schedule.lunch.description'),
      color: 'bg-orange-500'
    },
    {
      time: '13:00 - 15:00',
      icon: FaUsers,
      title: t('schedule.afternoonActivities.title'),
      description: t('schedule.afternoonActivities.description'),
      color: 'bg-purple-500'
    },
    {
      time: '15:00 - 17:00',
      icon: FaBed,
      title: t('schedule.quietTime.title'),
      description: t('schedule.quietTime.description'),
      color: 'bg-indigo-500'
    },
    {
      time: '15:00 - 18:00',
      icon: FaHome,
      title: t('schedule.pickup.title'),
      description: t('schedule.pickup.description'),
      color: 'bg-red-500'
    }
  ];

  return (
    <section id="daycare-schedule" className="py-16 bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t('schedule.title')}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t('schedule.subtitle')}
            </p>
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 via-green-500 via-orange-500 via-purple-500 via-indigo-500 to-red-500 rounded-full"></div>
            
            <div className="space-y-8">
              {scheduleItems.map((item, index) => (
                <div key={index} className="relative flex items-start">
                  {/* Timeline dot */}
                  <div className={`absolute left-6 w-4 h-4 ${item.color} rounded-full border-4 border-white shadow-lg z-10`}></div>
                  
                  {/* Content card */}
                  <div className="ml-16 bg-white rounded-2xl shadow-lg p-6 flex-1 hover:shadow-xl transition-shadow duration-300">
                    <div className="flex items-start space-x-4">
                      <div className={`w-12 h-12 ${item.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <item.icon className="text-white text-xl" />
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
                          <h3 className="text-xl font-bold text-gray-900 mb-2 sm:mb-0">
                            {item.title}
                          </h3>
                          <span className="text-lg font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                            {item.time}
                          </span>
                        </div>
                        <p className="text-gray-700 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional info box */}
          <div className="mt-12 bg-orange-50 border border-orange-200 rounded-2xl p-8">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {t('schedule.additionalInfo.title')}
              </h3>
              <p className="text-gray-700 leading-relaxed max-w-3xl mx-auto">
                {t('schedule.additionalInfo.content')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DaycareScheduleSection;
