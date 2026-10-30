import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProviderService } from '../../../core/services/provider.service';
import { AuthService } from '../../../core/services/auth.service';
import { Provider } from '../../../core/models/provider.model';
import { aadhaarValidator, formatAadhaar, panValidator, pinValidator } from '../../../core/util/identity-validators';

const MAX_PICTURE_BYTES = 5 * 1024 * 1024;
const PICTURE_MAX_EDGE = 320;

@Component({
  selector: 'evr-provider-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './provider-profile.html',
  styleUrl: './provider-profile.scss',
})
export class ProviderProfile implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly providerService = inject(ProviderService);
  private readonly auth = inject(AuthService);

  readonly current = signal<Provider | null>(null);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editing = signal(false);
  readonly error = signal<string | null>(null);
  readonly pictureError = signal<string | null>(null);
  readonly saved = signal(false);
  /** undefined = keep the photo on file, '' = remove it, otherwise a new resized image data URL. */
  readonly pictureDraft = signal<string | undefined>(undefined);

  /** Either a PAN or an Aadhaar number must be on file or entered; one is enough. */
  private readonly identityRequired = (group: AbstractControl): ValidationErrors | null => {
    const c = this.current();
    const pan = (group.get('panNumber')?.value ?? '').trim();
    const aadhaar = (group.get('aadhaarNumber')?.value ?? '').trim();
    const onFile = !!(c?.panMasked || c?.aadhaarMasked);
    return pan || aadhaar || onFile ? null : { identityRequired: true };
  };

  readonly form = this.fb.nonNullable.group(
    {
      companyName: ['', [Validators.required, Validators.minLength(2)]],
      contactPersonName: ['', [Validators.required, Validators.minLength(2)]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9()+\-\s]{7,20}$/)]],
      address: ['', [Validators.required, Validators.minLength(5)]],
      city: ['', Validators.required],
      state: ['', Validators.required],
      zipCode: ['', [Validators.required, pinValidator]],
      panNumber: ['', panValidator],
      aadhaarNumber: ['', aadhaarValidator],
    },
    { validators: this.identityRequired },
  );

  ngOnInit(): void {
    const providerId = this.auth.session()?.profileId;
    if (!providerId) return;
    this.providerService.getById(providerId).subscribe({
      next: (provider) => {
        this.current.set(provider);
        this.fillForm(provider);
        this.loading.set(false);
        // A profile that has no ID on file yet needs one before anything else.
        if (!provider.panMasked && !provider.aadhaarMasked) this.editing.set(true);
      },
      error: () => {
        this.error.set('Could not load your profile.');
        this.loading.set(false);
      },
    });
  }

  private fillForm(provider: Provider): void {
    this.form.reset({
      companyName: provider.companyName,
      contactPersonName: provider.contactPersonName,
      phoneNumber: provider.phoneNumber,
      address: provider.address,
      city: provider.city,
      state: provider.state,
      zipCode: provider.zipCode,
      panNumber: '',
      aadhaarNumber: '',
    });
    this.pictureDraft.set(undefined);
    this.pictureError.set(null);
  }

  edit(): void {
    this.saved.set(false);
    this.error.set(null);
    this.editing.set(true);
  }

  cancel(): void {
    const c = this.current();
    if (c) this.fillForm(c);
    this.error.set(null);
    this.editing.set(false);
  }

  /** The photo to show: a pending change if there is one, otherwise what's saved. */
  pictureToShow(): string | null {
    const draft = this.pictureDraft();
    if (draft !== undefined) return draft || null;
    return this.current()?.profilePicture || null;
  }

  onAadhaarInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = formatAadhaar(input.value);
    this.form.controls.aadhaarNumber.setValue(input.value);
  }

  onPanInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    this.form.controls.panNumber.setValue(input.value);
  }

  async onPictureSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.pictureError.set(null);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.pictureError.set('Choose a JPEG, PNG or WebP image.');
      return;
    }
    if (file.size > MAX_PICTURE_BYTES) {
      this.pictureError.set('That image is too large. Choose one under 5 MB.');
      return;
    }
    try {
      this.pictureDraft.set(await this.resize(file));
    } catch {
      this.pictureError.set('Could not read that image. Try a different one.');
    }
  }

  removePicture(): void {
    this.pictureDraft.set('');
  }

  /** Shrinks the photo in the browser so we only ever store a small JPEG. */
  private async resize(file: File): Promise<string> {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, PICTURE_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL('image/jpeg', 0.85);
  }

  submit(): void {
    const current = this.current();
    if (this.form.invalid || !current) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.saved.set(false);

    const raw = this.form.getRawValue();
    const payload: Provider = {
      ...current,
      ...raw,
      zipCode: raw.zipCode.trim(),
      panNumber: raw.panNumber.replace(/\s/g, '').toUpperCase(),
      aadhaarNumber: raw.aadhaarNumber.replace(/\D/g, ''),
      profilePicture: this.pictureDraft(),
    };
    this.providerService.update(current.providerId!, payload).subscribe({
      next: (provider) => {
        this.current.set(provider);
        this.fillForm(provider);
        this.saving.set(false);
        this.saved.set(true);
        this.editing.set(false);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.error ?? 'Could not save your profile.');
      },
    });
  }
}
