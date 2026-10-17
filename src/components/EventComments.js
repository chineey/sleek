'use client';

import { useState, useEffect } from 'react';
import DisplayNameModal from './DisplayNameModal';

export default function EventComments({ eventId }) {
  const [comments, setComments] = useState([]);
  const [displayName, setDisplayName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingComment, setPendingComment] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/events/${eventId}/comments`);
        if (res.ok) {
          const data = await res.json();
          setComments(data.comments || []);
        }

        const statusRes = await fetch('/api/subscriber/status');
        if (statusRes.ok) {
          const data = await statusRes.json();
          setIsSubscriber(data.isSubscriber);

          if (data.isSubscriber) {
            const dnRes = await fetch('/api/display-name');
            if (dnRes.ok) {
              const dnData = await dnRes.json();
              setDisplayName(dnData.displayName || null);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load event comments:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId]);

  const handleCommentClick = () => {
    if (!displayName) {
      setPendingComment({ text: commentText, parentCommentId: null });
      setShowModal(true);
    } else {
      submitComment();
    }
  };

  const handleReplyClick = (parentCommentId) => {
    if (!displayName) {
      setPendingComment({ text: replyText, parentCommentId });
      setShowModal(true);
    } else {
      submitComment(replyText, parentCommentId);
    }
  };

  const handleDisplayNameSet = async (name) => {
    setDisplayName(name);
    if (pendingComment?.text) {
      await submitComment(pendingComment.text, pendingComment.parentCommentId);
      setPendingComment(null);
    }
  };

  const submitComment = async (text = commentText, parentCommentId = null) => {
    if (!text.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${eventId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: text.trim(),
          parentCommentId: parentCommentId || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Failed to post comment.');
        setSubmitting(false);
        return;
      }

      const newComment = await res.json();

      if (parentCommentId) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentCommentId
              ? { ...c, replies: [...(c.replies || []), newComment] }
              : c
          )
        );
        setReplyText('');
        setReplyingTo(null);
      } else {
        setComments((prev) => [newComment, ...prev]);
        setCommentText('');
      }
    } catch (err) {
      console.error('Error posting comment:', err);
      alert('Failed to post comment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ marginTop: '2.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '2rem' }}>
      <h3 style={{
        fontFamily: 'var(--font-serif)',
        fontSize: '1.4rem',
        margin: '0 0 1.25rem 0',
        color: 'var(--color-white)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        Event Discussion ({comments.length})
      </h3>

      {!isSubscriber ? (
        <div style={{
          padding: '1.5rem',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px dashed var(--color-border)',
          borderRadius: '6px',
          textAlign: 'center',
          color: 'var(--color-muted)',
          fontSize: '0.9rem',
          marginBottom: '2rem'
        }}>
          <p style={{ margin: '0 0 0.75rem 0' }}>Join the conversation with other attendees and creators.</p>
          <a
            href="/#subscribe"
            style={{
              display: 'inline-block',
              color: 'var(--color-bronze)',
              fontSize: '0.8rem',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              textDecoration: 'underline'
            }}
          >
            Sign in or Subscribe (₦1,500 / month) to Post Comments →
          </a>
        </div>
      ) : (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '1.25rem',
          marginBottom: '2rem'
        }}>
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Share your thoughts, ask questions, or hype up the party..."
            disabled={submitting}
            rows={3}
            style={{
              width: '100%',
              backgroundColor: 'var(--color-black)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              color: 'var(--color-white)',
              padding: '0.75rem 1rem',
              fontSize: '0.9rem',
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
              {displayName ? `Posting as ${displayName}` : 'Display name will be set upon posting'}
            </span>
            <button
              type="button"
              onClick={handleCommentClick}
              disabled={!commentText.trim() || submitting}
              style={{
                backgroundColor: 'var(--color-bronze)',
                color: 'var(--color-black)',
                border: 'none',
                padding: '0.5rem 1.25rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                borderRadius: '4px',
                cursor: commentText.trim() && !submitting ? 'pointer' : 'not-allowed',
                opacity: commentText.trim() && !submitting ? 1 : 0.6
              }}
            >
              {submitting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>Loading comments...</p>
      ) : comments.length === 0 ? (
        <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
          No comments yet. Be the first to start the discussion!
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {comments.map((comment) => (
            <div
              key={comment.id}
              style={{
                backgroundColor: 'var(--color-black-card)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '1rem 1.25rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-bronze)' }}>
                  {comment.displayName}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                  {new Date(comment.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p style={{ margin: '0 0 0.75rem 0', color: '#e5e5e5', fontSize: '0.9rem', lineHeight: 1.5 }}>
                {comment.content}
              </p>

              {isSubscriber && (
                <button
                  type="button"
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-bronze)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline'
                  }}
                >
                  {replyingTo === comment.id ? 'Cancel Reply' : 'Reply'}
                </button>
              )}

              {/* Reply Form */}
              {replyingTo === comment.id && (
                <div style={{ marginTop: '0.75rem', paddingLeft: '1rem', borderLeft: '2px solid var(--color-bronze)' }}>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Reply to ${comment.displayName}...`}
                    disabled={submitting}
                    rows={2}
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--color-black)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '4px',
                      color: 'var(--color-white)',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.85rem',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => handleReplyClick(comment.id)}
                      disabled={!replyText.trim() || submitting}
                      style={{
                        backgroundColor: 'var(--color-bronze)',
                        color: 'var(--color-black)',
                        border: 'none',
                        padding: '0.4rem 1rem',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      Send
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-muted)',
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.7rem',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Replies list */}
              {comment.replies && comment.replies.length > 0 && (
                <div style={{ marginTop: '1rem', paddingLeft: '1.25rem', borderLeft: '1px solid rgba(186, 156, 135, 0.3)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {comment.replies.map((reply) => (
                    <div key={reply.id} style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '0.75rem', borderRadius: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-bronze)' }}>
                          {reply.displayName}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>
                          {new Date(reply.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#ddd', lineHeight: 1.4 }}>
                        {reply.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <DisplayNameModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleDisplayNameSet}
      />
    </div>
  );
}
