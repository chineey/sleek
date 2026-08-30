'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function Navbar() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('editorial');
  const [isSubscriber, setIsSubscriber] = useState(false);

  // Hide the global navigation bar on admin or login routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/login')) {
    return null;
  }

  const checkSubscriberStatus = async () => {
    try {
      const res = await fetch('/api/subscriber/status');
      if (res.ok) {
        const data = await res.json();
        setIsSubscriber(data.isSubscriber);
      }
    } catch (err) {
      console.error('Navbar subscriber status check failed:', err);
    }
  };

  useEffect(() => {
    checkSubscriberStatus();

    // Listen to changes in subscriber status
    const handleSubscriberChange = () => {
      checkSubscriberStatus();
    };

    window.addEventListener('subscriber-change', handleSubscriberChange);
    
    const handleScroll = () => {
      const scrollPos = window.scrollY;
      const viewportHeight = window.innerHeight;

      // Show/hide sticky navbar depending on scroll offset
      if (scrollPos > viewportHeight - 100) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
        setIsMenuOpen(false);
      }

      // Scrollspy active section detection
      const sections = ['editorial', 'about', 'subscribe'];
      let currentSection = '';
      for (const sectionId of sections) {
        const section = document.getElementById(sectionId);
        if (section) {
          const sectionTop = section.offsetTop - 120;
          const sectionHeight = section.offsetHeight;
          if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
            currentSection = sectionId;
            break;
          }
        }
      }

      if (currentSection) {
        setActiveSection(currentSection);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('subscriber-change', handleSubscriberChange);
    };
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/subscriber/logout', { method: 'POST' });
      if (res.ok) {
        setIsSubscriber(false);
        // Dispatch event to sync other components
        window.dispatchEvent(new Event('subscriber-change'));
        // Refresh page to trigger paywalls immediately
        window.location.reload();
      }
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <nav className={`main-nav ${isVisible ? 'visible' : ''} ${isMenuOpen ? 'menu-open' : ''}`} id="main-nav">
      <div className="nav-container">
        <Link href="#cover-hero" className="nav-logo">
          S L E E K
        </Link>
        
        <ul className="nav-links">
          <li>
            <Link 
              href="#editorial" 
              className={`nav-link-item ${activeSection === 'editorial' ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Editorial
            </Link>
          </li>
          <li>
            <Link 
              href="#about" 
              className={`nav-link-item ${activeSection === 'about' ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Features
            </Link>
          </li>
          <li>
            <Link 
              href="#subscribe" 
              className={`nav-link-item ${activeSection === 'subscribe' ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Subscribe
            </Link>
          </li>
        </ul>

        {isSubscriber ? (
          <div className="nav-subscriber-info" style={{ display: 'flex', alignItems: 'center' }}>
            <span className="subscriber-badge">SUBSCRIBER</span>
            <button onClick={handleLogout} className="nav-logout-btn btn-hover-effect">
              LOGOUT
            </button>
          </div>
        ) : (
          <Link href="#subscribe" className="nav-cta btn-hover-effect">
            SUBSCRIBE
          </Link>
        )}
        
        <button 
          className="mobile-nav-toggle" 
          aria-label="Toggle Menu"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <span className="bar"></span>
          <span className="bar"></span>
        </button>
      </div>
    </nav>
  );
}
