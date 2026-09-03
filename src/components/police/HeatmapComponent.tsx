import React, { useEffect, useRef, useState } from 'react';
import { Shield, Layers, Filter, Eye, AlertTriangle, MapPin, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import { CrimeType, CrimeSeverity } from '../../types';
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
  weight: number;
}

interface HeatmapProps {
  incidents: VerifiedIncident[];
  selectedDistrict: string;
  onSelectDistrict: (district: string) => void;
  selectedCrimeType: string;
  onSelectCrimeType: (type: string) => void;
}

// Center coordinates for Bangladesh major divisions
const DISTRICT_CENTERS: Record<string, { lat: number; lng: number; zoom: number }> = {
  ALL: { lat: 23.6850, lng: 90.3563, zoom: 7 },
  Dhaka: { lat: 23.8103, lng: 90.4125, zoom: 12 },
  Chattogram: { lat: 22.3569, lng: 91.7832, zoom: 12 },
  Sylhet: { lat: 24.8949, lng: 91.8687, zoom: 12 },
  Rajshahi: { lat: 24.3745, lng: 88.6042, zoom: 12 },
  Khulna: { lat: 22.8456, lng: 89.5403, zoom: 12 },
  Barishal: { lat: 22.7010, lng: 90.3535, zoom: 12 }
};

export const HeatmapComponent: React.FC<HeatmapProps> = ({
  incidents,
  selectedDistrict,
  onSelectDistrict,
  selectedCrimeType,
  onSelectCrimeType
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<VerifiedIncident | null>(null);
  const [activeLayer, setActiveLayer] = useState<'heat' | 'markers' | 'both'>('both');

  // Filter incidents
  const filteredIncidents = incidents.filter(inc => {
    const matchesDistrict = selectedDistrict === 'ALL' || inc.district.toLowerCase() === selectedDistrict.toLowerCase();
    const matchesCrime = selectedCrimeType === 'ALL' || inc.crimeType === selectedCrimeType;
    return matchesDistrict && matchesCrime;
  });

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy existing instance if container changed
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const center = DISTRICT_CENTERS[selectedDistrict] || DISTRICT_CENTERS['ALL'];
    const map = L.map(mapContainerRef.current, {
      center: [center.lat, center.lng],
      zoom: center.zoom,
      zoomControl: true,
      attributionControl: true
    });

    // Dark theme map tiles for police GIS intelligence with fallback
    const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap &copy; Bangladesh Police GIS',
      subdomains: 'abcd',
      maxZoom: 19
    });
    tileLayer.addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    // Invalidate size once container is fully mounted and rendered
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

  // Update view when selected district changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const center = DISTRICT_CENTERS[selectedDistrict] || DISTRICT_CENTERS['ALL'];
    mapInstanceRef.current.setView([center.lat, center.lng], center.zoom, { animate: true });
  }, [selectedDistrict]);

  // Render Markers and Heat Circles on Leaflet Map
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current) return;

    layerGroupRef.current.clearLayers();

    filteredIncidents.forEach(inc => {
      // 1. Heat Intensity Glow Circle
      if (activeLayer === 'heat' || activeLayer === 'both') {
        const radius = inc.severity === CrimeSeverity.CRITICAL ? 650 : inc.severity === CrimeSeverity.HIGH ? 450 : 300;
        const color = inc.severity === CrimeSeverity.CRITICAL ? '#dc2626' : inc.severity === CrimeSeverity.HIGH ? '#ea580c' : '#ca8a04';

        const circle = L.circle([inc.latitude, inc.longitude], {
          color: color,
          fillColor: color,
          fillOpacity: 0.38,
          radius: radius,
          weight: 2
        });
        circle.bindTooltip(`
          <div style="font-family: sans-serif; font-size: 11px; padding: 2px;">
            <strong style="color: ${color};">${inc.crimeType}</strong><br/>
            <span>${inc.locationName}, ${inc.thana}</span><br/>
            <span style="font-weight: bold;">Severity: ${inc.severity}</span>
          </div>
        `);
        circle.on('click', () => setSelectedIncident(inc));
        layerGroupRef.current?.addLayer(circle);
      }

      // 2. Incident Pin Marker
      if (activeLayer === 'markers' || activeLayer === 'both') {
        const markerColor = inc.severity === CrimeSeverity.CRITICAL ? '#dc2626' : inc.severity === CrimeSeverity.HIGH ? '#ea580c' : '#ca8a04';

        const customIcon = L.divIcon({
          className: 'custom-police-marker',
          html: `
            <div style="
              background-color: ${markerColor};
              width: 18px;
              height: 18px;
              border-radius: 50%;
              border: 2px solid #ffffff;
              box-shadow: 0 0 12px ${markerColor}, 0 2px 4px rgba(0,0,0,0.5);
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

        const marker = L.marker([inc.latitude, inc.longitude], { icon: customIcon });
        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; min-width: 200px; padding: 4px;">
            <div style="font-family: monospace; font-weight: bold; color: #0284c7; margin-bottom: 2px;">${inc.caseId}</div>
            <div style="font-weight: bold; font-size: 13px; margin-bottom: 4px;">${inc.title}</div>
            <div style="color: #334155; font-size: 11px;">Category: <strong>${inc.crimeType}</strong></div>
            <div style="color: #334155; font-size: 11px;">Location: <strong>${inc.locationName}, ${inc.thana} (${inc.district})</strong></div>
            <div style="margin-top: 4px; font-size: 11px;">Severity: <span style="font-weight: bold; color: ${markerColor};">${inc.severity}</span></div>
            <div style="font-size: 10px; color: #64748b; margin-top: 4px;">Occurred: ${new Date(inc.occurredAt).toLocaleDateString()}</div>
          </div>
        `);
        marker.on('click', () => setSelectedIncident(inc));
        layerGroupRef.current?.addLayer(marker);
      }
    });
  }, [filteredIncidents, activeLayer]);

  return (
    <div className="space-y-4">
      {/* Heatmap Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 font-bold text-blue-400">
            <Shield className="w-4 h-4" />
            <span>GIS Police Heatmap</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-red-600/20 text-red-300 border border-red-500/30 font-mono text-[10px] font-bold">
            RESTRICTED • POLICE ONLY
          </span>
          <span className="text-slate-400 font-mono">
            ({filteredIncidents.length} Verified Incidents)
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* District Selector */}
          <select
            value={selectedDistrict}
            onChange={e => onSelectDistrict(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
          >
            <option value="ALL">All Bangladesh Divisions</option>
            <option value="Dhaka">Dhaka Division</option>
            <option value="Chattogram">Chattogram Division</option>
            <option value="Sylhet">Sylhet Division</option>
            <option value="Rajshahi">Rajshahi Division</option>
            <option value="Khulna">Khulna Division</option>
            <option value="Barishal">Barishal Division</option>
          </select>

          {/* Crime Filter */}
          <select
            value={selectedCrimeType}
            onChange={e => onSelectCrimeType(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
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

          {/* Layer toggles */}
          <div className="flex items-center rounded-lg bg-slate-800 border border-slate-700 p-0.5">
            <button
              onClick={() => setActiveLayer('both')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                activeLayer === 'both' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Layers
            </button>
            <button
              onClick={() => setActiveLayer('heat')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                activeLayer === 'heat' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Heat Density
            </button>
            <button
              onClick={() => setActiveLayer('markers')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                activeLayer === 'markers' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Pins
            </button>
          </div>
        </div>
      </div>

      {/* Map Display Frame */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
        {/* Security Watermark Header */}
        <div className="absolute top-3 left-3 z-[1000] bg-slate-950/90 border border-slate-700/80 px-3 py-1.5 rounded-lg text-[10px] font-mono text-slate-300 backdrop-blur-md flex items-center gap-2 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          <span>BD POLICE SECURE GIS • LIVE VERIFIED CRIME INCIDENTS</span>
        </div>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 z-[1000] bg-slate-950/90 border border-slate-700/80 p-2.5 rounded-lg text-[11px] text-slate-300 backdrop-blur-md space-y-1 shadow-lg">
          <span className="font-bold text-slate-200 block text-[10px] uppercase font-mono">Severity Cluster:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-600 inline-block"></span>
            <span>Critical Armed Threat</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-orange-500 inline-block"></span>
            <span>High Severity</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block"></span>
            <span>Medium Incident</span>
          </div>
        </div>

        {/* The Leaflet Container */}
        <div ref={mapContainerRef} className="w-full h-[540px] z-0 min-h-[500px]" style={{ minHeight: '520px' }} />
      </div>

      {/* Selected Incident Drawer / Details */}
      {selectedIncident && (
        <div className="p-4 rounded-xl bg-slate-900 border border-blue-500/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-blue-400">{selectedIncident.caseId}</span>
              <h4 className="font-bold text-white text-sm">{selectedIncident.title}</h4>
              <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold font-mono text-[10px]">
                {selectedIncident.severity}
              </span>
            </div>
            <p className="text-slate-300 text-xs">
              Location: {selectedIncident.locationName} ({selectedIncident.thana}, {selectedIncident.district}) • Occurred: {new Date(selectedIncident.occurredAt).toLocaleString()}
            </p>
          </div>
          <button
            onClick={() => setSelectedIncident(null)}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold self-start sm:self-center"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};
