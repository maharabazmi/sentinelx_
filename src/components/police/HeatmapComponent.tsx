import React, { useEffect, useRef, useState } from 'react';
import {
  Shield,
  Layers,
  Filter,
  Eye,
  AlertTriangle,
  MapPin,
  Clock,
  Sparkles,
  Radio,
  CheckCircle2,
  RefreshCw,
  Crosshair,
  SlidersHorizontal,
  Car
} from 'lucide-react';
import { CrimeType, CrimeSeverity, AIForecastZone, HotspotAnomaly } from '../../types';
import { ApiClient } from '../../services/api';
import { getCoordinatesForLocation } from '../../data/bangladeshGeo';
import { ALL_64_DISTRICTS } from '../../data/bangladeshCoordinates';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface VerifiedIncident {
  id: string;
  caseId: string;
  crimeType: CrimeType;
  title: string;
  severity: CrimeSeverity;
  latitude: number;
  longitude: number;
  locationName: string;
  district: string;
  thana: string;
  occurredAt: string;
  verifiedAt?: string;
  intensity?: number;
  timeCategory?: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
}

interface HeatmapProps {
  incidents: VerifiedIncident[];
  aiForecastZones?: AIForecastZone[];
  hotspotAnomalies?: HotspotAnomaly[];
  selectedDistrict: string;
  onSelectDistrict: (district: string) => void;
  selectedCrimeType: string;
  onSelectCrimeType: (type: string) => void;
  onRefreshData?: () => void;
}

const DISTRICT_CENTERS: Record<string, { lat: number; lng: number; zoom: number }> = {
  ALL: { lat: 23.6850, lng: 90.3563, zoom: 7 },
  Dhaka: { lat: 23.8103, lng: 90.4125, zoom: 12 },
  Chattogram: { lat: 22.3569, lng: 91.7832, zoom: 12 },
  Sylhet: { lat: 24.8949, lng: 91.8687, zoom: 12 },
  Rajshahi: { lat: 24.3745, lng: 88.6042, zoom: 12 },
  Khulna: { lat: 22.8456, lng: 89.5403, zoom: 12 },
  Barishal: { lat: 22.7010, lng: 90.3535, zoom: 12 },
  Mymensingh: { lat: 24.7471, lng: 90.4203, zoom: 12 },
  Rangpur: { lat: 25.7439, lng: 89.2752, zoom: 12 }
};

const getDistrictCenter = (district: string): { lat: number; lng: number; zoom: number } => {
  if (DISTRICT_CENTERS[district]) {
    return DISTRICT_CENTERS[district];
  }
  const clean = (district || '').toLowerCase().trim();
  if (ALL_64_DISTRICTS[clean]) {
    return { lat: ALL_64_DISTRICTS[clean].lat, lng: ALL_64_DISTRICTS[clean].lng, zoom: 12 };
  }
  return DISTRICT_CENTERS['ALL'];
};

export const HeatmapComponent: React.FC<HeatmapProps> = ({
  incidents,
  aiForecastZones = [],
  hotspotAnomalies = [],
  selectedDistrict,
  onSelectDistrict,
  selectedCrimeType,
  onSelectCrimeType,
  onRefreshData
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const isAnomalyZoomRef = useRef(false);

  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState<'ALL' | 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT'>('ALL');
  const [mapStyle, setMapStyle] = useState<'google_roadmap' | 'google_satellite' | 'openstreetmap'>('google_roadmap');
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [showAIForecasts, setShowAIForecasts] = useState<boolean>(true);
  const [showGroundTruth, setShowGroundTruth] = useState<boolean>(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isExecutingAction, setIsExecutingAction] = useState<boolean>(false);

  // Filter incidents by District, Crime Type, and Time of Day
  const filteredIncidents = incidents.filter(inc => {
    const matchesDistrict = selectedDistrict === 'ALL' || inc.district.toLowerCase() === selectedDistrict.toLowerCase();
    const matchesCrime = selectedCrimeType === 'ALL' || inc.crimeType === selectedCrimeType;
    const matchesTime = selectedTimeOfDay === 'ALL' || (inc.timeCategory && inc.timeCategory === selectedTimeOfDay);
    return matchesDistrict && matchesCrime && matchesTime;
  });

  // Filter Forecast Zones
  const filteredForecasts = aiForecastZones.filter(zone => {
    const matchesDistrict = selectedDistrict === 'ALL' || (zone.targetDistrict && zone.targetDistrict.toLowerCase() === selectedDistrict.toLowerCase());
    return matchesDistrict;
  });

  // Global callback bridge for popup action buttons
  useEffect(() => {
    (window as any).dispatchHeatmapPatrol = async (locName: string, lat: number, lng: number) => {
      setIsExecutingAction(true);
      try {
        const res = await ApiClient.takePoliceHeatmapAction({
          actionType: 'DISPATCH_PATROL',
          locationName: locName,
          latitude: lat,
          longitude: lng,
          notes: 'Tactical mobile patrol dispatched via GIS Heatmap console.'
        });
        if (res.success) {
          setActionNotice(`🚔 Mobile Patrol Dispatched to ${locName}! (${res.dispatchReference})`);
          setTimeout(() => setActionNotice(null), 5000);
          if (onRefreshData) onRefreshData();
        }
      } catch (err: any) {
        alert(err.message || 'Failed to dispatch patrol.');
      } finally {
        setIsExecutingAction(false);
      }
    };

    (window as any).setHeatmapCheckpost = async (locName: string, lat: number, lng: number) => {
      setIsExecutingAction(true);
      try {
        const res = await ApiClient.takePoliceHeatmapAction({
          actionType: 'SET_CHECKPOST',
          locationName: locName,
          latitude: lat,
          longitude: lng,
          notes: 'Static checkpoint node established.'
        });
        if (res.success) {
          setActionNotice(`🛑 Static Security Checkpost established at ${locName}! (${res.checkpostReference})`);
          setTimeout(() => setActionNotice(null), 5000);
          if (onRefreshData) onRefreshData();
        }
      } catch (err: any) {
        alert(err.message || 'Failed to establish checkpost.');
      } finally {
        setIsExecutingAction(false);
      }
    };

    (window as any).deployForecastPatrol = async (directiveId: string, code: string) => {
      setIsExecutingAction(true);
      try {
        const res = await ApiClient.takePoliceHeatmapAction({
          actionType: 'ACKNOWLEDGE_DIRECTIVE',
          directiveId: directiveId
        });
        if (res.success) {
          setActionNotice(`🛡️ HQ Directive ${code} acknowledged and patrol deployment confirmed!`);
          setTimeout(() => setActionNotice(null), 5000);
          if (onRefreshData) onRefreshData();
        }
      } catch (err: any) {
        alert(err.message || 'Failed to acknowledge directive.');
      } finally {
        setIsExecutingAction(false);
      }
    };

    return () => {
      delete (window as any).dispatchHeatmapPatrol;
      delete (window as any).setHeatmapCheckpost;
      delete (window as any).deployForecastPatrol;
    };
  }, [onRefreshData]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const center = getDistrictCenter(selectedDistrict);
    const map = L.map(mapContainerRef.current, {
      center: [center.lat, center.lng],
      zoom: center.zoom,
      zoomControl: true,
      attributionControl: true
    });

    // Default: Clean Google Maps Roadmap tiles (No API key required, zero watermark)
    const tileLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      attribution: '&copy; Google Maps &copy; Bangladesh Police GIS',
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      maxZoom: 20
    });
    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Dynamically switch basemap provider (Google Maps vs. Satellite vs. OSM)
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    let newTileLayer: L.TileLayer;
    if (mapStyle === 'google_satellite') {
      newTileLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Satellite &copy; Bangladesh Police GIS'
      });
    } else if (mapStyle === 'openstreetmap') {
      newTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap &copy; Bangladesh Police GIS'
      });
    } else {
      // Default: Google Roadmap (Clean roads, landmarks, zero watermark)
      newTileLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps &copy; Bangladesh Police GIS'
      });
    }

    newTileLayer.addTo(mapInstanceRef.current);
    tileLayerRef.current = newTileLayer;
  }, [mapStyle]);

  // Update view on district change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (isAnomalyZoomRef.current) {
      isAnomalyZoomRef.current = false;
      return;
    }
    const center = getDistrictCenter(selectedDistrict);
    mapInstanceRef.current.setView([center.lat, center.lng], center.zoom, { animate: true });
  }, [selectedDistrict]);

  // Render Map Layers: Ground-Truth Incidents & AI Forecast Zones
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current) return;
    layerGroupRef.current.clearLayers();

    // 1. Render AI Predicted Forecast Zones (Pulsing Purple Dashed Geofences)
    if (showAIForecasts) {
      filteredForecasts.forEach(zone => {
        const zoneLat = zone.latitude || 23.8103;
        const zoneLng = zone.longitude || 90.4125;
        const radius = zone.radiusMeters || 650;
        const isDeployed = zone.status === 'DEPLOYED';

        // Outer pulsing/dashed perimeter
        const forecastCircle = L.circle([zoneLat, zoneLng], {
          color: isDeployed ? '#059669' : '#8b5cf6',
          fillColor: isDeployed ? '#10b981' : '#a855f7',
          fillOpacity: isDeployed ? 0.22 : 0.32,
          radius: radius,
          weight: 2.5,
          dashArray: '6, 8',
        });

        // Interactive Popup with 1-click Deployment
        forecastCircle.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; min-width: 250px; padding: 4px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <span style="background-color: ${isDeployed ? '#059669' : '#8b5cf6'}; color: #ffffff; padding: 2px 6px; border-radius: 6px; font-weight: bold; font-size: 10px; font-family: monospace;">
                ${isDeployed ? '✓ PATROL DEPLOYED' : 'AI PREDICTIVE FORECAST'}
              </span>
              <span style="font-size: 10px; color: #64748b; font-family: monospace;">${zone.directiveCode}</span>
            </div>

            <div style="font-weight: bold; font-size: 13px; color: #1e1b4b; margin-bottom: 2px;">
              ${zone.targetThana} (${zone.targetDistrict})
            </div>

            <div style="color: #475569; font-size: 11px; margin-bottom: 4px;">
              Predicted Threat: <strong>${zone.crimeType || 'THEFT_ROBBERY'}</strong>
            </div>

            <div style="background-color: #f1f5f9; border-radius: 6px; padding: 6px; font-size: 11px; margin-bottom: 8px;">
              <div style="color: #334155; font-weight: 600; margin-bottom: 2px;">HQ Tactical Strategy:</div>
              <div style="color: #475569; font-size: 10.5px; line-height: 1.4;">${zone.patrolStrategy}</div>
              <div style="color: #64748b; font-size: 10px; margin-top: 4px;">Window: <strong>${zone.timeWindow || 'Night Patrol'}</strong></div>
            </div>

            ${!isDeployed ? `
              <button
                onclick="window.deployForecastPatrol('${zone.id}', '${zone.directiveCode}')"
                style="
                  width: 100%;
                  background-color: #7c3aed;
                  color: #ffffff;
                  border: none;
                  padding: 6px 10px;
                  border-radius: 6px;
                  font-weight: bold;
                  font-size: 11px;
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 4px;
                "
              >
                <span>Acknowledge & Deploy Patrol Team</span>
              </button>
            ` : `
              <div style="color: #059669; font-weight: bold; font-size: 11px; text-align: center; padding: 4px;">
                ✓ Deployed by: ${zone.acknowledgedBy || 'Station Officer'}
              </div>
            `}
          </div>
        `);

        layerGroupRef.current?.addLayer(forecastCircle);
      });
    }

    // 2. Render Ground-Truth Verified Crime Incidents
    if (showGroundTruth) {
      filteredIncidents.forEach(inc => {
        const markerColor = inc.severity === CrimeSeverity.CRITICAL ? '#dc2626' : inc.severity === CrimeSeverity.HIGH ? '#ea580c' : '#ca8a04';
        const radius = inc.severity === CrimeSeverity.CRITICAL ? 500 : inc.severity === CrimeSeverity.HIGH ? 350 : 250;

        let incLat = inc.latitude;
        let incLng = inc.longitude;
        if (!incLat || !incLng || (Math.abs(incLat - 23.8103) < 0.001 && Math.abs(incLng - 90.4125) < 0.001 && inc.district && inc.district.toLowerCase() !== 'dhaka')) {
          const resolved = getCoordinatesForLocation(inc.locationName, inc.thana, inc.district);
          incLat = resolved.lat;
          incLng = resolved.lng;
        }

        // Incident Heat Ring
        const circle = L.circle([incLat, incLng], {
          color: markerColor,
          fillColor: markerColor,
          fillOpacity: 0.28,
          radius: radius,
          weight: 1.5
        });
        layerGroupRef.current?.addLayer(circle);

        // Marker Pin
        const customIcon = L.divIcon({
          className: 'custom-police-marker',
          html: `
            <div style="
              background-color: ${markerColor};
              width: 18px;
              height: 18px;
              border-radius: 50%;
              border: 2px solid #ffffff;
              box-shadow: 0 0 10px ${markerColor}, 0 2px 4px rgba(0,0,0,0.4);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <div style="width: 6px; height: 6px; border-radius: 50%; background-color: #ffffff;"></div>
            </div>
          `,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
          popupAnchor: [0, -10]
        });

        const marker = L.marker([incLat, incLng], { icon: customIcon });

        // Tactical 1-click action buttons inside popup
        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; min-width: 240px; padding: 4px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
              <span style="font-family: monospace; font-weight: bold; color: #0284c7; font-size: 11px;">${inc.caseId}</span>
              <span style="font-size: 10px; font-weight: bold; color: ${markerColor};">${inc.severity}</span>
            </div>
            <div style="font-weight: bold; font-size: 13px; margin-bottom: 4px; color: #0f172a;">${inc.title}</div>
            <div style="color: #334155; font-size: 11px;">Type: <strong>${inc.crimeType}</strong></div>
            <div style="color: #334155; font-size: 11px;">Location: <strong>${inc.locationName}, ${inc.thana}</strong></div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px; margin-bottom: 8px;">
              Time Window: <strong>${inc.timeCategory || 'EVENING'}</strong> &bull; Occurred: ${new Date(inc.occurredAt).toLocaleDateString()}
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
              <button
                onclick="window.dispatchHeatmapPatrol('${inc.locationName.replace(/'/g, "\\'")}', ${inc.latitude}, ${inc.longitude})"
                style="
                  background-color: #0284c7;
                  color: #ffffff;
                  border: none;
                  padding: 5px 8px;
                  border-radius: 6px;
                  font-weight: bold;
                  font-size: 10px;
                  cursor: pointer;
                "
              >
                🚔 Dispatch Patrol
              </button>
              <button
                onclick="window.setHeatmapCheckpost('${inc.locationName.replace(/'/g, "\\'")}', ${inc.latitude}, ${inc.longitude})"
                style="
                  background-color: #334155;
                  color: #ffffff;
                  border: none;
                  padding: 5px 8px;
                  border-radius: 6px;
                  font-weight: bold;
                  font-size: 10px;
                  cursor: pointer;
                "
              >
                🛑 Set Checkpost
              </button>
            </div>
          </div>
        `);

        layerGroupRef.current?.addLayer(marker);
      });
    }
  }, [filteredIncidents, filteredForecasts, showAIForecasts, showGroundTruth]);

  // Quick Zoom to Anomaly Cluster
  const handleZoomToAnomaly = (anomaly: HotspotAnomaly) => {
    isAnomalyZoomRef.current = true;

    // Reset narrowing filters so the anomaly cluster is visible
    setSelectedTimeOfDay('ALL');
    onSelectCrimeType('ALL');
    if (anomaly.district) {
      onSelectDistrict(anomaly.district);
    } else {
      onSelectDistrict('ALL');
    }

    let targetLat = anomaly.latitude;
    let targetLng = anomaly.longitude;

    // Resolve exact coordinates using the geocoding service
    const resolved = getCoordinatesForLocation(anomaly.locationName, anomaly.thana, anomaly.district);
    const isBogusDhaka = targetLat && Math.abs(targetLat - 23.8103) < 0.001 && targetLng && Math.abs(targetLng - 90.4125) < 0.001 && anomaly.district && anomaly.district.toLowerCase() !== 'dhaka';

    if (!targetLat || !targetLng || isBogusDhaka) {
      targetLat = resolved.lat;
      targetLng = resolved.lng;
    }

    if (!targetLat || !targetLng) {
      const match = incidents.find(
        i => (i.locationName || '').toLowerCase().trim() === (anomaly.locationName || '').toLowerCase().trim()
      );
      if (match) {
        targetLat = match.latitude;
        targetLng = match.longitude;
      }
    }

    setTimeout(() => {
      if (mapInstanceRef.current && targetLat && targetLng) {
        mapInstanceRef.current.flyTo([targetLat, targetLng], 15, {
          animate: true,
          duration: 1.5
        });
      }
    }, 150);

    setActionNotice(`🎯 Focused Anomaly Cluster: ${anomaly.locationName} (${anomaly.primaryCrime})`);
    setTimeout(() => setActionNotice(null), 5000);
  };

  return (
    <div className="space-y-4">
      {/* 1. Cluster Spike Anomaly Ribbon */}
      {hotspotAnomalies.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5 text-amber-300">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <AlertTriangle className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <span className="font-bold font-display uppercase tracking-wider text-[11px] text-amber-400 block">
                Temporal Crime Spike Detected
              </span>
              <p className="text-slate-300 text-[11px]">
                {hotspotAnomalies[0].message}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleZoomToAnomaly(hotspotAnomalies[0])}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Focus Anomaly ({hotspotAnomalies[0].locationName})</span>
          </button>
        </div>
      )}

      {/* Action Notice Toast */}
      {actionNotice && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in slide-in-from-top duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span className="font-medium">{actionNotice}</span>
        </div>
      )}

      {/* 2. Tactical Toolbar: Time-of-Day, Layers & Filter Scopes */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5 text-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 font-bold text-blue-400">
              <Shield className="w-4 h-4" />
              <span>Tactical GIS Console</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-blue-600/20 text-blue-300 border border-blue-500/30 font-mono text-[10px] font-bold">
              POLICE COMMAND
            </span>
            <span className="text-slate-400 font-mono">
              ({filteredIncidents.length} Ground Incidents &bull; {filteredForecasts.length} AI Zones)
            </span>
          </div>

          {/* Map Provider Selector & Layer Toggles */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center p-0.5 bg-slate-950 border border-slate-700/80 rounded-xl text-[11px]">
              <button
                type="button"
                onClick={() => setMapStyle('google_roadmap')}
                className={`px-2.5 py-1 rounded-lg transition font-medium flex items-center gap-1 ${
                  mapStyle === 'google_roadmap'
                    ? 'bg-blue-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Google Maps Standard Roadmap (Clean street labels & landmarks)"
              >
                <MapPin className="w-3 h-3" />
                <span>Google Map</span>
              </button>

              <button
                type="button"
                onClick={() => setMapStyle('google_satellite')}
                className={`px-2.5 py-1 rounded-lg transition font-medium flex items-center gap-1 ${
                  mapStyle === 'google_satellite'
                    ? 'bg-purple-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Google Satellite Aerial Imagery with street labels"
              >
                <Eye className="w-3 h-3" />
                <span>Satellite</span>
              </button>

              <button
                type="button"
                onClick={() => setMapStyle('openstreetmap')}
                className={`px-2.5 py-1 rounded-lg transition font-medium flex items-center gap-1 ${
                  mapStyle === 'openstreetmap'
                    ? 'bg-slate-700 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="OpenStreetMap Standard"
              >
                <span>OSM</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowGroundTruth(!showGroundTruth)}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                showGroundTruth
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span>Ground Truth</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAIForecasts(!showAIForecasts)}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                showAIForecasts
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>AI Forecast Zones</span>
            </button>
          </div>
        </div>

        {/* Time-of-Day Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold text-slate-300">Time Window:</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(
              [
                { id: 'ALL', label: 'All 24h' },
                { id: 'MORNING', label: 'Morning (06-12)' },
                { id: 'AFTERNOON', label: 'Afternoon (12-17)' },
                { id: 'EVENING', label: 'Evening Rush (17-22)' },
                { id: 'NIGHT', label: 'Late Night (22-06)' },
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedTimeOfDay(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition whitespace-nowrap ${
                  selectedTimeOfDay === tab.id
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Division & Crime Filter Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-800/80">
          <select
            value={selectedDistrict}
            onChange={e => onSelectDistrict(e.target.value)}
            className="sx-input !w-auto"
          >
            <option value="ALL">All Bangladesh Divisions</option>
            <option value="Dhaka">Dhaka Division</option>
            <option value="Chattogram">Chattogram Division</option>
            <option value="Sylhet">Sylhet Division</option>
            <option value="Rajshahi">Rajshahi Division</option>
            <option value="Khulna">Khulna Division</option>
            <option value="Barishal">Barishal Division</option>
            <option value="Mymensingh">Mymensingh Division</option>
            <option value="Rangpur">Rangpur Division</option>
          </select>

          <select
            value={selectedCrimeType}
            onChange={e => onSelectCrimeType(e.target.value)}
            className="sx-input !w-auto"
          >
            <option value="ALL">All Crime Categories</option>
            <option value={CrimeType.THEFT_ROBBERY}>Robbery / Snatching</option>
            <option value={CrimeType.PHYSICAL_ASSAULT}>Assault</option>
            <option value={CrimeType.EXTORTION}>Extortion / Chandabazi</option>
            <option value={CrimeType.DRUG_TRAFFICKING}>Narcotics / Illegal Drugs</option>
            <option value={CrimeType.CYBER_CRIME}>Cyber Harassment / Fraud</option>
            <option value={CrimeType.HARASSMENT}>Eve Teasing / Harassment</option>
            <option value={CrimeType.FRAUD_SCAM}>Financial Fraud & Scams</option>
          </select>
        </div>
      </div>

      {/* 3. Interactive Leaflet Map Container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
        <div ref={mapContainerRef} className="w-full h-[520px]" />

        {/* Legend Overlay */}
        <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 text-[11px] space-y-2 z-[1000] shadow-lg text-slate-300">
          <div className="font-bold text-white font-display flex items-center gap-1.5">
            <SlidersHorizontal className="w-3 h-3 text-blue-400" />
            <span>Map Legend & Actions</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-red-600"></div>
              <span>Critical</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
              <span>High</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full border border-purple-400 border-dashed bg-purple-500/40"></div>
              <span className="text-purple-300 font-medium">AI Forecast Geofence</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
