'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import EventComments from '../../components/EventComments';

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filterTab, setFilterTab] = useState('upcoming'); // 'upcoming' | 'past' | 'all'
  const [userRatings, setUserRatings] = useState({}); // { [eventId]: rating }
  const [ratingLoading, setRatingLoading] = useState({});

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGetDirections = (event) => {
    let query;
    if (event.latitude != null && event.longitude != null && !isNaN(event.latitude) && !isNaN(event.longitude)) {
      query = `${event.latitude},${event.longitude}`;
    } else {
      query = encodeURIComponent(`${event.address || ''} ${event.location || ''}`.trim());
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(url, '_blank');
  };

  const handleRateEvent = async (eventId, ratingValue) => {
    setRatingLoading((prev) => ({ ...prev, [eventId]: true }));
    try {
      const res = await fetch(`/api/events/${eventId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: ratingValue }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUserRatings((prev) => ({ ...prev, [eventId]: ratingValue }));
        // Update event locally with new average and ratingsCount
        setEvents((prev) =>
          prev.map((e) =>
            e.id === eventId
              ? { ...e, averageRating: data.averageRating, ratingsCount: data.ratingsCount }
              : e
          )
        );
        if (selectedEvent && selectedEvent.id === eventId) {
          setSelectedEvent((prev) => ({
            ...prev,
            averageRating: data.averageRating,
            ratingsCount: data.ratingsCount,
          }));
        }
      } else {
        alert(data.error || 'Failed to submit rating.');
      }
    } catch (err) {
      console.error('Error submitting rating:', err);
      alert('Network error submitting rating.');
    } finally {
      setRatingLoading((prev) => ({ ...prev, [eventId]: false }));
    }
  };

  const now = new Date();
  const upcomingEvents = events.filter((e) => new Date(e.date) >= now);
  const pastEvents = events.filter((e) => new Date(e.date) < now);

  const displayedEvents =
    filterTab === 'upcoming'
      ? upcomingEvents
      : filterTab === 'past'
      ? pastEvents
      : events;

  return (
    <main style={{ minHeight: '100vh', padding: '8rem 1.5rem 5rem', color: 'var(--color-white)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header / Hero */}
        <header style={{ marginBottom: '3.5rem', textAlign: 'center' }}>
          <span style={{
            fontSize: '0.75rem',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: 'var(--color-bronze)',
            display: 'block',
            marginBottom: '0.75rem',
            fontWeight: 600,
          }}>
            SLEEK EXPERIENCES &amp; NIGHTLIFE
          </span>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
            letterSpacing: '0.04em',
            margin: '0 0 1rem 0',
            fontWeight: 400,
          }}>
            Upcoming &amp; Past Events
          </h1>
          <p style={{
            color: 'var(--color-muted)',
            maxWidth: '650px',
            margin: '0 auto',
            fontSize: '0.95rem',
            lineHeight: 1.6,
          }}>
            Curated celebrations, launch parties, and cultural gatherings. Check in on event details, countdown timers, get directions, and rate past parties.
          </p>
        </header>

        {/* Filter Switcher */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          marginBottom: '3.5rem',
          flexWrap: 'wrap',
        }}>
          <button
            type="button"
            onClick={() => setFilterTab('upcoming')}
            style={{
              background: filterTab === 'upcoming' ? 'var(--color-bronze)' : 'transparent',
              color: filterTab === 'upcoming' ? 'var(--color-black)' : 'var(--color-muted)',
              border: `1px solid ${filterTab === 'upcoming' ? 'var(--color-bronze)' : 'var(--color-border)'}`,
              padding: '0.6rem 1.5rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'var(--transition-fast)',
            }}
          >
            Upcoming ({upcomingEvents.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('past')}
            style={{
              background: filterTab === 'past' ? 'var(--color-bronze)' : 'transparent',
              color: filterTab === 'past' ? 'var(--color-black)' : 'var(--color-muted)',
              border: `1px solid ${filterTab === 'past' ? 'var(--color-bronze)' : 'var(--color-border)'}`,
              padding: '0.6rem 1.5rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'var(--transition-fast)',
            }}
          >
            Past Events ({pastEvents.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            style={{
              background: filterTab === 'all' ? 'var(--color-bronze)' : 'transparent',
              color: filterTab === 'all' ? 'var(--color-black)' : 'var(--color-muted)',
              border: `1px solid ${filterTab === 'all' ? 'var(--color-bronze)' : 'var(--color-border)'}`,
              padding: '0.6rem 1.5rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'var(--transition-fast)',
            }}
          >
            All Events ({events.length})
          </button>
        </div>

        {/* Content Section */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--color-muted)' }}>
            Loading events...
          </div>
        ) : displayedEvents.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            backgroundColor: 'var(--color-black-card)',
            border: '1px dashed var(--color-border)',
            borderRadius: '8px',
          }}>
            <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.95rem' }}>
              {filterTab === 'upcoming'
                ? 'No upcoming events scheduled right now. Stay tuned or check back soon!'
                : filterTab === 'past'
                ? 'No past events in archive yet.'
                : 'No events published yet.'}
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '2.5rem',
          }}>
            {displayedEvents.map((event) => {
              const eventDate = new Date(event.date);
              const isPast = eventDate < now;

              return (
                <article
                  key={event.id}
                  style={{
                    backgroundColor: 'var(--color-black-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'var(--transition-smooth)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(186, 156, 135, 0.4)';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Photo with 4:3 Aspect Ratio (same as articles) */}
                  <div style={{
                    width: '100%',
                    aspectRatio: '4/3',
                    position: 'relative',
                    overflow: 'hidden',
                    backgroundColor: '#111',
                  }}>
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        backgroundImage: `url('${event.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200&auto=format&fit=crop'}')`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        transition: 'transform 0.8s ease',
                      }}
                    />

                    {/* Badge: Status or Rating */}
                    <div style={{
                      position: 'absolute',
                      top: '1rem',
                      left: '1rem',
                      backgroundColor: 'rgba(12, 12, 12, 0.85)',
                      backdropFilter: 'blur(6px)',
                      color: isPast ? '#4ade80' : 'var(--color-bronze)',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      border: '1px solid rgba(186, 156, 135, 0.25)',
                    }}>
                      {isPast ? 'COMPLETED EVENT' : 'UPCOMING'}
                    </div>

                    {/* Average Star Rating Badge if past */}
                    {event.averageRating && (
                      <div style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        backgroundColor: 'rgba(12, 12, 12, 0.85)',
                        backdropFilter: 'blur(6px)',
                        color: 'var(--color-bronze)',
                        padding: '0.4rem 0.75rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        border: '1px solid rgba(186, 156, 135, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}>
                        <span>★</span>
                        <span>{event.averageRating} / 5</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--color-muted)' }}>({event.ratingsCount})</span>
                      </div>
                    )}
                  </div>

                  {/* Card Body - styled like pickup location */}
                  <div style={{
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                  }}>
                    {/* Live Countdown to Event */}
                    <div style={{ marginBottom: '1rem' }}>
                      <CountdownTimer targetDate={event.date} />
                    </div>

                    <h2 style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '1.6rem',
                      margin: '0 0 0.5rem 0',
                      lineHeight: 1.2,
                      color: 'var(--color-white)',
                    }}>
                      {event.title}
                    </h2>

                    <p style={{
                      margin: '0 0 0.5rem 0',
                      fontSize: '0.85rem',
                      color: 'var(--color-bronze)',
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                    }}>
                      🕒 {new Date(event.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })} • {new Date(event.date).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>

                    <p style={{
                      margin: '0 0 0.25rem 0',
                      fontSize: '0.9rem',
                      color: '#fff',
                      fontWeight: 600,
                    }}>
                      📍 {event.location}
                    </p>

                    <p style={{
                      margin: '0 0 1.25rem 0',
                      fontSize: '0.85rem',
                      color: 'var(--color-muted)',
                      lineHeight: 1.4,
                    }}>
                      {event.address}
                      {event.latitude != null && event.longitude != null && (
                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-bronze)', marginTop: '0.25rem', opacity: 0.85 }}>
                          📍 Exact Pin: {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
                        </span>
                      )}
                    </p>

                    <p style={{
                      margin: '0 0 1.5rem 0',
                      fontSize: '0.9rem',
                      color: 'var(--color-muted)',
                      lineHeight: 1.5,
                      flex: 1,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      lineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {event.description}
                    </p>

                    {/* 1-5 Star Rating Section (Active after party date, for all users) */}
                    {isPast ? (
                      <div style={{
                        padding: '1rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '6px',
                        border: '1px solid var(--color-border)',
                        marginBottom: '1.25rem',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-bronze)', fontWeight: 600 }}>
                            Rate This Party
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                            {event.averageRating ? `Avg: ★ ${event.averageRating}` : 'No ratings yet'}
                          </span>
                        </div>
                        <StarRatingWidget
                          currentRating={userRatings[event.id] || 0}
                          onRate={(val) => handleRateEvent(event.id, val)}
                          disabled={ratingLoading[event.id]}
                        />
                      </div>
                    ) : (
                      <div style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: '6px',
                        border: '1px dashed rgba(186, 156, 135, 0.2)',
                        marginBottom: '1.25rem',
                        fontSize: '0.75rem',
                        color: 'var(--color-muted)',
                        textAlign: 'center',
                      }}>
                        ★ 1-5 Star Rating opens after party date &amp; time
                      </div>
                    )}

                    {/* Action Buttons: Get Directions (no map display) & More Info */}
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
                      <button
                        type="button"
                        onClick={() => handleGetDirections(event)}
                        style={{
                          flex: 1,
                          padding: '0.65rem 0.75rem',
                          fontSize: '0.75rem',
                          backgroundColor: 'transparent',
                          color: 'var(--color-bronze)',
                          border: '1px solid var(--color-bronze)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          transition: 'var(--transition-fast)',
                        }}
                      >
                        Directions &rarr;
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedEvent(event)}
                        style={{
                          flex: 1,
                          padding: '0.65rem 0.75rem',
                          fontSize: '0.75rem',
                          backgroundColor: 'var(--color-bronze)',
                          color: 'var(--color-black)',
                          border: '1px solid var(--color-bronze)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          transition: 'var(--transition-fast)',
                        }}
                      >
                        More Info ({event.commentsCount || 0})
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Immersive Event Details & Comments Modal */}
      {selectedEvent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 99999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '1.5rem',
          }}
          onClick={() => setSelectedEvent(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--color-black-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              maxWidth: '750px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 'clamp(1.5rem, 4vw, 2.5rem)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedEvent(null)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'none',
                border: 'none',
                color: 'var(--color-white)',
                fontSize: '1.5rem',
                cursor: 'pointer',
                lineHeight: 1,
              }}
              aria-label="Close modal"
            >
              &times;
            </button>

            {/* 4:3 Aspect Ratio Header Photo */}
            <div style={{
              width: '100%',
              aspectRatio: '4/3',
              borderRadius: '6px',
              overflow: 'hidden',
              marginBottom: '1.75rem',
              backgroundImage: `url('${selectedEvent.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200&auto=format&fit=crop'}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }} />

            {/* Countdown Banner */}
            <div style={{ marginBottom: '1.5rem' }}>
              <CountdownTimer targetDate={selectedEvent.date} />
            </div>

            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '2.2rem',
              margin: '0 0 0.75rem 0',
              color: 'var(--color-white)',
              lineHeight: 1.2,
            }}>
              {selectedEvent.title}
            </h2>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              marginBottom: '1.5rem',
              fontSize: '0.95rem',
            }}>
              <span style={{ color: 'var(--color-bronze)', fontWeight: 600 }}>
                🕒 {new Date(selectedEvent.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })} at {new Date(selectedEvent.date).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span style={{ color: '#fff', fontWeight: 600 }}>
                📍 {selectedEvent.location}
              </span>
              <span style={{ color: 'var(--color-muted)' }}>
                {selectedEvent.address}
              </span>
              {selectedEvent.latitude != null && selectedEvent.longitude != null && (
                <span style={{ color: 'var(--color-bronze)', fontSize: '0.8rem', opacity: 0.85 }}>
                  📍 Exact GPS: {selectedEvent.latitude.toFixed(5)}, {selectedEvent.longitude.toFixed(5)}
                </span>
              )}
            </div>

            {/* Directions Action */}
            <div style={{ marginBottom: '2rem' }}>
              <button
                type="button"
                onClick={() => handleGetDirections(selectedEvent)}
                style={{
                  padding: '0.6rem 1.25rem',
                  fontSize: '0.75rem',
                  backgroundColor: 'transparent',
                  color: 'var(--color-bronze)',
                  border: '1px solid var(--color-bronze)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Get Directions (Google Maps) &rarr;
              </button>
            </div>

            {/* Full Description */}
            <div style={{
              color: '#d5d5d5',
              fontSize: '0.95rem',
              lineHeight: 1.7,
              marginBottom: '2rem',
              whiteSpace: 'pre-line',
            }}>
              {selectedEvent.description}
            </div>

            {/* 1-5 Star Rating Section in Modal */}
            {new Date(selectedEvent.date) < now && (
              <div style={{
                padding: '1.5rem',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                marginBottom: '2rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-bronze)', fontWeight: 600 }}>
                    Rate this party (1 - 5 Stars)
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#fff' }}>
                    {selectedEvent.averageRating ? `★ ${selectedEvent.averageRating} / 5 (${selectedEvent.ratingsCount} ratings)` : 'Be the first to rate!'}
                  </span>
                </div>
                <StarRatingWidget
                  currentRating={userRatings[selectedEvent.id] || 0}
                  onRate={(val) => handleRateEvent(selectedEvent.id, val)}
                  disabled={ratingLoading[selectedEvent.id]}
                />
              </div>
            )}

            {/* Threaded Discussion Section */}
            <EventComments eventId={selectedEvent.id} />
          </div>
        </div>
      )}
    </main>
  );
}

// Live Countdown Component
function CountdownTimer({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining(targetDate));

  function getTimeRemaining(endTime) {
    const total = Date.parse(endTime) - Date.now();
    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    return { total, days, hours, minutes, seconds };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeRemaining(targetDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (timeLeft.total <= 0) {
    return (
      <div style={{
        padding: '0.5rem 0.8rem',
        backgroundColor: 'rgba(74, 222, 128, 0.1)',
        border: '1px solid rgba(74, 222, 128, 0.3)',
        borderRadius: '4px',
        color: '#4ade80',
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
      }}>
        <span>●</span> Event Concluded
      </div>
    );
  }

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.6rem',
      padding: '0.4rem 0.8rem',
      backgroundColor: 'rgba(186, 156, 135, 0.1)',
      border: '1px solid rgba(186, 156, 135, 0.35)',
      borderRadius: '4px',
      fontSize: '0.75rem',
      fontFamily: 'monospace',
      letterSpacing: '0.05em',
      color: 'var(--color-bronze)',
    }}>
      <span style={{ textTransform: 'uppercase', fontSize: '0.7rem', color: 'var(--color-muted)' }}>Countdown:</span>
      <span>{String(timeLeft.days).padStart(2, '0')}d</span> :
      <span>{String(timeLeft.hours).padStart(2, '0')}h</span> :
      <span>{String(timeLeft.minutes).padStart(2, '0')}m</span> :
      <span>{String(timeLeft.seconds).padStart(2, '0')}s</span>
    </div>
  );
}

// 1-5 Star Rating Widget (Non-subscribers and subscribers can rate)
function StarRatingWidget({ currentRating, onRate, disabled }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = hovered ? star <= hovered : star <= currentRating;
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => onRate(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            style={{
              background: 'none',
              border: 'none',
              padding: '0.2rem',
              fontSize: '1.5rem',
              cursor: disabled ? 'not-allowed' : 'pointer',
              color: isFilled ? 'var(--color-bronze)' : '#444',
              transition: 'color 0.15s ease',
              lineHeight: 1,
            }}
            aria-label={`Rate ${star} star`}
          >
            ★
          </button>
        );
      })}
      {currentRating > 0 && (
        <span style={{ fontSize: '0.8rem', color: 'var(--color-bronze)', marginLeft: '0.5rem', fontWeight: 600 }}>
          Your Rating: {currentRating} / 5
        </span>
      )}
    </div>
  );
}
