import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

declare global {
  interface Window {
    google?: typeof google;
  }
}

/**
 * @angular/google-maps expects the Maps JS API script to already be on the page.
 * We inject it lazily (once) only when a key is configured, so the app still runs
 * without one (falling back to a plain list view) instead of throwing at startup.
 */
@Injectable({ providedIn: 'root' })
export class GoogleMapsLoaderService {
  private loadPromise: Promise<boolean> | null = null;

  get isConfigured(): boolean {
    return !!environment.googleMapsApiKey;
  }

  load(): Promise<boolean> {
    if (!this.isConfigured) {
      return Promise.resolve(false);
    }
    if (window.google?.maps) {
      return Promise.resolve(true);
    }
    if (!this.loadPromise) {
      this.loadPromise = new Promise<boolean>((resolve) => {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=marker`;
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
      });
    }
    return this.loadPromise;
  }
}
