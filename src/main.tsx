import React from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'  // Import i18n configuration before App
import App from './App'
import './index.css'

// Function to mark when First Contentful Paint should happen
function markFCP() {
  // Report to PerformanceObserver if available
  if (window.performance && window.performance.mark) {
    window.performance.mark('fcp');
  }
}

// Register service worker for offline support and faster loads
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
      }).catch(error => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

// Optimize initial render
document.addEventListener('DOMContentLoaded', () => {
  // Create root outside of the callback to start work earlier
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element not found');
  
  const root = createRoot(rootElement);
  
  // Use requestIdleCallback to defer non-critical initialization
  const renderApp = () => {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    // Mark FCP after initial render
    markFCP();
  };
  
  // Use requestIdleCallback for non-critical UI if available
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(renderApp, { timeout: 2000 });
  } else {
    // Fallback to setTimeout for browsers without requestIdleCallback
    setTimeout(renderApp, 0);
  }
});
