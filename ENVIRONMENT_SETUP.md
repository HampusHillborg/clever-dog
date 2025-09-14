# 🔒 Säker EmailJS Setup med Miljövariabler

## 1. Skapa .env fil (lokalt)

Skapa en fil som heter `.env` i projektets rotmapp med följande innehåll:

```env
# EmailJS Configuration
# Staffanstorp (befintliga)
VITE_EMAILJS_SERVICE_ID=din_staffanstorp_service_id
VITE_EMAILJS_BOOKING_TEMPLATE_ID=din_staffanstorp_booking_template
VITE_EMAILJS_AUTOREPLY_TEMPLATE_ID=din_staffanstorp_autoreply_template
VITE_EMAILJS_PUBLIC_KEY=din_staffanstorp_public_key

# Malmö (nya)
VITE_EMAILJS_MALMO_SERVICE_ID=service_vierd7r
VITE_EMAILJS_MALMO_BOOKING_TEMPLATE_ID=template_9oxjzjh
VITE_EMAILJS_MALMO_AUTOREPLY_TEMPLATE_ID=template_malmo_auto_reply
VITE_EMAILJS_MALMO_PUBLIC_KEY=din_malmo_public_key
```

## 2. Lägg till .env i .gitignore

Kontrollera att `.env` finns i `.gitignore` så att den inte committas till Git:

```gitignore
# Environment variables
.env
.env.local
.env.production
```

## 3. Netlify Environment Variables

### I Netlify Dashboard:
1. Gå till ditt site → **Site settings** → **Environment variables**
2. Klicka **Add variable**
3. Lägg till varje variabel:

| Key | Value |
|-----|-------|
| `VITE_EMAILJS_SERVICE_ID` | `din_staffanstorp_service_id` |
| `VITE_EMAILJS_BOOKING_TEMPLATE_ID` | `din_staffanstorp_booking_template` |
| `VITE_EMAILJS_AUTOREPLY_TEMPLATE_ID` | `din_staffanstorp_autoreply_template` |
| `VITE_EMAILJS_PUBLIC_KEY` | `din_staffanstorp_public_key` |
| `VITE_EMAILJS_MALMO_SERVICE_ID` | `service_vierd7r` |
| `VITE_EMAILJS_MALMO_BOOKING_TEMPLATE_ID` | `template_9oxjzjh` |
| `VITE_EMAILJS_MALMO_AUTOREPLY_TEMPLATE_ID` | `template_malmo_auto_reply` |
| `VITE_EMAILJS_MALMO_PUBLIC_KEY` | `din_malmo_public_key` |

### Via Netlify CLI (alternativt):
```bash
# Staffanstorp (befintliga)
netlify env:set VITE_EMAILJS_SERVICE_ID "din_staffanstorp_service_id"
netlify env:set VITE_EMAILJS_BOOKING_TEMPLATE_ID "din_staffanstorp_booking_template"
netlify env:set VITE_EMAILJS_AUTOREPLY_TEMPLATE_ID "din_staffanstorp_autoreply_template"
netlify env:set VITE_EMAILJS_PUBLIC_KEY "din_staffanstorp_public_key"

# Malmö (nya)
netlify env:set VITE_EMAILJS_MALMO_SERVICE_ID "service_vierd7r"
netlify env:set VITE_EMAILJS_MALMO_BOOKING_TEMPLATE_ID "template_9oxjzjh"
netlify env:set VITE_EMAILJS_MALMO_AUTOREPLY_TEMPLATE_ID "template_malmo_auto_reply"
netlify env:set VITE_EMAILJS_MALMO_PUBLIC_KEY "din_malmo_public_key"
```

## 4. Hitta din EmailJS Public Key

1. Gå till [EmailJS Dashboard](https://dashboard.emailjs.com/)
2. Klicka på **Account** → **General**
3. Kopiera din **Public Key**

## 5. Testa lokalt

```bash
# Installera dependencies
npm install

# Starta utvecklingsserver
npm run dev
```

## 6. Deploy till Netlify

Efter att du lagt till miljövariablerna i Netlify:

```bash
# Deploy
npm run build
netlify deploy --prod
```

## ✅ Säkerhet

- ✅ **Inga nycklar i koden** - Alla känsliga värden i miljövariabler
- ✅ **Lokal .env** - Fungerar för utveckling
- ✅ **Netlify secrets** - Fungerar för produktion
- ✅ **Gitignore** - .env filen committas aldrig

## 🔧 Felsökning

**Om EmailJS inte fungerar:**
1. Kontrollera att alla miljövariabler är satta korrekt
2. Verifiera att public key är rätt
3. Kontrollera att template ID:n existerar i EmailJS
4. Kolla browser console för felmeddelanden
