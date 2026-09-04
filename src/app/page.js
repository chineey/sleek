'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Comments from '../components/Comments';

export default function Home() {
  const [articles, setArticles] = useState([]);
  const [filteredArticles, setFilteredArticles] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isHeroLoaded, setIsHeroLoaded] = useState(false);
  const [cover, setCover] = useState({
    title: 'SLEEK',
    issue: 'ISH. 01',
    label: 'MAGAZINE',
    tagline: 'A New WAVE',
    url: 'www.sleekmagazine.com',
    social: '@sleekpeak',
    image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1200&auto=format&fit=crop'
  });

  const [isSubscriber, setIsSubscriber] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '' });

  // Magic Link Form State
  const [showMagicLinkForm, setShowMagicLinkForm] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState('');
  const [magicLinkFeedback, setMagicLinkFeedback] = useState({ message: '', type: '' });
  const [isSubmittingMagicLink, setIsSubmittingMagicLink] = useState(false);

  // Immersive Reader Modal State
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isReaderActive, setIsReaderActive] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const readerModalRef = useRef(null);

  // Newsletter/Subscribe Form State
  const [email, setEmail] = useState('');
  const [formFeedback, setFormFeedback] = useState({ message: '', type: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: '', type: '' });
    }, 6000);
  };

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

  // Fetch cover settings from API
  useEffect(() => {
    async function fetchCover() {
      try {
        const res = await fetch('/api/cover');
        if (res.ok) {
          const data = await res.json();
          setCover(data);
        }
      } catch (err) {
        console.error('Failed to load cover settings:', err);
      }
    }
    fetchCover();
    checkSubscriberStatus();

    // Listen to changes in subscriber status
    const handleSubscriberChange = () => {
      checkSubscriberStatus();
    };

    window.addEventListener('subscriber-change', handleSubscriberChange);
    return () => window.removeEventListener('subscriber-change', handleSubscriberChange);
  }, []);

  // Check URL query parameters for alerts
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('subscribed') === 'true') {
      showToast('Thank you! Your subscription is active. Welcome to SLEEK.', 'success');
      window.history.replaceState({}, document.title, window.location.pathname);
      window.dispatchEvent(new Event('subscriber-change'));
    } else if (params.get('login') === 'success') {
      showToast('Welcome back! You have successfully signed in.', 'success');
      window.history.replaceState({}, document.title, window.location.pathname);
      window.dispatchEvent(new Event('subscriber-change'));
    } else if (params.get('login_error')) {
      const err = params.get('login_error');
      if (err === 'expired_or_invalid') {
        showToast('This access link has expired or is invalid. Please request a new one.', 'error');
      } else if (err === 'not_active_subscriber') {
        showToast('No active subscription found for this email address.', 'error');
      } else {
        showToast('Sign in failed. Please try again.', 'error');
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('payment') === 'success') {
      showToast('Payment successful! Thank you.', 'success');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('error')) {
      const err = params.get('error');
      if (err === 'payment_failed') {
        showToast('Subscription payment failed. Please try again.', 'error');
      } else {
        showToast('An error occurred during verification.', 'error');
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Fetch articles from Database API
  useEffect(() => {
    async function fetchArticles() {
      try {
        const res = await fetch('/api/articles');
        if (res.ok) {
          const data = await res.json();
          setArticles(data);
          setFilteredArticles(data);
        }
      } catch (err) {
        console.error('Failed to load articles:', err);
      }
    }
    fetchArticles();
  }, []);

  // Trigger hero animation entry
  useEffect(() => {
    const timer = setTimeout(() => setIsHeroLoaded(true), 150);
    return () => clearTimeout(timer);
  }, []);

  // Filter articles based on Category
  const handleCategoryFilter = (category) => {
    setActiveCategory(category);
    if (category === 'all') {
      setFilteredArticles(articles);
    } else {
      setFilteredArticles(articles.filter(a => a.category.toLowerCase() === category.toLowerCase()));
    }
  };

  // Excerpt generation helper (strips HTML and truncates)
  const getExcerpt = (htmlContent) => {
    if (!htmlContent) return "";
    const text = htmlContent.replace(/<\/?[^>]+(>|$)/g, ""); // Strip HTML tags
    return text.length > 150 ? text.substring(0, 150) + "..." : text;
  };

  // Reader Modal Operations
  const openReader = (article) => {
    setSelectedArticle(article);
    setIsReaderActive(true);
    document.body.style.overflow = 'hidden'; // Lock background scroll
    setReadProgress(0);
    if (readerModalRef.current) {
      readerModalRef.current.scrollTop = 0;
    }
  };

  const closeReader = () => {
    setIsReaderActive(false);
    document.body.style.overflow = ''; // Restore background scroll
    setSelectedArticle(null);
  };

  // Close reader on Escape keypress
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isReaderActive) {
        closeReader();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReaderActive]);

  // Track scroll progress inside reader modal
  const handleReaderScroll = () => {
    const modal = readerModalRef.current;
    if (!modal) return;
    const totalHeight = modal.scrollHeight - modal.clientHeight;
    if (totalHeight > 0) {
      const progress = (modal.scrollTop / totalHeight) * 100;
      setReadProgress(progress);
    }
  };

  // Subscribe Newsletter Handler (now handles Paystack subscription)
  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setFormFeedback({ message: 'Please enter a valid email address.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setFormFeedback({ message: '', type: '' });

    try {
      const res = await fetch('/api/subscribe/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate checkout.');
      }

      if (data.authorization_url) {
        showToast('Redirecting to checkout...', 'info');
        window.location.href = data.authorization_url;
      } else {
        throw new Error('No checkout URL returned.');
      }
    } catch (err) {
      setFormFeedback({ message: err.message, type: 'error' });
      setIsSubmitting(false);
    }
  };

  // Magic Link Request Handler
  const handleRequestMagicLink = async (e) => {
    e.preventDefault();
    if (!magicLinkEmail || !magicLinkEmail.includes('@')) {
      setMagicLinkFeedback({ message: 'Please enter a valid email address.', type: 'error' });
      return;
    }

    setIsSubmittingMagicLink(true);
    setMagicLinkFeedback({ message: '', type: '' });

    try {
      const res = await fetch('/api/magic-link/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: magicLinkEmail }),
      });

      const data = await res.json();
      if (res.ok) {
        setMagicLinkFeedback({
          message: data.message || 'Access link sent! Check your inbox (or console/scratch).',
          type: 'success'
        });
        setMagicLinkEmail('');
      } else {
        throw new Error(data.error || 'Failed to request magic link.');
      }
    } catch (err) {
      setMagicLinkFeedback({ message: err.message, type: 'error' });
    } finally {
      setIsSubmittingMagicLink(false);
    }
  };

  // Scroll to editorial content from cover hero
  const scrollToContent = () => {
    const element = document.getElementById('editorial');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* Cover Hero Section */}
      <section className={`cover-hero ${isHeroLoaded ? 'loaded' : ''}`} id="cover-hero">
        <div 
          className="cover-background" 
          style={{ 
            backgroundImage: `linear-gradient(to bottom, rgba(12, 12, 12, 0.2) 0%, rgba(12, 12, 12, 0.7) 100%), url('${cover.image}')` 
          }}
        ></div>
        <div className="cover-overlay"></div>

        {/* Decorative Bronze Frames */}
        <div className="cover-frames">
          <div className="frame frame-1"></div>
          <div className="frame frame-2"></div>
          <div className="frame frame-3"></div>
        </div>

        {/* Cover Content */}
        <div className="cover-content">
          <div className="cover-top-bar">
            <h1 className="cover-title">{cover.title}</h1>
          </div>

          <div className="cover-middle-bar">
            <span className="cover-issue">{cover.issue}</span>
            <h2 className="cover-magazine-label">{cover.label}</h2>
          </div>

          <div className="cover-bottom-bar">
            <h3 className="cover-tagline">{cover.tagline}</h3>
            <div className="cover-footer-meta">
              <a href={`https://${cover.url}`} target="_blank" rel="noreferrer" className="cover-link cover-url">
                {cover.url}
              </a>
              <span className="cover-link cover-social">{cover.social}</span>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="scroll-indicator" id="scroll-btn" onClick={scrollToContent} style={{ cursor: 'pointer' }}>
          <span className="scroll-text">EXPLORE ISSUE</span>
          <div className="scroll-mouse">
            <div className="scroll-wheel"></div>
          </div>
        </div>
      </section>

      {/* Main Editorial Feed */}
      <main className="main-content" id="editorial">
        <div className="section-container">

          <header className="editorial-header">
            <span className="subtitle-tag">CULTURE &amp; STYLE</span>
            <h2 className="section-title">The Editorial Feed</h2>
            <p className="section-description">
              A curated selection of stories exploring contemporary fashion, art direction, and forward-thinking creators.
            </p>
          </header>

          {/* Categories Filter */}
          <div className="filter-container">
            {['all', 'fashion', 'culture', 'design', 'editorial'].map((cat) => (
              <button
                key={cat}
                className={`filter-btn ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => handleCategoryFilter(cat)}
              >
                {cat === 'all' ? 'All Stories' : cat}
              </button>
            ))}
          </div>

          {/* Articles Grid */}
          <div className="articles-grid">
            {filteredArticles.map((article, idx) => {
              const isFeatured = false;
              // Paywall logic: first 2 articles are free. Remaining articles are gated.
              const isPaywalled = !isSubscriber && article.order >= 2;

              return (
                <article
                  key={article.id}
                  className={`article-card ${isFeatured ? 'featured' : ''} ${isPaywalled ? 'paywalled' : ''}`}
                  onClick={() => {
                    if (isPaywalled) {
                      const subSection = document.getElementById('subscribe');
                      if (subSection) {
                        subSection.scrollIntoView({ behavior: 'smooth' });
                      }
                      showToast('This story is premium. Subscribe to read.', 'info');
                    } else {
                      openReader(article);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="card-img-wrapper">
                    <div
                      className="card-img"
                      style={{ backgroundImage: `url('${article.image}')` }}
                    ></div>
                    <span className="card-category">{article.category}</span>
                    
                    {isPaywalled && (
                      <div className="paywall-overlay">
                        <svg className="paywall-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        <h4 className="paywall-title">Premium Story</h4>
                        <p className="paywall-desc">Subscribe to unlock access to this and other premium issues.</p>
                        <button className="paywall-btn">Subscribe</button>
                      </div>
                    )}
                  </div>
                  <div className="card-info">
                    <span className="card-date">{article.date}</span>
                    <h3 className="card-title">{article.title}</h3>
                    <p className="card-excerpt">{getExcerpt(article.content)}</p>
                    <span className="card-read-more">
                      {isPaywalled ? '🔒 Unlock' : 'Read Story'}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>

          {filteredArticles.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--color-muted)', padding: '3rem 0' }}>
              No stories published in this category yet.
            </p>
          )}
        </div>
      </main>

      {/* Manifesto / About Section */}
      <section className="about-section" id="about">
        <div className="about-bg-lines">
          <div className="about-line"></div>
          <div className="about-line"></div>
        </div>
        <div className="section-container about-grid">
          <div className="about-text-content">
            <span className="subtitle-tag">OUR MANIFESTO</span>
            <h2 className="about-heading">We believe in print, digital depth, and high art.</h2>
            <p className="about-body">
              SLEEK is an independent editorial platform documenting the convergence of visual culture.
              We strip away the noise of transient trends to profile creators who build structures, silhouettes,
              and aesthetics destined to endure.
            </p>
            <div className="about-signature">
              <span className="sig-title">Editor-in-Chief</span>
              <span className="sig-name">Sasha K. Vang</span>
            </div>
          </div>
          <div className="about-visual">
            <div className="about-frame">
              <div
                className="about-image"
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=800&auto=format&fit=crop')" }}
              ></div>
              <div className="about-border"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Subscription Section */}
      <section className="subscribe-section" id="subscribe">
        <div className="subscribe-container">
          <div className="subscribe-box">
            <span className="subtitle-tag">JOIN THE CLUB</span>
            {isSubscriber ? (
              <>
                <h2>You have Full Access</h2>
                <p style={{ marginBottom: '1.5rem' }}>
                  Thank you for supporting SLEEK Magazine. Your digital and print subscription is active. Enjoy browsing our complete archive of stories.
                </p>
              </>
            ) : (
              <>
                <h2>Receive the Print &amp; Digital Editions</h2>
                <p>
                  Subscribe for ₦5,000 to receive quarterly physical issues of SLEEK directly to your door, along with full access to our digital premium archives and weekly digests.
                </p>

                <form className="subscribe-form" onSubmit={handleSubscribe}>
                  <div className="input-group">
                    <input
                      type="email"
                      placeholder="Your email address"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <button type="submit" className="sub-btn" disabled={isSubmitting}>
                      {isSubmitting ? '...' : 'JOIN'}
                    </button>
                  </div>
                  {formFeedback.message && (
                    <p className={`form-feedback ${formFeedback.type}`}>
                      {formFeedback.message}
                    </p>
                  )}
                </form>

                {/* Magic Link Section */}
                <div className="magic-link-section">
                  <button 
                    type="button" 
                    className="magic-link-toggle-btn"
                    onClick={() => setShowMagicLinkForm(!showMagicLinkForm)}
                  >
                    {showMagicLinkForm ? "Hide sign in form" : "Already subscribed? Sign in on a new device"}
                  </button>
                  
                  {showMagicLinkForm && (
                    <div className="magic-link-box">
                      <p>Enter your subscribed email to receive an instant access link. No password required.</p>
                      <form onSubmit={handleRequestMagicLink} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <input
                          type="email"
                          placeholder="Your subscribed email"
                          required
                          value={magicLinkEmail}
                          onChange={(e) => setMagicLinkEmail(e.target.value)}
                          style={{
                            flex: 1,
                            background: 'transparent',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-white)',
                            padding: '0.6rem 1rem',
                            fontSize: '0.85rem'
                          }}
                        />
                        <button 
                          type="submit" 
                          className="sub-btn" 
                          disabled={isSubmittingMagicLink}
                          style={{ padding: '0 1.25rem', width: 'auto' }}
                        >
                          {isSubmittingMagicLink ? '...' : 'SEND LINK'}
                        </button>
                      </form>
                      {magicLinkFeedback.message && (
                        <p className={`form-feedback ${magicLinkFeedback.type}`} style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                          {magicLinkFeedback.message}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="main-footer">
        <div className="section-container footer-grid">
          <div className="footer-brand">
            <span className="footer-logo">SLEEK</span>
            <p className="footer-tag">A New Wave of Editorial Design.</p>
          </div>
          <div className="footer-links-grid">
            <div className="footer-col">
              <h4>Explore</h4>
              <ul>
                <li><a href="#editorial">Editorial</a></li>
                <li><a href="#about">Features</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Connect</h4>
              <ul>
                <li><a href="https://www.instagram.com" target="_blank" rel="noreferrer">Instagram</a></li>
                <li><a href="https://www.twitter.com" target="_blank" rel="noreferrer">Twitter</a></li>
                <li><a href="https://www.pinterest.com" target="_blank" rel="noreferrer">Pinterest</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <ul>
                <li><a href="#">Privacy Policy</a></li>
                <li><a href="#">Terms of Use</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} SLEEK Magazine. All Rights Reserved. Crafted with pure design aesthetics.</p>
        </div>
      </footer>

      {/* Immersive Reader Modal */}
      <div
        className={`reader-modal ${isReaderActive ? 'active' : ''}`}
        id="reader-modal"
        ref={readerModalRef}
        onScroll={handleReaderScroll}
      >
        <div className="reader-progress-bar" style={{ width: `${readProgress}%` }}></div>
        <button className="reader-close-btn" onClick={closeReader} aria-label="Close Reader">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div className="reader-content-wrapper">
          {selectedArticle && (() => {
            const isReaderPaywalled = !isSubscriber && selectedArticle.order >= 2;

            return (
              <article className="reader-article">
                <div className="reader-meta">
                  <span className="reader-category">{selectedArticle.category}</span>
                  <h1 className="reader-title">{selectedArticle.title}</h1>
                  <div className="reader-author-date">
                    {selectedArticle.author} &bull; {selectedArticle.date}
                  </div>
                </div>
                <div
                  className="reader-cover-img"
                  style={{ backgroundImage: `url('${selectedArticle.image}')` }}
                ></div>

                {isReaderPaywalled ? (
                  <div className="reader-paywall-container">
                    <div
                      className="reader-body"
                      style={{ filter: 'blur(5px)', opacity: 0.35, pointerEvents: 'none', userSelect: 'none' }}
                      dangerouslySetInnerHTML={{ 
                        __html: selectedArticle.content.substring(0, Math.min(250, selectedArticle.content.length)) + '...'
                      }}
                    ></div>
                    <div className="reader-paywall-overlay">
                      <div className="reader-paywall-box">
                        <svg className="paywall-lock-icon" style={{ width: '40px', height: '40px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        <h3>Subscribe to keep reading</h3>
                        <p>This premium story requires an active digital subscription. Unlock all issues and our premium digital archive today.</p>
                        <button 
                          className="paywall-btn" 
                          onClick={() => {
                            closeReader();
                            const subSection = document.getElementById('subscribe');
                            if (subSection) {
                              subSection.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                        >
                          Unlock Now — ₦5,000
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="reader-body"
                    dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
                  ></div>
                )}
                
                {/* Comments Section - Only show for non-paywalled articles */}
                {(!(!isSubscriber && selectedArticle.order >= 2)) && (
                  <Comments articleId={selectedArticle.id} />
                )}
              </article>
            );
          })()}
        </div>
      </div>

      {/* Floating Notifications */}
      {toast.message && (
        <div className={`notification-banner ${toast.type}`}>
          <span>{toast.message}</span>
          <button className="notification-close" onClick={() => setToast({ message: '', type: '' })}>×</button>
        </div>
      )}
    </>
  );
}
