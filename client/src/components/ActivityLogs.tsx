import React from 'react';
import type { Log } from '../App';
import { Clock, ShoppingCart, TrendingUp, ClipboardList, Info, Activity } from 'lucide-react';

interface ActivityLogsProps {
  logs: Log[];
}

const ActivityLogs: React.FC<ActivityLogsProps> = ({ logs }) => {
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const stats = {
    totalSales: logs.filter((l) => l.type === 'SALE').length,
    totalAdditions: logs.filter((l) => l.type === 'TELEGRAM_ADDITION').length,
  };

  return (
    <div id="logs-view" className="view active" style={{ flexDirection: 'column', padding: '20px', overflowY: 'auto' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <ClipboardList size={20} color="var(--accent)" />
        </div>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text0)', margin: 0, letterSpacing: '-0.5px' }}>
            Activity Logs
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text2)', margin: '4px 0 0 0' }}>
            Transaction history & audit trail
          </p>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="stat-cards" style={{ borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-label">Total Sales</div>
          <div className="stat-val" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {stats.totalSales}
            <ShoppingCart size={16} color="var(--accent)" />
          </div>
          <div className="stat-sub">transactions completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Stock Additions</div>
          <div className="stat-val" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {stats.totalAdditions}
            <TrendingUp size={16} color="var(--blue)" />
          </div>
          <div className="stat-sub">via Telegram</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Events</div>
          <div className="stat-val">{logs.length}</div>
          <div className="stat-sub">recorded in system</div>
        </div>
      </div>

      {/* TIMELINE */}
      <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg2)', border: '1px solid var(--border2)' }}>
            <Activity size={16} color="var(--text0)" />
          </div>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text0)', margin: 0 }}>Recent Activity</h2>
        </div>

        {logs.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', color: 'var(--text2)' }}>
            <ClipboardList size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p style={{ fontSize: '13px' }}>No activity logs yet</p>
          </div>
        ) : (
          <div style={{ position: 'relative', paddingLeft: '8px' }}>
            <div style={{ position: 'absolute', left: '15px', top: '10px', bottom: '10px', width: '2px', background: 'var(--border)' }}></div>
            
            {logs.map((log, index) => {
              const isSale = log.type === 'SALE';
              const isLatest = index === 0;

              return (
                <div key={log.id} style={{ position: 'relative', paddingLeft: '32px', marginBottom: '20px' }} className="log-item">
                  {/* Timeline Dot */}
                  <div style={{ 
                    position: 'absolute', 
                    left: '4px', 
                    top: '6px', 
                    width: '10px', 
                    height: '10px', 
                    borderRadius: '50%', 
                    background: isSale ? 'var(--accent)' : 'var(--blue)',
                    boxShadow: '0 0 0 4px var(--bg1)',
                    zIndex: 10
                  }}></div>

                  <div style={{ 
                    background: 'var(--bg2)', 
                    border: isLatest ? `1px solid ${isSale ? 'var(--accent)' : 'var(--blue)'}` : '1px solid var(--border)',
                    borderRadius: '8px', 
                    padding: '16px',
                    transition: 'all 0.2s'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={{ 
                        display: 'flex', alignItems: 'center', gap: '6px', 
                        padding: '4px 10px', borderRadius: '20px', 
                        fontSize: '11px', fontWeight: 600,
                        background: isSale ? 'var(--accent-dim)' : 'var(--blue-dim)',
                        color: isSale ? 'var(--accent)' : 'var(--blue)',
                        border: `1px solid ${isSale ? 'rgba(0,229,160,0.2)' : 'rgba(77,159,255,0.2)'}`
                      }}>
                        {isSale ? <ShoppingCart size={12} /> : <TrendingUp size={12} />}
                        {isSale ? 'SALE' : 'STOCK ADDITION'}
                      </span>
                      {isLatest && (
                        <span style={{ 
                          padding: '2px 8px', background: 'var(--red-dim)', color: 'var(--red)', 
                          borderRadius: '20px', fontSize: '9px', fontWeight: 700, 
                          textTransform: 'uppercase', letterSpacing: '0.5px',
                          border: '1px solid rgba(255,77,106,0.2)'
                        }}>
                          Latest
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text0)', margin: '0 0 8px 0', lineHeight: 1.5 }}>
                      {log.details}
                    </p>
                    <p style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text2)', margin: 0, fontFamily: 'var(--mono)' }}>
                      <Clock size={12} />
                      {formatTime(log.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* INFO FOOTER */}
      <div style={{ marginTop: '24px', display: 'flex', alignItems: 'flex-start', gap: '12px', background: 'var(--bg2)', padding: '16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        <Info size={16} color="var(--text2)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <p style={{ fontSize: '12px', color: 'var(--text1)', margin: 0, lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--text0)' }}>Activity Timeline</strong> — All
          transactions (POS sales and Telegram stock updates) are logged here for audit and inventory
          tracking purposes.
        </p>
      </div>

    </div>
  );
};

export default ActivityLogs;
