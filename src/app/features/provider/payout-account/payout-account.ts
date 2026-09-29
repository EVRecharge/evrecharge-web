import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PaymentService } from '../../../core/services/payment.service';
import { PayoutAccount as PayoutAccountModel } from '../../../core/models/payment.model';

@Component({
  selector: 'evr-payout-account',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './payout-account.html',
  styleUrl: './payout-account.scss',
})
export class PayoutAccount implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly paymentService = inject(PaymentService);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly account = signal<PayoutAccountModel | null>(null);

  readonly businessTypes = ['individual', 'proprietorship', 'partnership', 'private_limited', 'llp'];

  readonly form = this.fb.nonNullable.group({
    beneficiaryName: ['', Validators.required],
    accountNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{6,20}$/)]],
    ifsc: ['', [Validators.required, Validators.pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)]],
    pan: ['', [Validators.required, Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]$/)]],
    businessType: ['individual', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
  });

  ngOnInit(): void {
    this.paymentService.getPayoutStatus().subscribe({
      next: (account) => {
        this.account.set(account);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load your payout account status.');
        this.loading.set(false);
      },
    });
  }

  get canSubmit(): boolean {
    const status = this.account()?.status;
    return !status || status === 'NOT_STARTED' || status === 'NEEDS_CLARIFICATION' || status === 'REJECTED';
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    this.paymentService.submitPayoutAccount(this.form.getRawValue()).subscribe({
      next: (account) => {
        this.account.set(account);
        this.submitting.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'Could not submit your payout account.');
        this.submitting.set(false);
      },
    });
  }

  statusLabel(status?: string): string {
    switch (status) {
      case 'ACTIVATED':
        return 'Active -- you\'ll receive your share of each booking automatically';
      case 'CREATED':
        return 'Submitted -- awaiting verification by Razorpay';
      case 'NEEDS_CLARIFICATION':
        return 'Action needed -- Razorpay needs more information, please resubmit';
      case 'REJECTED':
        return 'Rejected -- please review your details and resubmit';
      default:
        return 'Not set up yet';
    }
  }
}
