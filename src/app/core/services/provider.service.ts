import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Provider } from '../models/provider.model';

interface RegisterResponse {
  message: string;
  provider: Provider;
}

@Injectable({ providedIn: 'root' })
export class ProviderService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrls.provider;

  /**
   * provider-service has no login/OAuth endpoint yet (unlike user-service), only registration
   * and lookup. We use getByEmail to detect an existing account and register() otherwise.
   */
  getByEmail(email: string): Observable<Provider> {
    return this.http.get<Provider>(`${this.base}/email/${encodeURIComponent(email)}`);
  }

  register(provider: Provider): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.base}/register`, provider);
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

  update(providerId: number, provider: Provider): Observable<Provider> {
    return this.http.put<Provider>(`${this.base}/${providerId}`, provider);
  }
}
