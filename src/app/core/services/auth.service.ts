import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, map, Observable, of, tap, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

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

  /** Single-step login-or-register for users, backed by the OAuth upsert endpoint. */
  continueAsUser(email: string, firstName: string, lastName: string): Observable<Session> {
    return this.userService.continueWithEmail(email, firstName, lastName).pipe(
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

  registerUser(user: User): Observable<Session> {
    return this.userService.register(user).pipe(
      map((res) => this.persist({
        role: 'USER',
        token: res.token,
        profileId: res.user.userId!,
        email: res.user.email,
        displayName: `${res.user.firstName} ${res.user.lastName}`.trim(),
      })),
    );
  }

  /**
   * provider-service currently exposes no login endpoint (see ProviderService), so "login"
   * here means "look the account up by email". A 404 signals the caller to route to registration.
   */
  findProviderAccount(email: string): Observable<Provider | null> {
    return this.providerService.getByEmail(email).pipe(
      catchError((err: HttpErrorResponse) => (err.status === 404 ? of(null) : throwError(() => err))),
    );
  }

  continueAsProvider(provider: Provider): Session {
    return this.persist({
      role: 'PROVIDER',
      profileId: provider.providerId!,
      email: provider.email,
      displayName: provider.companyName,
    });
  }

  registerProvider(provider: Provider): Observable<Session> {
    return this.providerService.register(provider).pipe(
      map((res) => this.persist({
        role: 'PROVIDER',
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
