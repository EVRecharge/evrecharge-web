import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { forkJoin, map } from 'rxjs';
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

interface BookingRow extends Booking {
  providerName: string;
  paying?: boolean;
  paymentNotice?: string;
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
        forkJoin(
          uniqueProviderIds.map((id) =>
            this.providerService.getById(id).pipe(map((p) => [id, p.companyName] as const)),
          ),
        ).subscribe({
          next: (pairs) => {
            const nameById = new Map(pairs);
            this.bookings.set(
              bookings
                .map((b) => ({ ...b, providerName: nameById.get(b.providerId) ?? `Provider #${b.providerId}` }))
                .sort((a, b) => b.startTime.localeCompare(a.startTime)),
            );
            this.loading.set(false);
          },
          error: () => {
            this.bookings.set(bookings.map((b) => ({ ...b, providerName: `Provider #${b.providerId}` })));
            this.loading.set(false);
          },
        });
      },
      error: () => {
        this.error.set('Could not load your bookings.');
        this.loading.set(false);
      },
    });
  }

  cancel(booking: BookingRow): void {
    if (!booking.bookingId) return;
    this.bookingService.cancel(booking.bookingId).subscribe({
      next: () => {
        this.bookings.set(
          this.bookings().map((b) => (b.bookingId === booking.bookingId ? { ...b, status: 'CANCELLED' } : b)),
        );
      },
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
