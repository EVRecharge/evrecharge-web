import { AbstractControl, ValidationErrors } from '@angular/forms';

// Verhoeff checksum tables -- the scheme behind the 12th digit of an Aadhaar number.
const D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5], [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7], [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3], [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4], [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7], [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

function verhoeffValid(num: string): boolean {
  let c = 0;
  for (let i = 0; i < num.length; i++) {
    c = D[c][P[i % 8][Number(num[num.length - 1 - i])]];
  }
  return c === 0;
}

export function formatAadhaar(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 12).replace(/(\d{4})(?=\d)/g, '$1 ');
}

/** PAN: five letters, four digits, one letter (e.g. ABCDE1234F). Empty is allowed here -- see identityRequired. */
export function panValidator(control: AbstractControl): ValidationErrors | null {
  const v = ((control.value ?? '') as string).replace(/\s/g, '').toUpperCase();
  if (!v) return null;
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v) ? null : { pan: true };
}

/** Aadhaar: 12 digits, not starting with 0 or 1, with a valid Verhoeff check digit. */
export function aadhaarValidator(control: AbstractControl): ValidationErrors | null {
  const v = ((control.value ?? '') as string).replace(/[\s-]/g, '');
  if (!v) return null;
  return /^[2-9][0-9]{11}$/.test(v) && verhoeffValid(v) ? null : { aadhaar: true };
}

/** Indian PIN code: six digits, first digit 1-9. */
export function pinValidator(control: AbstractControl): ValidationErrors | null {
  const v = ((control.value ?? '') as string).trim();
  if (!v) return null;
  return /^[1-9][0-9]{5}$/.test(v) ? null : { pin: true };
}
