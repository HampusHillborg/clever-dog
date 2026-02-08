import React, { useEffect, lazy, Suspense } from 'react';
import '../i18n';  // Import i18n configuration
import StaffanstorpNavbar from '../components/staffanstorp/StaffanstorpNavbar';
import WaveDivider from '../components/shared/WaveDivider';
// Staffanstorp-specific components
import StaffanstorpHeroSection from '../components/staffanstorp/StaffanstorpHeroSection';
import StaffanstorpPricingSection from '../components/staffanstorp/StaffanstorpPricingSection';
import StaffanstorpAboutSection from '../components/staffanstorp/StaffanstorpAboutSection';
// Lazy load other components
const SustainabilitySection = lazy(() => import('../components/SustainabilitySection'));
const ImportantInfoSection = lazy(() => import('../components/ImportantInfoSection'));
const DaycareScheduleSection = lazy(() => import('../components/DaycareScheduleSection'));
const SocialMediaSection = lazy(() => import('../components/SocialMediaSection'));
const GoogleReviewsSection = lazy(() => import('../components/GoogleReviewsSection'));
const ContactSection = lazy(() => import('../components/ContactSection'));
const Footer = lazy(() => import('../components/Footer'));

// Preload hero images - critical for FCP
const preloadHeroImages = () => {
  const sizes = ['small', 'medium', 'large'];
  sizes.forEach(size => {
    const img = new Image();
    img.src = `/src/assets/images/hero/heroweb-${size}.webp`;
    img.fetchPriority = 'high';
  });
};

const StaffanstorpPage: React.FC = () => {
  // Set SEO meta tags for Staffanstorp page
  useEffect(() => {
    // Update page title
    document.title = 'Hunddagis Staffanstorp, Malmö & Lund - Clever Dog | Godkänt Hundpensionat';

    // Update or create meta description
    let metaDescription = document.querySelector('meta[name="description"]') as HTMLMetaElement;
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.name = 'description';
      document.head.appendChild(metaDescription);
    }
    metaDescription.content = 'Professionellt hunddagis och hundpensionat i Staffanstorp. Betjänar Malmö (15 min), Lund (10 min) och hela sydvästra Skåne. Godkänd av Länsstyrelsen. Boka plats!';

    // Update canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = 'https://cleverdog.se/staffanstorp';

    // Update Open Graph tags
    const updateOGTag = (property: string, content: string) => {
      let ogTag = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!ogTag) {
        ogTag = document.createElement('meta');
        ogTag.setAttribute('property', property);
        document.head.appendChild(ogTag);
      }
      ogTag.content = content;
    };

    updateOGTag('og:title', 'Hunddagis Staffanstorp, Malmö & Lund - Clever Dog | Godkänt Hundpensionat');
    updateOGTag('og:description', 'Professionellt hunddagis och hundpensionat i Staffanstorp. Betjänar Malmö (15 min), Lund (10 min) och hela sydvästra Skåne. Godkänd av Länsstyrelsen.');
    updateOGTag('og:url', 'https://cleverdog.se/staffanstorp');

    // Update Twitter tags
    const updateTwitterTag = (name: string, content: string) => {
      let twitterTag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!twitterTag) {
        twitterTag = document.createElement('meta');
        twitterTag.name = name;
        document.head.appendChild(twitterTag);
      }
      twitterTag.content = content;
    };

    updateTwitterTag('twitter:card', 'summary_large_image');
    updateTwitterTag('twitter:title', 'Hunddagis Staffanstorp, Malmö & Lund - Clever Dog | Godkänt Hundpensionat');
    updateTwitterTag('twitter:description', 'Professionellt hunddagis och hundpensionat i Staffanstorp. Betjänar Malmö (15 min), Lund (10 min) och hela sydvästra Skåne. Godkänd av Länsstyrelsen.');
    updateTwitterTag('twitter:image', 'https://cleverdog.se/favicon.png');
  }, []);

  // Preload hero images immediately
  useEffect(() => {
    preloadHeroImages();
  }, []);

  // Add effect to handle anchor links smooth scrolling
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A' && target.getAttribute('href')?.startsWith('#')) {
        e.preventDefault();
        const id = target.getAttribute('href')?.substring(1);
        if (id) {
          const element = document.getElementById(id);
          if (element) {
            window.scrollTo({
              top: element.offsetTop - 80, // Adjust for navbar height
              behavior: 'smooth',
            });
          }
        }
      }
    };

    document.addEventListener('click', handleAnchorClick);
    return () => document.removeEventListener('click', handleAnchorClick);
  }, []);

  return (
    <>
      <StaffanstorpNavbar />
      <main>
        <StaffanstorpHeroSection />
        <StaffanstorpAboutSection />
        <WaveDivider topColor="#ffffff" bottomColor="#FFF7ED" variant="wave2" />
        <StaffanstorpPricingSection />

        <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>
          <WaveDivider topColor="#FFF7ED" bottomColor="#F9FAFB" variant="wave3" />
          <ImportantInfoSection />
          <WaveDivider topColor="#F9FAFB" bottomColor="#ffffff" variant="wave1" />
          <DaycareScheduleSection />
        </Suspense>


        <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>
          <WaveDivider topColor="#ffffff" bottomColor="#ffffff" variant="wave2" />
          <SocialMediaSection />
          <WaveDivider topColor="#ffffff" bottomColor="#F9FAFB" variant="wave3" />
          <GoogleReviewsSection />
          <WaveDivider topColor="#F9FAFB" bottomColor="#ffffff" variant="wave1" />
          <SustainabilitySection />
          <WaveDivider topColor="#ffffff" bottomColor="#F9FAFB" variant="wave2" />
          <ContactSection location="staffanstorp" />
        </Suspense>
      </main>
      <Suspense fallback={<div className="h-16">Loading...</div>}>
        <WaveDivider topColor="#F9FAFB" bottomColor="#111827" variant="wave3" />
        <Footer location="staffanstorp" />
      </Suspense>
    </>
  );
};

export default StaffanstorpPage;
