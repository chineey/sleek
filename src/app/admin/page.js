'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Admin() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Articles list & selection
  const [articlesList, setArticlesList] = useState([]);
  const [selectedArticleId, setSelectedArticleId] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Fashion');
  const [author, setAuthor] = useState('');
  const [date, setDate] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // UI state
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  // Cropping states
  const [cropImageSrc, setCropImageSrc] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [zoom, setZoom] = useState(1.0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Route protection
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Fetch articles list on mount & login success
  useEffect(() => {
    if (status === 'authenticated') {
      fetchArticles();
    }
  }, [status]);

  const fetchArticles = async () => {
    try {
      const res = await fetch('/api/articles');
      if (res.ok) {
        const data = await res.json();
        // Sort items locally by their order field ascending
        const sorted = data.sort((a, b) => a.order - b.order);
        setArticlesList(sorted);
      }
    } catch (err) {
      console.error('Failed to fetch articles:', err);
    }
  };

  if (status === 'loading') {
    return (
      <div className="login-wrapper">
        <p style={{ color: 'var(--color-bronze)', fontSize: '1.2rem', letterSpacing: '0.15em' }}>
          LOADING PANEL...
        </p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Handle article selection dropdown change
  const handleSelectArticle = (e) => {
    const val = e.target.value;
    setSelectedArticleId(val);
    setFeedback({ message: '', type: '' });

    if (val === 'new') {
      // Clear fields and set defaults for creating a new article
      setTitle('');
      setCategory('Fashion');
      setAuthor('Written by Sasha K. Vang');
      setDate(
        `Published ${new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}`
      );
      setContent('');
      setImageUrl('');
      return;
    }

    if (!val || val === '') {
      // Clear fields and lock form if selection is cleared
      setTitle('');
      setCategory('Fashion');
      setAuthor('');
      setDate('');
      setContent('');
      setImageUrl('');
      return;
    }

    // Editing mode: Populate inputs with selected article values
    const selected = articlesList.find((a) => a.id === parseInt(val));
    if (selected) {
      setTitle(selected.title);
      setCategory(selected.category);
      setAuthor(selected.author);
      setDate(selected.date);
      setContent(deformatContent(selected.content));
      setImageUrl(selected.image);
    }
  };

  // Handle image upload select (triggers client-side crop modal first)
  const handleImageUploadSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedArticleId) return;

    setPendingFile(file);

    const objectUrl = URL.createObjectURL(file);
    setCropImageSrc(objectUrl);

    setZoom(1.0);
    setOffset({ x: 0, y: 0 });
  };

  // Drag-and-pan mouse event handlers for crop preview
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Drag-and-pan touch handlers for mobile/tablet cropping
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setOffset({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  // Perform canvas cropping and upload cropped Blob to Cloudinary
  const handleConfirmCrop = async () => {
    if (!pendingFile || !cropImageSrc) return;

    setIsUploading(true);
    setFeedback({ message: '', type: '' });

    const img = document.getElementById('crop-target-img');
    if (!img) return;

    // The viewport is responsive (max 400x300, aspect-ratio 4:3).
    // The canvas output is always 1200x900.
    // The CSS transform on the image is: translate(ox, oy) scale(zoom)
    // with transform-origin: center center.
    //
    // Strategy: read the actual viewport size, compute the scale factor
    // to map viewport → canvas, then replicate the exact CSS rendering.
    const viewport = document.querySelector('.crop-viewport');
    const vpW = viewport ? viewport.clientWidth : 400;
    const vpH = viewport ? viewport.clientHeight : 300;

    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    // How the browser fits the image into the viewport via max-width/max-height
    const fitRatio = Math.min(vpW / nw, vpH / nh);
    const displayW = nw * fitRatio;
    const displayH = nh * fitRatio;

    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 900;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 1200, 900);

    // Scale factor from viewport to canvas
    const scaleX = 1200 / vpW;
    const scaleY = 900 / vpH;

    ctx.save();
    // Scale viewport coordinates → canvas coordinates
    ctx.scale(scaleX, scaleY);
    // Move origin to viewport center
    ctx.translate(vpW / 2, vpH / 2);
    // CSS translate(ox, oy) — applied in screen space after scale
    ctx.translate(offset.x, offset.y);
    // CSS scale(zoom) — applied around transform-origin (element center)
    ctx.scale(zoom, zoom);
    // Draw image centered at origin (matching the CSS centering via margin:auto)
    ctx.drawImage(img, -displayW / 2, -displayH / 2, displayW, displayH);
    ctx.restore();

    // Close crop modal
    setCropImageSrc('');
    setPendingFile(null);

    // Convert to Blob and send
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setFeedback({ message: 'Cropping failed.', type: 'error' });
          setIsUploading(false);
          return;
        }

        const croppedFile = new File([blob], pendingFile.name, { type: 'image/jpeg' });
        const formData = new FormData();
        formData.append('file', croppedFile);

        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          const data = await res.json();
          if (res.ok) {
            setImageUrl(data.url);
            setFeedback({ message: 'Cropped photo uploaded successfully.', type: 'success' });
          } else {
            setFeedback({ message: data.error || 'Failed to upload photo.', type: 'error' });
          }
        } catch (err) {
          setFeedback({ message: 'Network error uploading photo.', type: 'error' });
        } finally {
          setIsUploading(false);
        }
      },
      'image/jpeg',
      0.9
    );
  };

  const handleCancelCrop = () => {
    setCropImageSrc('');
    setPendingFile(null);
  };

  // Convert plain text breaks into premium styled HTML paragraph tags (keeps existing tags intact)
  const formatContent = (text) => {
    const trimmed = text.trim();
    if (trimmed.startsWith('<p>') || trimmed.startsWith('<div') || trimmed.startsWith('<blockquote')) {
      return trimmed;
    }
    return trimmed
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '')
      .map((line) => {
        // Replace tabs with 4 HTML non-breaking spaces
        const formattedLine = line.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
        
        // If line starts with a quote character (>), wrap in a blockquote
        if (formattedLine.startsWith('>')) {
          const quoteContent = formattedLine.substring(1).trim();
          return `<blockquote class="reader-quote">${quoteContent}</blockquote>`;
        }
        
        return `<p>${formattedLine}</p>`;
      })
      .join('\n');
  };

  // Convert premium HTML article tags back into plain text breaks for editing
  const deformatContent = (html) => {
    if (!html) return '';
    let text = html;
    // Replace reader-quote with markdown-style blockquote symbol
    text = text.replace(/<blockquote class="reader-quote">([\s\S]*?)<\/blockquote>/gi, '>$1\n\n');
    text = text.replace(/<blockquote>([\s\S]*?)<\/blockquote>/gi, '>$1\n\n');
    text = text.replace(/<\/p>/g, '\n\n');
    text = text.replace(/<br\s*\/?>/g, '\n');
    // Replace non-breaking space indents back to tabs
    text = text.replace(/&nbsp;&nbsp;&nbsp;&nbsp;/g, '\t');
    text = text.replace(/<\/?[^>]+(>|$)/g, '');
    return text.replace(/\n{3,}/g, '\n\n').trim();
  };

  // Intercept Tab key in textarea to insert indent character instead of shifting focus
  const handleTextareaKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const value = e.target.value;

      const newValue = value.substring(0, start) + '\t' + value.substring(end);
      setContent(newValue);

      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 1;
      }, 0);
    }
  };

  // Handle article submit (Publish New or Save Changes)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!selectedArticleId || selectedArticleId === '') {
      setFeedback({ message: 'Please select an action (Create or Edit) first.', type: 'error' });
      return;
    }
    if (!imageUrl) {
      setFeedback({ message: 'Please upload a photo for the article first.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setFeedback({ message: '', type: '' });

    const formattedContent = formatContent(content);
    const isEditing = selectedArticleId !== 'new';

    const url = '/api/articles';
    const method = isEditing ? 'PUT' : 'POST';
    const body = isEditing
      ? {
          id: selectedArticleId,
          title,
          category,
          author,
          date,
          image: imageUrl,
          content: formattedContent,
        }
      : {
          title,
          category,
          author,
          date,
          image: imageUrl,
          content: formattedContent,
        };

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        setFeedback({
          message: isEditing ? 'Changes saved successfully!' : 'Article published successfully!',
          type: 'success',
        });

        if (!isEditing) {
          // Clear fields on successful creation
          setTitle('');
          setContent('');
          setImageUrl('');
          setSelectedArticleId('');
        }

        // Refresh articles list to update dropdown & reorder layout
        await fetchArticles();
      } else {
        setFeedback({ message: data.error || 'Failed to save article.', type: 'error' });
      }
    } catch (err) {
      setFeedback({ message: 'Network error saving article.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle article deletion
  const handleDelete = async () => {
    if (!selectedArticleId || selectedArticleId === 'new') return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this article? This action cannot be undone.'
    );
    if (!confirmed) return;

    setIsSubmitting(true);
    setFeedback({ message: '', type: '' });

    try {
      const res = await fetch(`/api/articles?id=${selectedArticleId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (res.ok) {
        setFeedback({ message: 'Article deleted successfully.', type: 'success' });
        // Clear fields
        setTitle('');
        setCategory('Fashion');
        setAuthor('');
        setDate('');
        setContent('');
        setImageUrl('');
        setSelectedArticleId('');
        // Refresh dropdown & reorder list
        await fetchArticles();
      } else {
        setFeedback({ message: data.error || 'Failed to delete article.', type: 'error' });
      }
    } catch (err) {
      setFeedback({ message: 'Network error deleting article.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle layout card reordering (Up/Down)
  const handleMove = async (index, direction) => {
    const newList = [...articlesList];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newList.length) return;

    // Swap items
    const temp = newList[index];
    newList[index] = newList[targetIndex];
    newList[targetIndex] = temp;

    // Update local state instantly for fast UI feedback
    setArticlesList(newList);

    // Map new ordering indices
    const updatedOrders = newList.map((item, idx) => ({
      id: item.id,
      order: idx,
    }));

    try {
      const res = await fetch('/api/articles', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orders: updatedOrders }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFeedback({ message: data.error || 'Failed to save layout order.', type: 'error' });
        // Restore local state if request fails
        await fetchArticles();
      }
    } catch (err) {
      setFeedback({ message: 'Network error saving layout order.', type: 'error' });
      await fetchArticles();
    }
  };

  const isFormEnabled = selectedArticleId && selectedArticleId !== '';

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1 className="admin-title">SLEEK PANEL</h1>
        <button className="logout-btn" onClick={() => signOut({ callbackUrl: '/login' })}>
          LOG OUT
        </button>
      </header>

      {/* Editor selector dropdown */}
      <div className="form-group" style={{ marginBottom: '3rem', maxWidth: '500px' }}>
        <label htmlFor="article-select" style={{ fontSize: '0.8rem', color: 'var(--color-bronze)' }}>
          Select Article Action
        </label>
        <select
          id="article-select"
          className="form-select"
          value={selectedArticleId}
          onChange={handleSelectArticle}
          style={{ marginTop: '0.5rem', border: '1px solid var(--color-bronze)' }}
        >
          <option value="">-- Choose an action --</option>
          <option value="new">+ Create New Article</option>
          <optgroup label="Edit Existing Articles">
            {articlesList.map((art) => (
              <option key={art.id} value={art.id}>
                {art.title} ({art.category})
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      <div className="admin-grid" style={{ opacity: isFormEnabled ? 1 : 0.4, transition: 'opacity 0.3s' }}>
        {/* Left Column: Edit/Write Form */}
        <div>
          <h2 className="subtitle-tag" style={{ marginBottom: '2rem' }}>
            {selectedArticleId === 'new' ? 'Create Article Details' : 'Edit Article Details'}
          </h2>
          <form onSubmit={handleSubmitForm} className="editor-form">
            <div className="form-group">
              <label htmlFor="title">Title</label>
              <input
                id="title"
                type="text"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={!isFormEnabled || isSubmitting}
                placeholder={isFormEnabled ? 'e.g. Concrete & Silk' : 'Choose an action first...'}
              />
            </div>

            <div className="form-group">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={!isFormEnabled || isSubmitting}
              >
                <option value="Fashion">Fashion</option>
                <option value="Culture">Culture</option>
                <option value="Design">Design</option>
                <option value="Editorial">Editorial</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="author">Author Attribution</label>
              <input
                id="author"
                type="text"
                className="form-input"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                required
                disabled={!isFormEnabled || isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="date">Publication Date Text</label>
              <input
                id="date"
                type="text"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                disabled={!isFormEnabled || isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="content">Content</label>
              <textarea
                id="content"
                className="form-textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleTextareaKeyDown}
                required
                disabled={!isFormEnabled || isSubmitting}
                placeholder={isFormEnabled ? 'Write your text paragraphs here...' : 'Choose an action first...'}
              />
            </div>

            {feedback.message && (
              <div className={`admin-feedback ${feedback.type}`}>{feedback.message}</div>
            )}

            <div className="admin-button-group">
              <button
                type="submit"
                className="publish-btn"
                style={{ flex: 1 }}
                disabled={!isFormEnabled || isSubmitting || isUploading}
              >
                {selectedArticleId === 'new'
                  ? isSubmitting
                    ? 'PUBLISHING...'
                    : 'PUBLISH ARTICLE'
                  : isSubmitting
                  ? 'SAVING...'
                  : 'SAVE CHANGES'}
              </button>

              {selectedArticleId && selectedArticleId !== 'new' && (
                <button
                  type="button"
                  className="delete-btn"
                  style={{ flex: 1 }}
                  onClick={handleDelete}
                  disabled={isSubmitting || isUploading}
                >
                  {isSubmitting ? 'DELETING...' : 'DELETE ARTICLE'}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right Column: Image Uploader & Preview */}
        <div>
          <h2 className="subtitle-tag" style={{ marginBottom: '2rem' }}>
            Article Photo
          </h2>

          <div className="form-group">
            <label>Upload Image</label>
            <label
              className="upload-zone"
              style={{
                cursor: isFormEnabled ? 'pointer' : 'not-allowed',
                pointerEvents: isFormEnabled ? 'auto' : 'none',
              }}
            >
              <input
                id="upload-file-input"
                type="file"
                accept="image/*"
                onChange={handleImageUploadSelect}
                style={{ display: 'none' }}
                disabled={!isFormEnabled || isUploading || isSubmitting}
              />
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-bronze)"
                strokeWidth="1.5"
                style={{ marginBottom: '0.5rem' }}
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              <span className="upload-text">
                {!isFormEnabled
                  ? 'Select an action first to upload photo'
                  : isUploading
                  ? 'Uploading to Cloudinary...'
                  : imageUrl
                  ? 'Click to change photo'
                  : 'Click to upload editorial photo'}
              </span>
            </label>

            {imageUrl && (
              <div className="form-group" style={{ marginTop: '2rem' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Photo Preview</span>
                  <button
                    type="button"
                    onClick={() => document.getElementById('upload-file-input').click()}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-bronze)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: 0
                    }}
                  >
                    Change Photo
                  </button>
                </label>
                <div className="upload-preview">
                  <img src={imageUrl} alt="Uploaded preview" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reordering list panel */}
      {articlesList.length > 0 && (
        <div style={{ marginTop: '6rem', borderTop: '1px solid var(--color-border)', paddingTop: '4rem' }}>
          <h2 className="subtitle-tag" style={{ marginBottom: '1.5rem' }}>
            Arrange Cards Layout
          </h2>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', marginBottom: '2.5rem' }}>
            Use the up (▲) and down (▼) buttons to reorder how the article cards are displayed on the main feed.
          </p>

          <div
            className="reorder-list"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              maxWidth: '650px',
            }}
          >
            {articlesList.map((art, idx) => (
              <div
                key={art.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1.2rem 1.5rem',
                  backgroundColor: 'var(--color-black-card)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <span
                    style={{
                      color: 'var(--color-bronze)',
                      fontSize: '0.85rem',
                      fontFamily: 'var(--font-serif)',
                      width: '25px',
                    }}
                  >
                    #{idx + 1}
                  </span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{art.title}</span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--color-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    ({art.category})
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => handleMove(idx, 'up')}
                    disabled={idx === 0 || isSubmitting}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-white)',
                      padding: '0.4rem 0.8rem',
                      cursor: idx === 0 ? 'not-allowed' : 'pointer',
                      opacity: idx === 0 ? 0.3 : 1,
                    }}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(idx, 'down')}
                    disabled={idx === articlesList.length - 1 || isSubmitting}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-white)',
                      padding: '0.4rem 0.8rem',
                      cursor: idx === articlesList.length - 1 ? 'not-allowed' : 'pointer',
                      opacity: idx === articlesList.length - 1 ? 0.3 : 1,
                    }}
                  >
                    ▼
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Client-side Crop Modal overlay */}
      {cropImageSrc && (
        <div className="crop-modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 99999,
          padding: '2rem'
        }}>
          <div className="crop-modal-content" style={{
            backgroundColor: 'var(--color-black-card)',
            border: '1px solid var(--color-border)',
            padding: 'clamp(1.5rem, 4vw, 3rem)',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            <h2 className="login-title" style={{ fontSize: '1.5rem', textAlign: 'center', color: 'var(--color-bronze)', fontFamily: 'var(--font-serif)', letterSpacing: '0.1em' }}>
              CROP PHOTO
            </h2>

            <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
              Drag the photo inside the bronze frame to position. Use the zoom slider below to resize.
            </p>

            {/* Viewport Box */}
            <div
              className="crop-viewport"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
              style={{
                width: '100%',
                maxWidth: '400px',
                aspectRatio: '4/3',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid var(--color-bronze)',
                backgroundColor: '#050505',
                margin: '0 auto',
                cursor: 'move'
              }}
            >
              <img
                id="crop-target-img"
                src={cropImageSrc}
                alt="To Crop"
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                  transformOrigin: 'center center',
                  userSelect: 'none',
                  pointerEvents: 'none',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  margin: 'auto'
                }}
              />
              {/* Guidelines */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                border: '1px dashed rgba(186, 156, 135, 0.25)',
                pointerEvents: 'none'
              }}></div>
            </div>

            {/* Zoom controller */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', color: 'var(--color-muted)' }}>
                <span>ZOOM</span>
                <span style={{ color: 'var(--color-bronze)' }}>{Math.round(zoom * 100)}%</span>
              </label>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-bronze)', marginTop: '0.5rem', cursor: 'pointer' }}
              />
            </div>

            {/* Crop Controls */}
            <div className="admin-button-group" style={{ gap: '1rem', marginTop: '1rem' }}>
              <button
                type="button"
                className="publish-btn"
                onClick={handleConfirmCrop}
                style={{ flex: 1 }}
              >
                CROP &amp; UPLOAD
              </button>
              <button
                type="button"
                className="delete-btn"
                onClick={handleCancelCrop}
                style={{ flex: 1 }}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
