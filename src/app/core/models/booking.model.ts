export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Booking {
  bookingId?: number;
  userId: number;
  providerId: number;
  stationId?: number;
  startTime: string;
  endTime: string;
  durationInHours?: number;
  status?: BookingStatus;
  totalCost?: number;
  notes?: string;
  address?: string;
  city?: string;
  createdAt?: string;
  updatedAt?: string;
}
