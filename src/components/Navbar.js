'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function Navbar() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('editorial');

  // Hide the global navigation bar on admin or login routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/login')) {
    return null;
  }

  useEffect(() => {
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
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

        <Link href="#subscribe" className="nav-cta btn-hover-effect">
          SUBSCRIBE
        </Link>
        
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
