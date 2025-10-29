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
  return ((data as any) || []).map((dog: any) => ({
    id: dog.id,
    name: dog.name,
    breed: dog.breed,
    age: dog.age,
    owner: dog.owner,
    phone: dog.phone,
    notes: dog.notes ? String(dog.notes) : undefined,
    color: dog.color,
    locations: (Array.isArray(dog.locations) ? dog.locations : []) as ('malmo' | 'staffanstorp')[],
    type: (dog.type as 'fulltime' | 'parttime-3' | 'parttime-2') || undefined,
  }));
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

  const { data, error } = await supabase!
    .from('dogs')
    .upsert({
      id: dog.id,
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
  return {
    id: dbDog.id,
    name: dbDog.name,
    breed: dbDog.breed,
    age: dbDog.age,
    owner: dbDog.owner,
    phone: dbDog.phone,
    notes: dbDog.notes ? String(dbDog.notes) : undefined,
    color: dbDog.color,
    locations: (Array.isArray(dbDog.locations) ? dbDog.locations : []) as ('malmo' | 'staffanstorp')[],
    type: (dbDog.type as 'fulltime' | 'parttime-3' | 'parttime-2') || undefined,
  };
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

  const { data, error } = await supabase!
    .from('boarding_records')
    .upsert({
      id: record.id,
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

  const { data, error } = await supabase!
    .from('planning_history')
    .upsert({
      id: planning.id,
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

  const { data, error } = await supabase!
    .from('planning_history')
    .select('*')
    .eq('date', date)
    .eq('location', location)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    console.error('Error fetching planning for date:', error);
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

