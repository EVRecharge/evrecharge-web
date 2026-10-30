import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Provider, Station } from '../models/provider.model';
import { MfaChallenge } from '../models/auth.model';

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

  login(email: string, password: string): Observable<AuthResponse | MfaChallenge> {
    return this.http.post<AuthResponse | MfaChallenge>(`${this.base}/login`, { email, password });
  }

  loginMfa(mfaToken: string, code: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/login/mfa`, { mfaToken, code });
  }

  getMfaEnabled(providerId: number): Observable<boolean> {
    return this.getById(providerId).pipe(map((a) => !!a.mfaEnabled));
  }

  mfaSetup(providerId: number): Observable<{ secret: string; otpAuthUri: string }> {
    return this.http.post<{ secret: string; otpAuthUri: string }>(`${this.base}/${providerId}/mfa/setup`, null);
  }

  mfaEnable(providerId: number, code: string): Observable<{ recoveryCodes: string[] }> {
    return this.http.post<{ recoveryCodes: string[] }>(`${this.base}/${providerId}/mfa/enable`, { code });
  }

  mfaDisable(providerId: number, code: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${providerId}/mfa/disable`, { code });
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
