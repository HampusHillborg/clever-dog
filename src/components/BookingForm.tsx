import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaTimes } from 'react-icons/fa';

interface BookingFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const BookingForm: React.FC<BookingFormProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dogName: '',
    dogBreed: '',
    dogGender: '',
    dogHeight: '',
    isNeutered: '',
    inquiryType: '',
    additionalInfo: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getEmailService = (email: string): 'gmail' | 'outlook' | 'default' => {
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain?.includes('gmail.com')) return 'gmail';
    if (domain?.includes('outlook.com') || domain?.includes('hotmail.com') || domain?.includes('live.com')) return 'outlook';
    return 'default';
  };

  const isMobileDevice = () => {
    return typeof window !== 'undefined' && 
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = `Booking request from ${formData.name}`;
    const body = `
${t('booking.form.yourName')}: ${formData.name}
${t('booking.form.email')}: ${formData.email}
${t('booking.form.phone')}: ${formData.phone}
${t('booking.form.dogName')}: ${formData.dogName}
${t('booking.form.dogBreed')}: ${formData.dogBreed}
${t('booking.form.dogGender')}: ${formData.dogGender}
${t('booking.form.dogHeight')}: ${formData.dogHeight}
${t('booking.form.isNeutered')}: ${formData.isNeutered}
${t('booking.form.inquiryType')}: ${formData.inquiryType ? t(`booking.form.inquiryOptions.${formData.inquiryType}`) : ''}
${t('booking.form.additionalInfo')}: ${formData.additionalInfo}
    `;
    
    // For mobile devices, always use mailto: protocol to open native mail app
    if (isMobileDevice()) {
      window.location.href = `mailto:cleverdog.aw@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } else {
      // For desktop, continue with the existing email service detection
      const emailService = getEmailService(formData.email);
      
      switch (emailService) {
        case 'gmail':
          const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=cleverdog.aw@gmail.com&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
          window.open(gmailUrl, '_blank');
          break;
        case 'outlook':
          const outlookUrl = `https://outlook.live.com/owa/?path=/mail/action/compose&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}&to=cleverdog.aw@gmail.com`;
          window.open(outlookUrl, '_blank');
          break;
        default:
          window.location.href = `mailto:cleverdog.aw@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      }
    }
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      role="dialog" 
      aria-modal="true"
      aria-labelledby="booking-form-title"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white">
          <h3 id="booking-form-title" className="text-xl font-bold text-gray-900">{t('booking.title')}</h3>
          <button 
            onClick={onClose}
            className="text-gray-700 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100"
            aria-label={t('close')}
          >
            <FaTimes />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Owner Information */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-800">{t('booking.form.yourName')}</label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                placeholder={t('booking.form.yourNamePlaceholder')}
                aria-required="true"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-800">{t('booking.form.email')}</label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                aria-required="true"
              />
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-800">{t('booking.form.phone')}</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
            
            {/* Dog Information */}
            <div>
              <label htmlFor="dogName" className="block text-sm font-medium text-gray-800">{t('booking.form.dogName')}</label>
              <input
                type="text"
                id="dogName"
                name="dogName"
                required
                value={formData.dogName}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                aria-required="true"
              />
            </div>
            
            <div>
              <label htmlFor="dogBreed" className="block text-sm font-medium text-gray-800">{t('booking.form.dogBreed')}</label>
              <input
                type="text"
                id="dogBreed"
                name="dogBreed"
                value={formData.dogBreed}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
            
            <div>
              <label htmlFor="dogGender" className="block text-sm font-medium text-gray-800">{t('booking.form.dogGender')}</label>
              <select
                id="dogGender"
                name="dogGender"
                value={formData.dogGender}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-900"
                aria-describedby="gender-description"
              >
                <option value="">{t('booking.form.selectGender')}</option>
                <option value="male">{t('booking.form.male')}</option>
                <option value="female">{t('booking.form.female')}</option>
              </select>
              <div id="gender-description" className="sr-only">{t('booking.form.genderDescription')}</div>
            </div>
            
            <div>
              <label htmlFor="dogHeight" className="block text-sm font-medium text-gray-800">{t('booking.form.dogHeight')}</label>
              <input
                type="text"
                id="dogHeight"
                name="dogHeight"
                value={formData.dogHeight}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
            
            <div>
              <label htmlFor="isNeutered" className="block text-sm font-medium text-gray-800">{t('booking.form.isNeutered')}</label>
              <select
                id="isNeutered"
                name="isNeutered"
                value={formData.isNeutered}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-900"
              >
                <option value="">{t('booking.form.select')}</option>
                <option value="yes">{t('booking.form.yes')}</option>
                <option value="no">{t('booking.form.no')}</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="inquiryType" className="block text-sm font-medium text-gray-800">{t('booking.form.inquiryType')}</label>
              <select
                id="inquiryType"
                name="inquiryType"
                value={formData.inquiryType}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-900"
              >
                <option value="">{t('booking.form.selectInquiry')}</option>
                <option value="daycare">{t('booking.form.inquiryOptions.daycare')}</option>
                <option value="partTime">{t('booking.form.inquiryOptions.partTime')}</option>
                <option value="singleDay">{t('booking.form.inquiryOptions.singleDay')}</option>
                <option value="boarding">{t('booking.form.inquiryOptions.boarding')}</option>
                <option value="walking">{t('booking.form.inquiryOptions.walking')}</option>
                <option value="question">{t('booking.form.inquiryOptions.question')}</option>
                <option value="other">{t('booking.form.inquiryOptions.other')}</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="additionalInfo" className="block text-sm font-medium text-gray-800">{t('booking.form.additionalInfo')}</label>
              <textarea
                id="additionalInfo"
                name="additionalInfo"
                rows={4}
                value={formData.additionalInfo}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                placeholder={t('booking.form.additionalInfoPlaceholder')}
              ></textarea>
            </div>
          </div>
          
          <div className="mt-6">
            <button
              type="submit"
              className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary font-bold"
              aria-label={t('booking.form.submit')}
            >
              {t('booking.form.submitDefault')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingForm; 