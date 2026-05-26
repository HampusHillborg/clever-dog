const { createClient } = require('@supabase/supabase-js');

/**
 * Netlify Function to delete a staff user completely.
 * Deletes the auth.users row (which cascades admin_users) AND the employees row.
 * Only admins can call this.
 */
exports.handler = async function(event) {
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

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method Not Allowed' });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
      return jsonResponse(500, { error: 'Server configuration error' });
    }

    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse(401, { error: 'No authorization token provided' });
    }
    const sessionToken = authHeader.split(' ')[1];

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(sessionToken);
    if (userError || !user) {
      return jsonResponse(401, { error: 'Invalid or expired session' });
    }

    const { data: adminUser } = await supabaseAdmin
      .from('admin_users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!adminUser || adminUser.role !== 'admin') {
      return jsonResponse(403, { error: 'Only admin users can delete staff accounts' });
    }

    let body;
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch {
      return jsonResponse(400, { error: 'Invalid JSON in request body' });
    }
    if (!body || !body.user_id) {
      return jsonResponse(400, { error: 'user_id is required' });
    }
    if (body.user_id === user.id) {
      return jsonResponse(400, { error: 'Du kan inte ta bort ditt eget konto.' });
    }

    // Delete the employees row first (no FK cascade from admin_users → employees)
    const { error: empErr } = await supabaseAdmin
      .from('employees')
      .delete()
      .eq('id', body.user_id);
    if (empErr) {
      console.error('Error deleting employee row:', empErr);
    }

    // Delete the auth user — this cascades to admin_users via FK ON DELETE CASCADE
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(body.user_id);
    if (authErr) {
      console.error('Error deleting auth user:', authErr);
      return jsonResponse(500, { error: authErr.message || 'Failed to delete auth user' });
    }

    return jsonResponse(200, { success: true });
  } catch (error) {
    console.error('Error in delete-staff-user:', error);
    return jsonResponse(500, {
      error: 'Internal Server Error',
      details: error.message || 'An unexpected error occurred',
    });
  }
};

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    body: JSON.stringify(payload),
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
  };
}
