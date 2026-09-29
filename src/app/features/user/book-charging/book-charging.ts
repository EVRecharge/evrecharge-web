import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProviderService } from '../../../core/services/provider.service';
import { BookingService } from '../../../core/services/booking.service';
import { AuthService } from '../../../core/services/auth.service';
import { PaymentService } from '../../../core/services/payment.service';
import { Provider } from '../../../core/models/provider.model';

@Component({
  selector: 'evr-book-charging',
  standalone: true,
  imports: [
    DecimalPipe,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './book-charging.html',
  styleUrl: './book-charging.scss',
})
export class BookCharging implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly providerService = inject(ProviderService);
  private readonly bookingService = inject(BookingService);
  private readonly auth = inject(AuthService);
  private readonly paymentService = inject(PaymentService);

  readonly provider = signal<Provider | null>(null);
  readonly loadingProvider = signal(true);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal(false);
  readonly hasSavedMethod = signal<boolean | null>(null);

  private readonly today = new Date().toISOString().slice(0, 10);
  private readonly nowPlusHour = new Date(Date.now() + 60 * 60 * 1000).toTimeString().slice(0, 5);

  readonly form = this.fb.nonNullable.group({
    date: [this.today, Validators.required],
    startTime: [this.nowPlusHour, Validators.required],
    durationInHours: [1, [Validators.required, Validators.min(1), Validators.max(12)]],
    notes: [''],
  });

  private readonly durationHours = toSignal(this.form.controls.durationInHours.valueChanges, {
    initialValue: this.form.controls.durationInHours.value,
  });

  readonly estimatedCost = computed(() => {
    const rate = this.provider()?.ratePerHour ?? 0;
    const hours = this.durationHours() ?? 0;
    return rate * hours;
  });

  ngOnInit(): void {
    const providerId = Number(this.route.snapshot.paramMap.get('providerId'));
    this.providerService.getById(providerId).subscribe({
      next: (provider) => {
        this.provider.set(provider);
        this.loadingProvider.set(false);
      },
      error: () => {
        this.error.set('Could not load this charging station.');
        this.loadingProvider.set(false);
      },
    });

    this.paymentService.listMethods().subscribe({
      next: (methods) => this.hasSavedMethod.set(methods.some((m) => m.isPrimary)),
      error: () => this.hasSavedMethod.set(false),
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const provider = this.provider();
    const session = this.auth.session();
    if (!provider || !session) return;

    const { date, startTime, durationInHours, notes } = this.form.getRawValue();
    const start = new Date(`${date}T${startTime}:00`);
    const end = new Date(start.getTime() + durationInHours * 60 * 60 * 1000);

    this.submitting.set(true);
    this.error.set(null);

    this.bookingService
      .create({
        userId: session.profileId,
        providerId: provider.providerId!,
        startTime: this.toLocalIso(start),
        endTime: this.toLocalIso(end),
        durationInHours,
        notes,
        address: provider.address,
        city: provider.city,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.success.set(true);
          setTimeout(() => this.router.navigateByUrl('/user/bookings'), 1800);
        },
        error: (err) => {
          this.submitting.set(false);
          this.error.set(err?.error?.error ?? 'Could not create the booking. Please try again.');
        },
      });
  }

  private toLocalIso(d: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
  }
}
