import { sendTelegramAlert, formatTelegramAlert } from './telegram.js';
import { sendWebPush } from './webpush.js';

/**
 * Dispatch alert notifications to all enabled channels for a user
 * @param {Object} userSettings - User's notification settings from DB
 * @param {Object} alert - The triggered alert
 * @param {number} currentPrice - Current price that triggered the alert
 * @returns {string[]} List of channels that were notified
 */
export async function dispatchNotifications(userSettings, alert, currentPrice) {
  const channelsNotified = [];
  const promises = [];

  // 1. Telegram
  if (userSettings.telegram_enabled && userSettings.telegram_chat_id) {
    const message = formatTelegramAlert(alert, currentPrice);
    promises.push(
      sendTelegramAlert(userSettings.telegram_chat_id, message)
        .then((res) => {
          if (res.ok) channelsNotified.push('telegram');
        })
        .catch((err) => console.error('Telegram dispatch error:', err))
    );
  }

  // 2. Web Push
  if (userSettings.web_push_enabled && userSettings.web_push_subscription) {
    const payload = {
      title: `🔔 ${alert.ticker} Alert!`,
      body: `${alert.alert_type.replace('_', ' ').toUpperCase()} — Price: $${currentPrice.toLocaleString()}`,
      icon: '/favicon.ico',
      data: {
        alertId: alert.id,
        ticker: alert.ticker,
        price: currentPrice,
        playSound: true,
      },
    };
    promises.push(
      sendWebPush(userSettings.web_push_subscription, payload)
        .then((res) => {
          if (res === true) channelsNotified.push('web_push');
        })
        .catch((err) => console.error('Web push dispatch error:', err))
    );
  }

  await Promise.allSettled(promises);
  return channelsNotified;
}
