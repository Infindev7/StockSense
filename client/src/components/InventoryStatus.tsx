import React, { useState, useMemo } from 'react';
import type { Product } from '../App';
import { API_BASE_URL } from '../config';

interface InventoryStatusProps {
  products: Product[];
  switchView: (view: 'pos' | 'inv' | 'logs') => void;
  addToCart: (id: string) => void;
  showToast: (msg: string) => void;
}

const InventoryStatus: React.FC<InventoryStatusProps> = ({ products, switchView, addToCart, showToast }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortKey, setSortKey] = useState<keyof Product | 'level'>('name');
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockProductId, setRestockProductId] = useState('');
  const [restockQty, setRestockQty] = useState<number | ''>('');

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];

  const stockStatus = (p: Product) => {
    if (p.status) {
      if (p.status === 'warning') return 'warn';
      return p.status;
    }
    if (p.quantity < p.min_threshold) return 'low';
    if (p.quantity < p.min_threshold * 1.5) return 'warn';
    return 'ok';
  };

  const handleSort = (key: keyof Product | 'level') => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 1 ? -1 : 1));
    } else {
      setSortKey(key);
      setSortDir(1);
    }
  };

  const sortedAndFiltered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return products
      .filter((p) => {
        const matchQ = !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
        const matchC = catFilter === 'All' || p.category === catFilter;
        const matchS = statusFilter === 'All' || stockStatus(p) === statusFilter;
        return matchQ && matchC && matchS;
      })
      .sort((a, b) => {
        if (sortKey === 'level') {
          const aPct = a.quantity / a.min_threshold;
          const bPct = b.quantity / b.min_threshold;
          return sortDir * (aPct - bPct);
        }
        
        const av = a[sortKey];
        const bv = b[sortKey];
        if (typeof av === 'string' && typeof bv === 'string') {
          return sortDir * av.localeCompare(bv);
        }
        return sortDir * ((av as number) - (bv as number));
      });
  }, [products, searchTerm, catFilter, statusFilter, sortKey, sortDir]);

  const lowCount = products.filter((p) => p.quantity < p.min_threshold).length;
  const warnCount = products.filter((p) => stockStatus(p) === 'warn').length;
  const totalVal = products.reduce((s, p) => s + p.price * p.quantity, 0);

  const lowStockProducts = products.filter((p) => p.quantity < p.min_threshold);

  return (
    <div id="inv-view" className="view active" style={{ flexDirection: 'column' }}>
      <div className="inv-toolbar">
        <div className="search-wrap inv-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            className="search-input"
            type="text"
            placeholder="Search inventory…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          style={{ padding: '8px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text1)', fontSize: '12px', outline: 'none', fontFamily: 'var(--sans)', cursor: 'pointer' }}
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === 'All' ? 'All categories' : c}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '8px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text1)', fontSize: '12px', outline: 'none', fontFamily: 'var(--sans)', cursor: 'pointer' }}
        >
          <option value="All">All status</option>
          <option value="low">Low stock</option>
          <option value="warn">Warning</option>
          <option value="ok">OK</option>
        </select>
        <button
          onClick={() => showToast('📲 Sync from n8n triggered')}
          style={{ padding: '7px 14px', background: 'var(--accent-dim)', border: '1px solid rgba(0,229,160,0.25)', borderRadius: 'var(--radius)', color: 'var(--accent)', fontSize: '11px', fontFamily: 'var(--mono)', cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap' }}
        >
          ↻ SYNC
        </button>
        <button
          onClick={() => {
            setShowRestockModal(true);
            setRestockProductId('');
            setRestockQty('');
          }}
          style={{ padding: '7px 14px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius)', color: 'var(--bg0)', fontSize: '11px', fontFamily: 'var(--mono)', cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap', marginLeft: '8px' }}
        >
          + RESTOCK PRODUCT
        </button>
      </div>

      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-label">Total Products</div>
          <div className="stat-val">{products.length}</div>
          <div className="stat-sub">across {categories.length - 1} categories</div>
        </div>
        <div className={`stat-card ${lowCount > 0 ? 'alert' : 'good'}`}>
          <div className="stat-label">Low Stock</div>
          <div className="stat-val">{lowCount}</div>
          <div className="stat-sub">below threshold</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Warning</div>
          <div className="stat-val" style={{ color: 'var(--amber)' }}>{warnCount}</div>
          <div className="stat-sub">near threshold</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Inventory Value</div>
          <div className="stat-val" style={{ fontSize: '16px', paddingTop: '4px' }}>
            ₹{(totalVal / 1000).toFixed(1)}k
          </div>
          <div className="stat-sub">at cost price</div>
        </div>
      </div>

      <div className="inv-table-wrap">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('name')}>Product <span className="sort-arrow">↕</span></th>
              <th onClick={() => handleSort('category')}>Category <span className="sort-arrow">↕</span></th>
              <th onClick={() => handleSort('price')}>Price <span className="sort-arrow">↕</span></th>
              <th onClick={() => handleSort('quantity')}>Stock <span className="sort-arrow">↕</span></th>
              <th>Min Threshold</th>
              <th onClick={() => handleSort('level')}>Level</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedAndFiltered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text2)' }}>
                  No products found
                </td>
              </tr>
            ) : (
              sortedAndFiltered.map((p) => {
                const st = stockStatus(p);
                const pct = Math.min(100, Math.round((p.quantity / (p.min_threshold * 3)) * 100));
                const fillClass = st === 'ok' ? 'fill-good' : st === 'warn' ? 'fill-warn' : 'fill-low';
                
                return (
                  <tr key={p.id} className={st === 'low' ? 'low' : ''}>
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td className="muted">{p.category}</td>
                    <td className="mono">₹{p.price}</td>
                    <td className="mono">{p.quantity} {p.unit}</td>
                    <td className="mono" style={{ color: 'var(--text2)' }}>{p.min_threshold}</td>
                    <td>
                      <div className="stock-bar-wrap">
                        <div className="stock-bar">
                          <div className={`stock-bar-fill ${fillClass}`} style={{ width: `${pct}%` }}></div>
                        </div>
                        <span className="mono" style={{ fontSize: '11px', color: 'var(--text2)' }}>{pct}%</span>
                      </div>
                    </td>
                    <td>
                      {st === 'ok' && <span className="badge badge-ok">OK</span>}
                      {st === 'warn' && <span className="badge badge-warn">WARNING</span>}
                      {st === 'low' && <span className="badge badge-low">LOW STOCK</span>}
                    </td>
                    <td>
                      <button
                        className="action-btn"
                        onClick={() => {
                          addToCart(p.id);
                          switchView('pos');
                        }}
                      >
                        Add to bill
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {lowStockProducts.length > 0 && (
        <div className="alert-panel" style={{ display: 'flex' }}>
          <span style={{ fontSize: '10px', color: 'var(--text2)', fontFamily: 'var(--mono)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', alignSelf: 'center' }}>
            ALERTS
          </span>
          {lowStockProducts.map((p) => (
            <div key={p.id} className="alert-chip">
              <div className="alert-dot"></div>
              {p.name} — {p.quantity} left (min {p.min_threshold})
            </div>
          ))}
        </div>
      )}

      {showRestockModal && (
        <div className="modal-overlay" onClick={() => setShowRestockModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">
              <span className="icon">◈</span> RESTOCK PRODUCT
            </div>
            
            <div style={{ marginBottom: '16px', textAlign: 'left' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: 'var(--text1)' }}>Select Product</label>
              <select 
                value={restockProductId} 
                onChange={(e) => setRestockProductId(e.target.value)}
                style={{ width: '100%', padding: '10px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text1)', outline: 'none' }}
              >
                <option value="" disabled>-- Select a product --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.quantity} {p.unit} in stock)</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '24px', textAlign: 'left' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: 'var(--text1)' }}>Quantity to Add</label>
              <input 
                type="number" 
                value={restockQty} 
                onChange={(e) => setRestockQty(e.target.value ? Number(e.target.value) : '')}
                min={1}
                placeholder="Enter quantity to restock"
                style={{ width: '100%', padding: '10px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text1)', outline: 'none' }}
              />
            </div>

            <div className="modal-actions" style={{ marginTop: '24px' }}>
              <button className="btn-secondary" onClick={() => setShowRestockModal(false)}>✕ Cancel</button>
              <button 
                className="btn-primary" 
                disabled={!restockProductId || !restockQty || Number(restockQty) <= 0}
                onClick={async () => {
                  if (!restockProductId || !restockQty || Number(restockQty) <= 0) return;
                  try {
                    await fetch(`${API_BASE_URL}/api/inventory/restock`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        product_id: restockProductId,
                        quantity_added: Number(restockQty)
                      })
                    });
                    showToast('✨ Restock successful');
                    setShowRestockModal(false);
                  } catch (e) {
                    console.error(e);
                  }
                }}
              >
                ✓ UPDATE STOCK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryStatus;
