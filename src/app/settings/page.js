'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [botUsername, setBotUsername] = useState(null);

  useEffect(() => {
    loadSettings();
    fetchBotInfo();
  }, []);

  async function fetchBotInfo() {
    try {
      const res = await fetch('/api/telegram/info');
      const data = await res.json();
      if (data.username) setBotUsername(data.username);
    } catch (e) {
      console.error('Failed to fetch bot info:', e);
    }
  }

  async function loadSettings() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setSettings(data);
    } else {
      // Create default settings
      const { data: newSettings } = await supabase
        .from('user_settings')
        .insert({ user_id: user.id })
        .select()
        .single();
      setSettings(newSettings || {
        check_interval_seconds: 30,
        telegram_enabled: false,
        telegram_chat_id: '',
        web_push_enabled: true,
      });
    }
    setLoading(false);
  }

  async function saveSettings() {
    setSaving(true);
    setMessage('');

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('user_settings')
      .upsert({
        ...settings,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage('Settings saved successfully!');
    }
    setSaving(false);
    setTimeout(() => setMessage(''), 3000);
  }

  function updateField(field, value) {
    setSettings((prev) => ({ ...prev, [field]: value }));
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="page-loading">
          <div className="spinner" style={{ width: 32, height: 32 }}></div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="settings-page">
        <h1>Settings</h1>

        {message && (
          <div
            className={message.startsWith('Error') ? 'auth-error' : ''}
            style={{
              marginBottom: 20,
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
              ...(message.startsWith('Error')
                ? {}
                : {
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    color: 'var(--accent-green)',
                  }),
            }}
          >
            {message}
          </div>
        )}

        {/* Check Interval */}
        <div className="settings-section glass-card">
          <h2>⏱ Check Interval</h2>
          <p className="description">
            How often should we check your alert conditions? (Only whole cycles are evaluated per cron run)
          </p>
          <div className="input-group">
            <label>Interval (seconds)</label>
            <select
              className="select"
              value={settings?.check_interval_seconds || 30}
              onChange={(e) => updateField('check_interval_seconds', parseInt(e.target.value))}
            >
              <option value={15}>15 seconds</option>
              <option value={30}>30 seconds (default)</option>
              <option value={60}>1 minute</option>
              <option value={120}>2 minutes</option>
              <option value={300}>5 minutes</option>
            </select>
          </div>
        </div>

        {/* Telegram */}
        <div className="settings-section glass-card">
          <h2>📱 Telegram</h2>
          <p className="description">
            Receive alerts on your phone via Telegram. Start our bot and enter your Chat ID.
          </p>

          <div className="settings-row">
            <div className="label-group">
              <h3>Enable Telegram Alerts</h3>
              <p>Send notifications via Telegram bot</p>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings?.telegram_enabled || false}
                onChange={(e) => updateField('telegram_enabled', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {settings?.telegram_enabled && (
            <div style={{ marginTop: 16 }}>
              <div className="input-group">
                <label>Telegram Chat ID</label>
                <input
                  className="input"
                  placeholder="e.g. 123456789"
                  value={settings?.telegram_chat_id || ''}
                  onChange={(e) => updateField('telegram_chat_id', e.target.value)}
                />
              </div>
              <div
                style={{
                  marginTop: 12,
                  padding: 14,
                  background: 'var(--bg-glass)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.8,
                }}
              >
                <strong>How to get your Chat ID:</strong>
                <ol style={{ paddingLeft: 20, marginTop: 6 }}>
                  <li>Open Telegram and search for <strong>@userinfobot</strong></li>
                  <li>Copy the ID and paste it in the field above</li>
                  <li>
                    <strong>Final Step:</strong> Click{' '}
                    {botUsername ? (
                      <a 
                        href={`https://t.me/${botUsername}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: 'var(--accent-cyan)', fontWeight: 600, textDecoration: 'underline' }}
                      >
                        here to open @{botUsername}
                      </a>
                    ) : (
                      "to find our bot"
                    )}{' '}
                    and click <strong>Start</strong> so it has permission to message you.
                  </li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Web Push */}
        <div className="settings-section glass-card">
          <h2>🔔 Web Push</h2>
          <p className="description">
            Receive browser notifications with alert sounds (requires browser permission).
          </p>

          <div className="settings-row">
            <div className="label-group">
              <h3>Enable Web Push</h3>
              <p>Show browser notifications when alerts trigger</p>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings?.web_push_enabled || false}
                onChange={(e) => updateField('web_push_enabled', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        {/* Save button */}
        <button
          className="btn btn-primary"
          onClick={saveSettings}
          disabled={saving}
          style={{ width: '100%', padding: 14, fontSize: 15 }}
        >
          {saving ? <span className="spinner"></span> : 'Save Settings'}
        </button>
      </div>
    </>
  );
}
