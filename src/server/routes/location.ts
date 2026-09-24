import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.ts';
import { db } from '../database/db.ts';
import {
  computeDistance,
  isValidCoordinate,
} from '../services/locationService.ts';
import { UserCurrentLocation } from '../../types/index.ts';

export const locationRouter = Router();

/**
 * GET /api/location/config
 * Exposes non-sensitive client configuration for Google Maps Platform
 */
locationRouter.get('/config', (_req, res) => {
  const apiKey =
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    '';

  const isConfigured = Boolean(apiKey && !apiKey.startsWith('MY_'));

  res.json({
    hasMapsKey: isConfigured,
    // Return key for client provider when valid
    apiKey: isConfigured ? apiKey : '',
    defaultCenter: { lat: 10.9976, lng: 76.9664 }, // Coimbatore hub center
    defaultZoom: 13,
  });
});

/**
 * GET /api/location/distance
 * Secure distance calculation between two points
 * Input query: originLatitude, originLongitude, destinationLatitude, destinationLongitude, originLabel, destinationLabel
 */
locationRouter.get('/distance', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      originLatitude,
      originLongitude,
      destinationLatitude,
      destinationLongitude,
      originLabel,
      destinationLabel,
    } = req.query;

    if (
      originLatitude === undefined ||
      originLongitude === undefined ||
      destinationLatitude === undefined ||
      destinationLongitude === undefined
    ) {
      res.status(400).json({
        error:
          'Missing query parameters: originLatitude, originLongitude, destinationLatitude, destinationLongitude are required.',
      });
      return;
    }

    const oLat = parseFloat(originLatitude as string);
    const oLng = parseFloat(originLongitude as string);
    const dLat = parseFloat(destinationLatitude as string);
    const dLng = parseFloat(destinationLongitude as string);

    if (!isValidCoordinate(oLat, oLng)) {
      res.status(400).json({
        error: `Invalid origin coordinates (${oLat}, ${oLng}): latitude must be [-90, 90] and longitude [-180, 180].`,
      });
      return;
    }

    if (!isValidCoordinate(dLat, dLng)) {
      res.status(400).json({
        error: `Invalid destination coordinates (${dLat}, ${dLng}): latitude must be [-90, 90] and longitude [-180, 180].`,
      });
      return;
    }

    const result = await computeDistance(
      { lat: oLat, lng: oLng },
      { lat: dLat, lng: dLng },
      (originLabel as string) || 'Authorized User Location',
      (destinationLabel as string) || 'Target Case Location'
    );

    res.json(result);
  } catch (error: any) {
    console.error('Distance calculation error:', error);
    res.status(500).json({
      error: error.message || 'Failed to compute distance between coordinates.',
    });
  }
});

/**
 * POST /api/location/current
 * Store authorized officer / responder's current location with explicit consent
 */
locationRouter.post(
  '/current',
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const { latitude, longitude, accuracyMeters, address } = req.body;

      if (latitude === undefined || longitude === undefined) {
        res.status(400).json({ error: 'latitude and longitude are required.' });
        return;
      }

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      if (!isValidCoordinate(lat, lng)) {
        res.status(400).json({
          error:
            'Invalid coordinates: latitude must be between -90 and 90, longitude between -180 and 180.',
        });
        return;
      }

      const user = req.user!;
      const userLoc: UserCurrentLocation = {
        userId: user.id,
        userRole: user.role,
        latitude: lat,
        longitude: lng,
        accuracyMeters: accuracyMeters ? parseFloat(accuracyMeters) : undefined,
        address: address || undefined,
        updatedAt: new Date().toISOString(),
      };

      db.setUserCurrentLocation(userLoc);

      // Audit trail
      db.addAuditLog({
        userId: user.id,
        userName: user.fullName,
        userRole: user.role,
        action: 'UPDATE_DEPLOYMENT_LOCATION',
        resourceType: 'USER',
        resourceId: user.id,
        details: `Updated device coordinates to (${lat.toFixed(4)}, ${lng.toFixed(4)}) accuracy ~${accuracyMeters || 0}m.`,
        result: 'SUCCESS',
      });

      res.json({
        success: true,
        message: 'Current deployment coordinates updated.',
        location: userLoc,
      });
    } catch (err: any) {
      console.error('Current location update error:', err);
      res.status(500).json({ error: err.message || 'Failed to update location.' });
    }
  }
);

/**
 * GET /api/location/current
 * Get current authorized user's latest stored location
 */
locationRouter.get(
  '/current',
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const loc = db.getUserCurrentLocation(user.id);
    if (!loc) {
      res.status(404).json({ message: 'No location registered for current session.' });
      return;
    }
    res.json(loc);
  }
);
