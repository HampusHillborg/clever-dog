# EmailJS Setup för Malmö

## 1. Skapa ny EmailJS Service

1. Gå till [EmailJS Dashboard](https://dashboard.emailjs.com/)
2. Klicka på "Add New Service"
3. Välj "Gmail" som email service
4. Ange följande inställningar:
   - **Service Name**: `service_malmo`
   - **Email**: `cleverdog.malmo@gmail.com`
   - **Password**: [Ange lösenordet för Gmail-kontot]

## 2. Skapa Email Templates

### Template 1: Malmö Bokning (template_malmo_booking)

**Template ID**: `template_malmo_booking`
**Subject**: `Ny bokning från {{from_name}} - Malmö`

**HTML Content**:
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Ny bokning - Malmö</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #f97316; border-bottom: 2px solid #f97316; padding-bottom: 10px;">
            Ny bokning - Malmö
        </h2>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Kontaktinformation</h3>
            <p><strong>Namn:</strong> {{from_name}}</p>
            <p><strong>E-post:</strong> {{from_email}}</p>
            <p><strong>Telefon:</strong> {{phone}}</p>
        </div>

        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #856404; margin-top: 0;">Tjänstval</h3>
            <p><strong>Tjänsttyp:</strong> {{service_type}}</p>
            {{#if days_per_week}}
            <p><strong>Dagar per vecka:</strong> {{days_per_week}}</p>
            {{/if}}
        </div>

        {{#if dog_name}}
        <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #0c5460; margin-top: 0;">Hundinformation</h3>
            <p><strong>Hundens namn:</strong> {{dog_name}}</p>
            <p><strong>Ras:</strong> {{dog_breed}}</p>
            <p><strong>Kön:</strong> {{dog_gender}}</p>
            <p><strong>Mankhöjd:</strong> {{dog_height}}</p>
            <p><strong>Ålder:</strong> {{dog_age}}</p>
            <p><strong>Kastrerad/steriliserad:</strong> {{is_neutered}}</p>
            {{#if start_date}}
            <p><strong>Startdatum:</strong> {{start_date}}</p>
            {{/if}}
        </div>
        {{/if}}

        {{#if dog_socialization}}
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #495057; margin-top: 0;">Socialisering med andra hundar</h3>
            <p>{{dog_socialization}}</p>
        </div>
        {{/if}}

        {{#if problem_behaviors}}
        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #856404; margin-top: 0;">Problematiska beteenden</h3>
            <p>{{problem_behaviors}}</p>
        </div>
        {{/if}}

        {{#if allergies}}
        <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #721c24; margin-top: 0;">Allergier</h3>
            <p>{{allergies}}</p>
        </div>
        {{/if}}

        {{#if message}}
        <div style="background-color: #e2e3e5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #383d41; margin-top: 0;">Ytterligare information</h3>
            <p>{{message}}</p>
        </div>
        {{/if}}

        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; color: #6c757d; font-size: 14px;">
                Detta meddelande skickades från Clever Dog Malmö bokningsformulär
            </p>
        </div>
    </div>
</body>
</html>
```

### Template 2: Auto-svar till kund (template_malmo_auto_reply)

**Template ID**: `template_malmo_auto_reply`
**Subject**: `Tack för din förfrågan - Clever Dog Malmö`

**HTML Content**:
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Tack för din förfrågan</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #f97316; margin: 0;">Clever Dog Malmö</h1>
            <p style="color: #666; margin: 5px 0;">Hunddagis i Jägersro</p>
        </div>

        <h2 style="color: #333;">Hej {{from_name}}!</h2>
        
        <p>Tack för din förfrågan om våra tjänster i Malmö. Vi har mottagit din bokning och kommer att kontakta dig inom 2-3 arbetsdagar för att diskutera dina behov.</p>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Din förfrågan</h3>
            <p><strong>Tjänst:</strong> {{service_type}}</p>
            {{#if days_per_week}}
            <p><strong>Dagar per vecka:</strong> {{days_per_week}}</p>
            {{/if}}
            {{#if dog_name}}
            <p><strong>Hund:</strong> {{dog_name}} ({{dog_breed}}, {{dog_age}} år)</p>
            {{/if}}
        </div>

        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #856404; margin-top: 0;">Nästa steg</h3>
            <ul style="margin: 0; padding-left: 20px;">
                <li>Vi granskar din förfrågan</li>
                <li>Vi kontaktar dig för att diskutera detaljer</li>
                <li>Vi skickar en bekräftelse om platsen</li>
            </ul>
        </div>

        <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #0c5460; margin-top: 0;">Kontakt</h3>
            <p><strong>E-post:</strong> cleverdog.malmo@gmail.com</p>
            <p><strong>Plats:</strong> Jägersro, Malmö</p>
        </div>

        <p style="text-align: center; color: #666; font-size: 14px; margin-top: 30px;">
            Med vänliga hälsningar,<br>
            Clever Dog Malmö Team
        </p>
    </div>
</body>
</html>
```

## 3. Uppdatera MalmoBookingForm.tsx

Ersätt `YOUR_PUBLIC_KEY` i `MalmoBookingForm.tsx` med din EmailJS public key:

```typescript
await emailjs.send(
  'service_malmo', // Service ID för Malmö
  'template_malmo_booking', // Template ID för Malmö bokning
  templateParams,
  'YOUR_ACTUAL_PUBLIC_KEY' // Ersätt med din riktiga EmailJS public key
);
```

## 4. Testa formuläret

1. Gå till Malmö-sidan
2. Klicka på "Boka plats"
3. Fyll i formuläret
4. Kontrollera att e-post skickas till `cleverdog.malmo@gmail.com`
5. Kontrollera att kunden får auto-svar

## 5. Översättningar för templates

Om du vill ha templates på engelska och polska, skapa separata templates:
- `template_malmo_booking_en`
- `template_malmo_booking_pl`
- `template_malmo_auto_reply_en`
- `template_malmo_auto_reply_pl`
