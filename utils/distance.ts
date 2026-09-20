const EARTH_RADIUS_KM = 6371;

export function haversineDistanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

// The point at half the route's actual travelled distance, not the middle
// array index -- a route with many closely-spaced points in one stretch
// (e.g. a winding street) and a few long straight segments elsewhere would
// put the array-index midpoint far off-center along the real path. Used to
// place a route's duration label somewhere representative of its middle,
// regardless of how unevenly Mapbox spaced the geometry's points.
export function midpointAlongPath<T extends { latitude: number; longitude: number }>(
  points: T[],
): { latitude: number; longitude: number } {
  if (points.length === 0) {
    return { latitude: 0, longitude: 0 };
  }
  if (points.length === 1) {
    return points[0];
  }

  const segmentLengths: number[] = [];
  let totalKm = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const segmentKm = haversineDistanceKm(points[i], points[i + 1]);
    segmentLengths.push(segmentKm);
    totalKm += segmentKm;
  }

  // Degenerate route (all points coincide) -- any point is as good as any
  // other, fall back to the array midpoint.
  if (totalKm === 0) {
    return points[Math.floor(points.length / 2)];
  }

  const halfKm = totalKm / 2;
  let travelledKm = 0;
  for (let i = 0; i < segmentLengths.length; i++) {
    const segmentKm = segmentLengths[i];
    if (travelledKm + segmentKm >= halfKm) {
      const t = segmentKm === 0 ? 0 : (halfKm - travelledKm) / segmentKm;
      const a = points[i];
      const b = points[i + 1];
      return {
        latitude: a.latitude + (b.latitude - a.latitude) * t,
        longitude: a.longitude + (b.longitude - a.longitude) * t,
      };
    }
    travelledKm += segmentKm;
  }

  return points[points.length - 1];
}
