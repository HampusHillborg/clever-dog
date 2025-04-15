import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaSignOutAlt, FaFilePdf, FaLock } from 'react-icons/fa';
import html2pdf from 'html2pdf.js';

interface ContractData {
  // Common fields
  customerName: string;
  customerAddress: string;
  customerCity: string;
  personalNumber: string;
  dogName: string;
  dogBreed: string;
  dogAge: string;
  chipNumber: string;
  startDate: string;
  endDate: string;
  price: string;
  // Specific fields for different contract types
  contractType: 'daycare' | 'boarding' | 'socialWalk' | 'partTime';
  daysPerWeek?: string; // For part-time contracts
}

const AdminPage: React.FC = () => {
  const { t } = useTranslation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contractData, setContractData] = useState<ContractData>({
    customerName: '',
    customerAddress: '',
    customerCity: '',
    personalNumber: '',
    dogName: '',
    dogBreed: '',
    dogAge: '',
    chipNumber: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 months from now
    price: '',
    contractType: 'daycare',
    daysPerWeek: ''
  });

  // Check if user is already logged in from JWT token in localStorage
  useEffect(() => {
    const checkAuthToken = async () => {
      const token = localStorage.getItem('adminAuthToken');
      if (!token) return;
      
      try {
        const response = await fetch('/.netlify/functions/verify-token', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        if (data.success) {
          setIsLoggedIn(true);
        } else {
          // Token is invalid or expired, clean up localStorage
          localStorage.removeItem('adminAuthToken');
        }
      } catch (err) {
        console.error('Error verifying token:', err);
        localStorage.removeItem('adminAuthToken');
      }
    };
    
    checkAuthToken();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/.netlify/functions/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('adminAuthToken', data.token);
        setIsLoggedIn(true);
      } else {
        setError(data.error || 'Invalid username or password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('adminAuthToken');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setContractData(prev => ({ ...prev, [name]: value }));
  };

  const generateContractHTML = (): string => {
    // Format date as DD/MM/YYYY
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    };

    const today = formatDate(new Date().toISOString());
    
    // Create a simple contract with proper page break controls
    let contractHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Contract</title>
        <style>
          @media print {
            body { 
              margin: 0;
              padding: 0;
            }
            h2 { 
              page-break-after: avoid !important;
            }
            p, li {
              page-break-inside: avoid !important;
            }
            .section {
              page-break-inside: avoid !important;
            }
            .avoid-break {
              page-break-inside: avoid !important;
            }
          }
          
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10pt;
            line-height: 1.2;
            margin: 15mm 12mm;
            color: #000;
          }
          h1 {
            text-align: center;
            font-size: 12pt;
            font-weight: bold;
            margin-bottom: 10px;
            border-bottom: 1px solid #000;
            padding-bottom: 3px;
            color: #2a3f5f;
          }
          h2 {
            font-size: 10pt;
            font-weight: bold;
            margin-top: 10px;
            margin-bottom: 4px;
            color: #2a3f5f;
            border-bottom: 0.5px solid #ddd;
            padding-bottom: 2px;
          }
          p {
            margin: 4px 0;
          }
          ol, ul {
            margin: 4px 0;
            padding-left: 20px;
          }
          li {
            margin-bottom: 2px;
          }
          .section {
            margin-bottom: 8px;
            border-left: 2px solid #f5f5f5;
            padding-left: 6px;
          }
          .signatures {
            margin-top: 20px;
          }
          .signature-line {
            border-top: 1px solid black;
            width: 200px;
            display: inline-block;
            margin-bottom: 2px;
          }
          .date-line {
            border-bottom: 1px solid black;
            width: 250px;
            display: inline-block;
            margin: 0 5px;
          }
          table {
            width: 100%;
            margin-top: 10px;
          }
          td {
            width: 50%;
            padding-top: 5px;
            vertical-align: top;
          }
          /* Compact lists */
          ul li, ol li {
            padding-top: 0;
            padding-bottom: 0;
          }
          /* Inner lists more compact */
          li ul, li ol {
            margin-top: 1px;
            margin-bottom: 1px;
          }
          /* More compact layout overall */
          * {
            box-sizing: border-box;
          }
          .header {
            text-align: center;
            margin-bottom: 15px;
          }
          .company-name {
            font-weight: bold;
            font-size: 11pt;
            color: #2a3f5f;
          }
          .contract-subtitle {
            font-style: italic;
            font-size: 9pt;
            color: #555;
            margin-top: 2px;
          }
          .signature-name {
            font-size: 9pt;
            font-weight: bold;
          }
          .signature-title {
            font-size: 8pt;
            color: #555;
            margin-top: 1px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">CleverDog</div>
          <div class="contract-subtitle">För hundens bästa</div>
        </div>
      
        <h1>AVTAL ${contractData.contractType === 'daycare' ? 'HUNDDAGIS' : 
                      contractData.contractType === 'boarding' ? 'HUNDPENSIONAT' : 
                      contractData.contractType === 'socialWalk' ? 'SOCIAL PROMENAD' : 
                      'DELTID HUNDDAGIS'}</h1>
        
        <p>Ingånget den ${today} mellan:</p>
        <ol>
          <li>CleverDog, beläget på Malmövägen 7 Staffanstorp, organisationsnummer 20020922-5325, 
            företrätt av Alicja Wekwert, hädanefter kallad "Hunddagiset", och</li>
          <li>${contractData.customerName} bosatt i ${contractData.customerCity} på ${contractData.customerAddress}, personnummer ${contractData.personalNumber}, 
            hädanefter kallad "Ägaren", avseende omsorg om hunden:</li>
        </ol>

        <ul class="avoid-break">
          <li>Hundens namn: ${contractData.dogName}</li>
          <li>Ras: ${contractData.dogBreed}</li>
          <li>Ålder: ${contractData.dogAge} år</li>
          <li>Mikrochip-/ tatueringnummer: ${contractData.chipNumber}</li>
        </ul>

        <div class="section avoid-break">
          <h2>§1 Avtalets föremål</h2>
          <ol>
            ${contractData.contractType === 'daycare' ? `
            <li>Hunddagiset åtar sig att ta hand om Ägarens hund och tillhandahålla:
              <ul>
                <li>socialisering med andra hundar,</li>
                <li>grundläggande lydnadsträning,</li>
                <li>lek och fysisk aktivitet,</li>
                <li>utfodring (enligt överenskommelse med Ägaren),</li>
                <li>säkerhet och tillsyn.</li>
              </ul>
            </li>
            <li>Omsorgen erbjuds på vardagar mellan kl. 7:00 och 18:00 (17* Fredag).</li>
            <li>Ägaren åtar sig att lämna och hämta hunden i tid.</li>
            ` : contractData.contractType === 'partTime' ? `
            <li>Hunddagiset åtar sig att ta hand om Ägarens hund ${contractData.daysPerWeek} dagar i veckan och tillhandahålla:
              <ul>
                <li>socialisering med andra hundar,</li>
                <li>grundläggande lydnadsträning,</li>
                <li>lek och fysisk aktivitet,</li>
                <li>utfodring (enligt överenskommelse med Ägaren),</li>
                <li>säkerhet och tillsyn.</li>
              </ul>
            </li>
            <li>Omsorgen erbjuds på vardagar mellan kl. 7:00 och 18:00 (17* Fredag).</li>
            <li>Ägaren åtar sig att lämna och hämta hunden i tid.</li>
            ` : contractData.contractType === 'boarding' ? `
            <li>Hunddagiset åtar sig att ta hand om Ägarens hund under perioden ${formatDate(contractData.startDate)} till ${formatDate(contractData.endDate)} och tillhandahålla:
              <ul>
                <li>boende och övernattning,</li>
                <li>socialisering med andra hundar,</li>
                <li>grundläggande lydnadsträning,</li>
                <li>lek och fysisk aktivitet,</li>
                <li>utfodring (enligt överenskommelse med Ägaren),</li>
                <li>säkerhet och tillsyn dygnet runt.</li>
              </ul>
            </li>
            <li>Ägaren åtar sig att lämna och hämta hunden enligt överenskomna tider.</li>
            ` : `
            <li>Hunddagiset åtar sig att ta hand om Ägarens hund under sociala promenader och tillhandahålla:
              <ul>
                <li>socialisering med andra hundar,</li>
                <li>fysisk aktivitet och stimulans,</li>
                <li>säkerhet och tillsyn under promenaden.</li>
              </ul>
            </li>
            <li>De sociala promenaderna sker på schemalagda tider enligt överenskommelse.</li>
            `}
          </ol>
        </div>
        
        <div class="section avoid-break">
          <h2>§2 Ägarens ansvar</h2>
          <ol>
            <li>Ägaren intygar att hunden är frisk, har aktuella vaccinationer och inte uppvisar aggressivt beteende.</li>
            <li>Ägaren förbinder sig att tillhandahålla:
              <ul>
                ${contractData.contractType === 'boarding' ? `
                <li>hundens hälsobok,</li>
                <li>tillräckligt med foder för vistelsen,</li>
                <li>mediciner om sådana behövs,</li>
                <li>koppel och halsband/sele.</li>
                ` : contractData.contractType === 'socialWalk' ? `
                <li>koppel och halsband/sele,</li>
                <li>information om hundens särskilda behov.</li>
                ` : `
                <li>hundens hälsobok,</li>
                <li>foder (om särskild diet krävs),</li>
                <li>koppel och halsband/sele.</li>
                `}
              </ul>
            </li>
            <li>Ägaren är fullt ansvarig för eventuella skador orsakade av hunden.</li>
          </ol>
        </div>
        
        <div class="section avoid-break">
          <h2>§3 Avgifter</h2>
          <ol>
            ${contractData.contractType === 'daycare' ? `
            <li>Kostnaden för hunddagis är ${contractData.price}kr per månad och ska betalas senast den 27 varje månad.</li>
            <li>Vid frånvaro återbetalas inte avgiften.</li>
            ` : contractData.contractType === 'partTime' ? `
            <li>Kostnaden för deltid hunddagis är ${contractData.price}kr per månad och ska betalas senast den 27 varje månad.</li>
            <li>Vid frånvaro återbetalas inte avgiften.</li>
            ` : contractData.contractType === 'boarding' ? `
            <li>Kostnaden för hundpensionat är ${contractData.price}kr totalt för hela vistelsen och ska betalas i samband med lämning av hunden.</li>
            <li>Vid avbokning mindre än 7 dagar före vistelsen debiteras 50% av priset.</li>
            ` : `
            <li>Kostnaden för sociala promenader är ${contractData.price}kr per gång och ska betalas i förväg.</li>
            <li>Vid avbokning mindre än 24 timmar före promenaden återbetalas inte avgiften.</li>
            `}
          </ol>
        </div>
      
        <div class="section avoid-break">
          <h2>§4 Ansvar</h2>
          <ol>
            <li>Hunddagiset förbinder sig att se till hundens säkerhet, men ansvarar inte för skador som uppstår vid naturliga interaktioner mellan hundar.</li>
            <li>Vid akut sjukdom hos hunden försöker Hunddagiset kontakta Ägaren. Om kontakt inte är möjlig har Hunddagiset rätt att anlita en veterinär på Ägarens bekostnad.</li>
          </ol>
        </div>
        
        <div class="section avoid-break">
          <h2>§5 Avtalstid och uppsägning</h2>
          <ol>
            <li>Avtalet gäller från ${formatDate(contractData.startDate)} till ${formatDate(contractData.endDate)}.</li>
            <li>Vardera parten kan säga upp avtalet med en uppsägningstid på 7 dagar.</li>
            <li>Hunddagiset har rätt att omedelbart säga upp avtalet vid aggressivt beteende hos hunden eller om Ägaren bryter mot reglerna.</li>
          </ol>
        </div>
        
        <div class="section avoid-break">
          <h2>§6 Slutbestämmelser</h2>
          <ol>
            <li>För frågor som inte regleras i detta avtal gäller bestämmelserna i svensk lag.</li>
            <li>Avtalet upprättas i två likalydande exemplar, ett för vardera part.</li>
          </ol>
        </div>
      
        <div class="signatures avoid-break">
          <p>Ort och datum: <span class="date-line"></span></p>
          
          <table style="margin-top: 50px;">
            <tr>
              <td>
                <div class="signature-line"></div>
                <p class="signature-name">CleverDog, Alicja Wekwert</p>
                <p class="signature-title">Verksamhetsägare</p>
              </td>
              <td>
                <div class="signature-line"></div>
                <p class="signature-name">${contractData.customerName}</p>
                <p class="signature-title">Hundägare</p>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;

    return contractHTML;
  };

  const generatePDF = () => {
    const contractHTML = generateContractHTML();
    
    // Create a temporary div to render the HTML content
    const element = document.createElement('div');
    element.innerHTML = contractHTML;
    document.body.appendChild(element);
    
    // PDF options with proper page break handling
    const options = {
      margin: [8, 8, 8, 8],
      filename: `contract-${contractData.contractType}-${contractData.dogName}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { 
        scale: 2,
        useCORS: true
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait',
        compress: true
      },
      pagebreak: {
        mode: ['avoid-all', 'css', 'legacy']
      }
    };

    // Generate PDF
    html2pdf().from(element).set(options).save().then(() => {
      // Remove the temporary element after PDF generation
      document.body.removeChild(element);
    });
  };

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
          <div className="flex justify-center mb-8">
            <FaLock className="text-4xl text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Admin Login</h2>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                required
                disabled={isLoading}
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-colors"
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">CleverDog Admin - Contract Generator</h1>
            <button
              onClick={handleLogout}
              className="flex items-center bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition-colors"
            >
              <FaSignOutAlt className="mr-2" /> Logout
            </button>
          </div>
          
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-xl font-semibold mb-4 border-b pb-2">Contract Type</h2>
                <div className="mb-4">
                  <label htmlFor="contractType" className="block text-sm font-medium text-gray-700 mb-1">Contract Type</label>
                  <select
                    id="contractType"
                    name="contractType"
                    value={contractData.contractType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  >
                    <option value="daycare">Hunddagis (Full-time)</option>
                    <option value="partTime">Hunddagis (Part-time)</option>
                    <option value="boarding">Hundpensionat</option>
                    <option value="socialWalk">Social Promenad</option>
                  </select>
                </div>
                
                {contractData.contractType === 'partTime' && (
                  <div className="mb-4">
                    <label htmlFor="daysPerWeek" className="block text-sm font-medium text-gray-700 mb-1">Days Per Week</label>
                    <input
                      type="text"
                      id="daysPerWeek"
                      name="daysPerWeek"
                      value={contractData.daysPerWeek}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                      placeholder="e.g., 2-3"
                    />
                  </div>
                )}
                
                <div className="mb-4">
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">Price (SEK)</label>
                  <input
                    type="text"
                    id="price"
                    name="price"
                    value={contractData.price}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="e.g., 2500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="mb-4">
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      id="startDate"
                      name="startDate"
                      value={contractData.startDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      id="endDate"
                      name="endDate"
                      value={contractData.endDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <h2 className="text-xl font-semibold mb-4 border-b pb-2">Owner Information</h2>
                <div className="mb-4">
                  <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                  <input
                    type="text"
                    id="customerName"
                    name="customerName"
                    value={contractData.customerName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="e.g., Tina Eriksson"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="customerAddress" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    id="customerAddress"
                    name="customerAddress"
                    value={contractData.customerAddress}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="e.g., Storabackegatan 15d"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="customerCity" className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    id="customerCity"
                    name="customerCity"
                    value={contractData.customerCity}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="e.g., Malmö"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="personalNumber" className="block text-sm font-medium text-gray-700 mb-1">Personal Number</label>
                  <input
                    type="text"
                    id="personalNumber"
                    name="personalNumber"
                    value={contractData.personalNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="e.g., 19711216-3907"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-4 border-b pb-2">Dog Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="mb-4">
                  <label htmlFor="dogName" className="block text-sm font-medium text-gray-700 mb-1">Dog Name</label>
                  <input
                    type="text"
                    id="dogName"
                    name="dogName"
                    value={contractData.dogName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="e.g., Morris"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="dogBreed" className="block text-sm font-medium text-gray-700 mb-1">Dog Breed</label>
                  <input
                    type="text"
                    id="dogBreed"
                    name="dogBreed"
                    value={contractData.dogBreed}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="e.g., Labradoodle"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="dogAge" className="block text-sm font-medium text-gray-700 mb-1">Dog Age (years)</label>
                  <input
                    type="text"
                    id="dogAge"
                    name="dogAge"
                    value={contractData.dogAge}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="e.g., 10"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="chipNumber" className="block text-sm font-medium text-gray-700 mb-1">Microchip/Tattoo Number</label>
                  <input
                    type="text"
                    id="chipNumber"
                    name="chipNumber"
                    value={contractData.chipNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="e.g., 941000016851106"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-center mt-8">
              <button
                type="button"
                onClick={generatePDF}
                className="flex items-center bg-primary text-white py-3 px-6 rounded-md hover:bg-primary-dark transition-colors text-lg"
              >
                <FaFilePdf className="mr-2" /> Generate Contract PDF
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminPage; 