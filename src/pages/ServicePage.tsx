import { useEffect } from 'react';
import { useBooking } from '../components/BookingContext';
import StaffanstorpPricingSection from '../components/staffanstorp/StaffanstorpPricingSection';
import ServiceLinks from '../seo/ServiceLinks';
import type { ServicePageData } from '../seo/pages';

export default function ServicePage({ page }: { page: ServicePageData }) {
  const { openBookingForm } = useBooking();
  useEffect(() => {
    document.title = page.title;
    const setMeta = (selector: string, content: string) => {
      document.querySelector(selector)?.setAttribute('content', content);
    };
    setMeta('meta[name="description"]', page.description);
    setMeta('meta[property="og:title"]', page.title);
    setMeta('meta[property="og:description"]', page.description);
    setMeta('meta[property="og:url"]', `https://cleverdog.se${page.path}`);
    setMeta('meta[name="twitter:title"]', page.title);
    setMeta('meta[name="twitter:description"]', page.description);
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', `https://cleverdog.se${page.path}`);
  }, [page]);
  return <>
    <header className="bg-white border-b border-orange-100">
      <nav aria-label="Huvudmeny" className="container mx-auto px-4 py-5 flex flex-wrap items-center gap-5">
        <a href="/" className="text-2xl font-bold text-orange-600 mr-auto">Clever Dog</a>
        <a href="/hunddagis" className="font-semibold text-gray-800">Hunddagis</a>
        <a href="/hundpensionat" className="font-semibold text-gray-800">Hundpensionat</a>
        <a href="/priser" className="font-semibold text-gray-800">Priser</a>
        <a href="/#contact" className="font-semibold text-orange-700">Kontakt</a>
      </nav>
    </header>
    <main>
      <section className="bg-gradient-to-br from-orange-50 to-white py-14 md:py-20">
        <div className="max-w-4xl mx-auto px-5">
          <nav aria-label="Brödsmulor" className="text-sm text-gray-600 mb-7"><a href="/" className="underline">Hem</a> / <span aria-current="page">{page.label}</span></nav>
          <p className="text-orange-700 font-semibold mb-3">Staffanstorp · nära Malmö och Lund</p>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">{page.heading}</h1>
          <p className="text-lg leading-relaxed text-gray-700">{page.intro}</p>
          <div className="flex flex-wrap gap-4 mt-8">
            <button onClick={openBookingForm} className="rounded-full bg-orange-600 text-white px-6 py-3 font-semibold">Skicka intresseanmälan</button>
            <a href="tel:+46737129650" className="rounded-full border border-orange-600 text-orange-800 px-6 py-3 font-semibold">Ring 073-712 96 50</a>
          </div>
          <noscript><p className="mt-4">För intresseanmälan utan JavaScript, ring oss eller mejla <a href="mailto:info@cleverdog.se" className="underline">info@cleverdog.se</a>.</p></noscript>
        </div>
      </section>
      <div className="max-w-4xl mx-auto px-5 py-12 space-y-10">
        {page.sections.map(section => <section key={section.heading}>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{section.heading}</h2>
          <p className="text-gray-700 text-lg leading-relaxed">{section.text}</p>
        </section>)}
        <p className="text-gray-700">Se även <a className="text-orange-700 underline" href="/priser">alla priser</a>, <a className="text-orange-700 underline" href="/vanliga-fragor">vanliga frågor</a> och <a className="text-orange-700 underline" href="/#daycare-schedule">en dag på hunddagiset</a>.</p>
      </div>
      {page.path === '/priser' && <StaffanstorpPricingSection />}
      <ServiceLinks />
    </main>
    <footer className="bg-gray-900 text-white py-10"><div className="max-w-4xl mx-auto px-5">
      <p className="font-bold text-xl mb-3">Clever Dog</p>
      <address className="not-italic mb-3">Malmövägen 7, 245 31 Staffanstorp</address>
      <p><a href="tel:+46737129650">073-712 96 50</a> · <a href="mailto:info@cleverdog.se">info@cleverdog.se</a></p>
      <p className="mt-5 text-sm"><a href="/integritetspolicy" className="underline">Integritetspolicy</a> · <a href="/" className="underline">Till startsidan</a></p>
    </div></footer>
  </>;
}
