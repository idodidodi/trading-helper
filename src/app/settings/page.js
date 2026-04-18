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

  const [diagnostic, setDiagnostic] = useState('');

  useEffect(() => {
    loadSettings();
    fetchBotInfo();
    // Pre-register service worker if supported
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
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

  const [testingNotifications, setTestingNotifications] = useState(false);

  async function testNotification() {
    // Force save settings before testing to ensure we use the latest Chat ID
    await saveSettings();
    setTestingNotifications(true);
    try {
      const res = await fetch('/api/notifications/test', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        let msg = data.message;
        /* if (data.debug && data.debug.length > 0) {
          msg += ' [Debug: ' + data.debug.join(', ') + ']';
        } */
        setMessage(msg);
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (e) {
      setMessage(`Error: Failed to test notifications (${e.message})`);
    } finally {
      setTestingNotifications(false);
    }
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

        {/* {(message || diagnostic) && (
          <div
            className={message.startsWith('Error') ? 'auth-error' : ''}
            style={{
              marginBottom: 20,
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
              background: message.startsWith('Error') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              border: `1px solid ${message.startsWith('Error') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
              color: message.startsWith('Error') ? '#ef4444' : 'var(--accent-green)',
            }}
          >
            {message && <div style={{ fontWeight: 600, marginBottom: diagnostic ? 8 : 0 }}>{message}</div>}
            {diagnostic && (
              <div style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 11 }}>
                {diagnostic}
                {(diagnostic.includes('Direct Sent') || diagnostic.includes('SW Sent')) && (
                  <div style={{ marginTop: 8, color: 'var(--accent-cyan)', fontStyle: 'italic', fontFamily: 'var(--font-main)' }}>
                    💡 If you see "Sent" above but no popup, please check <strong>System Settings {'->'} Notifications {'->'} Google Chrome</strong> on your Mac.
                  </div>
                )}
              </div>
            )}
          </div>
        )} */}
        {message && (
          <div
            className={message.startsWith('Error') ? 'auth-error' : ''}
            style={{
              marginBottom: 20,
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
              background: message.startsWith('Error') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              border: `1px solid ${message.startsWith('Error') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
              color: message.startsWith('Error') ? '#ef4444' : 'var(--accent-green)',
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
                  <li>Send any message to it, and it will reply with a number (your <strong>Chat ID</strong>)</li>
                  <li>Copy that ID and paste it in the field above</li>
                  <li>
                    <strong>Final Step: </strong>
                    {botUsername ? (
                      <>
                        Click{' '}
                        <a 
                          href={`https://t.me/${botUsername}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: 'var(--accent-cyan)', fontWeight: 600, textDecoration: 'underline' }}
                        >
                          here to open @{botUsername}
                        </a>
                        {' '}and click <strong>Start</strong> so the bot has permission to message you.
                      </>
                    ) : (
                      "Please ask your platform administrator for the link to the official Alert Bot. Open it and click Start so it has permission to message you."
                    )}
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
                onChange={async (e) => {
                  const isEnabled = e.target.checked;
                  
                  if (!isEnabled) {
                    setSettings(prev => ({ ...prev, web_push_enabled: false, web_push_subscription: null }));
                    return;
                  }

                  // Handle enabling push
                  try {
                    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                      throw new Error('Push notifications are not supported by your browser.');
                    }

                    const permission = await Notification.requestPermission();
                    if (permission !== 'granted') {
                      throw new Error('Notification permission was denied.');
                    }

                    const registration = await navigator.serviceWorker.register('/sw.js');
                    await navigator.serviceWorker.ready;

                    // Unsubscribe existing if any, to avoid conflicts
                    const existingSubscription = await registration.pushManager.getSubscription();
                    if (existingSubscription) {
                      await existingSubscription.unsubscribe();
                    }

                    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
                    if (!vapidPublicKey) {
                      throw new Error('VAPID public key is missing in environment variables.');
                    }

                    const padding = '='.repeat((4 - (vapidPublicKey.length % 4)) % 4);
                    const base64 = (vapidPublicKey + padding).replace(/-/g, '+').replace(/_/g, '/');
                    const rawData = window.atob(base64);
                    const outputArray = new Uint8Array(rawData.length);
                    for (let i = 0; i < rawData.length; ++i) {
                      outputArray[i] = rawData.charCodeAt(i);
                    }

                    const subscription = await registration.pushManager.subscribe({
                      userVisibleOnly: true,
                      applicationServerKey: outputArray,
                    });

                    setSettings(prev => ({
                      ...prev,
                      web_push_enabled: true,
                      web_push_subscription: JSON.parse(JSON.stringify(subscription)),
                    }));

                    setMessage('Push notifications enabled successfully! Please click Save Settings.');
                  } catch (err) {
                    console.error('Push setup error:', err);
                    setMessage(`Error: ${err.message}`);
                    setSettings(prev => ({ ...prev, web_push_enabled: false }));
                  }
                }}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {/* <button
            className="btn btn-secondary"
            onClick={async () => {
              try {
                let status = [];
                // 0. Connection check
                status.push(navigator.onLine ? '🌐 Online' : '🔌 Offline');

                // 1. Check Context
                status.push(window.isSecureContext ? '✅ Secure' : '❌ Insecure');
                
                // 2. Check Permissions
                status.push(`Permission: ${Notification.permission}`);

                // 3. Try to show notification directly first
                if (Notification.permission === 'granted') {
                   try {
                     const n = new Notification('Direct Test', { body: 'If you see this, your OS is NOT blocking notifications.' });
                     status.push('🚀 Direct Sent');
                   } catch (e) {
                     status.push(`❌ Direct Fail: ${e.message}`);
                   }
                }

                // 4. Service Worker State
                const reg = await navigator.serviceWorker.getRegistration();
                if (reg) {
                   const state = reg.active ? 'active' : reg.waiting ? 'waiting' : reg.installing ? 'installing' : 'none';
                   status.push(`SW: ${state}`);
                   
                   await reg.showNotification('Service Worker Test', { 
                     body: 'Testing notification via background worker.',
                     icon: '/favicon.ico',
                     tag: 'sw-test'
                   });
                   status.push('🚀 SW Sent');
                } else {
                   status.push('❌ No SW');
                }
                
                setDiagnostic(`Diagnostic: ${status.join(' | ')}`);
              } catch(e) {
                setDiagnostic('Error: ' + e.message);
              }
            }}
            disabled={saving || testingNotifications}
            style={{ flex: 1, padding: 14, fontSize: 13 }}
            title="Deep diagnostics for notification issues"
          >
            💻 Local OS Test
          </button>

          <button
            className="btn btn-secondary"
            onClick={async () => {
              if (!confirm('This will unregister the service worker and clear push settings. Continue?')) return;
              try {
                const regs = await navigator.serviceWorker.getRegistrations();
                for (let reg of regs) {
                  await reg.unsubscribe && (await reg.getSubscription())?.unsubscribe();
                  await reg.unregister();
                }
                updateField('web_push_enabled', false);
                updateField('web_push_subscription', null);
                setDiagnostic('Service Worker reset successfully. Refresh and try enabling Web Push again.');
              } catch (e) {
                setDiagnostic('Reset Error: ' + e.message);
              }
            }}
            disabled={saving || testingNotifications}
            style={{ flex: 1, padding: 14, fontSize: 13 }}
          >
            🔄 Reset Push
          </button> */}

          <button
            className="btn btn-secondary"
            onClick={testNotification}
            disabled={saving || testingNotifications}
            style={{ flex: 1, padding: 14, fontSize: 15 }}
          >
            {testingNotifications ? <span className="spinner"></span> : '🔔 Test Notifications'}
          </button>
          
          <button
            className="btn btn-primary"
            onClick={saveSettings}
            disabled={saving || testingNotifications}
            style={{ flex: 1, padding: 14, fontSize: 15 }}
          >
            {saving ? <span className="spinner"></span> : 'Save Settings'}
          </button>
        </div>
      </div>
    </>
  );
}
