import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
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
    MatProgressSpinnerModule,
    MatIconModule,
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

  ngOnInit(): void {
    const session = this.auth.session();
    if (session) {
      this.router.navigateByUrl(session.role === 'USER' ? '/user/find-charging' : '/provider/profile');
    }
  }

  readonly userForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
  });

  readonly providerForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  submitUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }
    const { firstName, lastName, email } = this.userForm.getRawValue();
    this.loading.set(true);
    this.error.set(null);
    this.auth.continueAsUser(email, firstName, lastName).subscribe({
      next: () => this.router.navigateByUrl('/user/find-charging'),
      error: () => {
        this.loading.set(false);
        this.error.set('Could not sign in. Please check your details and try again.');
      },
    });
  }

  submitProvider(): void {
    if (this.providerForm.invalid) {
      this.providerForm.markAllAsTouched();
      return;
    }
    const { email } = this.providerForm.getRawValue();
    this.loading.set(true);
    this.error.set(null);
    this.auth.findProviderAccount(email).subscribe({
      next: (provider) => {
        this.loading.set(false);
        if (provider) {
          this.auth.continueAsProvider(provider);
          this.router.navigateByUrl('/provider/profile');
        } else {
          this.router.navigate(['/register/provider'], { queryParams: { email } });
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Something went wrong looking up that account. Please try again.');
      },
    });
  }
}
