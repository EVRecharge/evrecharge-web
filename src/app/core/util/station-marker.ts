/**
 * Map pin for a charging point: a teardrop with a fuel-pump-style dispenser carrying a lightning
 * bolt, so it reads as "EV charging station" at a glance. Call only once the Maps API has loaded
 * (it builds google.maps.Size/Point objects).
 */
export function stationMarkerIcon(color: string): google.maps.Icon {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 40 48">` +
    `<path d="M20 47C20 47 3 29.5 3 18.5a17 17 0 0 1 34 0C37 29.5 20 47 20 47Z" fill="${color}" stroke="white" stroke-width="2"/>` +
    `<rect x="11.5" y="9.5" width="11" height="18" rx="1.6" fill="white"/>` +
    `<rect x="13.5" y="11.5" width="7" height="4.5" rx="0.8" fill="${color}"/>` +
    `<path d="M18.2 17.2l-2.8 4.4h2.2l-.9 3.8 3.4-5h-2.3l.9-3.2z" fill="${color}"/>` +
    `<path d="M22.5 14h2.2a2 2 0 0 1 2 2v7.2a1.4 1.4 0 0 0 2.8 0V15.4l-2.2-2.6" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>` +
    `</svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(40, 48),
    anchor: new google.maps.Point(20, 47),
  };
}
