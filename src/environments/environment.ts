export const environment = {
  production: false,
  apiUrls: {
    user: 'http://localhost:8001/api/users',
    provider: 'http://localhost:8002/api/providers',
    booking: 'http://localhost:8003/api/bookings',
    location: 'http://localhost:8004/api/locations',
  },
  // Replace with a real key from https://console.cloud.google.com/google/maps-apis
  googleMapsApiKey: '',
};
