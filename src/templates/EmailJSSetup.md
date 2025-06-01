# EmailJS Setup Instructions

## 1. Create an EmailJS Account

1. Go to [EmailJS website](https://www.emailjs.com/) and sign up for an account.
2. Verify your email address.

## 2. Set up Email Service

1. In your EmailJS dashboard, navigate to "Email Services"
2. Click "Add New Service"
3. Choose your email provider (Gmail, Outlook, etc.)
4. Follow the authentication steps
5. Name your service (e.g., "clever-dog-service") and save it
6. Note your Service ID (format: "service_xxxxxxx")

## 3. Create Email Templates

### Booking Form Template

1. Go to "Email Templates" in your dashboard
2. Click "Create New Template"
3. Name it (e.g., "booking-form")
4. Design your email template with the following content:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #f0a868;
      color: white;
      padding: 20px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .content {
      background-color: #f9f9f9;
      padding: 20px;
      border-radius: 0 0 8px 8px;
      border: 1px solid #e0e0e0;
      border-top: none;
    }
    h1 {
      margin: 0;
      font-size: 24px;
    }
    h2 {
      margin-top: 20px;
      font-size: 20px;
      color: #f0a868;
      border-bottom: 2px solid #f0a868;
      padding-bottom: 5px;
    }
    .section {
      margin-bottom: 20px;
    }
    .field {
      margin-bottom: 10px;
    }
    .field:empty {
      display: none;
    }
    strong {
      color: #333;
    }
    .footer {
      margin-top: 30px;
      font-size: 12px;
      text-align: center;
      color: #888;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    td {
      padding: 8px;
      vertical-align: top;
    }
    .label {
      font-weight: bold;
      width: 40%;
    }
    .empty-value {
      color: #999;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>New Booking Request: {{inquiry_type}}</h1>
  </div>
  
  <div class="content">
    <div class="section">
      <h2>Owner Information</h2>
      <table>
        <tr>
          <td class="label">Name:</td>
          <td>{{from_name}}</td>
        </tr>
        <tr>
          <td class="label">Email:</td>
          <td>{{from_email}}</td>
        </tr>
        <tr>
          <td class="label">Phone:</td>
          <td>{{phone}}</td>
        </tr>
        <tr>
          <td class="label">Address:</td>
          <td>{{address}}</td>
        </tr>
        <tr>
          <td class="label">Personal Number:</td>
          <td>{{personnummer}}</td>
        </tr>
      </table>
    </div>
    
    <div class="section">
      <h2>Dog Information</h2>
      <table>
        <tr>
          <td class="label">Dog Name:</td>
          <td>{{dog_name}}</td>
        </tr>
        <tr>
          <td class="label">Breed:</td>
          <td>{{dog_breed}}</td>
        </tr>
        <tr>
          <td class="label">Gender:</td>
          <td>{{dog_gender}}</td>
        </tr>
        <tr>
          <td class="label">Age:</td>
          <td>{{dog_age}}</td>
        </tr>
        <tr>
          <td class="label">Height:</td>
          <td>{{dog_height}}</td>
        </tr>
        <tr>
          <td class="label">Neutered/Spayed:</td>
          <td>{{is_neutered}}</td>
        </tr>
        <tr>
          <td class="label">Chip Number:</td>
          <td>{{chip_number}}</td>
        </tr>
      </table>
    </div>
    
    <!-- Dog Behavior Section (only displayed for service bookings) -->
    <div class="section" id="behaviorSection">
      <h2>Dog Behavior</h2>
      <table>
        <tr>
          <td class="label">Socialization:</td>
          <td>{{dog_socialization}}</td>
        </tr>
        <tr>
          <td class="label">Problem Behaviors:</td>
          <td>{{problem_behaviors}}</td>
        </tr>
        <tr>
          <td class="label">Allergies:</td>
          <td>{{allergies}}</td>
        </tr>
      </table>
    </div>
    
    <!-- Booking Details Section -->
    <div class="section">
      <h2>Booking Details</h2>
      <table>
        <tr>
          <td class="label">Inquiry Type:</td>
          <td>{{inquiry_type}}</td>
        </tr>
        
        <!-- For monthly/part-time/single day options -->
        <tr id="startDateRow">
          <td class="label">Start Date:</td>
          <td>{{start_date}}</td>
        </tr>
        
        <!-- For part-time options -->
        <tr id="partTimeDaysRow">
          <td class="label">Selected Days:</td>
          <td>{{part_time_days}}</td>
        </tr>
        
        <!-- For boarding options -->
        <tr id="endDateRow">
          <td class="label">End Date:</td>
          <td>{{end_date}}</td>
        </tr>
        
        <!-- For all inquiries -->
        <tr>
          <td class="label">Additional Info:</td>
          <td>{{additional_info}}</td>
        </tr>
      </table>
    </div>
    
    <div class="footer">
      <p>This email was sent from the Clever Dog website booking form on {{request_date}}.</p>
      <p>To respond, simply reply to this email or contact the customer directly.</p>
    </div>
  </div>

  <script>
    // Simple script to hide empty rows in the email
    document.addEventListener('DOMContentLoaded', function() {
      const cells = document.querySelectorAll('td');
      cells.forEach(cell => {
        if (!cell.textContent.trim()) {
          const row = cell.parentElement;
          if (row && row.cells.length > 1) {
            if (!row.cells[1].textContent.trim()) {
              row.style.display = 'none';
            }
          }
        }
      });
      
      // Check if behavior section is empty and hide if needed
      const behaviorSection = document.getElementById('behaviorSection');
      if (behaviorSection) {
        let hasContent = false;
        behaviorSection.querySelectorAll('td:nth-child(2)').forEach(cell => {
          if (cell.textContent.trim()) {
            hasContent = true;
          }
        });
        if (!hasContent) {
          behaviorSection.style.display = 'none';
        }
      }
    });
  </script>
</body>
</html>
```

5. Save the template and note the Template ID (format: "template_yyyyyyyyy")

### Auto-Reply Template

1. Create another email template
2. Name it (e.g., "booking-auto-reply")
3. Design your auto-reply email with the following content:

```html
<h1>Thank You for Your Booking Request</h1>

<p>Dear {{from_name}},</p>

<p>Thank you for your booking request with Clever Dog. We have received your inquiry and will review it shortly.</p>

<p>We typically respond within 24-48 hours. If you have any urgent matters, please feel free to contact us directly.</p>

<h2>Your Booking Details</h2>
<p><strong>Dog Name:</strong> {{dog_name}}</p>
<p><strong>Inquiry Type:</strong> {{inquiry_type}}</p>
<p><strong>Request Date:</strong> {{request_date}}</p>

<p>Best regards,<br>
Clever Dog Team</p>
```

4. Save the template and note the Template ID (format: "template_zzzzzzzzz")

## 4. Configure Environment Variables

1. Find or create a `.env` file in the root of your project
2. Add the following environment variables with your actual EmailJS credentials:

```
VITE_EMAILJS_SERVICE_ID=your_service_id_here
VITE_EMAILJS_BOOKING_TEMPLATE_ID=your_booking_template_id_here
VITE_EMAILJS_AUTOREPLY_TEMPLATE_ID=your_autoreply_template_id_here
VITE_EMAILJS_PUBLIC_KEY=your_public_key_here
```

3. Replace the placeholder values with your actual IDs from EmailJS
   - Service ID: Found in "Email Services" section
   - Template IDs: Found in "Email Templates" section for each template
   - Public Key: Found in "Account" > "API Keys" section

4. Make sure the `.env` file is included in your `.gitignore` to keep your credentials secure

## 5. Testing Your Setup

1. Make sure EmailJS is installed: `npm install @emailjs/browser`
2. Fill out the booking form and submit it
3. Check both your email and the customer's email to verify the emails are being sent correctly

## 6. Troubleshooting

- If emails are not being sent, check the browser console for any errors
- Verify your EmailJS service is properly authorized
- Ensure your email templates have the correct variable names matching those in your code
- Check that environment variables are properly loaded by logging `import.meta.env.VITE_EMAILJS_SERVICE_ID` (without the actual value) to verify 