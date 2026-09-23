import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Booking } from '../models/booking.model';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrls.booking;

  create(booking: Booking): Observable<{ message: string; booking: Booking }> {
    return this.http.post<{ message: string; booking: Booking }>(this.base, booking);
  }

  getById(bookingId: number): Observable<Booking> {
    return this.http.get<Booking>(`${this.base}/${bookingId}`);
  }

  getByUser(userId: number): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.base}/user/${userId}`);
  }

  getByProvider(providerId: number): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.base}/provider/${providerId}`);
  }

  updateStatus(bookingId: number, status: string): Observable<Booking> {
    return this.http.patch<Booking>(`${this.base}/${bookingId}/status`, null, { params: { status } });
  }

  cancel(bookingId: number): Observable<{ message: string; booking: Booking }> {
    return this.http.post<{ message: string; booking: Booking }>(`${this.base}/${bookingId}/cancel`, null);
  }
}
