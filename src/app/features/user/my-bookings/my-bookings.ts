import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { catchError, forkJoin, map, of } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BookingService } from '../../../core/services/booking.service';
import { ProviderService } from '../../../core/services/provider.service';
import { AuthService } from '../../../core/services/auth.service';
import { PaymentService } from '../../../core/services/payment.service';
import { Booking } from '../../../core/models/booking.model';
import { TransactionResponse } from '../../../core/models/payment.model';

/** Share of the booking cost kept if the driver cancels after the provider has confirmed (matches the server). */
export const CANCELLATION_FEE_PERCENT = 10;

interface BookingRow extends Booking {
  providerName: string;
  paying?: boolean;
  paymentNotice?: string;
  /** Set from the booking's payment record once loaded. */
  paid?: boolean;
  refundNotice?: string;
  confirmingCancel?: boolean;
  cancelling?: boolean;
}

@Component({
  selector: 'evr-my-bookings',
  standalone: true,
  imports: [DatePipe, DecimalPipe, MatCardModule, MatButtonModule, MatIconModule, MatChipsModule, MatProgressSpinnerModule],
  templateUrl: './my-bookings.html',
  styleUrl: './my-bookings.scss',
})
export class MyBookings implements OnInit {
  private readonly bookingService = inject(BookingService);
  private readonly providerService = inject(ProviderService);
  private readonly auth = inject(AuthService);
  private readonly paymentService = inject(PaymentService);

  readonly loading = signal(true);
  readonly bookings = signal<BookingRow[]>([]);
  readonly error = signal<string | null>(null);
  readonly feePercent = CANCELLATION_FEE_PERCENT;

  ngOnInit(): void {
    const userId = this.auth.session()?.profileId;
    if (!userId) return;

    this.bookingService.getByUser(userId).subscribe({
      next: (bookings) => {
        if (bookings.length === 0) {
          this.bookings.set([]);
          this.loading.set(false);
          return;
        }
        const uniqueProviderIds = [...new Set(bookings.map((b) => b.providerId))];
        const uniqueStationIds = [...new Set(bookings.map((b) => b.stationId).filter((id): id is number => !!id))];
        forkJoin({
          providers: forkJoin(
            uniqueProviderIds.map((id) =>
              this.providerService.getById(id).pipe(map((p) => [id, p.companyName] as const)),
            ),
          ),
          stations: uniqueStationIds.length
            ? forkJoin(
                uniqueStationIds.map((id) =>
                  this.providerService.getStation(id).pipe(
                    map((s) => [id, s.name] as [number, string]),
                    catchError(() => of([id, ''] as [number, string])),
                  ),
                ),
              )
            : of([] as [number, string][]),
        }).subscribe({
          next: ({ providers, stations }) => {
            const nameById = new Map(providers);
            const stationNameById = new Map(stations);
            this.bookings.set(
              bookings
                .map((b) => ({
                  ...b,
                  providerName:
                    (b.stationId && stationNameById.get(b.stationId)) ||
                    nameById.get(b.providerId) ||
                    `Provider #${b.providerId}`,
                }))
                .sort((a, b) => b.startTime.localeCompare(a.startTime)),
            );
            this.loading.set(false);
            this.loadPaymentState();
          },
          error: () => {
            this.bookings.set(bookings.map((b) => ({ ...b, providerName: `Provider #${b.providerId}` })));
            this.loading.set(false);
            this.loadPaymentState();
          },
        });
      },
      error: () => {
        this.error.set('Could not load your bookings.');
        this.loading.set(false);
      },
    });
  }

  /** The fee (INR) kept if this booking is cancelled now, and what comes back. */
  feeFor(booking: BookingRow): number {
    return Math.round((booking.totalCost ?? 0) * this.feePercent) / 100;
  }

  refundFor(booking: BookingRow): number {
    return (booking.totalCost ?? 0) - this.feeFor(booking);
  }

  /** Free for a pending booking; a confirmed one asks the driver to confirm the fee first. */
  askCancel(booking: BookingRow): void {
    if (booking.status === 'CONFIRMED') {
      booking.confirmingCancel = true;
      this.bookings.set([...this.bookings()]);
    } else {
      this.cancel(booking);
    }
  }

  dismissCancel(booking: BookingRow): void {
    booking.confirmingCancel = false;
    this.bookings.set([...this.bookings()]);
  }

  cancel(booking: BookingRow): void {
    if (!booking.bookingId) return;
    const wasConfirmed = booking.status === 'CONFIRMED';
    booking.cancelling = true;
    this.bookings.set([...this.bookings()]);
    this.bookingService.cancel(booking.bookingId).subscribe({
      next: () => {
        this.bookings.set(
          this.bookings().map((b) =>
            b.bookingId === booking.bookingId
              ? {
                  ...b,
                  status: 'CANCELLED',
                  cancelling: false,
                  confirmingCancel: false,
                  refundNotice: wasConfirmed && b.paid
                    ? `Cancelled. \u20B9${this.feeFor(b).toFixed(2)} cancellation fee kept; \u20B9${this.refundFor(b).toFixed(2)} is being refunded to you.`
                    : 'Cancelled. You were not charged anything.',
                }
              : b,
          ),
        );
      },
      error: (err) => {
        booking.cancelling = false;
        booking.paymentNotice = err?.error?.error ?? 'Could not cancel this booking.';
        this.bookings.set([...this.bookings()]);
      },
    });
  }

  /** Fetches the payment record for confirmed/cancelled bookings so the card can show Paid / refund details. */
  private loadPaymentState(): void {
    const relevant = this.bookings().filter((b) => b.status === 'CONFIRMED' || b.status === 'CANCELLED');
    if (!relevant.length) return;
    forkJoin(
      relevant.map((b) =>
        this.paymentService.getTransactionForBooking(b.bookingId!).pipe(
          map((tx) => [b.bookingId!, tx] as [number, TransactionResponse | null]),
          catchError(() => of([b.bookingId!, null] as [number, TransactionResponse | null])),
        ),
      ),
    ).subscribe((pairs) => {
      const txById = new Map(pairs);
      this.bookings.set(
        this.bookings().map((b) => {
          const tx = txById.get(b.bookingId!);
          if (!tx) return b;
          const refunded = (tx.refundedAmountPaise ?? 0) / 100;
          return {
            ...b,
            paid: tx.status === 'CAPTURED',
            refundNotice:
              b.status === 'CANCELLED' && refunded > 0
                ? `\u20B9${refunded.toFixed(2)} refunded${tx.status === 'PARTIALLY_REFUNDED' ? `; ${this.feePercent}% cancellation fee kept` : ''}.`
                : b.refundNotice,
          };
        }),
      );
    });
  }

  payNow(booking: BookingRow): void {
    booking.paying = true;
    booking.paymentNotice = undefined;
    this.paymentService.createOrder(booking.bookingId!).subscribe({
      next: async (order) => {
        const session = this.auth.session();
        const result = await this.paymentService.openCheckout(order, {
          description: `Charging at ${booking.providerName}`,
          prefillEmail: session?.email,
        });
        booking.paying = false;
        booking.paid = result.success;
        booking.paymentNotice = result.success ? 'Payment received.' : (result.message ?? 'Payment was not completed.');
        this.bookings.set([...this.bookings()]);
      },
      error: (err) => {
        booking.paying = false;
        booking.paymentNotice = err?.error?.error ?? 'Could not start the payment.';
        this.bookings.set([...this.bookings()]);
      },
    });
  }

  statusColor(status?: string): string {
    switch (status) {
      case 'CONFIRMED':
      case 'COMPLETED':
        return 'primary';
      case 'CANCELLED':
        return 'warn';
      default:
        return '';
    }
  }
}
