import { Component, OnInit, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PaymentService } from '../../../core/services/payment.service';
import { AuthService } from '../../../core/services/auth.service';
import { PaymentMethod } from '../../../core/models/payment.model';

@Component({
  selector: 'evr-payment-methods',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './payment-methods.html',
  styleUrl: './payment-methods.scss',
})
export class PaymentMethods implements OnInit {
  private readonly paymentService = inject(PaymentService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly methods = signal<PaymentMethod[]>([]);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly removingId = signal<string | null>(null);
  readonly settingPrimaryId = signal<string | null>(null);
  readonly adding = signal(false);

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

  async addMethod(): Promise<void> {
    this.adding.set(true);
    this.error.set(null);
    this.notice.set(null);

    const session = this.auth.session();
    const result = await this.paymentService.addPaymentMethod({
      description: 'Add payment method',
      prefillEmail: session?.email,
    });

    this.adding.set(false);
    if (result.success && result.method) {
      this.methods.set([...this.methods(), result.method]);
      this.notice.set('Payment method added.');
    } else if (result.message) {
      this.error.set(result.message);
    }
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
