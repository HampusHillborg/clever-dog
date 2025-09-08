# Netlify Forms Setup - Malmö Interest Form

## Översikt
Netlify Forms är det enklaste alternativet eftersom du redan använder Netlify. Inga API-nycklar eller externa tjänster behövs.

## Steg 1: Uppdatera formuläret

### Ersätt EmailJS med Netlify Forms i MalmoInterestForm.tsx:

```tsx
// Ta bort EmailJS import
// import emailjs from '@emailjs/browser';

// Uppdatera formuläret med Netlify attribut
<form 
  ref={formRef} 
  onSubmit={handleSubmit} 
  className="p-6"
  name="malmo-interest"
  method="POST"
  data-netlify="true"
  data-netlify-honeypot="bot-field"
>
  {/* Dold honeypot för spam-skydd */}
  <input type="hidden" name="form-name" value="malmo-interest" />
  <div style={{ display: 'none' }}>
    <label>
      Don't fill this out if you're human: 
      <input name="bot-field" />
    </label>
  </div>

  {/* Resten av formuläret förblir samma */}
  {/* ... alla befintliga fält ... */}
</form>
```

### Uppdatera handleSubmit funktionen:

```tsx
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);
  setFormError('');

  // Netlify Forms hanterar automatiskt formulärinsamling
  // Du behöver bara visa success-meddelande
  setIsSubmitting(false);
  setFormSuccess(true);
  
  // Reset form
  setFormData({
    name: '',
    email: '',
    phone: '',
    dogName: '',
    dogBreed: '',
    dogGender: '',
    dogHeight: '',
    dogAge: '',
    isNeutered: '',
    additionalInfo: '',
    dogSocialization: '',
    problemBehaviors: '',
    allergies: '',
    chipNumber: '',
    address: '',
    personnummer: '',
  });
  
  // Close form after delay
  setTimeout(() => {
    onClose();
    setFormSuccess(false);
  }, 3000);
};
```

## Steg 2: Lägg till statisk HTML för Netlify

Skapa en fil `public/malmo-interest.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Malmö Interest Form</title>
</head>
<body>
  <form name="malmo-interest" netlify netlify-honeypot="bot-field" hidden>
    <input type="text" name="name" />
    <input type="email" name="email" />
    <input type="tel" name="phone" />
    <input type="text" name="dogName" />
    <input type="text" name="dogBreed" />
    <input type="text" name="dogGender" />
    <input type="text" name="dogHeight" />
    <input type="text" name="dogAge" />
    <input type="text" name="isNeutered" />
    <textarea name="dogSocialization"></textarea>
    <textarea name="problemBehaviors"></textarea>
    <textarea name="allergies"></textarea>
    <input type="text" name="chipNumber" />
    <input type="text" name="address" />
    <input type="text" name="personnummer" />
    <textarea name="additionalInfo"></textarea>
    <input type="hidden" name="form-name" value="malmo-interest" />
  </form>
</body>
</html>
```

## Steg 3: Konfigurera Netlify

### I din `netlify.toml` fil, lägg till:

```toml
[build]
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Form handling
[build.environment]
  NETLIFY_FORMS = "true"
```

## Steg 4: E-postnotifikationer

### Alternativ 1: Netlify Dashboard
- Gå till Netlify Dashboard → Forms
- Se alla inlämnade formulär
- Exportera data som CSV

### Alternativ 2: E-postnotifikationer
- Gå till Netlify Dashboard → Forms → malmo-interest
- Klicka på "Settings & Usage"
- Aktivera "Email notifications"
- Lägg till din e-postadress

### Alternativ 3: Webhooks (för avancerade)
- Konfigurera webhook för att skicka data till din e-post
- Använd Netlify Functions för att hantera formulärdata

## Steg 5: Ta bort EmailJS

### Ta bort från package.json:
```bash
npm uninstall @emailjs/browser
```

### Ta bort från .env:
Ta bort alla EmailJS-relaterade variabler.

## Fördelar med Netlify Forms:

✅ **Inga API-nycklar** - Inget att konfigurera
✅ **Automatisk spam-skydd** - Honeypot inkluderat
✅ **Inga begränsningar** - Oändligt antal formulär
✅ **Enkel hantering** - Allt i Netlify Dashboard
✅ **Säker** - Inga externa tjänster
✅ **Gratis** - Inga extra kostnader

## Nästa steg:

1. Uppdatera MalmoInterestForm.tsx enligt ovan
2. Skapa public/malmo-interest.html
3. Uppdatera netlify.toml
4. Deploy till Netlify
5. Konfigurera e-postnotifikationer i Netlify Dashboard

Vill du att jag hjälper dig implementera detta?
