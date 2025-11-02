import React, { useState, useEffect } from 'react';
import { FaSignOutAlt, FaFilePdf, FaLock, FaCalendarAlt, FaDog, FaPlus, FaEdit, FaTrash, FaInfoCircle, FaChartBar, FaFilter, FaCopy } from 'react-icons/fa';
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
  type BoxSettings
} from '../lib/database';
import { PRICES, VAT_RATE } from '../lib/prices';

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
  notes?: string;
  color: string; // For visual distinction
  locations: ('malmo' | 'staffanstorp')[]; // Which daycares the dog belongs to (can be both)
  type?: 'fulltime' | 'parttime-3' | 'parttime-2' | 'singleDay' | 'boarding';
  isActive?: boolean; // Whether the dog is active (default: true)
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

type AdminView = 'dashboard' | 'contracts' | 'planning-malmo' | 'planning-staffanstorp' | 'dogs' | 'boarding-malmo' | 'boarding-staffanstorp' | 'calendar-malmo' | 'calendar-staffanstorp' | 'statistics' | 'settings';

const AdminPage: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
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
    notes: '',
    locations: ['staffanstorp'] as ('malmo' | 'staffanstorp')[],
    type: '' as 'fulltime' | 'parttime-3' | 'parttime-2' | 'singleDay' | 'boarding' | '',
    isActive: true
  });
  const [planningStaffanstorp, setPlanningStaffanstorp] = useState<Cage[]>([]);
  const [planningMalmo, setPlanningMalmo] = useState<Cage[]>([]);
  const [planningHistory, setPlanningHistory] = useState<PlanningData[]>([]);
  const [currentPlanningDate, setCurrentPlanningDate] = useState<string>(new Date().toISOString().split('T')[0]);
  // Search state for dog categories in planning view (location_category)
  const [planningSearch, setPlanningSearch] = useState<Record<string, string>>({});
  const [statisticsFilter, setStatisticsFilter] = useState<StatisticsFilter>({
    location: 'all',
    period: 'all',
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
  }, [currentView]);
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
    const loadPlanningForDate = async () => {
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
  }, [currentPlanningDate, boxSettings]);
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

  // Check if user is already logged in from JWT token in localStorage
  useEffect(() => {
    // Temporary: Auto-login for local development
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.hostname.includes('localhost');
    
    if (isDevelopment) {
      setIsLoggedIn(true);
      return;
    }
    
    const checkAuthToken = async () => {
      const token = localStorage.getItem('adminAuthToken');
      if (!token) return;
      
      try {
        const response = await fetch('/.netlify/functions/verify-token', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        if (data.success) {
          setIsLoggedIn(true);
        } else {
          // Token is invalid or expired, clean up localStorage
          localStorage.removeItem('adminAuthToken');
        }
      } catch (err) {
        console.error('Error verifying token:', err);
        localStorage.removeItem('adminAuthToken');
      }
    };
    
    checkAuthToken();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    // Temporary: Auto-login for local development
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.hostname.includes('localhost');
    if (isDevelopment) {
      setIsLoggedIn(true);
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await fetch('/.netlify/functions/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('adminAuthToken', data.token);
        setIsLoggedIn(true);
      } else {
        setError(data.error || 'Invalid username or password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('adminAuthToken');
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

    const colors = ['bg-blue-100 text-blue-800', 'bg-green-100 text-green-800', 'bg-purple-100 text-purple-800', 
                    'bg-pink-100 text-pink-800', 'bg-orange-100 text-orange-800', 'bg-yellow-100 text-yellow-800'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newDog: Dog = {
      id: editingDog?.id || `${Date.now()}`,
      name: dogForm.name,
      breed: dogForm.breed,
      age: dogForm.age,
      owner: dogForm.owner,
      phone: dogForm.phone,
      notes: dogForm.notes,
      color: editingDog?.color || randomColor,
      locations: dogForm.locations,
      // Only set type if it's not empty string
      type: (dogForm.type && dogForm.type.trim() !== '') 
        ? (dogForm.type as 'fulltime' | 'parttime-3' | 'parttime-2' | 'singleDay' | 'boarding')
        : undefined,
      isActive: dogForm.isActive
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
    setDogForm({ name: '', breed: '', age: '', owner: '', phone: '', notes: '', locations: ['staffanstorp'], type: '', isActive: true });
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
        notes: dog.notes || '',
        locations: dog.locations,
        type: dog.type || '',
        isActive: dog.isActive !== undefined ? dog.isActive : true
      });
    } else {
      setEditingDog(null);
      setDogForm({ name: '', breed: '', age: '', owner: '', phone: '', notes: '', locations: ['staffanstorp'], type: '', isActive: true });
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
    }
    setIsBoardingModalOpen(true);
    // Store the location for use in saveBoardingRecord
    (window as any).currentBoardingLocation = location;
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

  // Calculate single day income from planning history - counts actual planned days per singleDay dog
  const calculateSingleDayIncome = (location: 'malmo' | 'staffanstorp', filter: StatisticsFilter, validDogsList: Dog[]): number => {
    if (!statisticsFilter.includeSingleDays) return 0;
    
    // Get all dogs with type 'singleDay'
    const singleDayDogs = validDogsList.filter((dog: Dog) => dog.type === 'singleDay');
    if (singleDayDogs.length === 0) return 0;
    
    let filteredPlanning = planningHistory.filter(p => p.location === location);
    
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
    }
    
    // Count how many times each singleDay dog was planned in this location during the period
    let totalSingleDayDays = 0;
    singleDayDogs.forEach((dog: Dog) => {
      filteredPlanning.forEach(plan => {
        // Check if this dog was planned on this date
        const wasPlanned = plan.cages && plan.cages.some(cage => 
          cage.dogs && Array.isArray(cage.dogs) && cage.dogs.includes(dog.id)
        );
        if (wasPlanned) {
          totalSingleDayDays++;
        }
      });
    });
    
    return totalSingleDayDays * PRICES[location].singleDay;
  };

  // Calculate boarding income with proper day count
  const calculateBoardingIncomeDetailed = (location: 'malmo' | 'staffanstorp', filter: StatisticsFilter): number => {
    if (!statisticsFilter.includeBoarding) return 0;
    
    const prices = PRICES[location];
    let filteredRecords = boardingRecords.filter(record => 
      record.location === location && !record.isArchived
    );
    
    // Filter by period
    if (filter.period === 'year' && filter.year) {
      filteredRecords = filteredRecords.filter(record => {
        const recordYear = new Date(record.startDate).getFullYear();
        return recordYear === filter.year;
      });
    } else if (filter.period === 'month' && filter.year && filter.month) {
      filteredRecords = filteredRecords.filter(record => {
        const startDate = new Date(record.startDate);
        const endDate = new Date(record.endDate);
        const filterStart = new Date(filter.year!, filter.month! - 1, 1);
        const filterEnd = new Date(filter.year!, filter.month!, 0);
        
        // Check if boarding period overlaps with filter month
        return startDate <= filterEnd && endDate >= filterStart;
      });
    }
    
    // Calculate total days and income
    let totalDays = 0;
    filteredRecords.forEach(record => {
      const startDate = new Date(record.startDate);
      const endDate = new Date(record.endDate);
      
      if (filter.period === 'month' && filter.year && filter.month) {
        // Calculate days within the filtered month
        const filterStart = new Date(filter.year, filter.month - 1, 1);
        const filterEnd = new Date(filter.year, filter.month, 0);
        
        const actualStart = startDate > filterStart ? startDate : filterStart;
        const actualEnd = endDate < filterEnd ? endDate : filterEnd;
        
        if (actualStart <= actualEnd) {
          const daysDiff = Math.ceil((actualEnd.getTime() - actualStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          totalDays += daysDiff;
        }
      } else {
        // For year or all: count all days in boarding period
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
    
    // Calculate daycare income (monthly subscriptions)
    // For dogs with both locations, only count to the last planned location
    const malmoDaycareIncome = malmoDogs.reduce((sum, dog) => {
      const income = calculateDogIncome(dog, 'malmo', true);
      return sum + income;
    }, 0);
    const staffanstorpDaycareIncome = staffanstorpDogs.reduce((sum, dog) => {
      const income = calculateDogIncome(dog, 'staffanstorp', true);
      return sum + income;
    }, 0);
    
    // Calculate boarding income
    const boardingMalmoIncome = calculateBoardingIncomeDetailed('malmo', statisticsFilter);
    const boardingStaffanstorpIncome = calculateBoardingIncomeDetailed('staffanstorp', statisticsFilter);
    
    // Calculate single day income from planning history
    const singleDayMalmoIncome = calculateSingleDayIncome('malmo', statisticsFilter, validDogs);
    const singleDayStaffanstorpIncome = calculateSingleDayIncome('staffanstorp', statisticsFilter, validDogs);
    
    // Total income calculations
    const totalDaycareIncome = malmoDaycareIncome + staffanstorpDaycareIncome;
    const totalBoardingIncome = boardingMalmoIncome + boardingStaffanstorpIncome;
    const totalSingleDayIncome = singleDayMalmoIncome + singleDayStaffanstorpIncome;
    const totalIncomeWithoutVAT = totalDaycareIncome + totalBoardingIncome + totalSingleDayIncome;
    const totalIncomeWithVAT = totalIncomeWithoutVAT * (1 + VAT_RATE);
    
    // Income by type (monthly subscriptions)
    const incomeByType = {
      fulltime: filteredDogs
        .filter(dog => dog && dog.type === 'fulltime' && dog.locations && Array.isArray(dog.locations))
        .reduce((sum, dog) => {
          // Use the same logic as calculateDogIncome for both locations
          const malmoIncome = calculateDogIncome(dog, 'malmo', true);
          const staffanstorpIncome = calculateDogIncome(dog, 'staffanstorp', true);
          return sum + malmoIncome + staffanstorpIncome;
        }, 0),
      parttime3: filteredDogs
        .filter(dog => dog && dog.type === 'parttime-3' && dog.locations && Array.isArray(dog.locations))
        .reduce((sum, dog) => {
          // Use the same logic as calculateDogIncome for both locations
          const malmoIncome = calculateDogIncome(dog, 'malmo', true);
          const staffanstorpIncome = calculateDogIncome(dog, 'staffanstorp', true);
          return sum + malmoIncome + staffanstorpIncome;
        }, 0),
      parttime2: filteredDogs
        .filter(dog => dog && dog.type === 'parttime-2' && dog.locations && Array.isArray(dog.locations))
        .reduce((sum, dog) => {
          // Use the same logic as calculateDogIncome for both locations
          const malmoIncome = calculateDogIncome(dog, 'malmo', true);
          const staffanstorpIncome = calculateDogIncome(dog, 'staffanstorp', true);
          return sum + malmoIncome + staffanstorpIncome;
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
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Admin Login</h2>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                required
                disabled={isLoading}
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-colors"
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Välkommen till CleverDog Admin</h2>
        <p className="text-gray-600">Hantera hundar, planering och pensionat</p>
      </div>

      {/* Main Categories */}
      <div className="space-y-8">
        {/* Hundar & Kontrakt */}
        <div>
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <FaDog className="mr-2 text-blue-600" />
            Hundar & Kontrakt
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              onClick={() => setCurrentView('dogs')}
              className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all duration-200 border-2 border-transparent hover:border-blue-200 hover:scale-105"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4 mx-auto">
                <FaDog className="text-blue-600 text-2xl" />
              </div>
              <h4 className="text-lg font-bold text-center text-gray-900 mb-2">Hundar</h4>
              <p className="text-center text-gray-600 text-sm">Hantera hundregister och information</p>
              <div className="mt-3 text-center">
                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {dogs.length} hundar registrerade
                </span>
              </div>
            </div>

            <div 
              onClick={() => setCurrentView('contracts')}
              className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all duration-200 border-2 border-transparent hover:border-green-200 hover:scale-105"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4 mx-auto">
                <FaFilePdf className="text-green-600 text-2xl" />
              </div>
              <h4 className="text-lg font-bold text-center text-gray-900 mb-2">Kontrakt</h4>
              <p className="text-center text-gray-600 text-sm">Skapa och hantera dagiskontrakt</p>
              <div className="mt-3 text-center">
                <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  PDF-generator
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dagisplanering */}
        <div>
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <FaCalendarAlt className="mr-2 text-purple-600" />
            Dagisplanering
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              onClick={() => setCurrentView('planning-malmo')}
              className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all duration-200 border-2 border-transparent hover:border-purple-200 hover:scale-105"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4 mx-auto">
                <FaCalendarAlt className="text-purple-600 text-2xl" />
              </div>
              <h4 className="text-lg font-bold text-center text-gray-900 mb-2">Planering Malmö</h4>
              <p className="text-center text-gray-600 text-sm">Drag & drop planering för Malmö</p>
              <div className="mt-3 text-center">
                <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                  Live planering
                </span>
              </div>
            </div>

            <div 
              onClick={() => setCurrentView('planning-staffanstorp')}
              className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all duration-200 border-2 border-transparent hover:border-purple-200 hover:scale-105"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4 mx-auto">
                <FaCalendarAlt className="text-purple-600 text-2xl" />
              </div>
              <h4 className="text-lg font-bold text-center text-gray-900 mb-2">Planering Staffanstorp</h4>
              <p className="text-center text-gray-600 text-sm">Drag & drop planering för Staffanstorp</p>
              <div className="mt-3 text-center">
                <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                  Live planering
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Kalender & Historik */}
        <div>
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <FaCalendarAlt className="mr-2 text-indigo-600" />
            Kalender & Historik
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              onClick={() => setCurrentView('calendar-malmo')}
              className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all duration-200 border-2 border-transparent hover:border-indigo-200 hover:scale-105"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4 mx-auto">
                <FaCalendarAlt className="text-indigo-600 text-2xl" />
              </div>
              <h4 className="text-lg font-bold text-center text-gray-900 mb-2">Kalender Malmö</h4>
              <p className="text-center text-gray-600 text-sm">Planeringshistorik och kalendervy</p>
              <div className="mt-3 text-center">
                <span className="inline-block bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">
                  Veckovy
                </span>
              </div>
            </div>

            <div 
              onClick={() => setCurrentView('calendar-staffanstorp')}
              className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all duration-200 border-2 border-transparent hover:border-indigo-200 hover:scale-105"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4 mx-auto">
                <FaCalendarAlt className="text-indigo-600 text-2xl" />
              </div>
              <h4 className="text-lg font-bold text-center text-gray-900 mb-2">Kalender Staffanstorp</h4>
              <p className="text-center text-gray-600 text-sm">Planeringshistorik och kalendervy</p>
              <div className="mt-3 text-center">
                <span className="inline-block bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">
                  Veckovy
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Hundpensionat */}
        <div>
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <FaDog className="mr-2 text-red-600" />
            Hundpensionat
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              onClick={() => setCurrentView('boarding-malmo')}
              className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all duration-200 border-2 border-transparent hover:border-red-200 hover:scale-105"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4 mx-auto">
                <FaDog className="text-red-600 text-2xl" />
              </div>
              <h4 className="text-lg font-bold text-center text-gray-900 mb-2">Pensionat Malmö</h4>
              <p className="text-center text-gray-600 text-sm">Hundpensionat registreringar</p>
              <div className="mt-3 text-center">
                <span className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                  {boardingRecords.filter(r => r.location === 'malmo').length} registreringar
                </span>
              </div>
            </div>

            <div 
              onClick={() => setCurrentView('boarding-staffanstorp')}
              className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all duration-200 border-2 border-transparent hover:border-red-200 hover:scale-105"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4 mx-auto">
                <FaDog className="text-red-600 text-2xl" />
              </div>
              <h4 className="text-lg font-bold text-center text-gray-900 mb-2">Pensionat Staffanstorp</h4>
              <p className="text-center text-gray-600 text-sm">Hundpensionat registreringar</p>
              <div className="mt-3 text-center">
                <span className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                  {boardingRecords.filter(r => r.location === 'staffanstorp').length} registreringar
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Statistik & Analys */}
        <div>
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <FaChartBar className="mr-2 text-emerald-600" />
            Statistik & Analys
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              onClick={() => setCurrentView('statistics')}
              className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all duration-200 border-2 border-transparent hover:border-emerald-200 hover:scale-105"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4 mx-auto">
                <FaChartBar className="text-emerald-600 text-2xl" />
              </div>
              <h4 className="text-lg font-bold text-center text-gray-900 mb-2">Statistik & Inkomst</h4>
              <p className="text-center text-gray-600 text-sm">Detaljerad statistik och inkomstanalys</p>
              <div className="mt-3 text-center">
                <span className="inline-block bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full">
                  Filtrerbar statistik
                </span>
              </div>
            </div>

            <div 
              onClick={() => setCurrentView('settings')}
              className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all duration-200 border-2 border-transparent hover:border-gray-200 hover:scale-105"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4 mx-auto">
                <FaEdit className="text-gray-600 text-2xl" />
              </div>
              <h4 className="text-lg font-bold text-center text-gray-900 mb-2">Inställningar</h4>
              <p className="text-center text-gray-600 text-sm">Hantera boxar och burar</p>
              <div className="mt-3 text-center">
                <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                  Box-konfiguration
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Snabbstatistik</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{dogs.length}</div>
            <div className="text-sm text-gray-600">Registrerade hundar</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {planningHistory.filter(p => p.location === 'malmo').length + planningHistory.filter(p => p.location === 'staffanstorp').length}
            </div>
            <div className="text-sm text-gray-600">Planerade dagar</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{boardingRecords.length}</div>
            <div className="text-sm text-gray-600">Pensionatsregistreringar</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {dogs.filter(d => d.locations.includes('malmo') && d.locations.includes('staffanstorp')).length}
            </div>
            <div className="text-sm text-gray-600">Hundar på båda dagisen</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContracts = () => (
    <div className="space-y-6">
          <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Kontrakt</h2>
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
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
        >
          Nytt kontrakt
            </button>
          </div>
          
      {contracts.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Befintliga kontrakt</h3>
          <div className="space-y-2">
            {contracts.map((contract, index) => (
              <div key={index} className="flex justify-between items-center p-3 border-b">
                <div>
                  <p className="font-semibold">{contract.customerName} - {contract.dogName}</p>
                  <p className="text-sm text-gray-600">{contract.contractType} | {contract.startDate} - {contract.endDate}</p>
                </div>
                <button className="text-primary hover:text-primary-dark">Visa</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Skapa nytt kontrakt</h3>
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
    
    // Hide category if no dogs and no active search
    if (dogs.length === 0 && !searchQuery.trim()) return null;

    return (
      <div className={`bg-gradient-to-br ${bgColor} rounded-xl shadow-lg p-5 border-2 ${borderColor}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">{icon}</span>
            <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          </div>
          <span className={`${badgeColor} text-sm font-semibold px-3 py-1 rounded-full`}>
            {filteredDogs.length}
          </span>
        </div>
        
        {/* Search input */}
        <div className="mb-4">
          <input
            type="text"
            placeholder={`Sök ${title.toLowerCase()}...`}
            value={getSearchValue(searchKey.split('_')[0], searchKey.split('_')[1])}
            onChange={(e) => setSearchValue(searchKey.split('_')[0], searchKey.split('_')[1], e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Dogs list */}
        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
          {filteredDogs.map(dog => (
            <div
              key={dog.id}
              draggable
              onDragStart={(e) => handleDragStart(e, dog)}
              onDragEnd={handleDragEnd}
              className={`p-4 rounded-xl cursor-move hover:shadow-lg transition-all duration-200 ${dog.color} relative group border-2 border-transparent hover:border-primary`}
              title="Dra för att flytta"
            >
              <button
                onClick={(e) => handleInfoClick(e, dog)}
                onMouseDown={(e) => e.stopPropagation()}
                onDragStart={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                className="absolute top-3 right-3 text-gray-500 hover:text-primary z-30 transition-colors"
                title="Visa info"
              >
                <FaInfoCircle className="text-lg" />
              </button>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🐕</span>
                <div className="font-bold text-base">{dog.name}</div>
              </div>
              <div className="text-xs text-gray-600 mb-2">👤 {dog.owner}</div>
              <div className="flex gap-1 mt-1">
                {dog.locations.map(loc => (
                  <span key={loc} className={`text-xs px-2 py-1 rounded ${loc === 'malmo' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'}`}>
                    {loc === 'malmo' ? '📍 Malmö' : '📍 Staffanstorp'}
                  </span>
                ))}
              </div>
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
      <div className="space-y-6">
        {/* Date Selector and Reset Button */}
        <div className="bg-white rounded-xl shadow-md p-4 border border-gray-200">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-gray-700">Datum:</label>
                <input
                  type="date"
                  value={currentPlanningDate}
                  onChange={(e) => setCurrentPlanningDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              {/* Date Navigation */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateWeek('prev')}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  title="Föregående vecka"
                >
                  ← Vecka
                </button>
                <button
                  onClick={() => navigateDate(-1)}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  title="Föregående dag"
                >
                  ←
                </button>
                <button
                  onClick={() => setCurrentPlanningDate(new Date().toISOString().split('T')[0])}
                  className={`px-3 py-2 rounded-lg transition-colors ${isToday ? 'bg-primary text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                  title="Gå till idag"
                >
                  Idag
                </button>
                <button
                  onClick={() => navigateDate(1)}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  title="Nästa dag"
                >
                  →
                </button>
                <button
                  onClick={() => navigateWeek('next')}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  title="Nästa vecka"
                >
                  Vecka →
                </button>
              </div>

              {/* Date Display */}
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-primary">
                  {formatDateDisplay(currentPlanningDate)}
                </span>
                {isToday && (
                  <span className="px-2 py-1 bg-primary text-white text-xs font-semibold rounded-full">
                    Idag
                  </span>
                )}
              </div>

              {/* Planned Dogs Counter */}
              <div className="flex items-center gap-2 bg-blue-50 border-2 border-blue-300 rounded-lg px-4 py-2">
                <span className="text-sm font-semibold text-gray-700">Inplanerade hundar:</span>
                <span className="text-xl font-bold text-blue-700">{plannedDogsCount}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCopyModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
              >
                <FaCopy className="text-sm" />
                Kopiera planering
              </button>
              <button
                onClick={() => resetCages(location)}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm"
              >
                <FaTrash className="text-sm" />
                Återställ burar
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Dogs Lists - Categorized */}
          <div className="lg:col-span-1 space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
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
            {boardingDogs.length > 0 && (
              <div className={`bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-lg p-5 border-2 border-orange-300`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🏨</span>
                    <h3 className="text-lg font-bold text-gray-800">Hundpensionat</h3>
                  </div>
                  <span className="bg-orange-500 text-white text-sm font-semibold px-3 py-1 rounded-full">
                    {filterBySearch(boardingDogs, getSearchValue(location, 'boarding')).length}
                  </span>
                </div>
                
                {/* Search input */}
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Sök hundpensionat..."
                    value={getSearchValue(location, 'boarding')}
                    onChange={(e) => setSearchValue(location, 'boarding', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                {/* Dogs list */}
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                  {filterBySearch(boardingDogs, getSearchValue(location, 'boarding')).map(dog => {
                    const boardingRecord = boardingRecords.find(r => r.dogId === dog.id && r.location === location);
                    return (
                      <div
                        key={dog.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, dog)}
                        onDragEnd={handleDragEnd}
                        className={`p-4 rounded-xl cursor-move hover:shadow-lg transition-all duration-200 ${dog.color} relative group border-2 border-orange-400 hover:border-orange-500`}
                        title="Dra för att flytta"
                      >
                        <button
                          onClick={(e) => handleInfoClick(e, dog)}
                          onMouseDown={(e) => e.stopPropagation()}
                          onDragStart={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                          }}
                          className="absolute top-3 right-3 text-gray-500 hover:text-primary z-30 transition-colors"
                          title="Visa info"
                        >
                          <FaInfoCircle className="text-lg" />
                        </button>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">🏨</span>
                          <div className="font-bold text-base">{dog.name}</div>
                        </div>
                        <div className="text-xs text-gray-600 mb-2">👤 {dog.owner}</div>
                        {boardingRecord && (
                          <div className="text-xs text-orange-700 mb-2 font-semibold">
                            Pensionat: {new Date(boardingRecord.startDate).toLocaleDateString('sv-SE')} - {new Date(boardingRecord.endDate).toLocaleDateString('sv-SE')}
                          </div>
                        )}
                        <div className="flex gap-1 mt-1">
                          {dog.locations.map(loc => (
                            <span key={loc} className={`text-xs px-2 py-1 rounded ${loc === 'malmo' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'}`}>
                              {loc === 'malmo' ? '📍 Malmö' : '📍 Staffanstorp'}
                            </span>
                          ))}
                        </div>
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

          {/* Cages and Free Areas */}
          <div className="lg:col-span-2">
            <h3 className="text-xl font-bold text-gray-800 mb-5">Burar och ytor</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                            className={`p-2.5 rounded-lg ${dog.color} relative cursor-move hover:shadow-lg transition-all duration-200 border-2 border-transparent hover:border-primary/30 group`}
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
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Planering Malmö</h2>
        {renderPlanning(planningMalmo, 'malmo')}
      </div>
    </div>
  );

  const renderPlanningStaffanstorp = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Planering Staffanstorp</h2>
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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">
            Hundpensionat {location === 'malmo' ? 'Malmö' : 'Staffanstorp'} ({filteredRecords.length})
          </h2>
          <button
            onClick={() => openBoardingModal(location)}
            className="flex items-center bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
          >
            <FaPlus className="mr-2" /> Lägg till pensionat
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Visa:</label>
              <select
                value={boardingFilter}
                onChange={(e) => setBoardingFilter(e.target.value as 'all' | 'current' | 'archived' | 'future' | 'ongoing')}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">Alla</option>
                <option value="future">Framtida</option>
                <option value="ongoing">Pågående</option>
                <option value="archived">Arkiverade</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">År:</label>
              <select
                value={boardingYearFilter}
                onChange={(e) => setBoardingYearFilter(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
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
          <div className="space-y-8">
            {/* Ongoing Records */}
            {categorizedRecords.ongoing.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-blue-700 mb-4 border-b border-blue-200 pb-2">
                  ⏳ Pågående registreringar ({categorizedRecords.ongoing.length})
                </h3>
                {renderRecordsByMonth(categorizedRecords.ongoing, location)}
              </div>
            )}

            {/* Future Records */}
            {categorizedRecords.future.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-green-700 mb-4 border-b border-green-200 pb-2">
                  🔮 Framtida registreringar ({categorizedRecords.future.length})
                </h3>
                {renderRecordsByMonth(categorizedRecords.future, location)}
              </div>
            )}

            {/* Archived Records */}
            {categorizedRecords.archived.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-600 mb-4 border-b border-gray-200 pb-2">
                  📦 Arkiverade registreringar ({categorizedRecords.archived.length})
                </h3>
                {renderRecordsByMonth(categorizedRecords.archived, location)}
              </div>
            )}

            {categorizedRecords.future.length === 0 && categorizedRecords.ongoing.length === 0 && categorizedRecords.archived.length === 0 && (
              <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                <FaDog className="text-6xl mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 mb-4">Inga pensionatsregistreringar än</p>
                <button
                  onClick={() => openBoardingModal(location)}
                  className="flex items-center bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors mx-auto"
                >
                  <FaPlus className="mr-2" /> Lägg till första registreringen
                </button>
              </div>
            )}
          </div>
        ) : (
          // Show filtered view for specific categories
          filteredRecords.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <FaDog className="text-6xl mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 mb-4">
                {boardingFilter === 'archived' ? 'Inga arkiverade registreringar' : 
                 boardingFilter === 'future' ? 'Inga framtida registreringar' :
                 boardingFilter === 'ongoing' ? 'Inga pågående registreringar' : 
                 'Inga pensionatsregistreringar än'}
              </p>
              {boardingFilter !== 'archived' && (
                <button
                  onClick={() => openBoardingModal(location)}
                  className="flex items-center bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors mx-auto"
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
      <div className="space-y-6">
        {sortedMonths.map(monthKey => (
          <div key={monthKey} className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-md font-semibold text-gray-800 mb-3">
              {getMonthName(monthKey)} {boardingYearFilter}
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({recordsByMonth[monthKey].length} registreringar)
              </span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recordsByMonth[monthKey].map((record) => {
                const dog = dogs.find(d => d.id === record.dogId);
                const isPast = new Date(record.endDate) < new Date();
                const isFuture = new Date(record.startDate) > new Date();
                const isOngoing = new Date(record.startDate) <= new Date() && new Date(record.endDate) >= new Date();
                
                return (
                  <div 
                    key={record.id} 
                    className={`p-4 rounded-lg border-l-4 ${
                      isPast 
                        ? 'border-gray-400 bg-gray-50' 
                        : isFuture
                        ? 'border-green-400 bg-green-50'
                        : isOngoing
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-primary bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className={`font-bold text-lg ${
                          isPast ? 'text-gray-600' : 
                          isFuture ? 'text-green-800' :
                          isOngoing ? 'text-blue-800' :
                          'text-gray-900'
                        }`}>
                          {record.dogName}
                        </div>
                        {dog && (
                          <div className={`px-2 py-1 rounded text-xs font-semibold ${dog.color} inline-block mt-1`}>
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
                      <div className="flex gap-2">
                        <button
                          onClick={() => openBoardingModal(location, record)}
                          className="text-gray-600 hover:text-blue-600"
                          title="Redigera"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => deleteBoardingRecord(record.id)}
                          className="text-gray-600 hover:text-red-600"
                          title="Ta bort"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
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
                        <p className="text-gray-600 italic">{record.notes}</p>
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
      const dayData = locationHistory.find(p => p.date === date);
      if (!dayData) return [];
      
      const allDogs = dayData.cages.flatMap(cage => cage.dogs || []);
      return allDogs.map(dogId => dogs.find(d => d.id === dogId)).filter(Boolean);
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">
            Kalender {location === 'malmo' ? 'Malmö' : 'Staffanstorp'}
          </h2>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateWeek('prev')}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              ← Föregående vecka
            </button>
            <span className="text-sm text-gray-600">
              Vecka {Math.ceil(new Date(currentPlanningDate).getDate() / 7)}
            </span>
            <button
              onClick={() => navigateWeek('next')}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Nästa vecka →
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="grid grid-cols-7 gap-4">
            {weekDates.map((date, index) => {
              const dayDogs = getDogsForDate(date);
              const isToday = date === new Date().toISOString().split('T')[0];
              const isPast = new Date(date) < new Date();
              
              return (
                <div 
                  key={date}
                  className={`border rounded-lg p-3 ${
                    isToday ? 'border-blue-500 bg-blue-50' : 
                    isPast ? 'border-gray-300 bg-gray-50' : 
                    'border-gray-200 bg-white'
                  }`}
                >
                  <div className="text-center mb-2">
                    <div className="text-sm font-medium text-gray-600">
                      {dayNames[index]}
                    </div>
                    <div className={`text-lg font-bold ${
                      isToday ? 'text-blue-700' : 
                      isPast ? 'text-gray-500' : 
                      'text-gray-900'
                    }`}>
                      {new Date(date).getDate()}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    {dayDogs.length > 0 ? (
                      dayDogs.map((dog, dogIndex) => (
                        <div 
                          key={dogIndex}
                          className={`text-xs p-1 rounded ${
                            dog?.color || 'bg-gray-200'
                          }`}
                        >
                          {dog?.name}
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-400 text-center">
                        Inga hundar
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-2 text-center">
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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Statistik & Inkomst</h2>
        </div>

        {/* Filter Controls */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FaFilter className="mr-2 text-blue-500" />
            Filtrera statistik
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
          <div className="border-t pt-4 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={statisticsFilter.includeActive}
                  onChange={(e) => setStatisticsFilter(prev => ({ ...prev, includeActive: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Aktiva hundar</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={statisticsFilter.includeInactive}
                  onChange={(e) => setStatisticsFilter(prev => ({ ...prev, includeInactive: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Inaktiva hundar</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={statisticsFilter.includeBoarding}
                  onChange={(e) => setStatisticsFilter(prev => ({ ...prev, includeBoarding: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Hundpensionat</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={statisticsFilter.includeSingleDays}
                  onChange={(e) => setStatisticsFilter(prev => ({ ...prev, includeSingleDays: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Enstaka dagar</span>
              </label>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Dogs */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center">
              <FaDog className="text-blue-500 text-2xl mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Totalt antal hundar</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalDogs}</p>
              </div>
            </div>
          </div>

          {/* Malmö Dogs */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center">
              <FaDog className="text-green-500 text-2xl mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Malmö hundar</p>
                <p className="text-2xl font-bold text-gray-900">{stats.malmoDogs}</p>
              </div>
            </div>
          </div>

          {/* Staffanstorp Dogs */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
            <div className="flex items-center">
              <FaDog className="text-orange-500 text-2xl mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Staffanstorp hundar</p>
                <p className="text-2xl font-bold text-gray-900">{stats.staffanstorpDogs}</p>
              </div>
            </div>
          </div>

          {/* Both Locations */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center">
              <FaDog className="text-purple-500 text-2xl mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Båda platser</p>
                <p className="text-2xl font-bold text-gray-900">{stats.bothLocationDogs}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Expected Income */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-md p-6 border-2 border-green-200">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <FaChartBar className="mr-2 text-green-600" />
            Förväntad inkomst
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Without VAT */}
            <div className="bg-white rounded-lg p-5 border-2 border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Exklusive moms (25%)</span>
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">Exkl. moms</span>
              </div>
              <div className="text-4xl font-bold text-gray-800 mb-1">
                {Math.round(stats.totalIncomeWithoutVAT).toLocaleString()} SEK
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Moms: {Math.round(stats.totalIncomeWithoutVAT * VAT_RATE).toLocaleString()} SEK
              </div>
            </div>

            {/* With VAT */}
            <div className="bg-white rounded-lg p-5 border-2 border-green-300">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Inklusive moms (25%)</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Inkl. moms</span>
              </div>
              <div className="text-4xl font-bold text-green-600 mb-1">
                {Math.round(stats.totalIncomeWithVAT).toLocaleString()} SEK
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Utan moms: {Math.round(stats.totalIncomeWithoutVAT).toLocaleString()} SEK
              </div>
            </div>
          </div>

          {/* Income by Location */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-gray-600 mb-1">Malmö</p>
              <p className="text-2xl font-bold text-green-700">{Math.round(stats.malmoIncome).toLocaleString()} SEK</p>
              <p className="text-xs text-gray-500 mt-1">Exkl. moms</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm text-gray-600 mb-1">Staffanstorp</p>
              <p className="text-2xl font-bold text-orange-700">{Math.round(stats.staffanstorpIncome).toLocaleString()} SEK</p>
              <p className="text-xs text-gray-500 mt-1">Exkl. moms</p>
            </div>
          </div>

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

  const renderDogs = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Hundar ({dogs.length})</h2>
        <button
          onClick={() => openDogModal()}
          className="flex items-center bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
        >
          <FaPlus className="mr-2" /> Lägg till hund
        </button>
      </div>

      {dogs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <FaDog className="text-6xl mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 mb-4">Inga hundar tillagda än</p>
          <button
            onClick={() => openDogModal()}
            className="flex items-center bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors mx-auto"
          >
            <FaPlus className="mr-2" /> Lägg till första hunden
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dogs.map((dog) => (
            <div key={dog.id} className="bg-white rounded-lg shadow-lg p-4 border-l-4 border-primary">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold ${dog.color} inline-block`}>
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

      {/* Dog Modal */}
      {isDogModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{editingDog ? 'Redigera hund' : 'Lägg till hund'}</h3>
              <button
                onClick={() => setIsDogModalOpen(false)}
                className="text-gray-500 hover:text-gray-900"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hundens namn *</label>
                <input
                  type="text"
                  value={dogForm.name}
                  onChange={(e) => setDogForm({ ...dogForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Morris"
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
                    />
                    Malmö
                  </label>
                </div>
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
              />
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setIsDogModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Avbryt
              </button>
              <button
                onClick={saveDog}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
              >
                Spara
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

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
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Box-inställningar</h2>
          
          {/* Location Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Välj plats</label>
            <div className="flex gap-4">
              <button
                onClick={() => setSettingsLocation('staffanstorp')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  settingsLocation === 'staffanstorp'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Staffanstorp
              </button>
              <button
                onClick={() => setSettingsLocation('malmo')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
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
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Burar</h3>
              <button
                onClick={handleAddCage}
                className="flex items-center bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
              >
                <FaPlus className="mr-2" /> Lägg till bur
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Fria ytor</h3>
              <button
                onClick={handleAddFreeArea}
                className="flex items-center bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
              >
                <FaPlus className="mr-2" /> Lägg till fri yta
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

  const renderContent = () => {
    switch(currentView) {
      case 'dogs':
        return renderDogs();
      case 'contracts':
        return renderContracts();
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
        return renderStatistics();
      case 'settings':
        return renderSettings();
      default:
        return renderDashboard();
    }
  };

  const renderContractForm = () => (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-xl font-semibold mb-4 border-b pb-2">Contract Type</h2>
                <div className="mb-4">
                  <label htmlFor="contractType" className="block text-sm font-medium text-gray-700 mb-1">Contract Type</label>
                  <select
                    id="contractType"
                    name="contractType"
                    value={contractData.contractType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  >
                    <option value="daycare">Hunddagis (Full-time)</option>
                    <option value="partTime">Hunddagis (Part-time)</option>
                    <option value="boarding">Hundpensionat</option>
                    <option value="socialWalk">Social Promenad</option>
                    <option value="singleDay">Enstaka Dag</option>
                  </select>
                </div>
                
                {contractData.contractType === 'partTime' && (
                  <div className="mb-4">
                    <label htmlFor="daysPerWeek" className="block text-sm font-medium text-gray-700 mb-1">Days Per Week</label>
                    <input
                      type="text"
                      id="daysPerWeek"
                      name="daysPerWeek"
                      value={contractData.daysPerWeek}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                      placeholder="e.g., 2-3"
                    />
                  </div>
                )}
                
                <div className="mb-4">
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">Price (SEK)</label>
                  <input
                    type="text"
                    id="price"
                    name="price"
                    value={contractData.price}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="e.g., 2500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="mb-4">
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      id="startDate"
                      name="startDate"
                      value={contractData.startDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      id="endDate"
                      name="endDate"
                      value={contractData.endDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <h2 className="text-xl font-semibold mb-4 border-b pb-2">Owner Information</h2>
                <div className="mb-4">
                  <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                  <input
                    type="text"
                    id="customerName"
                    name="customerName"
                    value={contractData.customerName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="e.g., Tina Eriksson"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="customerAddress" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    id="customerAddress"
                    name="customerAddress"
                    value={contractData.customerAddress}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="e.g., Storabackegatan 15d"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="customerCity" className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    id="customerCity"
                    name="customerCity"
                    value={contractData.customerCity}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="e.g., Malmö"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="personalNumber" className="block text-sm font-medium text-gray-700 mb-1">Personal Number</label>
                  <input
                    type="text"
                    id="personalNumber"
                    name="personalNumber"
                    value={contractData.personalNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="e.g., 19711216-3907"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-4 border-b pb-2">Dog Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="mb-4">
                  <label htmlFor="dogName" className="block text-sm font-medium text-gray-700 mb-1">Dog Name</label>
                  <input
                    type="text"
                    id="dogName"
                    name="dogName"
                    value={contractData.dogName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="e.g., Morris"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="dogBreed" className="block text-sm font-medium text-gray-700 mb-1">Dog Breed</label>
                  <input
                    type="text"
                    id="dogBreed"
                    name="dogBreed"
                    value={contractData.dogBreed}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="e.g., Labradoodle"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="dogAge" className="block text-sm font-medium text-gray-700 mb-1">Dog Age (years)</label>
                  <input
                    type="text"
                    id="dogAge"
                    name="dogAge"
                    value={contractData.dogAge}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="e.g., 10"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="chipNumber" className="block text-sm font-medium text-gray-700 mb-1">Microchip/Tattoo Number</label>
                  <input
                    type="text"
                    id="chipNumber"
                    name="chipNumber"
                    value={contractData.chipNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="e.g., 941000016851106"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-center mt-8">
              <button
                type="button"
                onClick={generatePDF}
                className="flex items-center bg-primary text-white py-3 px-6 rounded-md hover:bg-primary-dark transition-colors text-lg"
              >
                <FaFilePdf className="mr-2" /> Generera kontrakt PDF
              </button>
            </div>
          </form>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              {currentView !== 'dashboard' && (
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className="text-gray-600 hover:text-gray-900"
                >
                  ← Tillbaka
                </button>
              )}
              <h1 className="text-2xl font-bold text-gray-900">
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
                 'Dashboard'}
              </h1>
        </div>
            <button
              onClick={handleLogout}
              className="flex items-center bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition-colors"
            >
              <FaSignOutAlt className="mr-2" /> Logout
            </button>
      </div>
          
          {renderContent()}
        </div>
      </div>

      {/* Boarding Modal - Global, should appear in all views */}
      {isBoardingModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{editingBoardingRecord ? 'Redigera hundpensionat' : 'Lägg till hundpensionat'}</h3>
              <button
                onClick={() => setIsBoardingModalOpen(false)}
                className="text-gray-500 hover:text-gray-900"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Välj hund *</label>
                <select
                  value={selectedDogForBoarding}
                  onChange={(e) => setSelectedDogForBoarding(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Välj hund</option>
                  {dogs
                    .filter(dog => dog.locations.includes((window as any).currentBoardingLocation))
                    .map(dog => (
                      <option key={dog.id} value={dog.id}>
                        {dog.name} - {dog.owner} ({dog.locations.map(l => l === 'malmo' ? 'Malmö' : 'Staffanstorp').join(', ')})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Startdatum *</label>
                <input
                  type="date"
                  value={boardingForm.startDate}
                  onChange={(e) => setBoardingForm({ ...boardingForm, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slutdatum *</label>
                <input
                  type="date"
                  value={boardingForm.endDate}
                  onChange={(e) => setBoardingForm({ ...boardingForm, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Anteckningar</label>
              <textarea
                value={boardingForm.notes}
                onChange={(e) => setBoardingForm({ ...boardingForm, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="Extra information om pensionatet..."
              />
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setIsBoardingModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Avbryt
              </button>
              <button
                onClick={() => saveBoardingRecord((window as any).currentBoardingLocation)}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
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
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{editingDog ? 'Redigera hund' : 'Lägg till hund'}</h3>
              <button
                onClick={() => setIsDogModalOpen(false)}
                className="text-gray-500 hover:text-gray-900"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hundens namn *</label>
                <input
                  type="text"
                  value={dogForm.name}
                  onChange={(e) => setDogForm({ ...dogForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Morris"
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
              />
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setIsDogModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Avbryt
              </button>
              <button
                onClick={saveDog}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
              >
                Spara
              </button>
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