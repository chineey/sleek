'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function Navbar() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('editorial');
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [isSubscriberChecked, setIsSubscriberChecked] = useState(false);

  const isVisibleRef = useRef(false);
  const activeSectionRef = useRef('editorial');

  // Hide the global navigation bar on admin or login routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/login')) {
    return null;
  }

  const isShopActive = pathname === '/shop';
  const isEventsActive = pathname === '/events' || pathname.startsWith('/events');
  const isComicsActive = pathname === '/comics' || pathname.startsWith('/comics');
  const isSubPage = isShopActive || isEventsActive || isComicsActive;

  const checkSubscriberStatus = async () => {
    try {
      const res = await fetch('/api/subscriber/status');
      if (res.ok) {
        const data = await res.json();
        setIsSubscriber(data.isSubscriber);
      }
    } catch (err) {
      console.error('Navbar subscriber status check failed:', err);
    } finally {
      setIsSubscriberChecked(true);
    }
  };

  useEffect(() => {
    checkSubscriberStatus();

    const handleSubscriberChange = () => {
      checkSubscriberStatus();
    };

    window.addEventListener('subscriber-change', handleSubscriberChange);

    // If on sub-page, navbar is always visible
    if (isSubPage) {
      if (!isVisibleRef.current) {
        isVisibleRef.current = true;
        setIsVisible(true);
      }
      return () => {
        window.removeEventListener('subscriber-change', handleSubscriberChange);
      };
    }

    // High performance IntersectionObserver for section tracking (ZERO layout thrashing)
    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.target.id) {
          if (activeSectionRef.current !== entry.target.id) {
            activeSectionRef.current = entry.target.id;
            setActiveSection(entry.target.id);
          }
        }
      });
    };

    const sectionObserver = new IntersectionObserver(observerCallback, {
      rootMargin: '-30% 0px -50% 0px',
      threshold: 0,
    });

    const sections = ['editorial', 'about', 'subscribe'];
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) sectionObserver.observe(el);
    });

    // Throttled, passive scroll listener for navbar appearance
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollPos = window.scrollY;
          const viewportHeight = window.innerHeight;
          const shouldBeVisible = scrollPos > viewportHeight - 100;

          if (shouldBeVisible !== isVisibleRef.current) {
            isVisibleRef.current = shouldBeVisible;
            setIsVisible(shouldBeVisible);
            if (!shouldBeVisible) {
              setIsMenuOpen(false);
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    // Run once initially
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('subscriber-change', handleSubscriberChange);
      sectionObserver.disconnect();
    };
  }, [isSubPage]);

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/subscriber/logout', { method: 'POST' });
      if (res.ok) {
        setIsSubscriber(false);
        window.dispatchEvent(new Event('subscriber-change'));
        window.location.reload();
      }
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <nav className={`main-nav ${isVisible ? 'visible' : ''} ${isMenuOpen ? 'menu-open' : ''}`} id="main-nav">
      <div className="nav-container">
        <Link href="/#cover-hero" className="nav-logo">
          S L E E K
        </Link>
        
        <ul className="nav-links">
          <li>
            <Link 
              href="/#editorial" 
              className={`nav-link-item ${activeSection === 'editorial' ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Editorial
            </Link>
          </li>
          <li>
            <Link 
              href="/comics" 
              className={`nav-link-item ${isComicsActive ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Comics
            </Link>
          </li>
          <li>
            <Link 
              href="/events" 
              className={`nav-link-item ${isEventsActive ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Events
            </Link>
          </li>
          <li>
            <Link 
              href="/shop" 
              className={`nav-link-item ${isShopActive ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Shop
            </Link>
          </li>
          <li>
            <Link 
              href="/#about" 
              className={`nav-link-item ${activeSection === 'about' ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              About
            </Link>
          </li>
          <li>
            <Link 
              href="/#subscribe" 
              className={`nav-link-item ${activeSection === 'subscribe' ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Subscribe
            </Link>
          </li>
          {!isSubscriber && (
            <li className="mobile-sign-in-item" style={{ display: 'none' }}>
              <Link 
                href="/subscriber/login" 
                className="nav-link-item"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign In
              </Link>
            </li>
          )}
        </ul>

        {/* Dynamic CTA / Subscriber Badge */}
        {isSubscriberChecked ? (
          isSubscriber ? (
            <div className="nav-subscriber-info" style={{ display: 'flex', alignItems: 'center' }}>
              <span className="subscriber-badge">SUBSCRIBER</span>
              <button 
                onClick={handleLogout}
                className="nav-logout-btn"
                title="Log out of subscriber pass"
              >
                Log Out
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <Link 
                href="/subscriber/login" 
                className="nav-link-item"
                style={{ fontSize: '0.75rem', padding: 0 }}
              >
                Sign In
              </Link>
              <Link href="/#subscribe" className="nav-cta btn-hover-effect">
                SUBSCRIBE
              </Link>
            </div>
          )
        ) : null}

        <button 
          className="mobile-nav-toggle" 
          aria-label="Toggle navigation menu"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <span className="bar"></span>
          <span className="bar"></span>
        </button>
      </div>
    </nav>
  );
}
