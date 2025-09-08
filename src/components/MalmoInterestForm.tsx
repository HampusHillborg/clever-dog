import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaTimes, FaUser, FaDog, FaEnvelope, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';

interface MalmoInterestFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const MalmoInterestForm: React.FC<MalmoInterestFormProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState('');
  
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
    additionalInfo: '',
    dogSocialization: '',
    problemBehaviors: '',
    allergies: '',
    chipNumber: '',
    address: '',
    personnummer: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    // Låt Netlify hantera formuläret - ta bort preventDefault
    setIsSubmitting(true);
    setFormError('');

    // Netlify Forms kommer att hantera formulärinsamling automatiskt
    // Vi visar success-meddelande efter en kort fördröjning
    setTimeout(() => {
      setIsSubmitting(false);
      setFormSuccess(true);
      
      // Reset form after successful submission
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
        additionalInfo: '',
        dogSocialization: '',
        problemBehaviors: '',
        allergies: '',
        chipNumber: '',
        address: '',
        personnummer: '',
      });
      
      // Close the form after a short delay
      setTimeout(() => {
        onClose();
        setFormSuccess(false);
      }, 3000);
    }, 1000); // Kort fördröjning för att låta Netlify hantera formuläret
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      role="dialog" 
      aria-modal="true"
      aria-labelledby="malmo-form-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
          <h3 id="malmo-form-title" className="text-xl font-bold text-gray-900">
            {t('booking.malmo.title')}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label={t('booking.malmo.close')}
          >
            <FaTimes />
          </button>
        </div>
        
        {formSuccess ? (
          <div className="p-6 text-center">
            <div className="mb-4 text-green-600 text-5xl">✓</div>
            <h4 className="text-xl font-medium mb-2">{t('booking.malmo.successTitle')}</h4>
            <p>{t('booking.malmo.successMessage')}</p>
          </div>
        ) : (
          <form 
            ref={formRef} 
            onSubmit={handleSubmit} 
            className="p-6"
            name="malmo-interest"
            method="POST"
            data-netlify="true"
            data-netlify-honeypot="bot-field"
          >
            {/* Dold honeypot för spam-skydd */}
            <input type="hidden" name="form-name" value="malmo-interest" />
            <div style={{ display: 'none' }}>
              <label>
                Don't fill this out if you're human: 
                <input name="bot-field" />
              </label>
            </div>
            <div className="mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center mb-2">
                  <FaMapMarkerAlt className="text-blue-600 mr-2" />
                  <h4 className="text-lg font-medium text-blue-900">{t('booking.malmo.subtitle')}</h4>
                </div>
                <p className="text-blue-800 text-sm">
                  {t('booking.malmo.description')}
                </p>
              </div>
            </div>

            {/* Owner Information Section */}
            <div className="mb-6">
              <div className="flex items-center mb-4">
                <FaUser className="text-primary mr-2" />
                <h4 className="text-lg font-medium text-gray-900">{t('booking.malmo.ownerInfo')}</h4>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">{t('booking.form.yourName')} *</label>
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
                        {t('booking.form.email')} *
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

                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                    {t('booking.form.address')} *
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder={t('booking.malmo.addressPlaceholder')}
                  />
                </div>

                <div>
                  <label htmlFor="personnummer" className="block text-sm font-medium text-gray-700">
                    {t('booking.form.personnummer')} *
                  </label>
                  <input
                    type="text"
                    id="personnummer"
                    name="personnummer"
                    value={formData.personnummer}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="YYYYMMDD-XXXX"
                  />
                </div>
              </div>
            </div>
            
            {/* Dog Information Section */}
            <div className="mb-6">
              <div className="flex items-center mb-4">
                <FaDog className="text-primary mr-2" />
                <h4 className="text-lg font-medium text-gray-900">{t('booking.malmo.dogInfo')}</h4>
              </div>
              
              <div className="space-y-4">
                {/* First row: Name and Breed */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="dogName" className="block text-sm font-medium text-gray-700">{t('booking.form.dogName')} *</label>
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
                      placeholder="T.ex. Labradoodle"
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
                      placeholder={t('booking.form.dogHeightPlaceholder')}
                    />
                  </div>
                </div>

                {/* Third row: Age and Neutered status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="dogAge" className="block text-sm font-medium text-gray-700">{t('booking.form.dogAge')}</label>
                    <input
                      type="text"
                      id="dogAge"
                      name="dogAge"
                      value={formData.dogAge}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                      placeholder={t('booking.form.dogAgePlaceholder')}
                    />
                  </div>

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
                </div>
              </div>
            </div>
            
            {/* Dog Behavior and Health Section */}
            <div className="mb-6">
              <div className="flex items-center mb-4">
                <FaDog className="text-primary mr-2" />
                <h4 className="text-lg font-medium text-gray-900">{t('booking.malmo.dogBehaviorHealth')}</h4>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="dogSocialization" className="block text-sm font-medium text-gray-700">
                    {t('booking.malmo.socialization')}
                  </label>
                  <textarea
                    id="dogSocialization"
                    name="dogSocialization"
                    rows={2}
                    value={formData.dogSocialization}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder={t('booking.malmo.socializationPlaceholder')}
                  />
                </div>
                
                <div>
                  <label htmlFor="problemBehaviors" className="block text-sm font-medium text-gray-700">
                    {t('booking.malmo.problemBehaviors')}
                  </label>
                  <textarea
                    id="problemBehaviors"
                    name="problemBehaviors"
                    rows={2}
                    value={formData.problemBehaviors}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder={t('booking.malmo.problemBehaviorsPlaceholder')}
                  />
                </div>
                
                <div>
                  <label htmlFor="allergies" className="block text-sm font-medium text-gray-700">
                    {t('booking.malmo.allergies')}
                  </label>
                  <textarea
                    id="allergies"
                    name="allergies"
                    rows={2}
                    value={formData.allergies}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder={t('booking.malmo.allergiesPlaceholder')}
                  />
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <label htmlFor="additionalInfo" className="block text-sm font-medium text-gray-700">{t('booking.form.additionalInfo')}</label>
              <textarea
                id="additionalInfo"
                name="additionalInfo"
                rows={4}
                value={formData.additionalInfo}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                placeholder={t('booking.malmo.additionalInfoPlaceholder')}
              />
            </div>
            
            {/* Submit Button */}
            <div className="mt-8">
              {formError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
                  {formError}
                </div>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 px-4 rounded-md shadow transition-colors ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? t('booking.malmo.submitting') : t('booking.malmo.submit')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default MalmoInterestForm;
