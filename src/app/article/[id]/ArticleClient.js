'use client';

import { useState } from 'react';
import Link from 'next/link';
import Comments from '../../../components/Comments';

export default function ArticleClient({ article, isSubscriber }) {
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 3000);
  };

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : `/article/${article.id}`;
    const cleanText = article.content
      ? article.content.replace(/<\/?[^>]+(>|$)/g, '').substring(0, 150) + '...'
      : '';

    const shareData = {
      title: `${article.title} | SLEEK Magazine`,
      text: cleanText,
      url: shareUrl,
    };

    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share error:', err);
        }
      }
    }

    // Fallback: copy to clipboard
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement('input');
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      showToast('Article link copied to clipboard!', 'success');
    } catch {
      showToast('Could not copy link.', 'error');
    }
  };

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

  return (
    <>
      <main className="standalone-article-page" style={{ minHeight: '100vh', backgroundColor: '#080808', paddingTop: '6rem', paddingBottom: '6rem' }}>
        <div className="reader-content-wrapper" style={{ padding: '2rem 1.5rem', maxWidth: '850px', margin: '0 auto' }}>
          
          {/* Back link */}
          <div style={{ marginBottom: '2.5rem' }}>
            <Link
              href="/#editorial"
              className="article-back-link"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--color-bronze)',
                textDecoration: 'none',
                transition: 'var(--transition-fast)'
              }}
            >
              &larr; Browse All Stories
            </Link>
          </div>

          <article className="reader-article">
            <div className="reader-meta">
              <span className="reader-category">{article.category}</span>
              <h1 className="reader-title">{article.title}</h1>
              <div className="reader-author-date">
                {article.author} &bull; {article.date}
              </div>

              {/* Action Buttons: Share & Join Conversation */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="reader-share-btn"
                  onClick={handleShare}
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
                  Comments &darr;
                </button>
              </div>
            </div>

            {article.image && (
              <div className="reader-cover-img-wrapper">
                <img
                  src={article.image}
                  alt={article.title || 'Sleek Magazine Editorial'}
                  className="reader-cover-img"
                />
              </div>
            )}

            {article.isPaywalled ? (
              <div className="reader-paywall-container">
                <div
                  className="reader-body"
                  style={{ opacity: 0.6, userSelect: 'none' }}
                  dangerouslySetInnerHTML={{
                    __html: article.content || '<p>Exclusive editorial piece preview...</p>',
                  }}
                ></div>
                <div className="reader-paywall-overlay">
                  <div className="reader-paywall-box">
                    <svg className="paywall-lock-icon" style={{ width: '40px', height: '40px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <h3>Subscribe to Read Full Story</h3>
                    <p>
                      This story is part of Sleek Magazine exclusive archive. Unlock full editorial access today.
                    </p>
                    <Link
                      href="/#subscribe"
                      className="paywall-btn"
                      style={{ textDecoration: 'none', display: 'inline-block' }}
                    >
                      Subscribe for Full Access
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="reader-body"
                dangerouslySetInnerHTML={{
                  __html: article.content || '',
                }}
              ></div>
            )}

            {/* Bottom Share Bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '2rem 0',
              borderTop: '1px solid var(--color-border)',
              borderBottom: '1px solid var(--color-border)',
              marginTop: '3rem'
            }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Enjoyed this editorial?
              </span>
              <button
                type="button"
                className="reader-share-btn"
                onClick={handleShare}
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
            </div>

            {/* Comments Section */}
            <div id="article-comments-section" style={{ marginTop: '2rem' }}>
              <Comments articleId={article.id} initialIsSubscriber={isSubscriber} />
            </div>
          </article>
        </div>
      </main>

      {/* Toast Notification */}
      <div className={`toast-notification ${toast.show ? 'show' : ''} ${toast.type}`}>
        <span>{toast.message}</span>
      </div>
    </>
  );
}
