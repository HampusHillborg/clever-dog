// Centralized pricing constants matching the website pricing sections
// These match MalmoPricingSection and StaffanstorpPricingSection

export const PRICES = {
  malmo: {
    fulltime: 3700,    // Heltid per månad
    fulltimeWithFood: 3850, // Heltid med mat per månad
    parttime3: 3100,   // Deltid 3 dagar per månad
    parttime3WithFood: 3250, // Deltid 3 dagar med mat per månad
    parttime2: 2800,   // Deltid 2 dagar per månad
    singleDay: 350,    // Enstaka dag
    boarding: 400,     // Hundpensionat per dygn
    boardingHoliday: 800, // Hundpensionat under helgdagar
    nailClipping: 160  // Kloklipp
  },
  staffanstorp: {
    fulltime: 3700,    // Heltid per månad
    fulltimeWithFood: 3850, // Heltid med mat per månad
    parttime3: 3100,   // Deltid 3 dagar per månad
    parttime3WithFood: 3250, // Deltid 3 dagar med mat per månad
    parttime2: 2800,   // Deltid 2 dagar per månad
    singleDay: 350,    // Enstaka dag
    boarding: 400,     // Hundpensionat per dygn
    boardingHoliday: 800, // Hundpensionat under helgdagar
    nailClipping: 160  // Kloklipp
  }
} as const;

// Moms rate in Sweden (25%)
export const VAT_RATE = 0.25;

