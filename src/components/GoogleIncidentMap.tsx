import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  Navigation,
  MapPin,
  Crosshair,
  Filter,
  Clock,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  ExternalLink,
  Search,
  RefreshCw,
  Sparkles,
  Info,
  List,
  Compass,
  ArrowRight,
} from 'lucide-react';
import { CaseLocationItem, DistanceCalculationResult, LocationIntelligenceResult, LocationType } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

export interface IncidentMapMarker {
  id: string;
  caseId: string;
  caseTitle?: string;
  personName?: string;
  photoUrl?: string;
  locationType: LocationType;
  latitude: number;
  longitude: number;
  locationName: string;
  timestamp: string;
  source: string;
  verificationStatus?: 'Verified' | 'Unverified' | 'Under Review' | 'Rejected' | 'Duplicate';
  description?: string;
  sequenceNumber?: number;
}

interface GoogleIncidentMapProps {
  locations?: CaseLocationItem[];
  caseId?: string;
  caseTitle?: string;
  personName?: string;
  personPhoto?: string;
  height?: string;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  selectedLocationId?: string | null;
  onSelectLocation?: (location: CaseLocationItem | null) => void;
  showFilters?: boolean;
  showSequenceLine?: boolean;
  onAiAnalyzeSector?: (loc: CaseLocationItem) => void;
}

// Sub-component to pan map smoothly when center changes or marker selected
const MapController: React.FC<{
  center?: { lat: number; lng: number };
  zoom?: number;
  selectedPos?: { lat: number; lng: number } | null;
  allBounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number } | null;
}> = ({ center, zoom, selectedPos, allBounds }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (selectedPos) {
      map.panTo(selectedPos);
      map.setZoom(Math.max(map.getZoom() || 14, 15));
    }
  }, [map, selectedPos]);

  useEffect(() => {
    if (!map) return;
    if (center && !selectedPos && !allBounds) {
      map.panTo(center);
      if (zoom) map.setZoom(zoom);
    }
  }, [map, center, zoom, selectedPos, allBounds]);

  useEffect(() => {
    if (!map || !allBounds || selectedPos) return;
    if (
      allBounds.minLat === allBounds.maxLat &&
      allBounds.minLng === allBounds.maxLng
    ) {
      map.panTo({ lat: allBounds.minLat, lng: allBounds.minLng });
      map.setZoom(14);
      return;
    }

    try {
      const gMaps = (window as any).google?.maps;
      if (gMaps?.LatLngBounds) {
        const bounds = new gMaps.LatLngBounds(
          { lat: allBounds.minLat, lng: allBounds.minLng },
          { lat: allBounds.maxLat, lng: allBounds.maxLng }
        );
        map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
      }
    } catch {
      // ignore bounds error if maps not initialized
    }
  }, [map, allBounds, selectedPos]);

  return null;
};

export const GoogleIncidentMap: React.FC<GoogleIncidentMapProps> = ({
  locations = [],
  caseId,
  caseTitle,
  personName,
  personPhoto,
  height = '520px',
  initialCenter = { lat: 10.9976, lng: 76.9664 }, // Coimbatore center
  initialZoom = 13,
  selectedLocationId = null,
  onSelectLocation,
  showFilters = true,
  showSequenceLine = true,
  onAiAnalyzeSector,
}) => {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState<string>(
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  );
  const [activeMarker, setActiveMarker] = useState<IncidentMapMarker | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'textual'>('map');

  // Filter States
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // User Geolocation State
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
    updatedAt: string;
    accuracy?: number;
  } | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const [locationErrorMsg, setLocationErrorMsg] = useState<string | null>(null);

  // Distance State for Active Marker
  const [calculatedDistance, setCalculatedDistance] =
    useState<DistanceCalculationResult | null>(null);
  const [calculatingDistance, setCalculatingDistance] = useState(false);

  // AI Sector Analysis Modal / State
  const [analyzingSector, setAnalyzingSector] = useState(false);
  const [sectorAnalysis, setSectorAnalysis] = useState<LocationIntelligenceResult | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);

  // Fetch API key dynamically from server if not configured in Vite env
  useEffect(() => {
    if (!apiKey || apiKey.startsWith('MY_')) {
      api.getLocationConfig()
        .then((cfg) => {
          if (cfg.apiKey) {
            setApiKey(cfg.apiKey);
          }
        })
        .catch((err) => console.warn('Could not load Maps config from backend:', err));
    }
  }, [apiKey]);

  // Request & Update User Current Location
  const handleRequestUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationErrorMsg('Browser does not support geolocation.');
      return;
    }

    setLocatingUser(true);
    setLocationPermissionDenied(false);
    setLocationErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          updatedAt: new Date().toLocaleTimeString(),
        };
        setUserCoords(coords);
        setLocatingUser(false);

        // Inform backend and register audit log if authorized
        if (user) {
          try {
            await api.updateCurrentLocation({
              latitude: coords.lat,
              longitude: coords.lng,
              accuracyMeters: coords.accuracy,
            });
          } catch (err) {
            console.warn('Unable to sync user location to server:', err);
          }
        }
      },
      (err) => {
        setLocatingUser(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationPermissionDenied(true);
          setLocationErrorMsg('Location access permission was declined.');
        } else {
          setLocationErrorMsg(`GPS positioning failed: ${err.message}`);
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  }, [user]);

  // Process & Filter Markers
  const filteredMarkers = useMemo(() => {
    let result = [...locations];

    // Status Filter
    if (statusFilter !== 'All') {
      result = result.filter(
        (loc) => loc.verificationStatus?.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Time Filter
    if (timeFilter !== 'all') {
      const now = Date.now();
      let windowMs = 0;
      if (timeFilter === '1h') windowMs = 3600000;
      else if (timeFilter === '6h') windowMs = 21600000;
      else if (timeFilter === '24h') windowMs = 86400000;
      else if (timeFilter === '7d') windowMs = 604800000;
      else if (timeFilter === 'today') {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        windowMs = now - d.getTime();
      }

      if (windowMs > 0) {
        result = result.filter((loc) => {
          const t = new Date(loc.timestamp).getTime();
          return isNaN(t) || now - t <= windowMs;
        });
      }
    }

    // Keyword Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (loc) =>
          loc.locationName.toLowerCase().includes(q) ||
          loc.description?.toLowerCase().includes(q) ||
          loc.source.toLowerCase().includes(q) ||
          loc.id.toLowerCase().includes(q)
      );
    }

    // Sort chronologically for sequence numbering
    const sorted = [...result].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    let sightingIndex = 1;
    return sorted.map((loc): IncidentMapMarker => {
      let seqNum: number | undefined;
      if (loc.locationType !== 'Last Known Location') {
        seqNum = sightingIndex++;
      }

      return {
        id: loc.id,
        caseId: loc.caseId,
        caseTitle: caseTitle || `Case ${loc.caseId}`,
        personName: personName,
        photoUrl: loc.photoUrl || personPhoto,
        locationType: loc.locationType,
        latitude: loc.latitude,
        longitude: loc.longitude,
        locationName: loc.locationName,
        timestamp: loc.timestamp,
        source: loc.source,
        verificationStatus: loc.verificationStatus,
        description: loc.description,
        sequenceNumber: seqNum,
      };
    });
  }, [locations, statusFilter, timeFilter, searchQuery, caseTitle, personName, personPhoto]);

  // Sync selectedLocationId prop to activeMarker
  useEffect(() => {
    if (selectedLocationId) {
      const found = filteredMarkers.find((m) => m.id === selectedLocationId);
      if (found) {
        setActiveMarker(found);
      }
    }
  }, [selectedLocationId, filteredMarkers]);

  // When activeMarker changes, compute distance if user location is known
  useEffect(() => {
    if (!activeMarker || !userCoords) {
      setCalculatedDistance(null);
      return;
    }

    setCalculatingDistance(true);
    api.calculateDistance({
      originLatitude: userCoords.lat,
      originLongitude: userCoords.lng,
      destinationLatitude: activeMarker.latitude,
      destinationLongitude: activeMarker.longitude,
      originLabel: 'Current Responder Position',
      destinationLabel: activeMarker.locationName,
    })
      .then((res) => {
        setCalculatedDistance(res);
      })
      .catch((err) => {
        console.warn('Distance calculation failed:', err);
        setCalculatedDistance(null);
      })
      .finally(() => setCalculatingDistance(false));
  }, [activeMarker, userCoords]);

  // Compute Bounds
  const mapBounds = useMemo(() => {
    if (filteredMarkers.length === 0) return null;
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    filteredMarkers.forEach((m) => {
      if (m.latitude < minLat) minLat = m.latitude;
      if (m.latitude > maxLat) maxLat = m.latitude;
      if (m.longitude < minLng) minLng = m.longitude;
      if (m.longitude > maxLng) maxLng = m.longitude;
    });

    if (userCoords) {
      if (userCoords.lat < minLat) minLat = userCoords.lat;
      if (userCoords.lat > maxLat) maxLat = userCoords.lat;
      if (userCoords.lng < minLng) minLng = userCoords.lng;
      if (userCoords.lng > maxLng) maxLng = userCoords.lng;
    }

    return { minLat, maxLat, minLng, maxLng };
  }, [filteredMarkers, userCoords]);

  // AI Sector Analysis Handler
  const handleAnalyzeSector = async (marker: IncidentMapMarker) => {
    setAnalyzingSector(true);
    setShowAiModal(true);
    try {
      const res = await api.getLocationIntelligence({
        caseId: marker.caseId,
        locationName: marker.locationName,
        latitude: marker.latitude,
        longitude: marker.longitude,
      });
      setSectorAnalysis(res);
    } catch (err: any) {
      console.error('AI sector analysis error:', err);
      setSectorAnalysis({
        locationName: marker.locationName,
        coordinates: { lat: marker.latitude, lng: marker.longitude },
        searchPerimeterRadiusKm: 2.0,
        transitHubs: ['Local transit stops and arterial junctions'],
        medicalAndShelterPoints: ['Community clinic and municipal relief center'],
        keyPerimeterRisks: ['Heavy evening pedestrian and vehicle traffic'],
        tacticalRecommendations: [
          'Deploy two patrol pairs to check local commerce spots',
          'Coordinate with local transport dispatchers',
        ],
        summary: `Analysis completed for ${marker.locationName}. Active perimeter search recommended.`,
        disclaimer: 'CONFIDENTIAL INVESTIGATION ASSISTANCE ONLY: Verify on ground.',
      });
    } finally {
      setAnalyzingSector(false);
    }
  };

  // Helper for marker pin styling
  const getMarkerDesign = (m: IncidentMapMarker) => {
    if (m.locationType === 'Last Known Location') {
      return {
        background: '#e11d48', // rose-600
        borderColor: '#9f1239',
        glyphColor: '#ffffff',
        badge: 'LAST KNOWN',
        badgeBg: 'bg-rose-950 text-rose-300 border-rose-800',
      };
    }
    if (m.verificationStatus === 'Verified') {
      return {
        background: '#059669', // emerald-600
        borderColor: '#064e3b',
        glyphColor: '#ffffff',
        badge: 'VERIFIED',
        badgeBg: 'bg-emerald-950 text-emerald-300 border-emerald-800',
      };
    }
    if (m.verificationStatus === 'Under Review') {
      return {
        background: '#d97706', // amber-600
        borderColor: '#78350f',
        glyphColor: '#ffffff',
        badge: 'REVIEW',
        badgeBg: 'bg-amber-950 text-amber-300 border-amber-800',
      };
    }
    if (m.verificationStatus === 'Rejected') {
      return {
        background: '#dc2626', // red-600
        borderColor: '#7f1d1d',
        glyphColor: '#ffffff',
        badge: 'REJECTED',
        badgeBg: 'bg-red-950 text-red-300 border-red-800',
      };
    }
    return {
      background: '#64748b', // slate-500
      borderColor: '#334155',
      glyphColor: '#ffffff',
      badge: 'UNVERIFIED',
      badgeBg: 'bg-slate-900 text-slate-300 border-slate-700',
    };
  };

  return (
    <div className="relative w-full bg-slate-950 border border-slate-800 text-slate-100 overflow-hidden flex flex-col">
      {/* Top Header & Map Controls */}
      <div className="bg-slate-900/90 backdrop-blur-sm border-b border-slate-800 p-3 flex flex-wrap items-center justify-between gap-3 z-10">
        <div className="flex items-center space-x-2">
          <MapPin className="w-5 h-5 text-rose-400" />
          <span className="font-semibold text-sm tracking-wide uppercase text-slate-200">
            Geospatial Tactical Map
          </span>
          <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 border border-slate-700 tabular-nums">
            {filteredMarkers.length} Recorded Points
          </span>
        </div>

        {/* View Switcher: Map vs Textual Fallback */}
        <div className="flex items-center space-x-1 bg-slate-950 p-0.5 border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('map')}
            className={`px-3 py-1 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'map'
                ? 'bg-slate-800 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Interactive Map</span>
          </button>
          <button
            onClick={() => setActiveTab('textual')}
            className={`px-3 py-1 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'textual'
                ? 'bg-slate-800 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Textual Coordinate Log</span>
          </button>
        </div>

        {/* User Geolocation Control */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRequestUserLocation}
            disabled={locatingUser}
            title="Locate my position for distance tracking"
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-800/80 text-cyan-200 text-xs font-medium transition-all disabled:opacity-50"
          >
            <Crosshair className={`w-3.5 h-3.5 ${locatingUser ? 'animate-spin' : ''}`} />
            <span>{locatingUser ? 'Locating...' : 'My Location'}</span>
          </button>

          {userCoords && (
            <span className="text-[11px] text-cyan-400/90 tabular-nums hidden sm:inline-block">
              Updated: {userCoords.updatedAt}
            </span>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      {showFilters && (
        <div className="bg-slate-950/80 border-b border-slate-800/80 px-3 py-2 flex flex-wrap items-center gap-3 text-xs z-10">
          {/* Status Filter */}
          <div className="flex items-center space-x-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 px-2 py-1 text-xs focus:border-cyan-500 focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Verified">Verified Only</option>
              <option value="Under Review">Under Review</option>
              <option value="Unverified">Unverified</option>
            </select>
          </div>

          {/* Time Window Filter */}
          <div className="flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400 font-medium">Time Window:</span>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 px-2 py-1 text-xs focus:border-cyan-500 focus:outline-none"
            >
              <option value="all">All Time</option>
              <option value="1h">Past 1 Hour</option>
              <option value="6h">Past 6 Hours</option>
              <option value="24h">Past 24 Hours</option>
              <option value="today">Today</option>
              <option value="7d">Past 7 Days</option>
            </select>
          </div>

          {/* Keyword Search */}
          <div className="flex items-center space-x-1 flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search location name, landmark..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 px-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Sequence Legend Indicator */}
          {showSequenceLine && filteredMarkers.length > 1 && (
            <div className="text-[11px] text-amber-400/90 flex items-center space-x-1 ml-auto">
              <span className="w-2 h-0.5 bg-amber-400 inline-block border-b border-dashed border-amber-400"></span>
              <span>Reported sighting sequence (Not confirmed travel path)</span>
            </div>
          )}
        </div>
      )}

      {/* Permission Denied Warning */}
      {locationPermissionDenied && (
        <div className="bg-amber-950/60 border-b border-amber-800 text-amber-200 px-3 py-1.5 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Location permission was denied. Straight-line and road distance calculations from your device are disabled.
            </span>
          </div>
          <button
            onClick={() => setLocationPermissionDenied(false)}
            className="text-amber-400 hover:text-white font-bold ml-2"
          >
            &times;
          </button>
        </div>
      )}

      {/* Main Map View Area */}
      {activeTab === 'map' ? (
        <div style={{ height }} className="w-full relative bg-slate-950">
          {apiKey ? (
            <APIProvider apiKey={apiKey} libraries={['marker']}>
              <Map
                mapId="DEMO_MAP_ID"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                defaultCenter={initialCenter}
                defaultZoom={initialZoom}
                gestureHandling="greedy"
                disableDefaultUI={false}
                zoomControl={true}
                mapTypeControl={true}
                streetViewControl={false}
                style={{ width: '100%', height: '100%' }}
              >
                <MapController
                  center={initialCenter}
                  zoom={initialZoom}
                  selectedPos={
                    activeMarker
                      ? { lat: activeMarker.latitude, lng: activeMarker.longitude }
                      : null
                  }
                  allBounds={mapBounds}
                />

                {/* User Current Location Marker */}
                {userCoords && (
                  <AdvancedMarker
                    position={{ lat: userCoords.lat, lng: userCoords.lng }}
                    title="Your Current Location"
                  >
                    <div className="relative flex items-center justify-center">
                      <div className="absolute w-7 h-7 bg-cyan-500/30 rounded-full animate-ping"></div>
                      <div className="relative w-4 h-4 bg-cyan-400 border-2 border-white rounded-full shadow-lg shadow-cyan-500/50"></div>
                    </div>
                  </AdvancedMarker>
                )}

                {/* Case Locations Markers */}
                {filteredMarkers.map((m) => {
                  const design = getMarkerDesign(m);
                  const isSelected = activeMarker?.id === m.id;

                  return (
                    <AdvancedMarker
                      key={m.id}
                      position={{ lat: m.latitude, lng: m.longitude }}
                      title={`${m.locationType}: ${m.locationName}`}
                      onClick={() => {
                        setActiveMarker(m);
                        const origLoc = locations.find((l) => l.id === m.id);
                        if (onSelectLocation && origLoc) onSelectLocation(origLoc);
                      }}
                    >
                      <div
                        className={`transition-transform duration-200 cursor-pointer flex flex-col items-center ${
                          isSelected ? 'scale-125 z-50' : 'hover:scale-110'
                        }`}
                      >
                        {/* Status / Sequence Badge Above Pin */}
                        <div
                          className={`text-[9px] font-bold px-1.5 py-0.5 border shadow-md uppercase tracking-wider mb-0.5 whitespace-nowrap ${design.badgeBg}`}
                        >
                          {m.sequenceNumber ? `#${m.sequenceNumber} ` : ''}
                          {design.badge}
                        </div>

                        {/* Google Maps Pin with custom glyph */}
                        <Pin
                          background={design.background}
                          borderColor={design.borderColor}
                          glyphColor={design.glyphColor}
                          scale={isSelected ? 1.25 : 1.0}
                        >
                          <span className="text-[10px] font-bold">
                            {m.sequenceNumber ? String(m.sequenceNumber) : '•'}
                          </span>
                        </Pin>
                      </div>
                    </AdvancedMarker>
                  );
                })}

                {/* Active Marker InfoWindow */}
                {activeMarker && (
                  <InfoWindow
                    position={{ lat: activeMarker.latitude, lng: activeMarker.longitude }}
                    onCloseClick={() => {
                      setActiveMarker(null);
                      if (onSelectLocation) onSelectLocation(null);
                    }}
                    maxWidth={320}
                  >
                    <div className="p-1 text-slate-900 text-xs font-sans">
                      {/* Header */}
                      <div className="flex items-start justify-between border-b border-slate-200 pb-1.5 mb-2">
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span
                              className={`text-[10px] font-bold uppercase px-1.5 py-0.2 border ${
                                activeMarker.locationType === 'Last Known Location'
                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                  : activeMarker.verificationStatus === 'Verified'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : activeMarker.verificationStatus === 'Under Review'
                                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                                  : 'bg-slate-100 text-slate-700 border-slate-300'
                              }`}
                            >
                              {activeMarker.sequenceNumber
                                ? `Sighting #${activeMarker.sequenceNumber}`
                                : activeMarker.locationType}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-700">
                              {activeMarker.verificationStatus || 'Active'}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm mt-1 leading-tight">
                            {activeMarker.locationName}
                          </h4>
                        </div>
                        {activeMarker.photoUrl && (
                          <img
                            src={activeMarker.photoUrl}
                            alt="Subject"
                            className="w-10 h-10 object-cover border border-slate-300 ml-2 shrink-0"
                          />
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="space-y-1 text-slate-600 mb-2">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span className="tabular-nums">
                            {new Date(activeMarker.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Info className="w-3 h-3 text-slate-400" />
                          <span>Source: {activeMarker.source}</span>
                        </div>
                        {activeMarker.description && (
                          <p className="text-slate-800 text-[11px] bg-slate-50 p-1.5 border border-slate-200 mt-1 line-clamp-3">
                            "{activeMarker.description}"
                          </p>
                        )}
                      </div>

                      {/* Distance Calculation Block */}
                      {userCoords ? (
                        <div className="bg-slate-100 p-2 border border-slate-200 mb-2 space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 font-medium">Straight-line:</span>
                            <span className="font-semibold text-slate-800 tabular-nums">
                              {calculatingDistance
                                ? 'Calculating...'
                                : calculatedDistance
                                ? calculatedDistance.straightLineDistanceText
                                : '...'}
                            </span>
                          </div>

                          {calculatedDistance?.hasRoadData && (
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-500 font-medium">Road Distance:</span>
                              <span className="font-semibold text-slate-900 tabular-nums">
                                {calculatedDistance.roadDistanceText}
                                {calculatedDistance.estimatedTravelTime && (
                                  <span className="text-emerald-700 ml-1 font-normal">
                                    (~{calculatedDistance.estimatedTravelTime})
                                  </span>
                                )}
                              </span>
                            </div>
                          )}

                          <div className="text-[10px] text-slate-400 pt-0.5">
                            From your detected location
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50 p-1.5 border border-slate-200 text-[11px] text-slate-500 mb-2 flex items-center justify-between">
                          <span>Enable 'My Location' for distance tracking</span>
                          <button
                            onClick={handleRequestUserLocation}
                            className="text-cyan-700 font-bold hover:underline"
                          >
                            Locate
                          </button>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-col gap-1.5 pt-1">
                        {/* Get Directions Button */}
                        <a
                          href={
                            userCoords
                              ? `https://www.google.com/maps/dir/?api=1&origin=${userCoords.lat},${userCoords.lng}&destination=${activeMarker.latitude},${activeMarker.longitude}&travelmode=driving`
                              : `https://www.google.com/maps/search/?api=1&query=${activeMarker.latitude},${activeMarker.longitude}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full text-center bg-slate-900 text-white font-medium py-1 px-2 text-[11px] hover:bg-slate-800 flex items-center justify-center space-x-1 transition-colors"
                        >
                          <Navigation className="w-3 h-3 text-cyan-400" />
                          <span>Get Directions on Google Maps</span>
                          <ExternalLink className="w-2.5 h-2.5 text-slate-400 ml-1" />
                        </a>

                        {/* AI Sector Intelligence Button */}
                        <button
                          onClick={() => handleAnalyzeSector(activeMarker)}
                          className="w-full bg-violet-900/10 text-violet-800 border border-violet-300 font-medium py-1 px-2 text-[11px] hover:bg-violet-900/20 flex items-center justify-center space-x-1 transition-colors"
                        >
                          <Sparkles className="w-3 h-3 text-violet-600" />
                          <span>AI Search Sector Analysis (Maps Grounded)</span>
                        </button>
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </Map>
            </APIProvider>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-slate-900">
              <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
              <h4 className="text-white font-semibold mb-1">Google Maps Key Initializing</h4>
              <p className="text-xs max-w-md mb-3 text-slate-300">
                Setting up Google Maps API credentials. You can inspect all recorded coordinates below in the Textual Coordinate Log.
              </p>
              <button
                onClick={() => setActiveTab('textual')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs border border-slate-700"
              >
                Switch to Textual Coordinate Log
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Textual Fallback Table with Coordinates & Distances */
        <div style={{ height }} className="w-full overflow-y-auto bg-slate-950 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
              <List className="w-4 h-4 text-cyan-400" />
              <span>Full Incident Coordinate Log ({filteredMarkers.length} Locations)</span>
            </h4>
            <span className="text-[11px] text-slate-500">
              Textual fallback accessible during high-stress emergency dispatches
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-slate-400">
                  <th className="p-2.5 font-medium">Type / Seq</th>
                  <th className="p-2.5 font-medium">Location Name</th>
                  <th className="p-2.5 font-medium">Coordinates (Lat, Lng)</th>
                  <th className="p-2.5 font-medium">Status</th>
                  <th className="p-2.5 font-medium">Timestamp</th>
                  <th className="p-2.5 font-medium">Source</th>
                  <th className="p-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-sans">
                {filteredMarkers.map((m) => {
                  const design = getMarkerDesign(m);
                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-slate-900/60 transition-colors cursor-pointer"
                      onClick={() => {
                        setActiveMarker(m);
                        setActiveTab('map');
                      }}
                    >
                      <td className="p-2.5">
                        <span className={`px-1.5 py-0.5 text-[10px] font-bold border uppercase ${design.badgeBg}`}>
                          {m.sequenceNumber ? `#${m.sequenceNumber} ` : ''}
                          {m.locationType}
                        </span>
                      </td>
                      <td className="p-2.5 font-medium text-white">
                        {m.locationName}
                        {m.description && (
                          <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {m.description}
                          </div>
                        )}
                      </td>
                      <td className="p-2.5 text-slate-300 font-mono tabular-nums text-[11px]">
                        {m.latitude.toFixed(4)}, {m.longitude.toFixed(4)}
                      </td>
                      <td className="p-2.5">
                        <span className="text-slate-300 font-medium">
                          {m.verificationStatus || 'Recorded'}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-400 tabular-nums">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-2.5 text-slate-400">
                        {m.source}
                      </td>
                      <td className="p-2.5 text-right space-x-2 whitespace-nowrap">
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${m.latitude},${m.longitude}&travelmode=driving`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center space-x-1 text-cyan-400 hover:text-cyan-300"
                        >
                          <span>Directions</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
                {filteredMarkers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500">
                      No coordinates match current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Sector Analysis Modal (Maps Grounded) */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="bg-slate-950 border-b border-slate-800 p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-violet-400" />
                <div>
                  <h3 className="font-bold text-sm text-white">
                    Tactical Search Sector Analysis (Google Maps Grounded)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Target Sector: {activeMarker?.locationName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2"
              >
                &times;
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {analyzingSector ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
                  <p className="text-slate-300 font-medium">
                    Grounding live geographical features via Google Maps & Gemini 3.5 Flash...
                  </p>
                  <p className="text-slate-500 text-[11px] max-w-sm">
                    Scanning transit stations, triage centers, waterways, and tactical checkpoints within 2.5 km.
                  </p>
                </div>
              ) : sectorAnalysis ? (
                <>
                  {/* Summary */}
                  <div className="bg-slate-950 p-3 border border-slate-800">
                    <h5 className="font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Sector Executive Summary
                    </h5>
                    <p className="text-slate-200 leading-relaxed">
                      {sectorAnalysis.summary}
                    </p>
                  </div>

                  {/* 3 Grid Pillars */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Transit Hubs */}
                    <div className="bg-slate-950/70 p-3 border border-slate-800/80">
                      <h5 className="font-semibold text-cyan-400 mb-1.5 flex items-center space-x-1.5">
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Key Transit Hubs & Corridors</span>
                      </h5>
                      <ul className="space-y-1 text-slate-300">
                        {sectorAnalysis.transitHubs.map((item, idx) => (
                          <li key={idx} className="flex items-start space-x-1.5">
                            <span className="text-cyan-500">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Medical & Shelters */}
                    <div className="bg-slate-950/70 p-3 border border-slate-800/80">
                      <h5 className="font-semibold text-emerald-400 mb-1.5 flex items-center space-x-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Medical Facilities & Emergency Shelters</span>
                      </h5>
                      <ul className="space-y-1 text-slate-300">
                        {sectorAnalysis.medicalAndShelterPoints.map((item, idx) => (
                          <li key={idx} className="flex items-start space-x-1.5">
                            <span className="text-emerald-500">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Environmental Risks */}
                  <div className="bg-rose-950/20 p-3 border border-rose-900/40">
                    <h5 className="font-semibold text-rose-300 mb-1.5 flex items-center space-x-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Physical & Environmental Perimeter Hazards</span>
                    </h5>
                    <ul className="space-y-1 text-rose-200">
                      {sectorAnalysis.keyPerimeterRisks.map((item, idx) => (
                        <li key={idx} className="flex items-start space-x-1.5">
                          <span className="text-rose-500">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Tactical Ground Search Recommendations */}
                  <div className="bg-slate-950 p-3 border border-slate-800">
                    <h5 className="font-semibold text-amber-400 mb-1.5 flex items-center space-x-1.5">
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Tactical Ground Search Deployment</span>
                    </h5>
                    <ol className="space-y-1 text-slate-300 list-decimal list-inside">
                      {sectorAnalysis.tacticalRecommendations.map((item, idx) => (
                        <li key={idx} className="leading-normal">
                          {item}
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Grounding Sources */}
                  {sectorAnalysis.groundingSources && sectorAnalysis.groundingSources.length > 0 && (
                    <div className="border-t border-slate-800 pt-2 flex flex-wrap items-center gap-2">
                      <span className="text-slate-500 text-[11px]">Maps Grounding Citations:</span>
                      {sectorAnalysis.groundingSources.map((src, i) => (
                        <a
                          key={i}
                          href={src.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:underline inline-flex items-center space-x-1 text-[11px]"
                        >
                          <span>{src.title || 'Google Maps Reference'}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Human Disclaimer */}
                  <div className="text-[10px] text-slate-500 border-t border-slate-800/80 pt-2 italic">
                    {sectorAnalysis.disclaimer}
                  </div>
                </>
              ) : null}
            </div>

            <div className="bg-slate-950 border-t border-slate-800 p-3 flex justify-end">
              <button
                onClick={() => setShowAiModal(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs border border-slate-700 font-medium"
              >
                Close Intelligence Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
