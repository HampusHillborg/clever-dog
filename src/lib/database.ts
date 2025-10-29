import { supabase } from './supabase';

// Use the same types as AdminPage
export type Dog = {
  id: string;
  name: string;
  breed: string;
  age: string;
  owner: string;
  phone: string;
  notes?: string;
  color: string;
  locations: ('malmo' | 'staffanstorp')[];
  type?: 'fulltime' | 'parttime-3' | 'parttime-2';
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
    let type: 'fulltime' | 'parttime-3' | 'parttime-2' | undefined = undefined;
    if (dog.type && typeof dog.type === 'string' && dog.type.trim() !== '') {
      const typeValue = dog.type.trim();
      if (typeValue === 'fulltime' || typeValue === 'parttime-3' || typeValue === 'parttime-2') {
        type = typeValue as 'fulltime' | 'parttime-3' | 'parttime-2';
      }
    }
    
    return {
      id: dog.id,
      name: dog.name || '',
      breed: dog.breed || '',
      age: dog.age || '',
      owner: dog.owner || '',
      phone: dog.phone || '',
      notes: dog.notes ? String(dog.notes) : undefined,
      color: dog.color || 'bg-gray-100 text-gray-800',
      locations: locations,
      type: type,
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

  const { data, error } = await supabase!
    .from('dogs')
    .upsert({
      id: dogId,
      name: dog.name,
      breed: dog.breed,
      age: dog.age,
      owner: dog.owner,
      phone: dog.phone,
      notes: dog.notes || null,
      color: dog.color,
      locations: dog.locations,
      type: dog.type || null,
    } as any, {
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
  let type: 'fulltime' | 'parttime-3' | 'parttime-2' | undefined = undefined;
  if (dbDog.type && typeof dbDog.type === 'string' && dbDog.type.trim() !== '') {
    const typeValue = dbDog.type.trim();
    if (typeValue === 'fulltime' || typeValue === 'parttime-3' || typeValue === 'parttime-2') {
      type = typeValue as 'fulltime' | 'parttime-3' | 'parttime-2';
    }
  }
  
  const savedDog = {
    id: dbDog.id, // Use the UUID from database
    name: dbDog.name || '',
    breed: dbDog.breed || '',
    age: dbDog.age || '',
    owner: dbDog.owner || '',
    phone: dbDog.phone || '',
    notes: dbDog.notes ? String(dbDog.notes) : undefined,
    color: dbDog.color || 'bg-gray-100 text-gray-800',
    locations: locations,
    type: type,
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

  // Convert ID to UUID format if needed (planning IDs are often in format "location-date")
  // For planning, we'll generate UUID but also use date+location as unique constraint
  let planningId = planning.id;
  if (!planning.id || !planning.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    planningId = generateUUID();
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

