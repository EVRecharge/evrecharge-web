import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';
import { MfaChallenge } from '../models/auth.model';

interface AuthResponse {
  message: string;
  user: User;
  token: string;
  refreshToken: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrls.user;

  register(user: User, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/register`, { ...user, password });
  }

  login(email: string, password: string): Observable<AuthResponse | MfaChallenge> {
    return this.http.post<AuthResponse | MfaChallenge>(`${this.base}/login`, { email, password });
  }

  loginMfa(mfaToken: string, code: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/login/mfa`, { mfaToken, code });
  }

  getMfaEnabled(userId: number): Observable<boolean> {
    return this.getById(userId).pipe(map((a) => !!a.mfaEnabled));
  }

  mfaSetup(userId: number): Observable<{ secret: string; otpAuthUri: string }> {
    return this.http.post<{ secret: string; otpAuthUri: string }>(`${this.base}/${userId}/mfa/setup`, null);
  }

  mfaEnable(userId: number, code: string): Observable<{ recoveryCodes: string[] }> {
    return this.http.post<{ recoveryCodes: string[] }>(`${this.base}/${userId}/mfa/enable`, { code });
  }

  mfaDisable(userId: number, code: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${userId}/mfa/disable`, { code });
  }

  getById(userId: number): Observable<User> {
    return this.http.get<User>(`${this.base}/${userId}`);
  }

  update(userId: number, user: User): Observable<User> {
    return this.http.put<User>(`${this.base}/${userId}`, user);
  }
}
