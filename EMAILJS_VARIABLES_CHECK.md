# EmailJS Variables Check - Malmö Interest Form

## Variables sent from MalmoInterestForm.tsx:

```javascript
const templateParams = {
  from_name: formData.name,                    // ✅
  from_email: formData.email,                  // ✅
  phone: formData.phone,                       // ✅
  dog_name: formData.dogName,                  // ✅
  dog_breed: formData.dogBreed,                // ✅
  dog_gender: formData.dogGender,              // ✅
  dog_height: formData.dogHeight,              // ✅
  dog_age: formData.dogAge,                    // ✅
  is_neutered: formData.isNeutered,            // ✅
  dog_socialization: formData.dogSocialization, // ✅
  problem_behaviors: formData.problemBehaviors, // ✅
  allergies: formData.allergies,               // ✅
  chip_number: formData.chipNumber,            // ✅
  address: formData.address,                   // ✅
  personnummer: formData.personnummer,         // ✅
  additional_info: formData.additionalInfo,    // ✅
  reply_to: formData.email,                    // ✅
  request_date: new Date().toLocaleDateString(), // ✅
  location: 'Malmö Jägersro'                   // ✅
};
```

## Variables used in EmailJS Admin Template:

### Owner Information Section:
- ✅ `{{from_name}}` - Namn
- ✅ `{{from_email}}` - E-post
- ✅ `{{phone}}` - Telefon
- ✅ `{{address}}` - Adress
- ✅ `{{personnummer}}` - Personnummer
- ✅ `{{chip_number}}` - Mikrochip-nummer

### Dog Information Section:
- ✅ `{{dog_name}}` - Hundens namn
- ✅ `{{dog_breed}}` - Ras
- ✅ `{{dog_gender}}` - Kön
- ✅ `{{dog_height}}` - Höjd
- ✅ `{{dog_age}}` - Ålder
- ✅ `{{is_neutered}}` - Kastrerad/steriliserad

### Dog Behavior and Health Section:
- ✅ `{{dog_socialization}}` - Socialisering
- ✅ `{{problem_behaviors}}` - Problembeteenden
- ✅ `{{allergies}}` - Allergier/hälsoproblem

### Additional Information Section:
- ✅ `{{additional_info}}` - Ytterligare information

### Footer Information:
- ✅ `{{request_date}}` - Anmälningsdatum
- ✅ `{{location}}` - Plats (Malmö Jägersro)

## Variables used in EmailJS Auto-Reply Template:

### Header:
- ✅ `{{location}}` - Plats badge

### Content:
- ✅ `{{from_name}}` - Kundens namn
- ✅ `{{dog_name}}` - Hundens namn
- ✅ `{{request_date}}` - Anmälningsdatum
- ✅ `{{location}}` - Plats

## Status: ✅ ALL VARIABLES MATCH CORRECTLY

All variables sent from the form are properly used in both EmailJS templates. The templates are correctly configured and ready to use.

## Next Steps:
1. Copy the admin template HTML from `src/templates/EmailJSSetup.md` (Malmö Interest Form Template)
2. Copy the auto-reply template HTML from `src/templates/EmailJSSetup.md` (Malmö Auto-Reply Template)
3. Create the templates in EmailJS dashboard
4. Add the template IDs to your `.env` file:
   - `VITE_EMAILJS_MALMO_TEMPLATE_ID=your_admin_template_id`
   - `VITE_EMAILJS_MALMO_AUTOREPLY_TEMPLATE_ID=your_autoreply_template_id`
