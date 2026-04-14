import webpush from 'web-push';

/**
 * Send a Web Push notification
 * @param {Object} subscription - Push subscription object from the browser
 * @param {Object} payload - { title, body, icon, data }
 * @returns {boolean} Success status
 */
export async function sendWebPush(subscription, payload) {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail = process.env.VAPID_EMAIL || 'mailto:alerts@example.com';

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('VAPID keys not configured, skipping web push');
    return false;
  }

  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify(payload)
    );
    return true;
  } catch (error) {
    console.error('Web push failed:', error);
    // If subscription is invalid (410 Gone), we should remove it
    if (error.statusCode === 410) {
      return { expired: true };
    }
    return false;
  }
}
