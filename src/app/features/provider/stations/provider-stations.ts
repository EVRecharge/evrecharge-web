import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProviderService } from '../../../core/services/provider.service';
import { AuthService } from '../../../core/services/auth.service';
import { Station } from '../../../core/models/provider.model';

@Component({
  selector: 'evr-provider-stations',
  standalone: true,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './provider-stations.html',
  styleUrl: './provider-stations.scss',
})
export class ProviderStations implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly providerService = inject(ProviderService);
  private readonly auth = inject(AuthService);

  private readonly providerId = this.auth.session()?.profileId;

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly locating = signal(false);
  readonly removingId = signal<number | null>(null);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly stations = signal<Station[]>([]);
  /** null = form closed, 'new' = adding a station, otherwise the id of the station being edited. */
  readonly editing = signal<'new' | number | null>(null);

  readonly chargerTypes = ['Level 1 (120V)', 'Level 2 (240V)', 'DC Fast Charging'];

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    address: ['', Validators.required],
    city: ['', Validators.required],
    state: ['', Validators.required],
    zipCode: ['', Validators.required],
    latitude: [0, Validators.required],
    longitude: [0, Validators.required],
    ratePerHour: [0, [Validators.required, Validators.min(0.01)]],
    chargerType: [''],
    maxConcurrentCharges: [1, [Validators.required, Validators.min(1)]],
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    if (!this.providerId) return;
    this.loading.set(true);
    this.providerService.listStations(this.providerId).subscribe({
      next: (stations) => {
        this.stations.set(stations);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load your stations.');
        this.loading.set(false);
      },
    });
  }

  startAdd(): void {
    this.form.reset({ name: '', address: '', city: '', state: '', zipCode: '', latitude: 0, longitude: 0, ratePerHour: 0, chargerType: '', maxConcurrentCharges: 1 });
    this.editing.set('new');
    this.error.set(null);
    this.notice.set(null);
  }

  startEdit(station: Station): void {
    this.form.reset({
      name: station.name,
      address: station.address,
      city: station.city,
      state: station.state,
      zipCode: station.zipCode,
      latitude: station.latitude,
      longitude: station.longitude,
      ratePerHour: station.ratePerHour,
      chargerType: station.chargerType ?? '',
      maxConcurrentCharges: station.maxConcurrentCharges ?? 1,
    });
    this.editing.set(station.stationId!);
    this.error.set(null);
    this.notice.set(null);
  }

  cancel(): void {
    this.editing.set(null);
  }

  useCurrentLocation(): void {
    if (!navigator.geolocation) return;
    this.locating.set(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.form.patchValue({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        this.locating.set(false);
      },
      () => this.locating.set(false),
    );
  }

  submit(): void {
    const target = this.editing();
    if (this.form.invalid || target === null || !this.providerId) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);

    const payload = this.form.getRawValue();
    const request =
      target === 'new'
        ? this.providerService.createStation(this.providerId, payload)
        : this.providerService.updateStation(target, payload);

    request.subscribe({
      next: (station) => {
        this.stations.set(
          target === 'new'
            ? [...this.stations(), station]
            : this.stations().map((s) => (s.stationId === station.stationId ? station : s)),
        );
        this.notice.set(target === 'new' ? 'Station added.' : 'Station updated.');
        this.editing.set(null);
        this.saving.set(false);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.error ?? 'Could not save this station.');
      },
    });
  }

  remove(station: Station): void {
    this.removingId.set(station.stationId!);
    this.providerService.deleteStation(station.stationId!).subscribe({
      next: () => {
        this.stations.set(this.stations().map((s) => (s.stationId === station.stationId ? { ...s, isActive: false } : s)));
        this.removingId.set(null);
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'Could not remove this station.');
        this.removingId.set(null);
      },
    });
  }

  reactivate(station: Station): void {
    this.removingId.set(station.stationId!);
    this.providerService.updateStation(station.stationId!, { ...station, isActive: true }).subscribe({
      next: (updated) => {
        this.stations.set(this.stations().map((s) => (s.stationId === updated.stationId ? updated : s)));
        this.removingId.set(null);
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'Could not reactivate this station.');
        this.removingId.set(null);
      },
    });
  }
}
