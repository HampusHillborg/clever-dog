const { createClient } = require('@supabase/supabase-js');

/**
 * Netlify Function to create staff users with login accounts
 * Only admin users can create new accounts
 * Uses Supabase Admin API (service role key) to create users
 */
exports.handler = async function(event, context) {
  // Handle CORS preflight
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

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    };
  }

  try {
    // Get environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Supabase environment variables not configured');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server configuration error' }),
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      };
    }

    // Get Authorization header (Supabase session token)
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'No authorization token provided' }),
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      };
    }

    const sessionToken = authHeader.split(' ')[1];

    // Create Supabase client for user verification (anon key)
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseAnonKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server configuration error' }),
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      };
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    
    // Verify the user's session and get their role
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(sessionToken);
    
    if (userError || !user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid or expired session' }),
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      };
    }

    // Check if user is admin
    const { data: adminUser, error: adminError } = await supabaseClient
      .from('admin_users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminError || !adminUser || adminUser.role !== 'admin') {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Only admin users can create staff accounts' }),
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      };
    }

    // Parse request body
    const body = JSON.parse(event.body);
    const { email, password, name, phone, location, role } = body;

    // Validate required fields
    if (!email || !password || !name) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email, password, and name are required' }),
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      };
    }

    // Validate password length
    if (password.length < 6) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Password must be at least 6 characters long' }),
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid email format' }),
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      };
    }

    // Validate location if provided
    if (location && !['malmo', 'staffanstorp', 'both'].includes(location)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Location must be either "malmo", "staffanstorp", or "both"' }),
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      };
    }

    // Validate role if provided
    const employeeRole = role || 'employee';
    if (!['employee', 'platschef'].includes(employeeRole)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Role must be either "employee" or "platschef"' }),
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      };
    }

    // Create Supabase Admin client (with service role key)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Create user in Supabase Auth using Admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    });

    if (authError) {
      console.error('Error creating user in Auth:', authError);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: authError.message || 'Failed to create user account' }),
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      };
    }

    if (!authData.user) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to create user account' }),
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      };
    }

    const userId = authData.user.id;

    // Wait a moment for the trigger to create admin_users entry
    await new Promise(resolve => setTimeout(resolve, 500));

    // Update admin_users role if needed (should be 'employee' by default from trigger)
    // But we might want to set it to 'platschef' if that's what was requested
    // Note: admin_users.role is separate from employees.role
    // admin_users.role controls access (admin/employee/platschef)
    // employees.role is just metadata (employee/platschef)
    if (employeeRole === 'platschef') {
      const { error: updateRoleError } = await supabaseAdmin
        .from('admin_users')
        .update({ role: 'platschef' })
        .eq('id', userId);

      if (updateRoleError) {
        console.error('Error updating admin_users role:', updateRoleError);
        // Continue anyway - the user was created
      }
    }

    // Create employee record in employees table (without email/role - those are in admin_users)
    const employeeData = {
      id: userId,
      name,
      phone: phone || null,
      location: location || null,
      position: null, // Can be set later
      hire_date: null, // Can be set later
      notes: null,
      is_active: true,
    };

    const { data: employeeDataResult, error: employeeError } = await supabaseAdmin
      .from('employees')
      .insert(employeeData)
      .select()
      .single();

    if (employeeError) {
      console.error('Error creating employee record:', employeeError);
      // Try to clean up the auth user if employee creation fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to create employee record: ' + employeeError.message }),
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      };
    }

    // Return success
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        user: {
          id: userId,
          email: authData.user.email,
          name,
          phone,
          location,
          role: employeeRole,
        },
        message: 'Staff user created successfully',
      }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    };

  } catch (error) {
    console.error('Error in create-staff-user:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error: ' + error.message }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    };
  }
};

