import { Link } from 'react-router-dom';

const LAST_UPDATED = '2026-05-19';

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-light px-4 py-10 md:py-16">
      <article className="mx-auto max-w-3xl bg-white shadow-card rounded-2xl p-6 md:p-10">
        <header className="mb-8">
          <Link to="/" className="text-sm text-primary hover:underline">
            ← Tillbaka till Clever Dog
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold mt-3">Integritetspolicy</h1>
          <p className="text-sm text-gray-500 mt-2">Senast uppdaterad: {LAST_UPDATED}</p>
        </header>

        <div className="prose prose-sm md:prose-base max-w-none space-y-6 text-gray-800 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold">1. Vem ansvarar för dina uppgifter</h2>
            <p>
              Personuppgiftsansvarig för behandlingen är <strong>Clever Dog i Malmö AB</strong>{' '}
              ("Clever Dog", "vi", "oss"). Kontakta oss för frågor om integritet och dina rättigheter:
            </p>
            <ul className="list-disc pl-6">
              <li>E-post: <a href="mailto:info@cleverdog.se" className="text-primary hover:underline">info@cleverdog.se</a></li>
              <li>Webb: <a href="https://cleverdog.se" className="text-primary hover:underline">cleverdog.se</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Vilka uppgifter vi samlar in</h2>
            <p>
              När du är kund hos Clever Dog och använder vår kundportal (webb eller mobilapp)
              behandlar vi följande uppgifter:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Kontaktuppgifter:</strong> namn, e-postadress, telefonnummer, postadress,
                ort.
              </li>
              <li>
                <strong>Personnummer:</strong> används för identifiering, kontrakt och fakturering.
              </li>
              <li>
                <strong>Hundprofil:</strong> hundens namn, ras, ålder, foto, vaccinationer,
                hälsouppgifter, anteckningar, veterinärkontakt.
              </li>
              <li>
                <strong>Bokningar och närvaro:</strong> dagar din hund är inbokad på dagis eller
                pensionat, samt status (bekräftad, väntar, avbokad).
              </li>
              <li>
                <strong>Meddelanden:</strong> chatt mellan dig och personalen.
              </li>
              <li>
                <strong>Daglig rapport:</strong> personalens anteckningar om hundens dag
                (humör, mat, aktivitet).
              </li>
              <li>
                <strong>Push-token:</strong> en teknisk identifierare för din mobil som behövs för
                att kunna skicka push-notiser om bokningar och meddelanden.
              </li>
              <li>
                <strong>Inloggningsuppgifter:</strong> e-post och en krypterad version av ditt
                lösenord (vi ser aldrig ditt lösenord i klartext).
              </li>
            </ul>
            <p>
              Vi använder <strong>inga</strong> analysverktyg, reklam-trackers eller liknande som
              spårar ditt beteende i appen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Varför vi behandlar uppgifterna (rättslig grund)</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Fullgöra avtalet med dig</strong> (GDPR art. 6.1.b): hantera bokningar,
                tillhandahålla daglig omvårdnad av din hund, skicka rapporter och meddelanden,
                ta betalt.
              </li>
              <li>
                <strong>Rättslig förpliktelse</strong> (GDPR art. 6.1.c): bokföring och
                skattekrav (bokföringslagen, 7 år).
              </li>
              <li>
                <strong>Berättigat intresse</strong> (GDPR art. 6.1.f): säkerhet (skydda kontot
                mot obehörig åtkomst), produktförbättring (utan personlig spårning).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Vilka som har åtkomst till uppgifterna</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Anställda och uppdragstagare hos Clever Dog</strong> — endast de som
                behöver uppgifterna för att kunna sköta din hund och din bokning.
              </li>
              <li>
                <strong>Personuppgiftsbiträden:</strong>
                <ul className="list-disc pl-6 mt-1">
                  <li>
                    <a href="https://supabase.com/privacy" className="text-primary hover:underline" target="_blank" rel="noreferrer">Supabase Inc.</a>{' '}
                    — databas, autentisering och fillagring. Servrar inom EU.
                  </li>
                  <li>
                    <a href="https://www.netlify.com/privacy/" className="text-primary hover:underline" target="_blank" rel="noreferrer">Netlify</a>{' '}
                    — hosting av webbappens statiska filer.
                  </li>
                  <li>
                    Apple och Google (vid push-notiser) — operatörer av Apple Push Notification
                    service (APNs) och Firebase Cloud Messaging (FCM).
                  </li>
                </ul>
              </li>
            </ul>
            <p>
              Vi <strong>säljer aldrig</strong> dina uppgifter till tredje part.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Hur länge vi sparar uppgifter</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Kund- och hundprofil: så länge ditt kundförhållande är aktivt + 12 månader efter
                avslut, om du inte begär tidigare radering.
              </li>
              <li>
                Bokföringsunderlag (fakturor, kvitton): 7 år enligt bokföringslagen.
              </li>
              <li>
                Meddelanden i chatten: 24 månader efter senaste meddelandet.
              </li>
              <li>
                Push-tokens: tills du loggar ut eller raderar appen.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Dina rättigheter</h2>
            <p>Enligt GDPR har du rätt att:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>begära ett <strong>registerutdrag</strong> över vilka uppgifter vi har om dig,</li>
              <li>få felaktiga uppgifter <strong>rättade</strong>,</li>
              <li>begära att uppgifter <strong>raderas</strong> (rätten att bli glömd),</li>
              <li>begära <strong>begränsning</strong> av behandlingen,</li>
              <li>få ut dina uppgifter i ett strukturerat format (<strong>dataportabilitet</strong>),</li>
              <li>invända mot behandling som grundas på berättigat intresse,</li>
              <li>när som helst återkalla samtycke du har lämnat.</li>
            </ul>
            <p>
              I appen kan du själv radera ditt konto under <strong>Mer → Radera konto</strong>.
              Detta tar permanent bort din profil, dina meddelanden och hundprofiler där du är
              ensam ägare. Bokföringsunderlag kan vi enligt lag inte radera förrän
              lagringstiden gått ut, men de kopplas bort från din identifierbara profil.
            </p>
            <p>
              För övriga begäranden, kontakta oss på{' '}
              <a href="mailto:info@cleverdog.se" className="text-primary hover:underline">info@cleverdog.se</a>.
              Vi svarar normalt inom 30 dagar. Om du är missnöjd med vår hantering kan du klaga
              till <a href="https://www.imy.se" className="text-primary hover:underline" target="_blank" rel="noreferrer">Integritetsskyddsmyndigheten (IMY)</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Säkerhet</h2>
            <p>
              Vi använder krypterad överföring (HTTPS/TLS) mellan din enhet och våra servrar.
              Lösenord lagras hashat och saltat. Åtkomst till databasen är begränsad via
              behörighetsroller (Row Level Security) så att en kund bara kan se sin egen data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. Överföring utanför EU/EES</h2>
            <p>
              Våra leverantörer driftar sina tjänster inom EU/EES. I undantagsfall (t.ex. när
              Apple/Google levererar push-notiser) kan teknisk data passera servrar utanför EU.
              Sådan överföring sker enligt standardavtalsklausuler godkända av EU-kommissionen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">9. Barn</h2>
            <p>
              Tjänsten riktar sig till vuxna hundägare. Vi samlar inte medvetet in uppgifter om
              barn under 16 år.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">10. Ändringar i denna policy</h2>
            <p>
              Om vi gör väsentliga ändringar informerar vi dig via e-post eller en notis i
              appen. Det datum som anges högst upp visar när policyn senast uppdaterades.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">11. Kontakt</h2>
            <p>
              Frågor? Hör av dig till{' '}
              <a href="mailto:info@cleverdog.se" className="text-primary hover:underline">info@cleverdog.se</a>.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
