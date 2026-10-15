'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

function ComicsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetId = searchParams.get('id');

  const [comics, setComics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubscriber, setIsSubscriber] = useState(false);

  // Active Reader State
  const [activeComic, setActiveComic] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isPaywallBlocked, setIsPaywallBlocked] = useState(false);

  // Check subscriber status
  const checkSubscriberStatus = async () => {
    try {
      const res = await fetch('/api/subscriber/status');
      if (res.ok) {
        const data = await res.json();
        setIsSubscriber(data.isSubscriber);
      }
    } catch (err) {
      console.error('Failed to get subscriber status:', err);
    }
  };

  // Fetch comics
  const fetchComics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/comics');
      if (res.ok) {
        const data = await res.json();
        setComics(data);
      }
    } catch (err) {
      console.error('Failed to load comics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSubscriberStatus();
    fetchComics();
  }, []);

  // Open comic if targetId parameter exists in URL
  useEffect(() => {
    if (targetId && comics.length > 0) {
      const found = comics.find((c) => String(c.id) === String(targetId));
      if (found) {
        openReader(found);
      }
    }
  }, [targetId, comics]);

  // Open reader
  const openReader = (comic, initialPage = 0) => {
    setActiveComic(comic);
    setCurrentPage(initialPage);
    setIsPaywallBlocked(!isSubscriber && initialPage > 0);
    document.body.style.overflow = 'hidden';
  };

  // Close reader
  const closeReader = () => {
    setActiveComic(null);
    setCurrentPage(0);
    setIsPaywallBlocked(false);
    document.body.style.overflow = '';
    // Remove query parameter without reload
    window.history.replaceState({}, document.title, '/comics');
  };

  // Next page handler
  const goToNextPage = useCallback(() => {
    if (!activeComic) return;
    if (currentPage < activeComic.pages.length - 1) {
      const next = currentPage + 1;
      // If user is not subscriber and tries to swipe past preview page 0
      if (!isSubscriber && next > 0) {
        setIsPaywallBlocked(true);
      } else {
        setCurrentPage(next);
        setIsPaywallBlocked(false);
      }
    }
  }, [activeComic, currentPage, isSubscriber]);

  // Previous page handler
  const goToPrevPage = useCallback(() => {
    if (!activeComic) return;
    if (isPaywallBlocked) {
      setIsPaywallBlocked(false);
      return;
    }
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
      setIsPaywallBlocked(false);
    }
  }, [activeComic, currentPage, isPaywallBlocked]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!activeComic) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        goToNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goToPrevPage();
      } else if (e.key === 'Escape') {
        closeReader();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeComic, goToNextPage, goToPrevPage]);

  // Touch Swipe Handlers (Swipe left for Next, Swipe right for Prev)
  const minSwipeDistance = 45;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNextPage();
    } else if (isRightSwipe) {
      goToPrevPage();
    }
  };

  return (
    <main style={{ minHeight: '100vh', padding: '8rem 1.5rem 6rem', color: 'var(--color-white)', background: 'var(--color-black)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <header style={{ marginBottom: '4rem', textAlign: 'center' }}>
          <span
            style={{
              fontSize: '0.75rem',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: 'var(--color-bronze)',
              display: 'block',
              marginBottom: '0.75rem',
              fontWeight: 600,
            }}
          >
            ILLUSTRATED CHAPTERS &bull; GRAPHIC NOVELS
          </span>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(2.5rem, 5.5vw, 4.5rem)',
              letterSpacing: '0.04em',
              margin: '0 0 1rem 0',
              fontWeight: 400,
            }}
          >
            The Comics Archive
          </h1>
          <p
            style={{
              color: 'var(--color-muted)',
              fontSize: '1rem',
              maxWidth: '620px',
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            Visual storytelling, sequential art, and full chapters curated exclusively by SLEEK Magazine.
            Tap any chapter preview below to open the interactive comic reader.
          </p>
        </header>

        {/* Comics Gallery */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '6rem 0', color: 'var(--color-bronze)' }}>
            <p style={{ letterSpacing: '0.15em', fontSize: '0.9rem' }}>LOADING COMIC CHAPTERS...</p>
          </div>
        ) : comics.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '6rem 2rem',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-black-card)',
              maxWidth: '600px',
              margin: '0 auto',
            }}
          >
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', marginBottom: '0.75rem' }}>
              No Comics Published Yet
            </h3>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
              The editorial comic chapters are currently being inked and finalized.
            </p>
            <Link
              href="/"
              style={{
                color: 'var(--color-bronze)',
                textDecoration: 'underline',
                fontSize: '0.85rem',
                letterSpacing: '0.05em',
              }}
            >
              &larr; Back to Editorial Feed
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '2.5rem',
            }}
          >
            {comics.map((comic, idx) => (
              <div
                key={comic.id}
                onClick={() => openReader(comic)}
                style={{
                  backgroundColor: 'var(--color-black-card)',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = 'var(--color-bronze)';
                  e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Cover Preview Image */}
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '4 / 3',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundImage: `url('${comic.image || (comic.pages && comic.pages[0]) || ''}')`,
                    position: 'relative',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '1rem',
                      left: '1rem',
                      backgroundColor: 'rgba(12, 12, 12, 0.85)',
                      color: 'var(--color-bronze)',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.7rem',
                      letterSpacing: '0.12em',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      border: '1px solid rgba(186, 156, 135, 0.3)',
                    }}
                  >
                    CHAPTER {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                  </span>

                  <span
                    style={{
                      position: 'absolute',
                      bottom: '1rem',
                      right: '1rem',
                      backgroundColor: 'rgba(12, 12, 12, 0.9)',
                      color: 'var(--color-white)',
                      padding: '0.3rem 0.6rem',
                      fontSize: '0.7rem',
                      letterSpacing: '0.08em',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    📖 {comic.pageCount} {comic.pageCount === 1 ? 'Page' : 'Pages'}
                  </span>

                  {!isSubscriber && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        backgroundColor: 'rgba(186, 156, 135, 0.9)',
                        color: 'var(--color-black)',
                        padding: '0.3rem 0.6rem',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                      }}
                    >
                      PREVIEW
                    </span>
                  )}
                </div>

                {/* Comic Card Details */}
                <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      marginBottom: '0.5rem',
                    }}
                  >
                    {comic.author} &bull; {comic.date}
                  </span>
                  <h3
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '1.45rem',
                      fontWeight: 400,
                      letterSpacing: '0.02em',
                      margin: '0 0 0.75rem 0',
                      lineHeight: 1.3,
                    }}
                  >
                    {comic.title}
                  </h3>
                  <p
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--color-muted)',
                      lineHeight: 1.6,
                      marginBottom: '1.5rem',
                      flex: 1,
                    }}
                  >
                    {comic.synopsis && comic.synopsis.length > 130
                      ? comic.synopsis.substring(0, 130) + '...'
                      : comic.synopsis}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid var(--color-border)',
                      paddingTop: '1rem',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        letterSpacing: '0.15em',
                        color: 'var(--color-bronze)',
                        textTransform: 'uppercase',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      Read Chapter &rarr;
                    </span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--color-muted)',
                      }}
                    >
                      {isSubscriber ? 'Full Access' : 'Preview & Unlock'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Fullscreen Immersive Comic Reader */}
      {activeComic && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: '#0a0a0a',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Top Bar */}
          <div
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'rgba(15, 15, 15, 0.95)',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 10,
            }}
          >
            {/* Title & Issue */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span
                style={{
                  color: 'var(--color-bronze)',
                  fontSize: '0.75rem',
                  letterSpacing: '0.15em',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                SLEEK COMICS
              </span>
              <span style={{ color: 'var(--color-border)' }}>|</span>
              <h2
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.1rem',
                  fontWeight: 400,
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '350px',
                }}
              >
                {activeComic.title}
              </h2>
            </div>

            {/* Page indicator & Close button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div
                style={{
                  fontSize: '0.8rem',
                  letterSpacing: '0.1em',
                  color: 'var(--color-muted)',
                }}
              >
                Page <span style={{ color: 'var(--color-white)', fontWeight: 600 }}>{currentPage + 1}</span> of{' '}
                <span>{activeComic.pages.length}</span>
              </div>

              <button
                type="button"
                onClick={closeReader}
                aria-label="Close Comic Reader"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-white)',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-bronze)';
                  e.currentTarget.style.color = 'var(--color-bronze)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.color = 'var(--color-white)';
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Reading Progress Line */}
          <div style={{ width: '100%', height: '3px', backgroundColor: 'rgba(255,255,255,0.1)', zIndex: 10 }}>
            <div
              style={{
                height: '100%',
                backgroundColor: 'var(--color-bronze)',
                width: `${((currentPage + 1) / (activeComic.pages.length || 1)) * 100}%`,
                transition: 'width 0.3s ease',
              }}
            ></div>
          </div>

          {/* Main Comic Page Stage */}
          <div
            style={{
              flex: 1,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              padding: '1rem',
              userSelect: 'none',
            }}
          >
            {/* Left Page Edge Click Navigation */}
            <button
              type="button"
              onClick={goToPrevPage}
              disabled={currentPage === 0 && !isPaywallBlocked}
              aria-label="Previous Page"
              style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 5,
                background: 'rgba(15, 15, 15, 0.75)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-white)',
                width: '46px',
                height: '46px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: currentPage === 0 && !isPaywallBlocked ? 'not-allowed' : 'pointer',
                opacity: currentPage === 0 && !isPaywallBlocked ? 0.25 : 0.85,
                fontSize: '1.4rem',
                backdropFilter: 'blur(4px)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (currentPage > 0 || isPaywallBlocked) {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.borderColor = 'var(--color-bronze)';
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage > 0 || isPaywallBlocked) {
                  e.currentTarget.style.opacity = '0.85';
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                }
              }}
            >
              &#8249;
            </button>

            {/* Right Page Edge Click Navigation */}
            <button
              type="button"
              onClick={goToNextPage}
              disabled={currentPage === activeComic.pages.length - 1}
              aria-label="Next Page"
              style={{
                position: 'absolute',
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 5,
                background: 'rgba(15, 15, 15, 0.75)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-white)',
                width: '46px',
                height: '46px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: currentPage === activeComic.pages.length - 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage === activeComic.pages.length - 1 ? 0.25 : 0.85,
                fontSize: '1.4rem',
                backdropFilter: 'blur(4px)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (currentPage < activeComic.pages.length - 1) {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.borderColor = 'var(--color-bronze)';
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage < activeComic.pages.length - 1) {
                  e.currentTarget.style.opacity = '0.85';
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                }
              }}
            >
              &#8250;
            </button>

            {/* Paywall Overlay for Non-Subscribers Swiping Past Page 1 */}
            {isPaywallBlocked ? (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(10, 10, 10, 0.94)',
                  backdropFilter: 'blur(12px)',
                  zIndex: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2rem',
                }}
              >
                <div
                  style={{
                    backgroundColor: 'var(--color-black-card)',
                    border: '1px solid var(--color-bronze)',
                    padding: '3rem 2.5rem',
                    maxWidth: '480px',
                    width: '100%',
                    textAlign: 'center',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
                  }}
                >
                  <svg
                    style={{ width: '48px', height: '48px', color: 'var(--color-bronze)', marginBottom: '1.25rem' }}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      letterSpacing: '0.2em',
                      color: 'var(--color-bronze)',
                      display: 'block',
                      marginBottom: '0.5rem',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                    }}
                  >
                    SUBSCRIBER EXCLUSIVE
                  </span>
                  <h3
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '2rem',
                      margin: '0 0 1rem 0',
                      fontWeight: 400,
                    }}
                  >
                    Unlock Full Comic Chapter
                  </h3>
                  <p
                    style={{
                      color: 'var(--color-muted)',
                      fontSize: '0.9rem',
                      lineHeight: 1.6,
                      marginBottom: '2rem',
                    }}
                  >
                    You have reached the preview limit. Complete comic chapters, graphic issues, and digital archives require an active subscription (₦2,500 bi-monthly).
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <Link
                      href="/#subscribe"
                      onClick={closeReader}
                      style={{
                        backgroundColor: 'var(--color-bronze)',
                        color: 'var(--color-black)',
                        fontWeight: 600,
                        letterSpacing: '0.15em',
                        fontSize: '0.8rem',
                        textTransform: 'uppercase',
                        padding: '1rem',
                        textDecoration: 'none',
                        transition: 'var(--transition-fast)',
                      }}
                    >
                      Subscribe Now &bull; ₦2,500
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setIsPaywallBlocked(false);
                        setCurrentPage(0);
                      }}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-white)',
                        fontSize: '0.75rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        padding: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      &larr; Return to Page 1
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Comic Page Image */}
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {activeComic.pages && activeComic.pages[currentPage] ? (
                <img
                  src={activeComic.pages[currentPage]}
                  alt={`${activeComic.title} - Page ${currentPage + 1}`}
                  style={{
                    maxHeight: 'calc(100vh - 140px)',
                    maxWidth: '100%',
                    objectFit: 'contain',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
                    transition: 'opacity 0.2s ease',
                  }}
                />
              ) : (
                <div style={{ color: 'var(--color-muted)', textAlign: 'center' }}>
                  <p>Page not found.</p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Controls Toolbar */}
          <div
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'rgba(15, 15, 15, 0.95)',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 10,
            }}
          >
            {/* Prev Button */}
            <button
              type="button"
              onClick={goToPrevPage}
              disabled={currentPage === 0 && !isPaywallBlocked}
              style={{
                background: 'transparent',
                border: '1px solid var(--color-border)',
                color: 'var(--color-white)',
                padding: '0.5rem 1.25rem',
                fontSize: '0.75rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: currentPage === 0 && !isPaywallBlocked ? 'not-allowed' : 'pointer',
                opacity: currentPage === 0 && !isPaywallBlocked ? 0.3 : 1,
                transition: 'var(--transition-fast)',
              }}
            >
              &larr; Prev Page
            </button>

            {/* Quick Page Dots / Numbers */}
            <div
              style={{
                display: 'flex',
                gap: '0.4rem',
                alignItems: 'center',
                overflowX: 'auto',
                maxWidth: '50vw',
                padding: '0.2rem',
              }}
            >
              {activeComic.pages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    if (!isSubscriber && i > 0) {
                      setIsPaywallBlocked(true);
                    } else {
                      setCurrentPage(i);
                      setIsPaywallBlocked(false);
                    }
                  }}
                  aria-label={`Jump to page ${i + 1}`}
                  style={{
                    width: i === currentPage ? '24px' : '8px',
                    height: '8px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: i === currentPage ? 'var(--color-bronze)' : 'rgba(255,255,255,0.2)',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    padding: 0,
                  }}
                />
              ))}
            </div>

            {/* Next Button */}
            <button
              type="button"
              onClick={goToNextPage}
              disabled={currentPage === activeComic.pages.length - 1}
              style={{
                background: 'var(--color-bronze)',
                border: 'none',
                color: 'var(--color-black)',
                fontWeight: 600,
                padding: '0.5rem 1.25rem',
                fontSize: '0.75rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: currentPage === activeComic.pages.length - 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage === activeComic.pages.length - 1 ? 0.3 : 1,
                transition: 'var(--transition-fast)',
              }}
            >
              Next Page &rarr;
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function ComicsPage() {
  return (
    <Suspense
      fallback={
        <main style={{ minHeight: '100vh', padding: '8rem 1.5rem', textAlign: 'center', color: 'var(--color-bronze)' }}>
          <p style={{ letterSpacing: '0.15em' }}>LOADING COMIC READER...</p>
        </main>
      }
    >
      <ComicsContent />
    </Suspense>
  );
}
