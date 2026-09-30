export const environment = {
  production: true,
  // Relative — nginx on this same host reverse-proxies these paths to each backend's
  // plain-HTTP EC2 instance, so the browser only ever talks to the HTTPS domain (avoids
  // mixed-content blocking that a direct http://<backend-ip> URL would trigger).
  apiUrls: {
    user: '/api/users',
    provider: '/api/providers',
    booking: '/api/bookings',
    location: '/api/locations',
    payment: '/api/payments',
    chatbot: '/api/chatbot',
  },
  // Replace with a real key from https://console.cloud.google.com/google/maps-apis
  googleMapsApiKey: 'AIzaSyC_d2XJrs7UlPHyN-iyUo95ksWK6oHkY4Y',
};
