import { supabase } from './supabase';

// Use the same types as AdminPage
export type Dog = {
  id: string;
  name: string;
  breed: string;
  age: string;
  owner: string;
  phone: string;
  email?: string; // Optional email field for matching
  notes?: string;
  locations: ('malmo' | 'staffanstorp')[];
  type?: 'fulltime' | 'parttime-3' | 'parttime-2' | 'singleDay' | 'boarding';
  isActive?: boolean;
  // Contract fields
  ownerAddress?: string;
  ownerCity?: string;
  ownerPersonalNumber?: string;
  chipNumber?: string;
};

export type BoardingRecord = {
  id: string;
  dogId: string;
  dogName: string;
  location: 'malmo' | 'staffanstorp';
  startDate: string;
  endDate: string;
  notes?: string;
  createdAt: string;
  isArchived?: boolean;
};

export type PlanningData = {
  id: string;
  date: string;
  location: 'malmo' | 'staffanstorp';
  cages: Array<{
    id: string;
    name: string;
    type: 'cage' | 'free-area';
    dogs?: string[];
  }>;
  createdAt: string;
};

// Helper to check if Supabase is available, otherwise fallback to localStorage
const isSupabaseAvailable = () => supabase !== null;

// Generate UUID v4
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// ============================================================================
// DOGS CRUD OPERATIONS
// ============================================================================

export const getDogs = async (): Promise<Dog[]> => {
  if (!isSupabaseAvailable()) {
    // Fallback to localStorage
    const saved = localStorage.getItem('cleverDogs');
    return saved ? JSON.parse(saved) : [];
  }

  const { data, error } = await supabase!
    .from('dogs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching dogs:', error);
    // Fallback to localStorage on error
    const saved = localStorage.getItem('cleverDogs');
    return saved ? JSON.parse(saved) : [];
  }

  // Transform database format to app format
  return ((data as any) || []).map((dog: any) => {
    // Ensure locations is always an array
    let locations: ('malmo' | 'staffanstorp')[] = [];
    if (Array.isArray(dog.locations)) {
      locations = dog.locations;
    } else if (dog.locations && typeof dog.locations === 'string') {
      // Handle case where locations might be a string (shouldn't happen but safety)
      try {
        locations = JSON.parse(dog.locations);
      } catch {
        locations = [dog.locations as 'malmo' | 'staffanstorp'];
      }
    }
    
    // Ensure type is properly converted (null -> undefined, empty string -> undefined)
    let type: 'fulltime' | 'parttime-3' | 'parttime-2' | 'singleDay' | 'boarding' | undefined = undefined;
    if (dog.type && typeof dog.type === 'string' && dog.type.trim() !== '') {
      const typeValue = dog.type.trim();
      if (typeValue === 'fulltime' || typeValue === 'parttime-3' || typeValue === 'parttime-2' || typeValue === 'singleDay' || typeValue === 'boarding') {
        type = typeValue as 'fulltime' | 'parttime-3' | 'parttime-2' | 'singleDay' | 'boarding';
      }
    }
    
    return {
      id: dog.id,
      name: dog.name || '',
      breed: dog.breed || '',
      age: dog.age || '',
      owner: dog.owner || '',
      phone: dog.phone || '',
      email: dog.email || undefined,
      notes: dog.notes ? String(dog.notes) : undefined,
      locations: locations,
      type: type,
      isActive: dog.is_active !== undefined ? dog.is_active : true,
      // Contract fields
      ownerAddress: dog.owner_address || undefined,
      ownerCity: dog.owner_city || undefined,
      ownerPersonalNumber: dog.owner_personal_number || undefined,
      chipNumber: dog.chip_number || undefined,
    };
  });
};

export const saveDog = async (dog: Dog): Promise<Dog> => {
  if (!isSupabaseAvailable()) {
    // Fallback to localStorage
    const saved = localStorage.getItem('cleverDogs');
    const dogs: Dog[] = saved ? JSON.parse(saved) : [];
    const existingIndex = dogs.findIndex(d => d.id === dog.id);
    
    if (existingIndex >= 0) {
      dogs[existingIndex] = dog;
    } else {
      dogs.push(dog);
    }
    localStorage.setItem('cleverDogs', JSON.stringify(dogs));
    return dog;
  }

  // Convert ID to UUID format if needed (handle both UUID and timestamp strings)
  let dogId = dog.id;
  // If ID doesn't look like a UUID, generate a new one (only for new dogs)
  if (!dog.id || !dog.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    // Check if this is an existing dog (has an ID that's not a UUID format)
    // For new dogs, generate UUID. For existing dogs with non-UUID IDs, we need to handle migration
    if (dog.id && dog.id.length > 0) {
      // This is an existing dog with old ID format - keep it but Supabase will auto-generate UUID on insert
      // We'll need to update the ID after insert
      dogId = generateUUID();
    } else {
      dogId = generateUUID();
    }
  }

  // Prepare data for database
  const upsertData: any = {
    id: dogId,
    name: dog.name,
    breed: dog.breed,
    age: dog.age,
    owner: dog.owner,
    phone: dog.phone,
    email: dog.email || null,
    notes: dog.notes || null,
    color: 'bg-gray-100 text-gray-800', // Default color - remove this when color column is removed from database
    locations: dog.locations,
    type: dog.type || null,
    is_active: dog.isActive !== undefined ? dog.isActive : true,
    // Contract fields
    owner_address: dog.ownerAddress || null,
    owner_city: dog.ownerCity || null,
    owner_personal_number: dog.ownerPersonalNumber || null,
    chip_number: dog.chipNumber || null,
  };

  console.log('Saving dog to database:', upsertData); // Debug log

  const { data, error } = await supabase!
    .from('dogs')
    .upsert(upsertData as any, {
      onConflict: 'id'
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving dog:', error);
    throw error;
  }

  const dbDog = data as any;
  
  // Ensure locations is always an array
  let locations: ('malmo' | 'staffanstorp')[] = [];
  if (Array.isArray(dbDog.locations)) {
    locations = dbDog.locations;
  } else if (dbDog.locations) {
    try {
      locations = JSON.parse(dbDog.locations);
    } catch {
      locations = [];
    }
  }
  
  // Ensure type is properly converted
  let type: 'fulltime' | 'parttime-3' | 'parttime-2' | 'singleDay' | 'boarding' | undefined = undefined;
  if (dbDog.type && typeof dbDog.type === 'string' && dbDog.type.trim() !== '') {
    const typeValue = dbDog.type.trim();
    if (typeValue === 'fulltime' || typeValue === 'parttime-3' || typeValue === 'parttime-2' || typeValue === 'singleDay' || typeValue === 'boarding') {
      type = typeValue as 'fulltime' | 'parttime-3' | 'parttime-2' | 'singleDay' | 'boarding';
    }
  }
  
  const savedDog = {
    id: dbDog.id, // Use the UUID from database
    name: dbDog.name || '',
    breed: dbDog.breed || '',
    age: dbDog.age || '',
    owner: dbDog.owner || '',
    phone: dbDog.phone || '',
    email: dbDog.email || undefined,
    notes: dbDog.notes ? String(dbDog.notes) : undefined,
    locations: locations,
    type: type,
    isActive: dbDog.is_active !== undefined ? dbDog.is_active : true,
    // Contract fields
    ownerAddress: dbDog.owner_address || undefined,
    ownerCity: dbDog.owner_city || undefined,
    ownerPersonalNumber: dbDog.owner_personal_number || undefined,
    chipNumber: dbDog.chip_number || undefined,
  };
  
  // If the ID changed (old format to UUID), we need to update localStorage
  if (dog.id !== savedDog.id && isSupabaseAvailable()) {
    // Update any references in localStorage
    const saved = localStorage.getItem('cleverDogs');
    if (saved) {
      const dogs: Dog[] = JSON.parse(saved);
      const updatedDogs = dogs.map(d => d.id === dog.id ? savedDog : d);
      localStorage.setItem('cleverDogs', JSON.stringify(updatedDogs));
    }
  }
  
  return savedDog;
};

export const deleteDog = async (dogId: string): Promise<void> => {
  if (!isSupabaseAvailable()) {
    // Fallback to localStorage
    const saved = localStorage.getItem('cleverDogs');
    const dogs: Dog[] = saved ? JSON.parse(saved) : [];
    const updated = dogs.filter(d => d.id !== dogId);
    localStorage.setItem('cleverDogs', JSON.stringify(updated));
    return;
  }

  const { error } = await supabase!
    .from('dogs')
    .delete()
    .eq('id', dogId);

  if (error) {
    console.error('Error deleting dog:', error);
    throw error;
  }
};

// ============================================================================
// BOARDING RECORDS CRUD OPERATIONS
// ============================================================================

export const getBoardingRecords = async (): Promise<BoardingRecord[]> => {
  if (!isSupabaseAvailable()) {
    // Fallback to localStorage
    const saved = localStorage.getItem('cleverBoarding');
    return saved ? JSON.parse(saved) : [];
  }

  const { data, error } = await supabase!
    .from('boarding_records')
    .select('*')
    .order('start_date', { ascending: false });

  if (error) {
    console.error('Error fetching boarding records:', error);
    const saved = localStorage.getItem('cleverBoarding');
    return saved ? JSON.parse(saved) : [];
  }

  return ((data as any) || []).map((record: any) => ({
    id: record.id,
    dogId: record.dog_id,
    dogName: record.dog_name,
    location: record.location as 'malmo' | 'staffanstorp',
    startDate: record.start_date,
    endDate: record.end_date,
    notes: record.notes ? String(record.notes) : undefined,
    createdAt: record.created_at || new Date().toISOString(),
    isArchived: record.is_archived || false,
  }));
};

export const saveBoardingRecord = async (record: BoardingRecord): Promise<BoardingRecord> => {
  if (!isSupabaseAvailable()) {
    // Fallback to localStorage
    const saved = localStorage.getItem('cleverBoarding');
    const records: BoardingRecord[] = saved ? JSON.parse(saved) : [];
    const existingIndex = records.findIndex(r => r.id === record.id);
    
    if (existingIndex >= 0) {
      records[existingIndex] = record;
    } else {
      records.push(record);
    }
    localStorage.setItem('cleverBoarding', JSON.stringify(records));
    return record;
  }

  // Convert ID to UUID format if needed
  let recordId = record.id;
  if (!record.id || !record.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    recordId = generateUUID();
  }

  const { data, error } = await supabase!
    .from('boarding_records')
    .upsert({
      id: recordId,
      dog_id: record.dogId,
      dog_name: record.dogName,
      location: record.location,
      start_date: record.startDate,
      end_date: record.endDate,
      notes: record.notes || null,
      is_archived: record.isArchived || false,
    } as any, {
      onConflict: 'id'
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving boarding record:', error);
    throw error;
  }

  const dbRecord = data as any;
  return {
    id: dbRecord.id,
    dogId: dbRecord.dog_id,
    dogName: dbRecord.dog_name,
    location: dbRecord.location as 'malmo' | 'staffanstorp',
    startDate: dbRecord.start_date,
    endDate: dbRecord.end_date,
    notes: dbRecord.notes ? String(dbRecord.notes) : undefined,
    createdAt: dbRecord.created_at || new Date().toISOString(),
    isArchived: dbRecord.is_archived || false,
  };
};

export const deleteBoardingRecord = async (recordId: string): Promise<void> => {
  if (!isSupabaseAvailable()) {
    // Fallback to localStorage
    const saved = localStorage.getItem('cleverBoarding');
    const records: BoardingRecord[] = saved ? JSON.parse(saved) : [];
    const updated = records.filter(r => r.id !== recordId);
    localStorage.setItem('cleverBoarding', JSON.stringify(updated));
    return;
  }

  const { error } = await supabase!
    .from('boarding_records')
    .delete()
    .eq('id', recordId);

  if (error) {
    console.error('Error deleting boarding record:', error);
    throw error;
  }
};

// ============================================================================
// PLANNING HISTORY CRUD OPERATIONS
// ============================================================================

export const getPlanningHistory = async (): Promise<PlanningData[]> => {
  if (!isSupabaseAvailable()) {
    // Fallback to localStorage
    const saved = localStorage.getItem('cleverPlanningHistory');
    return saved ? JSON.parse(saved) : [];
  }

  const { data, error } = await supabase!
    .from('planning_history')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching planning history:', error);
    const saved = localStorage.getItem('cleverPlanningHistory');
    return saved ? JSON.parse(saved) : [];
  }

  return ((data as any) || []).map((planning: any) => ({
    id: planning.id,
    date: planning.date,
    location: planning.location as 'malmo' | 'staffanstorp',
    cages: (Array.isArray(planning.cages) ? planning.cages : []) as PlanningData['cages'],
    createdAt: planning.created_at || new Date().toISOString(),
  }));
};

export const savePlanningData = async (planning: PlanningData): Promise<PlanningData> => {
  if (!isSupabaseAvailable()) {
    // Fallback to localStorage
    const saved = localStorage.getItem('cleverPlanningHistory');
    const history: PlanningData[] = saved ? JSON.parse(saved) : [];
    const existingIndex = history.findIndex(
      p => p.date === planning.date && p.location === planning.location
    );
    
    if (existingIndex >= 0) {
      history[existingIndex] = planning;
    } else {
      history.push(planning);
    }
    localStorage.setItem('cleverPlanningHistory', JSON.stringify(history));
    return planning;
  }

  // First, check if a planning already exists for this date and location
  // to reuse the existing ID (important for upsert to work correctly)
  let planningId = planning.id;
  
  // If ID is not a UUID, try to find existing planning to get its ID
  if (!planning.id || !planning.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    try {
      const existing = await getPlanningForDate(planning.date, planning.location);
      if (existing && existing.id) {
        planningId = existing.id;
      } else {
        planningId = generateUUID();
      }
    } catch (error) {
      // If we can't find existing, generate a new UUID
      planningId = generateUUID();
    }
  }

  const { data, error } = await supabase!
    .from('planning_history')
    .upsert({
      id: planningId,
      date: planning.date,
      location: planning.location,
      cages: planning.cages,
    } as any, {
      onConflict: 'date,location'
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving planning data:', error);
    throw error;
  }

  const dbPlanning = data as any;
  return {
    id: dbPlanning.id,
    date: dbPlanning.date,
    location: dbPlanning.location as 'malmo' | 'staffanstorp',
    cages: (Array.isArray(dbPlanning.cages) ? dbPlanning.cages : []) as PlanningData['cages'],
    createdAt: dbPlanning.created_at || new Date().toISOString(),
  };
};

// Helper to get planning for a specific date and location
export const getPlanningForDate = async (
  date: string,
  location: 'malmo' | 'staffanstorp'
): Promise<PlanningData | null> => {
  if (!isSupabaseAvailable()) {
    // Fallback to localStorage
    const saved = localStorage.getItem('cleverPlanningHistory');
    const history: PlanningData[] = saved ? JSON.parse(saved) : [];
    return history.find(p => p.date === date && p.location === location) || null;
  }

  // Use .maybeSingle() instead of .single() to handle missing rows gracefully
  const { data, error } = await supabase!
    .from('planning_history')
    .select('*')
    .eq('date', date)
    .eq('location', location)
    .maybeSingle();

  if (error) {
    // Handle 406 and PGRST116 as "not found" cases
    // PGRST116 = no rows returned
    // 406 errors can occur with .single() when no rows found
    if (error.code === 'PGRST116' || 
        (error.message && error.message.includes('406')) ||
        (error.message && error.message.includes('multiple')) ||
        error.message === 'JSON object requested, multiple (or no) rows returned') {
      return null;
    }
    console.error('Error fetching planning for date:', error);
    return null;
  }

  // If no data found, return null
  if (!data) {
    return null;
  }

  const dbPlanning = data as any;
  return {
    id: dbPlanning.id,
    date: dbPlanning.date,
    location: dbPlanning.location as 'malmo' | 'staffanstorp',
    cages: (Array.isArray(dbPlanning.cages) ? dbPlanning.cages : []) as PlanningData['cages'],
    createdAt: dbPlanning.created_at || new Date().toISOString(),
  };
};

// ============================================================================
// BOX SETTINGS CRUD OPERATIONS
// ============================================================================

export type BoxSettings = {
  malmo: { cages: Array<{ name: string }>; freeAreas: Array<{ name: string }> };
  staffanstorp: { cages: Array<{ name: string }>; freeAreas: Array<{ name: string }> };
};

export const getBoxSettings = async (): Promise<BoxSettings> => {
  // Default settings
  const defaultSettings: BoxSettings = {
    malmo: {
      cages: Array.from({ length: 8 }, (_, i) => ({ name: `Bur ${i + 1}` })),
      freeAreas: Array.from({ length: 2 }, (_, i) => ({ name: `Fri yta ${i + 1}` }))
    },
    staffanstorp: {
      cages: Array.from({ length: 8 }, (_, i) => ({ name: `Bur ${i + 1}` })),
      freeAreas: Array.from({ length: 2 }, (_, i) => ({ name: `Fri yta ${i + 1}` }))
    }
  };

  if (!isSupabaseAvailable()) {
    // Fallback to localStorage
    const saved = localStorage.getItem('cleverBoxSettings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return defaultSettings;
      }
    }
    return defaultSettings;
  }

  try {
    const { data, error } = await supabase!
      .from('box_settings')
      .select('*');

    if (error) {
      console.error('Error fetching box settings:', error);
      // Fallback to localStorage
      const saved = localStorage.getItem('cleverBoxSettings');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return defaultSettings;
        }
      }
      return defaultSettings;
    }

    // Transform database format to app format
    const settings: BoxSettings = { ...defaultSettings };
    
    if (data && Array.isArray(data)) {
      data.forEach((row: any) => {
        const location = row.location as 'malmo' | 'staffanstorp';
        if (location === 'malmo' || location === 'staffanstorp') {
          const rowSettings = row.settings;
          if (rowSettings && typeof rowSettings === 'object') {
            settings[location] = {
              cages: Array.isArray(rowSettings.cages) ? rowSettings.cages : [],
              freeAreas: Array.isArray(rowSettings.freeAreas) ? rowSettings.freeAreas : []
            };
          }
        }
      });
    }

    return settings;
  } catch (error) {
    console.error('Error parsing box settings:', error);
    // Fallback to localStorage
    const saved = localStorage.getItem('cleverBoxSettings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return defaultSettings;
      }
    }
    return defaultSettings;
  }
};

export const saveBoxSettings = async (settings: BoxSettings): Promise<BoxSettings> => {
  // Always save to localStorage as backup
  localStorage.setItem('cleverBoxSettings', JSON.stringify(settings));

  if (!isSupabaseAvailable()) {
    return settings;
  }

  try {
    // Save settings for both locations
    const locations: Array<'malmo' | 'staffanstorp'> = ['malmo', 'staffanstorp'];
    
    for (const location of locations) {
      const locationSettings = settings[location];
      
      const { error } = await supabase!
        .from('box_settings')
        .upsert({
          location: location,
          settings: {
            cages: locationSettings.cages,
            freeAreas: locationSettings.freeAreas
          }
        } as any, {
          onConflict: 'location'
        });

      if (error) {
        console.error(`Error saving box settings for ${location}:`, error);
        // Continue with other location even if one fails
      }
    }

    return settings;
  } catch (error) {
    console.error('Error saving box settings:', error);
    // Settings already saved to localStorage, so return them
    return settings;
  }
};

// ============================================================================
// APPLICATIONS CRUD OPERATIONS
// ============================================================================

export type Application = {
  id: string;
  location: 'malmo' | 'staffanstorp';
  
  // Owner information
  owner_name: string;
  owner_email: string;
  owner_phone?: string;
  owner_address?: string;
  owner_city?: string;
  owner_postal_code?: string;
  owner_personnummer?: string;
  
  // Dog information
  dog_name: string;
  dog_breed?: string;
  dog_gender?: string;
  dog_height?: string;
  dog_age?: string;
  dog_chip_number?: string;
  is_neutered?: string;
  
  // Service information
  service_type: string;
  days_per_week?: string;
  start_date?: string;
  end_date?: string;
  part_time_days?: string;
  
  // Additional information
  dog_socialization?: string;
  problem_behaviors?: string;
  allergies?: string;
  additional_info?: string;
  message?: string;
  
  // Status and matching
  status: 'new' | 'reviewed' | 'approved' | 'rejected' | 'matched' | 'added';
  matched_dog_id?: string;
  matched_by?: string;
  matched_at?: string;
  
  // Admin notes
  admin_notes?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
};

// Input type for creating a new application (excludes auto-generated fields)
export type ApplicationInput = Omit<Application, 'id' | 'status' | 'created_at' | 'updated_at' | 'matched_dog_id' | 'matched_by' | 'matched_at' | 'admin_notes'>;

// Save a new application
export const saveApplication = async (input: ApplicationInput): Promise<Application> => {
  const now = new Date().toISOString();
  const newApplication: Application = {
    ...input,
    id: generateUUID(),
    status: 'new',
    created_at: now,
    updated_at: now
  };

  // Always save to localStorage first as backup
  const saved = localStorage.getItem('cleverApplications');
  const applications: Application[] = saved ? JSON.parse(saved) : [];
  applications.push(newApplication);
  localStorage.setItem('cleverApplications', JSON.stringify(applications));

  // Try to save to Supabase if available
  if (isSupabaseAvailable()) {
    try {
      const insertData: any = {
        location: input.location,
        owner_name: input.owner_name,
        owner_email: input.owner_email,
        owner_phone: input.owner_phone || null,
        owner_address: input.owner_address || null,
        owner_city: input.owner_city || null,
        owner_postal_code: input.owner_postal_code || null,
        owner_personnummer: input.owner_personnummer || null,
        dog_name: input.dog_name,
        dog_breed: input.dog_breed || null,
        dog_gender: input.dog_gender || null,
        dog_height: input.dog_height || null,
        dog_age: input.dog_age || null,
        dog_chip_number: input.dog_chip_number || null,
        is_neutered: input.is_neutered || null,
        service_type: input.service_type,
        days_per_week: input.days_per_week || null,
        start_date: input.start_date || null,
        end_date: input.end_date || null,
        part_time_days: input.part_time_days || null,
        dog_socialization: input.dog_socialization || null,
        problem_behaviors: input.problem_behaviors || null,
        allergies: input.allergies || null,
        additional_info: input.additional_info || null,
        message: input.message || null,
        status: 'new'
      };

      const { data, error } = await supabase!
        .from('applications')
        .insert(insertData)
        .select()
        .single();

      if (!error && data) {
        // Update localStorage with the server response (includes server-generated ID and timestamps)
        const index = applications.findIndex(a => a.id === newApplication.id);
        if (index >= 0) {
          applications[index] = data as Application;
          localStorage.setItem('cleverApplications', JSON.stringify(applications));
          return data as Application;
        }
      } else {
        console.warn('Failed to save application to database, using localStorage version:', error);
      }
    } catch (error) {
      console.warn('Error saving application to database, using localStorage version:', error);
    }
  }

  return newApplication;
};

// Get all applications with optional filters
export const getApplications = async (filters?: { status?: string; location?: string }): Promise<Application[]> => {
  let applications: Application[] = [];

  // Try Supabase first
  if (isSupabaseAvailable()) {
    try {
      let query = supabase!
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.location) {
        query = query.eq('location', filters.location);
      }

      const { data, error } = await query;

      if (!error && data) {
        // Also sync to localStorage as backup
        localStorage.setItem('cleverApplications', JSON.stringify(data as Application[]));
        return (data as any) as Application[];
      } else {
        console.warn('Error fetching from database, falling back to localStorage:', error);
      }
    } catch (error) {
      console.warn('Error fetching from database, falling back to localStorage:', error);
    }
  }

  // Fallback to localStorage
  const saved = localStorage.getItem('cleverApplications');
  applications = saved ? JSON.parse(saved) : [];

  // Apply filters
  if (filters?.status) {
    applications = applications.filter(a => a.status === filters.status);
  }
  if (filters?.location) {
    applications = applications.filter(a => a.location === filters.location);
  }

  return applications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

// Update an existing application
export const updateApplication = async (id: string, updates: Partial<Application>): Promise<Application> => {
  const saved = localStorage.getItem('cleverApplications');
  const applications: Application[] = saved ? JSON.parse(saved) : [];
  const index = applications.findIndex(a => a.id === id);

  if (index < 0) {
    throw new Error('Application not found');
  }

  // Update local copy
  const updated = {
    ...applications[index],
    ...updates,
    updated_at: new Date().toISOString()
  };
  applications[index] = updated;
  localStorage.setItem('cleverApplications', JSON.stringify(applications));

  // Try to update in Supabase
  if (isSupabaseAvailable()) {
    try {
      const updateData: Record<string, any> = {};
      Object.keys(updates).forEach(key => {
        if (key !== 'id' && key !== 'created_at') {
          updateData[key] = (updates as any)[key];
        }
      });
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await (supabase!.from('applications' as any) as any)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        // Update localStorage with server response
        applications[index] = data as Application;
        localStorage.setItem('cleverApplications', JSON.stringify(applications));
        return data as Application;
      } else {
        console.warn('Failed to update application in database:', error);
      }
    } catch (error) {
      console.warn('Error updating application in database:', error);
    }
  }

  return updated;
};

// Find potential matching dogs based on phone number, email, and dog name
export const findMatchingDogs = async (phone: string, dogName: string, email?: string): Promise<Dog[]> => {
  const allDogs = await getDogs();
  
  // Normalize phone numbers (remove spaces, dashes, etc.)
  const normalizePhone = (phoneNum: string): string => {
    return phoneNum.replace(/\s+/g, '').replace(/-/g, '').replace(/\(/g, '').replace(/\)/g, '');
  };
  
  // Normalize email (lowercase and trim)
  const normalizeEmail = (emailAddr: string): string => {
    return emailAddr.toLowerCase().trim();
  };
  
  const normalizedSearchPhone = normalizePhone(phone || '');
  const normalizedSearchName = dogName.toLowerCase().trim();
  const normalizedSearchEmail = email ? normalizeEmail(email) : '';
  
  return allDogs.filter(dog => {
    const normalizedDogPhone = normalizePhone(dog.phone || '');
    const normalizedDogName = dog.name.toLowerCase().trim();
    const normalizedDogEmail = dog.email ? normalizeEmail(dog.email) : '';
    
    // Match if phone + name match, OR email + name match
    const phoneNameMatch = normalizedDogPhone === normalizedSearchPhone && 
                          normalizedDogName === normalizedSearchName;
    
    const emailNameMatch = normalizedSearchEmail && 
                          normalizedDogEmail === normalizedSearchEmail &&
                          normalizedDogName === normalizedSearchName;
    
    return phoneNameMatch || emailNameMatch;
  });
};

// ============================================================================
// MEETINGS CRUD OPERATIONS
// ============================================================================

export type Meeting = {
  id: string;
  name: string; // Customer name (required)
  dogName?: string; // Dog name (optional)
  phone?: string; // Phone number (optional)
  email?: string; // Email (optional)
  date: string; // YYYY-MM-DD (required)
  time: string; // HH:mm format (required)
  location: 'malmo' | 'staffanstorp';
  createdAt: string;
  updatedAt: string;
};

export const saveMeeting = async (meeting: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>): Promise<Meeting> => {
  if (!isSupabaseAvailable()) {
    // Fallback to localStorage
    const newMeeting: Meeting = {
      ...meeting,
      id: generateUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const saved = localStorage.getItem('cleverMeetings');
    const meetings = saved ? JSON.parse(saved) : [];
    meetings.push(newMeeting);
    localStorage.setItem('cleverMeetings', JSON.stringify(meetings));
    
    return newMeeting;
  }

  try {
    const { data, error } = await supabase!
      .from('meetings' as any)
      .insert({
        name: meeting.name,
        dog_name: meeting.dogName || null,
        phone: meeting.phone || null,
        email: meeting.email || null,
        date: meeting.date,
        time: meeting.time,
        location: meeting.location
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Error saving meeting:', error);
      // Fallback to localStorage
      const newMeeting: Meeting = {
        ...meeting,
        id: generateUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const saved = localStorage.getItem('cleverMeetings');
      const meetings = saved ? JSON.parse(saved) : [];
      meetings.push(newMeeting);
      localStorage.setItem('cleverMeetings', JSON.stringify(meetings));
      
      return newMeeting;
    }

    // Also save to localStorage as backup
    const saved = localStorage.getItem('cleverMeetings');
    const meetings = saved ? JSON.parse(saved) : [];
    const mappedMeeting: Meeting = {
      id: (data as any).id,
      name: (data as any).name,
      dogName: (data as any).dog_name || undefined,
      phone: (data as any).phone || undefined,
      email: (data as any).email || undefined,
      date: (data as any).date,
      time: (data as any).time,
      location: (data as any).location,
      createdAt: (data as any).created_at,
      updatedAt: (data as any).updated_at
    };
    meetings.push(mappedMeeting);
    localStorage.setItem('cleverMeetings', JSON.stringify(meetings));

    return mappedMeeting;
  } catch (error) {
    console.error('Error saving meeting:', error);
    // Fallback to localStorage
    const newMeeting: Meeting = {
      ...meeting,
      id: generateUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const saved = localStorage.getItem('cleverMeetings');
    const meetings = saved ? JSON.parse(saved) : [];
    meetings.push(newMeeting);
    localStorage.setItem('cleverMeetings', JSON.stringify(meetings));
    
    return newMeeting;
  }
};

export const getMeetings = async (filters?: { location?: string; date?: string }): Promise<Meeting[]> => {
  if (!isSupabaseAvailable()) {
    // Fallback to localStorage
    const saved = localStorage.getItem('cleverMeetings');
    let meetings: Meeting[] = saved ? JSON.parse(saved) : [];
    
    if (filters?.location) {
      meetings = meetings.filter(m => m.location === filters.location);
    }
    if (filters?.date) {
      meetings = meetings.filter(m => m.date === filters.date);
    }
    
    return meetings.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });
  }

  try {
    let query = supabase!
      .from('meetings' as any)
      .select('*')
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (filters?.location) {
      query = query.eq('location', filters.location);
    }
    if (filters?.date) {
      query = query.eq('date', filters.date);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching meetings:', error);
      // Fallback to localStorage
      const saved = localStorage.getItem('cleverMeetings');
      let meetings: Meeting[] = saved ? JSON.parse(saved) : [];
      
      if (filters?.location) {
        meetings = meetings.filter(m => m.location === filters.location);
      }
      if (filters?.date) {
        meetings = meetings.filter(m => m.date === filters.date);
      }
      
      return meetings.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.time.localeCompare(b.time);
      });
    }

    // Map snake_case to camelCase
    return ((data as any) || []).map((meeting: any): Meeting => ({
      id: meeting.id,
      name: meeting.name,
      dogName: meeting.dog_name || undefined,
      phone: meeting.phone || undefined,
      email: meeting.email || undefined,
      date: meeting.date,
      time: meeting.time,
      location: meeting.location,
      createdAt: meeting.created_at,
      updatedAt: meeting.updated_at
    }));
  } catch (error) {
    console.error('Error fetching meetings:', error);
    // Fallback to localStorage
    const saved = localStorage.getItem('cleverMeetings');
    let meetings: Meeting[] = saved ? JSON.parse(saved) : [];
    
    if (filters?.location) {
      meetings = meetings.filter(m => m.location === filters.location);
    }
    if (filters?.date) {
      meetings = meetings.filter(m => m.date === filters.date);
    }
    
    return meetings.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });
  }
};

export const updateMeeting = async (id: string, updates: Partial<Omit<Meeting, 'id' | 'createdAt'>>): Promise<Meeting> => {
  if (!isSupabaseAvailable()) {
    // Fallback to localStorage
    const saved = localStorage.getItem('cleverMeetings');
    const meetings: Meeting[] = saved ? JSON.parse(saved) : [];
    const index = meetings.findIndex(m => m.id === id);
    
    if (index >= 0) {
      meetings[index] = {
        ...meetings[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem('cleverMeetings', JSON.stringify(meetings));
      return meetings[index];
    }
    
    throw new Error('Meeting not found');
  }

  try {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.dogName !== undefined) updateData.dog_name = updates.dogName;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.time !== undefined) updateData.time = updates.time;
    if (updates.location !== undefined) updateData.location = updates.location;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await (supabase!.from('meetings' as any) as any)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating meeting:', error);
      // Fallback to localStorage
      const saved = localStorage.getItem('cleverMeetings');
      const meetings: Meeting[] = saved ? JSON.parse(saved) : [];
      const index = meetings.findIndex(m => m.id === id);
      
      if (index >= 0) {
        meetings[index] = {
          ...meetings[index],
          ...updates,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem('cleverMeetings', JSON.stringify(meetings));
        return meetings[index];
      }
      
      throw new Error('Meeting not found');
    }

    // Also update localStorage as backup
    const saved = localStorage.getItem('cleverMeetings');
    if (saved) {
      const meetings: Meeting[] = JSON.parse(saved);
      const index = meetings.findIndex(m => m.id === id);
      if (index >= 0) {
        const mappedMeeting: Meeting = {
          id: data.id,
          name: data.name,
          dogName: data.dog_name || undefined,
          phone: data.phone || undefined,
          email: data.email || undefined,
          date: data.date,
          time: data.time,
          location: data.location,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
        meetings[index] = mappedMeeting;
        localStorage.setItem('cleverMeetings', JSON.stringify(meetings));
      }
    }

    return {
      id: data.id,
      name: data.name,
      dogName: data.dog_name || undefined,
      phone: data.phone || undefined,
      email: data.email || undefined,
      date: data.date,
      time: data.time,
      location: data.location,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('Error updating meeting:', error);
    // Fallback to localStorage
    const saved = localStorage.getItem('cleverMeetings');
    const meetings: Meeting[] = saved ? JSON.parse(saved) : [];
    const index = meetings.findIndex(m => m.id === id);
    
    if (index >= 0) {
      meetings[index] = {
        ...meetings[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem('cleverMeetings', JSON.stringify(meetings));
      return meetings[index];
    }
    
    throw error;
  }
};

export const deleteMeeting = async (id: string): Promise<void> => {
  if (!isSupabaseAvailable()) {
    // Fallback to localStorage
    const saved = localStorage.getItem('cleverMeetings');
    const meetings: Meeting[] = saved ? JSON.parse(saved) : [];
    const filtered = meetings.filter(m => m.id !== id);
    localStorage.setItem('cleverMeetings', JSON.stringify(filtered));
    return;
  }

  try {
    const { error } = await supabase!
      .from('meetings' as any)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting meeting:', error);
      // Fallback to localStorage
      const saved = localStorage.getItem('cleverMeetings');
      const meetings: Meeting[] = saved ? JSON.parse(saved) : [];
      const filtered = meetings.filter(m => m.id !== id);
      localStorage.setItem('cleverMeetings', JSON.stringify(filtered));
      return;
    }

    // Also delete from localStorage
    const saved = localStorage.getItem('cleverMeetings');
    if (saved) {
      const meetings: Meeting[] = JSON.parse(saved);
      const filtered = meetings.filter(m => m.id !== id);
      localStorage.setItem('cleverMeetings', JSON.stringify(filtered));
    }
  } catch (error) {
    console.error('Error deleting meeting:', error);
    // Fallback to localStorage
    const saved = localStorage.getItem('cleverMeetings');
    const meetings: Meeting[] = saved ? JSON.parse(saved) : [];
    const filtered = meetings.filter(m => m.id !== id);
    localStorage.setItem('cleverMeetings', JSON.stringify(filtered));
  }
};

