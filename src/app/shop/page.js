'use client';

import { useEffect, useState } from 'react';

const defaultImage = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=1200&auto=format&fit=crop';

export default function ShopPage() {
  const [products, setProducts] = useState([]);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState({ message: '', type: '' });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      setCheckoutMessage({
        message: 'Payment successful. Your order is being processed.',
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

    setIsCheckingOut(true);
    setCheckoutMessage({ message: '', type: '' });

    try {
      const res = await fetch('/api/shop/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, email }),
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
            <span className="shop-kicker">SLEEK EDIT</span>
            <h1>Shop the collection.</h1>
            <p>
              Curated pieces for the modern wardrobe — designed for statement dressing, everyday polish,
              and a slower, more intentional way to wear luxury.
            </p>
            <div className="shop-price-badge">Secure checkout powered by Paystack</div>
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
          <div className={`admin-feedback ${checkoutMessage.type}`}>
            {checkoutMessage.message}
          </div>
        )}

        {isLoading ? (
          <div className="shop-empty">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="shop-empty">No products are live yet. Check back soon.</div>
        ) : (
          <section className="shop-grid">
            {products.map((product) => (
              <article className="shop-card" key={product.id}>
                <div
                  className="shop-card-image"
                  style={{ backgroundImage: `url('${product.image || defaultImage}')` }}
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
      </div>
    </main>
  );
}
