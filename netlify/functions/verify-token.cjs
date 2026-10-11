const jwt = require('jsonwebtoken');

exports.handler = async function(event, context) {
  // Allow only GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
      headers: {
        'Allow': 'GET',
        'Content-Type': 'application/json'
      }
    };
  }

  try {
    // Get token from the Authorization header
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'No token provided' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }
    
    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      console.error('JWT secret not configured properly');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server configuration error' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }
    
    // Verify token
    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) {
        return {
          statusCode: 401,
          body: JSON.stringify({ 
            success: false,
            error: 'Invalid or expired token' 
          }),
          headers: { 'Content-Type': 'application/json' }
        };
      }
    });
    
    // If we reach here, token is valid
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: 'Token is valid' 
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  } catch (error) {
    console.error('Error verifying token:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
}; 