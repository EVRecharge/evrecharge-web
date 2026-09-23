import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'evr-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly hideDriverPassword = signal(true);
  readonly hideProviderPassword = signal(true);

  readonly driverForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  readonly providerForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  ngOnInit(): void {
    const session = this.auth.session();
    if (session) {
      this.router.navigateByUrl(session.role === 'USER' ? '/user/find-charging' : '/provider/profile');
    }
  }

  submitDriver(): void {
    if (this.driverForm.invalid) {
      this.driverForm.markAllAsTouched();
      return;
    }
    const { email, password } = this.driverForm.getRawValue();
    this.loading.set(true);
    this.error.set(null);
    this.auth.loginAsUser(email, password).subscribe({
      next: () => this.router.navigateByUrl('/user/find-charging'),
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.error ?? 'Invalid email or password.');
      },
    });
  }

  submitProvider(): void {
    if (this.providerForm.invalid) {
      this.providerForm.markAllAsTouched();
      return;
    }
    const { email, password } = this.providerForm.getRawValue();
    this.loading.set(true);
    this.error.set(null);
    this.auth.loginAsProvider(email, password).subscribe({
      next: () => this.router.navigateByUrl('/provider/profile'),
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.error ?? 'Invalid email or password.');
      },
    });
  }
}
