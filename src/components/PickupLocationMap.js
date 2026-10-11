'use client';

import { useEffect, useRef, useState } from 'react';

export default function PickupLocationMap({ locations, onLocationSelect, selectedLocationId }) {
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});
  const [leafletReady, setLeafletReady] = useState(false);

  // Load Leaflet from CDN on component mount
  useEffect(() => {
    // Check if Leaflet is already loaded
    if (window.L) {
      setLeafletReady(true);
      return;
    }

    // Load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
    document.head.appendChild(link);

    // Load JS
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    script.async = true;
    script.onload = () => {
      setLeafletReady(true);
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup scripts/links if needed
    };
  }, []);

  // Initialize map and markers when Leaflet is ready and locations change
  useEffect(() => {
    if (!leafletReady || !mapContainer.current || locations.length === 0) return;

    const L = window.L;

    // Initialize map only once
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapContainer.current).setView([0, 0], 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapInstance.current);
    }

    // Clear existing markers
    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};

    // Add new markers
    const allLats = [];
    const allLngs = [];

    locations.forEach((location) => {
      const marker = L.marker([location.latitude, location.longitude])
        .addTo(mapInstance.current)
        .bindPopup(`<strong>${location.name}</strong><br>${location.address}`);

      marker.on('click', () => {
        if (onLocationSelect) {
          onLocationSelect(location);
        }
      });

      // Highlight selected marker
      if (selectedLocationId === location.id) {
        marker.setIcon(
          L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
          })
        );
      }

      markersRef.current[location.id] = marker;
      allLats.push(location.latitude);
      allLngs.push(location.longitude);
    });

    // Fit bounds to all markers
    if (allLats.length > 0) {
      const minLat = Math.min(...allLats);
      const maxLat = Math.max(...allLats);
      const minLng = Math.min(...allLngs);
      const maxLng = Math.max(...allLngs);
      mapInstance.current.fitBounds([
        [minLat, minLng],
        [maxLat, maxLng],
      ]);
    }
  }, [leafletReady, locations, selectedLocationId, onLocationSelect]);

  if (!leafletReady) {
    return (
      <div
        ref={mapContainer}
        style={{
          width: '100%',
          height: '400px',
          background: 'var(--color-black-card, #161616)',
          border: '1px solid var(--color-border, #333)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-muted, #888)',
          fontSize: '0.85rem',
        }}
      >
        Loading map...
      </div>
    );
  }

  return (
    <div
      ref={mapContainer}
      style={{
        width: '100%',
        height: '400px',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid var(--color-border, #333)',
      }}
    />
  );
}
