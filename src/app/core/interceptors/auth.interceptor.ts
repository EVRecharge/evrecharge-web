import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/** Attaches the user-service JWT when we have one. The other services currently permitAll. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).session()?.token;
  if (!token) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
