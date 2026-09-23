import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../../core/services/auth.service';
import { confirmPasswordValidator, linkPasswordConfirmation } from '../../../core/validators/password-match.validator';

@Component({
  selector: 'evr-register-provider',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './register-provider.html',
  styleUrl: './register-provider.scss',
})
export class RegisterProvider implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly locating = signal(false);
  readonly hidePassword = signal(true);
  readonly hideConfirm = signal(true);

  readonly chargerTypes = ['Level 1 (120V)', 'Level 2 (240V)', 'DC Fast Charging'];

  readonly form = this.fb.nonNullable.group({
    companyName: ['', [Validators.required, Validators.minLength(2)]],
    contactPersonName: ['', [Validators.required, Validators.minLength(2)]],
    email: [this.route.snapshot.queryParamMap.get('email') ?? '', [Validators.required, Validators.email]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9()+\-\s]{7,20}$/)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required, confirmPasswordValidator('password')]],
    address: ['', Validators.required],
    city: ['', Validators.required],
    state: ['', Validators.required],
    zipCode: ['', Validators.required],
    latitude: [null as number | null, Validators.required],
    longitude: [null as number | null, Validators.required],
    ratePerHour: [null as number | null, [Validators.required, Validators.min(0.01)]],
    chargerType: [this.chargerTypes[1]],
    maxConcurrentCharges: [1, [Validators.required, Validators.min(1)]],
  });

  ngOnInit(): void {
    linkPasswordConfirmation(this.form, 'password', 'confirmPassword');
  }

  useCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.error.set('Geolocation is not available in this browser. Enter coordinates manually.');
      return;
    }
    this.locating.set(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.form.patchValue({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        this.locating.set(false);
      },
      () => {
        this.locating.set(false);
        this.error.set('Could not read your location. Enter coordinates manually.');
      },
    );
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    const raw = this.form.getRawValue();

    this.auth
      .registerAsProvider(
        {
          companyName: raw.companyName,
          contactPersonName: raw.contactPersonName,
          email: raw.email,
          phoneNumber: raw.phoneNumber,
          address: raw.address,
          city: raw.city,
          state: raw.state,
          zipCode: raw.zipCode,
          latitude: raw.latitude!,
          longitude: raw.longitude!,
          ratePerHour: raw.ratePerHour!,
          chargerType: raw.chargerType,
          maxConcurrentCharges: raw.maxConcurrentCharges,
        },
        raw.password,
      )
      .subscribe({
        next: () => this.router.navigateByUrl('/provider/profile'),
        error: (err) => {
          this.loading.set(false);
          this.error.set(
            err?.error?.error ?? 'Could not register your charging station. The email may already be in use.',
          );
        },
      });
  }
}
