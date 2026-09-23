import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProviderService } from '../../../core/services/provider.service';
import { AuthService } from '../../../core/services/auth.service';
import { Provider } from '../../../core/models/provider.model';

@Component({
  selector: 'evr-provider-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './provider-profile.html',
  styleUrl: './provider-profile.scss',
})
export class ProviderProfile implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly providerService = inject(ProviderService);
  private readonly auth = inject(AuthService);

  private current: Provider | null = null;

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly locating = signal(false);
  readonly error = signal<string | null>(null);
  readonly saved = signal(false);

  readonly chargerTypes = ['Level 1 (120V)', 'Level 2 (240V)', 'DC Fast Charging'];

  readonly form = this.fb.nonNullable.group({
    companyName: ['', [Validators.required, Validators.minLength(2)]],
    contactPersonName: ['', [Validators.required, Validators.minLength(2)]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9()+\-\s]{7,20}$/)]],
    address: ['', Validators.required],
    city: ['', Validators.required],
    state: ['', Validators.required],
    zipCode: ['', Validators.required],
    latitude: [0, Validators.required],
    longitude: [0, Validators.required],
    ratePerHour: [0, [Validators.required, Validators.min(0.01)]],
    chargerType: [''],
    maxConcurrentCharges: [1, [Validators.required, Validators.min(1)]],
  });

  ngOnInit(): void {
    const providerId = this.auth.session()?.profileId;
    if (!providerId) return;
    this.providerService.getById(providerId).subscribe({
      next: (provider) => {
        this.current = provider;
        this.form.patchValue(provider);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load your station profile.');
        this.loading.set(false);
      },
    });
  }

  useCurrentLocation(): void {
    if (!navigator.geolocation) return;
    this.locating.set(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.form.patchValue({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        this.locating.set(false);
      },
      () => this.locating.set(false),
    );
  }

  submit(): void {
    if (this.form.invalid || !this.current) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.saved.set(false);

    const payload: Provider = { ...this.current, ...this.form.getRawValue() };
    this.providerService.update(this.current.providerId!, payload).subscribe({
      next: (provider) => {
        this.current = provider;
        this.saving.set(false);
        this.saved.set(true);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.error ?? 'Could not save your station profile.');
      },
    });
  }
}
