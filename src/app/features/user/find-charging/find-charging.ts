import { Component, OnInit, computed, inject, signal } from '@angular/core';
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

  readonly loading = signal(true);
  readonly mapReady = signal(false);
  readonly mapsConfigured = this.mapsLoader.isConfigured;
  readonly userLocation = signal<{ lat: number; lng: number } | null>(null);
  readonly allProviders = signal<Provider[]>([]);
  readonly cityFilter = signal('');
  readonly sortMode = signal<SortMode>('distance');
  readonly selectedProvider = signal<Provider | null>(null);

  // Default view centers on Mumbai until we know the driver's actual location.
  readonly mapCenter = computed<google.maps.LatLngLiteral>(
    () => this.userLocation() ?? { lat: 19.076, lng: 72.8777 },
  );
  readonly mapOptions: google.maps.MapOptions = { zoom: 12, mapTypeControl: false, streetViewControl: false };

  readonly providers = computed(() => {
    const city = this.cityFilter().trim().toLowerCase();
    let list = this.allProviders();
    if (city) {
      list = list.filter((p) => p.city.toLowerCase().includes(city));
    }
    const mode = this.sortMode();
    return [...list].sort((a, b) => {
      if (mode === 'rate') return a.ratePerHour - b.ratePerHour;
      if (mode === 'availability') return (b.maxConcurrentCharges ?? 0) - (a.maxConcurrentCharges ?? 0);
      return (a.distanceKm ?? Number.MAX_VALUE) - (b.distanceKm ?? Number.MAX_VALUE);
    });
  });

  ngOnInit(): void {
    this.mapsLoader.load().then((ready) => this.mapReady.set(ready));
    this.locateMe();
    this.loadProviders();
  }

  locateMe(): void {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.userLocation.set({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        this.recomputeDistances();
      },
      () => {
        /* silently fall back to distance-less list */
      },
    );
  }

  loadProviders(): void {
    this.loading.set(true);
    this.providerService.getAllActive().subscribe({
      next: (providers) => {
        this.allProviders.set(providers);
        this.recomputeDistances();
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private recomputeDistances(): void {
    const origin = this.userLocation();
    if (!origin) return;
    this.allProviders.set(
      this.allProviders().map((p) => ({
        ...p,
        distanceKm: LocationService.haversineKm(origin.lat, origin.lng, p.latitude, p.longitude),
      })),
    );
  }

  selectProvider(provider: Provider, infoWindow: MapInfoWindow, marker: MapMarker): void {
    this.selectedProvider.set(provider);
    infoWindow.open(marker);
  }

  book(provider: Provider): void {
    this.router.navigate(['/user/book', provider.providerId]);
  }
}
