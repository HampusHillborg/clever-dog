
// Denna funktion används inte längre eftersom vi använder EmailJS istället
// EmailJS hanteras direkt från frontend-koden

exports.handler = async (event, context) => {
  return {
    statusCode: 410, // Gone - denna funktion används inte längre
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      message: 'Denna funktion används inte längre. Använd EmailJS istället.' 
    }),
  };
};
