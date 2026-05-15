import { signOutCustomer } from '../lib/customerAuth';
import dogLogo from '../assets/images/logos/Logo.png';

export default function MobileAuthGate() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-light px-6 text-center">
      <img src={dogLogo} alt="CleverDog" className="h-16 mb-6" />
      <h1 className="text-xl font-bold mb-2">Adminkonton använder webbportalen</h1>
      <p className="text-gray-600 mb-6 max-w-sm">
        Den här appen är för kunder. Öppna admin-portalen i webbläsaren på din dator
        för att hantera bokningar och hundar.
      </p>
      <button
        onClick={async () => {
          await signOutCustomer();
          window.location.replace('/login');
        }}
        className="px-4 py-2 bg-primary text-white rounded-lg"
      >
        Logga ut
      </button>
    </div>
  );
}
