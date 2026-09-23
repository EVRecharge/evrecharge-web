# EVRecharge Web

Angular web front-end for the EVRecharge platform: an interface for **drivers** to find, book, and manage
EV charging sessions, and for **charging providers** to list their station and manage incoming bookings.

Built with Angular 22 (standalone components, signals), Angular Material, and `@angular/google-maps`.
It talks directly to the EVRecharge backend microservices — no mock data.

## Backend services

| Service | Repo | Default port |
|---|---|---|
| User service | [EVRecharge/user-service](https://github.com/EVRecharge/user-service) | 8001 |
| Provider service | [EVRecharge/provider-service](https://github.com/EVRecharge/provider-service) | 8002 |
| Booking service | [EVRecharge/booking-service](https://github.com/EVRecharge/booking-service) | 8003 |
| Location service | [EVRecharge/location-service](https://github.com/EVRecharge/location-service) | 8004 |

Base URLs are configured in [`src/environments/environment.ts`](src/environments/environment.ts) (dev) and
[`environment.prod.ts`](src/environments/environment.prod.ts) (prod, expects a reverse proxy/gateway at `/api/*`).

Each service repo ships its own `docker-compose.yml` — start Postgres + the service from each repo, or run
all four with your own compose file, before using this app.

## Getting started

```bash
npm install
npm start        # ng serve, http://localhost:4200
```

To enable the map, add a Google Maps JavaScript API key (with Maps + Geocoding enabled) to
`googleMapsApiKey` in the environment files. Without a key the app runs normally but shows a
placeholder instead of the map.

## Authentication model (matches the backend as it exists today)

- **Drivers** sign in with just name + email via `user-service`'s `/api/users/oauth/login`, which
  upserts the account and returns a JWT. That JWT is attached as a `Bearer` token to subsequent requests.
- **Providers** have no login/JWT endpoint yet in `provider-service` — only `register` and
  lookup-by-email. The app "logs in" a provider by looking their email up (`GET /api/providers/email/{email}`);
  a 404 routes them to registration instead. This means provider sessions aren't backed by a real token today.
  **Known gap**: add an `oauth/login`-equivalent (and JWT issuance) to `provider-service`, mirroring
  `user-service`, to close this out.
- All four services currently `permitAll` every endpoint (see each `SecurityConfig`), so there's no
  server-side enforcement yet beyond what's described above.

## "Availability"

`provider-service`'s `ProviderDTO` has no explicit availability flag — the UI surfaces
`maxConcurrentCharges` ("available charging slots") as the availability signal, and relies on
`GET /api/providers` (which already filters to `isActive = true`) for "is this station live".

## Project structure

```
src/app/
  core/            # services, models, guards, interceptor — talks to the 4 backend APIs
  shared/          # navbar
  features/
    auth/          # login (driver + provider tabs), provider registration
    user/          # find-charging (map + list), book-charging, my-bookings, profile
    provider/      # station profile (register/edit), bookings management
```
