/** One charging location owned by a provider account. Drivers search and book at this level. */
export interface Station {
  stationId?: number;
  providerId?: number;
  /** Owning account's company name (read-only). */
  companyName?: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  ratePerHour: number;
  chargerType?: string;
  maxConcurrentCharges?: number;
  isActive?: boolean;
  /** Client-side only: populated when a distance search has been run. */
  distanceKm?: number;
}

export interface Provider {
  providerId?: number;
  companyName: string;
  contactPersonName: string;
  email: string;
  phoneNumber: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  ratePerHour: number;
  chargerType?: string;
  maxConcurrentCharges?: number;
  mfaEnabled?: boolean;
  /** Write-only: send to set or replace; the server returns only the masked forms below. */
  panNumber?: string;
  aadhaarNumber?: string;
  panMasked?: string;
  aadhaarMasked?: string;
  /** Optional profile photo as an image data URL. */
  profilePicture?: string;
  createdAt?: string;
  updatedAt?: string;
  /** Client-side only: populated when a distance search has been run. */
  distanceKm?: number;
}
