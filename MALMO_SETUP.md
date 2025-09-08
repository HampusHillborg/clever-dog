# Malmö Jägersro Intresseanmälan - Setup Guide

## Översikt
Detta dokument beskriver hur du konfigurerar intresseanmälan för det nya hunddagiset i Malmö Jägersro.

## Vad som har skapats

### 1. Nytt formulärkomponent
- `src/components/MalmoInterestForm.tsx` - Formulär för intresseanmälan
- Samma fält som bokningsformuläret men anpassat för intresseanmälan
- Inkluderar: ägarens info, hundens info, och ytterligare information

### 2. Uppdaterad kontext
- `src/components/BookingContext.tsx` - Lagt till funktioner för Malmö-formuläret
- `openMalmoForm()` och `closeMalmoForm()` funktioner

### 3. Uppdaterad Hero Section
- `src/components/HeroSection.tsx` - Lagt till blå knapp för Malmö Jägersro intresseanmälan
- Knappen visas under de befintliga knapparna

## EmailJS Konfiguration

### Steg 1: Skapa EmailJS Templates

Du behöver skapa två nya templates i EmailJS:

#### Template 1: Malmö Jägersro Intresseanmälan (för dig som admin)
1. Gå till EmailJS Dashboard > Email Templates
2. Klicka "Create New Template"
3. Namn: "malmo-jagersro-interest-form"
4. Kopiera HTML-koden från `src/templates/EmailJSSetup.md` (Malmö Interest Form Template)
5. Spara och notera Template ID

#### Template 2: Malmö Jägersro Auto-Reply (för kunden)
1. Skapa en ny template
2. Namn: "malmo-jagersro-interest-auto-reply"
3. Kopiera HTML-koden från `src/templates/EmailJSSetup.md` (Malmö Auto-Reply Template)
4. Spara och notera Template ID

### Steg 2: Uppdatera Environment Variables

Lägg till dessa variabler i din `.env` fil:

```env
VITE_EMAILJS_MALMO_TEMPLATE_ID=your_malmo_template_id_here
VITE_EMAILJS_MALMO_AUTOREPLY_TEMPLATE_ID=your_malmo_autoreply_template_id_here
```

### Steg 3: Testa funktionaliteten

1. Starta utvecklingsservern: `npm run dev`
2. Gå till hemsidan
3. Klicka på "Nytt hunddagis i Malmö Jägersro - Anmäl intresse" knappen
4. Fyll i formuläret och skicka
5. Kontrollera att du får e-post med intresseanmälan
6. Kontrollera att kunden får auto-reply

## Funktioner

### Formulärfält
- **Ägarens information:**
  - Namn (obligatoriskt)
  - E-post (obligatoriskt)
  - Telefon
  - Adress (obligatoriskt)
  - Personnummer (obligatoriskt)

- **Hundens information:**
  - Hundens namn (obligatoriskt)
  - Ras
  - Ålder

- **Ytterligare information:**
  - Fritextfält för extra information

### E-post funktionalitet
- **Admin e-post:** Får all information från formuläret
- **Auto-reply:** Bekräftar intresseanmälan till kunden
- **Båda e-posten:** Innehåller tydlig markering att det gäller Malmö Jägersro

## Design
- Blå färgschema för att skilja från vanliga bokningar
- Samma design som befintliga formulär för konsistens
- Responsiv design för mobil och desktop
- Tydlig information om att det gäller nytt hunddagis i Malmö Jägersro

## Nästa steg
1. Konfigurera EmailJS templates enligt instruktionerna ovan
2. Lägg till environment variables
3. Testa funktionaliteten
4. Anpassa texter och design efter behov
