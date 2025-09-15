import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaTimes, FaDog, FaCalendarWeek, FaQuestionCircle } from 'react-icons/fa';
import emailjs from '@emailjs/browser';

interface MalmoBookingFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const MalmoBookingForm: React.FC<MalmoBookingFormProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dogName: '',
    dogBreed: '',
    dogGender: '',
    dogHeight: '',
    dogAge: '',
    isNeutered: '',
    serviceType: '',
    daysPerWeek: '',
    startDate: '',
    dogSocialization: '',
    problemBehaviors: '',
    allergies: '',
    chipNumber: '',
    address: '',
    personnummer: '',
    message: '',
    location: 'malmo'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const serviceOptions = [
    { value: 'daycare', label: t('malmoBooking.services.daycare'), icon: FaDog },
    { value: 'parttime', label: t('malmoBooking.services.parttime'), icon: FaCalendarWeek },
    { value: 'general', label: t('malmoBooking.services.general'), icon: FaQuestionCircle }
  ];

  const daysOptions = [
    { value: '1', label: t('malmoBooking.days.one') },
    { value: '2', label: t('malmoBooking.days.two') },
    { value: '3', label: t('malmoBooking.days.three') },
    { value: '4', label: t('malmoBooking.days.four') },
    { value: '5', label: t('malmoBooking.days.five') }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validera att en tjänst är vald
    if (!formData.serviceType) {
      setSubmitStatus('error');
      return;
    }
    
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Komplett templateParams med alla fält
      const templateParams = {
        // Grundläggande kontaktinfo
        from_name: formData.name,
        from_email: formData.email,
        phone: formData.phone || '',
        service_type: formData.serviceType,
        location: 'Malmö',
        to_email: 'cleverdog.malmo@gmail.com',
        
        // Nya fält som lades till
        chip_number: formData.chipNumber || '',
        address: formData.address || '',
        personnummer: formData.personnummer || '',
        
        // Hundinfo (endast för dagis)
        dog_name: formData.dogName || '',
        dog_breed: formData.dogBreed || '',
        dog_gender: formData.dogGender || '',
        dog_height: formData.dogHeight || '',
        dog_age: formData.dogAge || '',
        is_neutered: formData.isNeutered || '',
        start_date: formData.startDate || '',
        days_per_week: formData.daysPerWeek || '',
        
        // Beteende och hälsa
        dog_socialization: formData.dogSocialization || '',
        problem_behaviors: formData.problemBehaviors || '',
        allergies: formData.allergies || '',
        message: formData.message || ''
      };

      // Debug: Logga templateParams (ta bort i produktion)
      console.log('Malmö TemplateParams:', templateParams);

      // Skicka e-post till dig
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_MALMO_SERVICE_ID,
        'malmo_test',
        templateParams,
        import.meta.env.VITE_EMAILJS_MALMO_PUBLIC_KEY
      );

      // Skicka auto-reply till kunden
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_MALMO_SERVICE_ID,
        'malmo_reply',
        templateParams,
        import.meta.env.VITE_EMAILJS_MALMO_PUBLIC_KEY
      );

      setSubmitStatus('success');
      setFormData({
        name: '',
        email: '',
        phone: '',
        dogName: '',
        dogBreed: '',
        dogGender: '',
        dogHeight: '',
        dogAge: '',
        isNeutered: '',
        serviceType: '',
        daysPerWeek: '',
        startDate: '',
        dogSocialization: '',
        problemBehaviors: '',
        allergies: '',
        chipNumber: '',
        address: '',
        personnummer: '',
        message: '',
        location: 'malmo'
      });
    } catch (error) {
      console.error('Error sending email:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {t('malmoBooking.title')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label={t('close')}
          >
            <FaTimes className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Service Type Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              {t('malmoBooking.serviceType')} *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {serviceOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.serviceType === option.value
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-orange-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="serviceType"
                    value={option.value}
                    checked={formData.serviceType === option.value}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <div className="flex flex-col items-center text-center">
                    <option.icon className={`text-2xl mb-2 ${
                      formData.serviceType === option.value ? 'text-orange-600' : 'text-gray-400'
                    }`} />
                    <span className={`text-sm font-medium ${
                      formData.serviceType === option.value ? 'text-orange-700' : 'text-gray-700'
                    }`}>
                      {option.label}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Days per week (only for part-time) */}
          {formData.serviceType === 'parttime' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                {t('malmoBooking.daysPerWeek')} *
              </label>
              <select
                name="daysPerWeek"
                value={formData.daysPerWeek}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                required
              >
                <option value="">{t('malmoBooking.selectDays')}</option>
                {daysOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('malmoBooking.name')} *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('malmoBooking.email')} *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('malmoBooking.phone')}
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('malmoBooking.chipNumber')} *
              </label>
              <input
                type="text"
                name="chipNumber"
                value={formData.chipNumber}
                onChange={handleInputChange}
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('malmoBooking.personnummer')} *
              </label>
              <input
                type="text"
                name="personnummer"
                value={formData.personnummer}
                onChange={handleInputChange}
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('malmoBooking.address')} *
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {/* Dog Information (only for daycare services) */}
          {(formData.serviceType === 'daycare' || formData.serviceType === 'parttime') && (
            <>
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FaDog className="text-orange-500 mr-2" />
                  {t('malmoBooking.dogInfo')}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('malmoBooking.dogName')} *
                    </label>
                    <input
                      type="text"
                      name="dogName"
                      value={formData.dogName}
                      onChange={handleInputChange}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('malmoBooking.dogBreed')} *
                    </label>
                    <input
                      type="text"
                      name="dogBreed"
                      value={formData.dogBreed}
                      onChange={handleInputChange}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('malmoBooking.dogGender')} *
                    </label>
                    <select
                      name="dogGender"
                      value={formData.dogGender}
                      onChange={handleInputChange}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="">{t('malmoBooking.selectGender')}</option>
                      <option value="male">{t('malmoBooking.male')}</option>
                      <option value="female">{t('malmoBooking.female')}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('malmoBooking.dogHeight')} *
                    </label>
                    <input
                      type="text"
                      name="dogHeight"
                      value={formData.dogHeight}
                      onChange={handleInputChange}
                      required
                      placeholder={t('malmoBooking.heightPlaceholder')}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('malmoBooking.dogAge')} *
                    </label>
                    <input
                      type="text"
                      name="dogAge"
                      value={formData.dogAge}
                      onChange={handleInputChange}
                      required
                      placeholder={t('malmoBooking.agePlaceholder')}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('malmoBooking.isNeutered')} *
                    </label>
                    <select
                      name="isNeutered"
                      value={formData.isNeutered}
                      onChange={handleInputChange}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="">{t('malmoBooking.selectNeutered')}</option>
                      <option value="yes">{t('malmoBooking.yes')}</option>
                      <option value="no">{t('malmoBooking.no')}</option>
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('malmoBooking.startDate')}
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('malmoBooking.dogSocialization')} *
                    </label>
                    <textarea
                      name="dogSocialization"
                      value={formData.dogSocialization}
                      onChange={handleInputChange}
                      required
                      rows={3}
                      placeholder={t('malmoBooking.socializationPlaceholder')}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('malmoBooking.problemBehaviors')}
                    </label>
                    <textarea
                      name="problemBehaviors"
                      value={formData.problemBehaviors}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder={t('malmoBooking.behaviorsPlaceholder')}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('malmoBooking.allergies')}
                    </label>
                    <textarea
                      name="allergies"
                      value={formData.allergies}
                      onChange={handleInputChange}
                      rows={2}
                      placeholder={t('malmoBooking.allergiesPlaceholder')}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Message */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('malmoBooking.message')}
            </label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder={t('malmoBooking.messagePlaceholder')}
            />
          </div>

          {/* Submit Status */}
          {submitStatus === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">
                {t('malmoBooking.successMessage')}
              </p>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium">
                {t('malmoBooking.errorMessage')}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('malmoBooking.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.serviceType}
              className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? t('malmoBooking.sending') : t('malmoBooking.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MalmoBookingForm;
