import { Routes } from '@angular/router';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register/driver',
    loadComponent: () => import('./features/auth/register-driver/register-driver').then((m) => m.RegisterDriver),
  },
  {
    path: 'register/provider',
    loadComponent: () =>
      import('./features/auth/register-provider/register-provider').then((m) => m.RegisterProvider),
  },
  {
    path: 'user',
    canMatch: [roleGuard('USER')],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'find-charging' },
      {
        path: 'find-charging',
        loadComponent: () => import('./features/user/find-charging/find-charging').then((m) => m.FindCharging),
      },
      {
        path: 'book/:providerId',
        loadComponent: () => import('./features/user/book-charging/book-charging').then((m) => m.BookCharging),
      },
      {
        path: 'bookings',
        loadComponent: () => import('./features/user/my-bookings/my-bookings').then((m) => m.MyBookings),
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/user/profile/user-profile').then((m) => m.UserProfile),
      },
    ],
  },
  {
    path: 'provider',
    canMatch: [roleGuard('PROVIDER')],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'profile' },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/provider/profile/provider-profile').then((m) => m.ProviderProfile),
      },
      {
        path: 'bookings',
        loadComponent: () =>
          import('./features/provider/bookings/provider-bookings').then((m) => m.ProviderBookings),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
