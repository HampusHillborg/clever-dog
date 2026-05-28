import { Link } from 'react-router-dom';

const LAST_UPDATED = '2026-05-28';

export default function AccountDeletionPage() {
  return (
    <main className="min-h-screen bg-light px-4 py-10 md:py-16">
      <article className="mx-auto max-w-3xl bg-white shadow-card rounded-2xl p-6 md:p-10">
        <header className="mb-8">
          <Link to="/" className="text-sm text-primary hover:underline">
            ← Tillbaka till Clever Dog
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold mt-3">
            Radera konto · Delete account
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Senast uppdaterad / Last updated: {LAST_UPDATED}
          </p>
        </header>

        <div className="prose prose-sm md:prose-base max-w-none space-y-8 text-gray-800 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold">Svenska</h2>
            <p>
              Du har rätt att när som helst radera ditt Clever Dog-konto och
              tillhörande personuppgifter.
            </p>

            <h3 className="text-lg font-semibold mt-4">Radera via appen</h3>
            <ol className="list-decimal pl-6 space-y-1">
              <li>Öppna Clever Dog-appen och logga in</li>
              <li>Gå till <strong>Mer</strong> i den nedre menyn</li>
              <li>Välj <strong>Radera konto</strong></li>
              <li>Bekräfta genom att skriva din e-postadress</li>
              <li>Tryck på <strong>Radera mitt konto permanent</strong></li>
            </ol>

            <h3 className="text-lg font-semibold mt-4">Radera via e-post</h3>
            <p>
              Om du inte har appen installerad, skicka en raderingsbegäran från
              den e-postadress som är kopplad till ditt konto till{' '}
              <a href="mailto:info@cleverdog.se?subject=Begäran%20om%20kontoradering"
                 className="text-primary hover:underline">
                info@cleverdog.se
              </a>. Vi svarar normalt inom 30 dagar.
            </p>

            <h3 className="text-lg font-semibold mt-4">Vad som raderas</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Din kundprofil (namn, e-post, telefon, adress, personnummer)</li>
              <li>Dina meddelanden med personalen</li>
              <li>Hundprofiler där du är ensam ägare (foto, vaccinationer, hälsodata, daglig rapport)</li>
              <li>Push-token kopplad till dina enheter</li>
              <li>Ditt inloggningskonto i autentiseringssystemet</li>
            </ul>

            <h3 className="text-lg font-semibold mt-4">Vad som behålls</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Hundprofiler med medägare</strong> behålls — medägarens
                tillgång påverkas inte.
              </li>
              <li>
                <strong>Bokföringsunderlag</strong> (fakturor, kvitton) behålls i
                7 år enligt bokföringslagen, men kopplas bort från din
                identifierbara profil.
              </li>
            </ul>
            <p>
              Mer information om vår behandling av personuppgifter finns i vår{' '}
              <Link to="/integritetspolicy" className="text-primary hover:underline">
                integritetspolicy
              </Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">English</h2>
            <p>
              You have the right to delete your Clever Dog account and associated
              personal data at any time.
            </p>

            <h3 className="text-lg font-semibold mt-4">Delete from inside the app</h3>
            <ol className="list-decimal pl-6 space-y-1">
              <li>Open the Clever Dog app and sign in</li>
              <li>Go to <strong>More</strong> in the bottom navigation</li>
              <li>Choose <strong>Delete account</strong></li>
              <li>Confirm by typing your email address</li>
              <li>Tap <strong>Delete my account permanently</strong></li>
            </ol>

            <h3 className="text-lg font-semibold mt-4">Delete via email</h3>
            <p>
              If you don't have the app installed, send a deletion request from
              the email address linked to your account to{' '}
              <a href="mailto:info@cleverdog.se?subject=Account%20deletion%20request"
                 className="text-primary hover:underline">
                info@cleverdog.se
              </a>. We normally respond within 30 days.
            </p>

            <h3 className="text-lg font-semibold mt-4">What is deleted</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Your customer profile (name, email, phone, address, personal ID number)</li>
              <li>Messages exchanged with the daycare staff</li>
              <li>Dog profiles where you are the sole owner (photo, vaccinations, health data, daily reports)</li>
              <li>Push notification tokens linked to your devices</li>
              <li>Your authentication account</li>
            </ul>

            <h3 className="text-lg font-semibold mt-4">What is retained</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Dog profiles with co-owners</strong> are kept so the
                co-owner's access is not affected.
              </li>
              <li>
                <strong>Accounting records</strong> (invoices, receipts) are
                retained for 7 years under Swedish bookkeeping law, but are
                disconnected from your identifiable profile.
              </li>
            </ul>
            <p>
              For more information on how we handle personal data, see our{' '}
              <Link to="/privacy" className="text-primary hover:underline">
                privacy policy
              </Link>.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
