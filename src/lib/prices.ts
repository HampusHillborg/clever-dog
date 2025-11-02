// Centralized pricing constants matching the website pricing sections
// These match MalmoPricingSection and StaffanstorpPricingSection

export const PRICES = {
  malmo: {
    fulltime: 3500,    // Heltid per månad
    parttime3: 3000,   // Deltid 3 dagar per månad
    parttime2: 2750,   // Deltid 2 dagar per månad
    singleDay: 350,    // Enstaka dag
    boarding: 400,     // Hundpensionat per dygn
    boardingHoliday: 800 // Hundpensionat under helgdagar
  },
  staffanstorp: {
    fulltime: 3500,    // Heltid per månad
    parttime3: 3000,   // Deltid 3 dagar per månad
    parttime2: 2750,   // Deltid 2 dagar per månad
    singleDay: 350,    // Enstaka dag
    boarding: 400,     // Hundpensionat per dygn
    boardingHoliday: 800 // Hundpensionat under helgdagar
  }
} as const;

// Moms rate in Sweden (25%)
export const VAT_RATE = 0.25;

