import { AbstractControl, ValidationErrors } from '@angular/forms';

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'rupay' | 'discover' | 'diners' | 'maestro' | 'unknown';

export interface BrandInfo {
  brand: CardBrand;
  label: string;
  /** Allowed card-number lengths. */
  lengths: number[];
  cvvLength: number;
}

const BRANDS: Record<CardBrand, Omit<BrandInfo, 'brand'>> = {
  visa: { label: 'Visa', lengths: [13, 16, 19], cvvLength: 3 },
  mastercard: { label: 'Mastercard', lengths: [16], cvvLength: 3 },
  amex: { label: 'American Express', lengths: [15], cvvLength: 4 },
  rupay: { label: 'RuPay', lengths: [16], cvvLength: 3 },
  discover: { label: 'Discover', lengths: [16, 17, 18, 19], cvvLength: 3 },
  diners: { label: 'Diners Club', lengths: [14, 15, 16, 17, 18, 19], cvvLength: 3 },
  maestro: { label: 'Maestro', lengths: [12, 13, 14, 15, 16, 17, 18, 19], cvvLength: 3 },
  unknown: { label: 'Card', lengths: [12, 13, 14, 15, 16, 17, 18, 19], cvvLength: 3 },
};

export function digitsOnly(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '');
}

/** Works out the card network from the leading digits (IIN ranges). */
export function detectBrand(rawNumber: string | null | undefined): BrandInfo {
  const n = digitsOnly(rawNumber);
  const p2 = Number(n.slice(0, 2));
  const p3 = Number(n.slice(0, 3));
  const p4 = Number(n.slice(0, 4));
  let brand: CardBrand = 'unknown';

  if (/^3[47]/.test(n)) brand = 'amex';
  else if (/^4/.test(n)) brand = 'visa';
  else if ((p2 >= 51 && p2 <= 55) || (p4 >= 2221 && p4 <= 2720)) brand = 'mastercard';
  else if (/^6011/.test(n) || (p3 >= 644 && p3 <= 649)) brand = 'discover';
  else if (/^(60|65|81|82|508)/.test(n)) brand = 'rupay';
  else if (/^(36|38|39)/.test(n) || (p3 >= 300 && p3 <= 305)) brand = 'diners';
  else if (/^(50|5[6-9]|6)/.test(n)) brand = 'maestro';

  return { brand, ...BRANDS[brand] };
}

/** Luhn checksum -- catches almost every mistyped card number. */
export function luhnValid(number: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = number.length - 1; i >= 0; i--) {
    let d = number.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return number.length > 0 && sum % 10 === 0;
}

/** "4111111111111111" -> "4111 1111 1111 1111" (Amex: 4-6-5). */
export function formatCardNumber(raw: string): string {
  const n = digitsOnly(raw).slice(0, 19);
  if (detectBrand(n).brand === 'amex') {
    return [n.slice(0, 4), n.slice(4, 10), n.slice(10, 15)].filter(Boolean).join(' ');
  }
  return n.replace(/(.{4})/g, '$1 ').trim();
}

/** Types "1225" as "12/25"; a leading 2-9 becomes "02/".."09/". */
export function formatExpiry(raw: string): string {
  let d = digitsOnly(raw).slice(0, 4);
  if (d.length === 1 && Number(d) > 1) d = '0' + d;
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

export function cardNumberValidator(control: AbstractControl): ValidationErrors | null {
  const n = digitsOnly(control.value);
  if (!n) return null; // `required` reports emptiness
  const info = detectBrand(n);
  if (!info.lengths.includes(n.length)) return { cardLength: true };
  if (!luhnValid(n)) return { cardChecksum: true };
  return null;
}

/** MM/YY, month 01-12, and the card must not have expired (valid through the end of its month). */
export function expiryValidator(control: AbstractControl): ValidationErrors | null {
  const v = (control.value ?? '') as string;
  if (!v) return null;
  const m = /^(\d{2})\/(\d{2})$/.exec(v);
  if (!m) return { expiryFormat: true };
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return { expiryFormat: true };
  const now = new Date();
  if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
    return { expired: true };
  }
  // Cards are never issued more than ~20 years out; this also catches typos like 12/85.
  if (year > now.getFullYear() + 20) return { expiryFormat: true };
  return null;
}

/** CVV length depends on the network: 4 digits for American Express, 3 for everything else. */
export function cvvValidatorFor(getNumber: () => string) {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = (control.value ?? '') as string;
    if (!v) return null;
    if (!/^\d+$/.test(v)) return { cvvFormat: true };
    const need = detectBrand(getNumber()).cvvLength;
    return v.length === need ? null : { cvvLength: need };
  };
}

/** Letters, spaces and . ' - only, 2-50 characters, as printed on a card. */
export function cardholderNameValidator(control: AbstractControl): ValidationErrors | null {
  const v = ((control.value ?? '') as string).trim();
  if (!v) return null;
  if (v.length < 2 || v.length > 50) return { nameLength: true };
  return /^[A-Za-z][A-Za-z .'-]*$/.test(v) ? null : { nameChars: true };
}

/** UPI ID (VPA): handle@bank, e.g. name.surname@okhdfcbank. */
export function upiIdValidator(control: AbstractControl): ValidationErrors | null {
  const v = ((control.value ?? '') as string).trim();
  if (!v) return null;
  return /^[A-Za-z0-9][A-Za-z0-9.\-_]{1,255}@[A-Za-z][A-Za-z0-9]{1,63}$/.test(v) ? null : { upiFormat: true };
}
