import { createAdminClient } from '@/lib/supabase/server';
import { getTickerPrice, getOHLC, extractPrice, getFuturesTickerPrice, isFuturesSymbol } from '@/lib/kraken';
import { checkBollingerCrossing } from '@/lib/bollinger';
import { dispatchNotifications } from '@/lib/notifications/index';

/**
 * Shared logic to check all active alerts and trigger notifications
 * @returns {Promise<Object>} Results of the scan
 */
export async function runAlertCheck() {
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

    let activeAlerts = alerts;
    if (alertsError) {
      const { data: plainAlerts } = await supabase
        .from('alerts')
        .select('*')
        .eq('is_active', true)
        .eq('is_triggered', false);
      
      activeAlerts = plainAlerts || [];
    }

    if (!activeAlerts || activeAlerts.length === 0) {
      return { message: 'No active alerts', ...results };
    }

    // 2. Deduplicate tickers across all users and split by type
    const uniquePairs = [...new Set(activeAlerts.map((a) => a.ticker))];
    const spotPairs = uniquePairs.filter((p) => !isFuturesSymbol(p));
    const futuresPairs = uniquePairs.filter((p) => isFuturesSymbol(p));
    
    // 3. Batch fetch prices
    let prices = {};
    try {
      if (spotPairs.length > 0) {
        const tickerData = await getTickerPrice(spotPairs);
        for (const [key, data] of Object.entries(tickerData)) {
          prices[key] = extractPrice(data);
        }
      }
      if (futuresPairs.length > 0) {
        const futuresData = await getFuturesTickerPrice(futuresPairs);
        for (const [key, data] of Object.entries(futuresData)) {
          prices[key] = data.last;
        }
      }
    } catch (error) {
      throw new Error(`Failed to fetch prices: ${error.message}`);
    }

    // 4. Handle Bollinger OHLC data
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

    // 5. Evaluate and trigger
    const triggeredAlerts = [];
    
    for (const alert of activeAlerts) {
      results.checked++;
      
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
            const crossing = checkBollingerCrossing(candles, alert.bb_period, alert.bb_multiplier);
            shouldTrigger = alert.alert_type === 'bollinger_upper' ? crossing.crossedUpper : crossing.crossedLower;
          }
          break;
        }
      }

      if (shouldTrigger) {
        triggeredAlerts.push({ alert, currentPrice });
      }
    }

    // 6. Process triggers
    for (const { alert, currentPrice } of triggeredAlerts) {
      try {
        let userSettings = alert.user_settings;
        if (!userSettings) {
          const { data: settings } = await supabase.from('user_settings').select('*').eq('user_id', alert.user_id).single();
          userSettings = settings || {};
        }

        const channelsNotified = await dispatchNotifications(userSettings, alert, currentPrice);

        await supabase
          .from('alerts')
          .update({
            is_triggered: true,
            last_triggered_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq('id', alert.id);

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
        results.errors.push(`Alert ${alert.id} error: ${error.message}`);
      }
    }

    return results;
  } catch (error) {
    console.error('Core engine error:', error);
    throw error;
  }
}

function findPriceForTicker(prices, ticker) {
  if (prices[ticker] !== undefined) return prices[ticker];
  const normalizedTicker = ticker.toUpperCase();
  for (const [key, price] of Object.entries(prices)) {
    if (key.toUpperCase().includes(normalizedTicker) ||
        key.toUpperCase().replace('XX', '').replace('XB', 'B').replace('ZUSD', 'USD').replace('ZEUR', 'EUR') === normalizedTicker) {
      return price;
    }
  }
  return null;
}
