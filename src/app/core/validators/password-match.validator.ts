import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Attach to the CONFIRM field itself (not the group): Angular Material's mat-error visibility
 * follows that control's own error state, so a group-level cross-field validator never surfaces
 * (the group is invalid, but the individual confirm field looks perfectly valid to mat-form-field).
 */
export function confirmPasswordValidator(passwordKey: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.parent?.get(passwordKey)?.value;
    if (!password || !control.value || password === control.value) {
      return null;
    }
    return { passwordMismatch: true };
  };
}

/**
 * The confirm field only re-validates on its OWN value changes by default, so a same-otherwise-valid
 * confirm value typed before a later edit to the password field would go stale. Re-check it whenever
 * the password field changes too.
 */
export function linkPasswordConfirmation(form: FormGroup, passwordKey: string, confirmKey: string): void {
  form.get(passwordKey)?.valueChanges.subscribe(() => form.get(confirmKey)?.updateValueAndValidity());
}
