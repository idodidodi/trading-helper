/**
 * Calculate Bollinger Bands from OHLC candle data
 * 
 * @param {Array} candles - Kraken OHLC data: [time, open, high, low, close, vwap, volume, count]
 * @param {number} period - Number of periods for SMA (default 20)
 * @param {number} multiplier - Standard deviation multiplier (default 2.0)
 * @returns {Object} { upper, middle, lower, bandwidth, percentB }
 */
export function calculateBollingerBands(candles, period = 20, multiplier = 2.0) {
  if (!candles || candles.length < period) {
    return null;
  }

  // Extract close prices (index 4 in Kraken OHLC)
  const closes = candles.slice(-period).map((c) => parseFloat(c[4]));

  // Calculate SMA (middle band)
  const sma = closes.reduce((sum, price) => sum + price, 0) / period;

  // Calculate standard deviation
  const squaredDiffs = closes.map((price) => Math.pow(price - sma, 2));
  const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / period;
  const stdDev = Math.sqrt(variance);

  const upper = sma + multiplier * stdDev;
  const lower = sma - multiplier * stdDev;
  const bandwidth = ((upper - lower) / sma) * 100; // As percentage
  
  // Current price position within bands (0 = at lower, 1 = at upper)
  const currentPrice = closes[closes.length - 1];
  const percentB = (currentPrice - lower) / (upper - lower);

  return {
    upper,
    middle: sma,
    lower,
    bandwidth,
    percentB,
    currentPrice,
    stdDev,
  };
}

/**
 * Check if price is crossing Bollinger Band edges
 * @param {Array} candles - At least period+1 candles to detect crossing
 * @param {number} period
 * @param {number} multiplier
 * @returns {Object} { crossedUpper, crossedLower }
 */
export function checkBollingerCrossing(candles, period = 20, multiplier = 2.0) {
  if (!candles || candles.length < period + 1) {
    return { crossedUpper: false, crossedLower: false };
  }

  // Current band values
  const current = calculateBollingerBands(candles, period, multiplier);
  // Previous band values (exclude last candle)
  const previous = calculateBollingerBands(candles.slice(0, -1), period, multiplier);

  if (!current || !previous) {
    return { crossedUpper: false, crossedLower: false };
  }

  const prevPrice = parseFloat(candles[candles.length - 2][4]);
  const currPrice = current.currentPrice;

  return {
    crossedUpper: prevPrice <= previous.upper && currPrice > current.upper,
    crossedLower: prevPrice >= previous.lower && currPrice < current.lower,
    bands: current,
  };
}
