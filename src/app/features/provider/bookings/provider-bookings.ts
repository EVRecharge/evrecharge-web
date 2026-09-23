import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { forkJoin, map } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BookingService } from '../../../core/services/booking.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { Booking, BookingStatus } from '../../../core/models/booking.model';

interface BookingRow extends Booking {
  driverName: string;
  driverPhone: string;
}

@Component({
  selector: 'evr-provider-bookings',
  standalone: true,
  imports: [DatePipe, DecimalPipe, MatCardModule, MatButtonModule, MatIconModule, MatChipsModule, MatProgressSpinnerModule],
  templateUrl: './provider-bookings.html',
  styleUrl: './provider-bookings.scss',
})
export class ProviderBookings implements OnInit {
  private readonly bookingService = inject(BookingService);
  private readonly userService = inject(UserService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly bookings = signal<BookingRow[]>([]);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const providerId = this.auth.session()?.profileId;
    if (!providerId) return;

    this.bookingService.getByProvider(providerId).subscribe({
      next: (bookings) => {
        if (bookings.length === 0) {
          this.bookings.set([]);
          this.loading.set(false);
          return;
        }
        const uniqueUserIds = [...new Set(bookings.map((b) => b.userId))];
        forkJoin(
          uniqueUserIds.map((id) =>
            this.userService.getById(id).pipe(map((u) => [id, u] as const)),
          ),
        ).subscribe({
          next: (pairs) => {
            const userById = new Map(pairs);
            this.bookings.set(
              bookings
                .map((b) => {
                  const u = userById.get(b.userId);
                  return {
                    ...b,
                    driverName: u ? `${u.firstName} ${u.lastName}`.trim() : `Driver #${b.userId}`,
                    driverPhone: u?.phoneNumber ?? '',
                  };
                })
                .sort((a, b) => b.startTime.localeCompare(a.startTime)),
            );
            this.loading.set(false);
          },
          error: () => {
            this.bookings.set(
              bookings.map((b) => ({ ...b, driverName: `Driver #${b.userId}`, driverPhone: '' })),
            );
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

  setStatus(booking: BookingRow, status: BookingStatus): void {
    if (!booking.bookingId) return;
    this.bookingService.updateStatus(booking.bookingId, status).subscribe({
      next: (updated) => {
        this.bookings.set(
          this.bookings().map((b) => (b.bookingId === booking.bookingId ? { ...b, status: updated.status } : b)),
        );
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
