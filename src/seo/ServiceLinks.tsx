import { servicePages } from './pages';

export default function ServiceLinks() {
  return <section className="bg-orange-50 py-14" aria-labelledby="service-guide-heading">
    <div className="container mx-auto px-4">
      <h2 id="service-guide-heading" className="text-3xl font-bold text-gray-900 mb-4">Läs mer inför din hunds vistelse</h2>
      <p className="text-gray-700 mb-6">Tjänster, priser och praktiska svar från Clever Dog i Staffanstorp.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {servicePages.map(page => <a key={page.path} href={page.path} className="block rounded-2xl bg-white p-6 border border-orange-100 hover:border-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600">
          <span className="block text-xl font-bold text-orange-700 mb-2">{page.label} →</span>
          <span className="text-sm text-gray-700">{page.description.split('. ')[0]}.</span>
        </a>)}
      </div>
    </div>
  </section>;
}
