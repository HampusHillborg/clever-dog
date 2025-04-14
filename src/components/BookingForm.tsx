import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaTimes, FaUser, FaDog, FaEnvelope, FaPhone, FaQuestionCircle } from 'react-icons/fa';

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
    dogSocialization: '',
    problemBehaviors: '',
    allergies: '',
    startDate: '',
    endDate: '',
    partTimeDays: '',
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
${formData.dogSocialization ? `${t('booking.form.dogSocialization')}: ${formData.dogSocialization}\n` : ''}${formData.problemBehaviors ? `${t('booking.form.problemBehaviors')}: ${formData.problemBehaviors}\n` : ''}${formData.allergies ? `${t('booking.form.allergies')}: ${formData.allergies}\n` : ''}${t('booking.form.inquiryType')}: ${formData.inquiryType ? t(`booking.form.inquiryOptions.${formData.inquiryType}`) : ''}
${formData.startDate ? `${t('booking.form.startDate')}: ${formData.startDate}\n` : ''}${formData.endDate ? `${t('booking.form.endDate')}: ${formData.endDate}\n` : ''}${formData.partTimeDays ? `${t('booking.form.partTimeDays')}: ${formData.partTimeDays}\n` : ''}${t('booking.form.additionalInfo')}: ${formData.additionalInfo}
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
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      role="dialog" 
      aria-modal="true"
      aria-labelledby="booking-form-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
          <h3 id="booking-form-title" className="text-xl font-bold text-gray-900">{t('booking.title')}</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label={t('close')}
          >
            <FaTimes />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          {/* Owner Information Section */}
          <div className="mb-6">
            <div className="flex items-center mb-4">
              <FaUser className="text-primary mr-2" />
              <h4 className="text-lg font-medium text-gray-900">{t('booking.form.ownerInfo')}</h4>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">{t('booking.form.yourName')}</label>
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    <span className="flex items-center">
                      <FaEnvelope className="mr-1 text-xs" />
                      {t('booking.form.email')}
                    </span>
                  </label>
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
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    <span className="flex items-center">
                      <FaPhone className="mr-1 text-xs" />
                      {t('booking.form.phone')}
                    </span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Dog Information Section */}
          <div className="mb-6">
            <div className="flex items-center mb-4">
              <FaDog className="text-primary mr-2" />
              <h4 className="text-lg font-medium text-gray-900">{t('booking.form.dogInfo')}</h4>
            </div>
            
            <div className="space-y-4">
              {/* First row: Name and Breed */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="dogName" className="block text-sm font-medium text-gray-700">{t('booking.form.dogName')}</label>
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
                  <label htmlFor="dogBreed" className="block text-sm font-medium text-gray-700">{t('booking.form.dogBreed')}</label>
                  <input
                    type="text"
                    id="dogBreed"
                    name="dogBreed"
                    value={formData.dogBreed}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
              
              {/* Second row: Gender and Height */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="dogGender" className="block text-sm font-medium text-gray-700">{t('booking.form.dogGender')}</label>
                  <select
                    id="dogGender"
                    name="dogGender"
                    value={formData.dogGender}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700"
                    aria-describedby="gender-description"
                  >
                    <option value="">{t('booking.form.selectGender')}</option>
                    <option value="male">{t('booking.form.male')}</option>
                    <option value="female">{t('booking.form.female')}</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="dogHeight" className="block text-sm font-medium text-gray-700">{t('booking.form.dogHeight')}</label>
                  <input
                    type="text"
                    id="dogHeight"
                    name="dogHeight"
                    value={formData.dogHeight}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
              
              {/* Third row: Neutered status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="isNeutered" className="block text-sm font-medium text-gray-700">{t('booking.form.isNeutered')}</label>
                  <select
                    id="isNeutered"
                    name="isNeutered"
                    value={formData.isNeutered}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700"
                  >
                    <option value="">{t('booking.form.select')}</option>
                    <option value="yes">{t('booking.form.yes')}</option>
                    <option value="no">{t('booking.form.no')}</option>
                  </select>
                </div>
                <div className="hidden md:block">
                  {/* Empty div to maintain grid layout */}
                </div>
              </div>
            </div>
          </div>
          
          {/* Service Information */}
          <div className="mb-6">
            <div className="flex items-center mb-4">
              <FaQuestionCircle className="text-primary mr-2" />
              <h4 className="text-lg font-medium text-gray-900">{t('booking.form.serviceInfo')}</h4>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="inquiryType" className="block text-sm font-medium text-gray-700">{t('booking.form.inquiryType')}</label>
                <select
                  id="inquiryType"
                  name="inquiryType"
                  value={formData.inquiryType}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700"
                >
                  <option value="">{t('booking.form.selectInquiry')}</option>
                  <option value="daycare">{t('booking.form.inquiryOptions.daycare')}</option>
                  <option value="partTime">{t('booking.form.inquiryOptions.partTime')}</option>
                  <option value="singleDay">{t('booking.form.inquiryOptions.singleDay')}</option>
                  <option value="boarding">{t('booking.form.inquiryOptions.boarding')}</option>
                  <option value="socialWalk">{t('booking.form.inquiryOptions.socialWalk')}</option>
                  <option value="question">{t('booking.form.inquiryOptions.question')}</option>
                  <option value="other">{t('booking.form.inquiryOptions.other')}</option>
                </select>
              </div>
              
              {/* Date inputs - show based on inquiry type */}
              {formData.inquiryType && (
                <div className="space-y-4 mt-4">
                  {/* Single date services (single day, monthly, part-time) */}
                  {['singleDay', 'daycare', 'partTime'].includes(formData.inquiryType) && (
                    <div>
                      <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                        {t('booking.form.startDate')}
                      </label>
                      <input
                        type="date"
                        id="startDate"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                      />
                    </div>
                  )}
                  
                  {/* Part-time days selection */}
                  {formData.inquiryType === 'partTime' && (
                    <div>
                      <label htmlFor="partTimeDays" className="block text-sm font-medium text-gray-700">
                        {t('booking.form.partTimeDays')}
                      </label>
                      <input
                        type="text"
                        id="partTimeDays"
                        name="partTimeDays"
                        value={formData.partTimeDays}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                        placeholder={t('booking.form.partTimeDaysPlaceholder')}
                      />
                    </div>
                  )}
                  
                  {/* Date range services (boarding only) */}
                  {['boarding'].includes(formData.inquiryType) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                          {t('booking.form.startDate')}
                        </label>
                        <input
                          type="date"
                          id="startDate"
                          name="startDate"
                          value={formData.startDate}
                          onChange={handleChange}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                        />
                      </div>
                      <div>
                        <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                          {t('booking.form.endDate')}
                        </label>
                        <input
                          type="date"
                          id="endDate"
                          name="endDate"
                          value={formData.endDate}
                          onChange={handleChange}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Display additional dog information fields except for "other" and "question" inquiry types */}
              {formData.inquiryType && 
               formData.inquiryType !== 'other' && 
               formData.inquiryType !== 'question' && (
                <div className="space-y-4 mt-4 border-t pt-4">
                  <div>
                    <label htmlFor="dogSocialization" className="block text-sm font-medium text-gray-700">
                      {t('booking.form.dogSocialization')}
                    </label>
                    <textarea
                      id="dogSocialization"
                      name="dogSocialization"
                      rows={2}
                      value={formData.dogSocialization}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                      placeholder={t('booking.form.dogSocializationPlaceholder')}
                    ></textarea>
                  </div>
                  
                  <div>
                    <label htmlFor="problemBehaviors" className="block text-sm font-medium text-gray-700">
                      {t('booking.form.problemBehaviors')}
                    </label>
                    <textarea
                      id="problemBehaviors"
                      name="problemBehaviors"
                      rows={2}
                      value={formData.problemBehaviors}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                      placeholder={t('booking.form.problemBehaviorsPlaceholder')}
                    ></textarea>
                  </div>
                  
                  <div>
                    <label htmlFor="allergies" className="block text-sm font-medium text-gray-700">
                      {t('booking.form.allergies')}
                    </label>
                    <textarea
                      id="allergies"
                      name="allergies"
                      rows={2}
                      value={formData.allergies}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                      placeholder={t('booking.form.allergiesPlaceholder')}
                    ></textarea>
                  </div>
                </div>
              )}
              
              <div>
                <label htmlFor="additionalInfo" className="block text-sm font-medium text-gray-700">{t('booking.form.additionalInfo')}</label>
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
          </div>
          
          <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-6 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="py-2 px-6 bg-primary border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
            >
              {getEmailService(formData.email) === 'gmail' ? t('booking.form.submitGmail') :
               getEmailService(formData.email) === 'outlook' ? t('booking.form.submitOutlook') :
               t('booking.form.submitDefault')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingForm; 