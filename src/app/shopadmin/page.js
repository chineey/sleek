'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const defaultImage = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=1200&auto=format&fit=crop';

export default function ShopAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    id: '',
    name: '',
    category: 'Accessories',
    description: '',
    image: defaultImage,
    price: '0',
    stock: '0',
    active: true,
  });
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [zoom, setZoom] = useState(1.0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (!res.ok) {
        throw new Error('Failed to load products');
      }

      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchProducts();
    }
  }, [status]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      id: '',
      name: '',
      category: 'Accessories',
      description: '',
      image: defaultImage,
      price: '0',
      stock: '0',
      active: true,
    });
  };

  const handleImageUploadSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPendingFile(file);
    setCropImageSrc(URL.createObjectURL(file));
    setZoom(1.0);
    setOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (event) => {
    event.preventDefault();
    setIsDragging(true);
    setDragStart({ x: event.clientX - offset.x, y: event.clientY - offset.y });
  };

  const handleMouseMove = (event) => {
    if (!isDragging) return;
    setOffset({
      x: event.clientX - dragStart.x,
      y: event.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (event) => {
    const touch = event.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
  };

  const handleTouchMove = (event) => {
    if (!isDragging) return;
    const touch = event.touches[0];
    setOffset({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleConfirmCrop = async () => {
    if (!pendingFile || !cropImageSrc) return;

    setIsUploading(true);
    setFeedback({ message: '', type: '' });

    const img = document.getElementById('shop-crop-target-img');
    if (!img) return;

    const viewport = document.querySelector('.shop-crop-viewport');
    const vpW = viewport ? viewport.clientWidth : 400;
    const vpH = viewport ? viewport.clientHeight : 600;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const fitRatio = Math.min(vpW / nw, vpH / nh);
    const displayW = nw * fitRatio;
    const displayH = nh * fitRatio;

    const canvas = document.createElement('canvas');
    const canvasWidth = 900;
    const canvasHeight = 1600;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setFeedback({ message: 'Cropping failed.', type: 'error' });
      setIsUploading(false);
      return;
    }

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const scaleX = canvasWidth / vpW;
    const scaleY = canvasHeight / vpH;

    ctx.save();
    ctx.scale(scaleX, scaleY);
    ctx.translate(vpW / 2, vpH / 2);
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);
    ctx.drawImage(img, -displayW / 2, -displayH / 2, displayW, displayH);
    ctx.restore();

    setCropImageSrc('');
    setPendingFile(null);

    canvas.toBlob(async (blob) => {
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
          updateField('image', data.url);
          setFeedback({ message: 'Product photo uploaded successfully.', type: 'success' });
        } else {
          setFeedback({ message: data.error || 'Failed to upload photo.', type: 'error' });
        }
      } catch (error) {
        setFeedback({ message: 'Network error uploading photo.', type: 'error' });
      } finally {
        setIsUploading(false);
      }
    }, 'image/jpeg', 0.9);
  };

  const handleCancelCrop = () => {
    setCropImageSrc('');
    setPendingFile(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setFeedback({ message: '', type: '' });

    try {
      const payload = {
        ...form,
        price: Number(form.price),
        stock: Number(form.stock),
      };

      const method = form.id ? 'PUT' : 'POST';
      const res = await fetch('/api/products', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save product.');
      }

      setFeedback({ message: form.id ? 'Product updated successfully.' : 'Product created successfully.', type: 'success' });
      resetForm();
      fetchProducts();
    } catch (error) {
      setFeedback({ message: error.message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (product) => {
    setForm({
      id: product.id,
      name: product.name,
      category: product.category,
      description: product.description,
      image: product.image || defaultImage,
      price: String(product.price),
      stock: String(product.stock),
      active: product.active,
    });
    setFeedback({ message: '', type: '' });
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/products?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete product');
      }

      setFeedback({ message: 'Product deleted.', type: 'success' });
      fetchProducts();
      if (form.id === id) resetForm();
    } catch (error) {
      setFeedback({ message: error.message, type: 'error' });
    }
  };

  if (status === 'loading') {
    return <div className="login-wrapper"><p style={{ color: 'var(--color-bronze)' }}>LOADING SHOP ADMIN...</p></div>;
  }

  if (!session) {
    return null;
  }

  return (
    <main className="shop-admin-page">
      <div className="shop-admin-shell">
        <header className="shop-admin-header">
          <h1>Shop admin</h1>
          <button className="shop-admin-btn" onClick={() => router.push('/admin')}>
            Back to editor
          </button>
        </header>

        {feedback.message && (
          <div className={`admin-feedback ${feedback.type}`}>{feedback.message}</div>
        )}

        <div className="shop-admin-layout">
          <form className="shop-admin-form" onSubmit={handleSubmit}>
            <div className="shop-form-grid">
              <div className="form-group">
                <label>Product name</label>
                <input className="form-input" value={form.name} onChange={(e) => updateField('name', e.target.value)} required />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select className="form-select" value={form.category} onChange={(e) => updateField('category', e.target.value)}>
                  <option>Accessories</option>
                  <option>Apparel</option>
                  <option>Beauty</option>
                  <option>Home</option>
                  <option>Edition</option>
                </select>
              </div>

              <div className="form-group">
                <label>Price (NGN)</label>
                <input className="form-input" type="number" min="0" value={form.price} onChange={(e) => updateField('price', e.target.value)} required />
              </div>

              <div className="form-group">
                <label>Stock</label>
                <input className="form-input" type="number" min="0" value={form.stock} onChange={(e) => updateField('stock', e.target.value)} required />
              </div>
            </div>

            <div className="form-group">
              <label>Product image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUploadSelect}
                disabled={isUploading || isSaving}
                style={{ display: 'block', width: '100%', padding: '0.9rem 1rem', border: '1px solid var(--color-border)', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.02)', color: 'var(--color-ivory)' }}
              />
              <p style={{ color: 'var(--color-muted)', marginTop: '0.5rem', fontSize: '0.8rem' }}>
                Upload a portrait image. The crop is fixed to a 9:16 format for product shots.
              </p>
              {form.image && form.image !== defaultImage && (
                <div className="upload-preview" style={{ aspectRatio: '9/16', marginTop: '1rem' }}>
                  <img src={form.image} alt="Product preview" />
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea className="form-textarea" value={form.description} onChange={(e) => updateField('description', e.target.value)} required />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-muted)' }}>
              <input type="checkbox" checked={form.active} onChange={(e) => updateField('active', e.target.checked)} />
              Product is active and visible in the shop
            </label>

            <div className="admin-button-group">
              <button className="shop-save-btn" type="submit" disabled={isSaving || isUploading}>
                {isSaving ? 'Saving...' : form.id ? 'Update product' : 'Create product'}
              </button>
              {form.id && (
                <button type="button" className="shop-admin-btn" onClick={resetForm}>
                  Clear form
                </button>
              )}
            </div>
          </form>

          <aside className="shop-admin-list">
            <h2 style={{ margin: 0, fontSize: '1rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-bronze)' }}>
              Product list
            </h2>

            {products.length === 0 ? (
              <div className="shop-empty">No products yet.</div>
            ) : (
              products.map((product) => (
                <div className="shop-admin-item" key={product.id}>
                  <div className="shop-admin-thumb" style={{ backgroundImage: `url('${product.image || defaultImage}')` }} />
                  <div className="shop-admin-item-copy">
                    <strong>{product.name}</strong>
                    <span>{product.category}</span>
                    <span>₦{Number(product.price).toLocaleString()} • {product.stock} in stock</span>
                  </div>
                  <div className="shop-admin-actions">
                    <button type="button" className="shop-admin-btn" onClick={() => handleEdit(product)}>Edit</button>
                    <button type="button" className="shop-delete-btn" onClick={() => handleDelete(product.id)}>Delete</button>
                  </div>
                </div>
              ))
            )}
          </aside>
        </div>
      </div>

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
              CROP PRODUCT PHOTO
            </h2>

            <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
              Drag to frame your portrait shot. The final upload is cropped to a 9:16 ratio.
            </p>

            <div
              className="shop-crop-viewport"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
              style={{
                width: '100%',
                maxWidth: '360px',
                aspectRatio: '9/16',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid var(--color-bronze)',
                backgroundColor: '#050505',
                margin: '0 auto',
                cursor: 'move'
              }}
            >
              <img
                id="shop-crop-target-img"
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

            <div className="admin-button-group" style={{ gap: '1rem', marginTop: '1rem' }}>
              <button type="button" className="publish-btn" onClick={handleConfirmCrop} style={{ flex: 1 }}>
                CROP &amp; UPLOAD
              </button>
              <button type="button" className="delete-btn" onClick={handleCancelCrop} style={{ flex: 1 }}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
