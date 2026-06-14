import React, { useState, useMemo } from 'react';
import type { Product } from '../App';

interface BillingCounterProps {
  products: Product[];
  cart: { [id: string]: number };
  setCart: React.Dispatch<React.SetStateAction<{ [id: string]: number }>>;
  updateProductStock: (productId: string, quantitySold: number) => void;
  addLog: (type: 'SALE' | 'TELEGRAM_ADDITION', details: string) => void;
  showToast: (msg: string) => void;
}

const BillingCounter: React.FC<BillingCounterProps> = ({
  products,
  cart,
  setCart,
  updateProductStock,
  addLog,
  showToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCat, setActiveCat] = useState('All');
  const [applyGST, setApplyGST] = useState(true);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [orderTotal, setOrderTotal] = useState('');

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = activeCat === 'All' || p.category === activeCat;
      const matchQ =
        !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCat && matchQ;
    });
  }, [products, activeCat, searchTerm]);

  const addToCart = (product: Product) => {
    if ((cart[product.id] || 0) >= product.quantity) {
      showToast('⚠ Max stock reached for ' + product.name);
      return;
    }
    setCart((prev) => ({ ...prev, [product.id]: (prev[product.id] || 0) + 1 }));
    showToast('+ ' + product.name);
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => {
      const newQty = (prev[id] || 0) + delta;
      if (newQty <= 0) {
        const newCart = { ...prev };
        delete newCart[id];
        return newCart;
      }
      const product = products.find((p) => p.id === id);
      if (product && newQty > product.quantity) {
        showToast('⚠ Max stock reached for ' + product.name);
        return prev;
      }
      return { ...prev, [id]: newQty };
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => {
      const newCart = { ...prev };
      delete newCart[id];
      return newCart;
    });
  };

  const clearCart = () => setCart({});

  const cartItemIds = Object.keys(cart);
  const subtotal = cartItemIds.reduce((sum, id) => {
    const p = products.find((x) => x.id === id);
    return sum + (p ? p.price * cart[id] : 0);
  }, 0);
  const gst = applyGST ? subtotal * 0.18 : 0;
  const total = subtotal + gst;

  const handleCheckoutModal = () => {
    setOrderId('ORD-' + Date.now().toString().slice(-6));
    setOrderTotal(total.toFixed(2));
    setShowBillModal(true);
  };

  const processCheckout = async () => {
    // Mocking an API call
    try {
      // Example webhook logic (silently catch failures for local mode)
      const payload = {
        timestamp: new Date().toISOString(),
        cashierId: 'CASHIER_01',
        totalAmount: total,
        items: cartItemIds.map((id) => {
          const p = products.find((x) => x.id === id);
          return {
            productId: id,
            name: p?.name,
            quantitySold: cart[id],
            pricePerUnit: p?.price,
          };
        }),
      };
      
      await fetch('http://localhost:8000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      // Update local state
      cartItemIds.forEach((id) => updateProductStock(id, cart[id]));
      addLog('SALE', `Sold ${cartItemIds.length} item(s) for ₹${total.toFixed(2)}`);

      setShowBillModal(false);
      setShowSuccessModal(true);
      
      // Check for low stock items to trigger alerts
      const low = products.filter(p => p.quantity - (cart[p.id] || 0) < p.min_threshold);
      if (low.length > 0) {
        setTimeout(() => {
          showToast(`🔴 ${low.length} product(s) below threshold — n8n alert fired`);
        }, 1000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const closeSuccess = () => {
    setShowSuccessModal(false);
    clearCart();
  };

  return (
    <div id="pos-view" className="view active">
      {/* LEFT: Products */}
      <div className="pos-left">
        <div className="pos-search-bar">
          <div className="search-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              className="search-input"
              type="text"
              placeholder="Search product by name or category…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="cat-filter">
          {categories.map((c) => (
            <button
              key={c}
              className={`cat-btn ${activeCat === c ? 'active' : ''}`}
              onClick={() => setActiveCat(c)}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="product-grid">
          {filteredProducts.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text2)', fontSize: '12px' }}>
              No products found
            </div>
          ) : (
            filteredProducts.map((p) => {
              const low = p.quantity < p.min_threshold;
              return (
                <div
                  key={p.id}
                  className={`prod-card ${low ? 'low-stock' : ''}`}
                  onClick={() => addToCart(p)}
                >
                  <div className="prod-cat">{p.category}</div>
                  <div className="prod-name">{p.name}</div>
                  <div className="prod-footer">
                    <div>
                      <div className="prod-price">₹{p.price}</div>
                      <div className={`prod-stock ${low ? 'low' : ''}`}>
                        Stock: {p.quantity} {p.unit}
                      </div>
                    </div>
                    <button
                      className="prod-add-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(p);
                      }}
                      disabled={p.quantity === 0}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT: Cart */}
      <div className="pos-right">
        <div className="cart-header">
          <span className="cart-title">Current Bill</span>
          <span className="cart-count">
            {cartItemIds.length} {cartItemIds.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        <div className="cart-items">
          {cartItemIds.length === 0 ? (
            <div className="cart-empty" style={{ display: 'flex' }}>
              <div className="cart-empty-icon">🛒</div>
              <span>No items added yet</span>
              <span style={{ color: 'var(--text2)', fontSize: '11px' }}>Click a product to add</span>
            </div>
          ) : (
            cartItemIds.map((id) => {
              const p = products.find((x) => x.id === id);
              if (!p) return null;
              const qty = cart[id];
              const sub = p.price * qty;
              return (
                <div key={id} className="cart-item">
                  <div className="ci-info">
                    <div className="ci-name">{p.name}</div>
                    <div className="ci-price">₹{p.price} / {p.unit}</div>
                  </div>
                  <div className="ci-qty-ctrl">
                    <button className="qty-btn" onClick={() => updateQty(id, -1)}>−</button>
                    <span className="qty-val">{qty}</span>
                    <button className="qty-btn" onClick={() => updateQty(id, 1)}>+</button>
                  </div>
                  <div className="ci-subtotal">₹{sub}</div>
                  <button className="ci-del" onClick={() => removeFromCart(id)}>✕</button>
                </div>
              );
            })
          )}
        </div>

        {cartItemIds.length === 0 && (
          <div className="tg-hint">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m22 2-7 20-4-9-9-4 20-7z" />
              <path d="M22 2 11 13" />
            </svg>
            Products added via Telegram bot appear instantly
          </div>
        )}

        <div className="bill-summary">
          <div className="bill-row">
            <span className="label">Subtotal</span>
            <span className="val">₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="bill-row">
            <span className="label">GST (18%)</span>
            <span className="val">₹{gst.toFixed(2)}</span>
          </div>
          <div className="bill-row">
            <span className="label">Discount</span>
            <span className="val">₹0.00</span>
          </div>
          <div className="bill-row total">
            <span className="label">Total</span>
            <span className="val">₹{total.toFixed(2)}</span>
          </div>
          <label className="gst-toggle">
            <input
              type="checkbox"
              checked={applyGST}
              onChange={(e) => setApplyGST(e.target.checked)}
            />
            Apply 18% GST
          </label>
        </div>

        <button className="clear-btn" onClick={clearCart}>✕ Clear Bill</button>
        <button
          className="checkout-btn"
          disabled={cartItemIds.length === 0}
          onClick={handleCheckoutModal}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          PROCESS CHECKOUT
        </button>
      </div>

      {/* Bill Modal */}
      {showBillModal && (
        <div className="modal-overlay" onClick={() => setShowBillModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">
              <span className="icon">◈</span> ORDER SUMMARY
            </div>
            <div className="bill-modal-items">
              {cartItemIds.map((id) => {
                const p = products.find((x) => x.id === id);
                if (!p) return null;
                const sub = p.price * cart[id];
                return (
                  <div key={id} className="bmi-row">
                    <span className="bmi-name">{p.name}</span>
                    <span className="bmi-qty">×{cart[id]}</span>
                    <span className="bmi-amt">₹{sub.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
            <div className="bill-totals">
              <div className="bt-row">
                <span className="l">Subtotal</span>
                <span className="v">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="bt-row">
                <span className="l">GST (18%)</span>
                <span className="v">₹{gst.toFixed(2)}</span>
              </div>
              <div className="bt-row grand">
                <span className="l">Grand Total</span>
                <span className="v">₹{total.toFixed(2)}</span>
              </div>
            </div>
            <div className="order-id">Order ID: {orderId}</div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowBillModal(false)}>✕ Cancel</button>
              <button className="btn-primary" onClick={processCheckout}>✓ CONFIRM & PRINT</button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ textAlign: 'center' }}>
            <div className="success-icon">✓</div>
            <div className="modal-title" style={{ justifyContent: 'center' }}>PAYMENT PROCESSED</div>
            <p style={{ color: 'var(--text1)', fontSize: '12px', marginBottom: '12px' }}>
              Order recorded. n8n is updating inventory and checking restock levels.
            </p>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text2)', marginBottom: '16px' }}>
              Order ID: {orderId} · Total: ₹{orderTotal}
            </div>
            <button className="btn-primary" onClick={closeSuccess} style={{ width: '100%' }}>
              NEW BILL
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingCounter;
