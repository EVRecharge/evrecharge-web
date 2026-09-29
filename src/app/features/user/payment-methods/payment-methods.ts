import { Component, OnInit, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PaymentService } from '../../../core/services/payment.service';
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

  readonly loading = signal(true);
  readonly methods = signal<PaymentMethod[]>([]);
  readonly error = signal<string | null>(null);
  readonly removingId = signal<string | null>(null);

  ngOnInit(): void {
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
