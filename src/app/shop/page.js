'use client';

import { useEffect, useState } from 'react';
import PickupLocationSelector from '../../components/PickupLocationSelector';

const defaultImage = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=1200&auto=format&fit=crop';

export default function ShopPage() {
  const [products, setProducts] = useState([]);
  const [email, setEmail] = useState('');
  const [selectedPickupLocation, setSelectedPickupLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState({ message: '', type: '' });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderRef = params.get('order');
    if (params.get('checkout') === 'success') {
      const msg = orderRef
        ? `Payment successful! Order #${orderRef} has been placed. Check your email for pickup instructions.`
        : 'Payment successful! Your order has been placed. Check your email for pickup instructions.';
      setCheckoutMessage({
        message: msg,
        type: 'success',
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    async function fetchProducts() {
      try {
        const res = await fetch('/api/products');
        if (!res.ok) {
          throw new Error('Failed to load products');
        }

        const data = await res.json();
        setProducts(data.filter((product) => product.active));
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }

    async function fetchSubscriberStatus() {
      try {
        const res = await fetch('/api/subscriber/status');
        if (res.ok) {
          const data = await res.json();
          if (data.isSubscriber && data.email) {
            setEmail(data.email);
          }
        }
      } catch (error) {
        console.error('Subscriber status check failed:', error);
      }
    }

    fetchProducts();
    fetchSubscriberStatus();
  }, []);

  const handleCheckout = async (product) => {
    if (!email || !email.includes('@')) {
      setCheckoutMessage({ message: 'Please enter a valid email to continue to checkout.', type: 'error' });
      return;
    }

    if (!selectedPickupLocation) {
      setCheckoutMessage({ message: 'Please select a pickup location first.', type: 'error' });
      const el = document.getElementById('pickup-location-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    setIsCheckingOut(true);
    setCheckoutMessage({ message: '', type: '' });

    try {
      const res = await fetch('/api/shop/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          email,
          pickupLocationId: selectedPickupLocation.id,
          pickupLocationName: selectedPickupLocation.name,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Checkout failed.');
      }

      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch (error) {
      setCheckoutMessage({ message: error.message, type: 'error' });
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <main className="shop-page">
      <div className="shop-shell">
        <section className="shop-hero">
          <div className="shop-hero-copy">
            <span className="shop-kicker">SLEEK</span>
            <h1>Shop Sleek.</h1>
            <p>
              Elevate your mind in style with sleek. Step into a world of ideas, stories and perspectives.
              Or just Be cool.
            </p>
            <div className="shop-price-badge">
              <div>Physical Copies are available for purchase</div>
              <div>Select your pickup location</div>
            </div>
          </div>

          <div className="shop-hero-card">
            <div className="shop-hero-card-inner">
              <span className="shop-kicker">Checkout email</span>
              <input
                className="form-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p style={{ color: 'var(--color-muted)', margin: 0 }}>
                {email ? 'This email will be used for payment confirmation and order updates.' : 'Use the same address for payment confirmation and order updates.'}
              </p>
            </div>
          </div>
        </section>

        {checkoutMessage.message && (
          <div className={`admin-feedback ${checkoutMessage.type}`} style={{ marginBottom: '2rem' }}>
            {checkoutMessage.message}
          </div>
        )}

        {isLoading ? (
          <div className="shop-empty">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="shop-empty">No products are live yet. Check back soon.</div>
        ) : (
          <section className="shop-grid" style={{ marginBottom: '4rem' }}>
            {products.map((product) => (
              <article className="shop-card" key={product.id}>
                <img
                  src={product.image || defaultImage}
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                  className="shop-card-image"
                />
                <div className="shop-card-content">
                  <div className="shop-card-meta">
                    <span className="shop-card-category">{product.category}</span>
                    <span className="shop-card-price">₦{Number(product.price).toLocaleString()}</span>
                  </div>

                  <h3>{product.name}</h3>
                  <p>{product.description}</p>

                  <div className="shop-card-footer">
                    <span className="shop-card-stock">
                      {product.stock > 0 ? `${product.stock} in stock` : 'Sold out'}
                    </span>
                    <button
                      className="shop-buy-btn"
                      onClick={() => handleCheckout(product)}
                      disabled={isCheckingOut || product.stock <= 0}
                    >
                      {isCheckingOut ? 'Checking out...' : 'Buy now'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}

        {/* Pickup Location Selection */}
        {products.length > 0 && (
          <section id="pickup-location-section" style={{ marginBottom: '3rem' }}>
            <PickupLocationSelector
              onLocationSelect={setSelectedPickupLocation}
              selectedLocationId={selectedPickupLocation?.id}
            />
          </section>
        )}
      </div>
    </main>
  );
}
