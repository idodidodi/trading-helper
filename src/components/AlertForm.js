'use client';

import { useState, useEffect } from 'react';

export default function AlertForm({ alert, onSave, onClose, pairs }) {
  const isEditing = !!alert?.id;

  const [form, setForm] = useState({
    ticker: alert?.ticker || '',
    platform: alert?.platform || 'kraken',
    alert_type: alert?.alert_type || 'price_above',
    target_value: alert?.target_value || '',
    bb_period: alert?.bb_period || 20,
    bb_multiplier: alert?.bb_multiplier || 2.0,
    bb_timeframe: alert?.bb_timeframe || 60,
    notes: alert?.notes || '',
  });

  const [loading, setLoading] = useState(false);
  const [pairSearch, setPairSearch] = useState('');
  const [showPairDropdown, setShowPairDropdown] = useState(false);

  const isBollinger = form.alert_type.startsWith('bollinger_');

  const filteredPairs = (pairs || []).filter((p) =>
    (p.wsname || p.altname || '').toLowerCase().includes(pairSearch.toLowerCase())
  ).slice(0, 20);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSelectPair(pair) {
    setForm((prev) => ({ ...prev, ticker: pair.altname || pair.id }));
    setPairSearch(pair.wsname || pair.altname);
    setShowPairDropdown(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...form,
      target_value: isBollinger ? null : parseFloat(form.target_value) || null,
    };

    if (isEditing) {
      payload.id = alert.id;
    }

    await onSave(payload, isEditing);
    setLoading(false);
  }

  useEffect(() => {
    if (alert?.ticker) {
      const found = (pairs || []).find(
        (p) => p.altname === alert.ticker || p.id === alert.ticker
      );
      setPairSearch(found?.wsname || alert.ticker);
    }
  }, [alert, pairs]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal glass-card" onClick={(e) => e.stopPropagation()}>
        <h2>{isEditing ? 'Edit Alert' : 'New Alert'}</h2>

        <form className="modal-form" onSubmit={handleSubmit}>
          {/* Ticker Search */}
          <div className="input-group" style={{ position: 'relative' }}>
            <label>Ticker</label>
            <input
              className="input"
              placeholder="Search pairs (e.g. BTC/USD)"
              value={pairSearch}
              onChange={(e) => {
                setPairSearch(e.target.value);
                setShowPairDropdown(true);
              }}
              onFocus={() => setShowPairDropdown(true)}
              autoComplete="off"
            />
            {showPairDropdown && filteredPairs.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  maxHeight: 200,
                  overflowY: 'auto',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  zIndex: 10,
                  marginTop: 4,
                }}
              >
                {filteredPairs.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPair(p)}
                    style={{
                      padding: '8px 14px',
                      cursor: 'pointer',
                      fontSize: 13,
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.target.style.background = 'var(--bg-input-focus)')}
                    onMouseLeave={(e) => (e.target.style.background = 'transparent')}
                  >
                    <strong>{p.wsname || p.altname}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Platform */}
          <div className="input-group">
            <label>Platform</label>
            <select
              className="select"
              value={form.platform}
              onChange={(e) => handleChange('platform', e.target.value)}
            >
              <option value="kraken">Kraken</option>
            </select>
          </div>

          {/* Alert Type */}
          <div className="input-group">
            <label>Alert Type</label>
            <div className="type-selector">
              {[
                { value: 'price_above', label: '▲ Price Above' },
                { value: 'price_below', label: '▼ Price Below' },
                { value: 'bollinger_upper', label: '◈ BB Upper Cross' },
                { value: 'bollinger_lower', label: '◈ BB Lower Cross' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`type-option ${form.alert_type === opt.value ? 'selected' : ''}`}
                  onClick={() => handleChange('alert_type', opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price target (for price alerts) */}
          {!isBollinger && (
            <div className="input-group">
              <label>Target Price ($)</label>
              <input
                className="input"
                type="number"
                step="any"
                placeholder="e.g. 70000"
                value={form.target_value}
                onChange={(e) => handleChange('target_value', e.target.value)}
                required
              />
            </div>
          )}

          {/* Bollinger settings */}
          {isBollinger && (
            <div className="modal-form">
              <div className="form-row">
                <div className="input-group">
                  <label>Period</label>
                  <input
                    className="input"
                    type="number"
                    value={form.bb_period}
                    onChange={(e) => handleChange('bb_period', parseInt(e.target.value))}
                    min={5}
                    max={200}
                  />
                </div>
                <div className="input-group">
                  <label>Multiplier (σ)</label>
                  <input
                    className="input"
                    type="number"
                    step="0.1"
                    value={form.bb_multiplier}
                    onChange={(e) => handleChange('bb_multiplier', parseFloat(e.target.value))}
                    min={0.5}
                    max={5}
                  />
                </div>
              </div>
              <div className="input-group">
                <label>Timeframe (minutes)</label>
                <select
                  className="select"
                  value={form.bb_timeframe}
                  onChange={(e) => handleChange('bb_timeframe', parseInt(e.target.value))}
                >
                  <option value={1}>1 min</option>
                  <option value={5}>5 min</option>
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={60}>1 hour</option>
                  <option value={240}>4 hours</option>
                  <option value={1440}>1 day</option>
                </select>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="input-group">
            <label>Notes (optional)</label>
            <input
              className="input"
              placeholder="e.g. Major resistance level"
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner"></span> : isEditing ? 'Update' : 'Create Alert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
