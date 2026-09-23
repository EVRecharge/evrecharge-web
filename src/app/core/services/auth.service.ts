import { Injectable, computed, inject, signal } from '@angular/core';
import { map, Observable } from 'rxjs';

import { Session } from '../models/auth.model';
import { User } from '../models/user.model';
import { Provider } from '../models/provider.model';
import { UserService } from './user.service';
import { ProviderService } from './provider.service';

const STORAGE_KEY = 'evrecharge.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userService = inject(UserService);
  private readonly providerService = inject(ProviderService);

  private readonly _session = signal<Session | null>(this.restore());

  readonly session = this._session.asReadonly();
  readonly isAuthenticated = computed(() => this._session() !== null);
  readonly role = computed(() => this._session()?.role ?? null);

  registerAsUser(user: User, password: string): Observable<Session> {
    return this.userService.register(user, password).pipe(
      map((res) => this.persist({
        role: 'USER',
        token: res.token,
        refreshToken: res.refreshToken,
        profileId: res.user.userId!,
        email: res.user.email,
        displayName: `${res.user.firstName} ${res.user.lastName}`.trim(),
      })),
    );
  }

  loginAsUser(email: string, password: string): Observable<Session> {
    return this.userService.login(email, password).pipe(
      map((res) => this.persist({
        role: 'USER',
        token: res.token,
        refreshToken: res.refreshToken,
        profileId: res.user.userId!,
        email: res.user.email,
        displayName: `${res.user.firstName} ${res.user.lastName}`.trim(),
      })),
    );
  }

  registerAsProvider(provider: Provider, password: string): Observable<Session> {
    return this.providerService.register(provider, password).pipe(
      map((res) => this.persist({
        role: 'PROVIDER',
        token: res.token,
        refreshToken: res.refreshToken,
        profileId: res.provider.providerId!,
        email: res.provider.email,
        displayName: res.provider.companyName,
      })),
    );
  }

  loginAsProvider(email: string, password: string): Observable<Session> {
    return this.providerService.login(email, password).pipe(
      map((res) => this.persist({
        role: 'PROVIDER',
        token: res.token,
        refreshToken: res.refreshToken,
        profileId: res.provider.providerId!,
        email: res.provider.email,
        displayName: res.provider.companyName,
      })),
    );
  }

  logout(): void {
    this._session.set(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  private persist(session: Session): Session {
    this._session.set(session);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return session;
  }

  private restore(): Session | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  }
}
