import { createAdminClient } from '@/lib/supabase/server';
import { getTickerPrice, getOHLC, extractPrice } from '@/lib/kraken';
import { checkBollingerCrossing } from '@/lib/bollinger';
import { dispatchNotifications } from '@/lib/notifications/index';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const results = { checked: 0, triggered: 0, errors: [] };

  try {
    // 1. Fetch all active alerts with their user settings
    const { data: alerts, error: alertsError } = await supabase
      .from('alerts')
      .select(`
        *,
        user_settings!alerts_user_id_fkey (
          check_interval_seconds,
          telegram_chat_id,
          telegram_enabled,
          discord_webhook_url,
          discord_enabled,
          email_alerts_enabled,
          web_push_enabled,
          web_push_subscription
        )
      `)
      .eq('is_active', true)
      .eq('is_triggered', false);

    // If the join doesn't work (no FK relationship), fetch separately
    let activeAlerts = alerts;
    if (alertsError) {
      // Fallback: fetch alerts and settings separately
      const { data: plainAlerts } = await supabase
        .from('alerts')
        .select('*')
        .eq('is_active', true)
        .eq('is_triggered', false);
      
      activeAlerts = plainAlerts || [];
    }

    if (!activeAlerts || activeAlerts.length === 0) {
      return Response.json({ message: 'No active alerts', ...results });
    }

    // 2. Deduplicate tickers across all users
    const uniquePairs = [...new Set(activeAlerts.map((a) => a.ticker))];
    
    // 3. Batch fetch all prices in one call
    let prices = {};
    try {
      const tickerData = await getTickerPrice(uniquePairs);
      for (const [key, data] of Object.entries(tickerData)) {
        prices[key] = extractPrice(data);
      }
    } catch (error) {
      results.errors.push(`Ticker fetch error: ${error.message}`);
      return Response.json({ error: 'Failed to fetch prices', ...results }, { status: 500 });
    }

    // 4. For Bollinger alerts, fetch OHLC data
    const bollingerAlerts = activeAlerts.filter((a) =>
      a.alert_type === 'bollinger_upper' || a.alert_type === 'bollinger_lower'
    );
    const ohlcCache = {};
    for (const alert of bollingerAlerts) {
      const cacheKey = `${alert.ticker}_${alert.bb_timeframe}`;
      if (!ohlcCache[cacheKey]) {
        try {
          const ohlcData = await getOHLC(alert.ticker, alert.bb_timeframe);
          ohlcCache[cacheKey] = ohlcData.candles;
        } catch (error) {
          results.errors.push(`OHLC fetch error for ${alert.ticker}: ${error.message}`);
        }
      }
    }

    // 5. Evaluate each alert
    const triggeredAlerts = [];
    
    for (const alert of activeAlerts) {
      results.checked++;
      
      // Find the price for this ticker (Kraken uses different internal names)
      const currentPrice = findPriceForTicker(prices, alert.ticker);
      if (currentPrice === null) continue;

      let shouldTrigger = false;

      switch (alert.alert_type) {
        case 'price_above':
          shouldTrigger = currentPrice >= parseFloat(alert.target_value);
          break;
        case 'price_below':
          shouldTrigger = currentPrice <= parseFloat(alert.target_value);
          break;
        case 'bollinger_upper':
        case 'bollinger_lower': {
          const cacheKey = `${alert.ticker}_${alert.bb_timeframe}`;
          const candles = ohlcCache[cacheKey];
          if (candles) {
            const crossing = checkBollingerCrossing(
              candles,
              alert.bb_period,
              alert.bb_multiplier
            );
            shouldTrigger = alert.alert_type === 'bollinger_upper'
              ? crossing.crossedUpper
              : crossing.crossedLower;
          }
          break;
        }
      }

      if (shouldTrigger) {
        triggeredAlerts.push({ alert, currentPrice });
      }
    }

    // 6. Process triggered alerts
    for (const { alert, currentPrice } of triggeredAlerts) {
      try {
        // Get user settings (from join or separate query)
        let userSettings = alert.user_settings;
        if (!userSettings) {
          const { data: settings } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', alert.user_id)
            .single();
          userSettings = settings || {};
        }

        // Dispatch notifications
        const channelsNotified = await dispatchNotifications(
          userSettings,
          alert,
          currentPrice
        );

        // Mark alert as triggered
        await supabase
          .from('alerts')
          .update({
            is_triggered: true,
            last_triggered_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq('id', alert.id);

        // Log to history
        await supabase.from('alert_history').insert({
          alert_id: alert.id,
          user_id: alert.user_id,
          ticker: alert.ticker,
          alert_type: alert.alert_type,
          target_value: alert.target_value,
          triggered_value: currentPrice,
          channels_notified: channelsNotified,
        });

        results.triggered++;
      } catch (error) {
        results.errors.push(`Alert ${alert.id} processing error: ${error.message}`);
      }
    }

    return Response.json({
      message: `Checked ${results.checked} alerts, triggered ${results.triggered}`,
      ...results,
    });
  } catch (error) {
    console.error('Cron check-prices error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Find the price for a ticker in the Kraken response
 * Kraken uses weird internal names like XXBTZUSD for BTCUSD
 */
function findPriceForTicker(prices, ticker) {
  // Direct match
  if (prices[ticker] !== undefined) return prices[ticker];
  
  // Try common Kraken name mappings
  const normalizedTicker = ticker.toUpperCase();
  for (const [key, price] of Object.entries(prices)) {
    if (key.toUpperCase().includes(normalizedTicker) ||
        key.toUpperCase().replace('XX', '').replace('XB', 'B').replace('ZUSD', 'USD').replace('ZEUR', 'EUR') === normalizedTicker) {
      return price;
    }
  }
  
  return null;
}
