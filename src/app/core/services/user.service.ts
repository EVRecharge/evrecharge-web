import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';

interface OAuthLoginResponse {
  message: string;
  user: User;
  token: string;
  refreshToken: string;
}

interface RegisterResponse {
  message: string;
  user: User;
  token: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrls.user;

  /** Passwordless login-or-register, mirrors the backend's OAuth upsert contract. */
  continueWithEmail(email: string, firstName: string, lastName: string): Observable<OAuthLoginResponse> {
    const params = new HttpParams()
      .set('email', email)
      .set('firstName', firstName)
      .set('lastName', lastName)
      .set('oauthProvider', 'local')
      .set('oauthId', email);
    return this.http.post<OAuthLoginResponse>(`${this.base}/oauth/login`, null, { params });
  }

  register(user: User): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.base}/register`, user);
  }

  getById(userId: number): Observable<User> {
    return this.http.get<User>(`${this.base}/${userId}`);
  }

  update(userId: number, user: User): Observable<User> {
    return this.http.put<User>(`${this.base}/${userId}`, user);
  }
}
