import { supabase } from './supabase';

export type UserRole = 'admin' | 'employee';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

/**
 * Sign up a new user
 */
export const signUp = async (email: string, password: string): Promise<{ success: boolean; error?: string; user?: AuthUser }> => {
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured' };
  }

  try {
    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'Failed to create user' };
    }

    // Wait a bit for the trigger to create the admin_users entry
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get the user role
    const { data: userData, error: userError } = await supabase
      .from('admin_users')
      .select('role')
      .eq('id', authData.user.id)
      .single() as { data: { role: string } | null; error: any };

    if (userError) {
      console.error('Error fetching user role:', userError);
      // Default to employee if we can't fetch the role
    }

    return {
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email || email,
        role: ((userData as any)?.role as UserRole) || 'employee',
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to sign up' };
  }
};

/**
 * Sign in a user
 */
export const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string; user?: AuthUser }> => {
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured' };
  }

  try {
    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'Failed to sign in' };
    }

    // Get the user role from admin_users table
    const { data: userData, error: userError } = await supabase
      .from('admin_users')
      .select('role, email')
      .eq('id', authData.user.id)
      .single();

    if (userError) {
      console.error('Error fetching user role:', userError);
      // If user doesn't exist in admin_users, create it with default role
      const { error: insertError } = await supabase
        .from('admin_users')
        .insert({
          id: authData.user.id,
          email: authData.user.email || email,
          role: 'employee',
        } as any);

      if (insertError) {
        console.error('Error creating admin_users entry:', insertError);
      }
    }

    return {
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email || email,
        role: ((userData as any)?.role as UserRole) || 'employee',
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to sign in' };
  }
};

/**
 * Sign out the current user
 */
export const signOut = async (): Promise<{ success: boolean; error?: string }> => {
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured' };
  }

  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to sign out' };
  }
};

/**
 * Get the current authenticated user
 */
export const getCurrentUser = async (): Promise<AuthUser | null> => {
  if (!supabase) {
    return null;
  }

  try {
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return null;
    }

    // Get the user role from admin_users table
    const { data: userData, error: userError } = await supabase
      .from('admin_users')
      .select('role, email')
      .eq('id', session.user.id)
      .single() as { data: { role: string; email: string } | null; error: any };

    if (userError) {
      console.error('Error fetching user role:', userError);
      return null;
    }

    return {
      id: session.user.id,
      email: session.user.email || (userData as any)?.email || '',
      role: ((userData as any)?.role as UserRole) || 'employee',
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

/**
 * Update user role (admin only function)
 */
export const updateUserRole = async (userId: string, newRole: UserRole): Promise<{ success: boolean; error?: string }> => {
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured' };
  }

  try {
    // Use RPC call or direct SQL update if table not in types
    const updateData: any = { role: newRole, updated_at: new Date().toISOString() };
    const { error } = await (supabase.from('admin_users' as any) as any)
      .update(updateData)
      .eq('id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update user role' };
  }
};

/**
 * Listen to auth state changes
 */
export const onAuthStateChange = (callback: (user: AuthUser | null) => void) => {
  if (!supabase) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  }

  const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const user = await getCurrentUser();
      callback(user);
    } else {
      callback(null);
    }
  });

  return { data };
};

