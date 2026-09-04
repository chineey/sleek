'use client';

import { useState, useEffect } from 'react';
import DisplayNameModal from './DisplayNameModal';
import styles from './Comments.module.css';

export default function Comments({ articleId }) {
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

  // Load comments and current user's display name
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch comments
        const commentsRes = await fetch(`/api/comments/${articleId}`);
        if (commentsRes.ok) {
          const data = await commentsRes.json();
          setComments(data.comments || []);
        }

        // Check subscriber status
        const statusRes = await fetch('/api/subscriber/status');
        if (statusRes.ok) {
          const data = await statusRes.json();
          setIsSubscriber(data.isSubscriber);

          // Fetch display name if subscriber
          if (data.isSubscriber) {
            const displayNameRes = await fetch('/api/display-name');
            if (displayNameRes.ok) {
              const displayData = await displayNameRes.json();
              setDisplayName(displayData.displayName || null);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [articleId]);

  const handleCommentClick = () => {
    if (!displayName) {
      setPendingComment({ text: commentText, parentCommentId: null });
      setShowModal(true);
    } else {
      submitComment();
    }
  };

  const handleReplyClick = (parentCommentId, parentDisplayName) => {
    if (!displayName) {
      setPendingComment({ text: replyText, parentCommentId });
      setShowModal(true);
    } else {
      submitComment(replyText, parentCommentId);
    }
  };

  const handleDisplayNameSet = async (name) => {
    setDisplayName(name);
    // Submit the pending comment if there was one
    if (pendingComment?.text) {
      await submitComment(pendingComment.text, pendingComment.parentCommentId);
      setPendingComment(null);
    }
  };

  const submitComment = async (text = commentText, parentCommentId = null) => {
    if (!text.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/comments/${articleId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          articleId: parseInt(articleId), 
          content: text,
          parentCommentId: parentCommentId || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Failed to post comment');
        setSubmitting(false);
        return;
      }

      const newComment = await res.json();

      // If replying to a comment, add to that comment's replies
      if (parentCommentId) {
        setComments(comments.map(comment => {
          if (comment.id === parentCommentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), newComment],
            };
          }
          return comment;
        }));
        setReplyText('');
        setReplyingTo(null);
      } else {
        // Otherwise add as top-level comment
        setComments([newComment, ...comments]);
        setCommentText('');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      alert('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>Comments</h3>
        <p className={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  if (!isSubscriber) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>Comments</h3>
        <p className={styles.loginPrompt}>Sign in to read and post comments</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Comments ({comments.length}){replyingTo && ' - Replying'}</h3>

      {/* Comment Form */}
      <div className={styles.formSection}>
        <div className={styles.form}>
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Share your thoughts..."
            className={styles.textarea}
            disabled={submitting}
            rows="3"
          />
          <div className={styles.formActions}>
            <button
              onClick={() => handleCommentClick()}
              disabled={!commentText.trim() || submitting || loading}
              className={styles.submitBtn}
            >
              {submitting ? 'Posting...' : 'Post Comment'}
            </button>
            {!displayName && (
              <p className={styles.hint}>
                You'll set a display name when you post your first comment
              </p>
            )}
            {displayName && (
              <p className={styles.displayNameInfo}>
                Posting as: <strong>{displayName}</strong>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div className={styles.commentsList}>
        {loading ? (
          <p className={styles.loadingText}>Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className={styles.noComments}>No comments yet. Be the first to comment!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className={styles.commentThread}>
              {/* Parent Comment */}
              <div className={styles.comment}>
                <div className={styles.commentHeader}>
                  <span className={styles.displayName}>{comment.displayName}</span>
                  <span className={styles.timestamp}>
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className={styles.commentContent}>{comment.content}</p>
                <button
                  className={styles.replyBtn}
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                >
                  Reply
                </button>
              </div>

              {/* Reply Form */}
              {replyingTo === comment.id && (
                <div className={styles.replyForm}>
                  <div className={styles.replyLabel}>Replying to {comment.displayName}</div>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply..."
                    className={styles.replyTextarea}
                    disabled={submitting}
                    rows="2"
                  />
                  <div className={styles.replyActions}>
                    <button
                      onClick={() => handleReplyClick(comment.id)}
                      disabled={!replyText.trim() || submitting}
                      className={styles.submitBtn}
                    >
                      {submitting ? 'Posting...' : 'Send Reply'}
                    </button>
                    <button
                      onClick={() => setReplyingTo(null)}
                      disabled={submitting}
                      className={styles.cancelBtn}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className={styles.repliesContainer}>
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className={styles.reply}>
                      <div className={styles.replyHeader}>
                        <span className={styles.displayName}>{reply.displayName}</span>
                        <span className={styles.timestamp}>
                          {new Date(reply.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className={styles.replyContent}>{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Display Name Modal */}
      <DisplayNameModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleDisplayNameSet}
      />
    </div>
  );
}
