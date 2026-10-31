import { Component, OnInit, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { map } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PaymentService } from '../../../core/services/payment.service';
import { AuthService } from '../../../core/services/auth.service';
import { PaymentMethod } from '../../../core/models/payment.model';
import {
  cardholderNameValidator,
  cardNumberValidator,
  cvvValidatorFor,
  detectBrand,
  digitsOnly,
  expiryValidator,
  formatCardNumber,
  formatExpiry,
  upiIdValidator,
} from '../../../core/util/card-validators';

@Component({
  selector: 'evr-payment-methods',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './payment-methods.html',
  styleUrl: './payment-methods.scss',
})
export class PaymentMethods implements OnInit {
  private readonly paymentService = inject(PaymentService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly methods = signal<PaymentMethod[]>([]);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly removingId = signal<string | null>(null);
  readonly settingPrimaryId = signal<string | null>(null);
  readonly adding = signal(false);
  /** Whether the "what are you adding?" panel is open, and which option is picked in it. */
  readonly choosing = signal(false);
  readonly methodType = signal<'card' | 'upi'>('card');

  private readonly numberControl = this.fb.nonNullable.control('', [Validators.required, cardNumberValidator]);

  readonly cardForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, cardholderNameValidator]],
    number: this.numberControl,
    expiry: ['', [Validators.required, expiryValidator]],
    cvv: ['', [Validators.required, cvvValidatorFor(() => this.numberControl.value)]],
  });

  readonly upiForm = this.fb.nonNullable.group({
    vpa: ['', [Validators.required, upiIdValidator]],
  });

  /** Network detected from the number as it's typed (drives the label, CVV length and number grouping). */
  readonly brand = toSignal(this.numberControl.valueChanges.pipe(map((n: string) => detectBrand(n))), {
    initialValue: detectBrand(''),
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.paymentService.listMethods().subscribe({
      next: (methods) => {
        this.methods.set(methods);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load your saved payment methods.');
        this.loading.set(false);
      },
    });
  }

  onNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const formatted = formatCardNumber(input.value);
    input.value = formatted;
    this.cardForm.controls.number.setValue(formatted);
    // The CVV length depends on the network, so re-check it whenever the number changes.
    this.cardForm.controls.cvv.updateValueAndValidity();
  }

  onExpiryInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const formatted = formatExpiry(input.value);
    input.value = formatted;
    this.cardForm.controls.expiry.setValue(formatted);
  }

  onCvvInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = digitsOnly(input.value).slice(0, 4);
    input.value = digits;
    this.cardForm.controls.cvv.setValue(digits);
  }

  openChooser(): void {
    this.error.set(null);
    this.notice.set(null);
    this.choosing.set(true);
  }

  async addMethod(): Promise<void> {
    const form = this.methodType() === 'card' ? this.cardForm : this.upiForm;
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }
    const card = this.methodType() === 'card' ? this.cardForm.getRawValue() : null;
    const vpa = this.methodType() === 'upi' ? this.upiForm.getRawValue().vpa.trim() : undefined;

    this.adding.set(true);
    this.error.set(null);
    this.notice.set(null);

    const session = this.auth.session();
    let result;
    try {
      result = await this.paymentService.addPaymentMethod({
        description: 'Add payment method',
        prefillEmail: session?.email,
        method: this.methodType(),
        card: card ? { ...card, number: digitsOnly(card.number), name: card.name.trim() } : undefined,
        vpa,
      });
    } catch {
      result = { success: false, message: 'Something went wrong while adding the payment method.' };
    } finally {
      this.adding.set(false);
      // Don't keep card details around once they've been handed to the secure window.
      this.cardForm.reset();
      this.upiForm.reset();
    }

    if (result.success && result.method) {
      this.choosing.set(false);
      this.notice.set(
        `${this.describe(result.method)} was saved to your account${result.method.isPrimary ? ' and set as your primary payment method' : ''}.`,
      );
      // Re-read from the server so the list shows exactly what's stored against this account.
      this.paymentService.listMethods().subscribe({
        next: (methods) => this.methods.set(methods),
        error: () => this.methods.set([...this.methods(), result.method!]),
      });
    } else if (result.message) {
      this.error.set(result.message);
    }
  }

  /** "Visa •••• 4242" or the masked UPI ID. */
  describe(method: PaymentMethod): string {
    return method.method === 'card'
      ? `${method.cardNetwork ?? 'Card'} •••• ${method.cardLast4 ?? ''}`.trim()
      : (method.upiVpaMasked ?? 'UPI');
  }

  makePrimary(method: PaymentMethod): void {
    this.settingPrimaryId.set(method.tokenId);
    this.paymentService.setPrimaryMethod(method.tokenId).subscribe({
      next: () => {
        this.methods.set(this.methods().map((m) => ({ ...m, isPrimary: m.tokenId === method.tokenId })));
        this.settingPrimaryId.set(null);
      },
      error: () => {
        this.error.set('Could not update your primary payment method.');
        this.settingPrimaryId.set(null);
      },
    });
  }

  remove(method: PaymentMethod): void {
    this.removingId.set(method.tokenId);
    this.paymentService.deleteMethod(method.tokenId).subscribe({
      next: () => {
        this.methods.set(this.methods().filter((m) => m.tokenId !== method.tokenId));
        this.removingId.set(null);
      },
      error: () => {
        this.error.set('Could not remove this payment method.');
        this.removingId.set(null);
      },
    });
  }
}
