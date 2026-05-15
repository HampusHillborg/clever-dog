import { App, type URLOpenListenerEvent } from '@capacitor/app';
import { isNativeApp } from './platform';

export const initDeepLinks = (navigate: (path: string) => void) => {
  if (!isNativeApp()) return;
  App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
    // event.url is the full URL incl. scheme, e.g.
    //   cleverdog://login/accept-invite#access_token=...
    // or cleverdog://kund
    try {
      const url = new URL(event.url);
      const path = `${url.pathname || '/'}${url.search}${url.hash}`;
      navigate(path);
    } catch {
      // Malformed URL — fall back to dashboard
      navigate('/kund');
    }
  });
};
