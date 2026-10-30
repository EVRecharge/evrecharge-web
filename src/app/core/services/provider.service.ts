import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Provider, Station } from '../models/provider.model';

interface AuthResponse {
  message: string;
  provider: Provider;
  token: string;
  refreshToken: string;
}

@Injectable({ providedIn: 'root' })
export class ProviderService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrls.provider;

  register(provider: Provider, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/register`, { ...provider, password });
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/login`, { email, password });
  }

  getById(providerId: number): Observable<Provider> {
    return this.http.get<Provider>(`${this.base}/${providerId}`);
  }

  getAllActive(): Observable<Provider[]> {
    return this.http.get<Provider[]>(this.base);
  }

  getByCity(city: string): Observable<Provider[]> {
    return this.http.get<Provider[]>(`${this.base}/city/${encodeURIComponent(city)}`);
  }

  private get stationsBase(): string {
    return this.base.replace(/\/providers$/, '/stations');
  }

  getAllStations(): Observable<Station[]> {
    return this.http.get<Station[]>(this.stationsBase);
  }

  getStation(stationId: number): Observable<Station> {
    return this.http.get<Station>(`${this.stationsBase}/${stationId}`);
  }

  listStations(providerId: number): Observable<Station[]> {
    return this.http.get<Station[]>(`${this.base}/${providerId}/stations`);
  }

  createStation(providerId: number, station: Station): Observable<Station> {
    return this.http.post<Station>(`${this.base}/${providerId}/stations`, station);
  }

  updateStation(stationId: number, station: Station): Observable<Station> {
    return this.http.put<Station>(`${this.stationsBase}/${stationId}`, station);
  }

  deleteStation(stationId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.stationsBase}/${stationId}`);
  }

  update(providerId: number, provider: Provider): Observable<Provider> {
    return this.http.put<Provider>(`${this.base}/${providerId}`, provider);
  }
}
