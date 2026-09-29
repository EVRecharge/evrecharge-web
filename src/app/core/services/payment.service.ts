import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RazorpayLoaderService } from './razorpay-loader.service';
import {
  CheckoutOrder,
  OrderResponse,
  PaymentMethod,
  PayoutAccount,
  PayoutAccountRequest,
  SetupOrderResponse,
  TransactionResponse,
  VerifyPaymentRequest,
  VerifySetupRequest,
} from '../models/payment.model';

export interface CheckoutResult {
  success: boolean;
  message?: string;
}

export interface CheckoutOptions {
  description: string;
  prefillEmail?: string;
  prefillContact?: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly razorpayLoader = inject(RazorpayLoaderService);
  private readonly base = environment.apiUrls.payment;

  createOrder(bookingId: number): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(`${this.base}/orders`, { bookingId });
  }

  private verifyPayment(request: VerifyPaymentRequest): Observable<{ status: string; bookingId: number }> {
    return this.http.post<{ status: string; bookingId: number }>(`${this.base}/orders/verify`, request);
  }

  getTransactionForBooking(bookingId: number): Observable<TransactionResponse> {
    return this.http.get<TransactionResponse>(`${this.base}/transactions/booking/${bookingId}`);
  }

  listMethods(): Observable<PaymentMethod[]> {
    return this.http.get<PaymentMethod[]>(`${this.base}/methods`);
  }

  createMethodSetupOrder(): Observable<SetupOrderResponse> {
    return this.http.post<SetupOrderResponse>(`${this.base}/methods/setup`, null);
  }

  private verifyMethodSetup(request: VerifySetupRequest): Observable<PaymentMethod> {
    return this.http.post<PaymentMethod>(`${this.base}/methods/setup/verify`, request);
  }

  setPrimaryMethod(tokenId: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/methods/${tokenId}/primary`, null);
  }

  deleteMethod(tokenId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/methods/${tokenId}`);
  }

  getPayoutStatus(): Observable<PayoutAccount> {
    return this.http.get<PayoutAccount>(`${this.base}/provider-accounts/me`);
  }

  submitPayoutAccount(request: PayoutAccountRequest): Observable<PayoutAccount> {
    return this.http.post<PayoutAccount>(`${this.base}/provider-accounts`, request);
  }

  refund(bookingId: number): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(`${this.base}/refunds/${bookingId}`, null);
  }

  /**
   * Runs the "add a payment method" flow end to end: a tiny (auto-refunded) authorization charge
   * that tokenizes the card/UPI for later silent reuse, then verifies it server-side. Resolves with
   * the newly saved method on success.
   */
  async addPaymentMethod(options: CheckoutOptions): Promise<CheckoutResult & { method?: PaymentMethod }> {
    let order: SetupOrderResponse;
    try {
      order = await firstValueFrom(this.createMethodSetupOrder());
    } catch (err: unknown) {
      const message = (err as { error?: { error?: string } })?.error?.error ?? 'Could not start adding this payment method.';
      return { success: false, message };
    }

    const loaded = await this.razorpayLoader.load();
    if (!loaded || !window.Razorpay) {
      return { success: false, message: 'Could not load the payment window. Check your connection and try again.' };
    }

    return new Promise((resolve) => {
      const checkout = new window.Razorpay!({
        key: order.razorpayKeyId,
        amount: order.amountPaise,
        currency: order.currency,
        order_id: order.razorpayOrderId,
        customer_id: order.razorpayCustomerId,
        recurring: '1',
        name: 'EVRecharge India',
        description: 'Add payment method (refunded automatically)',
        prefill: { email: options.prefillEmail, contact: options.prefillContact },
        theme: { color: '#0b6e4f' },
        handler: (response: unknown) => {
          const payload = response as {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          };
          this.verifyMethodSetup({
            razorpayOrderId: payload.razorpay_order_id,
            razorpayPaymentId: payload.razorpay_payment_id,
            razorpaySignature: payload.razorpay_signature,
          }).subscribe({
            next: (method) => resolve({ success: true, method }),
            error: (err) => resolve({ success: false, message: err?.error?.error ?? 'Could not save this payment method.' }),
          });
        },
        modal: {
          ondismiss: () => resolve({ success: false, message: 'Cancelled -- no payment method was added.' }),
        },
      });
      checkout.on('payment.failed', (response: unknown) => {
        const payload = response as { error?: { description?: string } };
        resolve({ success: false, message: payload.error?.description ?? 'Payment failed.' });
      });
      checkout.open();
    });
  }

  /**
   * Opens Razorpay's hosted Checkout for an already-created order and resolves once the driver
   * finishes (successfully or not). A successful `handler` callback still goes through our own
   * server-side signature verification before this resolves `success: true` -- the callback
   * payload alone is never trusted.
   */
  async openCheckout(order: CheckoutOrder, options: CheckoutOptions): Promise<CheckoutResult> {
    const loaded = await this.razorpayLoader.load();
    if (!loaded || !window.Razorpay) {
      return { success: false, message: 'Could not load the payment window. Check your connection and try again.' };
    }

    return new Promise<CheckoutResult>((resolve) => {
      const checkout = new window.Razorpay!({
        key: order.razorpayKeyId,
        amount: order.amountPaise,
        currency: order.currency,
        order_id: order.razorpayOrderId,
        customer_id: order.razorpayCustomerId,
        name: 'EVRecharge India',
        description: options.description,
        prefill: { email: options.prefillEmail, contact: options.prefillContact },
        theme: { color: '#0b6e4f' },
        handler: (response: unknown) => {
          const payload = response as {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          };
          this.verifyPayment({
            razorpayOrderId: payload.razorpay_order_id,
            razorpayPaymentId: payload.razorpay_payment_id,
            razorpaySignature: payload.razorpay_signature,
          }).subscribe({
            next: () => resolve({ success: true }),
            error: (err) => resolve({ success: false, message: err?.error?.error ?? 'Payment verification failed.' }),
          });
        },
        modal: {
          ondismiss: () => resolve({ success: false, message: 'Payment was not completed.' }),
        },
      });
      checkout.on('payment.failed', (response: unknown) => {
        const payload = response as { error?: { description?: string } };
        resolve({ success: false, message: payload.error?.description ?? 'Payment failed.' });
      });
      checkout.open();
    });
  }
}
