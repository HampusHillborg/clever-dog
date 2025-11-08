import React, { useState, useEffect } from 'react';
import { FaSignOutAlt, FaFilePdf, FaLock, FaCalendarAlt, FaDog, FaPlus, FaEdit, FaTrash, FaInfoCircle, FaChartBar, FaFilter, FaCopy, FaTimes, FaBars } from 'react-icons/fa';
import html2pdf from 'html2pdf.js';
import { 
  getDogs as fetchDogs, 
  saveDog as saveDogToDb, 
  deleteDog as deleteDogFromDb,
  getBoardingRecords as fetchBoardingRecords,
  saveBoardingRecord as saveBoardingRecordToDb,
  deleteBoardingRecord as deleteBoardingRecordFromDb,
  getPlanningHistory as fetchPlanningHistory,
  savePlanningData as savePlanningDataToDb,
  getPlanningForDate,
  getBoxSettings as fetchBoxSettings,
  saveBoxSettings as saveBoxSettingsToDb,
  getApplications,
  updateApplication,
  findMatchingDogs,
  getMeetings,
  saveMeeting,
  updateMeeting,
  deleteMeeting,
  type BoxSettings,
  type Application,
  type Meeting
} from '../lib/database';
import { PRICES, VAT_RATE } from '../lib/prices';
import { signIn, signOut, getCurrentUser, onAuthStateChange, type AuthUser } from '../lib/auth';

interface ContractData {
  // Common fields
  customerName: string;
  customerAddress: string;
  customerCity: string;
  personalNumber: string;
  dogName: string;
  dogBreed: string;
  dogAge: string;
  chipNumber: string;
  startDate: string;
  endDate: string;
  price: string;
  // Specific fields for different contract types
  contractType: 'daycare' | 'boarding' | 'socialWalk' | 'partTime' | 'singleDay';
  daysPerWeek?: string; // For part-time contracts
}

interface Dog {
  id: string;
  name: string;
  breed: string;
  age: string;
  owner: string;
  phone: string;
  email?: string; // Optional email field for matching
  notes?: string;
  locations: ('malmo' | 'staffanstorp')[]; // Which daycares the dog belongs to (can be both)
  type?: 'fulltime' | 'parttime-3' | 'parttime-2' | 'singleDay' | 'boarding';
  isActive?: boolean; // Whether the dog is active (default: true)
  // Contract fields
  ownerAddress?: string;
  ownerCity?: string;
  ownerPersonalNumber?: string;
  chipNumber?: string;
}

interface BoardingRecord {
  id: string;
  dogId: string;
  dogName: string;
  location: 'malmo' | 'staffanstorp';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string; // When the record was created
  isArchived?: boolean; // For historical records
}

interface Cage {
  id: string;
  name: string;
  type: 'cage' | 'free-area';
  dogs?: string[]; // array of dog ids
}

interface PlanningData {
  id: string;
  date: string; // YYYY-MM-DD
  location: 'malmo' | 'staffanstorp';
  cages: Cage[];
  createdAt: string;
}

interface StatisticsFilter {
  location: 'all' | 'malmo' | 'staffanstorp';
  period: 'all' | 'month' | 'year';
  year?: number;
  month?: number;
  includeActive: boolean;
  includeInactive: boolean;
  includeBoarding: boolean;
  includeSingleDays: boolean;
}

interface DogStatistics {
  totalDogs: number;
  malmoDogs: number;
  staffanstorpDogs: number;
  bothLocationDogs: number;
  totalIncome: number;
  totalIncomeWithVAT: number;
  totalIncomeWithoutVAT: number;
  malmoIncome: number;
  staffanstorpIncome: number;
  incomeByType: {
    fulltime: number;
    parttime3: number;
    parttime2: number;
    singleDay: number;
    boarding: number;
  };
  incomeByCategory: {
    daycare: number;
    boarding: number;
    singleDays: number;
  };
}

type AdminView = 'dashboard' | 'contracts' | 'planning-malmo' | 'planning-staffanstorp' | 'dogs' | 'boarding-malmo' | 'boarding-staffanstorp' | 'calendar-malmo' | 'calendar-staffanstorp' | 'statistics' | 'settings' | 'applications' | 'meetings';

type UserRole = 'admin' | 'employee' | 'platschef';

const AdminPage: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('admin');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [contracts] = useState<ContractData[]>([]);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [editingDog, setEditingDog] = useState<Dog | null>(null);
  const [isDogModalOpen, setIsDogModalOpen] = useState(false);
  const [boardingRecords, setBoardingRecords] = useState<BoardingRecord[]>([]);
  const [isBoardingModalOpen, setIsBoardingModalOpen] = useState(false);
  const [selectedDogForBoarding, setSelectedDogForBoarding] = useState<string>('');
  const [boardingForm, setBoardingForm] = useState({
    startDate: '',
    endDate: '',
    notes: ''
  });
  const [editingBoardingRecord, setEditingBoardingRecord] = useState<BoardingRecord | null>(null);
  const [boardingFilter, setBoardingFilter] = useState<'all' | 'current' | 'archived' | 'future' | 'ongoing'>('all');
  const [boardingYearFilter, setBoardingYearFilter] = useState<string>(new Date().getFullYear().toString());
  const [dogForm, setDogForm] = useState({
    name: '',
    breed: '',
    age: '',
    owner: '',
    phone: '',
    email: '',
    notes: '',
    locations: ['staffanstorp'] as ('malmo' | 'staffanstorp')[],
    type: '' as 'fulltime' | 'parttime-3' | 'parttime-2' | 'singleDay' | 'boarding' | '',
    isActive: true,
    // Contract fields
    ownerAddress: '',
    ownerCity: '',
    ownerPersonalNumber: '',
    chipNumber: ''
  });
  const [planningStaffanstorp, setPlanningStaffanstorp] = useState<Cage[]>([]);
  const [planningMalmo, setPlanningMalmo] = useState<Cage[]>([]);
  const [planningHistory, setPlanningHistory] = useState<PlanningData[]>([]);
  const [currentPlanningDate, setCurrentPlanningDate] = useState<string>(new Date().toISOString().split('T')[0]);
  // Search state for dog categories in planning view (location_category)
  const [planningSearch, setPlanningSearch] = useState<Record<string, string>>({});
  // Collapsed state for dog categories in planning view (location_category)
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  // Search state for dog selection in boarding form
  const [boardingDogSearch, setBoardingDogSearch] = useState<string>('');
  const [selectedDogForContract, setSelectedDogForContract] = useState<string>('');
  const [contractDogSearch, setContractDogSearch] = useState<string>('');
  const [isContractDogDropdownOpen, setIsContractDogDropdownOpen] = useState<boolean>(false);
  // Boarding dog dropdown state
  const [isBoardingDogDropdownOpen, setIsBoardingDogDropdownOpen] = useState<boolean>(false);
  // Search state for dogs tab
  const [dogsTabSearch, setDogsTabSearch] = useState<string>('');
  const [dogsLocationFilter, setDogsLocationFilter] = useState<'all' | 'malmo' | 'staffanstorp' | 'both'>('all');
  const [dogsTypeFilter, setDogsTypeFilter] = useState<'all' | 'fulltime' | 'parttime-3' | 'parttime-2' | 'singleDay' | 'boarding'>('all');
  const [dogsActiveFilter, setDogsActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [statisticsFilter, setStatisticsFilter] = useState<StatisticsFilter>({
    location: 'all',
    period: 'month', // Default to current month
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    includeActive: true,
    includeInactive: false,
    includeBoarding: true,
    includeSingleDays: true
  });

  // Box settings state (per location)
  const [boxSettings, setBoxSettings] = useState<BoxSettings>({
    malmo: {
      cages: Array.from({ length: 8 }, (_, i) => ({ name: `Bur ${i + 1}` })),
      freeAreas: Array.from({ length: 2 }, (_, i) => ({ name: `Fri yta ${i + 1}` }))
    },
    staffanstorp: {
      cages: Array.from({ length: 8 }, (_, i) => ({ name: `Bur ${i + 1}` })),
      freeAreas: Array.from({ length: 2 }, (_, i) => ({ name: `Fri yta ${i + 1}` }))
    }
  });

  // Applications state
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicationsFilter, setApplicationsFilter] = useState<'all' | 'new' | 'reviewed' | 'approved' | 'rejected' | 'matched' | 'added'>('all');
  const [applicationsLocationFilter, setApplicationsLocationFilter] = useState<'all' | 'malmo' | 'staffanstorp'>('all');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [applicationMatchingDogs, setApplicationMatchingDogs] = useState<Dog[]>([]);

  // Meetings state
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [meetingForm, setMeetingForm] = useState({
    name: '',
    dogName: '',
    phone: '',
    email: '',
    date: '',
    time: '',
    location: 'malmo' as 'malmo' | 'staffanstorp'
  });

  // Load box settings from database on mount
  useEffect(() => {
    const loadBoxSettings = async () => {
      try {
        const settings = await fetchBoxSettings();
        setBoxSettings(settings);
      } catch (error) {
        console.error('Error loading box settings:', error);
        // Keep default settings
      }
    };
    loadBoxSettings();
  }, []);

  // Save box settings to database and state
  const saveBoxSettings = async (settings: BoxSettings) => {
    setBoxSettings(settings);
    try {
      await saveBoxSettingsToDb(settings);
    } catch (error) {
      console.error('Error saving box settings:', error);
      // Settings still saved to localStorage by saveBoxSettingsToDb
    }
  };

  // Settings view state
  const [settingsLocation, setSettingsLocation] = useState<'malmo' | 'staffanstorp'>('staffanstorp');
  const [editingBoxIndex, setEditingBoxIndex] = useState<{ type: 'cage' | 'free-area'; index: number } | null>(null);
  const [editingBoxName, setEditingBoxName] = useState('');
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copyIncludeBoarding, setCopyIncludeBoarding] = useState(true);
  const [customCopyDate, setCustomCopyDate] = useState('');

  // Initialize currentPlanningDate to today when entering planning view (but not if coming from calendar)
  useEffect(() => {
    if ((currentView === 'planning-malmo' || currentView === 'planning-staffanstorp') && !currentPlanningDate) {
      const today = new Date().toISOString().split('T')[0];
      setCurrentPlanningDate(today);
    }
  }, [currentView, currentPlanningDate]);
  const [draggedDog, setDraggedDog] = useState<Dog | null>(null);

  // Function to create initial cages based on box settings
  const createInitialCages = (location: 'staffanstorp' | 'malmo') => {
    const prefix = location === 'staffanstorp' ? 'staffanstorp' : 'malmo';
    const settings = boxSettings[location];
    
    return [
      ...settings.cages.map((cage, i) => ({
        id: `${prefix}-cage-${i + 1}`,
        name: cage.name,
        type: 'cage' as const,
        dogs: []
      })),
      ...settings.freeAreas.map((area, i) => ({
        id: `${prefix}-free-${i + 1}`,
        name: area.name,
        type: 'free-area' as const,
        dogs: []
      }))
    ];
  };

  // Load planning when date changes (from database)
  useEffect(() => {
    // Only load if we have a date and boxSettings are loaded
    if (!currentPlanningDate || !boxSettings.malmo.cages.length || !boxSettings.staffanstorp.cages.length) {
      return;
    }

    const loadPlanningForDate = async () => {
      // First, clear the current planning state to avoid showing old data
      // while loading new data for the new date
      setPlanningStaffanstorp([]);
      setPlanningMalmo([]);
      
      // Try to load from database first
      try {
        // Load Staffanstorp
        const staffanstorpData = await getPlanningForDate(currentPlanningDate, 'staffanstorp');
        if (staffanstorpData && staffanstorpData.cages) {
          setPlanningStaffanstorp(staffanstorpData.cages);
        } else {
          // Fallback to localStorage or create initial
          setPlanningStaffanstorp(createInitialCages('staffanstorp'));
        }

        // Load Malmö
        const malmoData = await getPlanningForDate(currentPlanningDate, 'malmo');
        if (malmoData && malmoData.cages) {
          setPlanningMalmo(malmoData.cages);
        } else {
          // Fallback to localStorage or create initial
          setPlanningMalmo(createInitialCages('malmo'));
        }
      } catch (error) {
        console.error('Error loading planning from database:', error);
        // Fallback: create initial cages
        setPlanningStaffanstorp(createInitialCages('staffanstorp'));
        setPlanningMalmo(createInitialCages('malmo'));
      }
    };

    loadPlanningForDate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlanningDate]);
  const [contractData, setContractData] = useState<ContractData>({
    customerName: '',
    customerAddress: '',
    customerCity: '',
    personalNumber: '',
    dogName: '',
    dogBreed: '',
    dogAge: '',
    chipNumber: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 months from now
    price: '',
    contractType: 'daycare',
    daysPerWeek: ''
  });

  // Check if user is already logged in from Supabase session
  useEffect(() => {
    // Temporary: Auto-login for local development (only if Supabase is not configured)
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.hostname.includes('localhost');
    
    // Check if Supabase is configured
    const isSupabaseConfigured = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
    
    let authSubscription: { unsubscribe: () => void } | null = null;

    if (isDevelopment && !isSupabaseConfigured) {
      // Fallback for local development without Supabase
      setIsLoggedIn(true);
      setUserRole('admin');
      return; // No cleanup needed
    }

    if (!isSupabaseConfigured) {
      return; // No Supabase configured, no cleanup needed
    }

    // Check auth state
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setIsLoggedIn(true);
          setCurrentUser(user);
          setUserRole(user.role);
        } else {
          setIsLoggedIn(false);
          setCurrentUser(null);
        }
      } catch (err) {
        console.error('Error checking auth:', err);
        setIsLoggedIn(false);
        setCurrentUser(null);
      }
    };

    checkAuth();

    // Listen to auth state changes
    const authStateResult = onAuthStateChange((user) => {
      if (user) {
        setIsLoggedIn(true);
        setCurrentUser(user);
        setUserRole(user.role);
      } else {
        setIsLoggedIn(false);
        setCurrentUser(null);
      }
    });

    if (authStateResult.data?.subscription) {
      authSubscription = authStateResult.data.subscription;
    }

    // Cleanup function
    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    // Check if Supabase is configured
    const isSupabaseConfigured = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
    
    // Temporary: Auto-login for local development (only if Supabase is not configured)
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.hostname.includes('localhost');
    
    if (isDevelopment && !isSupabaseConfigured) {
      // Fallback for local development without Supabase
      let devRole: UserRole = 'admin';
      if (email.toLowerCase().includes('employee') || email.toLowerCase().includes('anstalld')) {
        devRole = 'employee';
      } else if (email.toLowerCase().includes('platschef') || email.toLowerCase().includes('location')) {
        devRole = 'platschef';
      }
      setEmail(''); // Clear email
      setPassword(''); // Clear password
      setUserRole(devRole);
      setIsLoading(false);
      // Set isLoggedIn last to trigger re-render
      setIsLoggedIn(true);
      return;
    }
    
    if (!isSupabaseConfigured) {
      setError('Autentisering är inte konfigurerad. Kontakta administratören.');
      setIsLoading(false);
      return;
    }
    
    // Use Supabase Auth
    try {
      const result = await signIn(email, password);
      
      if (result.success && result.user) {
        // Update all state in sequence to ensure proper re-render
        setCurrentUser(result.user);
        setUserRole(result.user.role);
        setEmail(''); // Clear email
        setPassword(''); // Clear password
        // Set isLoggedIn last to trigger the conditional render
        setIsLoggedIn(true);
      } else {
        setError(result.error || 'Ogiltigt e-postadress eller lösenord');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Något gick fel. Försök igen.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setIsLoggedIn(false);
      setUserRole('admin');
      setCurrentUser(null);
      setEmail('');
      setPassword('');
    } catch (err) {
      console.error('Logout error:', err);
      // Still clear local state even if logout fails
      setIsLoggedIn(false);
      setUserRole('admin');
      setCurrentUser(null);
      setEmail('');
      setPassword('');
    }
  };

  // Load dogs from database on mount
  useEffect(() => {
    const loadDogs = async () => {
      try {
        const loadedDogs = await fetchDogs();
        // Migrate old dogs to new locations format (for localStorage fallback)
        const dogsWithLocations = loadedDogs.map((dog: any) => ({
          ...dog,
          locations: dog.locations || (dog.location ? [dog.location] : ['staffanstorp'])
        }));
        setDogs(dogsWithLocations);
        // Also update localStorage as backup
        localStorage.setItem('cleverDogs', JSON.stringify(dogsWithLocations));
      } catch (error) {
        console.error('Error loading dogs:', error);
        // Fallback to localStorage
        const savedDogs = localStorage.getItem('cleverDogs');
        if (savedDogs) {
          const parsedDogs = JSON.parse(savedDogs);
          const dogsWithLocations = parsedDogs.map((dog: any) => ({
            ...dog,
            locations: dog.locations || (dog.location ? [dog.location] : ['staffanstorp'])
          }));
          setDogs(dogsWithLocations);
        }
      }
    };
    loadDogs();
  }, []);

  // Load planning history from database on mount
  useEffect(() => {
    const loadPlanningHistory = async () => {
      try {
        const history = await fetchPlanningHistory();
        setPlanningHistory(history);
        // Also update localStorage as backup
        localStorage.setItem('cleverPlanningHistory', JSON.stringify(history));
      } catch (error) {
        console.error('Error loading planning history:', error);
        // Fallback to localStorage
        const saved = localStorage.getItem('cleverPlanningHistory');
        if (saved) {
          setPlanningHistory(JSON.parse(saved));
        }
      }
    };
    loadPlanningHistory();
  }, []);

  // Load boarding records from database on mount
  useEffect(() => {
    const loadBoardingRecords = async () => {
      try {
        const records = await fetchBoardingRecords();
        setBoardingRecords(records);
        // Also update localStorage as backup
        localStorage.setItem('cleverBoarding', JSON.stringify(records));
      } catch (error) {
        console.error('Error loading boarding records:', error);
        // Fallback to localStorage
        const saved = localStorage.getItem('cleverBoarding');
        if (saved) {
          setBoardingRecords(JSON.parse(saved));
        }
      }
    };
    loadBoardingRecords();
  }, []);

  const savePlanningData = (location: 'malmo' | 'staffanstorp', cages: Cage[]) => {
    const planningData: PlanningData = {
      id: `${location}-${currentPlanningDate}`,
      date: currentPlanningDate,
      location: location,
      cages: cages.map(cage => ({ ...cage, dogs: cage.dogs || [] })),
      createdAt: new Date().toISOString()
    };

    // Save to database
    savePlanningDataToDb(planningData).then((savedPlanning) => {
      const existingIndex = planningHistory.findIndex(p => p.id === savedPlanning.id);
      let updatedHistory;
      
      if (existingIndex >= 0) {
        updatedHistory = planningHistory.map((p, index) => 
          index === existingIndex ? savedPlanning : p
        );
      } else {
        updatedHistory = [...planningHistory, savedPlanning];
      }

      setPlanningHistory(updatedHistory);
      localStorage.setItem('cleverPlanningHistory', JSON.stringify(updatedHistory));
    }).catch((error) => {
      console.error('Error saving planning data:', error);
      // Fallback to localStorage
      const existingIndex = planningHistory.findIndex(p => p.id === planningData.id);
      let updatedHistory;
      
      if (existingIndex >= 0) {
        updatedHistory = planningHistory.map((p, index) => 
          index === existingIndex ? planningData : p
        );
      } else {
        updatedHistory = [...planningHistory, planningData];
      }

      setPlanningHistory(updatedHistory);
      localStorage.setItem('cleverPlanningHistory', JSON.stringify(updatedHistory));
    });
  };


  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getInitialCages = (_location: 'malmo' | 'staffanstorp'): Cage[] => {
    const cages: Cage[] = [];
    
    // Add 8 cages
    for (let i = 1; i <= 8; i++) {
      cages.push({
        id: `${_location}-cage-${i}`,
        name: `Bur ${i}`,
        type: 'cage',
        dogs: []
      });
    }
    
    // Add 2 free areas
    for (let i = 1; i <= 2; i++) {
      cages.push({
        id: `${_location}-free-${i}`,
        name: `Fri yta ${i}`,
        type: 'free-area',
        dogs: []
      });
    }
    
    return cages;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setContractData(prev => ({ ...prev, [name]: value }));
  };

  const saveDog = () => {
    if (!dogForm.name || !dogForm.owner || dogForm.locations.length === 0) {
      alert('Namn, ägare och minst en plats krävs');
      return;
    }

    const newDog: Dog = {
      id: editingDog?.id || `${Date.now()}`,
      name: dogForm.name,
      breed: dogForm.breed,
      age: dogForm.age,
      owner: dogForm.owner,
      phone: dogForm.phone,
      email: dogForm.email || undefined,
      notes: dogForm.notes,
      locations: dogForm.locations,
      // Only set type if it's not empty string
      type: (dogForm.type && dogForm.type.trim() !== '') 
        ? (dogForm.type as 'fulltime' | 'parttime-3' | 'parttime-2' | 'singleDay' | 'boarding')
        : undefined,
      isActive: dogForm.isActive,
      // Contract fields
      ownerAddress: dogForm.ownerAddress || undefined,
      ownerCity: dogForm.ownerCity || undefined,
      ownerPersonalNumber: dogForm.ownerPersonalNumber || undefined,
      chipNumber: dogForm.chipNumber || undefined
    };

    // Save to database
    saveDogToDb(newDog).then((savedDog) => {
      // Update local state
      let updatedDogs;
      if (editingDog) {
        updatedDogs = dogs.map(d => d.id === editingDog.id ? savedDog : d);
      } else {
        updatedDogs = [...dogs, savedDog];
      }
      setDogs(updatedDogs);
      localStorage.setItem('cleverDogs', JSON.stringify(updatedDogs));
    }).catch((error) => {
      console.error('Error saving dog:', error);
      // Fallback to localStorage
      let updatedDogs;
      if (editingDog) {
        updatedDogs = dogs.map(d => d.id === editingDog.id ? newDog : d);
      } else {
        updatedDogs = [...dogs, newDog];
      }
      setDogs(updatedDogs);
      localStorage.setItem('cleverDogs', JSON.stringify(updatedDogs));
    });
    setIsDogModalOpen(false);
    setEditingDog(null);
    setDogForm({ name: '', breed: '', age: '', owner: '', phone: '', email: '', notes: '', locations: ['staffanstorp'], type: '', isActive: true, ownerAddress: '', ownerCity: '', ownerPersonalNumber: '', chipNumber: '' });
  };

  const deleteDog = async (id: string) => {
    if (confirm('Är du säker på att du vill ta bort denna hund?')) {
      try {
        await deleteDogFromDb(id);
        const updatedDogs = dogs.filter(d => d.id !== id);
        setDogs(updatedDogs);
        localStorage.setItem('cleverDogs', JSON.stringify(updatedDogs));
      } catch (error) {
        console.error('Error deleting dog:', error);
        // Still update local state even if DB fails
        const updatedDogs = dogs.filter(d => d.id !== id);
        setDogs(updatedDogs);
        localStorage.setItem('cleverDogs', JSON.stringify(updatedDogs));
      }
    }
  };

  const openDogModal = (dog?: Dog) => {
    if (dog) {
      setEditingDog(dog);
      setDogForm({
        name: dog.name,
        breed: dog.breed,
        age: dog.age,
        owner: dog.owner,
        phone: dog.phone,
        email: dog.email || '',
        notes: dog.notes || '',
        locations: dog.locations,
        type: dog.type || '',
        isActive: dog.isActive !== undefined ? dog.isActive : true,
        ownerAddress: dog.ownerAddress || '',
        ownerCity: dog.ownerCity || '',
        ownerPersonalNumber: dog.ownerPersonalNumber || '',
        chipNumber: dog.chipNumber || ''
      });
    } else {
      setEditingDog(null);
      setDogForm({ name: '', breed: '', age: '', owner: '', phone: '', email: '', notes: '', locations: ['staffanstorp'], type: '', isActive: true, ownerAddress: '', ownerCity: '', ownerPersonalNumber: '', chipNumber: '' });
    }
    setIsDogModalOpen(true);
  };

  const handleDragStart = (_e: React.DragEvent, dog: Dog) => {
    setDraggedDog(dog);
  };

  const handleDragEnd = () => {
    setDraggedDog(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleInfoClick = (e: React.MouseEvent, dog: Dog) => {
    e.stopPropagation();
    e.preventDefault();
    openDogModal(dog);
  };

  const saveBoardingRecord = (location: 'malmo' | 'staffanstorp') => {
    if (!selectedDogForBoarding || !boardingForm.startDate || !boardingForm.endDate) {
      alert('Välj hund och datum krävs');
      return;
    }

    const selectedDog = dogs.find(d => d.id === selectedDogForBoarding);
    if (!selectedDog) return;

    // Check if dog belongs to this location
    if (!selectedDog.locations.includes(location)) {
      alert('Denna hund tillhör inte detta dagis');
      return;
    }

    const recordToSave: BoardingRecord = editingBoardingRecord
      ? {
          ...editingBoardingRecord,
          dogId: selectedDogForBoarding,
          dogName: selectedDog.name,
          location: location,
          startDate: boardingForm.startDate,
          endDate: boardingForm.endDate,
          notes: boardingForm.notes || undefined
        }
      : {
          id: `${Date.now()}`,
          dogId: selectedDogForBoarding,
          dogName: selectedDog.name,
          location: location,
          startDate: boardingForm.startDate,
          endDate: boardingForm.endDate,
          notes: boardingForm.notes || undefined,
          createdAt: new Date().toISOString(),
          isArchived: false
        };

    // Save to database
    saveBoardingRecordToDb(recordToSave).then((savedRecord) => {
      const updatedRecords = editingBoardingRecord
        ? boardingRecords.map(r => r.id === editingBoardingRecord.id ? savedRecord : r)
        : [...boardingRecords, savedRecord];
      setBoardingRecords(updatedRecords);
      localStorage.setItem('cleverBoarding', JSON.stringify(updatedRecords));
    }).catch((error) => {
      console.error('Error saving boarding record:', error);
      // Fallback to localStorage
      const updatedRecords = editingBoardingRecord
        ? boardingRecords.map(r => r.id === editingBoardingRecord.id ? recordToSave : r)
        : [...boardingRecords, recordToSave];
      setBoardingRecords(updatedRecords);
      localStorage.setItem('cleverBoarding', JSON.stringify(updatedRecords));
    });
    
    setIsBoardingModalOpen(false);
    setBoardingForm({ startDate: '', endDate: '', notes: '' });
    setSelectedDogForBoarding('');
    setBoardingDogSearch(''); // Clear search when closing
    setIsBoardingDogDropdownOpen(false); // Close dropdown when closing modal
    setEditingBoardingRecord(null);
  };

  const deleteBoardingRecord = async (id: string) => {
    if (confirm('Är du säker på att du vill ta bort denna registrering?')) {
      try {
        await deleteBoardingRecordFromDb(id);
        const updatedRecords = boardingRecords.filter(r => r.id !== id);
        setBoardingRecords(updatedRecords);
        localStorage.setItem('cleverBoarding', JSON.stringify(updatedRecords));
      } catch (error) {
        console.error('Error deleting boarding record:', error);
        // Still update local state
        const updatedRecords = boardingRecords.filter(r => r.id !== id);
        setBoardingRecords(updatedRecords);
        localStorage.setItem('cleverBoarding', JSON.stringify(updatedRecords));
      }
    }
  };

  const openBoardingModal = (location: 'malmo' | 'staffanstorp', record?: BoardingRecord) => {
    if (record) {
      setEditingBoardingRecord(record);
      setBoardingForm({
        startDate: record.startDate,
        endDate: record.endDate,
        notes: record.notes || ''
      });
      setSelectedDogForBoarding(record.dogId);
    } else {
      setEditingBoardingRecord(null);
      setBoardingForm({ startDate: '', endDate: '', notes: '' });
      setSelectedDogForBoarding('');
      setBoardingDogSearch(''); // Clear search when opening new
      setIsBoardingDogDropdownOpen(false); // Close dropdown when opening new
    }
    setIsBoardingModalOpen(true);
    // Store the location for use in saveBoardingRecord
    (window as any).currentBoardingLocation = location;
  };

  // Helper function to format time to HH:mm (remove seconds if present)
  const formatTime = (time: string): string => {
    if (!time) return '';
    // If time includes seconds (HH:mm:ss), remove them
    if (time.includes(':') && time.split(':').length === 3) {
      return time.substring(0, 5); // Return HH:mm
    }
    return time; // Already in HH:mm format
  };

  // Calculate Easter date (using algorithm for Gregorian calendar)
  const getEasterDate = (year: number): Date => {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  };

  // Check if a date is a Swedish red day (helgdag)
  const isSwedishRedDay = (date: Date): boolean => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const dayOfWeek = date.getDay();

    // Fixed red days
    if (month === 0 && day === 1) return true; // Nyårsdagen (New Year's Day)
    if (month === 0 && day === 6) return true; // Trettondedag jul (Epiphany)
    if (month === 4 && day === 1) return true; // Första maj (Labour Day)
    if (month === 5 && day === 6) return true; // Nationaldagen (National Day)
    if (month === 11 && day === 25) return true; // Juldagen (Christmas Day)
    if (month === 11 && day === 26) return true; // Annandag jul (Boxing Day)

    // Calculate Easter
    const easter = getEasterDate(year);
    const easterTime = easter.getTime();
    const dateTime = date.getTime();
    const daysDiff = Math.floor((dateTime - easterTime) / (1000 * 60 * 60 * 24));

    // Easter-related red days
    if (daysDiff === 0) return true; // Påskdagen (Easter Sunday)
    if (daysDiff === 1) return true; // Annandag påsk (Easter Monday)
    if (daysDiff === 39) return true; // Kristi himmelsfärdsdag (Ascension Day)
    if (daysDiff === 49) return true; // Pingstdagen (Whit Sunday)
    if (daysDiff === 50) return true; // Annandag pingst (Whit Monday)

    // Midsummer (Saturday between June 20-26)
    if (month === 5) { // June
      const midsummerDate = new Date(year, 5, 20); // June 20
      const midsummerDay = midsummerDate.getDay();
      const daysToSaturday = (6 - midsummerDay + 7) % 7;
      const midsummerSaturday = 20 + daysToSaturday;
      if (day === midsummerSaturday) return true;
    }

    // All Saints' Day (Saturday between October 31 - November 6)
    if (month === 10) { // November
      const allSaintsDate = new Date(year, 10, 1); // November 1
      const allSaintsDay = allSaintsDate.getDay();
      const daysToSaturday = (6 - allSaintsDay + 7) % 7;
      const allSaintsSaturday = 1 + daysToSaturday;
      if (day === allSaintsSaturday) return true;
    }

    return false;
  };

  // Calculate expected boarding cost with red days
  const calculateBoardingCost = (startDate: string, endDate: string, location: 'malmo' | 'staffanstorp'): { total: number; regularDays: number; redDays: number; regularCost: number; redDaysCost: number } => {
    if (!startDate || !endDate) {
      return { total: 0, regularDays: 0, redDays: 0, regularCost: 0, redDaysCost: 0 };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const prices = PRICES[location];

    let regularDays = 0;
    let redDays = 0;

    // Iterate through each day in the range (inclusive)
    const currentDate = new Date(start);
    while (currentDate <= end) {
      if (isSwedishRedDay(currentDate)) {
        redDays++;
      } else {
        regularDays++;
      }
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const regularCost = regularDays * prices.boarding;
    const redDaysCost = redDays * prices.boardingHoliday;
    const total = regularCost + redDaysCost;

    return { total, regularDays, redDays, regularCost, redDaysCost };
  };


  // Auto-archive records whenever boardingRecords changes
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const recordsToArchive = boardingRecords.filter(record => 
      record.endDate < today && !record.isArchived
    );
    
    if (recordsToArchive.length > 0) {
      // Archive all records that need archiving
      Promise.all(
        recordsToArchive.map(record => {
          const archivedRecord = { ...record, isArchived: true };
          return saveBoardingRecordToDb(archivedRecord).catch((error) => {
            console.error('Error archiving record:', error);
            return archivedRecord; // Return the local copy if DB save fails
          });
        })
      ).then((archivedRecords) => {
        const updatedRecords = boardingRecords.map(record => {
          const archived = archivedRecords.find(ar => ar.id === record.id);
          return archived || record;
        });
        setBoardingRecords(updatedRecords);
        localStorage.setItem('cleverBoarding', JSON.stringify(updatedRecords));
      });
    }
  }, [boardingRecords]);

  // Load meetings from database
  useEffect(() => {
    const loadMeetings = async () => {
      try {
        const loadedMeetings = await getMeetings();
        setMeetings(loadedMeetings);
      } catch (error) {
        console.error('Error loading meetings:', error);
      }
    };
    loadMeetings();
  }, []);

  // Load applications from database
  useEffect(() => {
    if (userRole !== 'admin' && userRole !== 'platschef') return; // Only load for admins and platschef
    
    const loadApplications = async () => {
      try {
        const filters: { status?: string; location?: string } = {};
        if (applicationsFilter !== 'all') {
          filters.status = applicationsFilter;
        }
        if (applicationsLocationFilter !== 'all') {
          filters.location = applicationsLocationFilter;
        }
        const loadedApplications = await getApplications(filters);
        setApplications(loadedApplications);
      } catch (error) {
        console.error('Error loading applications:', error);
      }
    };
    
    loadApplications();
  }, [userRole, applicationsFilter, applicationsLocationFilter]);

  // Redirect employees and platschef away from restricted views
  useEffect(() => {
    if (userRole === 'employee' && (currentView === 'contracts' || currentView === 'statistics' || currentView === 'settings' || currentView === 'applications')) {
      setCurrentView('dashboard');
    }
    // Platschef cannot access contracts and statistics
    if (userRole === 'platschef' && (currentView === 'contracts' || currentView === 'statistics')) {
      setCurrentView('dashboard');
    }
  }, [userRole, currentView]);

  // Close contract dog dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isContractDogDropdownOpen && !target.closest('.contract-dog-dropdown')) {
        setIsContractDogDropdownOpen(false);
        setContractDogSearch('');
      }
    };

    if (isContractDogDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isContractDogDropdownOpen]);

  // Close boarding dog dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isBoardingDogDropdownOpen && !target.closest('.boarding-dog-dropdown')) {
        setIsBoardingDogDropdownOpen(false);
        setBoardingDogSearch('');
      }
    };

    if (isBoardingDogDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isBoardingDogDropdownOpen]);

  const getBoardingRecordsByMonth = (records: BoardingRecord[], year: string) => {
    const recordsByMonth: { [key: string]: BoardingRecord[] } = {};
    
    records.forEach(record => {
      const recordYear = new Date(record.startDate).getFullYear().toString();
      if (recordYear === year) {
        const month = new Date(record.startDate).getMonth();
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        
        if (!recordsByMonth[monthKey]) {
          recordsByMonth[monthKey] = [];
        }
        recordsByMonth[monthKey].push(record);
      }
    });

    // Sort months and records within each month
    Object.keys(recordsByMonth).forEach(monthKey => {
      recordsByMonth[monthKey].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    });

    return recordsByMonth;
  };

  const categorizeBoardingRecords = (records: BoardingRecord[]) => {
    const today = new Date().toISOString().split('T')[0];
    
    return {
      future: records.filter(record => record.startDate > today),
      ongoing: records.filter(record => record.startDate <= today && record.endDate >= today),
      archived: records.filter(record => record.endDate < today)
    };
  };

  const getMonthName = (monthKey: string) => {
    const monthNames = [
      'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
      'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
    ];
    const month = parseInt(monthKey.split('-')[1]) - 1;
    return monthNames[month];
  };

  // Helper function to find the last location a dog was planned at
  const getLastPlannedLocation = (dogId: string): 'malmo' | 'staffanstorp' | null => {
    // Find all planning entries where this dog appears
    const dogPlanningEntries = planningHistory.filter(plan => 
      plan.cages && plan.cages.some(cage => 
        cage.dogs && Array.isArray(cage.dogs) && cage.dogs.includes(dogId)
      )
    );
    
    if (dogPlanningEntries.length === 0) return null;
    
    // Sort by date descending (most recent first)
    dogPlanningEntries.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });
    
    // Return the location of the most recent planning
    return dogPlanningEntries[0].location;
  };

  // Statistics calculation functions
  const calculateDogIncome = (dog: Dog, location: 'malmo' | 'staffanstorp', assignLocationForBoth: boolean = false): number => {
    // Safety checks
    if (!dog || !dog.locations) return 0;
    
    // Ensure locations is an array
    const locations = Array.isArray(dog.locations) ? dog.locations : [];
    if (!locations.includes(location)) return 0;
    
    // Handle dogs with both locations - only count to the last planned location
    if (assignLocationForBoth && locations.includes('malmo') && locations.includes('staffanstorp')) {
      const lastLocation = getLastPlannedLocation(dog.id);
      if (lastLocation === null) {
        // If never planned, use first location in array as fallback
        return location === locations[0] ? calculateDogIncomeForType(dog.type, location) : 0;
      }
      // Only count if this is the last planned location
      if (lastLocation !== location) return 0;
    }
    
    // Only calculate income if dog has a type (excluding singleDay and boarding)
    if (!dog.type || dog.type === 'singleDay' || dog.type === 'boarding') return 0;
    
    return calculateDogIncomeForType(dog.type, location);
  };

  // Helper function to calculate income for a specific dog type and location
  const calculateDogIncomeForType = (type: string | undefined, location: 'malmo' | 'staffanstorp'): number => {
    if (!type) return 0;
    const prices = PRICES[location];
    switch (type) {
      case 'fulltime':
        return prices.fulltime;
      case 'parttime-3':
        return prices.parttime3;
      case 'parttime-2':
        return prices.parttime2;
      default:
        return 0;
    }
  };

  const calculateBoardingIncome = (location: 'malmo' | 'staffanstorp', filter: StatisticsFilter): number => {
    const prices = PRICES[location];
    let filteredRecords = boardingRecords.filter(record => record.location === location);
    
    if (filter.period === 'year' && filter.year) {
      filteredRecords = filteredRecords.filter(record => {
        const recordYear = new Date(record.startDate).getFullYear();
        return recordYear === filter.year;
      });
    } else if (filter.period === 'month' && filter.year && filter.month) {
      filteredRecords = filteredRecords.filter(record => {
        const recordDate = new Date(record.startDate);
        return recordDate.getFullYear() === filter.year && 
               recordDate.getMonth() + 1 === filter.month;
      });
    }
    
    return filteredRecords.length * prices.boarding;
  };

  // Calculate single day income from planning history - counts ONLY actual planned days per singleDay dog
  // This ensures that singleDay dogs are only counted when they were actually planned, not just because they exist
  // IMPORTANT: Only counts dogs that were planned at the SPECIFIC location, not at other locations
  const calculateSingleDayIncome = (location: 'malmo' | 'staffanstorp', filter: StatisticsFilter, validDogsList: Dog[]): number => {
    if (!statisticsFilter.includeSingleDays) return 0;
    
    // CRITICAL: Filter planning history to ONLY include plans for this specific location
    // A dog planned at Staffanstorp should NOT count for Malmö income, even if registered at both locations
    let filteredPlanning = planningHistory.filter(p => {
      // Double-check that the location matches exactly
      return p.location === location && p.cages && Array.isArray(p.cages);
    });
    
    // Filter by period
    if (filter.period === 'year' && filter.year) {
      filteredPlanning = filteredPlanning.filter(p => {
        const planYear = new Date(p.date).getFullYear();
        return planYear === filter.year;
      });
    } else if (filter.period === 'month' && filter.year && filter.month) {
      filteredPlanning = filteredPlanning.filter(p => {
        const planDate = new Date(p.date);
        return planDate.getFullYear() === filter.year && 
               planDate.getMonth() + 1 === filter.month;
      });
    } else if (filter.period === 'all') {
      // For 'all' period, count all planning history for this location
      // No additional filtering needed
    }
    
    // Count how many times each singleDay dog was actually planned (in cages) at THIS location during the period
    // IMPORTANT: We ONLY count dogs that appear in planning history for THIS location (were actually planned here)
    // A singleDay dog that exists but was never planned at this location will NOT be counted
    // A dog planned at Staffanstorp will NOT count for Malmö, even if registered at both locations
    let totalSingleDayDays = 0;
    const processedDogs = new Set<string>(); // Track which dogs we've counted per date to avoid duplicates
    
    filteredPlanning.forEach(plan => {
      // Extra safety check: ensure plan location matches
      if (!plan.cages || !plan.date || plan.location !== location) return;
      
      plan.cages.forEach(cage => {
        if (!cage.dogs || !Array.isArray(cage.dogs)) return;
        
        cage.dogs.forEach(dogId => {
          // Find the dog to check if it's a singleDay dog
          const dog = validDogsList.find((d: Dog) => d.id === dogId);
          if (dog && dog.type === 'singleDay') {
            // Use date + dogId + location as unique key to avoid counting same dog twice on same date
            // The location in the key ensures we don't accidentally count a dog from another location
            const key = `${plan.date}-${dogId}-${location}`;
            if (!processedDogs.has(key)) {
              processedDogs.add(key);
              totalSingleDayDays++;
            }
          }
        });
      });
    });
    
    // Multiply by price - each planned day counts as one singleDay service
    return totalSingleDayDays * PRICES[location].singleDay;
  };

  // Calculate boarding income with proper day count
  // IMPORTANT: Only counts boarding records for the specified location that overlap with the filter period
  const calculateBoardingIncomeDetailed = (location: 'malmo' | 'staffanstorp', filter: StatisticsFilter): number => {
    if (!statisticsFilter.includeBoarding) return 0;
    
    const prices = PRICES[location];
    
    // CRITICAL: First filter by location only (don't exclude archived records for statistics)
    // Archived records should still be counted in statistics for past periods
    let filteredRecords = boardingRecords.filter(record => {
      // Ensure location matches exactly - a boarding at Staffanstorp should NOT count for Malmö
      return record.location === location;
    });
    
    // Filter by period
    if (filter.period === 'year' && filter.year) {
      filteredRecords = filteredRecords.filter(record => {
        const startDate = new Date(record.startDate);
        const endDate = new Date(record.endDate);
        const filterStart = new Date(filter.year!, 0, 1);
        const filterEnd = new Date(filter.year!, 11, 31);
        
        // Check if boarding period overlaps with filter year
        return startDate <= filterEnd && endDate >= filterStart;
      });
    } else if (filter.period === 'month' && filter.year && filter.month) {
      filteredRecords = filteredRecords.filter(record => {
        const startDate = new Date(record.startDate);
        const endDate = new Date(record.endDate);
        const filterStart = new Date(filter.year!, filter.month! - 1, 1);
        const filterEnd = new Date(filter.year!, filter.month!, 0); // Last day of month
        
        // Check if boarding period overlaps with filter month
        return startDate <= filterEnd && endDate >= filterStart;
      });
    }
    // For 'all' period, we count all records (already filtered by location)
    
    // Calculate total days and income - only for records that actually overlap with the period
    let totalDays = 0;
    filteredRecords.forEach(record => {
      const startDate = new Date(record.startDate);
      const endDate = new Date(record.endDate);
      
      if (filter.period === 'month' && filter.year && filter.month) {
        // Calculate only days within the filtered month
        const filterStart = new Date(filter.year, filter.month - 1, 1);
        const filterEnd = new Date(filter.year, filter.month, 0); // Last day of month
        
        const actualStart = startDate > filterStart ? startDate : filterStart;
        const actualEnd = endDate < filterEnd ? endDate : filterEnd;
        
        // Only count if there's an overlap
        if (actualStart <= actualEnd) {
          const daysDiff = Math.ceil((actualEnd.getTime() - actualStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          totalDays += daysDiff;
        }
      } else if (filter.period === 'year' && filter.year) {
        // Calculate only days within the filtered year
        const filterStart = new Date(filter.year, 0, 1);
        const filterEnd = new Date(filter.year, 11, 31);
        
        const actualStart = startDate > filterStart ? startDate : filterStart;
        const actualEnd = endDate < filterEnd ? endDate : filterEnd;
        
        // Only count if there's an overlap
        if (actualStart <= actualEnd) {
          const daysDiff = Math.ceil((actualEnd.getTime() - actualStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          totalDays += daysDiff;
        }
      } else {
        // For 'all' period: count all days in boarding period
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        totalDays += daysDiff;
      }
    });
    
    return totalDays * prices.boarding;
  };

  const getStatistics = (): DogStatistics => {
    // Ensure we have valid dogs data
    let validDogs = dogs.filter(dog => dog && dog.id);
    
    // Filter by active/inactive status
    if (statisticsFilter.includeActive && !statisticsFilter.includeInactive) {
      validDogs = validDogs.filter(dog => dog.isActive !== false); // Default true if undefined
    } else if (!statisticsFilter.includeActive && statisticsFilter.includeInactive) {
      validDogs = validDogs.filter(dog => dog.isActive === false);
    } else if (!statisticsFilter.includeActive && !statisticsFilter.includeInactive) {
      validDogs = []; // No dogs if both are excluded
    }
    
    let filteredDogs = validDogs;
    
    // Filter dogs by location
    if (statisticsFilter.location === 'malmo') {
      filteredDogs = validDogs.filter(dog => dog.locations && Array.isArray(dog.locations) && dog.locations.includes('malmo'));
    } else if (statisticsFilter.location === 'staffanstorp') {
      filteredDogs = validDogs.filter(dog => dog.locations && Array.isArray(dog.locations) && dog.locations.includes('staffanstorp'));
    }
    
    const malmoDogs = validDogs.filter(dog => dog && dog.locations && Array.isArray(dog.locations) && dog.locations.includes('malmo'));
    const staffanstorpDogs = validDogs.filter(dog => dog && dog.locations && Array.isArray(dog.locations) && dog.locations.includes('staffanstorp'));
    const bothLocationDogs = validDogs.filter(dog => {
      if (!dog || !dog.locations || !Array.isArray(dog.locations)) return false;
      return dog.locations.includes('malmo') && dog.locations.includes('staffanstorp');
    });
    
    // Calculate daycare income (monthly subscriptions) - ONLY for selected location if filter is set
    // For dogs with both locations, only count to the last planned location
    let malmoDaycareIncome = 0;
    let staffanstorpDaycareIncome = 0;
    
    if (statisticsFilter.location === 'all') {
      // Count both locations
      malmoDaycareIncome = malmoDogs.reduce((sum, dog) => {
        const income = calculateDogIncome(dog, 'malmo', true);
        return sum + income;
      }, 0);
      staffanstorpDaycareIncome = staffanstorpDogs.reduce((sum, dog) => {
        const income = calculateDogIncome(dog, 'staffanstorp', true);
        return sum + income;
      }, 0);
    } else if (statisticsFilter.location === 'malmo') {
      // Only count Malmö
      malmoDaycareIncome = malmoDogs.reduce((sum, dog) => {
        const income = calculateDogIncome(dog, 'malmo', true);
        return sum + income;
      }, 0);
      staffanstorpDaycareIncome = 0;
    } else if (statisticsFilter.location === 'staffanstorp') {
      // Only count Staffanstorp
      malmoDaycareIncome = 0;
      staffanstorpDaycareIncome = staffanstorpDogs.reduce((sum, dog) => {
        const income = calculateDogIncome(dog, 'staffanstorp', true);
        return sum + income;
      }, 0);
    }
    
    // Calculate boarding income - ONLY for selected location if filter is set
    let boardingMalmoIncome = 0;
    let boardingStaffanstorpIncome = 0;
    if (statisticsFilter.location === 'all') {
      // Count both locations
      boardingMalmoIncome = calculateBoardingIncomeDetailed('malmo', statisticsFilter);
      boardingStaffanstorpIncome = calculateBoardingIncomeDetailed('staffanstorp', statisticsFilter);
    } else if (statisticsFilter.location === 'malmo') {
      // Only count Malmö
      boardingMalmoIncome = calculateBoardingIncomeDetailed('malmo', statisticsFilter);
      boardingStaffanstorpIncome = 0;
    } else if (statisticsFilter.location === 'staffanstorp') {
      // Only count Staffanstorp
      boardingMalmoIncome = 0;
      boardingStaffanstorpIncome = calculateBoardingIncomeDetailed('staffanstorp', statisticsFilter);
    }
    
    // Calculate single day income from planning history - ONLY for selected location if filter is set
    let singleDayMalmoIncome = 0;
    let singleDayStaffanstorpIncome = 0;
    if (statisticsFilter.location === 'all') {
      // Count both locations
      singleDayMalmoIncome = calculateSingleDayIncome('malmo', statisticsFilter, validDogs);
      singleDayStaffanstorpIncome = calculateSingleDayIncome('staffanstorp', statisticsFilter, validDogs);
    } else if (statisticsFilter.location === 'malmo') {
      // Only count Malmö
      singleDayMalmoIncome = calculateSingleDayIncome('malmo', statisticsFilter, validDogs);
      singleDayStaffanstorpIncome = 0;
    } else if (statisticsFilter.location === 'staffanstorp') {
      // Only count Staffanstorp
      singleDayMalmoIncome = 0;
      singleDayStaffanstorpIncome = calculateSingleDayIncome('staffanstorp', statisticsFilter, validDogs);
    }
    
    // Total income calculations
    // IMPORTANT: PRICES are INCLUSIVE of VAT (as shown on the website)
    // So we need to calculate backwards: prices are with VAT, we need to extract VAT
    const totalDaycareIncome = malmoDaycareIncome + staffanstorpDaycareIncome;
    const totalBoardingIncome = boardingMalmoIncome + boardingStaffanstorpIncome;
    const totalSingleDayIncome = singleDayMalmoIncome + singleDayStaffanstorpIncome;
    
    // Prices from PRICES are inclusive of VAT, so this is the total with VAT
    const totalIncomeWithVAT = totalDaycareIncome + totalBoardingIncome + totalSingleDayIncome;
    // Calculate income without VAT by dividing by (1 + VAT_RATE)
    const totalIncomeWithoutVAT = totalIncomeWithVAT / (1 + VAT_RATE);
    
    // Income by type (monthly subscriptions) - respect location filter
    const incomeByType = {
      fulltime: filteredDogs
        .filter(dog => dog && dog.type === 'fulltime' && dog.locations && Array.isArray(dog.locations))
        .reduce((sum, dog) => {
          // Respect location filter
          if (statisticsFilter.location === 'all') {
            const malmoIncome = calculateDogIncome(dog, 'malmo', true);
            const staffanstorpIncome = calculateDogIncome(dog, 'staffanstorp', true);
            return sum + malmoIncome + staffanstorpIncome;
          } else if (statisticsFilter.location === 'malmo') {
            return sum + calculateDogIncome(dog, 'malmo', true);
          } else if (statisticsFilter.location === 'staffanstorp') {
            return sum + calculateDogIncome(dog, 'staffanstorp', true);
          }
          return sum;
        }, 0),
      parttime3: filteredDogs
        .filter(dog => dog && dog.type === 'parttime-3' && dog.locations && Array.isArray(dog.locations))
        .reduce((sum, dog) => {
          // Respect location filter
          if (statisticsFilter.location === 'all') {
            const malmoIncome = calculateDogIncome(dog, 'malmo', true);
            const staffanstorpIncome = calculateDogIncome(dog, 'staffanstorp', true);
            return sum + malmoIncome + staffanstorpIncome;
          } else if (statisticsFilter.location === 'malmo') {
            return sum + calculateDogIncome(dog, 'malmo', true);
          } else if (statisticsFilter.location === 'staffanstorp') {
            return sum + calculateDogIncome(dog, 'staffanstorp', true);
          }
          return sum;
        }, 0),
      parttime2: filteredDogs
        .filter(dog => dog && dog.type === 'parttime-2' && dog.locations && Array.isArray(dog.locations))
        .reduce((sum, dog) => {
          // Respect location filter
          if (statisticsFilter.location === 'all') {
            const malmoIncome = calculateDogIncome(dog, 'malmo', true);
            const staffanstorpIncome = calculateDogIncome(dog, 'staffanstorp', true);
            return sum + malmoIncome + staffanstorpIncome;
          } else if (statisticsFilter.location === 'malmo') {
            return sum + calculateDogIncome(dog, 'malmo', true);
          } else if (statisticsFilter.location === 'staffanstorp') {
            return sum + calculateDogIncome(dog, 'staffanstorp', true);
          }
          return sum;
        }, 0),
      singleDay: totalSingleDayIncome,
      boarding: totalBoardingIncome
    };
    
    // Income by category
    const incomeByCategory = {
      daycare: totalDaycareIncome,
      boarding: totalBoardingIncome,
      singleDays: totalSingleDayIncome
    };
    
    return {
      totalDogs: filteredDogs.length,
      malmoDogs: malmoDogs.length,
      staffanstorpDogs: staffanstorpDogs.length,
      bothLocationDogs: bothLocationDogs.length,
      totalIncome: totalIncomeWithoutVAT,
      totalIncomeWithVAT: totalIncomeWithVAT,
      totalIncomeWithoutVAT: totalIncomeWithoutVAT,
      malmoIncome: malmoDaycareIncome + boardingMalmoIncome + singleDayMalmoIncome,
      staffanstorpIncome: staffanstorpDaycareIncome + boardingStaffanstorpIncome + singleDayStaffanstorpIncome,
      incomeByType,
      incomeByCategory
    };
  };

  const handleDrop = (cageId: string, location: 'staffanstorp' | 'malmo') => {
    if (!draggedDog) return;

    const planning = location === 'staffanstorp' ? planningStaffanstorp : planningMalmo;
    const updatePlanning = location === 'staffanstorp' ? setPlanningStaffanstorp : setPlanningMalmo;

    const updatedCages = planning.map(cage => {
      // Remove dog from its old cage if it exists
      if (cage.dogs && cage.dogs.includes(draggedDog.id)) {
        return { ...cage, dogs: cage.dogs.filter(dogId => dogId !== draggedDog.id) };
      }
      // Add dog to the dropped cage
      if (cage.id === cageId) {
        return { ...cage, dogs: [...(cage.dogs || []), draggedDog.id] };
      }
      return cage;
    });

    updatePlanning(updatedCages);
    
    // Auto-save planning data with current date
    setTimeout(() => {
      savePlanningData(location, updatedCages);
    }, 100);
    
    setDraggedDog(null);
  };

  const removeDogFromCage = (cageId: string, dogId: string, location: 'staffanstorp' | 'malmo') => {
    const planning = location === 'staffanstorp' ? planningStaffanstorp : planningMalmo;
    const updatePlanning = location === 'staffanstorp' ? setPlanningStaffanstorp : setPlanningMalmo;

    const updatedCages = planning.map(cage => {
      if (cage.id === cageId && cage.dogs) {
        return { ...cage, dogs: cage.dogs.filter(id => id !== dogId) };
      }
      return cage;
    });

    updatePlanning(updatedCages);
    
    // Auto-save planning data
    setTimeout(() => {
      savePlanningData(location, updatedCages);
    }, 100);
  };

  const resetCages = (location: 'staffanstorp' | 'malmo') => {
    if (confirm('Är du säker på att du vill återställa alla burar för denna dag?')) {
      const newCages = createInitialCages(location);
      
      if (location === 'staffanstorp') {
        setPlanningStaffanstorp(newCages);
      } else {
        setPlanningMalmo(newCages);
      }

      // Save to database
      setTimeout(() => {
        savePlanningData(location, newCages);
      }, 100);
    }
  };

  // Copy planning from another date
  const copyPlanningFromDate = async (
    sourceDate: string, 
    location: 'staffanstorp' | 'malmo',
    includeBoarding: boolean
  ) => {
    try {
      // Get planning from source date
      const sourcePlanning = await getPlanningForDate(sourceDate, location);
      
      if (!sourcePlanning || !sourcePlanning.cages) {
        alert(`Ingen planering hittades för ${new Date(sourceDate).toLocaleDateString('sv-SE')}`);
        return;
      }

      // Get boarding dogs for current date to filter them out if needed
      const currentDateBoardingRecords = boardingRecords.filter(record => 
        record.location === location &&
        !record.isArchived &&
        record.startDate <= currentPlanningDate &&
        record.endDate >= currentPlanningDate
      );
      const boardingDogIds = currentDateBoardingRecords.map(record => record.dogId);

      // Copy cages and optionally filter out boarding dogs
      const copiedCages: Cage[] = sourcePlanning.cages.map(cage => {
        const copiedDogs = (cage.dogs || []).filter(dogId => {
          if (!includeBoarding && boardingDogIds.includes(dogId)) {
            return false; // Exclude boarding dogs
          }
          return true; // Include all dogs or only non-boarding dogs
        });
        return {
          ...cage,
          dogs: copiedDogs
        };
      });

      // Update planning state
      if (location === 'staffanstorp') {
        setPlanningStaffanstorp(copiedCages);
      } else {
        setPlanningMalmo(copiedCages);
      }

      // Save to database
      setTimeout(() => {
        savePlanningData(location, copiedCages);
      }, 100);

      setIsCopyModalOpen(false);
      alert(`Planering kopierad från ${new Date(sourceDate).toLocaleDateString('sv-SE')}`);
    } catch (error) {
      console.error('Error copying planning:', error);
      alert('Fel uppstod vid kopiering av planering');
    }
  };

  const generateContractHTML = (): string => {
    // Format date as DD/MM/YYYY
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    };

    const today = formatDate(new Date().toISOString());
    
    // Create a simple contract with proper page break controls
    let contractHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Contract</title>
        <style>
          @media print {
            body { 
              margin: 0;
              padding: 0;
            }
            h2 { 
              page-break-after: avoid !important;
            }
            p, li {
              page-break-inside: avoid !important;
            }
            .section {
              page-break-inside: avoid !important;
            }
            .avoid-break {
              page-break-inside: avoid !important;
            }
          }
          
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10pt;
            line-height: 1.2;
            margin: 15mm 12mm;
            color: #000;
          }
          h1 {
            text-align: center;
            font-size: 12pt;
            font-weight: bold;
            margin-bottom: 10px;
            border-bottom: 1px solid #000;
            padding-bottom: 3px;
            color: #2a3f5f;
          }
          h2 {
            font-size: 10pt;
            font-weight: bold;
            margin-top: 10px;
            margin-bottom: 4px;
            color: #2a3f5f;
            border-bottom: 0.5px solid #ddd;
            padding-bottom: 2px;
          }
          p {
            margin: 4px 0;
          }
          ol, ul {
            margin: 4px 0;
            padding-left: 20px;
          }
          li {
            margin-bottom: 2px;
          }
          .section {
            margin-bottom: 8px;
            border-left: 2px solid #f5f5f5;
            padding-left: 6px;
          }
          .signatures {
            margin-top: 20px;
          }
          .signature-line {
            border-top: 1px solid black;
            width: 200px;
            display: inline-block;
            margin-bottom: 2px;
          }
          .date-line {
            border-bottom: 1px solid black;
            width: 250px;
            display: inline-block;
            margin: 0 5px;
          }
          table {
            width: 100%;
            margin-top: 10px;
          }
          td {
            width: 50%;
            padding-top: 5px;
            vertical-align: top;
          }
          /* Compact lists */
          ul li, ol li {
            padding-top: 0;
            padding-bottom: 0;
          }
          /* Inner lists more compact */
          li ul, li ol {
            margin-top: 1px;
            margin-bottom: 1px;
          }
          /* More compact layout overall */
          * {
            box-sizing: border-box;
          }
          .header {
            text-align: center;
            margin-bottom: 15px;
          }
          .company-name {
            font-weight: bold;
            font-size: 11pt;
            color: #2a3f5f;
          }
          .contract-subtitle {
            font-style: italic;
            font-size: 9pt;
            color: #555;
            margin-top: 2px;
          }
          .signature-name {
            font-size: 9pt;
            font-weight: bold;
          }
          .signature-title {
            font-size: 8pt;
            color: #555;
            margin-top: 1px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">CleverDog</div>
          <div class="contract-subtitle">För hundens bästa</div>
        </div>
      
        <h1>AVTAL ${contractData.contractType === 'daycare' ? 'HUNDDAGIS' : 
                      contractData.contractType === 'boarding' ? 'HUNDPENSIONAT' : 
                      contractData.contractType === 'socialWalk' ? 'SOCIAL PROMENAD' : 
                      contractData.contractType === 'partTime' ? 'DELTID HUNDDAGIS' : 'ENKELDAGIS'}</h1>
        
        <p>Ingånget den ${today} mellan:</p>
        <ol>
          <li>CleverDog, beläget på Malmövägen 7 Staffanstorp, organisationsnummer 20020922-5325, 
            företrätt av Alicja Wekwert, hädanefter kallad "Hunddagiset", och</li>
          <li>${contractData.customerName} bosatt i ${contractData.customerCity} på ${contractData.customerAddress}, personnummer ${contractData.personalNumber}, 
            hädanefter kallad "Ägaren", avseende omsorg om hunden:</li>
        </ol>

        <ul class="avoid-break">
          <li>Hundens namn: ${contractData.dogName}</li>
          <li>Ras: ${contractData.dogBreed}</li>
          <li>Ålder: ${contractData.dogAge} år</li>
          <li>Mikrochip-/ tatueringnummer: ${contractData.chipNumber}</li>
        </ul>

        <div class="section avoid-break">
          <h2>§1 Avtalets föremål</h2>
          <ol>
            ${contractData.contractType === 'daycare' ? `
            <li>Hunddagiset åtar sig att ta hand om Ägarens hund och tillhandahålla:
              <ul>
                <li>socialisering med andra hundar,</li>
                <li>grundläggande lydnadsträning,</li>
                <li>lek och fysisk aktivitet,</li>
                <li>utfodring (enligt överenskommelse med Ägaren),</li>
                <li>säkerhet och tillsyn.</li>
              </ul>
            </li>
            <li>Omsorgen erbjuds på vardagar mellan kl. 7:00 och 18:00 (17* Fredag).</li>
            <li>Ägaren åtar sig att lämna och hämta hunden i tid.</li>
            ` : contractData.contractType === 'partTime' ? `
            <li>Hunddagiset åtar sig att ta hand om Ägarens hund ${contractData.daysPerWeek} dagar i veckan och tillhandahålla:
              <ul>
                <li>socialisering med andra hundar,</li>
                <li>grundläggande lydnadsträning,</li>
                <li>lek och fysisk aktivitet,</li>
                <li>utfodring (enligt överenskommelse med Ägaren),</li>
                <li>säkerhet och tillsyn.</li>
              </ul>
            </li>
            <li>Omsorgen erbjuds på vardagar mellan kl. 7:00 och 18:00 (17* Fredag).</li>
            <li>Ägaren åtar sig att lämna och hämta hunden i tid.</li>
            ` : contractData.contractType === 'boarding' ? `
            <li>Hunddagiset åtar sig att ta hand om Ägarens hund under perioden ${formatDate(contractData.startDate)} till ${formatDate(contractData.endDate)} och tillhandahålla:
              <ul>
                <li>boende och övernattning,</li>
                <li>socialisering med andra hundar,</li>
                <li>grundläggande lydnadsträning,</li>
                <li>lek och fysisk aktivitet,</li>
                <li>utfodring (enligt överenskommelse med Ägaren),</li>
                <li>säkerhet och tillsyn dygnet runt.</li>
              </ul>
            </li>
            <li>Ägaren åtar sig att lämna och hämta hunden enligt överenskomna tider.</li>
            ` : contractData.contractType === 'singleDay' ? `
            <li>Hunddagiset åtar sig att ta hand om Ägarens hund enstaka dag och tillhandahålla:
              <ul>
                <li>socialisering med andra hundar,</li>
                <li>grundläggande lydnadsträning,</li>
                <li>lek och fysisk aktivitet,</li>
                <li>utfodring (enligt överenskommelse med Ägaren),</li>
                <li>säkerhet och tillsyn.</li>
              </ul>
            </li>
            <li>Omsorgen erbjuds på vardagar mellan kl. 7:00 och 18:00 (17* Fredag).</li>
            <li>Ägaren åtar sig att lämna och hämta hunden i tid.</li>
            ` : `
            <li>Hunddagiset åtar sig att ta hand om Ägarens hund under sociala promenader och tillhandahålla:
              <ul>
                <li>socialisering med andra hundar,</li>
                <li>fysisk aktivitet och stimulans,</li>
                <li>säkerhet och tillsyn under promenaden.</li>
              </ul>
            </li>
            <li>De sociala promenaderna sker på schemalagda tider enligt överenskommelse.</li>
            `}
          </ol>
        </div>
        
        <div class="section avoid-break">
          <h2>§2 Ägarens ansvar</h2>
          <ol>
            <li>Ägaren intygar att hunden är frisk, har aktuella vaccinationer och inte uppvisar aggressivt beteende.</li>
            <li>Ägaren förbinder sig att tillhandahålla:
              <ul>
                ${contractData.contractType === 'boarding' ? `
                <li>hundens hälsobok,</li>
                <li>tillräckligt med foder för vistelsen,</li>
                <li>mediciner om sådana behövs,</li>
                <li>koppel och halsband/sele.</li>
                ` : contractData.contractType === 'socialWalk' ? `
                <li>koppel och halsband/sele,</li>
                <li>information om hundens särskilda behov.</li>
                ` : `
                <li>hundens hälsobok,</li>
                <li>foder (om särskild diet krävs),</li>
                <li>koppel och halsband/sele.</li>
                `}
              </ul>
            </li>
            <li>Ägaren är fullt ansvarig för eventuella skador orsakade av hunden.</li>
          </ol>
        </div>
        
        <div class="section avoid-break">
          <h2>§3 Avgifter</h2>
          <ol>
            ${contractData.contractType === 'daycare' ? `
            <li>Kostnaden för hunddagis är ${contractData.price}kr per månad och ska betalas senast den 27 varje månad.</li>
            <li>Vid frånvaro återbetalas inte avgiften.</li>
            <li>Dagiset har rätt till 25 semesterdagar per år. Dessa dagar är inkluderade i det månatliga abonnemanget och ersätts inte ekonomiskt.</li>
            ` : contractData.contractType === 'partTime' ? `
            <li>Kostnaden för deltid hunddagis är ${contractData.price}kr per månad och ska betalas senast den 27 varje månad.</li>
            <li>Vid frånvaro återbetalas inte avgiften.</li>
            <li>Dagiset har rätt till 25 semesterdagar per år. Dessa dagar är inkluderade i det månatliga abonnemanget och ersätts inte ekonomiskt.</li>
            ` : contractData.contractType === 'boarding' ? `
            <li>Kostnaden för hundpensionat är ${contractData.price}kr totalt för hela vistelsen och ska betalas i samband med lämning av hunden.</li>
            <li>Vid avbokning mindre än 7 dagar före vistelsen debiteras 50% av priset.</li>
            ` : contractData.contractType === 'singleDay' ? `
            <li>Kostnaden för enstaka dag är 350kr per dag och ska betalas i förväg.</li>
            <li>Vid avbokning mindre än 7 dagar före dagen återbetalas inte avgiften.</li>
            ` : `
            <li>Kostnaden för sociala promenader är ${contractData.price}kr per gång och ska betalas i förväg.</li>
            <li>Vid avbokning mindre än 24 timmar före promenaden återbetalas inte avgiften.</li>
            `}
          </ol>
        </div>
      
        <div class="section avoid-break">
          <h2>§4 Ansvar</h2>
          <ol>
            <li>Hunddagiset förbinder sig att se till hundens säkerhet, men ansvarar inte för skador som uppstår vid naturliga interaktioner mellan hundar.</li>
            <li>Vid akut sjukdom hos hunden försöker Hunddagiset kontakta Ägaren. Om kontakt inte är möjlig har Hunddagiset rätt att anlita en veterinär på Ägarens bekostnad.</li>
          </ol>
        </div>
        
        <div class="section avoid-break">
          <h2>§5 Avtalstid och uppsägning</h2>
          <ol>
            ${contractData.contractType === 'singleDay' ? `
            <li>Avtalet gäller för den ${formatDate(contractData.startDate)}.</li>
            <li>Vid avbokning mindre än 7 dagar före dagen återbetalas inte avgiften.</li>
            ` : `
            <li>Avtalet gäller från ${formatDate(contractData.startDate)} till ${formatDate(contractData.endDate)}.</li>
            <li>Vardera parten kan säga upp avtalet med en uppsägningstid på 7 dagar.</li>
            `}
            <li>Hunddagiset har rätt att omedelbart säga upp avtalet vid aggressivt beteende hos hunden eller om Ägaren bryter mot reglerna.</li>
          </ol>
        </div>
        
        <div class="section avoid-break">
          <h2>§6 Slutbestämmelser</h2>
          <ol>
            <li>För frågor som inte regleras i detta avtal gäller bestämmelserna i svensk lag.</li>
            <li>Avtalet upprättas i två likalydande exemplar, ett för vardera part.</li>
          </ol>
        </div>
      
        <div class="signatures avoid-break">
          <p>Ort och datum: <span class="date-line"></span></p>
          
          <table style="margin-top: 50px;">
            <tr>
              <td>
                <div class="signature-line"></div>
                <p class="signature-name">CleverDog, Alicja Wekwert</p>
                <p class="signature-title">Verksamhetsägare</p>
              </td>
              <td>
                <div class="signature-line"></div>
                <p class="signature-name">${contractData.customerName}</p>
                <p class="signature-title">Hundägare</p>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;

    return contractHTML;
  };

  const generatePDF = () => {
    const contractHTML = generateContractHTML();
    
    // Create a temporary div to render the HTML content
    const element = document.createElement('div');
    element.innerHTML = contractHTML;
    document.body.appendChild(element);
    
    // PDF options with proper page break handling
    const options = {
      margin: [8, 8, 8, 8],
      filename: `contract-${contractData.contractType}-${contractData.dogName}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { 
        scale: 2,
        useCORS: true
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait',
        compress: true
      },
      pagebreak: {
        mode: ['avoid-all', 'css', 'legacy']
      }
    };

    // Generate PDF
    html2pdf().from(element).set(options).save().then(() => {
      // Remove the temporary element after PDF generation
      document.body.removeChild(element);
    });
  };

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
          <div className="flex justify-center mb-8">
            <FaLock className="text-4xl text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
            CleverDog Admin
          </h2>
          <p className="text-center text-gray-600 mb-4 text-sm">
            Logga in med din e-postadress och lösenord
          </p>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">E-postadress</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                required
                disabled={isLoading}
                placeholder="din@epost.se"
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Lösenord</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                required
                disabled={isLoading}
                placeholder="••••••••"
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-colors"
              disabled={isLoading}
            >
              {isLoading ? 'Loggar in...' : 'Logga in'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const renderDashboard = () => {
    // Employees should only see meetings, not dashboard
    if (userRole === 'employee') {
      return renderMeetings();
    }

    return (
    <div className="space-y-4 sm:space-y-8">
      {/* Header */}
      <div className="text-center px-2">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Välkommen till CleverDog Admin</h2>
        <p className="text-sm sm:text-base text-gray-600">Hantera hundar, planering och pensionat</p>
      </div>

      {/* Main Categories */}
      <div className="space-y-4 sm:space-y-8">
        {/* Hundar & Kontrakt */}
        <div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center px-2">
            <FaDog className="mr-2 text-blue-600" />
            Hundar & Kontrakt
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 px-2">
            <div 
              onClick={() => setCurrentView('dogs')}
              className="bg-white rounded-xl shadow-lg p-4 sm:p-6 cursor-pointer hover:shadow-xl transition-all duration-200 border-2 border-transparent hover:border-blue-200 active:scale-95 sm:hover:scale-105"
            >
              <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full mb-3 sm:mb-4 mx-auto">
                <FaDog className="text-blue-600 text-xl sm:text-2xl" />
              </div>
              <h4 className="text-base sm:text-lg font-bold text-center text-gray-900 mb-2">Hundar</h4>
              <p className="text-center text-gray-600 text-xs sm:text-sm">Hantera hundregister och information</p>
              <div className="mt-2 sm:mt-3 text-center">
                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {dogs.length} hundar registrerade
                </span>
              </div>
            </div>

            {userRole === 'admin' && (
              <div 
                onClick={() => setCurrentView('contracts')}
                className="bg-white rounded-xl shadow-lg p-4 sm:p-6 cursor-pointer hover:shadow-xl transition-all duration-200 border-2 border-transparent hover:border-green-200 active:scale-95 sm:hover:scale-105"
              >
                <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full mb-3 sm:mb-4 mx-auto">
                  <FaFilePdf className="text-green-600 text-xl sm:text-2xl" />
                </div>
                <h4 className="text-base sm:text-lg font-bold text-center text-gray-900 mb-2">Kontrakt</h4>
                <p className="text-center text-gray-600 text-xs sm:text-sm">Skapa och hantera dagiskontrakt</p>
                <div className="mt-2 sm:mt-3 text-center">
                  <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                    PDF-generator
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dagisplanering */}
        <div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center px-2">
            <FaCalendarAlt className="mr-2 text-purple-600" />
            Dagisplanering
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 px-2">
            <div 
              onClick={() => setCurrentView('planning-malmo')}
              className="bg-white rounded-xl shadow-lg p-4 sm:p-6 cursor-pointer hover:shadow-xl transition-all duration-200 border-2 border-transparent hover:border-purple-200 active:scale-95 sm:hover:scale-105"
            >
              <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-purple-100 rounded-full mb-3 sm:mb-4 mx-auto">
                <FaCalendarAlt className="text-purple-600 text-xl sm:text-2xl" />
              </div>
              <h4 className="text-base sm:text-lg font-bold text-center text-gray-900 mb-2">Planering Malmö</h4>
              <p className="text-center text-gray-600 text-xs sm:text-sm">Drag & drop planering för Malmö</p>
              <div className="mt-2 sm:mt-3 text-center">
                <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                  Live planering
                </span>
              </div>
            </div>

            <div 
              onClick={() => setCurrentView('planning-staffanstorp')}
              className="bg-white rounded-xl shadow-lg p-4 sm:p-6 cursor-pointer hover:shadow-xl transition-all duration-200 border-2 border-transparent hover:border-purple-200 active:scale-95 sm:hover:scale-105"
            >
              <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-purple-100 rounded-full mb-3 sm:mb-4 mx-auto">
                <FaCalendarAlt className="text-purple-600 text-xl sm:text-2xl" />
              </div>
              <h4 className="text-base sm:text-lg font-bold text-center text-gray-900 mb-2">Planering Staffanstorp</h4>
              <p className="text-center text-gray-600 text-xs sm:text-sm">Drag & drop planering för Staffanstorp</p>
              <div className="mt-2 sm:mt-3 text-center">
                <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                  Live planering
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Kalender & Historik */}
        <div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center px-2">
            <FaCalendarAlt className="mr-2 text-indigo-600" />
            Kalender & Historik
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 px-2">
            <div 
              onClick={() => setCurrentView('calendar-malmo')}
              className="bg-white rounded-xl shadow-lg p-4 sm:p-6 cursor-pointer hover:shadow-xl transition-all duration-200 border-2 border-transparent hover:border-indigo-200 active:scale-95 sm:hover:scale-105"
            >
              <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-indigo-100 rounded-full mb-3 sm:mb-4 mx-auto">
                <FaCalendarAlt className="text-indigo-600 text-xl sm:text-2xl" />
              </div>
              <h4 className="text-base sm:text-lg font-bold text-center text-gray-900 mb-2">Kalender Malmö</h4>
              <p className="text-center text-gray-600 text-xs sm:text-sm">Planeringshistorik och kalendervy</p>
              <div className="mt-2 sm:mt-3 text-center">
                <span className="inline-block bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">
                  Veckovy
                </span>
              </div>
            </div>

            <div 
              onClick={() => setCurrentView('calendar-staffanstorp')}
              className="bg-white rounded-xl shadow-lg p-4 sm:p-6 cursor-pointer hover:shadow-xl transition-all duration-200 border-2 border-transparent hover:border-indigo-200 active:scale-95 sm:hover:scale-105"
            >
              <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-indigo-100 rounded-full mb-3 sm:mb-4 mx-auto">
                <FaCalendarAlt className="text-indigo-600 text-xl sm:text-2xl" />
              </div>
              <h4 className="text-base sm:text-lg font-bold text-center text-gray-900 mb-2">Kalender Staffanstorp</h4>
              <p className="text-center text-gray-600 text-xs sm:text-sm">Planeringshistorik och kalendervy</p>
              <div className="mt-2 sm:mt-3 text-center">
                <span className="inline-block bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">
                  Veckovy
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Hundpensionat */}
        <div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center px-2">
            <FaDog className="mr-2 text-red-600" />
            Hundpensionat
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 px-2">
            <div 
              onClick={() => setCurrentView('boarding-malmo')}
              className="bg-white rounded-xl shadow-lg p-4 sm:p-6 cursor-pointer hover:shadow-xl transition-all duration-200 border-2 border-transparent hover:border-red-200 active:scale-95 sm:hover:scale-105"
            >
              <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-red-100 rounded-full mb-3 sm:mb-4 mx-auto">
                <FaDog className="text-red-600 text-xl sm:text-2xl" />
              </div>
              <h4 className="text-base sm:text-lg font-bold text-center text-gray-900 mb-2">Pensionat Malmö</h4>
              <p className="text-center text-gray-600 text-xs sm:text-sm">Hundpensionat registreringar</p>
              <div className="mt-2 sm:mt-3 text-center">
                <span className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                  {boardingRecords.filter(r => r.location === 'malmo').length} registreringar
                </span>
              </div>
            </div>

            <div 
              onClick={() => setCurrentView('boarding-staffanstorp')}
              className="bg-white rounded-xl shadow-lg p-4 sm:p-6 cursor-pointer hover:shadow-xl transition-all duration-200 border-2 border-transparent hover:border-red-200 active:scale-95 sm:hover:scale-105"
            >
              <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-red-100 rounded-full mb-3 sm:mb-4 mx-auto">
                <FaDog className="text-red-600 text-xl sm:text-2xl" />
              </div>
              <h4 className="text-base sm:text-lg font-bold text-center text-gray-900 mb-2">Pensionat Staffanstorp</h4>
              <p className="text-center text-gray-600 text-xs sm:text-sm">Hundpensionat registreringar</p>
              <div className="mt-2 sm:mt-3 text-center">
                <span className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                  {boardingRecords.filter(r => r.location === 'staffanstorp').length} registreringar
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Statistik & Analys - Only for admin */}
        {userRole === 'admin' && (
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center px-2">
              <FaChartBar className="mr-2 text-emerald-600" />
              Statistik & Analys
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 px-2">
              <div 
                onClick={() => setCurrentView('statistics')}
                className="bg-white rounded-xl shadow-lg p-4 sm:p-6 cursor-pointer hover:shadow-xl transition-all duration-200 border-2 border-transparent hover:border-emerald-200 active:scale-95 sm:hover:scale-105"
              >
                <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-emerald-100 rounded-full mb-3 sm:mb-4 mx-auto">
                  <FaChartBar className="text-emerald-600 text-xl sm:text-2xl" />
                </div>
                <h4 className="text-base sm:text-lg font-bold text-center text-gray-900 mb-2">Statistik & Inkomst</h4>
                <p className="text-center text-gray-600 text-xs sm:text-sm">Detaljerad statistik och inkomstanalys</p>
                <div className="mt-2 sm:mt-3 text-center">
                  <span className="inline-block bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full">
                    Filtrerbar statistik
                  </span>
                </div>
              </div>

              <div 
                onClick={() => setCurrentView('applications')}
                className="bg-white rounded-xl shadow-lg p-4 sm:p-6 cursor-pointer hover:shadow-xl transition-all duration-200 border-2 border-transparent hover:border-blue-200 active:scale-95 sm:hover:scale-105"
              >
                <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full mb-3 sm:mb-4 mx-auto">
                  <FaDog className="text-blue-600 text-xl sm:text-2xl" />
                </div>
                <h4 className="text-base sm:text-lg font-bold text-center text-gray-900 mb-2">Ansökningar</h4>
                <p className="text-center text-gray-600 text-xs sm:text-sm">Granska och hantera nya ansökningar</p>
                <div className="mt-2 sm:mt-3 text-center">
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {applications.filter(a => a.status === 'new').length} nya
                  </span>
                </div>
              </div>

              <div 
                onClick={() => setCurrentView('meetings')}
                className="bg-white rounded-xl shadow-lg p-4 sm:p-6 cursor-pointer hover:shadow-xl transition-all duration-200 border-2 border-transparent hover:border-orange-200 active:scale-95 sm:hover:scale-105"
              >
                <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-orange-100 rounded-full mb-3 sm:mb-4 mx-auto">
                  <FaCalendarAlt className="text-orange-600 text-xl sm:text-2xl" />
                </div>
                <h4 className="text-base sm:text-lg font-bold text-center text-gray-900 mb-2">Möten</h4>
                <p className="text-center text-gray-600 text-xs sm:text-sm">Boka och hantera kundmöten</p>
                <div className="mt-2 sm:mt-3 text-center">
                  <span className="inline-block bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                    {meetings.length} möten
                  </span>
                </div>
              </div>

              <div 
                onClick={() => setCurrentView('settings')}
                className="bg-white rounded-xl shadow-lg p-4 sm:p-6 cursor-pointer hover:shadow-xl transition-all duration-200 border-2 border-transparent hover:border-gray-200 active:scale-95 sm:hover:scale-105"
              >
                <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full mb-3 sm:mb-4 mx-auto">
                  <FaEdit className="text-gray-600 text-xl sm:text-2xl" />
                </div>
                <h4 className="text-base sm:text-lg font-bold text-center text-gray-900 mb-2">Inställningar</h4>
                <p className="text-center text-gray-600 text-xs sm:text-sm">Hantera boxar och burar</p>
                <div className="mt-2 sm:mt-3 text-center">
                  <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                    Box-konfiguration
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ansökningar & Inställningar - For platschef */}
        {userRole === 'platschef' && (
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center px-2">
              <FaDog className="mr-2 text-blue-600" />
              Administration
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 px-2">
              <div 
                onClick={() => setCurrentView('applications')}
                className="bg-white rounded-xl shadow-lg p-4 sm:p-6 cursor-pointer hover:shadow-xl transition-all duration-200 border-2 border-transparent hover:border-blue-200 active:scale-95 sm:hover:scale-105"
              >
                <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full mb-3 sm:mb-4 mx-auto">
                  <FaDog className="text-blue-600 text-xl sm:text-2xl" />
                </div>
                <h4 className="text-base sm:text-lg font-bold text-center text-gray-900 mb-2">Ansökningar</h4>
                <p className="text-center text-gray-600 text-xs sm:text-sm">Granska och hantera nya ansökningar</p>
                <div className="mt-2 sm:mt-3 text-center">
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {applications.filter(a => a.status === 'new').length} nya
                  </span>
                </div>
              </div>

              <div 
                onClick={() => setCurrentView('meetings')}
                className="bg-white rounded-xl shadow-lg p-4 sm:p-6 cursor-pointer hover:shadow-xl transition-all duration-200 border-2 border-transparent hover:border-orange-200 active:scale-95 sm:hover:scale-105"
              >
                <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-orange-100 rounded-full mb-3 sm:mb-4 mx-auto">
                  <FaCalendarAlt className="text-orange-600 text-xl sm:text-2xl" />
                </div>
                <h4 className="text-base sm:text-lg font-bold text-center text-gray-900 mb-2">Möten</h4>
                <p className="text-center text-gray-600 text-xs sm:text-sm">Boka och hantera kundmöten</p>
                <div className="mt-2 sm:mt-3 text-center">
                  <span className="inline-block bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                    {meetings.length} möten
                  </span>
                </div>
              </div>

              <div 
                onClick={() => setCurrentView('settings')}
                className="bg-white rounded-xl shadow-lg p-4 sm:p-6 cursor-pointer hover:shadow-xl transition-all duration-200 border-2 border-transparent hover:border-gray-200 active:scale-95 sm:hover:scale-105"
              >
                <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full mb-3 sm:mb-4 mx-auto">
                  <FaEdit className="text-gray-600 text-xl sm:text-2xl" />
                </div>
                <h4 className="text-base sm:text-lg font-bold text-center text-gray-900 mb-2">Inställningar</h4>
                <p className="text-center text-gray-600 text-xs sm:text-sm">Hantera boxar och burar</p>
                <div className="mt-2 sm:mt-3 text-center">
                  <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                    Box-konfiguration
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 sm:p-6 border border-blue-200 mx-2 sm:mx-0">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Snabbstatistik</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{dogs.length}</div>
            <div className="text-xs sm:text-sm text-gray-600">Registrerade hundar</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-purple-600">
              {planningHistory.filter(p => p.location === 'malmo').length + planningHistory.filter(p => p.location === 'staffanstorp').length}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Planerade dagar</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-red-600">{boardingRecords.length}</div>
            <div className="text-xs sm:text-sm text-gray-600">Pensionatsregistreringar</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {dogs.filter(d => d.locations.includes('malmo') && d.locations.includes('staffanstorp')).length}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Hundar på båda dagisen</div>
          </div>
        </div>
      </div>
    </div>
    );
  };

  const renderContracts = () => (
    <div className="space-y-3 sm:space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">Kontrakt</h2>
            <button
          onClick={() => setContractData({
            customerName: '',
            customerAddress: '',
            customerCity: '',
            personalNumber: '',
            dogName: '',
            dogBreed: '',
            dogAge: '',
            chipNumber: '',
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            price: '',
            contractType: 'daycare',
            daysPerWeek: ''
          })}
          className="bg-primary text-white px-3 sm:px-4 py-2 rounded-md hover:bg-primary-dark transition-colors text-sm sm:text-base w-full sm:w-auto"
        >
          Nytt kontrakt
            </button>
          </div>
          
      {contracts.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-3 sm:p-6 mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Befintliga kontrakt</h3>
          <div className="space-y-2">
            {contracts.map((contract, index) => (
              <div key={index} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 p-3 border-b">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm sm:text-base truncate">{contract.customerName} - {contract.dogName}</p>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">{contract.contractType} | {contract.startDate} - {contract.endDate}</p>
                </div>
                <button className="text-primary hover:text-primary-dark text-sm sm:text-base whitespace-nowrap">Visa</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-3 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Skapa nytt kontrakt</h3>
        {renderContractForm()}
      </div>
    </div>
  );

  const getDogById = (id?: string) => {
    if (!id) return null;
    return dogs.find(dog => dog.id === id) || null;
  };


  // Helper function to filter dogs by search query
  const filterBySearch = (dogsList: Dog[], searchQuery: string) => {
    if (!searchQuery.trim()) return dogsList;
    const query = searchQuery.toLowerCase();
    return dogsList.filter(dog => 
      dog.name.toLowerCase().includes(query) ||
      dog.owner.toLowerCase().includes(query)
    );
  };

  // Helper function to get search key
  const getSearchKey = (location: string, category: string) => `${location}_${category}`;

  // Helper function to get search value
  const getSearchValue = (location: string, category: string) => {
    return planningSearch[getSearchKey(location, category)] || '';
  };

  // Helper function to set search value
  const setSearchValue = (location: string, category: string, value: string) => {
    setPlanningSearch(prev => ({
      ...prev,
      [getSearchKey(location, category)]: value
    }));
  };

  // Component to render a category of dogs with search
  const renderDogCategory = (
    title: string,
    dogs: Dog[],
    searchKey: string,
    icon: string,
    bgColor: string,
    borderColor: string,
    badgeColor: string
  ) => {
    const searchQuery = getSearchValue(searchKey.split('_')[0], searchKey.split('_')[1]);
    const filteredDogs = filterBySearch(dogs, searchQuery);
    const isCollapsed = collapsedCategories[searchKey] ?? false;
    
    // Hide category if no dogs and no active search
    if (dogs.length === 0 && !searchQuery.trim()) return null;

    const toggleCollapse = () => {
      setCollapsedCategories(prev => ({
        ...prev,
        [searchKey]: !prev[searchKey]
      }));
    };

    return (
      <div className={`bg-gradient-to-br ${bgColor} rounded-xl shadow-lg border-2 ${borderColor}`}>
        <div 
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-opacity-80 transition-colors"
          onClick={toggleCollapse}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">{icon}</span>
            <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`${badgeColor} text-sm font-semibold px-3 py-1 rounded-full`}>
              {filteredDogs.length}
            </span>
            <svg 
              className={`w-5 h-5 text-gray-600 transition-transform ${isCollapsed ? '' : 'transform rotate-180'}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        
        {!isCollapsed && (
          <div className="px-4 pb-4">
            {/* Search input */}
            <div className="mb-4">
              <input
                type="text"
                placeholder={`Sök ${title.toLowerCase()}...`}
                value={getSearchValue(searchKey.split('_')[0], searchKey.split('_')[1])}
                onChange={(e) => setSearchValue(searchKey.split('_')[0], searchKey.split('_')[1], e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Dogs list - no scroll, just space-y */}
            <div className="space-y-2">
              {filteredDogs.map(dog => (
                <div
                  key={dog.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, dog)}
                  onDragEnd={handleDragEnd}
                  className="p-3 rounded-lg cursor-move hover:shadow-md transition-all duration-200 bg-white text-gray-800 relative group border border-gray-200 hover:border-primary hover:bg-gray-50"
                  title="Dra för att flytta"
                >
                  <button
                    onClick={(e) => handleInfoClick(e, dog)}
                    onMouseDown={(e) => e.stopPropagation()}
                    onDragStart={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    className="absolute top-2 right-2 text-gray-400 hover:text-primary z-30 transition-colors"
                    title="Visa info"
                  >
                    <FaInfoCircle className="text-sm" />
                  </button>
                  <div className="flex items-center gap-2 mb-1 pr-6">
                    <span className="text-lg">🐕</span>
                    <div className="font-semibold text-sm truncate">{dog.name}</div>
                  </div>
                  <div className="text-xs text-gray-600 truncate">👤 {dog.owner}</div>
                </div>
              ))}
          {filteredDogs.length === 0 && dogs.length > 0 && (
            <div className="text-center py-4 text-gray-400 text-sm">
              <p>Inga hundar matchar sökningen</p>
            </div>
          )}
          {dogs.length === 0 && (
            <div className="text-center py-4 text-gray-400 text-sm">
              <p>Inga hundar i denna kategori</p>
            </div>
          )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPlanning = (planning: Cage[], location: 'staffanstorp' | 'malmo') => {
    // Get dogs on active boarding for this date and location
    const getBoardingDogs = () => {
      const activeBoardingRecords = boardingRecords.filter(record => {
        return record.location === location &&
               !record.isArchived &&
               record.startDate <= currentPlanningDate &&
               record.endDate >= currentPlanningDate;
      });

      const boardingDogIds = activeBoardingRecords.map(record => record.dogId);
      const boardingDogs = dogs.filter(dog => boardingDogIds.includes(dog.id));
      
      // Exclude dogs already assigned to cages
      const assignedDogIds = planning.flatMap(cage => cage.dogs || []);
      return boardingDogs.filter(dog => !assignedDogIds.includes(dog.id));
    };

    const getAvailableDogs = () => {
      // Get all dog IDs that are already in cages or in boarding
      const assignedDogIds = planning.flatMap(cage => cage.dogs || []);
      const boardingDogIds = getBoardingDogs().map(dog => dog.id);
      
      // Filter dogs by location, exclude assigned and boarding dogs
      return dogs.filter(dog => 
        dog.locations.includes(location) && 
        !assignedDogIds.includes(dog.id) &&
        !boardingDogIds.includes(dog.id)
      );
    };

    // Categorize available dogs (exclude boarding-only dogs from regular planning)
    const categorizeDogs = (dogsList: Dog[]) => {
      // Filter out boarding-only dogs from regular planning categories
      const nonBoardingDogs = dogsList.filter(dog => dog.type !== 'boarding');
      return {
        fulltime: nonBoardingDogs.filter(dog => dog.type === 'fulltime'),
        parttime3: nonBoardingDogs.filter(dog => dog.type === 'parttime-3'),
        parttime2: nonBoardingDogs.filter(dog => dog.type === 'parttime-2'),
        singleDay: nonBoardingDogs.filter(dog => dog.type === 'singleDay' || !dog.type)
      };
    };

    const boardingDogs = getBoardingDogs();
    const availableDogs = getAvailableDogs();
    const categorizedDogs = categorizeDogs(availableDogs);
    const searchKeyPrefix = location;

    // Count planned dogs
    const plannedDogsCount = planning.reduce((total, cage) => {
      return total + (cage.dogs?.length || 0);
    }, 0);

    // Format date for display
    const formatDateDisplay = (dateString: string) => {
      const date = new Date(dateString);
      const dayNames = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];
      const dayName = dayNames[date.getDay()];
      return `${dayName} ${date.getDate()}/${date.getMonth() + 1} ${date.getFullYear()}`;
    };

    // Navigate dates (day/week)
    const navigateDate = (days: number) => {
      const currentDate = new Date(currentPlanningDate);
      currentDate.setDate(currentDate.getDate() + days);
      setCurrentPlanningDate(currentDate.toISOString().split('T')[0]);
    };

    const navigateWeek = (direction: 'prev' | 'next') => {
      navigateDate(direction === 'next' ? 7 : -7);
    };

    const isToday = currentPlanningDate === new Date().toISOString().split('T')[0];

    return (
      <div className="space-y-3 sm:space-y-6">
        {/* Date Selector and Reset Button */}
        <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 border border-gray-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label className="text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Datum:</label>
                <input
                  type="date"
                  value={currentPlanningDate}
                  onChange={(e) => setCurrentPlanningDate(e.target.value)}
                  className="flex-1 sm:flex-none px-2 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg bg-white text-gray-800 text-sm sm:text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              {/* Date Navigation */}
              <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto">
                <button
                  onClick={() => navigateWeek('prev')}
                  className="flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-200 text-gray-700 text-xs sm:text-sm rounded-lg hover:bg-gray-300 transition-colors"
                  title="Föregående vecka"
                >
                  <span className="hidden sm:inline">← Vecka</span>
                  <span className="sm:hidden">← V</span>
                </button>
                <button
                  onClick={() => navigateDate(-1)}
                  className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-200 text-gray-700 text-xs sm:text-sm rounded-lg hover:bg-gray-300 transition-colors"
                  title="Föregående dag"
                >
                  ←
                </button>
                <button
                  onClick={() => setCurrentPlanningDate(new Date().toISOString().split('T')[0])}
                  className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm ${isToday ? 'bg-primary text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                  title="Gå till idag"
                >
                  Idag
                </button>
                <button
                  onClick={() => navigateDate(1)}
                  className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-200 text-gray-700 text-xs sm:text-sm rounded-lg hover:bg-gray-300 transition-colors"
                  title="Nästa dag"
                >
                  →
                </button>
                <button
                  onClick={() => navigateWeek('next')}
                  className="flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-200 text-gray-700 text-xs sm:text-sm rounded-lg hover:bg-gray-300 transition-colors"
                  title="Nästa vecka"
                >
                  <span className="hidden sm:inline">Vecka →</span>
                  <span className="sm:hidden">V →</span>
                </button>
              </div>

              {/* Date Display */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-base sm:text-lg font-bold text-primary">
                  {formatDateDisplay(currentPlanningDate)}
                </span>
                {isToday && (
                  <span className="px-2 py-1 bg-primary text-white text-xs font-semibold rounded-full">
                    Idag
                  </span>
                )}
              </div>

              {/* Planned Dogs Counter */}
              <div className="flex items-center gap-2 bg-blue-50 border-2 border-blue-300 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 w-full sm:w-auto">
                <span className="text-xs sm:text-sm font-semibold text-gray-700">Inplanerade hundar:</span>
                <span className="text-lg sm:text-xl font-bold text-blue-700">{plannedDogsCount}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setIsCopyModalOpen(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-500 text-white text-xs sm:text-sm rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
              >
                <FaCopy className="text-xs sm:text-sm" />
                <span className="hidden sm:inline">Kopiera planering</span>
                <span className="sm:hidden">Kopiera</span>
              </button>
              <button
                onClick={() => resetCages(location)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-red-500 text-white text-xs sm:text-sm rounded-lg hover:bg-red-600 transition-colors shadow-sm"
              >
                <FaTrash className="text-xs sm:text-sm" />
                <span className="hidden sm:inline">Återställ burar</span>
                <span className="sm:hidden">Återställ</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
          {/* Left Column: Dogs Lists - Categorized */}
          <div className="lg:col-span-1 space-y-3 max-h-[calc(100vh-200px)] sm:max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
            {/* Fulltime */}
            {renderDogCategory(
              'Heltid',
              categorizedDogs.fulltime,
              `${searchKeyPrefix}_fulltime`,
              '🕐',
              'from-blue-50 to-blue-100',
              'border-blue-300',
              'bg-blue-500 text-white'
            )}

            {/* Parttime 3 days */}
            {renderDogCategory(
              'Deltid 3 dagar',
              categorizedDogs.parttime3,
              `${searchKeyPrefix}_parttime3`,
              '📅',
              'from-yellow-50 to-yellow-100',
              'border-yellow-300',
              'bg-yellow-500 text-white'
            )}

            {/* Parttime 2 days */}
            {renderDogCategory(
              'Deltid 2 dagar',
              categorizedDogs.parttime2,
              `${searchKeyPrefix}_parttime2`,
              '📆',
              'from-purple-50 to-purple-100',
              'border-purple-300',
              'bg-purple-500 text-white'
            )}

            {/* Single Day */}
            {renderDogCategory(
              'Enstaka dag',
              categorizedDogs.singleDay,
              `${searchKeyPrefix}_singleDay`,
              '📝',
              'from-green-50 to-green-100',
              'border-green-300',
              'bg-green-500 text-white'
            )}

            {/* Dogs on Active Boarding */}
            {boardingDogs.length > 0 && (() => {
              const boardingSearchKey = `${location}_boarding`;
              const isCollapsed = collapsedCategories[boardingSearchKey] ?? false;
              const toggleCollapse = () => {
                setCollapsedCategories(prev => ({
                  ...prev,
                  [boardingSearchKey]: !prev[boardingSearchKey]
                }));
              };
              
              return (
                <div className={`bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-lg border-2 border-orange-300`}>
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-opacity-80 transition-colors"
                    onClick={toggleCollapse}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🏨</span>
                      <h3 className="text-lg font-bold text-gray-800">Hundpensionat</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-orange-500 text-white text-sm font-semibold px-3 py-1 rounded-full">
                        {filterBySearch(boardingDogs, getSearchValue(location, 'boarding')).length}
                      </span>
                      <svg 
                        className={`w-5 h-5 text-gray-600 transition-transform ${isCollapsed ? '' : 'transform rotate-180'}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  
                  {!isCollapsed && (
                    <div className="px-4 pb-4">
                      {/* Search input */}
                      <div className="mb-4">
                        <input
                          type="text"
                          placeholder="Sök hundpensionat..."
                          value={getSearchValue(location, 'boarding')}
                          onChange={(e) => setSearchValue(location, 'boarding', e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>

                      {/* Dogs list */}
                      <div className="space-y-2">
                  {filterBySearch(boardingDogs, getSearchValue(location, 'boarding')).map(dog => {
                    const boardingRecord = boardingRecords.find(r => r.dogId === dog.id && r.location === location);
                    return (
                        <div
                          key={dog.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, dog)}
                          onDragEnd={handleDragEnd}
                          className="p-3 rounded-lg cursor-move hover:shadow-md transition-all duration-200 bg-white text-gray-800 relative group border border-orange-300 hover:border-orange-500 hover:bg-orange-50"
                          title="Dra för att flytta"
                        >
                          <button
                            onClick={(e) => handleInfoClick(e, dog)}
                            onMouseDown={(e) => e.stopPropagation()}
                            onDragStart={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                            }}
                            className="absolute top-2 right-2 text-gray-400 hover:text-primary z-30 transition-colors"
                            title="Visa info"
                          >
                            <FaInfoCircle className="text-sm" />
                          </button>
                          <div className="flex items-center gap-2 mb-1 pr-6">
                            <span className="text-lg">🏨</span>
                            <div className="font-semibold text-sm truncate">{dog.name}</div>
                          </div>
                          <div className="text-xs text-gray-600 truncate mb-1">👤 {dog.owner}</div>
                          {boardingRecord && (
                            <div className="text-xs text-orange-700 font-semibold truncate">
                              {new Date(boardingRecord.startDate).toLocaleDateString('sv-SE')} - {new Date(boardingRecord.endDate).toLocaleDateString('sv-SE')}
                            </div>
                          )}
                        </div>
                    );
                  })}
                        {filterBySearch(boardingDogs, getSearchValue(location, 'boarding')).length === 0 && boardingDogs.length > 0 && (
                          <div className="text-center py-4 text-gray-400 text-sm">
                            <p>Inga hundar matchar sökningen</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Cages and Free Areas */}
          <div className="lg:col-span-2">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-5">Burar och ytor</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {planning.map(cage => {
                const cageDogs = (cage.dogs || []).map(id => getDogById(id)).filter(Boolean) as Dog[];
                return (
                  <div
                    key={cage.id}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(cage.id, location)}
                    className={`min-h-36 p-4 rounded-xl border-2 transition-all duration-200 ${
                      cage.type === 'cage' 
                        ? cageDogs.length > 0 
                          ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 shadow-md' 
                          : 'border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-400'
                        : cageDogs.length > 0
                          ? 'border-green-500 bg-gradient-to-br from-green-50 to-green-100 shadow-md'
                          : 'border-dashed border-green-300 bg-green-50/50 hover:bg-green-50 hover:border-green-400'
                    }`}
                  >
                    <div className={`flex items-center justify-between mb-3 ${
                      cage.type === 'cage' ? 'text-blue-700' : 'text-green-700'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">{cage.type === 'cage' ? '🏠' : '🏞️'}</span>
                        <span className="text-sm font-bold">{cage.name}</span>
                      </div>
                      {cageDogs.length > 0 && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          cage.type === 'cage' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-green-500 text-white'
                        }`}>
                          {cageDogs.length}
                        </span>
                      )}
                    </div>
                    {cageDogs.length > 0 ? (
                      <div className="space-y-2">
                        {cageDogs.map(dog => {
                          // Check if dog is on active boarding for this date and location
                          const isOnBoarding = boardingRecords.some(record => 
                            record.dogId === dog.id &&
                            record.location === location &&
                            !record.isArchived &&
                            record.startDate <= currentPlanningDate &&
                            record.endDate >= currentPlanningDate
                          );
                          
                          return (
                          <div
                            key={dog.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, dog)}
                            onDragEnd={handleDragEnd}
                            className={`p-2.5 rounded-lg bg-gray-100 text-gray-800 relative cursor-move hover:shadow-lg transition-all duration-200 border-2 border-transparent hover:border-primary/30 group`}
                            title="Dra för att flytta"
                          >
                            <button
                              onClick={(e) => handleInfoClick(e, dog)}
                              onMouseDown={(e) => e.stopPropagation()}
                              onDragStart={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                              }}
                              className="absolute top-1.5 left-1.5 text-xs bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-blue-700 opacity-0 group-hover:opacity-100 transition-opacity z-30 shadow-sm"
                              title="Visa info"
                            >
                              <FaInfoCircle className="text-xs" />
                            </button>
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-base">🐕</span>
                              <div className="font-bold text-sm">{dog.name}</div>
                              {isOnBoarding && (
                                <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                                  <span>🏨</span>
                                  <span>Pensionat</span>
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-600 ml-5">{dog.owner}</div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                removeDogFromCage(cage.id, dog.id, location);
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                              className="absolute top-1.5 right-1.5 text-xs bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-sm"
                              title="Ta bort"
                            >
                              ✕
                            </button>
                          </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center text-gray-400 text-xs py-4">
                        <span className="text-center">
                          <div className="text-2xl mb-1">📭</div>
                          <div>Tom</div>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPlanningMalmo = () => (
    <div className="space-y-3 sm:space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-3 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Planering Malmö</h2>
        {renderPlanning(planningMalmo, 'malmo')}
      </div>
    </div>
  );

  const renderPlanningStaffanstorp = () => (
    <div className="space-y-3 sm:space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-3 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Planering Staffanstorp</h2>
        {renderPlanning(planningStaffanstorp, 'staffanstorp')}
      </div>
    </div>
  );

  const renderBoarding = (location: 'malmo' | 'staffanstorp') => {
    const locationRecords = boardingRecords.filter(record => record.location === location);
    
    // Filter records based on current filter
    const filteredRecords = locationRecords.filter(record => {
      if (boardingFilter === 'current') return !record.isArchived;
      if (boardingFilter === 'archived') return record.isArchived;
      if (boardingFilter === 'future') return new Date(record.startDate) > new Date();
      if (boardingFilter === 'ongoing') {
        const today = new Date().toISOString().split('T')[0];
        return record.startDate <= today && record.endDate >= today;
      }
      return true; // 'all'
    });

    // For 'all' view, categorize records
    const categorizedRecords = categorizeBoardingRecords(locationRecords);
    
    return (
      <div className="space-y-3 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">
            Hundpensionat {location === 'malmo' ? 'Malmö' : 'Staffanstorp'} ({filteredRecords.length})
          </h2>
          <button
            onClick={() => openBoardingModal(location)}
            className="flex items-center justify-center bg-primary text-white px-3 sm:px-4 py-2 rounded-md hover:bg-primary-dark transition-colors text-sm sm:text-base w-full sm:w-auto"
          >
            <FaPlus className="mr-2" /> Lägg till pensionat
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-lg p-3 sm:p-4 border border-gray-200">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">Visa:</label>
              <select
                value={boardingFilter}
                onChange={(e) => setBoardingFilter(e.target.value as 'all' | 'current' | 'archived' | 'future' | 'ongoing')}
                className="flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-1 border border-gray-300 rounded-md text-xs sm:text-sm"
              >
                <option value="all">Alla</option>
                <option value="future">Framtida</option>
                <option value="ongoing">Pågående</option>
                <option value="archived">Arkiverade</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">År:</label>
              <select
                value={boardingYearFilter}
                onChange={(e) => setBoardingYearFilter(e.target.value)}
                className="flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-1 border border-gray-300 rounded-md text-xs sm:text-sm"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - i;
                  return (
                    <option key={year} value={year.toString()}>
                      {year}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        {boardingFilter === 'all' ? (
          // Show categorized view for 'all'
          <div className="space-y-4 sm:space-y-8">
            {/* Ongoing Records */}
            {categorizedRecords.ongoing.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-3 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-blue-700 mb-3 sm:mb-4 border-b border-blue-200 pb-2">
                  ⏳ Pågående registreringar ({categorizedRecords.ongoing.length})
                </h3>
                {renderRecordsByMonth(categorizedRecords.ongoing, location)}
              </div>
            )}

            {/* Future Records */}
            {categorizedRecords.future.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-3 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-green-700 mb-3 sm:mb-4 border-b border-green-200 pb-2">
                  🔮 Framtida registreringar ({categorizedRecords.future.length})
                </h3>
                {renderRecordsByMonth(categorizedRecords.future, location)}
              </div>
            )}

            {/* Archived Records */}
            {categorizedRecords.archived.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-3 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-600 mb-3 sm:mb-4 border-b border-gray-200 pb-2">
                  📦 Arkiverade registreringar ({categorizedRecords.archived.length})
                </h3>
                {renderRecordsByMonth(categorizedRecords.archived, location)}
              </div>
            )}

            {categorizedRecords.future.length === 0 && categorizedRecords.ongoing.length === 0 && categorizedRecords.archived.length === 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6 sm:p-12 text-center">
                <FaDog className="text-4xl sm:text-6xl mx-auto mb-4 text-gray-300" />
                <p className="text-sm sm:text-base text-gray-500 mb-4">Inga pensionatsregistreringar än</p>
                <button
                  onClick={() => openBoardingModal(location)}
                  className="flex items-center justify-center bg-primary text-white px-3 sm:px-4 py-2 rounded-md hover:bg-primary-dark transition-colors mx-auto text-sm sm:text-base"
                >
                  <FaPlus className="mr-2" /> Lägg till första registreringen
                </button>
              </div>
            )}
          </div>
        ) : (
          // Show filtered view for specific categories
          filteredRecords.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-6 sm:p-12 text-center">
              <FaDog className="text-4xl sm:text-6xl mx-auto mb-4 text-gray-300" />
              <p className="text-sm sm:text-base text-gray-500 mb-4">
                {boardingFilter === 'archived' ? 'Inga arkiverade registreringar' : 
                 boardingFilter === 'future' ? 'Inga framtida registreringar' :
                 boardingFilter === 'ongoing' ? 'Inga pågående registreringar' : 
                 'Inga pensionatsregistreringar än'}
              </p>
              {boardingFilter !== 'archived' && (
                <button
                  onClick={() => openBoardingModal(location)}
                  className="flex items-center justify-center bg-primary text-white px-3 sm:px-4 py-2 rounded-md hover:bg-primary-dark transition-colors mx-auto text-sm sm:text-base"
                >
                  <FaPlus className="mr-2" /> Lägg till första registreringen
                </button>
              )}
            </div>
          ) : (
            renderRecordsByMonth(filteredRecords, location)
          )
        )}
      </div>
    );
  };

  const renderRecordsByMonth = (records: BoardingRecord[], location: 'malmo' | 'staffanstorp') => {
    const recordsByMonth = getBoardingRecordsByMonth(records, boardingYearFilter);
    const sortedMonths = Object.keys(recordsByMonth).sort((a, b) => b.localeCompare(a));
    
    return (
      <div className="space-y-4 sm:space-y-6">
        {sortedMonths.map(monthKey => (
          <div key={monthKey} className="bg-gray-50 rounded-lg p-3 sm:p-4">
            <h4 className="text-sm sm:text-md font-semibold text-gray-800 mb-2 sm:mb-3">
              {getMonthName(monthKey)} {boardingYearFilter}
              <span className="text-xs sm:text-sm font-normal text-gray-500 ml-2">
                ({recordsByMonth[monthKey].length} registreringar)
              </span>
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {recordsByMonth[monthKey].map((record) => {
                const dog = dogs.find(d => d.id === record.dogId);
                const isPast = new Date(record.endDate) < new Date();
                const isFuture = new Date(record.startDate) > new Date();
                const isOngoing = new Date(record.startDate) <= new Date() && new Date(record.endDate) >= new Date();
                
                return (
                  <div 
                    key={record.id} 
                    className={`p-3 sm:p-4 rounded-lg border-l-4 ${
                      isPast 
                        ? 'border-gray-400 bg-gray-50' 
                        : isFuture
                        ? 'border-green-400 bg-green-50'
                        : isOngoing
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-primary bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2 sm:mb-3">
                      <div className="flex-1 min-w-0">
                        <div className={`font-bold text-base sm:text-lg ${
                          isPast ? 'text-gray-600' : 
                          isFuture ? 'text-green-800' :
                          isOngoing ? 'text-blue-800' :
                          'text-gray-900'
                        }`}>
                          {record.dogName}
                        </div>
                        {dog && (
                          <div className={`px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-800 inline-block mt-1`}>
                            {dog.type === 'fulltime' ? 'Heltid' :
                             dog.type === 'parttime-3' ? 'Deltid 3 dagar' :
                             dog.type === 'parttime-2' ? 'Deltid 2 dagar' :
                             dog.type === 'singleDay' ? 'Enstaka dag' :
                             dog.type === 'boarding' ? 'Hundpensionat' : 'Dagis'}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          {isPast && '(Passerad)'}
                          {isFuture && '(Framtida)'}
                          {isOngoing && '(Pågående)'}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-2">
                        <button
                          onClick={() => openBoardingModal(location, record)}
                          className="text-gray-600 hover:text-blue-600 text-sm sm:text-base"
                          title="Redigera"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => deleteBoardingRecord(record.id)}
                          className="text-gray-600 hover:text-red-600 text-sm sm:text-base"
                          title="Ta bort"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1 text-xs sm:text-sm">
                      <p><strong>Från:</strong> {new Date(record.startDate).toLocaleDateString('sv-SE')}</p>
                      <p><strong>Till:</strong> {new Date(record.endDate).toLocaleDateString('sv-SE')}</p>
                      <p><strong>Antal dagar:</strong> {Math.ceil((new Date(record.endDate).getTime() - new Date(record.startDate).getTime()) / (1000 * 60 * 60 * 24))}</p>
                      {dog && (
                        <>
                          <p><strong>Ägare:</strong> {dog.owner}</p>
                          <p><strong>Telefon:</strong> {dog.phone || '-'}</p>
                        </>
                      )}
                      {record.notes && (
                        <p className="text-gray-600 italic break-words">{record.notes}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderCalendar = (location: 'malmo' | 'staffanstorp') => {
    const locationHistory = planningHistory.filter(p => p.location === location);
    
    // Get current week dates
    const getWeekDates = (date: string) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(d.setDate(diff));
      
      const week = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        week.push(date.toISOString().split('T')[0]);
      }
      return week;
    };

    const weekDates = getWeekDates(currentPlanningDate);
    const dayNames = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];

    const navigateWeek = (direction: 'prev' | 'next') => {
      const currentDate = new Date(currentPlanningDate);
      const days = direction === 'next' ? 7 : -7;
      currentDate.setDate(currentDate.getDate() + days);
      setCurrentPlanningDate(currentDate.toISOString().split('T')[0]);
    };

    const getDogsForDate = (date: string) => {
      const dogsForDate: Dog[] = [];
      
      // Get dogs from planning (cages) - includes all dogs that are planned for this date
      const dayData = locationHistory.find(p => p.date === date);
      if (dayData) {
        const allDogs = dayData.cages.flatMap(cage => cage.dogs || []);
        const plannedDogs = allDogs.map(dogId => dogs.find(d => d.id === dogId)).filter(Boolean) as Dog[];
        dogsForDate.push(...plannedDogs);
      }
      
      // Get boarding dogs for this date and location
      const boardingDogsForDate = boardingRecords
        .filter(record => {
          return record.location === location &&
                 !record.isArchived &&
                 record.startDate <= date &&
                 record.endDate >= date;
        })
        .map(record => {
          // Find the dog by dogId or dogName
          const dog = dogs.find(d => d.id === record.dogId || d.name === record.dogName);
          return dog;
        })
        .filter((dog): dog is Dog => dog !== undefined);
      
      // Add boarding dogs that aren't already in the list
      boardingDogsForDate.forEach(boardingDog => {
        if (!dogsForDate.find(d => d.id === boardingDog.id)) {
          dogsForDate.push(boardingDog);
        }
      });
      
      return dogsForDate;
    };

    const getMeetingsForDate = (date: string) => {
      return meetings.filter(m => m.date === date && m.location === location);
    };

    return (
      <div className="space-y-3 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">
            Kalender {location === 'malmo' ? 'Malmö' : 'Staffanstorp'}
          </h2>
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <button
              onClick={() => navigateWeek('prev')}
              className="flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-xs sm:text-sm"
            >
              <span className="hidden sm:inline">← Föregående vecka</span>
              <span className="sm:hidden">← V</span>
            </button>
            <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
              Vecka {Math.ceil(new Date(currentPlanningDate).getDate() / 7)}
            </span>
            <button
              onClick={() => navigateWeek('next')}
              className="flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-xs sm:text-sm"
            >
              <span className="hidden sm:inline">Nästa vecka →</span>
              <span className="sm:hidden">V →</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-3 sm:p-6 overflow-x-auto">
          <div className="grid grid-cols-7 gap-2 sm:gap-4 min-w-[700px] sm:min-w-0">
            {weekDates.map((date, index) => {
              const dayDogs = getDogsForDate(date);
              const dayMeetings = getMeetingsForDate(date);
              const dayData = locationHistory.find(p => p.date === date);
              const isToday = date === new Date().toISOString().split('T')[0];
              const isPast = new Date(date) < new Date();
              
              return (
                <div 
                  key={date}
                  className={`border rounded-lg p-2 sm:p-3 ${
                    isToday ? 'border-blue-500 bg-blue-50' : 
                    isPast ? 'border-gray-300 bg-gray-50' : 
                    'border-gray-200 bg-white'
                  }`}
                >
                  <div className="text-center mb-1 sm:mb-2">
                    <div className="text-xs sm:text-sm font-medium text-gray-600">
                      {dayNames[index]}
                    </div>
                    <div className={`text-base sm:text-lg font-bold ${
                      isToday ? 'text-blue-700' : 
                      isPast ? 'text-gray-500' : 
                      'text-gray-900'
                    }`}>
                      {new Date(date).getDate()}
                    </div>
                  </div>
                  
                  <div className="space-y-0.5 sm:space-y-1">
                    {dayDogs.length > 0 ? (
                      dayDogs.map((dog, dogIndex) => {
                        if (!dog) return null;
                        
                        // Check if dog is in boarding for this date
                        const isBoarding = boardingRecords.some(record => 
                          record.location === location &&
                          !record.isArchived &&
                          record.startDate <= date &&
                          record.endDate >= date &&
                          (record.dogId === dog.id || record.dogName === dog.name)
                        );
                        
                        // Check if dog is planned (in cages)
                        const isPlanned = dayData?.cages.some((cage: Cage) => 
                          cage.dogs?.includes(dog.id)
                        );
                        
                        const badge = isBoarding && !isPlanned ? '🏨' : '';
                        
                        return (
                          <div 
                            key={dogIndex}
                            className={`text-xs p-0.5 sm:p-1 rounded flex items-center gap-1 bg-gray-100 text-gray-800 truncate`}
                            title={
                              isBoarding && !isPlanned 
                                ? 'Hundpensionat' 
                                : dog.type === 'singleDay' 
                                ? 'Enstaka dag' 
                                : ''
                            }
                          >
                            {badge && <span>{badge}</span>}
                            <span className="truncate">{dog?.name}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-xs text-gray-400 text-center">
                        Inga hundar
                      </div>
                    )}
                    
                    {/* Meetings */}
                    {dayMeetings.length > 0 && (
                      <div className="mt-1 sm:mt-2 pt-1 sm:pt-2 border-t border-gray-300">
                        {dayMeetings.map((meeting, meetingIndex) => (
                          <div
                            key={meetingIndex}
                            className="text-xs p-0.5 sm:p-1 rounded bg-orange-100 text-orange-800 mb-0.5 sm:mb-1 flex items-center gap-1 truncate"
                            title={`Möte: ${meeting.name}${meeting.dogName ? ` - ${meeting.dogName}` : ''} kl. ${formatTime(meeting.time)}`}
                          >
                            <span>📅</span>
                            <span className="font-medium">{formatTime(meeting.time)}</span>
                            <span className="truncate">{meeting.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-1 sm:mt-2 text-center">
                    <button
                      onClick={() => {
                        setCurrentPlanningDate(date);
                        setCurrentView(location === 'malmo' ? 'planning-malmo' : 'planning-staffanstorp');
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Planera
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Planning History */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Planeringshistorik</h3>
          {locationHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Ingen planeringshistorik än</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {locationHistory
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((planning) => {
                  const totalDogs = planning.cages.reduce((sum, cage) => sum + (cage.dogs?.length || 0), 0);
                  return (
                    <div key={planning.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">
                          {new Date(planning.date).toLocaleDateString('sv-SE')}
                        </div>
                        <div className="text-sm text-gray-600">
                          {totalDogs} hundar planerade
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setCurrentPlanningDate(planning.date);
                          setCurrentView(location === 'malmo' ? 'planning-malmo' : 'planning-staffanstorp');
                        }}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                      >
                        Visa planering
                      </button>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderBoardingMalmo = () => renderBoarding('malmo');
  const renderBoardingStaffanstorp = () => renderBoarding('staffanstorp');

  const renderCalendarMalmo = () => renderCalendar('malmo');
  const renderCalendarStaffanstorp = () => renderCalendar('staffanstorp');

  const renderStatistics = () => {
    const stats = getStatistics();
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
    const months = [
      { value: 1, name: 'Januari' }, { value: 2, name: 'Februari' }, { value: 3, name: 'Mars' },
      { value: 4, name: 'April' }, { value: 5, name: 'Maj' }, { value: 6, name: 'Juni' },
      { value: 7, name: 'Juli' }, { value: 8, name: 'Augusti' }, { value: 9, name: 'September' },
      { value: 10, name: 'Oktober' }, { value: 11, name: 'November' }, { value: 12, name: 'December' }
    ];

    return (
      <div className="space-y-3 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Statistik & Inkomst</h2>
        </div>

        {/* Filter Controls */}
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
            <FaFilter className="mr-2 text-blue-500" />
            Filtrera statistik
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-4">
            {/* Location Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Plats</label>
              <select
                value={statisticsFilter.location}
                onChange={(e) => setStatisticsFilter(prev => ({ ...prev, location: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Alla platser</option>
                <option value="malmo">Malmö</option>
                <option value="staffanstorp">Staffanstorp</option>
              </select>
            </div>

            {/* Period Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
              <select
                value={statisticsFilter.period}
                onChange={(e) => setStatisticsFilter(prev => ({ ...prev, period: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Alla perioder</option>
                <option value="year">Per år</option>
                <option value="month">Per månad</option>
              </select>
            </div>

            {/* Year Filter */}
            {statisticsFilter.period !== 'all' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">År</label>
                <select
                  value={statisticsFilter.year || currentYear}
                  onChange={(e) => setStatisticsFilter(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Month Filter */}
            {statisticsFilter.period === 'month' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Månad</label>
                <select
                  value={statisticsFilter.month || 1}
                  onChange={(e) => setStatisticsFilter(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {months.map(month => (
                    <option key={month.value} value={month.value}>{month.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Additional Filters */}
          <div className="border-t pt-3 sm:pt-4 mt-3 sm:mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={statisticsFilter.includeActive}
                  onChange={(e) => setStatisticsFilter(prev => ({ ...prev, includeActive: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-xs sm:text-sm text-gray-700">Aktiva hundar</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={statisticsFilter.includeInactive}
                  onChange={(e) => setStatisticsFilter(prev => ({ ...prev, includeInactive: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-xs sm:text-sm text-gray-700">Inaktiva hundar</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={statisticsFilter.includeBoarding}
                  onChange={(e) => setStatisticsFilter(prev => ({ ...prev, includeBoarding: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-xs sm:text-sm text-gray-700">Hundpensionat</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={statisticsFilter.includeSingleDays}
                  onChange={(e) => setStatisticsFilter(prev => ({ ...prev, includeSingleDays: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-xs sm:text-sm text-gray-700">Enstaka dagar</span>
              </label>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {/* Total Dogs */}
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border-l-4 border-blue-500">
            <div className="flex items-center">
              <FaDog className="text-blue-500 text-xl sm:text-2xl mr-2 sm:mr-3" />
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Totalt antal hundar</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalDogs}</p>
              </div>
            </div>
          </div>

          {/* Malmö Dogs */}
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border-l-4 border-green-500">
            <div className="flex items-center">
              <FaDog className="text-green-500 text-xl sm:text-2xl mr-2 sm:mr-3" />
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Malmö hundar</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.malmoDogs}</p>
              </div>
            </div>
          </div>

          {/* Staffanstorp Dogs */}
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border-l-4 border-orange-500">
            <div className="flex items-center">
              <FaDog className="text-orange-500 text-xl sm:text-2xl mr-2 sm:mr-3" />
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Staffanstorp hundar</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.staffanstorpDogs}</p>
              </div>
            </div>
          </div>

          {/* Both Locations */}
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border-l-4 border-purple-500">
            <div className="flex items-center">
              <FaDog className="text-purple-500 text-xl sm:text-2xl mr-2 sm:mr-3" />
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Båda platser</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.bothLocationDogs}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Expected Income */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-md p-4 sm:p-6 border-2 border-green-200">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center">
            <FaChartBar className="mr-2 text-green-600" />
            Förväntad inkomst
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            {/* Without VAT */}
            <div className="bg-white rounded-lg p-4 sm:p-5 border-2 border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm font-medium text-gray-600">Exklusive moms (25%)</span>
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">Exkl. moms</span>
              </div>
              <div className="text-2xl sm:text-4xl font-bold text-gray-800 mb-1">
                {Math.round(stats.totalIncomeWithoutVAT).toLocaleString()} SEK
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Moms: {Math.round(stats.totalIncomeWithVAT - stats.totalIncomeWithoutVAT).toLocaleString()} SEK
              </div>
            </div>

            {/* With VAT */}
            <div className="bg-white rounded-lg p-4 sm:p-5 border-2 border-green-300">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm font-medium text-gray-600">Inklusive moms (25%)</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Inkl. moms</span>
              </div>
              <div className="text-2xl sm:text-4xl font-bold text-green-600 mb-1">
                {Math.round(stats.totalIncomeWithVAT).toLocaleString()} SEK
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Utan moms: {Math.round(stats.totalIncomeWithoutVAT).toLocaleString()} SEK
              </div>
            </div>
          </div>

          {/* Income by Location */}
          {(statisticsFilter.location === 'all' || statisticsFilter.location === 'malmo') && (
            <div className={statisticsFilter.location === 'all' ? "grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6" : "mb-4 sm:mb-6"}>
              <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Malmö</p>
                <p className="text-xl sm:text-2xl font-bold text-green-700">{Math.round(stats.malmoIncome).toLocaleString()} SEK</p>
                <p className="text-xs text-gray-500 mt-1">Exkl. moms</p>
              </div>
              {statisticsFilter.location === 'all' && (
                <div className="text-center p-3 sm:p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Staffanstorp</p>
                  <p className="text-xl sm:text-2xl font-bold text-orange-700">{Math.round(stats.staffanstorpIncome).toLocaleString()} SEK</p>
                  <p className="text-xs text-gray-500 mt-1">Exkl. moms</p>
                </div>
              )}
            </div>
          )}
          {statisticsFilter.location === 'staffanstorp' && (
            <div className="mb-6">
              <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm text-gray-600 mb-1">Staffanstorp</p>
                <p className="text-2xl font-bold text-orange-700">{Math.round(stats.staffanstorpIncome).toLocaleString()} SEK</p>
                <p className="text-xs text-gray-500 mt-1">Exkl. moms</p>
              </div>
            </div>
          )}

          {/* Warning if dogs are missing type */}
          {dogs.some(dog => !dog.type && dog.isActive !== false) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>OBS:</strong> Vissa aktiva hundar saknar typ (heltid/deltid). 
                Dessa räknas inte med i inkomsten. Redigera hundarna och lägg till typ för korrekt beräkning.
              </p>
            </div>
          )}
        </div>

        {/* Income Statistics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income by Category */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FaChartBar className="mr-2 text-purple-500" />
              Inkomst per kategori
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <div>
                  <span className="text-sm font-medium text-gray-700 block">Hunddagis</span>
                  <span className="text-xs text-gray-500">Månadskonstanter</span>
                </div>
                <span className="text-xl font-bold text-blue-600">{Math.round(stats.incomeByCategory.daycare).toLocaleString()} SEK</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                <div>
                  <span className="text-sm font-medium text-gray-700 block">Hundpensionat</span>
                  <span className="text-xs text-gray-500">Per dygn</span>
                </div>
                <span className="text-xl font-bold text-orange-600">{Math.round(stats.incomeByCategory.boarding).toLocaleString()} SEK</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                <div>
                  <span className="text-sm font-medium text-gray-700 block">Enstaka dagar</span>
                  <span className="text-xs text-gray-500">Per tillfälle</span>
                </div>
                <span className="text-xl font-bold text-green-600">{Math.round(stats.incomeByCategory.singleDays).toLocaleString()} SEK</span>
              </div>
            </div>
          </div>

          {/* Income by Type */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FaChartBar className="mr-2 text-blue-500" />
              Inkomst per typ (Hunddagis)
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Heltid</span>
                <span className="text-lg font-semibold text-blue-600">{Math.round(stats.incomeByType.fulltime).toLocaleString()} SEK</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Deltid (3 dagar)</span>
                <span className="text-lg font-semibold text-yellow-600">{Math.round(stats.incomeByType.parttime3).toLocaleString()} SEK</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Deltid (2 dagar)</span>
                <span className="text-lg font-semibold text-purple-600">{Math.round(stats.incomeByType.parttime2).toLocaleString()} SEK</span>
              </div>
              {statisticsFilter.includeSingleDays && (
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border-t-2 border-gray-200 mt-3 pt-3">
                  <span className="text-sm font-medium text-gray-700">Enstaka dagar</span>
                  <span className="text-lg font-semibold text-green-600">{Math.round(stats.incomeByType.singleDay).toLocaleString()} SEK</span>
                </div>
              )}
              {statisticsFilter.includeBoarding && (
                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border-t-2 border-gray-200 mt-3 pt-3">
                  <span className="text-sm font-medium text-gray-700">Hundpensionat</span>
                  <span className="text-lg font-semibold text-orange-600">{Math.round(stats.incomeByType.boarding).toLocaleString()} SEK</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pricing Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Prisinformation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Malmö priser</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Heltid:</span>
                  <span className="font-semibold">{PRICES.malmo.fulltime} SEK/månad</span>
                </div>
                <div className="flex justify-between">
                  <span>Deltid (3 dagar):</span>
                  <span className="font-semibold">{PRICES.malmo.parttime3} SEK/månad</span>
                </div>
                <div className="flex justify-between">
                  <span>Deltid (2 dagar):</span>
                  <span className="font-semibold">{PRICES.malmo.parttime2} SEK/månad</span>
                </div>
                <div className="flex justify-between">
                  <span>Enstaka dag:</span>
                  <span className="font-semibold">{PRICES.malmo.singleDay} SEK</span>
                </div>
                <div className="flex justify-between">
                  <span>Hundpensionat:</span>
                  <span className="font-semibold">{PRICES.malmo.boarding} SEK/dygn</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Staffanstorp priser</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Heltid:</span>
                  <span className="font-semibold">{PRICES.staffanstorp.fulltime} SEK/månad</span>
                </div>
                <div className="flex justify-between">
                  <span>Deltid (3 dagar):</span>
                  <span className="font-semibold">{PRICES.staffanstorp.parttime3} SEK/månad</span>
                </div>
                <div className="flex justify-between">
                  <span>Deltid (2 dagar):</span>
                  <span className="font-semibold">{PRICES.staffanstorp.parttime2} SEK/månad</span>
                </div>
                <div className="flex justify-between">
                  <span>Enstaka dag:</span>
                  <span className="font-semibold">{PRICES.staffanstorp.singleDay} SEK</span>
                </div>
                <div className="flex justify-between">
                  <span>Hundpensionat:</span>
                  <span className="font-semibold">{PRICES.staffanstorp.boarding} SEK/dygn</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDogs = () => {
    // Filter dogs based on search and filters
    const filteredDogs = dogs.filter(dog => {
      // Search filter
      if (dogsTabSearch.trim()) {
        const searchLower = dogsTabSearch.toLowerCase();
        const matchesSearch = dog.name.toLowerCase().includes(searchLower) ||
                             dog.owner.toLowerCase().includes(searchLower) ||
                             (dog.breed && dog.breed.toLowerCase().includes(searchLower)) ||
                             (dog.phone && dog.phone.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      // Location filter
      if (dogsLocationFilter !== 'all') {
        if (dogsLocationFilter === 'both') {
          if (!(dog.locations.includes('malmo') && dog.locations.includes('staffanstorp'))) {
            return false;
          }
        } else {
          if (!dog.locations.includes(dogsLocationFilter)) {
            return false;
          }
        }
      }

      // Type filter
      if (dogsTypeFilter !== 'all') {
        if (dog.type !== dogsTypeFilter) {
          return false;
        }
      }

      // Active/Inactive filter
      if (dogsActiveFilter !== 'all') {
        if (dogsActiveFilter === 'active' && !dog.isActive) {
          return false;
        }
        if (dogsActiveFilter === 'inactive' && dog.isActive) {
          return false;
        }
      }

      return true;
    });

    return (
    <div className="space-y-3 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">
          Hundar ({dogs.length}{filteredDogs.length !== dogs.length ? `, visar ${filteredDogs.length}` : ''})
        </h2>
        {(userRole === 'admin' || userRole === 'platschef') && (
          <button
            onClick={() => openDogModal()}
            className="flex items-center justify-center bg-primary text-white px-3 sm:px-4 py-2 rounded-md hover:bg-primary-dark transition-colors text-sm sm:text-base w-full sm:w-auto"
          >
            <FaPlus className="mr-2" /> Lägg till hund
          </button>
        )}
      </div>

      {/* Search and Filters */}
      {dogs.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 space-y-3 sm:space-y-4">
          {/* Search input */}
          <div>
            <input
              type="text"
              placeholder="Sök på namn, ägare, ras eller telefon..."
              value={dogsTabSearch}
              onChange={(e) => setDogsTabSearch(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
            />
          </div>

          {/* Filter controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-gray-200">
            {/* Location Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaFilter className="inline mr-1" /> Plats
              </label>
              <select
                value={dogsLocationFilter}
                onChange={(e) => setDogsLocationFilter(e.target.value as 'all' | 'malmo' | 'staffanstorp' | 'both')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">Alla platser</option>
                <option value="malmo">Malmö</option>
                <option value="staffanstorp">Staffanstorp</option>
                <option value="both">Båda platserna</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Typ
              </label>
              <select
                value={dogsTypeFilter}
                onChange={(e) => setDogsTypeFilter(e.target.value as 'all' | 'fulltime' | 'parttime-3' | 'parttime-2' | 'singleDay' | 'boarding')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">Alla typer</option>
                <option value="fulltime">Heltid</option>
                <option value="parttime-3">Deltid 3 dagar</option>
                <option value="parttime-2">Deltid 2 dagar</option>
                <option value="singleDay">Enstaka dag</option>
                <option value="boarding">Hundpensionat</option>
              </select>
            </div>

            {/* Active/Inactive Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={dogsActiveFilter}
                onChange={(e) => setDogsActiveFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">Alla</option>
                <option value="active">Aktiva</option>
                <option value="inactive">Inaktiva</option>
              </select>
            </div>
          </div>

          {/* Clear filters button */}
          {(dogsTabSearch.trim() || dogsLocationFilter !== 'all' || dogsTypeFilter !== 'all' || dogsActiveFilter !== 'all') && (
            <div className="pt-2">
              <button
                onClick={() => {
                  setDogsTabSearch('');
                  setDogsLocationFilter('all');
                  setDogsTypeFilter('all');
                  setDogsActiveFilter('all');
                }}
                className="text-sm text-gray-600 hover:text-primary flex items-center gap-1"
              >
                <FaTimes className="text-xs" /> Rensa alla filter
              </button>
            </div>
          )}
        </div>
      )}

      {dogs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <FaDog className="text-6xl mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 mb-4">Inga hundar tillagda än</p>
          {(userRole === 'admin' || userRole === 'platschef') && (
            <button
              onClick={() => openDogModal()}
              className="flex items-center bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors mx-auto"
            >
              <FaPlus className="mr-2" /> Lägg till första hunden
            </button>
          )}
        </div>
      ) : filteredDogs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <FaDog className="text-6xl mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 mb-2">Inga hundar matchar sökningen</p>
          <p className="text-sm text-gray-400">Försök med en annan sökterm</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredDogs.map((dog) => (
            <div key={dog.id} className="bg-white rounded-lg shadow-lg p-3 sm:p-4 border-l-4 border-primary">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-800 inline-block`}>
                    {dog.name}
                  </div>
                  <div className="flex gap-1 mt-1">
                    {dog.locations.map(location => (
                      <span key={location} className={`text-xs px-2 py-1 rounded ${location === 'malmo' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                        {location === 'malmo' ? 'Malmö' : 'Staffanstorp'}
                      </span>
                    ))}
                  </div>
                </div>
                {(userRole === 'admin' || userRole === 'platschef') && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => openDogModal(dog)}
                      className="text-gray-600 hover:text-primary"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => deleteDog(dog.id)}
                      className="text-gray-600 hover:text-red-600"
                    >
                      <FaTrash />
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-1 text-sm">
                <p><strong>Ras:</strong> {dog.breed || '-'}</p>
                <p><strong>Ålder:</strong> {dog.age || '-'}</p>
                <p><strong>Ägare:</strong> {dog.owner}</p>
                <p><strong>Telefon:</strong> {dog.phone || '-'}</p>
                {dog.type && (
                  <p><strong>Typ:</strong> {
                    dog.type === 'fulltime' ? 'Heltid' :
                    dog.type === 'parttime-3' ? 'Deltid 3 dagar' :
                    dog.type === 'parttime-2' ? 'Deltid 2 dagar' :
                    dog.type === 'singleDay' ? 'Enstaka dag' :
                    dog.type === 'boarding' ? 'Hundpensionat' :
                    '-'
                  }</p>
                )}
                {dog.notes && (
                  <p className="text-gray-600 italic">{dog.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
  };

  const renderSettings = () => {
    const currentSettings = boxSettings[settingsLocation];

    const handleAddCage = () => {
      const newSettings = {
        ...boxSettings,
        [settingsLocation]: {
          ...boxSettings[settingsLocation],
          cages: [...currentSettings.cages, { name: `Bur ${currentSettings.cages.length + 1}` }]
        }
      };
      saveBoxSettings(newSettings);
    };

    const handleAddFreeArea = () => {
      const newSettings = {
        ...boxSettings,
        [settingsLocation]: {
          ...boxSettings[settingsLocation],
          freeAreas: [...currentSettings.freeAreas, { name: `Fri yta ${currentSettings.freeAreas.length + 1}` }]
        }
      };
      saveBoxSettings(newSettings);
    };

    const handleRemoveCage = (index: number) => {
      if (confirm('Är du säker på att du vill ta bort denna bur?')) {
        const newSettings = {
          ...boxSettings,
          [settingsLocation]: {
            ...boxSettings[settingsLocation],
            cages: currentSettings.cages.filter((_, i) => i !== index)
          }
        };
        saveBoxSettings(newSettings);
      }
    };

    const handleRemoveFreeArea = (index: number) => {
      if (confirm('Är du säker på att du vill ta bort denna fria yta?')) {
        const newSettings = {
          ...boxSettings,
          [settingsLocation]: {
            ...boxSettings[settingsLocation],
            freeAreas: currentSettings.freeAreas.filter((_, i) => i !== index)
          }
        };
        saveBoxSettings(newSettings);
      }
    };

    const handleStartEdit = (type: 'cage' | 'free-area', index: number) => {
      const item = type === 'cage' ? currentSettings.cages[index] : currentSettings.freeAreas[index];
      setEditingBoxIndex({ type, index });
      setEditingBoxName(item.name);
    };

    const handleSaveEdit = () => {
      if (!editingBoxIndex || !editingBoxName.trim()) return;

      const newSettings = {
        ...boxSettings,
        [settingsLocation]: {
          ...boxSettings[settingsLocation],
          [editingBoxIndex.type === 'cage' ? 'cages' : 'freeAreas']: editingBoxIndex.type === 'cage'
            ? currentSettings.cages.map((cage, i) => i === editingBoxIndex.index ? { name: editingBoxName.trim() } : cage)
            : currentSettings.freeAreas.map((area, i) => i === editingBoxIndex.index ? { name: editingBoxName.trim() } : area)
        }
      };
      saveBoxSettings(newSettings);
      setEditingBoxIndex(null);
      setEditingBoxName('');
    };

    const handleCancelEdit = () => {
      setEditingBoxIndex(null);
      setEditingBoxName('');
    };

    return (
      <div className="space-y-3 sm:space-y-6">
        <div className="bg-white rounded-lg shadow-lg p-3 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Box-inställningar</h2>
          
          {/* Location Selector */}
          <div className="mb-4 sm:mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Välj plats</label>
            <div className="flex gap-2 sm:gap-4">
              <button
                onClick={() => setSettingsLocation('staffanstorp')}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md font-medium transition-colors text-sm sm:text-base ${
                  settingsLocation === 'staffanstorp'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Staffanstorp
              </button>
              <button
                onClick={() => setSettingsLocation('malmo')}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md font-medium transition-colors text-sm sm:text-base ${
                  settingsLocation === 'malmo'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Malmö
              </button>
            </div>
          </div>

          {/* Cages Section */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-3 sm:mb-4">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800">Burar</h3>
              <button
                onClick={handleAddCage}
                className="flex items-center justify-center bg-blue-500 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-blue-600 transition-colors text-sm sm:text-base w-full sm:w-auto"
              >
                <FaPlus className="mr-2" /> Lägg till bur
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {currentSettings.cages.map((cage, index) => (
                <div
                  key={index}
                  className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 flex items-center justify-between"
                >
                  {editingBoxIndex?.type === 'cage' && editingBoxIndex.index === index ? (
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={editingBoxName}
                        onChange={(e) => setEditingBoxName(e.target.value)}
                        className="flex-1 px-2 py-1 border border-blue-300 rounded-md"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        autoFocus
                      />
                      <button
                        onClick={handleSaveEdit}
                        className="px-2 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
                      >
                        ✓
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-2 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🏠</span>
                        <span className="font-medium text-gray-800">{cage.name}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStartEdit('cage', index)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Redigera namn"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleRemoveCage(index)}
                          className="text-red-600 hover:text-red-800"
                          title="Ta bort"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {currentSettings.cages.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-400">
                  Inga burar konfigurerade
                </div>
              )}
            </div>
          </div>

          {/* Free Areas Section */}
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-3 sm:mb-4">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800">Fria ytor</h3>
              <button
                onClick={handleAddFreeArea}
                className="flex items-center justify-center bg-green-500 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-green-600 transition-colors text-sm sm:text-base w-full sm:w-auto"
              >
                <FaPlus className="mr-2" /> Lägg till fri yta
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {currentSettings.freeAreas.map((area, index) => (
                <div
                  key={index}
                  className="bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-center justify-between"
                >
                  {editingBoxIndex?.type === 'free-area' && editingBoxIndex.index === index ? (
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={editingBoxName}
                        onChange={(e) => setEditingBoxName(e.target.value)}
                        className="flex-1 px-2 py-1 border border-green-300 rounded-md"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        autoFocus
                      />
                      <button
                        onClick={handleSaveEdit}
                        className="px-2 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
                      >
                        ✓
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-2 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🏞️</span>
                        <span className="font-medium text-gray-800">{area.name}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStartEdit('free-area', index)}
                          className="text-green-600 hover:text-green-800"
                          title="Redigera namn"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleRemoveFreeArea(index)}
                          className="text-red-600 hover:text-red-800"
                          title="Ta bort"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {currentSettings.freeAreas.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-400">
                  Inga fria ytor konfigurerade
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Obs:</strong> Ändringar här kommer att påverka nya planeringar. Befintliga planeringar påverkas inte.
            </p>
          </div>
        </div>
      </div>
    );
  };

  // IMPORTANT: All hooks above must be defined before any conditional returns
  // This ensures React hooks are always called in the same order

  // Find matching dogs for an application
  const checkApplicationMatches = async (application: Application) => {
    try {
      const matches = await findMatchingDogs(
        application.owner_phone || '',
        application.dog_name,
        application.owner_email
      );
      setApplicationMatchingDogs(matches);
    } catch (error) {
      console.error('Error finding matching dogs:', error);
      setApplicationMatchingDogs([]);
    }
  };

  // Handle application selection
  const handleSelectApplication = async (application: Application) => {
    setSelectedApplication(application);
    await checkApplicationMatches(application);
  };

  // Add dog directly from application
  const handleAddDogFromApplication = async (application: Application, matchExistingDogId?: string) => {
    console.log('handleAddDogFromApplication called', { application, matchExistingDogId });
    try {
      if (!application) {
        console.error('No application provided');
        alert('Ingen ansökan vald');
        return;
      }
      let newDog: Dog;
      
      if (matchExistingDogId) {
        // Update existing dog with application data
        const existingDog = dogs.find(d => d.id === matchExistingDogId);
        if (!existingDog) {
          alert('Hund hittades inte');
          return;
        }
        
        // Update dog with application info (but keep existing data as priority)
        newDog = {
          ...existingDog,
          // Only update fields that are missing in existing dog
          email: existingDog.email || application.owner_email || undefined,
          notes: existingDog.notes || `${existingDog.notes ? existingDog.notes + '\n\n' : ''}Från ansökan: ${application.dog_socialization || ''}`.trim() || undefined,
        };
        
        await saveDogToDb(newDog);
        const updatedDogs = dogs.map(d => d.id === matchExistingDogId ? newDog : d);
        setDogs(updatedDogs);
        
        // Update application status to matched
        await updateApplication(application.id, {
          status: 'matched',
          matched_dog_id: matchExistingDogId,
          matched_by: currentUser?.id,
          matched_at: new Date().toISOString(),
        });
      } else {
        // Create new dog from application
        
        // Determine dog type from service_type
        let dogType: 'fulltime' | 'parttime-3' | 'parttime-2' | 'singleDay' | 'boarding' | undefined = undefined;
        if (application.service_type === 'daycare') {
          dogType = 'fulltime';
        } else if (application.service_type === 'parttime') {
          if (application.days_per_week === '2') {
            dogType = 'parttime-2';
          } else if (application.days_per_week === '3') {
            dogType = 'parttime-3';
          }
        } else if (application.service_type === 'singleDay' || application.service_type === 'singleDay') {
          dogType = 'singleDay';
        } else if (application.service_type === 'boarding') {
          dogType = 'boarding';
        }
        
        newDog = {
          id: '',
          name: application.dog_name,
          breed: application.dog_breed || '',
          age: application.dog_age || '',
          owner: application.owner_name,
          phone: application.owner_phone || '',
          email: application.owner_email || undefined,
          notes: `${application.dog_socialization ? `Socialisering: ${application.dog_socialization}\n` : ''}${application.problem_behaviors ? `Problembeteenden: ${application.problem_behaviors}\n` : ''}${application.allergies ? `Allergier: ${application.allergies}\n` : ''}${application.message ? `Meddelande: ${application.message}` : ''}`.trim() || undefined,
          locations: [application.location],
          type: dogType,
          isActive: true,
          // Contract fields from application
          ownerAddress: application.owner_address || undefined,
          ownerCity: application.owner_city || undefined,
          ownerPersonalNumber: application.owner_personnummer || undefined,
          chipNumber: application.dog_chip_number || undefined
        };
        
        console.log('Creating new dog from application:', newDog);
        const savedDog = await saveDogToDb(newDog);
        console.log('Dog saved successfully:', savedDog);
        setDogs([...dogs, savedDog]);
        
        // Update application status to added
        console.log('Updating application status');
        await updateApplication(application.id, {
          status: 'added',
          matched_dog_id: savedDog.id,
          matched_by: currentUser?.id,
          matched_at: new Date().toISOString(),
        });
        console.log('Application updated successfully');
      }
      
      // Reload applications to reflect status change
      const filters: { status?: string; location?: string } = {};
      if (applicationsFilter !== 'all') {
        filters.status = applicationsFilter;
      }
      if (applicationsLocationFilter !== 'all') {
        filters.location = applicationsLocationFilter;
      }
      const updatedApplications = await getApplications(filters);
      setApplications(updatedApplications);
      
      // Close selected application
      setSelectedApplication(null);
      setApplicationMatchingDogs([]);
      
      alert('Hund tillagd!');
    } catch (error) {
      console.error('Error adding dog from application:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      alert(`Fel uppstod vid tillägg av hund: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Update application status
  const handleUpdateApplicationStatus = async (application: Application, newStatus: Application['status']) => {
    try {
      await updateApplication(application.id, { status: newStatus });
      const filters: { status?: string; location?: string } = {};
      if (applicationsFilter !== 'all') {
        filters.status = applicationsFilter;
      }
      if (applicationsLocationFilter !== 'all') {
        filters.location = applicationsLocationFilter;
      }
      const updatedApplications = await getApplications(filters);
      setApplications(updatedApplications);
    } catch (error) {
      console.error('Error updating application status:', error);
      alert('Fel uppstod vid uppdatering av ansökan');
    }
  };

  const renderApplications = () => {
    if (userRole !== 'admin' && userRole !== 'platschef') {
      return renderDashboard();
    }

    const filteredApplications = applications;

    const getStatusBadge = (status: Application['status']) => {
      const badges: Record<Application['status'], { text: string; color: string }> = {
        'new': { text: 'Ny', color: 'bg-blue-100 text-blue-800' },
        'reviewed': { text: 'Granskad', color: 'bg-yellow-100 text-yellow-800' },
        'approved': { text: 'Godkänd', color: 'bg-green-100 text-green-800' },
        'rejected': { text: 'Avslagen', color: 'bg-red-100 text-red-800' },
        'matched': { text: 'Matchad', color: 'bg-purple-100 text-purple-800' },
        'added': { text: 'Tillagd', color: 'bg-green-200 text-green-900' },
      };
      const badge = badges[status] || badges['new'];
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
          {badge.text}
        </span>
      );
    };

    return (
      <div className="space-y-3 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Ansökningar ({filteredApplications.length})</h2>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
            <select
              value={applicationsFilter}
              onChange={(e) => setApplicationsFilter(e.target.value as any)}
              className="flex-1 sm:flex-none px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary text-sm sm:text-base"
            >
              <option value="all">Alla statusar</option>
              <option value="new">Nya</option>
              <option value="reviewed">Granskade</option>
              <option value="approved">Godkända</option>
              <option value="rejected">Avslagna</option>
              <option value="matched">Matchade</option>
              <option value="added">Tillagda</option>
            </select>
            
            <select
              value={applicationsLocationFilter}
              onChange={(e) => setApplicationsLocationFilter(e.target.value as any)}
              className="flex-1 sm:flex-none px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary text-sm sm:text-base"
            >
              <option value="all">Alla platser</option>
              <option value="malmo">Malmö</option>
              <option value="staffanstorp">Staffanstorp</option>
            </select>
          </div>
        </div>

        {/* Applications List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {filteredApplications.length === 0 ? (
            <div className="p-6 sm:p-8 text-center text-gray-500 text-sm sm:text-base">
              Inga ansökningar hittades
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredApplications.map((application) => (
                <div
                  key={application.id}
                  className={`p-3 sm:p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedApplication?.id === application.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                  onClick={() => handleSelectApplication(application)}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-2 sm:gap-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                          {application.dog_name}
                        </h3>
                        {getStatusBadge(application.status)}
                        <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                          {application.location === 'malmo' ? 'Malmö' : 'Staffanstorp'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs sm:text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Ägare:</span> {application.owner_name}
                        </div>
                        <div>
                          <span className="font-medium">Telefon:</span> {application.owner_phone || 'Saknas'}
                        </div>
                        <div>
                          <span className="font-medium">E-post:</span> <span className="truncate block">{application.owner_email}</span>
                        </div>
                        <div>
                          <span className="font-medium">Tjänst:</span> {application.service_type}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        {new Date(application.created_at).toLocaleDateString('sv-SE')} {new Date(application.created_at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Application Detail Modal */}
        {selectedApplication && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900">
                  Ansökan: {selectedApplication.dog_name}
                </h3>
                <button
                  onClick={() => {
                    setSelectedApplication(null);
                    setApplicationMatchingDogs([]);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FaTimes className="text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Status and Actions */}
                <div className="flex items-center justify-between">
                  {getStatusBadge(selectedApplication.status)}
                  <div className="flex gap-2">
                    <select
                      value={selectedApplication.status}
                      onChange={(e) => handleUpdateApplicationStatus(selectedApplication, e.target.value as Application['status'])}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    >
                      <option value="new">Ny</option>
                      <option value="reviewed">Granskad</option>
                      <option value="approved">Godkänd</option>
                      <option value="rejected">Avslagen</option>
                      <option value="matched">Matchad</option>
                      <option value="added">Tillagd</option>
                    </select>
                  </div>
                </div>

                {/* Owner Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Ägareinformation</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Namn:</span> {selectedApplication.owner_name}
                    </div>
                    <div>
                      <span className="font-medium">E-post:</span> {selectedApplication.owner_email}
                    </div>
                    <div>
                      <span className="font-medium">Telefon:</span> {selectedApplication.owner_phone || 'Saknas'}
                    </div>
                    <div>
                      <span className="font-medium">Adress:</span> {selectedApplication.owner_address || 'Saknas'}
                    </div>
                    {selectedApplication.owner_city && (
                      <div>
                        <span className="font-medium">Ort:</span> {selectedApplication.owner_city}
                      </div>
                    )}
                    {selectedApplication.owner_postal_code && (
                      <div>
                        <span className="font-medium">Postnummer:</span> {selectedApplication.owner_postal_code}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Personnummer:</span> {selectedApplication.owner_personnummer || 'Saknas'}
                    </div>
                  </div>
                </div>

                {/* Dog Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Hundinformation</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Namn:</span> {selectedApplication.dog_name}
                    </div>
                    <div>
                      <span className="font-medium">Ras:</span> {selectedApplication.dog_breed || 'Saknas'}
                    </div>
                    <div>
                      <span className="font-medium">Ålder:</span> {selectedApplication.dog_age || 'Saknas'}
                    </div>
                    <div>
                      <span className="font-medium">Kön:</span> {selectedApplication.dog_gender || 'Saknas'}
                    </div>
                    <div>
                      <span className="font-medium">Höjd:</span> {selectedApplication.dog_height || 'Saknas'}
                    </div>
                    <div>
                      <span className="font-medium">Kastrerad:</span> {selectedApplication.is_neutered || 'Saknas'}
                    </div>
                    <div>
                      <span className="font-medium">Chipnummer:</span> {selectedApplication.dog_chip_number || 'Saknas'}
                    </div>
                  </div>
                </div>

                {/* Service Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Tjänstinformation</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Tjänsttyp:</span> {selectedApplication.service_type}
                    </div>
                    <div>
                      <span className="font-medium">Plats:</span> {selectedApplication.location === 'malmo' ? 'Malmö' : 'Staffanstorp'}
                    </div>
                    {selectedApplication.days_per_week && (
                      <div>
                        <span className="font-medium">Dagar per vecka:</span> {selectedApplication.days_per_week}
                      </div>
                    )}
                    {selectedApplication.start_date && (
                      <div>
                        <span className="font-medium">Startdatum:</span> {new Date(selectedApplication.start_date).toLocaleDateString('sv-SE')}
                      </div>
                    )}
                    {selectedApplication.end_date && (
                      <div>
                        <span className="font-medium">Slutdatum:</span> {new Date(selectedApplication.end_date).toLocaleDateString('sv-SE')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Information */}
                {(selectedApplication.dog_socialization || selectedApplication.problem_behaviors || selectedApplication.allergies || selectedApplication.message || selectedApplication.additional_info) && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Ytterligare information</h4>
                    <div className="space-y-2 text-sm">
                      {selectedApplication.dog_socialization && (
                        <div>
                          <span className="font-medium">Socialisering:</span>
                          <p className="text-gray-700 mt-1">{selectedApplication.dog_socialization}</p>
                        </div>
                      )}
                      {selectedApplication.problem_behaviors && (
                        <div>
                          <span className="font-medium">Problembeteenden:</span>
                          <p className="text-gray-700 mt-1">{selectedApplication.problem_behaviors}</p>
                        </div>
                      )}
                      {selectedApplication.allergies && (
                        <div>
                          <span className="font-medium">Allergier:</span>
                          <p className="text-gray-700 mt-1">{selectedApplication.allergies}</p>
                        </div>
                      )}
                      {selectedApplication.message && (
                        <div>
                          <span className="font-medium">Meddelande:</span>
                          <p className="text-gray-700 mt-1">{selectedApplication.message}</p>
                        </div>
                      )}
                      {selectedApplication.additional_info && (
                        <div>
                          <span className="font-medium">Övrig information:</span>
                          <p className="text-gray-700 mt-1">{selectedApplication.additional_info}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Matching Dogs */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-gray-900">
                      Matchade hundar ({applicationMatchingDogs.length})
                    </h4>
                    <button
                      onClick={() => checkApplicationMatches(selectedApplication)}
                      className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                    >
                      Sök igen
                    </button>
                  </div>
                  {applicationMatchingDogs.length === 0 ? (
                    <p className="text-sm text-gray-600">
                      Ingen matchande hund hittades baserat på telefonnummer/email + hundens namn
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {applicationMatchingDogs.map((dog) => (
                        <div
                          key={dog.id}
                          className="bg-white rounded-lg p-3 border border-blue-200"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium">{dog.name}</div>
                              <div className="text-sm text-gray-600">
                                Ägare: {dog.owner} | Telefon: {dog.phone}
                                {dog.email && ` | E-post: ${dog.email}`}
                              </div>
                            </div>
                            <button
                              onClick={() => handleAddDogFromApplication(selectedApplication, dog.id)}
                              className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
                            >
                              Matcha med denna hund
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add New Dog Button */}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      console.log('Button clicked, selectedApplication:', selectedApplication);
                      if (!selectedApplication) {
                        alert('Ingen ansökan vald');
                        return;
                      }
                      handleAddDogFromApplication(selectedApplication);
                    }}
                    disabled={!selectedApplication}
                    className={`px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark font-medium ${!selectedApplication ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Lägg till som ny hund
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMeetings = () => {
    const handleOpenMeetingModal = (meeting?: Meeting) => {
      if (meeting) {
        setEditingMeeting(meeting);
        setMeetingForm({
          name: meeting.name,
          dogName: meeting.dogName || '',
          phone: meeting.phone || '',
          email: meeting.email || '',
          date: meeting.date,
          time: meeting.time,
          location: meeting.location
        });
      } else {
        setEditingMeeting(null);
        setMeetingForm({
          name: '',
          dogName: '',
          phone: '',
          email: '',
          date: new Date().toISOString().split('T')[0],
          time: '',
          location: 'malmo'
        });
      }
      setIsMeetingModalOpen(true);
    };

    const handleSaveMeeting = async () => {
      if (!meetingForm.name || !meetingForm.date || !meetingForm.time) {
        alert('Namn, datum och tid är obligatoriska fält');
        return;
      }

      // Format time to HH:mm (remove seconds if present)
      const formattedTime = formatTime(meetingForm.time);

      try {
        if (editingMeeting) {
          const updated = await updateMeeting(editingMeeting.id, {
            name: meetingForm.name,
            dogName: meetingForm.dogName || undefined,
            phone: meetingForm.phone || undefined,
            email: meetingForm.email || undefined,
            date: meetingForm.date,
            time: formattedTime,
            location: meetingForm.location
          });
          setMeetings(meetings.map(m => m.id === updated.id ? updated : m));
        } else {
          const newMeeting = await saveMeeting({
            name: meetingForm.name,
            dogName: meetingForm.dogName || undefined,
            phone: meetingForm.phone || undefined,
            email: meetingForm.email || undefined,
            date: meetingForm.date,
            time: formattedTime,
            location: meetingForm.location
          });
          setMeetings([...meetings, newMeeting]);
        }
        setIsMeetingModalOpen(false);
        setEditingMeeting(null);
      } catch (error) {
        console.error('Error saving meeting:', error);
        alert('Ett fel uppstod när mötet skulle sparas');
      }
    };

    const handleDeleteMeeting = async (id: string) => {
      if (!confirm('Är du säker på att du vill ta bort detta möte?')) return;

      try {
        await deleteMeeting(id);
        setMeetings(meetings.filter(m => m.id !== id));
      } catch (error) {
        console.error('Error deleting meeting:', error);
        alert('Ett fel uppstod när mötet skulle tas bort');
      }
    };

    const upcomingMeetings = meetings
      .filter(m => new Date(m.date + 'T' + m.time) >= new Date())
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.time.localeCompare(b.time);
      });

    const pastMeetings = meetings
      .filter(m => new Date(m.date + 'T' + m.time) < new Date())
      .sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return b.time.localeCompare(a.time);
      });

    return (
      <div className="space-y-3 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Möten ({meetings.length})</h2>
          {userRole !== 'employee' && (
            <button
              onClick={() => handleOpenMeetingModal()}
              className="flex items-center justify-center bg-primary text-white px-3 sm:px-4 py-2 rounded-md hover:bg-primary-dark text-sm sm:text-base w-full sm:w-auto"
            >
              <FaPlus /> Nytt möte
            </button>
          )}
        </div>

        {/* Upcoming Meetings */}
        <div className="bg-white rounded-lg shadow-lg p-3 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
            Kommande möten ({upcomingMeetings.length})
          </h3>
          {upcomingMeetings.length === 0 ? (
            <p className="text-gray-500 text-center py-6 sm:py-8 text-sm sm:text-base">Inga kommande möten</p>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {upcomingMeetings.map((meeting) => {
                const meetingDate = new Date(meeting.date + 'T' + meeting.time);
                return (
                  <div
                    key={meeting.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1 min-w-0 w-full sm:w-auto">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                        <h4 className="font-semibold text-sm sm:text-base text-gray-900 truncate">{meeting.name}</h4>
                        <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                          {meeting.location === 'malmo' ? 'Malmö' : 'Staffanstorp'}
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600 space-y-0.5 sm:space-y-1">
                        {meeting.dogName && (
                          <div><span className="font-medium">Hund:</span> {meeting.dogName}</div>
                        )}
                        {meeting.phone && (
                          <div><span className="font-medium">Telefon:</span> {meeting.phone}</div>
                        )}
                        {meeting.email && (
                          <div><span className="font-medium">E-post:</span> <span className="truncate block">{meeting.email}</span></div>
                        )}
                        <div className="font-medium text-primary">
                          {meetingDate.toLocaleDateString('sv-SE')} kl. {formatTime(meeting.time)}
                        </div>
                      </div>
                    </div>
                    {userRole !== 'employee' && (
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleOpenMeetingModal(meeting)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1.5 sm:py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-xs sm:text-sm"
                        >
                          <FaEdit /> <span className="hidden sm:inline">Redigera</span><span className="sm:hidden">Red</span>
                        </button>
                        <button
                          onClick={() => handleDeleteMeeting(meeting.id)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1.5 sm:py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-xs sm:text-sm"
                        >
                          <FaTrash /> <span className="hidden sm:inline">Ta bort</span><span className="sm:hidden">Ta bort</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Past Meetings */}
        <div className="bg-white rounded-lg shadow-lg p-3 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
            Tidigare möten ({pastMeetings.length})
          </h3>
          {pastMeetings.length === 0 ? (
            <p className="text-gray-500 text-center py-6 sm:py-8 text-sm sm:text-base">Inga tidigare möten</p>
          ) : (
            <div className="space-y-2 sm:space-y-3 max-h-96 overflow-y-auto">
              {pastMeetings.map((meeting) => {
                const meetingDate = new Date(meeting.date + 'T' + meeting.time);
                return (
                  <div
                    key={meeting.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200 opacity-75"
                  >
                    <div className="flex-1 min-w-0 w-full sm:w-auto">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                        <h4 className="font-semibold text-sm sm:text-base text-gray-700 truncate">{meeting.name}</h4>
                        <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                          {meeting.location === 'malmo' ? 'Malmö' : 'Staffanstorp'}
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600 space-y-0.5 sm:space-y-1">
                        {meeting.dogName && (
                          <div><span className="font-medium">Hund:</span> {meeting.dogName}</div>
                        )}
                        <div className="font-medium text-gray-500">
                          {meetingDate.toLocaleDateString('sv-SE')} kl. {formatTime(meeting.time)}
                        </div>
                      </div>
                    </div>
                    {userRole !== 'employee' && (
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleOpenMeetingModal(meeting)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1.5 sm:py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-xs sm:text-sm"
                        >
                          <FaEdit /> <span className="hidden sm:inline">Redigera</span><span className="sm:hidden">Red</span>
                        </button>
                        <button
                          onClick={() => handleDeleteMeeting(meeting.id)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1.5 sm:py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-xs sm:text-sm"
                        >
                          <FaTrash /> <span className="hidden sm:inline">Ta bort</span><span className="sm:hidden">Ta bort</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Meeting Modal */}
        {isMeetingModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                  {editingMeeting ? 'Redigera möte' : 'Nytt möte'}
                </h3>
                <button
                  onClick={() => {
                    setIsMeetingModalOpen(false);
                    setEditingMeeting(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes className="text-lg sm:text-xl" />
                </button>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Namn * <span className="text-red-500">(obligatoriskt)</span>
                  </label>
                  <input
                    type="text"
                    value={meetingForm.name}
                    onChange={(e) => setMeetingForm({ ...meetingForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary text-sm sm:text-base"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hund
                  </label>
                  <input
                    type="text"
                    value={meetingForm.dogName}
                    onChange={(e) => setMeetingForm({ ...meetingForm, dogName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary text-sm sm:text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={meetingForm.phone}
                    onChange={(e) => setMeetingForm({ ...meetingForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary text-sm sm:text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-post
                  </label>
                  <input
                    type="email"
                    value={meetingForm.email}
                    onChange={(e) => setMeetingForm({ ...meetingForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary text-sm sm:text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dag * <span className="text-red-500">(obligatoriskt)</span>
                  </label>
                  <input
                    type="date"
                    value={meetingForm.date}
                    onChange={(e) => setMeetingForm({ ...meetingForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary text-sm sm:text-base"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tid * <span className="text-red-500">(obligatoriskt)</span>
                  </label>
                  <input
                    type="time"
                    value={meetingForm.time}
                    onChange={(e) => setMeetingForm({ ...meetingForm, time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary text-sm sm:text-base"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plats
                  </label>
                  <select
                    value={meetingForm.location}
                    onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value as 'malmo' | 'staffanstorp' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary text-sm sm:text-base"
                  >
                    <option value="malmo">Malmö</option>
                    <option value="staffanstorp">Staffanstorp</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-4 sm:mt-6">
                <button
                  onClick={() => {
                    setIsMeetingModalOpen(false);
                    setEditingMeeting(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm sm:text-base"
                >
                  Avbryt
                </button>
                <button
                  onClick={handleSaveMeeting}
                  className="w-full sm:w-auto px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark text-sm sm:text-base"
                >
                  {editingMeeting ? 'Spara ändringar' : 'Skapa möte'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    // Employees can ONLY see meetings - redirect everything else to meetings
    if (userRole === 'employee') {
      return renderMeetings();
    }
    // Redirect platschef away from contracts and statistics
    if (userRole === 'platschef' && (currentView === 'contracts' || currentView === 'statistics')) {
      return renderDashboard();
    }

    switch(currentView) {
      case 'dogs':
        return renderDogs();
      case 'contracts':
        return userRole === 'admin' ? renderContracts() : renderDashboard();
      case 'planning-malmo':
        return renderPlanningMalmo();
      case 'planning-staffanstorp':
        return renderPlanningStaffanstorp();
      case 'boarding-malmo':
        return renderBoardingMalmo();
      case 'boarding-staffanstorp':
        return renderBoardingStaffanstorp();
      case 'calendar-malmo':
        return renderCalendarMalmo();
      case 'calendar-staffanstorp':
        return renderCalendarStaffanstorp();
      case 'statistics':
        return userRole === 'admin' ? renderStatistics() : renderDashboard();
      case 'settings':
        return (userRole === 'admin' || userRole === 'platschef') ? renderSettings() : renderDashboard();
      case 'applications':
        return (userRole === 'admin' || userRole === 'platschef') ? renderApplications() : renderDashboard();
      case 'meetings':
        return renderMeetings();
      default:
        return renderDashboard();
    }
  };

  const renderContractForm = () => (
    <form className="space-y-4 sm:space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 border-b pb-2">Contract Type</h2>
                <div className="mb-3 sm:mb-4">
                  <label htmlFor="contractType" className="block text-sm font-medium text-gray-700 mb-1">Contract Type</label>
                  <select
                    id="contractType"
                    name="contractType"
                    value={contractData.contractType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary text-sm sm:text-base"
                  >
                    <option value="daycare">Hunddagis (Full-time)</option>
                    <option value="partTime">Hunddagis (Part-time)</option>
                    <option value="boarding">Hundpensionat</option>
                    <option value="socialWalk">Social Promenad</option>
                    <option value="singleDay">Enstaka Dag</option>
                  </select>
                </div>
                
                {contractData.contractType === 'partTime' && (
                  <div className="mb-3 sm:mb-4">
                    <label htmlFor="daysPerWeek" className="block text-sm font-medium text-gray-700 mb-1">Days Per Week</label>
                    <input
                      type="text"
                      id="daysPerWeek"
                      name="daysPerWeek"
                      value={contractData.daysPerWeek}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary text-sm sm:text-base"
                      placeholder="e.g., 2-3"
                    />
                  </div>
                )}
                
                <div className="mb-3 sm:mb-4">
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">Price (SEK)</label>
                  <input
                    type="text"
                    id="price"
                    name="price"
                    value={contractData.price}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary text-sm sm:text-base"
                    placeholder="e.g., 2500"
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="mb-3 sm:mb-4">
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      id="startDate"
                      name="startDate"
                      value={contractData.startDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary text-sm sm:text-base"
                    />
                  </div>
                  
                  <div className="mb-3 sm:mb-4">
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      id="endDate"
                      name="endDate"
                      value={contractData.endDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary text-sm sm:text-base"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 border-b pb-2">Owner Information</h2>
                <div className="mb-3 sm:mb-4">
                  <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                  <input
                    type="text"
                    id="customerName"
                    name="customerName"
                    value={contractData.customerName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary text-sm sm:text-base"
                    placeholder="e.g., Tina Eriksson"
                  />
                </div>
                
                <div className="mb-3 sm:mb-4">
                  <label htmlFor="customerAddress" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    id="customerAddress"
                    name="customerAddress"
                    value={contractData.customerAddress}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary text-sm sm:text-base"
                    placeholder="e.g., Storabackegatan 15d"
                  />
                </div>
                
                <div className="mb-3 sm:mb-4">
                  <label htmlFor="customerCity" className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    id="customerCity"
                    name="customerCity"
                    value={contractData.customerCity}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary text-sm sm:text-base"
                    placeholder="e.g., Malmö"
                  />
                </div>
                
                <div className="mb-3 sm:mb-4">
                  <label htmlFor="personalNumber" className="block text-sm font-medium text-gray-700 mb-1">Personal Number</label>
                  <input
                    type="text"
                    id="personalNumber"
                    name="personalNumber"
                    value={contractData.personalNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary text-sm sm:text-base"
                    placeholder="e.g., 19711216-3907"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 border-b pb-2">Hundinformation</h2>
              
              {/* Dog Selection - Searchable Dropdown */}
              <div className="mb-4 relative contract-dog-dropdown">
                <label htmlFor="selectedDogForContract" className="block text-sm font-medium text-gray-700 mb-1">
                  Välj hund (för att autofylla fält)
                </label>
                <div className="relative">
                  <div
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-primary focus-within:border-primary cursor-pointer bg-white flex items-center justify-between"
                    onClick={() => setIsContractDogDropdownOpen(!isContractDogDropdownOpen)}
                  >
                    <span className={selectedDogForContract ? "text-gray-900" : "text-gray-500"}>
                      {selectedDogForContract ? (
                        `${dogs.find(d => d.id === selectedDogForContract)?.name} - ${dogs.find(d => d.id === selectedDogForContract)?.owner}`
                      ) : (
                        '-- Välj hund --'
                      )}
                    </span>
                    <svg 
                      className={`w-5 h-5 text-gray-400 transition-transform ${isContractDogDropdownOpen ? 'transform rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  {isContractDogDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-hidden">
                      <div className="p-2 border-b border-gray-200">
                        <input
                          type="text"
                          placeholder="Sök på hund eller ägare namn..."
                          value={contractDogSearch}
                          onChange={(e) => setContractDogSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {dogs
                          .filter(dog => {
                            const matchesActive = dog.isActive !== false;
                            const matchesSearch = !contractDogSearch.trim() || 
                              dog.name.toLowerCase().includes(contractDogSearch.toLowerCase()) ||
                              dog.owner.toLowerCase().includes(contractDogSearch.toLowerCase());
                            return matchesActive && matchesSearch;
                          })
                          .map(dog => (
                            <div
                              key={dog.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDogForContract(dog.id);
                                setContractData({
                                  ...contractData,
                                  customerName: dog.owner,
                                  customerAddress: dog.ownerAddress || '',
                                  customerCity: dog.ownerCity || '',
                                  personalNumber: dog.ownerPersonalNumber || '',
                                  dogName: dog.name,
                                  dogBreed: dog.breed,
                                  dogAge: dog.age,
                                  chipNumber: dog.chipNumber || ''
                                });
                                setIsContractDogDropdownOpen(false);
                                setContractDogSearch('');
                              }}
                              className={`px-3 py-2 hover:bg-gray-100 cursor-pointer ${
                                selectedDogForContract === dog.id ? 'bg-blue-50' : ''
                              }`}
                            >
                              {dog.name} - {dog.owner}
                            </div>
                          ))}
                        {dogs.filter(dog => {
                          const matchesActive = dog.isActive !== false;
                          const matchesSearch = !contractDogSearch.trim() || 
                            dog.name.toLowerCase().includes(contractDogSearch.toLowerCase()) ||
                            dog.owner.toLowerCase().includes(contractDogSearch.toLowerCase());
                          return matchesActive && matchesSearch;
                        }).length === 0 && (
                          <div className="px-3 py-2 text-sm text-gray-500">
                            Inga hundar matchar sökningen
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="mb-3 sm:mb-4">
                  <label htmlFor="dogName" className="block text-sm font-medium text-gray-700 mb-1">Hundens namn</label>
                  <input
                    type="text"
                    id="dogName"
                    name="dogName"
                    value={contractData.dogName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary text-sm sm:text-base"
                    placeholder="e.g., Morris"
                  />
                </div>
                
                <div className="mb-3 sm:mb-4">
                  <label htmlFor="dogBreed" className="block text-sm font-medium text-gray-700 mb-1">Dog Breed</label>
                  <input
                    type="text"
                    id="dogBreed"
                    name="dogBreed"
                    value={contractData.dogBreed}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary text-sm sm:text-base"
                    placeholder="e.g., Labradoodle"
                  />
                </div>
                
                <div className="mb-3 sm:mb-4">
                  <label htmlFor="dogAge" className="block text-sm font-medium text-gray-700 mb-1">Dog Age (years)</label>
                  <input
                    type="text"
                    id="dogAge"
                    name="dogAge"
                    value={contractData.dogAge}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary text-sm sm:text-base"
                    placeholder="e.g., 10"
                  />
                </div>
                
                <div className="mb-3 sm:mb-4">
                  <label htmlFor="chipNumber" className="block text-sm font-medium text-gray-700 mb-1">Microchip/Tattoo Number</label>
                  <input
                    type="text"
                    id="chipNumber"
                    name="chipNumber"
                    value={contractData.chipNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary text-sm sm:text-base"
                    placeholder="e.g., 941000016851106"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-center mt-6 sm:mt-8">
              <button
                type="button"
                onClick={generatePDF}
                className="flex items-center justify-center bg-primary text-white py-2 sm:py-3 px-4 sm:px-6 rounded-md hover:bg-primary-dark transition-colors text-base sm:text-lg w-full sm:w-auto"
              >
                <FaFilePdf className="mr-2" /> Generera kontrakt PDF
              </button>
            </div>
          </form>
  );

  // Get today's meetings for admin and platschef
  const getTodaysMeetings = () => {
    if (userRole !== 'admin' && userRole !== 'platschef') return [];
    const today = new Date().toISOString().split('T')[0];
    return meetings
      .filter(m => m.date === today)
      .sort((a, b) => a.time.localeCompare(b.time));
  };

  const todaysMeetings = getTodaysMeetings();

  return (
    <div className="min-h-screen bg-gray-100 p-2 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        {/* Today's Meetings Banner - Only for admin and platschef */}
        {(userRole === 'admin' || userRole === 'platschef') && todaysMeetings.length > 0 && (
          <div className="bg-orange-100 border-2 border-orange-400 rounded-lg p-4 mb-4 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-orange-500 text-white rounded-full p-2">
                  <FaCalendarAlt className="text-xl" />
                </div>
                <div>
                  <h3 className="font-bold text-orange-900 text-lg">
                    Du har {todaysMeetings.length} {todaysMeetings.length === 1 ? 'möte' : 'möten'} idag
                  </h3>
                  <div className="text-sm text-orange-800 mt-1">
                    {todaysMeetings.map((meeting, idx) => (
                      <span key={meeting.id}>
                        {formatTime(meeting.time)} - {meeting.name}
                        {meeting.dogName && ` (${meeting.dogName})`}
                        {meeting.location === 'malmo' ? ' - Malmö' : ' - Staffanstorp'}
                        {idx < todaysMeetings.length - 1 ? ' • ' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setCurrentView('meetings')}
                className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors font-medium flex items-center gap-2"
              >
                Visa alla möten
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-3 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                aria-label="Toggle menu"
              >
                <FaBars className="text-xl" />
              </button>
              
              {currentView !== 'dashboard' && (
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className="text-gray-600 hover:text-gray-900 text-sm sm:text-base"
                >
                  ← Tillbaka
                </button>
              )}
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate flex-1 sm:flex-none">
                {currentView === 'dashboard' ? 'CleverDog Admin' : 
                 currentView === 'dogs' ? 'Hundar' :
                 currentView === 'contracts' ? 'Kontrakt' :
                 currentView === 'planning-malmo' ? 'Planering Malmö' :
                 currentView === 'planning-staffanstorp' ? 'Planering Staffanstorp' :
                 currentView === 'boarding-malmo' ? 'Hundpensionat Malmö' :
                 currentView === 'boarding-staffanstorp' ? 'Hundpensionat Staffanstorp' :
                 currentView === 'calendar-malmo' ? 'Kalender Malmö' :
                 currentView === 'calendar-staffanstorp' ? 'Kalender Staffanstorp' :
                 currentView === 'statistics' ? 'Statistik & Inkomst' :
                 currentView === 'settings' ? 'Inställningar' :
                 currentView === 'applications' ? 'Ansökningar' :
                 currentView === 'meetings' ? 'Möten' :
                 'Dashboard'}
              </h1>
              <div className="ml-auto sm:ml-4">
                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
                  userRole === 'admin' 
                    ? 'bg-blue-100 text-blue-800' 
                    : userRole === 'platschef'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {userRole === 'admin' ? 'Admin' : userRole === 'platschef' ? 'Platschef' : 'Anställd'}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center bg-red-500 text-white py-2 px-3 sm:px-4 rounded-md hover:bg-red-600 transition-colors text-sm sm:text-base w-full sm:w-auto"
            >
              <FaSignOutAlt className="mr-2" /> <span className="hidden sm:inline">Logout</span><span className="sm:hidden">Logga ut</span>
            </button>
          </div>
          
          {/* Mobile Navigation Menu */}
          {isMobileMenuOpen && (
            <div className="lg:hidden border-t border-gray-200 pt-4 mt-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setCurrentView('dogs');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`p-3 text-left rounded-lg transition-colors ${
                    currentView === 'dogs' ? 'bg-blue-100 text-blue-800' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-semibold">Hundar</div>
                  <div className="text-xs text-gray-600">{dogs.length} registrerade</div>
                </button>
                {userRole === 'admin' && (
                  <button
                    onClick={() => {
                      setCurrentView('contracts');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`p-3 text-left rounded-lg transition-colors ${
                      currentView === 'contracts' ? 'bg-green-100 text-green-800' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="font-semibold">Kontrakt</div>
                    <div className="text-xs text-gray-600">PDF-generator</div>
                  </button>
                )}
                <button
                  onClick={() => {
                    setCurrentView('planning-malmo');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`p-3 text-left rounded-lg transition-colors ${
                    currentView === 'planning-malmo' ? 'bg-purple-100 text-purple-800' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-semibold">Planering Malmö</div>
                  <div className="text-xs text-gray-600">Drag & drop</div>
                </button>
                <button
                  onClick={() => {
                    setCurrentView('planning-staffanstorp');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`p-3 text-left rounded-lg transition-colors ${
                    currentView === 'planning-staffanstorp' ? 'bg-purple-100 text-purple-800' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-semibold">Planering Staffanstorp</div>
                  <div className="text-xs text-gray-600">Drag & drop</div>
                </button>
                <button
                  onClick={() => {
                    setCurrentView('boarding-malmo');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`p-3 text-left rounded-lg transition-colors ${
                    currentView === 'boarding-malmo' ? 'bg-orange-100 text-orange-800' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-semibold">Pensionat Malmö</div>
                </button>
                <button
                  onClick={() => {
                    setCurrentView('boarding-staffanstorp');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`p-3 text-left rounded-lg transition-colors ${
                    currentView === 'boarding-staffanstorp' ? 'bg-orange-100 text-orange-800' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-semibold">Pensionat Staffanstorp</div>
                </button>
                {userRole === 'admin' && (
                  <button
                    onClick={() => {
                      setCurrentView('statistics');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`p-3 text-left rounded-lg transition-colors ${
                      currentView === 'statistics' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="font-semibold">Statistik</div>
                  </button>
                )}
                <button
                  onClick={() => {
                    setCurrentView('applications');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`p-3 text-left rounded-lg transition-colors ${
                    currentView === 'applications' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-semibold">Ansökningar</div>
                </button>
                <button
                  onClick={() => {
                    setCurrentView('meetings');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`p-3 text-left rounded-lg transition-colors ${
                    currentView === 'meetings' ? 'bg-pink-100 text-pink-800' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-semibold">Möten</div>
                </button>
                <button
                  onClick={() => {
                    setCurrentView('settings');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`p-3 text-left rounded-lg transition-colors ${
                    currentView === 'settings' ? 'bg-gray-100 text-gray-800' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-semibold">Inställningar</div>
                </button>
              </div>
            </div>
          )}
        </div>
          
        {renderContent()}
      </div>

      {/* Boarding Modal - Global, should appear in all views */}
      {isBoardingModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h3 className="text-lg sm:text-xl font-bold">{editingBoardingRecord ? 'Redigera hundpensionat' : 'Lägg till hundpensionat'}</h3>
              <button
                onClick={() => {
                  setIsBoardingModalOpen(false);
                  setBoardingDogSearch(''); // Clear search when closing
                  setIsBoardingDogDropdownOpen(false); // Close dropdown when closing modal
                }}
                className="text-gray-500 hover:text-gray-900 text-lg sm:text-xl"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="md:col-span-2 relative boarding-dog-dropdown">
                <label className="block text-sm font-medium text-gray-700 mb-1">Välj hund *</label>
                <div className="relative">
                  <div
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-primary focus-within:border-primary cursor-pointer bg-white flex items-center justify-between text-sm sm:text-base"
                    onClick={() => setIsBoardingDogDropdownOpen(!isBoardingDogDropdownOpen)}
                  >
                    <span className={`truncate ${selectedDogForBoarding ? "text-gray-900" : "text-gray-500"}`}>
                      {selectedDogForBoarding ? (
                        `${dogs.find(d => d.id === selectedDogForBoarding)?.name} - ${dogs.find(d => d.id === selectedDogForBoarding)?.owner}`
                      ) : (
                        '-- Välj hund --'
                      )}
                    </span>
                    <svg 
                      className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ml-2 ${isBoardingDogDropdownOpen ? 'transform rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  {isBoardingDogDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-hidden">
                      <div className="p-2 border-b border-gray-200">
                        <input
                          type="text"
                          placeholder="Sök på hund eller ägare namn..."
                          value={boardingDogSearch}
                          onChange={(e) => setBoardingDogSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {dogs
                          .filter(dog => {
                            const matchesLocation = dog.locations.includes((window as any).currentBoardingLocation);
                            const matchesActive = dog.isActive !== false;
                            const matchesSearch = !boardingDogSearch.trim() || 
                              dog.name.toLowerCase().includes(boardingDogSearch.toLowerCase()) ||
                              dog.owner.toLowerCase().includes(boardingDogSearch.toLowerCase());
                            return matchesLocation && matchesActive && matchesSearch;
                          })
                          .map(dog => (
                            <div
                              key={dog.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDogForBoarding(dog.id);
                                setIsBoardingDogDropdownOpen(false);
                                setBoardingDogSearch('');
                              }}
                              className={`px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm sm:text-base ${selectedDogForBoarding === dog.id ? 'bg-blue-50' : ''}`}
                            >
                              {dog.name} - {dog.owner}
                            </div>
                          ))}
                        {boardingDogSearch.trim() && dogs.filter(dog => {
                          const matchesLocation = dog.locations.includes((window as any).currentBoardingLocation);
                          const matchesActive = dog.isActive !== false;
                          const matchesSearch = dog.name.toLowerCase().includes(boardingDogSearch.toLowerCase()) ||
                            dog.owner.toLowerCase().includes(boardingDogSearch.toLowerCase());
                          return matchesLocation && matchesActive && matchesSearch;
                        }).length === 0 && (
                          <div className="px-3 py-2 text-xs sm:text-sm text-gray-500">
                            Inga hundar matchar sökningen
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Startdatum *</label>
                <input
                  type="date"
                  value={boardingForm.startDate}
                  onChange={(e) => setBoardingForm({ ...boardingForm, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slutdatum *</label>
                <input
                  type="date"
                  value={boardingForm.endDate}
                  onChange={(e) => setBoardingForm({ ...boardingForm, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base"
                />
              </div>
            </div>
            
            {/* Expected Cost Calculation */}
            {boardingForm.startDate && boardingForm.endDate && (window as any).currentBoardingLocation && (
              <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="text-xs sm:text-sm font-semibold text-gray-800 mb-2">Förväntad kostnad</h4>
                {(() => {
                  const location = (window as any).currentBoardingLocation as 'malmo' | 'staffanstorp';
                  const cost = calculateBoardingCost(
                    boardingForm.startDate,
                    boardingForm.endDate,
                    location
                  );
                  const prices = PRICES[location];
                  
                  return (
                    <div className="space-y-1 text-xs sm:text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Vanliga dagar ({cost.regularDays} dagar):</span>
                        <span className="font-medium">{cost.regularDays} × {prices.boarding} kr = {cost.regularCost.toLocaleString('sv-SE')} kr</span>
                      </div>
                      {cost.redDays > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>Röda dagar ({cost.redDays} dagar):</span>
                          <span className="font-medium">{cost.redDays} × {prices.boardingHoliday} kr = {cost.redDaysCost.toLocaleString('sv-SE')} kr</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-blue-200">
                        <span className="font-semibold text-gray-800">Totalt:</span>
                        <span className="font-bold text-base sm:text-lg text-blue-600">{cost.total.toLocaleString('sv-SE')} kr</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
            
            <div className="mt-3 sm:mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Anteckningar</label>
              <textarea
                value={boardingForm.notes}
                onChange={(e) => setBoardingForm({ ...boardingForm, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base"
                rows={3}
                placeholder="Extra information om pensionatet..."
              />
            </div>
            
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-2 mt-4 sm:mt-6">
              <button
                onClick={() => {
                  setIsBoardingModalOpen(false);
                  setBoardingDogSearch('');
                  setIsBoardingDogDropdownOpen(false);
                }}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm sm:text-base"
              >
                Avbryt
              </button>
              <button
                onClick={() => saveBoardingRecord((window as any).currentBoardingLocation)}
                className="w-full sm:w-auto px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark text-sm sm:text-base"
              >
                {editingBoardingRecord ? 'Uppdatera' : 'Spara'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dog Modal - Global, should appear in all views */}
      {isDogModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
              <h3 className="text-lg sm:text-xl font-bold">
                {(userRole === 'employee') ? 'Visa hundinformation' : (editingDog ? 'Redigera hund' : 'Lägg till hund')}
              </h3>
              <button
                onClick={() => setIsDogModalOpen(false)}
                className="text-gray-500 hover:text-gray-900 text-lg sm:text-xl"
              >
                ✕
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-4 sm:p-6">
              {userRole === 'employee' && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-xs sm:text-sm text-yellow-800">
                    Du har endast läsbehörighet. Du kan inte redigera eller lägga till hundar.
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hundens namn *</label>
                <input
                  type="text"
                  value={dogForm.name}
                  onChange={(e) => setDogForm({ ...dogForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Morris"
                  disabled={userRole === 'employee'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ras</label>
                <input
                  type="text"
                  value={dogForm.breed}
                  onChange={(e) => setDogForm({ ...dogForm, breed: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Labradoodle"
                  disabled={userRole === 'employee'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ålder</label>
                <input
                  type="text"
                  value={dogForm.age}
                  onChange={(e) => setDogForm({ ...dogForm, age: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., 3"
                  disabled={userRole === 'employee'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ägare *</label>
                <input
                  type="text"
                  value={dogForm.owner}
                  onChange={(e) => setDogForm({ ...dogForm, owner: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Tina Eriksson"
                  disabled={userRole === 'employee'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefonnummer</label>
                <input
                  type="text"
                  value={dogForm.phone}
                  onChange={(e) => setDogForm({ ...dogForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., 070-123 45 67"
                  disabled={userRole === 'employee'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-post</label>
                <input
                  type="email"
                  value={dogForm.email}
                  onChange={(e) => setDogForm({ ...dogForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., agare@example.com"
                  disabled={userRole === 'employee'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chipnummer</label>
                <input
                  type="text"
                  value={dogForm.chipNumber}
                  onChange={(e) => setDogForm({ ...dogForm, chipNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., 941000016851106"
                  disabled={userRole === 'employee'}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Platser *</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={dogForm.locations.includes('staffanstorp')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          if (!dogForm.locations.includes('staffanstorp')) {
                            setDogForm({ ...dogForm, locations: [...dogForm.locations, 'staffanstorp'] });
                          }
                        } else {
                          setDogForm({ ...dogForm, locations: dogForm.locations.filter(l => l !== 'staffanstorp') });
                        }
                      }}
                      className="mr-2"
                      disabled={userRole === 'employee'}
                    />
                    Staffanstorp
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={dogForm.locations.includes('malmo')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          if (!dogForm.locations.includes('malmo')) {
                            setDogForm({ ...dogForm, locations: [...dogForm.locations, 'malmo'] });
                          }
                        } else {
                          setDogForm({ ...dogForm, locations: dogForm.locations.filter(l => l !== 'malmo') });
                        }
                      }}
                      className="mr-2"
                      disabled={userRole === 'employee'}
                    />
                    Malmö
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
                <select
                  value={dogForm.type}
                  onChange={(e) => setDogForm({ ...dogForm, type: e.target.value as 'fulltime' | 'parttime-3' | 'parttime-2' | 'singleDay' | 'boarding' | '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={userRole === 'employee'}
                >
                  <option value="">Välj typ</option>
                  <option value="fulltime">Heltid</option>
                  <option value="parttime-3">Deltid 3 dagar</option>
                  <option value="parttime-2">Deltid 2 dagar</option>
                  <option value="singleDay">Enstaka dag</option>
                  <option value="boarding">Hundpensionat</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dogForm.isActive}
                    onChange={(e) => setDogForm({ ...dogForm, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                    disabled={userRole === 'employee'}
                  />
                  <span className="text-sm text-gray-700">
                    Aktiv hund
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Inaktiva hundar visas inte i planering och listor, men kan användas i statistik.
                </p>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Anteckningar</label>
              <textarea
                value={dogForm.notes}
                onChange={(e) => setDogForm({ ...dogForm, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="Extra information om hunden..."
                disabled={userRole === 'employee'}
              />
            </div>
            
            {/* Contract Information Section */}
            <div className="mt-6 border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Kontraktinformation</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ägares adress</label>
                  <input
                    type="text"
                    value={dogForm.ownerAddress}
                    onChange={(e) => setDogForm({ ...dogForm, ownerAddress: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., Storgatan 123"
                    disabled={userRole === 'employee'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ägares stad</label>
                  <input
                    type="text"
                    value={dogForm.ownerCity}
                    onChange={(e) => setDogForm({ ...dogForm, ownerCity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., Malmö"
                    disabled={userRole === 'employee'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ägares personnummer</label>
                  <input
                    type="text"
                    value={dogForm.ownerPersonalNumber}
                    onChange={(e) => setDogForm({ ...dogForm, ownerPersonalNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., 199001011234"
                    disabled={userRole === 'employee'}
                  />
                </div>
              </div>
            </div>
            </div>
            
            <div className="flex justify-end gap-2 p-6 border-t border-gray-200">
              <button
                onClick={() => setIsDogModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                {userRole === 'employee' ? 'Stäng' : 'Avbryt'}
              </button>
              {userRole === 'admin' && (
                <button
                  onClick={saveDog}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                >
                  Spara
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Copy Planning Modal */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Kopiera planering</h3>
              <button
                onClick={() => setIsCopyModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Välj vilken planering du vill kopiera från:
                </p>
                
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      const prevDate = new Date(currentPlanningDate);
                      prevDate.setDate(prevDate.getDate() - 1);
                      const sourceDate = prevDate.toISOString().split('T')[0];
                      const currentLocation = currentView === 'planning-malmo' ? 'malmo' : 'staffanstorp';
                      copyPlanningFromDate(sourceDate, currentLocation, copyIncludeBoarding);
                    }}
                    className="w-full px-4 py-3 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors text-left"
                  >
                    <div className="font-semibold">Från dagen innan</div>
                    <div className="text-sm text-gray-600">
                      {(() => {
                        const prevDate = new Date(currentPlanningDate);
                        prevDate.setDate(prevDate.getDate() - 1);
                        return prevDate.toLocaleDateString('sv-SE');
                      })()}
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      const prevWeekDate = new Date(currentPlanningDate);
                      prevWeekDate.setDate(prevWeekDate.getDate() - 7);
                      const sourceDate = prevWeekDate.toISOString().split('T')[0];
                      const currentLocation = currentView === 'planning-malmo' ? 'malmo' : 'staffanstorp';
                      copyPlanningFromDate(sourceDate, currentLocation, copyIncludeBoarding);
                    }}
                    className="w-full px-4 py-3 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors text-left"
                  >
                    <div className="font-semibold">Från samma veckodag förra veckan</div>
                    <div className="text-sm text-gray-600">
                      {(() => {
                        const prevWeekDate = new Date(currentPlanningDate);
                        prevWeekDate.setDate(prevWeekDate.getDate() - 7);
                        return prevWeekDate.toLocaleDateString('sv-SE');
                      })()}
                    </div>
                  </button>
                  
                  <div className="px-4 py-3 bg-purple-50 border-2 border-purple-200 rounded-lg">
                    <div className="font-semibold text-purple-800 mb-2">Från valt datum</div>
                    <input
                      type="date"
                      value={customCopyDate}
                      onChange={(e) => setCustomCopyDate(e.target.value)}
                      className="w-full px-3 py-2 border border-purple-300 rounded-md text-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      max={new Date().toISOString().split('T')[0]}
                    />
                    <button
                      onClick={() => {
                        if (!customCopyDate) {
                          alert('Välj ett datum att kopiera från');
                          return;
                        }
                        const currentLocation = currentView === 'planning-malmo' ? 'malmo' : 'staffanstorp';
                        copyPlanningFromDate(customCopyDate, currentLocation, copyIncludeBoarding);
                      }}
                      disabled={!customCopyDate}
                      className="w-full mt-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Kopiera från detta datum
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={copyIncludeBoarding}
                    onChange={(e) => setCopyIncludeBoarding(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    Inkludera hundpensionat planeringar
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-2 ml-6">
                  Om avmarkerat kopieras endast vanlig planering, inga hundpensionat-hundar kopieras.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setIsCopyModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage; 