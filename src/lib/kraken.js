// Kraken public API — no authentication needed
const KRAKEN_BASE = 'https://api.kraken.com/0/public';

/**
 * Get current ticker prices for one or more pairs
 * @param {string[]} pairs - e.g., ['BTCUSD', 'ETHUSD']
 * @returns {Object} Ticker data keyed by Kraken pair name
 */
export async function getTickerPrice(pairs) {
  const res = await fetch(`${KRAKEN_BASE}/Ticker?pair=${pairs.join(',')}`, {
    next: { revalidate: 0 }, // Always fresh
  });
  const data = await res.json();
  if (data.error && data.error.length > 0) {
    throw new Error(`Kraken API error: ${data.error.join(', ')}`);
  }
  return data.result;
}

/**
 * Get OHLC candlestick data for Bollinger Band calculation
 * @param {string} pair - e.g., 'BTCUSD'
 * @param {number} interval - Minutes: 1, 5, 15, 30, 60, 240, 1440, 10080, 21600
 * @returns {Object} OHLC data array + last timestamp
 */
export async function getOHLC(pair, interval = 60) {
  const res = await fetch(`${KRAKEN_BASE}/OHLC?pair=${pair}&interval=${interval}`, {
    next: { revalidate: 0 },
  });
  const data = await res.json();
  if (data.error && data.error.length > 0) {
    throw new Error(`Kraken OHLC error: ${data.error.join(', ')}`);
  }
  // Result has the pair key + "last" timestamp
  const pairKey = Object.keys(data.result).find((k) => k !== 'last');
  return {
    candles: data.result[pairKey], // Array of [time, open, high, low, close, vwap, volume, count]
    last: data.result.last,
  };
}

/**
 * Get all tradable asset pairs from Kraken
 * @returns {Object} All pair information
 */
export async function getTradablePairs() {
  const res = await fetch(`${KRAKEN_BASE}/AssetPairs`, {
    next: { revalidate: 3600 }, // Cache for 1 hour — pairs don't change often
  });
  const data = await res.json();
  if (data.error && data.error.length > 0) {
    throw new Error(`Kraken pairs error: ${data.error.join(', ')}`);
  }
  return data.result;
}

/**
 * Extract last close price from ticker data
 * @param {Object} tickerData - Single ticker result from Kraken
 * @returns {number} Last trade close price
 */
export function extractPrice(tickerData) {
  // c = last trade closed [price, lot volume]
  return parseFloat(tickerData.c[0]);
}

/**
 * Normalize user-friendly pair name to Kraken format
 * Common pairs map (user might type BTC/USD but Kraken uses XXBTZUSD)
 */
export function normalizePair(pair) {
  return pair.replace('/', '').toUpperCase();
}
