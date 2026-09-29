import { Injectable } from '@angular/core';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open(): void;
      on(event: string, handler: (response: unknown) => void): void;
    };
  }
}

/**
 * Loads Razorpay's hosted Checkout script lazily (once). Checkout.js runs the entire card/UPI
 * entry flow inside Razorpay's own iframe, so this app never sees raw card numbers or CVVs --
 * that's what keeps this integration's PCI-DSS scope minimal.
 */
@Injectable({ providedIn: 'root' })
export class RazorpayLoaderService {
  private loadPromise: Promise<boolean> | null = null;

  load(): Promise<boolean> {
    if (window.Razorpay) {
      return Promise.resolve(true);
    }
    if (!this.loadPromise) {
      this.loadPromise = new Promise<boolean>((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
      });
    }
    return this.loadPromise;
  }
}
