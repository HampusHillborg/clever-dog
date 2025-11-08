// Netlify Function: create-staff-user
// Creates a new user in Supabase Auth and admin_users table
// Only accessible by admin users

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  try {
    // Parse request body
    const { email, password, name, phone, location, position, hireDate, notes } = JSON.parse(event.body);

    // Validate required fields
    if (!email || !password || !name) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          error: 'Email, password och namn är obligatoriska fält' 
        }),
      };
    }

    // Get authorization token from headers
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Ingen autentiseringstoken' }),
      };
    }

    // Initialize Supabase clients
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Serverkonfiguration saknas' }),
      };
    }

    // Create Supabase client with user's token (to verify they're authenticated)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Verify user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Ogiltig autentisering' }),
      };
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('admin_users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'admin') {
      return {
        statusCode: 403,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Endast admin kan skapa anställda' }),
      };
    }

    // Create Supabase Admin client (with service role key)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Create user in Supabase Auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          error: createError.message || 'Kunde inte skapa användare' 
        }),
      };
    }

    if (!newUser.user) {
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Användare skapades men inget ID returnerades' }),
      };
    }

    // Wait a bit for the trigger to create admin_users entry
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify admin_users entry was created (by trigger)
    const { data: adminUserData, error: adminUserError } = await supabaseAdmin
      .from('admin_users')
      .select('id, email, role')
      .eq('id', newUser.user.id)
      .single();

    if (adminUserError) {
      // If trigger didn't work, create it manually
      const { error: insertError } = await supabaseAdmin
        .from('admin_users')
        .insert({
          id: newUser.user.id,
          email: newUser.user.email || email,
          role: 'employee',
        });

      if (insertError) {
        console.error('Error creating admin_users entry:', insertError);
        // Continue anyway - the user exists in auth
      }
    }

    // Create employee record
    const { data: employeeData, error: employeeError } = await supabaseAdmin
      .from('employees')
      .insert({
        id: newUser.user.id,
        name,
        phone: phone || null,
        location: location || 'both',
        position: position || null,
        hire_date: hireDate || null,
        notes: notes || null,
        is_active: true,
      })
      .select()
      .single();

    if (employeeError) {
      console.error('Error creating employee record:', employeeError);
      // User was created but employee record failed
      // Return partial success with warning
      return {
        statusCode: 201,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: true,
          userId: newUser.user.id,
          email: newUser.user.email,
          warning: 'Användare skapades men anställd-posten kunde inte skapas. Skapa den manuellt i admin-panelen.',
          error: employeeError.message,
        }),
      };
    }

    return {
      statusCode: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        userId: newUser.user.id,
        email: newUser.user.email,
        employee: {
          id: employeeData.id,
          name: employeeData.name,
          email: newUser.user.email,
        },
      }),
    };
  } catch (error) {
    console.error('Error in create-staff-user function:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        error: 'Ett oväntat fel uppstod',
        details: error.message 
      }),
    };
  }
};

