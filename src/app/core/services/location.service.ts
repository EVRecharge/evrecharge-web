import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LocationRecord {
  locationId?: number;
  entityId: number;
  entityType: 'USER' | 'PROVIDER';
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  name?: string;
}

export interface DistanceResult {
  distance_meters: number;
  distance_km: number;
  distance_miles: number;
}

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrls.location;

  save(location: LocationRecord): Observable<{ message: string; location: LocationRecord }> {
    return this.http.post<{ message: string; location: LocationRecord }>(this.base, location);
  }

  getDistance(lat1: number, lon1: number, lat2: number, lon2: number): Observable<DistanceResult> {
    return this.http.get<DistanceResult>(`${this.base}/distance`, {
      params: { lat1, lon1, lat2, lon2 },
    });
  }

  /** Haversine distance in km, used for client-side sorting without one round-trip per provider. */
  static haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = LocationService.toRad(lat2 - lat1);
    const dLon = LocationService.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(LocationService.toRad(lat1)) * Math.cos(LocationService.toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRad(value: number): number {
    return (value * Math.PI) / 180;
  }
}
