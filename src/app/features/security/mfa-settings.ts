import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import QRCode from 'qrcode';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { ProviderService } from '../../core/services/provider.service';

interface MfaApi {
  getMfaEnabled(id: number): Observable<boolean>;
  mfaSetup(id: number): Observable<{ secret: string; otpAuthUri: string }>;
  mfaEnable(id: number, code: string): Observable<{ recoveryCodes: string[] }>;
  mfaDisable(id: number, code: string): Observable<{ message: string }>;
}

/** Turn two-factor authentication (authenticator app) on or off. Shared by drivers and providers. */
@Component({
  selector: 'evr-mfa-settings',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './mfa-settings.html',
  styleUrl: './mfa-settings.scss',
})
export class MfaSettings implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly providerService = inject(ProviderService);

  private readonly accountId = this.auth.session()?.profileId;
  private readonly api: MfaApi =
    this.auth.session()?.role === 'PROVIDER' ? this.providerService : this.userService;

  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly enabled = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  /** Present while the driver/provider is mid-enrollment. */
  readonly setup = signal<{ secret: string; qrDataUrl: string; otpAuthUri: string } | null>(null);
  readonly recoveryCodes = signal<string[] | null>(null);
  readonly disabling = signal(false);

  readonly codeForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(6)]],
  });

  ngOnInit(): void {
    if (!this.accountId) return;
    this.api.getMfaEnabled(this.accountId).subscribe({
      next: (enabled) => {
        this.enabled.set(enabled);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load your security settings.');
        this.loading.set(false);
      },
    });
  }

  startSetup(): void {
    if (!this.accountId) return;
    this.begin();
    this.api.mfaSetup(this.accountId).subscribe({
      next: async (res) => {
        const qrDataUrl = await QRCode.toDataURL(res.otpAuthUri, { margin: 1, width: 200 });
        this.setup.set({ secret: res.secret, otpAuthUri: res.otpAuthUri, qrDataUrl });
        this.busy.set(false);
      },
      error: (err) => this.fail(err, 'Could not start setup.'),
    });
  }

  confirmSetup(): void {
    if (this.codeForm.invalid || !this.accountId) {
      this.codeForm.markAllAsTouched();
      return;
    }
    this.begin();
    this.api.mfaEnable(this.accountId, this.codeForm.getRawValue().code).subscribe({
      next: (res) => {
        this.enabled.set(true);
        this.setup.set(null);
        this.recoveryCodes.set(res.recoveryCodes);
        this.codeForm.reset();
        this.busy.set(false);
      },
      error: (err) => this.fail(err, 'Could not turn on two-factor authentication.'),
    });
  }

  confirmDisable(): void {
    if (this.codeForm.invalid || !this.accountId) {
      this.codeForm.markAllAsTouched();
      return;
    }
    this.begin();
    this.api.mfaDisable(this.accountId, this.codeForm.getRawValue().code).subscribe({
      next: () => {
        this.enabled.set(false);
        this.disabling.set(false);
        this.codeForm.reset();
        this.notice.set('Two-factor authentication is now off.');
        this.busy.set(false);
      },
      error: (err) => this.fail(err, 'Could not turn off two-factor authentication.'),
    });
  }

  cancel(): void {
    this.setup.set(null);
    this.disabling.set(false);
    this.codeForm.reset();
    this.error.set(null);
  }

  dismissRecoveryCodes(): void {
    this.recoveryCodes.set(null);
  }

  private begin(): void {
    this.busy.set(true);
    this.error.set(null);
    this.notice.set(null);
  }

  private fail(err: { error?: { error?: string } }, fallback: string): void {
    this.busy.set(false);
    this.error.set(err?.error?.error ?? fallback);
  }
}
