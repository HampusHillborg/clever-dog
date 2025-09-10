import React, { createContext, useContext, useState, ReactNode } from 'react';
import BookingForm from './BookingForm';

interface BookingContextType {
  openBookingForm: () => void;
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

  const openBookingForm = () => {
    setIsBookingFormOpen(true);
  };

  const closeBookingForm = () => {
    setIsBookingFormOpen(false);
  };

  return (
    <BookingContext.Provider value={{ openBookingForm, closeBookingForm }}>
      {children}
      <BookingForm isOpen={isBookingFormOpen} onClose={closeBookingForm} />
    </BookingContext.Provider>
  );
}; 