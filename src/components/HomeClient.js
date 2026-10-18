'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Comments from './Comments';

export default function HomeClient({ initialCover, initialIsSubscriber, initialArticles = [] }) {
  const router = useRouter();

  const normalizeCategory = (cat) => cat?.toLowerCase().replace(/\s+/g, '') || '';

  const getInitialFiltered = (arts) => {
    if (!arts || arts.length === 0) return [];
    const fashion = arts.filter(a => normalizeCategory(a.category) === 'fashion');
    return fashion.length > 0 ? fashion : arts;
  };

  const [articles, setArticles] = useState(initialArticles);
  const [filteredArticles, setFilteredArticles] = useState(() => getInitialFiltered(initialArticles));
  const [events, setEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [activeCategory, setActiveCategory] = useState('fashion');
  const [isHeroLoaded, setIsHeroLoaded] = useState(false);

  // Initialise from server-rendered props — no flash on first paint
  const [cover, setCover] = useState(initialCover);
  const [isSubscriber, setIsSubscriber] = useState(initialIsSubscriber);

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

  // Listen for subscriber changes (e.g. after payment redirect)
  useEffect(() => {
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

  // Fetch events from Event API
  const fetchEvents = async () => {
    setIsLoadingEvents(true);
    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  // Fetch articles from Database API (sync in background if not already pre-loaded)
  useEffect(() => {
    async function fetchArticles() {
      try {
        const res = await fetch('/api/articles');
        if (res.ok) {
          const data = await res.json();
          setArticles(data);
          if (activeCategory === 'fashion') {
            const fashionArticles = data.filter(a => normalizeCategory(a.category) === 'fashion');
            setFilteredArticles(fashionArticles.length > 0 ? fashionArticles : data);
          }
        }
      } catch (err) {
        console.error('Failed to load articles:', err);
      }
    }

    if (!initialArticles || initialArticles.length === 0) {
      fetchArticles();
    }
    fetchEvents();
  }, []);

  // Trigger hero animation entry
  useEffect(() => {
    const timer = setTimeout(() => setIsHeroLoaded(true), 150);
    return () => clearTimeout(timer);
  }, []);

  // Filter articles based on Category
  const handleCategoryFilter = (catId) => {
    setActiveCategory(catId);
    const norm = normalizeCategory(catId);
    if (norm === 'event' || norm === 'events') {
      if (events.length === 0) {
        fetchEvents();
      }
    } else {
      setFilteredArticles(articles.filter(a => normalizeCategory(a.category) === norm));
    }
  };

  // Excerpt generation helper (strips HTML and truncates)
  const getExcerpt = (htmlContent) => {
    if (!htmlContent) return '';
    const text = htmlContent.replace(/<\/?[^>]+(>|$)/g, ''); // Strip HTML tags
    return text.length > 150 ? text.substring(0, 150) + '...' : text;
  };

  // Reader Modal Operations with Shareable URL Sync
  const openReader = (article, updateUrl = true) => {
    setSelectedArticle(article);
    setIsReaderActive(true);
    document.body.style.overflow = 'hidden'; // Lock background scroll
    setReadProgress(0);
    if (readerModalRef.current) {
      readerModalRef.current.scrollTop = 0;
    }
    if (updateUrl && typeof window !== 'undefined' && article?.id) {
      window.history.pushState({ articleId: article.id }, '', `/article/${article.id}`);
    }
  };

  const closeReader = (restoreUrl = true) => {
    setIsReaderActive(false);
    document.body.style.overflow = ''; // Restore background scroll
    setSelectedArticle(null);
    if (restoreUrl && typeof window !== 'undefined' && window.location.pathname.startsWith('/article/')) {
      window.history.replaceState({}, '', '/');
    }
  };

  // Close reader on Escape keypress or browser Back/Forward
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isReaderActive) {
        closeReader();
      }
    };
    const handlePopState = () => {
      if (isReaderActive) {
        closeReader(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isReaderActive]);

  // Open article automatically if ?article=<id> or ?story=<id> is in URL
  useEffect(() => {
    if (typeof window === 'undefined' || articles.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const targetArticleId = params.get('article') || params.get('story');
    if (targetArticleId) {
      const found = articles.find((a) => String(a.id) === String(targetArticleId));
      if (found) {
        openReader(found, false);
      }
    }
  }, [articles]);

  // Share Article or Comic Handler
  const handleShareArticle = async (article) => {
    if (!article || typeof window === 'undefined') return;
    const catNorm = normalizeCategory(article.category);
    const isComics = catNorm === 'comics' || catNorm === 'comic';
    const shareUrl = isComics
      ? `${window.location.origin}/comics?id=${article.id}`
      : `${window.location.origin}/article/${article.id}`;
    const cleanExcerpt = getExcerpt(article.content);

    const shareData = {
      title: `${article.title} | SLEEK Magazine`,
      text: cleanExcerpt,
      url: shareUrl,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share error:', err);
        }
      }
    }

    // Fallback: Copy to clipboard
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement('input');
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      showToast(isComics ? 'Comic link copied to clipboard!' : 'Article link copied to clipboard!', 'success');
    } catch {
      showToast('Could not copy link.', 'error');
    }
  };

  // Share Event Handler
  const handleShareEvent = async (event) => {
    if (!event || typeof window === 'undefined') return;
    const shareUrl = `${window.location.origin}/events?id=${event.id}`;
    const cleanDesc = getExcerpt(event.description);

    const shareData = {
      title: `${event.title} | SLEEK Events`,
      text: cleanDesc,
      url: shareUrl,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share error:', err);
        }
      }
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement('input');
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      showToast('Event link copied to clipboard!', 'success');
    } catch {
      showToast('Could not copy link.', 'error');
    }
  };

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

  // Scroll to comments inside reader modal
  const scrollToComments = () => {
    const commentsEl = document.getElementById('article-comments-section');
    if (commentsEl) {
      commentsEl.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => {
        const textarea = commentsEl.querySelector('textarea');
        if (textarea && !textarea.disabled) {
          textarea.focus();
        }
      }, 500);
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
        if (data.error === 'already_active_subscriber') {
          setFormFeedback({
            message: 'You are already subscribed to SLEEK Magazine. Please sign in.',
            type: 'info'
          });
          setShowMagicLinkForm(true);
          setMagicLinkEmail(email);
          setIsSubmitting(false);
          return;
        }

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

          {/* Categories Filter - Arrangement: fashion (first), sports, sleekpeak, culture, editorial, business news, comics, event */}
          <div className="filter-container">
            {[
              { id: 'fashion', label: 'fashion' },
              { id: 'sports', label: 'sports' },
              { id: 'sleekpeak', label: 'sleekpeak' },
              { id: 'culture', label: 'culture' },
              { id: 'editorial', label: 'editorial' },
              { id: 'business news', label: 'business news' },
              { id: 'comics', label: 'comics' },
              { id: 'event', label: 'event' },
            ].map((cat) => (
              <button
                key={cat.id}
                className={`filter-btn ${normalizeCategory(activeCategory) === normalizeCategory(cat.id) ? 'active' : ''}`}
                onClick={() => handleCategoryFilter(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Grid: Events Grid or Articles Grid */}
          {normalizeCategory(activeCategory) === 'event' || normalizeCategory(activeCategory) === 'events' ? (
            <div className="articles-grid">
              {events.map((event) => {
                const eventFormattedDate = new Date(event.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });

                return (
                  <article
                    key={event.id}
                    className="article-card"
                    onClick={() => router.push(`/events?id=${event.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="card-img-wrapper">
                      {event.image && (
                        <img
                          src={event.image}
                          alt={event.title || 'Sleek Event'}
                          loading="lazy"
                          decoding="async"
                          className="card-img"
                        />
                      )}
                      <span className="card-category">EVENT</span>
                    </div>
                    <div className="card-info">
                      <span className="card-date">
                        {eventFormattedDate} &bull; {event.location}
                      </span>
                      <h3 className="card-title">{event.title}</h3>
                      <p className="card-excerpt">{getExcerpt(event.description)}</p>
                      <div className="card-footer-row" style={{ marginTop: 'auto', paddingTop: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <Link
                            href={`/events?id=${event.id}`}
                            className="card-read-more"
                            onClick={(e) => e.stopPropagation()}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                          >
                            More Info &rarr;
                          </Link>
                          {event.averageRating && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-bronze)' }}>
                              ★ {event.averageRating} ({event.ratingsCount})
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          className="card-share-btn"
                          title="Share event"
                          aria-label="Share event"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShareEvent(event);
                          }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                            <circle cx="18" cy="5" r="3"></circle>
                            <circle cx="6" cy="12" r="3"></circle>
                            <circle cx="18" cy="19" r="3"></circle>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
              {events.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--color-muted)', padding: '3rem 0', gridColumn: '1 / -1' }}>
                  {isLoadingEvents ? 'Loading events...' : 'No upcoming events published yet.'}
                </p>
              )}
            </div>
          ) : (
            <div className="articles-grid">
              {filteredArticles.map((article) => {
                const isFeatured = false;
                const catNorm = normalizeCategory(article.category);
                const isSleekPeak = catNorm === 'sleekpeak';
                const isComics = catNorm === 'comics' || catNorm === 'comic';
                const isBusinessNews = catNorm === 'businessnews' || catNorm === 'business' || catNorm.includes('business');
                // Comics category is unblurred for non-subscribers
                const isCardBlurred = false;

                return (
                  <article
                    key={article.id}
                    className={`article-card ${isFeatured ? 'featured' : ''}`}
                    onClick={() => {
                      if (isComics) {
                        router.push(`/comics?id=${article.id}`);
                      } else {
                        openReader(article);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="card-img-wrapper">
                      {article.image && (
                        <img
                          src={article.image}
                          alt={article.title || 'Sleek Magazine Editorial'}
                          loading="lazy"
                          decoding="async"
                          className="card-img"
                        />
                      )}
                      <span className="card-category">{article.category}</span>
                    </div>
                    <div className="card-info">
                      <span className="card-date">{article.date}</span>
                      <h3 className="card-title">{article.title}</h3>
                      <p className="card-excerpt">{getExcerpt(article.content)}</p>
                      <div className="card-footer-row">
                        <span className="card-read-more">
                          {isComics
                            ? 'Read Comic Chapter →'
                            : isBusinessNews
                            ? 'More Info'
                            : 'Read Story'}
                        </span>
                        <button
                          type="button"
                          className="card-share-btn"
                          title={isComics ? 'Share comic' : 'Share story'}
                          aria-label={isComics ? 'Share comic' : 'Share story'}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShareArticle(article);
                          }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                            <circle cx="18" cy="5" r="3"></circle>
                            <circle cx="6" cy="12" r="3"></circle>
                            <circle cx="18" cy="19" r="3"></circle>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
              {filteredArticles.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--color-muted)', padding: '3rem 0', gridColumn: '1 / -1' }}>
                  No stories published in this category yet.
                </p>
              )}
            </div>
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
              <span className="sig-name">Kennanyere Njoku</span>
            </div>
          </div>
          <div className="about-visual">
            <div className="about-frame">
              <div
                className="about-image"
                style={{
                  backgroundImage: `url('${cover?.editorialImage || "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=800&auto=format&fit=crop"}')`
                }}
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
                  Subscribe for ₦1,500 monthly (₦1,500 every month) to receive full access to our digital premium archives, complete issues, and exclusive events.{' '}
                  <Link
                    href="/shop"
                    style={{
                      color: 'var(--color-bronze, #ba9c87)',
                      textDecoration: 'underline',
                      textUnderlineOffset: '3px',
                      fontWeight: '500',
                      cursor: 'pointer',
                    }}
                  >
                    Click here to shop sleek physical issues and pick up from a store around you with your sleek pass
                  </Link>
                </p>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.4rem 0.85rem',
                  backgroundColor: 'rgba(186, 156, 135, 0.1)',
                  border: '1px solid rgba(186, 156, 135, 0.25)',
                  borderRadius: '4px',
                  marginBottom: '1.25rem',
                  fontSize: '0.8rem',
                  color: 'var(--color-bronze)',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                }}>
                  <span>✓</span> Monthly plan: ₦1,500 / month (full recurring access)
                </div>

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

                {/* Sign In & Magic Link Section */}
                <div className="magic-link-section">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', alignItems: 'center' }}>
                    <Link
                      href="/subscriber/login"
                      className="magic-link-toggle-btn"
                      style={{ textDecoration: 'none', display: 'inline-block' }}
                    >
                      Already subscribed? Sign in with password &rarr;
                    </Link>
                    <button
                      type="button"
                      className="magic-link-toggle-btn"
                      onClick={() => setShowMagicLinkForm(!showMagicLinkForm)}
                      style={{ fontSize: '0.75rem', opacity: 0.8 }}
                    >
                      {showMagicLinkForm ? 'Hide magic link' : 'Or sign in with Magic Link'}
                    </button>
                  </div>

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
              <h4>Connect</h4>
              <ul className="footer-connect-list">
                <li><a href="https://www.instagram.com/_sleekpeak/" target="_blank" rel="noreferrer">Instagram</a></li>
                <li><a href="https://pin.it/SGCcxGASs" target="_blank" rel="noreferrer">Pinterest</a></li>
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
            const normCat = normalizeCategory(selectedArticle.category);
            const isFreeCategory = ['fashion', 'culture', 'businessnews', 'sports', 'events', 'event', 'sleekpeak'].includes(normCat);
            const isReaderPaywalled = !isSubscriber && !isFreeCategory;

            return (
              <article className="reader-article">
                <div className="reader-meta">
                  <span className="reader-category">{selectedArticle.category}</span>
                  <h1 className="reader-title">{selectedArticle.title}</h1>
                  <div className="reader-author-date">
                    {selectedArticle.author} &bull; {selectedArticle.date}
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className="reader-share-btn"
                      onClick={() => handleShareArticle(selectedArticle)}
                      aria-label="Share this story"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                        <circle cx="18" cy="5" r="3"></circle>
                        <circle cx="6" cy="12" r="3"></circle>
                        <circle cx="18" cy="19" r="3"></circle>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                      </svg>
                      Share Story
                    </button>
                    <button
                      type="button"
                      className="reader-join-conversation-btn"
                      onClick={scrollToComments}
                      aria-label="Join the conversation and leave a comment"
                      style={{ margin: 0 }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                      </svg>
                      Join the conversation &darr;
                    </button>
                  </div>
                </div>
                {selectedArticle.image && (
                  <div className="reader-cover-img-wrapper">
                    <img
                      src={selectedArticle.image}
                      alt={selectedArticle.title || 'Sleek Magazine Editorial'}
                      className="reader-cover-img"
                    />
                  </div>
                )}

                {isReaderPaywalled ? (
                  <div className="reader-paywall-container">
                    <div
                      className="reader-body"
                      style={{ opacity: 0.6, userSelect: 'none' }}
                      dangerouslySetInnerHTML={{
                        __html: selectedArticle.content || '<p>Exclusive editorial piece preview...</p>'
                      }}
                    ></div>
                    <div className="reader-paywall-overlay">
                      <div className="reader-paywall-box">
                        <svg className="paywall-lock-icon" style={{ width: '40px', height: '40px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        <h3>Subscribe to Read Full Story</h3>
                        <p>This story requires an active digital subscription. Subscribe for ₦1,500 monthly to unlock full issues, articles, and our complete archives.</p>
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
                          Unlock Now — ₦1,500 / month
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

                {/* Comments Section - Accessible to all readers */}
                <div id="article-comments-section" style={{ marginTop: '4rem', paddingTop: '2.5rem', borderTop: '1px solid var(--color-border)' }}>
                  <Comments articleId={selectedArticle.id} initialIsSubscriber={isSubscriber} />
                </div>
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
