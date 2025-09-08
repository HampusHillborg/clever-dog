# 📧 Netlify E-postmallar Setup

## 🎯 **Mål**
Konfigurera snygga e-postmallar för Malmö intresseanmälan via Netlify Forms.

## 📋 **Steg för att aktivera e-postmallar**

### **1. Gå till Netlify Dashboard**
1. Logga in på [netlify.com](https://netlify.com)
2. Välj ditt projekt
3. Gå till **"Forms"** i vänstermenyn

### **2. Konfigurera E-postnotifikationer**
1. Klicka på **"malmo-interest"** formuläret
2. Gå till **"Settings"** eller **"Notifications"**
3. Aktivera **"Email notifications"**

### **3. Anpassa E-postmall (Alternativ A - Enklast)**
1. I formulärinställningarna, hitta **"Email template"**
2. Kopiera innehållet från `netlify/email-templates/malmo-interest.html`
3. Klistra in i mallfältet
4. Spara ändringar

### **4. Anpassa E-postmall (Alternativ B - Avancerat)**
1. Gå till **"Site settings"** → **"Forms"**
2. Hitta **"Email templates"**
3. Skapa ny mall med namnet **"malmo-interest"**
4. Använd HTML från `netlify/email-templates/malmo-interest.html`

### **5. Konfigurera E-postadress**
1. I formulärinställningarna
2. Sätt **"To email"** till: `cleverdog.aw@gmail.com`
3. Sätt **"Subject"** till: `🐕 Intresseanmälan Malmö Jägersro - {{name}}`

## 🎨 **E-postmall Funktioner**

### **Styling inkluderat:**
- ✅ **Responsiv design** - fungerar på mobil och desktop
- ✅ **Clever Dog branding** - blå färgschema
- ✅ **Strukturerad layout** - tydliga sektioner
- ✅ **Emojis** - visuellt tilltalande
- ✅ **Tabeller** - organiserad data
- ✅ **Highlight boxes** - viktig information framhävd

### **Variabler som fungerar:**
- `{{name}}` - Ägarens namn
- `{{email}}` - E-postadress
- `{{phone}}` - Telefonnummer
- `{{dogName}}` - Hundens namn
- `{{dogBreed}}` - Ras
- `{{dogGender}}` - Kön
- `{{dogHeight}}` - Höjd
- `{{dogAge}}` - Ålder
- `{{isNeutered}}` - Kastrerad/steriliserad
- `{{dogSocialization}}` - Socialisering
- `{{problemBehaviors}}` - Problembeteenden
- `{{allergies}}` - Allergier
- `{{chipNumber}}` - Mikrochip-nummer
- `{{address}}` - Adress
- `{{personnummer}}` - Personnummer
- `{{additionalInfo}}` - Ytterligare information
- `{{submission_date}}` - Datum för anmälan
- `{{submission_time}}` - Tid för anmälan

## 🚀 **Testa E-postmallen**

### **1. Skicka testformulär**
1. Gå till din webbplats
2. Fyll i Malmö-formuläret med testdata
3. Skicka formuläret

### **2. Kontrollera e-post**
1. Kolla `cleverdog.aw@gmail.com`
2. E-posten ska ha snygg styling
3. Alla fält ska visas korrekt

## 🔧 **Felsökning**

### **Om e-post inte kommer:**
1. Kontrollera spam-mappen
2. Verifiera att e-postadressen är korrekt
3. Kontrollera att formuläret skickas (kolla Netlify Dashboard)

### **Om styling inte fungerar:**
1. Kontrollera att HTML-mallen är korrekt klistrad in
2. Testa med en enklare mall först
3. Kontrollera att alla variabler matchar formulärfälten

### **Om variabler inte fungerar:**
1. Kontrollera att fältnamnen matchar exakt
2. Använd `{{field_name}}` syntax
3. Testa med enkla variabler först

## 📱 **Responsiv Design**

E-postmallen är optimerad för:
- ✅ **Desktop** - Full bredd, tabeller
- ✅ **Mobil** - Anpassad layout, läsbar text
- ✅ **E-postklienter** - Gmail, Outlook, Apple Mail

## 🎨 **Anpassning**

### **Färger:**
- **Primär:** `#3b82f6` (blå)
- **Sekundär:** `#1d4ed8` (mörkblå)
- **Accent:** `#f59e0b` (gul)
- **Text:** `#333333` (mörkgrå)

### **Typsnitt:**
- **Huvud:** 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif
- **Fallback:** Arial, sans-serif

## ✅ **Klar!**

Efter dessa steg kommer du att få snygga, professionella e-postmeddelanden för alla Malmö intresseanmälningar! 🎉
