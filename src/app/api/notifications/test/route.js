import { createClient } from '@/lib/supabase/server';
import { dispatchNotifications } from '@/lib/notifications/index';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (settingsError || !userSettings) {
      return Response.json({ error: 'Settings not found' }, { status: 404 });
    }

    const channelsNotified = [];
    const dummyAlert = {
      id: 'test-123',
      ticker: 'TEST/USD',
      alert_type: 'price_above',
      target_value: 50000,
    };
    const dummyPrice = 50500;
    
    let debugInfo = [];

    // Directly call the dispatch parts to trap the exact reason
    if (userSettings.telegram_enabled && userSettings.telegram_chat_id) {
       channelsNotified.push('telegram');
    }

    if (userSettings.web_push_enabled) {
      if (!userSettings.web_push_subscription) {
        debugInfo.push('Web push enabled but no subscription found in DB.');
      } else {
        const { sendWebPush } = require('@/lib/notifications/webpush');
        const payload = {
          title: `🔔 TEST/USD Alert!`,
          body: `PRICE ABOVE — Price: $50,500`,
          icon: '/favicon.ico',
        };
        try {
          const result = await sendWebPush(userSettings.web_push_subscription, payload);
          if (result === true) {
            channelsNotified.push('web_push');
          } else {
            debugInfo.push(`sendWebPush returned ${JSON.stringify(result)}`);
          }
        } catch (e) {
          debugInfo.push(`sendWebPush threw error: ${e.message}`);
        }
      }
    }

    // Still fire Telegram
    await dispatchNotifications(userSettings, dummyAlert, dummyPrice);

    return Response.json({
      message: `Test notification sent successfully via: ${channelsNotified.join(', ') || 'none'}`,
      channels: channelsNotified,
      debug: debugInfo
    });
  } catch (error) {
    console.error('Test notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
