/**
 * Send a Telegram notification via the shared bot
 * @param {string} chatId - User's Telegram chat ID
 * @param {string} message - Alert message (supports HTML formatting)
 * @returns {Object} Telegram API response
 */
export async function sendTelegramAlert(chatId, message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN not configured');
    return { ok: false, error: 'Bot token not configured' };
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const data = await res.json();
    if (!data.ok) {
      console.error('Telegram send failed:', data.description);
    }
    return data;
  } catch (error) {
    console.error('Telegram send error:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Format an alert into a Telegram message
 * @param {Object} alert - Alert object from database
 * @param {number} currentPrice - Current price that triggered the alert
 * @returns {string} Formatted HTML message
 */
export function formatTelegramAlert(alert, currentPrice) {
  const direction = alert.alert_type === 'price_above' ? '📈' : 
                    alert.alert_type === 'price_below' ? '📉' :
                    alert.alert_type === 'bollinger_upper' ? '🔺' : 
                    alert.alert_type === 'bollinger_lower' ? '🔻' : '🔔';

  const typeLabel = {
    price_above: 'Price Above',
    price_below: 'Price Below',
    bollinger_upper: 'Bollinger Upper Cross',
    bollinger_lower: 'Bollinger Lower Cross',
  }[alert.alert_type] || alert.alert_type;

  let msg = `${direction} <b>ALERT TRIGGERED</b>\n\n`;
  msg += `<b>Ticker:</b> ${alert.ticker}\n`;
  msg += `<b>Platform:</b> ${alert.platform}\n`;
  msg += `<b>Type:</b> ${typeLabel}\n`;
  msg += `<b>Current Price:</b> $${currentPrice.toLocaleString()}\n`;
  
  if (alert.target_value) {
    msg += `<b>Target:</b> $${parseFloat(alert.target_value).toLocaleString()}\n`;
  }

  if (alert.notes) {
    msg += `\n📝 <i>${alert.notes}</i>`;
  }

  msg += `\n\n⏰ ${new Date().toLocaleString('en-US', { timeZone: 'UTC' })} UTC`;

  return msg;
}
