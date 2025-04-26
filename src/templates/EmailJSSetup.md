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
<h1>New Booking Request</h1>

<p><strong>Name:</strong> {{from_name}}</p>
<p><strong>Email:</strong> {{from_email}}</p>
<p><strong>Phone:</strong> {{phone}}</p>

<h2>Dog Information</h2>
<p><strong>Dog Name:</strong> {{dog_name}}</p>
<p><strong>Breed:</strong> {{dog_breed}}</p>
<p><strong>Gender:</strong> {{dog_gender}}</p>
<p><strong>Height:</strong> {{dog_height}}</p>
<p><strong>Neutered/Spayed:</strong> {{is_neutered}}</p>
<p><strong>Socialization:</strong> {{dog_socialization}}</p>
<p><strong>Problem Behaviors:</strong> {{problem_behaviors}}</p>
<p><strong>Allergies:</strong> {{allergies}}</p>

<h2>Booking Details</h2>
<p><strong>Inquiry Type:</strong> {{inquiry_type}}</p>
<p><strong>Start Date:</strong> {{start_date}}</p>
<p><strong>End Date:</strong> {{end_date}}</p>
<p><strong>Part-time Days:</strong> {{part_time_days}}</p>
<p><strong>Additional Info:</strong> {{additional_info}}</p>
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