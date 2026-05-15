import React from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'  // Import i18n configuration before App
import { isAppTarget } from './lib/platform'
import './index.css'

// Add global type definition
declare global {
  interface Window {
    __initialHash?: string;
  }
}

// Capture hash immediately to survive Supabase's auto-url-cleanup.
// Critical for invite/reset password flows because the Supabase client
// might initialize and strip the hash before our AdminPage mounts.
if (typeof window !== 'undefined') {
  window.__initialHash = window.location.hash;
}

function markFCP() {
  if (window.performance && window.performance.mark) {
    window.performance.mark('fcp');
  }
}

// Service worker is web-only — skip inside the Capacitor app to avoid
// duplicate caching layers and "stuck on old build" headaches.
if (!isAppTarget() && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
      }).catch(error => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

async function boot() {
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element not found');

  const { default: Root } = isAppTarget()
    ? await import('./AppMobile')
    : await import('./App');

  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <Root />
    </React.StrictMode>
  );
  markFCP();
}

document.addEventListener('DOMContentLoaded', () => {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => { void boot(); }, { timeout: 2000 });
  } else {
    setTimeout(() => { void boot(); }, 0);
  }
});
