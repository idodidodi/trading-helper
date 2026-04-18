'use client';

export default function AlertRow({ alert, onEdit, onDuplicate, onDelete, onToggle, displayName }) {
  const typeLabels = {
    price_above: '▲ Above',
    price_below: '▼ Below',
    bollinger_upper: '◈ BB Upper',
    bollinger_lower: '◈ BB Lower',
  };

  const typeClasses = {
    price_above: 'price-above',
    price_below: 'price-below',
    bollinger_upper: 'bollinger',
    bollinger_lower: 'bollinger',
  };

  const statusClass = !alert.is_active
    ? 'paused'
    : alert.is_triggered
    ? 'triggered'
    : 'active';

  function formatValue(val) {
    if (!val) return '—';
    const num = parseFloat(val);
    if (num >= 1000) return `$${num.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    if (num >= 1) return `$${num.toFixed(4)}`;
    if (num >= 0.001) return `$${num.toFixed(6)}`;
    return `$${num.toFixed(8)}`;
  }

  function formatTime(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <tr>
      <td>
        <span className={`status-dot ${statusClass}`} title={statusClass}></span>
      </td>
      <td style={{ fontWeight: 600 }}>{displayName || alert.ticker}</td>
      <td style={{ textTransform: 'capitalize' }}>{alert.platform}</td>
      <td>
        <span className={`alert-type-badge ${typeClasses[alert.alert_type] || ''}`}>
          {typeLabels[alert.alert_type] || alert.alert_type}
        </span>
      </td>
      <td>
        {alert.alert_type.startsWith('price_') ? (
          <span className="value">{formatValue(alert.target_value)}</span>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            P:{alert.bb_period} M:{alert.bb_multiplier} T:{alert.bb_timeframe}m
          </span>
        )}
      </td>
      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
        {formatTime(alert.last_triggered_at)}
      </td>
      <td>
        <div className="actions-cell">
          <button
            className="btn btn-ghost btn-sm btn-icon"
            onClick={() => onDuplicate(alert)}
            title="Duplicate"
          >
            📋
          </button>
          <button
            className="btn btn-ghost btn-sm btn-icon"
            onClick={() => onEdit(alert)}
            title="Edit"
          >
            ✏️
          </button>
          <button
            className="btn btn-ghost btn-sm btn-icon"
            onClick={() => onToggle(alert.id, !alert.is_active)}
            title={alert.is_active ? 'Pause' : 'Resume'}
          >
            {alert.is_active ? '⏸' : '▶️'}
          </button>
          <button
            className="btn btn-ghost btn-sm btn-icon"
            onClick={() => onDelete(alert.id)}
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </td>
    </tr>
  );
}
