import React, { useEffect, lazy, Suspense } from 'react';
import '../i18n';  // Import i18n configuration
import MalmoNavbar from '../components/malmo/MalmoNavbar';
// Malmö-specific components
import MalmoHeroSection from '../components/malmo/MalmoHeroSection';
import MalmoPricingSection from '../components/malmo/MalmoPricingSection';
import MalmoAboutSection from '../components/malmo/MalmoAboutSection';
import MalmoTeamSection from '../components/malmo/MalmoTeamSection';
// Lazy load other components
const SustainabilitySection = lazy(() => import('../components/SustainabilitySection'));
const WorkWithUsSection = lazy(() => import('../components/WorkWithUsSection'));
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

const MalmoPage: React.FC = () => {
  // Set SEO meta tags for Malmö page
  useEffect(() => {
    // Update page title
    document.title = 'Clever Dog - Hunddagis Malmö Videdal | Professionell Hundomsorg';
    
    // Update or create meta description
    let metaDescription = document.querySelector('meta[name="description"]') as HTMLMetaElement;
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.name = 'description';
      document.head.appendChild(metaDescription);
    }
    metaDescription.content = 'Clever Dog - Modernt hunddagis i Malmö Videdal. Godkänd av Länsstyrelsen. Hundpassning, hundpensionat, social walks. Nära Lund och Malmö centrum. Boka nu!';
    
    // Update canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = 'https://cleverdog.se/malmo';
    
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
    
    updateOGTag('og:title', 'Clever Dog - Hunddagis Malmö Videdal | Professionell Hundomsorg');
    updateOGTag('og:description', 'Modernt hunddagis i Malmö Videdal. Godkänd av Länsstyrelsen. Hundpassning, hundpensionat, social walks.');
    updateOGTag('og:url', 'https://cleverdog.se/malmo');
    
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
    updateTwitterTag('twitter:title', 'Clever Dog - Hunddagis Malmö Videdal | Professionell Hundomsorg');
    updateTwitterTag('twitter:description', 'Modernt hunddagis i Malmö Videdal. Godkänd av Länsstyrelsen. Hundpassning, hundpensionat, social walks.');
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
      <MalmoNavbar />
      <main>
        <MalmoHeroSection />
        <MalmoAboutSection />
        <MalmoTeamSection />
        <MalmoPricingSection />
        
        <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>
          <ImportantInfoSection />
          <DaycareScheduleSection />
        </Suspense>
        
        
        <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>
          <SocialMediaSection />
          <GoogleReviewsSection />
          <WorkWithUsSection />
          <SustainabilitySection />
          <ContactSection location="malmo" />
        </Suspense>
      </main>
          <Suspense fallback={<div className="h-16">Loading...</div>}>
            <Footer location="malmo" />
          </Suspense>
    </>
  );
};

export default MalmoPage;
