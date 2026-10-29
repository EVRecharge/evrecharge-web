import { Component, OnInit, ViewChild, computed, effect, inject, signal, untracked } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GoogleMap, MapMarker, MapInfoWindow } from '@angular/google-maps';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProviderService } from '../../../core/services/provider.service';
import { LocationService } from '../../../core/services/location.service';
import { GoogleMapsLoaderService } from '../../../core/services/google-maps-loader.service';
import { Provider } from '../../../core/models/provider.model';

type SortMode = 'distance' | 'rate' | 'availability';

@Component({
  selector: 'evr-find-charging',
  standalone: true,
  imports: [
    FormsModule,
    DecimalPipe,
    GoogleMap,
    MapMarker,
    MapInfoWindow,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './find-charging.html',
  styleUrl: './find-charging.scss',
})
export class FindCharging implements OnInit {
  private readonly providerService = inject(ProviderService);
  private readonly mapsLoader = inject(GoogleMapsLoaderService);
  private readonly router = inject(Router);

  @ViewChild(GoogleMap) private googleMap?: GoogleMap;

  readonly loading = signal(true);
  readonly mapReady = signal(false);
  readonly mapsConfigured = this.mapsLoader.isConfigured;
  readonly userLocation = signal<{ lat: number; lng: number } | null>(null);
  readonly allProviders = signal<Provider[]>([]);
  readonly cityFilter = signal('');
  readonly sortMode = signal<SortMode>('distance');
  readonly selectedProvider = signal<Provider | null>(null);
  readonly locationError = signal('');
  /** Geocoded centre of the searched city; used as distance origin when the driver's GPS is unavailable. */
  private readonly cityCenter = signal<google.maps.LatLngLiteral | null>(null);
  private readonly mapCenterOverride = signal<google.maps.LatLngLiteral | null>(null);

  // Default view centers on Mumbai until we know the driver's actual location.
  readonly mapCenter = computed<google.maps.LatLngLiteral>(
    () => this.mapCenterOverride() ?? this.cityCenter() ?? this.userLocation() ?? { lat: 19.076, lng: 72.8777 },
  );
  readonly mapOptions: google.maps.MapOptions = { zoom: 12, mapTypeControl: false, streetViewControl: false };

  readonly providers = computed(() => {
    const city = this.cityFilter().trim().toLowerCase();
    let list = this.allProviders();
    if (city) {
      list = list.filter((p) => (p.city ?? '').toLowerCase().includes(city));
    }
    const origin = this.userLocation() ?? this.cityCenter();
    if (origin) {
      list = list.map((p) => ({
        ...p,
        distanceKm: LocationService.haversineKm(origin.lat, origin.lng, p.latitude, p.longitude),
      }));
    }
    const mode = this.sortMode();
    return [...list].sort((a, b) => {
      if (mode === 'rate') return a.ratePerHour - b.ratePerHour;
      if (mode === 'availability') return (b.maxConcurrentCharges ?? 0) - (a.maxConcurrentCharges ?? 0);
      return (a.distanceKm ?? Number.MAX_VALUE) - (b.distanceKm ?? Number.MAX_VALUE);
    });
  });

  constructor() {
    // Keep the map in sync with whatever the list currently shows.
    effect(() => {
      const list = this.providers();
      this.mapReady();
      untracked(() => this.fitMap(list));
    });
  }

  ngOnInit(): void {
    this.mapsLoader.load().then((ready) => this.mapReady.set(ready));
    this.locateMe();
    this.loadProviders();
  }

  locateMe(): void {
    if (!navigator.geolocation) {
      this.locationError.set('Location is not supported by this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.locationError.set('');
        this.mapCenterOverride.set(null);
        this.userLocation.set({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => this.locationError.set('Could not get your location. Allow location access or search by city.'),
    );
  }

  loadProviders(): void {
    this.loading.set(true);
    this.providerService.getAllActive().subscribe({
      next: (providers) => {
        this.allProviders.set(providers);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /** Applies the city filter, centres the map on that city and ranks results by distance from it. */
  searchCity(): void {
    const city = this.cityFilter().trim();
    this.selectedProvider.set(null);
    this.mapCenterOverride.set(null);
    if (!city) {
      this.cityCenter.set(null);
      return;
    }
    this.sortMode.set('distance');
    this.geocodeCity(city).then((center) => {
      this.cityCenter.set(center);
      if (center) this.userLocation.set(null);
    });
  }

  onSortChange(mode: SortMode): void {
    this.sortMode.set(mode);
    if (mode === 'distance' && !this.userLocation() && !this.cityCenter()) {
      this.locateMe();
    }
  }

  private async geocodeCity(city: string): Promise<google.maps.LatLngLiteral | null> {
    if (window.google?.maps) {
      try {
        const res = await new google.maps.Geocoder().geocode({ address: `${city}, India` });
        const loc = res.results[0]?.geometry.location;
        if (loc) return { lat: loc.lat(), lng: loc.lng() };
      } catch {
        /* fall through to provider centroid */
      }
    }
    const matches = this.providers().filter((p) => p.latitude != null && p.longitude != null);
    if (!matches.length) return null;
    return {
      lat: matches.reduce((sum, p) => sum + p.latitude, 0) / matches.length,
      lng: matches.reduce((sum, p) => sum + p.longitude, 0) / matches.length,
    };
  }

  fitMap(list: Provider[]): void {
    const map = this.googleMap?.googleMap;
    if (!map || !window.google?.maps) return;
    const points = list.filter((p) => p.latitude != null && p.longitude != null);
    if (!points.length) return;
    if (points.length === 1) {
      map.setCenter({ lat: points[0].latitude, lng: points[0].longitude });
      map.setZoom(14);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    points.slice(0, 20).forEach((p) => bounds.extend({ lat: p.latitude, lng: p.longitude }));
    const origin = this.userLocation() ?? this.cityCenter();
    if (origin) bounds.extend(origin);
    map.fitBounds(bounds, 48);
  }

  selectProvider(provider: Provider, infoWindow: MapInfoWindow, marker: MapMarker): void {
    this.selectedProvider.set(provider);
    infoWindow.open(marker);
  }

  book(provider: Provider): void {
    this.router.navigate(['/user/book', provider.providerId]);
  }
}
