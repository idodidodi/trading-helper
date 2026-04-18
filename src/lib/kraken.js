// Kraken public API — no authentication needed
const KRAKEN_BASE = 'https://api.kraken.com/0/public';
const FUTURES_BASE = 'https://futures.kraken.com/derivatives/api/v3';

/**
 * Check if a symbol is a Kraken Futures symbol (PF_ or PI_ prefix)
 */
export function isFuturesSymbol(symbol) {
  return /^(PF_|PI_)/i.test(symbol);
}

// ===== SPOT API =====

/**
 * Get current ticker prices for one or more spot pairs
 * @param {string[]} pairs - e.g., ['BTCUSD', 'ETHUSD']
 * @returns {Object} Ticker data keyed by Kraken pair name
 */
export async function getTickerPrice(pairs) {
  const res = await fetch(`${KRAKEN_BASE}/Ticker?pair=${pairs.join(',')}`, {
    next: { revalidate: 0 },
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
  const pairKey = Object.keys(data.result).find((k) => k !== 'last');
  return {
    candles: data.result[pairKey],
    last: data.result.last,
  };
}

/**
 * Get all tradable asset pairs from Kraken (spot)
 * @returns {Object} All pair information
 */
export async function getTradablePairs() {
  const res = await fetch(`${KRAKEN_BASE}/AssetPairs`, {
    next: { revalidate: 3600 },
  });
  const data = await res.json();
  if (data.error && data.error.length > 0) {
    throw new Error(`Kraken pairs error: ${data.error.join(', ')}`);
  }
  return data.result;
}

/**
 * Extract last close price from spot ticker data
 * @param {Object} tickerData - Single ticker result from Kraken
 * @returns {number} Last trade close price
 */
export function extractPrice(tickerData) {
  // c = last trade closed [price, lot volume]
  return parseFloat(tickerData.c[0]);
}

/**
 * Normalize user-friendly pair name to Kraken format
 */
export function normalizePair(pair) {
  return pair.replace('/', '').toUpperCase();
}

// ===== FUTURES API =====

/**
 * Fetch all perpetual futures tickers from Kraken Futures
 * @returns {Array} Array of perpetual ticker objects
 */
export async function getFuturesTickers() {
  const res = await fetch(`${FUTURES_BASE}/tickers`, {
    next: { revalidate: 0 },
  });
  const data = await res.json();
  if (data.result !== 'success') {
    throw new Error('Kraken Futures API error');
  }
  // Filter to perpetual contracts only (tag === "perpetual")
  return data.tickers.filter((t) => t.tag === 'perpetual');
}

/**
 * Fetch price for specific futures symbols
 * @param {string[]} symbols - e.g., ['PF_XBTUSD', 'PF_DOGEUSD']
 * @returns {Object} Prices keyed by symbol { PF_XBTUSD: { last, markPrice, ... } }
 */
export async function getFuturesTickerPrice(symbols) {
  // The futures /tickers endpoint returns ALL tickers — we fetch once and filter
  const allTickers = await getFuturesTickers();
  const prices = {};
  const symbolSet = new Set(symbols.map((s) => s.toUpperCase()));

  for (const ticker of allTickers) {
    if (symbolSet.has(ticker.symbol.toUpperCase())) {
      prices[ticker.symbol] = {
        last: ticker.last ?? ticker.markPrice,
        markPrice: ticker.markPrice,
        high: ticker.high24h,
        low: ticker.low24h,
        open: ticker.open24h,
        volume: ticker.vol24h,
      };
    }
  }
  return prices;
}
