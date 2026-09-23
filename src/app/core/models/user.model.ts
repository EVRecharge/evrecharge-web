export interface User {
  userId?: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  createdAt?: string;
  updatedAt?: string;
}
