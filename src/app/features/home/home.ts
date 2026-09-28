import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';

type QuickRole = 'USER' | 'PROVIDER';

@Component({
  selector: 'evr-home',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly cities = [
    'Mumbai', 'Delhi NCR', 'Bengaluru', 'Pune', 'Hyderabad',
    'Chennai', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Chandigarh',
  ];

  readonly quickRole = signal<QuickRole>('USER');
  readonly quickLoading = signal(false);
  readonly quickError = signal<string | null>(null);

  readonly quickForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  constructor() {
    const session = this.auth.session();
    if (session) {
      this.router.navigateByUrl(session.role === 'USER' ? '/user/find-charging' : '/provider/profile');
    }
  }

  setQuickRole(role: QuickRole): void {
    this.quickRole.set(role);
    this.quickError.set(null);
  }

  quickLogin(): void {
    if (this.quickForm.invalid) {
      this.quickForm.markAllAsTouched();
      return;
    }
    const { email, password } = this.quickForm.getRawValue();
    this.quickLoading.set(true);
    this.quickError.set(null);

    const login$ =
      this.quickRole() === 'USER'
        ? this.auth.loginAsUser(email, password)
        : this.auth.loginAsProvider(email, password);

    login$.subscribe({
      next: () => this.router.navigateByUrl(this.quickRole() === 'USER' ? '/user/find-charging' : '/provider/profile'),
      error: (err) => {
        this.quickLoading.set(false);
        this.quickError.set(err?.error?.error ?? 'Invalid email or password.');
      },
    });
  }
}
