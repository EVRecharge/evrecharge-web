import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { Role } from '../models/auth.model';
import { AuthService } from '../services/auth.service';

/** Route-level guard factory: `canMatch: [roleGuard('USER')]`. */
export function roleGuard(required: Role): CanMatchFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const session = auth.session();

    if (!session) {
      return router.parseUrl('/login');
    }
    if (session.role !== required) {
      return router.parseUrl(session.role === 'USER' ? '/user' : '/provider');
    }
    return true;
  };
}
