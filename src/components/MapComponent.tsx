import React from 'react';
import { Case, Sighting, CaseLocationItem } from '../types/index.ts';
import { GoogleIncidentMap } from './GoogleIncidentMap.tsx';

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  type: 'LAST_KNOWN' | 'VERIFIED' | 'UNDER_REVIEW' | 'UNVERIFIED';
  title: string;
  subtitle?: string;
  description: string;
  time?: string;
  date?: string;
  caseId?: string;
}

interface MapComponentProps {
  cases?: Case[];
  sightings?: Sighting[];
  points?: MapPoint[];
  locations?: CaseLocationItem[];
  center?: [number, number] | { lat: number; lng: number };
  zoom?: number;
  height?: string;
  selectedLocationId?: string | null;
  onMarkerClick?: (point: MapPoint | CaseLocationItem) => void;
  showFilters?: boolean;
}

export const MapComponent: React.FC<MapComponentProps> = ({
  cases = [],
  sightings = [],
  points,
  locations,
  center,
  zoom = 13,
  height = '520px',
  selectedLocationId = null,
  onMarkerClick,
  showFilters = true,
}) => {
  // Synthesize CaseLocationItem list from props
  const synthesizedLocations: CaseLocationItem[] = React.useMemo(() => {
    if (locations && locations.length > 0) {
      return locations;
    }

    const items: CaseLocationItem[] = [];

    // Process Last Known Locations from cases
    cases.forEach((c) => {
      if (c.person?.lastKnownCoordinates?.lat && c.person?.lastKnownCoordinates?.lng) {
        items.push({
          id: `lkl-${c.id}`,
          caseId: c.id,
          locationType: 'Last Known Location',
          latitude: c.person.lastKnownCoordinates.lat,
          longitude: c.person.lastKnownCoordinates.lng,
          locationName: c.person.lastKnownLocation || 'Last Known Location',
          timestamp: c.person.dateMissing
            ? `${c.person.dateMissing}T${c.person.timeMissing || '12:00:00'}`
            : c.createdAt,
          source: 'Intake Report',
          verificationStatus: 'Verified',
          description: c.person.circumstances || c.person.lastKnownActivity,
          photoUrl: c.person.photoUrl,
        });
      }
    });

    // Process Sightings
    sightings.forEach((s) => {
      if (s.latitude && s.longitude) {
        items.push({
          id: s.id,
          caseId: s.caseId,
          locationType:
            s.verificationStatus === 'Verified'
              ? 'Verified Sighting'
              : 'Reported Sighting',
          latitude: s.latitude,
          longitude: s.longitude,
          locationName: s.location || 'Reported Sighting Location',
          timestamp: s.date ? `${s.date}T${s.time || '12:00:00'}` : s.createdAt,
          source: s.source || 'Citizen Sighting',
          verificationStatus: s.verificationStatus,
          description: s.description,
          reporterName: s.reporterName,
        });
      }
    });

    // Process custom points if passed
    if (points && points.length > 0) {
      points.forEach((p) => {
        items.push({
          id: p.id,
          caseId: p.caseId || 'UNKNOWN',
          locationType:
            p.type === 'LAST_KNOWN'
              ? 'Last Known Location'
              : p.type === 'VERIFIED'
              ? 'Verified Sighting'
              : 'Reported Sighting',
          latitude: p.lat,
          longitude: p.lng,
          locationName: p.title,
          timestamp: p.date ? `${p.date}T${p.time || '12:00:00'}` : new Date().toISOString(),
          source: p.subtitle || 'Report',
          verificationStatus:
            p.type === 'VERIFIED'
              ? 'Verified'
              : p.type === 'UNDER_REVIEW'
              ? 'Under Review'
              : 'Unverified',
          description: p.description,
        });
      });
    }

    return items;
  }, [locations, cases, sightings, points]);

  // Center coordinate handling
  const initialCenter = React.useMemo(() => {
    if (center) {
      if (Array.isArray(center)) {
        return { lat: center[0], lng: center[1] };
      }
      return center;
    }
    if (synthesizedLocations.length > 0) {
      return {
        lat: synthesizedLocations[0].latitude,
        lng: synthesizedLocations[0].longitude,
      };
    }
    return { lat: 10.9976, lng: 76.9664 }; // Coimbatore center
  }, [center, synthesizedLocations]);

  return (
    <GoogleIncidentMap
      locations={synthesizedLocations}
      height={height}
      initialCenter={initialCenter}
      initialZoom={zoom}
      selectedLocationId={selectedLocationId}
      showFilters={showFilters}
      onSelectLocation={(loc) => {
        if (onMarkerClick && loc) {
          onMarkerClick(loc);
        }
      }}
    />
  );
};
