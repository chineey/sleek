'use client';

import { useState, useEffect } from 'react';
import PickupLocationMap from './PickupLocationMap';

export default function PickupLocationSelector({ onLocationSelect, selectedLocationId }) {
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [localSelected, setLocalSelected] = useState(selectedLocationId || null);

  useEffect(() => {
    async function fetchLocations() {
      try {
        const res = await fetch('/api/pickup-locations');
        if (res.ok) {
          const data = await res.json();
          const activeLocations = data.filter((loc) => loc.active);
          setLocations(activeLocations);
          if (activeLocations.length > 0 && !selectedLocationId) {
            setLocalSelected(activeLocations[0].id);
            if (onLocationSelect) {
              onLocationSelect(activeLocations[0]);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch pickup locations:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLocations();
  }, []);

  useEffect(() => {
    if (selectedLocationId) {
      setLocalSelected(selectedLocationId);
    }
  }, [selectedLocationId]);

  const handleSelectLocation = (location) => {
    setLocalSelected(location.id);
    if (onLocationSelect) {
      onLocationSelect(location);
    }
  };

  const handleGetDirections = (location) => {
    const query = encodeURIComponent(`${location.address || ''} ${location.name || ''}`.trim());
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted, #888)' }}>
        Loading pickup locations...
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted, #888)' }}>
        <p>No pickup locations available at this time.</p>
      </div>
    );
  }

  return (
    <div className="pickup-location-selector" style={{ margin: '2rem 0' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <span className="shop-kicker" style={{ fontSize: '0.75rem', letterSpacing: '0.15em', color: 'var(--color-bronze, #ba9c87)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>
          Collection Hub
        </span>
        <h3 style={{ margin: 0, fontSize: '1.25rem', fontFamily: 'var(--font-serif, serif)', letterSpacing: '0.05em' }}>
          Select Pickup Location
        </h3>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '1.5rem', 
        marginBottom: '1rem' 
      }}>
        {/* Locations List */}
        <div
          style={{
            border: '1px solid var(--color-border, #333)',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: 'var(--color-black-card, #161616)',
            maxHeight: '400px',
            overflowY: 'auto',
          }}
        >
          {locations.map((location) => {
            const isSelected = localSelected === location.id;
            return (
              <div
                key={location.id}
                onClick={() => handleSelectLocation(location)}
                style={{
                  padding: '1.2rem',
                  borderBottom: '1px solid var(--color-border, #262626)',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? 'rgba(186, 156, 135, 0.12)' : 'transparent',
                  borderLeft: isSelected ? '4px solid var(--color-bronze, #ba9c87)' : '4px solid transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                  <p style={{ margin: 0, fontWeight: '600', fontSize: '0.95rem', color: isSelected ? 'var(--color-bronze, #ba9c87)' : '#fff' }}>
                    {location.name}
                  </p>
                  {isSelected && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-bronze, #ba9c87)', fontWeight: '600', letterSpacing: '1px' }}>
                      SELECTED
                    </span>
                  )}
                </div>

                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--color-muted, #aaa)', lineHeight: 1.4 }}>
                  {location.address}
                </p>

                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.8rem', color: '#888' }}>
                  🕒 {location.openingHours || 'Mon - Sat: 9:00 AM - 6:00 PM'}
                </p>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGetDirections(location);
                  }}
                  style={{
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.75rem',
                    backgroundColor: 'transparent',
                    color: 'var(--color-bronze, #ba9c87)',
                    border: '1px solid var(--color-bronze, #ba9c87)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    letterSpacing: '0.5px',
                  }}
                >
                  Get Directions &rarr;
                </button>
              </div>
            );
          })}
        </div>

        {/* Map */}
        <div>
          <PickupLocationMap
            locations={locations}
            onLocationSelect={handleSelectLocation}
            selectedLocationId={localSelected}
          />
        </div>
      </div>
    </div>
  );
}
