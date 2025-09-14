import React, { createContext, useContext, useState, ReactNode } from 'react';
import BookingForm from './BookingForm';
import MalmoBookingForm from './malmo/MalmoBookingForm';

interface BookingContextType {
  openBookingForm: (location?: string) => void;
  closeBookingForm: () => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("useBooking must be used within a BookingProvider");
  }
  return context;
};

export const BookingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false);
  const [isMalmoBookingFormOpen, setIsMalmoBookingFormOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string>('');

  const openBookingForm = (location?: string) => {
    setCurrentLocation(location || '');
    if (location === 'malmo') {
      setIsMalmoBookingFormOpen(true);
    } else {
      setIsBookingFormOpen(true);
    }
  };

  const closeBookingForm = () => {
    setIsBookingFormOpen(false);
    setIsMalmoBookingFormOpen(false);
    setCurrentLocation('');
  };

  return (
    <BookingContext.Provider value={{ openBookingForm, closeBookingForm }}>
      {children}
      <BookingForm isOpen={isBookingFormOpen} onClose={closeBookingForm} />
      <MalmoBookingForm isOpen={isMalmoBookingFormOpen} onClose={closeBookingForm} />
    </BookingContext.Provider>
  );
}; 