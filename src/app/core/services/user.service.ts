import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';

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

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/login`, { email, password });
  }

  getById(userId: number): Observable<User> {
    return this.http.get<User>(`${this.base}/${userId}`);
  }

  update(userId: number, user: User): Observable<User> {
    return this.http.put<User>(`${this.base}/${userId}`, user);
  }
}
