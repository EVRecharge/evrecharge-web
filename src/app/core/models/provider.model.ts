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
  createdAt?: string;
  updatedAt?: string;
  /** Client-side only: populated when a distance search has been run. */
  distanceKm?: number;
}
