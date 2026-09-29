export interface OrderResponse {
  bookingId: number;
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  razorpayKeyId: string;
  razorpayCustomerId: string;
}

export interface VerifyPaymentRequest {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export type TransactionStatus = 'CREATED' | 'CAPTURED' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

export interface TransactionResponse {
  bookingId: number;
  amountPaise: number;
  currency: string;
  status: TransactionStatus;
  createdAt: string;
}

export interface PaymentMethod {
  tokenId: string;
  method: string;
  cardLast4?: string;
  cardNetwork?: string;
  upiVpaMasked?: string;
  isPrimary: boolean;
}

/** Shared shape between a booking OrderResponse and a method-setup SetupOrderResponse -- both open the same Checkout widget. */
export interface CheckoutOrder {
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  razorpayKeyId: string;
  razorpayCustomerId: string;
}

export type SetupOrderResponse = CheckoutOrder;

export interface VerifySetupRequest {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export type PayoutAccountStatus = 'NOT_STARTED' | 'CREATED' | 'ACTIVATED' | 'NEEDS_CLARIFICATION' | 'REJECTED';

export interface PayoutAccount {
  status: PayoutAccountStatus;
  beneficiaryName?: string;
  bankAccountLast4?: string;
  ifsc?: string;
  panLast4?: string;
  statusReason?: string;
}

export interface PayoutAccountRequest {
  beneficiaryName: string;
  accountNumber: string;
  ifsc: string;
  pan: string;
  businessType: string;
  email: string;
  phone: string;
}
