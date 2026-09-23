import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { confirmPasswordValidator, linkPasswordConfirmation } from '../../../core/validators/password-match.validator';

@Component({
  selector: 'evr-register-driver',
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
  ],
  templateUrl: './register-driver.html',
  styleUrl: './register-driver.scss',
})
export class RegisterDriver implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly hidePassword = signal(true);
  readonly hideConfirm = signal(true);

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9()+\-\s]{7,20}$/)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required, confirmPasswordValidator('password')]],
  });

  ngOnInit(): void {
    linkPasswordConfirmation(this.form, 'password', 'confirmPassword');
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { firstName, lastName, email, phoneNumber, password } = this.form.getRawValue();
    this.loading.set(true);
    this.error.set(null);

    this.auth.registerAsUser({ firstName, lastName, email, phoneNumber }, password).subscribe({
      next: () => this.router.navigateByUrl('/user/find-charging'),
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.error ?? 'Could not create your account. The email may already be in use.');
      },
    });
  }
}
