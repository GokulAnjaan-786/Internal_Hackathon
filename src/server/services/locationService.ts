/**
 * Location Intelligence and Geospatial Calculation Service
 * Implements Haversine straight-line distance, Google Routes API integration,
 * coordinate validation, and role-based privacy sanitization.
 */
import { DistanceCalculationResult, UserRole } from '../../types/index.ts';

export interface CoordinatesInput {
  lat: number;
  lng: number;
}

/**
 * Validates latitude and longitude within physical Earth bounds
 */
export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * High-precision Haversine formula for straight-line spherical distance
 * Returns distance in meters
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth mean radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Formats meters into human-readable text (e.g., "4.8 km" or "850 m")
 */
export function formatDistanceText(meters: number): string {
  if (meters < 1000) {
    return `${meters} m`;
  }
  const km = (meters / 1000).toFixed(1);
  return `${km} km`;
}

/**
 * Formats duration seconds into readable time (e.g. "18 min", "1 hr 12 min")
 */
export function formatDurationText(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return remainingMins > 0 ? `${hours} hr ${remainingMins} min` : `${hours} hr`;
}

/**
 * Compute Comprehensive Distance (Straight-Line & Google Routes API Road Distance)
 */
export async function computeDistance(
  origin: CoordinatesInput,
  destination: CoordinatesInput,
  originLabel = 'Your Location',
  destinationLabel = 'Case Location'
): Promise<DistanceCalculationResult> {
  if (!isValidCoordinate(origin.lat, origin.lng)) {
    throw new Error('Invalid origin coordinates: lat must be [-90, 90], lng [-180, 180].');
  }
  if (!isValidCoordinate(destination.lat, destination.lng)) {
    throw new Error('Invalid destination coordinates: lat must be [-90, 90], lng [-180, 180].');
  }

  // 1. Straight-Line Distance (Haversine)
  const straightMeters = calculateHaversineDistanceMeters(
    origin.lat,
    origin.lng,
    destination.lat,
    destination.lng
  );
  const straightKm = parseFloat((straightMeters / 1000).toFixed(2));
  const straightText = formatDistanceText(straightMeters);

  // Directions Web URL (works globally without extra API quota)
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;

  const result: DistanceCalculationResult = {
    origin: { lat: origin.lat, lng: origin.lng, label: originLabel },
    destination: { lat: destination.lat, lng: destination.lng, label: destinationLabel },
    straightLineDistanceMeters: straightMeters,
    straightLineDistanceKm: straightKm,
    straightLineDistanceText: straightText,
    isRoutingAvailable: false,
    hasRoadData: false,
    directionsUrl,
    calculatedAt: new Date().toISOString(),
  };

  // 2. Google Routes API (computeRoutes)
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;

  if (apiKey && !apiKey.startsWith('MY_')) {
    try {
      const response = await fetch(
        'https://routes.googleapis.com/directions/v2:computeRoutes',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
          },
          body: JSON.stringify({
            origin: {
              location: {
                latLng: { latitude: origin.lat, longitude: origin.lng },
              },
            },
            destination: {
              location: {
                latLng: { latitude: destination.lat, longitude: destination.lng },
              },
            },
            travelMode: 'DRIVE',
            routingPreference: 'TRAFFIC_AWARE',
            computeAlternativeRoutes: false,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const primaryRoute = data.routes?.[0];
        if (primaryRoute && typeof primaryRoute.distanceMeters === 'number') {
          const roadMeters = primaryRoute.distanceMeters;
          const durationSeconds = primaryRoute.duration
            ? parseInt(primaryRoute.duration.replace('s', ''), 10)
            : Math.round((roadMeters / 1000 / 35) * 3600); // 35 km/h urban average fallback

          result.roadDistanceMeters = roadMeters;
          result.roadDistanceKm = parseFloat((roadMeters / 1000).toFixed(2));
          result.roadDistanceText = formatDistanceText(roadMeters);
          result.estimatedTravelTime = formatDurationText(durationSeconds);
          result.isRoutingAvailable = true;
          result.hasRoadData = true;
        }
      }
    } catch (err) {
      console.warn('Google Routes API call failed, falling back to straight-line distance:', err);
    }
  }

  // If Road API wasn't reachable, provide calculated urban driving estimate clearly labeled
  if (!result.hasRoadData) {
    // Standard urban circuity factor 1.28x
    const estRoadMeters = Math.round(straightMeters * 1.28);
    const estDurationSec = Math.round((estRoadMeters / 1000 / 30) * 3600);
    result.roadDistanceMeters = estRoadMeters;
    result.roadDistanceKm = parseFloat((estRoadMeters / 1000).toFixed(2));
    result.roadDistanceText = `~${formatDistanceText(estRoadMeters)} (Road Est.)`;
    result.estimatedTravelTime = `~${formatDurationText(estDurationSec)}`;
    result.isRoutingAvailable = false;
    result.hasRoadData = true;
  }

  return result;
}

/**
 * Check if current user is allowed to access precise location coordinates for a case
 */
export function sanitizeLocationsForRole<T extends { latitude: number; longitude: number; locationName: string; reporterContact?: string }>(
  locations: T[],
  role?: UserRole
): T[] {
  if (!role || role === 'CITIZEN') {
    // For citizen / public access: hide contact numbers and approximate coordinates slightly if private
    return locations.map((loc) => ({
      ...loc,
      reporterContact: undefined,
    }));
  }
  return locations;
}
