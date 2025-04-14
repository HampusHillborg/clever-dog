# Clever Dog Website

A modern, professional website for Clever Dog dog daycare in Staffanstorp built with React, TypeScript, and Tailwind CSS.

## Features

- Fully responsive design for all device sizes
- Bilingual support (Swedish & English)
- Smooth animations with Framer Motion
- Clean, modern UI that follows best UX practices
- Easy to update content structure

## Sections

1. **Hero Section** - Welcoming landing view with call-to-action buttons
2. **About Me** - Information about the owner and business
3. **Social Walks** - Details about group walking services
4. **Pricing** - Service packages and pricing information
5. **Social Media** - Instagram and Facebook feed integration
6. **Contact** - Contact details and Google Maps location
7. **Footer** - Quick links and language switcher

## Getting Started

### Prerequisites

- Node.js (version 14 or later)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd clever-dog
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm run dev
```

The site will be available at http://localhost:5173/

## Building for Production

To build the site for production:

```bash
npm run build
```

This will create an optimized build in the `dist` directory.

## Deployment

The website is designed to be easy to deploy:

1. Run the build command
```bash
npm run build
```

2. The `dist` folder will contain all files needed for deployment
3. You can upload the contents of the `dist` folder to any web hosting service
4. For easy deployment, you can create a zip file:
```bash
cd dist
zip -r ../clever-dog-website.zip .
```
5. Upload the zip file to your hosting provider

## Customizing Content

### Replacing Images

- Replace placeholder images in the `src/components` files with your own images
- For optimal performance, compress your images before use

### Updating Text

- All text content is managed through translation files:
  - Swedish: `src/i18n/locales/sv.json`
  - English: `src/i18n/locales/en.json`
- Edit these files to update the website content

### Social Media Integration

- Update the Instagram and Facebook links in the components to point to your accounts
- To enable the actual social media feeds, you'll need to replace the placeholders with actual embedded content after deployment

## Technology Stack

- React
- TypeScript
- Tailwind CSS
- i18next (internationalization)
- React Router Dom
- Framer Motion (animations)
- React Icons

## License

This project is licensed under the MIT License.

## Google Reviews Integration

This project includes Google Reviews integration using the Google Places API. To set it up:

1. Create a `.env.local` file in the root of your project with the following variables:
   ```
   VITE_GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY
   VITE_GOOGLE_PLACE_ID=YOUR_GOOGLE_PLACE_ID
   ```

2. In your Netlify dashboard, add the following environment variables:
   - `GOOGLE_API_KEY`: Your Google API key
   - `GOOGLE_PLACE_ID`: Your Google Place ID for your business

3. To test locally with the Netlify Functions:
   ```
   npm run netlify-dev
   ```

4. To deploy to Netlify, make sure your environment variables are set in the Netlify dashboard.

## Running the project

// ... existing running instructions ...
