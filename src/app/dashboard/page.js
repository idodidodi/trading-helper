'use client';

import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import AlertRow from '@/components/AlertRow';
import AlertForm from '@/components/AlertForm';
import { createClient } from '@/lib/supabase/client';

export default function DashboardPage() {
  const [alerts, setAlerts] = useState([]);
  const [pairs, setPairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [prices, setPrices] = useState({});
  const [visibleTickers, setVisibleTickers] = useState({}); // { ticker: boolean }

  // Fetch alerts
  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts');
      const data = await res.json();
      if (data.alerts) setAlerts(data.alerts);
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
    setLoading(false);
  }, []);

  // Fetch pairs
  const fetchPairs = useCallback(async () => {
    try {
      const res = await fetch('/api/kraken/pairs');
      const data = await res.json();
      if (data.pairs) setPairs(data.pairs);
    } catch (error) {
      console.error('Error loading pairs:', error);
    }
  }, []);

  // Fetch live prices for visible tickers
  const fetchPrices = useCallback(async () => {
    // Only fetch if tab is visible
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;

    // Filter to only tickers that are currently visible on screen
    const uniqueTickers = [...new Set(alerts.map((a) => a.ticker))];
    const tickersToFetch = uniqueTickers.filter(t => visibleTickers[t]);

    if (tickersToFetch.length === 0) return;
    
    try {
      const res = await fetch(`/api/kraken/ticker?pairs=${tickersToFetch.join(',')}`);
      const data = await res.json();
      if (data.prices) setPrices(data.prices);
    } catch (error) {
      console.error('Error fetching prices:', error);
    }
  }, [alerts]);

  useEffect(() => {
    fetchAlerts();
    fetchPairs();
  }, [fetchAlerts, fetchPairs]);

  // Refresh prices every 5 seconds for visible rows
  useEffect(() => {
    if (alerts.length === 0) return;
    fetchPrices();
    const interval = setInterval(fetchPrices, 5000);
    return () => clearInterval(interval);
  }, [alerts, fetchPrices, visibleTickers]);

  const handleVisibilityChange = useCallback((ticker, isVisible) => {
    setVisibleTickers(prev => ({
      ...prev,
      [ticker]: isVisible
    }));
  }, []);

  // Build a lookup: ticker symbol → human-readable name
  function getDisplayName(ticker) {
    const pair = pairs.find((p) => p.altname === ticker || p.id === ticker);
    return pair?.wsname || ticker;
  }

  // Smart price formatting (avoids "$0.1" for small values)
  function formatTickerPrice(price) {
    if (price === null || price === undefined) return '...';
    if (price >= 1000) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (price >= 1) return `$${price.toFixed(4)}`;
    if (price >= 0.001) return `$${price.toFixed(6)}`;
    return `$${price.toFixed(8)}`;
  }

  const [scanning, setScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [isLocalhost, setIsLocalhost] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsLocalhost(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('10.0.0.'));
    }
  }, []);

  // CRUD handlers
  async function handleScan() {
    setScanning(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/alerts/scan', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ type: 'success', text: data.message });
        await fetchAlerts();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Scan failed' });
      }
    } catch (error) {
      setStatusMessage({ type: 'error', text: 'Network error during scan' });
    } finally {
      setScanning(false);
      // Auto-clear message after 5 seconds
      setTimeout(() => setStatusMessage(null), 5000);
    }
  }

  async function handleSave(formData, isEditing) {
    const method = isEditing ? 'PUT' : 'POST';
    try {
      const res = await fetch('/api/alerts', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        await fetchAlerts();
        setShowForm(false);
        setEditingAlert(null);
      }
    } catch (error) {
      console.error('Error saving alert:', error);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this alert?')) return;
    try {
      await fetch(`/api/alerts?id=${id}`, { method: 'DELETE' });
      await fetchAlerts();
    } catch (error) {
      console.error('Error deleting alert:', error);
    }
  }

  async function handleToggle(id, isActive) {
    try {
      await fetch('/api/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: isActive, is_triggered: false }),
      });
      await fetchAlerts();
    } catch (error) {
      console.error('Error toggling alert:', error);
    }
  }

  function handleDuplicate(alert) {
    setEditingAlert({
      ...alert,
      id: undefined,
      is_triggered: false,
      last_triggered_at: null,
    });
    setShowForm(true);
  }

  function handleEdit(alert) {
    setEditingAlert(alert);
    setShowForm(true);
  }

  function handleNew() {
    setEditingAlert(null);
    setShowForm(true);
  }

  // Get display prices
  const uniqueTickers = [...new Set(alerts.map((a) => a.ticker))];

  return (
    <>
      <Navbar />
      <div className="dashboard">
        {/* Header */}
        <div className="dashboard-header">
          <h1>Price Alerts</h1>
        </div>

        {/* Global Status Message */}
        {statusMessage && (
          <div className={`status-alert ${statusMessage.type}`} style={{
            marginBottom: '20px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${statusMessage.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)'}`,
            color: statusMessage.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)',
            fontSize: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            animation: 'fadeIn 0.3s ease'
          }}>
            <span>{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '18px' }}>×</button>
          </div>
        )}

        {/* Active Alerts Section */}
        <div className="alerts-section">
          <div className="section-header">
            <h2>Active Alerts ({alerts.filter((a) => !a.is_triggered).length})</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              {isLocalhost && (
                <button 
                  className="btn btn-secondary" 
                  onClick={handleScan}
                  disabled={scanning}
                >
                  {scanning ? <span className="spinner"></span> : '🔍 Scan Alerts'}
                </button>
              )}
              <button className="btn btn-primary" onClick={handleNew}>
                + New Alert
              </button>
            </div>
          </div>

          {loading ? (
            <div className="page-loading">
              <div className="spinner" style={{ width: 32, height: 32 }}></div>
            </div>
          ) : alerts.length === 0 ? (
            <div className="glass-card">
              <div className="empty-state">
                <div className="icon">📊</div>
                <h3>No alerts yet</h3>
                <p>Create your first price alert to start monitoring crypto markets on Kraken.</p>
                <button className="btn btn-primary" onClick={handleNew}>
                  Create Your First Alert
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-card" style={{ overflow: 'hidden' }}>
              <table className="alerts-table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}></th>
                    <th>Ticker</th>
                    <th>Platform</th>
                    <th>Type</th>
                    <th>Target</th>
                    <th>Current Price</th>
                    <th>Diff %</th>
                    <th>Last Triggered</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.filter(a => !a.is_triggered).map((alert) => {
                    const priceEntry = Object.entries(prices).find(
                      ([key]) => key.toUpperCase().includes(alert.ticker.toUpperCase()) || key === alert.ticker
                    );
                    const currentPrice = priceEntry ? priceEntry[1].last : null;

                    return (
                      <AlertRow
                        key={alert.id}
                        alert={alert}
                        displayName={getDisplayName(alert.ticker)}
                        currentPrice={currentPrice}
                        onEdit={handleEdit}
                        onDuplicate={handleDuplicate}
                        onDelete={handleDelete}
                        onToggle={handleToggle}
                        onVisibilityChange={handleVisibilityChange}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Triggered History Section */}
        {alerts.some(a => a.is_triggered) && (
          <div className="alerts-section" style={{ marginTop: '48px' }}>
            <div className="section-header">
              <h2 style={{ color: 'var(--text-secondary)' }}>Alert History</h2>
            </div>
            
            <div className="glass-card" style={{ overflow: 'hidden', opacity: 0.8 }}>
              <table className="alerts-table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}></th>
                    <th>Ticker</th>
                    <th>Platform</th>
                    <th>Type</th>
                    <th>Target</th>
                    <th>Current Price</th>
                    <th>Diff %</th>
                    <th>Last Triggered</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.filter(a => a.is_triggered).map((alert) => {
                    const priceEntry = Object.entries(prices).find(
                      ([key]) => key.toUpperCase().includes(alert.ticker.toUpperCase()) || key === alert.ticker
                    );
                    const currentPrice = priceEntry ? priceEntry[1].last : null;

                    return (
                      <AlertRow
                        key={alert.id}
                        alert={alert}
                        displayName={getDisplayName(alert.ticker)}
                        currentPrice={currentPrice}
                        onEdit={handleEdit}
                        onDuplicate={handleDuplicate}
                        onDelete={handleDelete}
                        onToggle={handleToggle}
                        onVisibilityChange={handleVisibilityChange}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Alert Form Modal */}
      {showForm && (
        <AlertForm
          alert={editingAlert}
          pairs={pairs}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false);
            setEditingAlert(null);
          }}
        />
      )}
    </>
  );
}
