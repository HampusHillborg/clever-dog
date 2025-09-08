exports.handler = async (event, context) => {
  // Hantera CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const formData = JSON.parse(event.body);
    
    // Skapa HTML-mall för e-post
    const htmlEmail = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Intresseanmälan Malmö Jägersro</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f8f9fa;
        }
        .container {
          background: white;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        .header p {
          margin: 10px 0 0 0;
          opacity: 0.9;
          font-size: 16px;
        }
        .content {
          padding: 30px;
        }
        .section {
          margin-bottom: 25px;
          border-left: 4px solid #3b82f6;
          padding-left: 15px;
        }
        .section h2 {
          color: #1e40af;
          margin: 0 0 15px 0;
          font-size: 18px;
          font-weight: 600;
        }
        .info-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        .info-table td {
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .info-table td:first-child {
          font-weight: 600;
          color: #374151;
          width: 40%;
        }
        .info-table td:last-child {
          color: #6b7280;
        }
        .highlight {
          background-color: #fef3c7;
          padding: 15px;
          border-radius: 8px;
          border-left: 4px solid #f59e0b;
          margin: 20px 0;
        }
        .highlight strong {
          color: #92400e;
        }
        .footer {
          background-color: #f8fafc;
          padding: 20px;
          text-align: center;
          color: #6b7280;
          font-size: 14px;
        }
        .logo {
          font-size: 20px;
          font-weight: bold;
          color: #3b82f6;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🐕 Intresseanmälan Malmö Jägersro</h1>
          <p>Nya hunddagiset i Malmö Jägersro</p>
        </div>
        
        <div class="content">
          <div class="highlight">
            <strong>🎉 Ny intresseanmälan mottagen!</strong><br>
            Någon har anmält intresse för det nya hunddagiset i Malmö Jägersro.
          </div>

          <div class="section">
            <h2>👤 Ägarens information</h2>
            <table class="info-table">
              <tr>
                <td>Namn:</td>
                <td>${formData.name || 'Inte angivet'}</td>
              </tr>
              <tr>
                <td>E-post:</td>
                <td>${formData.email || 'Inte angivet'}</td>
              </tr>
              <tr>
                <td>Telefon:</td>
                <td>${formData.phone || 'Inte angivet'}</td>
              </tr>
              <tr>
                <td>Adress:</td>
                <td>${formData.address || 'Inte angivet'}</td>
              </tr>
              <tr>
                <td>Personnummer:</td>
                <td>${formData.personnummer || 'Inte angivet'}</td>
              </tr>
              <tr>
                <td>Mikrochip-nummer:</td>
                <td>${formData.chipNumber || 'Inte angivet'}</td>
              </tr>
            </table>
          </div>

          <div class="section">
            <h2>🐕 Hundens information</h2>
            <table class="info-table">
              <tr>
                <td>Hundens namn:</td>
                <td>${formData.dogName || 'Inte angivet'}</td>
              </tr>
              <tr>
                <td>Ras:</td>
                <td>${formData.dogBreed || 'Inte angivet'}</td>
              </tr>
              <tr>
                <td>Kön:</td>
                <td>${formData.dogGender || 'Inte angivet'}</td>
              </tr>
              <tr>
                <td>Höjd:</td>
                <td>${formData.dogHeight || 'Inte angivet'}</td>
              </tr>
              <tr>
                <td>Ålder:</td>
                <td>${formData.dogAge || 'Inte angivet'}</td>
              </tr>
              <tr>
                <td>Kastrerad/steriliserad:</td>
                <td>${formData.isNeutered || 'Inte angivet'}</td>
              </tr>
            </table>
          </div>

          <div class="section">
            <h2>🧠 Hundens beteende och hälsa</h2>
            <table class="info-table">
              <tr>
                <td>Socialisering:</td>
                <td>${formData.dogSocialization || 'Inte angivet'}</td>
              </tr>
              <tr>
                <td>Problembeteenden:</td>
                <td>${formData.problemBehaviors || 'Inte angivet'}</td>
              </tr>
              <tr>
                <td>Allergier:</td>
                <td>${formData.allergies || 'Inte angivet'}</td>
              </tr>
            </table>
          </div>

          ${formData.additionalInfo ? `
          <div class="section">
            <h2>📝 Ytterligare information</h2>
            <p style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 0;">
              ${formData.additionalInfo}
            </p>
          </div>
          ` : ''}

          <div class="highlight">
            <strong>📍 Plats:</strong> Malmö Jägersro<br>
            <strong>📅 Datum:</strong> ${new Date().toLocaleDateString('sv-SE')}<br>
            <strong>⏰ Tid:</strong> ${new Date().toLocaleTimeString('sv-SE')}
          </div>
        </div>

        <div class="footer">
          <div class="logo">Clever Dog</div>
          <p>Detta är en automatisk e-post från vår webbplats</p>
        </div>
      </div>
    </body>
    </html>
    `;

    // Skicka e-post via Netlify's inbyggda e-postfunktion
    const emailParams = {
      to: 'cleverdog.aw@gmail.com',
      from: 'noreply@cleverdog.se', // Använd din verifierade e-post
      subject: `🐕 Intresseanmälan Malmö Jägersro - ${formData.name || 'Okänd person'}`,
      html: htmlEmail,
    };

    // Använd Netlify's inbyggda e-postfunktion
    const response = await fetch('https://api.netlify.com/api/v1/sites/YOUR_SITE_ID/forms/malmo-interest/submissions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NETLIFY_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'cleverdog.aw@gmail.com',
        subject: emailParams.subject,
        html: emailParams.html,
      }),
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        success: true, 
        message: 'E-post skickat med anpassad styling!' 
      }),
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        error: 'Ett fel uppstod vid skickande av e-post',
        details: error.message 
      }),
    };
  }
};
