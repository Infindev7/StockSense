import { useState, useEffect, useCallback } from 'react';
import './App.css';
import { API_BASE_URL } from './config';
import BillingCounter from './components/BillingCounter';
import InventoryStatus from './components/InventoryStatus';
import ActivityLogs from './components/ActivityLogs';

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  min_threshold: number;
  unit: string;
  status?: string;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
}

export interface Log {
  id: string;
  type: 'SALE' | 'TELEGRAM_ADDITION';
  details: string;
  timestamp: string;
}



type ViewKey = 'pos' | 'inv' | 'logs';

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<{ [id: string]: number }>({});
  const [logs, setLogs] = useState<Log[]>([
    {
      id: 'l1',
      type: 'SALE',
      details: 'System initialized',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [activeView, setActiveView] = useState<ViewKey>('pos');
  const [time, setTime] = useState<string>('');

  const [toastMsg, setToastMsg] = useState<string>('');
  const [showToastObj, setShowToastObj] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      setTime(new Date().toLocaleTimeString('en-IN', { hour12: false }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchInventory = async () => {
      let data = null;

      // Helper to fetch with timeout so it doesn't hang indefinitely
      const fetchWithTimeout = async (url: string, timeout = 5000) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        return res;
      };

      try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/api/inventory`);
        if (response.ok) {
          data = await response.json();
        }
      } catch (error) {
        console.warn('Backend API failed or timed out:', error);
      }

      if (data) {
        const payload = Array.isArray(data) ? data[0] : data;

        if (payload?.success && Array.isArray(payload.products)) {
          const fetchedProducts: Product[] = payload.products.map((p: any) => ({
            id: p.product_id,
            name: p.name,
            category: p.category,
            price: p.price,
            quantity: p.quantity,
            min_threshold: p.min_threshold,
            unit: p.unit,
            status: p.status,
          }));

          if (fetchedProducts.length > 0) {
            setProducts(fetchedProducts);
          }
        }
      } else {
        console.error('Failed to fetch data from both webhooks.');
      }
    };

    fetchInventory(); // Initial fetch
    const syncInterval = setInterval(fetchInventory, 5000); // Ping every 5 seconds

    return () => clearInterval(syncInterval);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setShowToastObj(true);
    setTimeout(() => setShowToastObj(false), 2200);
  }, []);

  const updateProductStock = useCallback((productId: string, quantitySold: number) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, quantity: Math.max(0, p.quantity - quantitySold) }
          : p
      )
    );
  }, []);

  const addLog = useCallback((type: 'SALE' | 'TELEGRAM_ADDITION', details: string) => {
    setLogs((prev) => [
      {
        id: `l${Date.now()}`,
        type,
        details,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
  }, []);

  return (
    <>
      <header className="topbar">
        <div className="logo">
          <div className="logo-dot"></div>
          STOCKSENSE
        </div>
        <div className="tabs">
          <button
            className={`tab ${activeView === 'pos' ? 'active' : ''}`}
            onClick={() => setActiveView('pos')}
          >
            ⬡ POS Billing
          </button>
          <button
            className={`tab ${activeView === 'inv' ? 'active' : ''}`}
            onClick={() => setActiveView('inv')}
          >
            ▦ Inventory
          </button>
          <button
            className={`tab ${activeView === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveView('logs')}
          >
            ≡ Activity Logs
          </button>
        </div>
        <div className="topbar-right">
          <div className="status-pill">
            <div className="status-dot"></div>Backend Connected
          </div>
          <div id="clock">{time || '--:--:--'}</div>
          <span style={{ color: 'var(--border2)' }}>|</span>
          <span style={{ color: 'var(--text1)' }}>
            Cashier: <span style={{ color: 'var(--text0)' }}>Soham P.</span>
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      {activeView === 'pos' && (
        <BillingCounter
          products={products}
          cart={cart}
          setCart={setCart}
          updateProductStock={updateProductStock}
          addLog={addLog}
          showToast={showToast}
        />
      )}
      {activeView === 'inv' && (
        <InventoryStatus
          products={products}
          switchView={setActiveView}
          addToCart={(id) => {
            const p = products.find(x => x.id === id);
            if (!p) return;
            if (cart[id] >= p.quantity) {
              showToast('⚠ Max stock reached for ' + p.name);
              return;
            }
            setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
            showToast('+ ' + p.name);
          }}
          showToast={showToast}
        />
      )}
      {activeView === 'logs' && (
        <ActivityLogs logs={logs} />
      )}

      {/* Toast Notification */}
      <div className={`toast-container ${showToastObj ? 'show' : ''}`}>
        {toastMsg}
      </div>
    </>
  );
}

export default App;
