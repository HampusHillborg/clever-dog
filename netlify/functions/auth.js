const jwt = require('jsonwebtoken');

// Environment variables should be set in Netlify dashboard
// ADMIN_USERNAME, ADMIN_PASSWORD, JWT_SECRET

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
      headers: {
        'Allow': 'POST',
        'Content-Type': 'application/json'
      }
    };
  }

  try {
    // Parse the incoming request body
    const { username, password } = JSON.parse(event.body);
    
    // Get credentials from environment variables
    const correctUsername = process.env.ADMIN_USERNAME;
    const correctPassword = process.env.ADMIN_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;
    
    // Simple validation - in production you'd want more security
    if (!correctUsername || !correctPassword || !jwtSecret) {
      console.error('Environment variables not properly configured');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server configuration error' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }
    
    // Check credentials
    if (username === correctUsername && password === correctPassword) {
      // Generate JWT token that expires in 12 hours
      const token = jwt.sign(
        { 
          username,
          exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60) 
        }, 
        jwtSecret
      );
      
      // Return success with token
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true,
          token,
          expiresIn: 12 * 60 * 60 
        }),
        headers: { 'Content-Type': 'application/json' }
      };
    } else {
      // Return error for invalid credentials
      return {
        statusCode: 401,
        body: JSON.stringify({ 
          success: false,
          error: 'Invalid username or password' 
        }),
        headers: { 'Content-Type': 'application/json' }
      };
    }
  } catch (error) {
    console.error('Error processing authentication:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
}; 