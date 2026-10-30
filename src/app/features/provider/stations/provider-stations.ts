import { Component, OnInit, ViewChild, computed, effect, inject, signal, untracked } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { GoogleMap, MapMarker } from '@angular/google-maps';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProviderService } from '../../../core/services/provider.service';
import { AuthService } from '../../../core/services/auth.service';
import { GoogleMapsLoaderService } from '../../../core/services/google-maps-loader.service';
import { stationMarkerIcon } from '../../../core/util/station-marker';
import { Station } from '../../../core/models/provider.model';

@Component({
  selector: 'evr-provider-stations',
  standalone: true,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    GoogleMap,
    MapMarker,
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
  private readonly mapsLoader = inject(GoogleMapsLoaderService);

  @ViewChild(GoogleMap) private googleMap?: GoogleMap;

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

  readonly mapReady = signal(false);
  readonly mapsConfigured = this.mapsLoader.isConfigured;
  readonly geocoding = signal(false);
  /** The pin for the address being entered; follows the latitude/longitude fields. */
  readonly draftPin = signal<google.maps.LatLngLiteral | null>(null);

  readonly mapOptions: google.maps.MapOptions = { zoom: 5, mapTypeControl: false, streetViewControl: false };
  readonly mapCenter = signal<google.maps.LatLngLiteral>({ lat: 20.5937, lng: 78.9629 }); // India
  readonly stationMarker = computed<google.maps.MarkerOptions>(() =>
    this.mapReady() ? { icon: stationMarkerIcon('#0b6e4f') } : {},
  );
  /** The movable pin for the station being added/edited -- same charger glyph, in orange so it stands out. */
  readonly draftMarker = computed<google.maps.MarkerOptions>(() =>
    this.mapReady() ? { icon: stationMarkerIcon('#e8710a'), draggable: true } : { draggable: true },
  );

  /** Pins for every listed station, except the one currently open in the form (its draft pin replaces it). */
  readonly stationPins = computed(() =>
    this.stations().filter(
      (s) => s.isActive !== false && s.stationId !== this.editing() && (s.latitude || s.longitude),
    ),
  );

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

  constructor() {
    // Keep the draft pin in step with the coordinate fields, however they were changed.
    this.form.valueChanges.subscribe(({ latitude, longitude }) => {
      this.draftPin.set(latitude && longitude ? { lat: latitude, lng: longitude } : null);
    });
    // Re-frame the map whenever the set of pins changes.
    effect(() => {
      this.stationPins();
      const draft = this.draftPin();
      this.mapReady();
      untracked(() => this.fitMap(draft));
    });
  }

  ngOnInit(): void {
    this.mapsLoader.load().then((ready) => this.mapReady.set(ready));
    this.load();
  }

  /** Turns the typed address into coordinates and drops the pin there. */
  locateAddress(): void {
    const { address, city, state, zipCode } = this.form.getRawValue();
    if (!window.google?.maps || !address.trim() || !city.trim() || this.geocoding()) return;
    this.geocoding.set(true);
    new google.maps.Geocoder()
      .geocode({ address: [address, city, state, zipCode, 'India'].filter((p) => p.trim()).join(', ') })
      .then((res) => {
        const loc = res.results[0]?.geometry.location;
        if (loc) {
          this.form.patchValue({ latitude: loc.lat(), longitude: loc.lng() });
        } else {
          this.error.set("We couldn't find that address on the map. Check it, or click the map to place the pin.");
        }
      })
      .catch(() => this.error.set("We couldn't find that address on the map. Click the map to place the pin."))
      .finally(() => this.geocoding.set(false));
  }

  /** Clicking the map while the form is open moves the pin there. */
  onMapClick(event: google.maps.MapMouseEvent): void {
    if (this.editing() === null || !event.latLng) return;
    this.form.patchValue({ latitude: event.latLng.lat(), longitude: event.latLng.lng() });
  }

  onPinDragEnd(event: google.maps.MapMouseEvent): void {
    if (!event.latLng) return;
    this.form.patchValue({ latitude: event.latLng.lat(), longitude: event.latLng.lng() });
  }

  fitMap(draft: google.maps.LatLngLiteral | null): void {
    const map = this.googleMap?.googleMap;
    if (!map || !window.google?.maps) return;
    if (draft) {
      map.setCenter(draft);
      map.setZoom(15);
      return;
    }
    const pins = this.stationPins();
    if (!pins.length) return;
    if (pins.length === 1) {
      map.setCenter({ lat: pins[0].latitude, lng: pins[0].longitude });
      map.setZoom(14);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    pins.forEach((p) => bounds.extend({ lat: p.latitude, lng: p.longitude }));
    map.fitBounds(bounds, 48);
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
      () => {
        this.error.set('Could not get your location. Allow location access in your browser, or click the map to place the pin.');
        this.locating.set(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
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
