import { getTradablePairs, getFuturesTickers } from '@/lib/kraken';

export async function GET() {
  try {
    // Fetch spot pairs and futures tickers in parallel
    const [allPairs, futuresTickers] = await Promise.all([
      getTradablePairs(),
      getFuturesTickers().catch(() => []), // Graceful fallback if futures API fails
    ]);

    // === Spot pairs ===
    const spotPairs = Object.entries(allPairs)
      .filter(([key, val]) => {
        return !key.endsWith('.d') && (val.quote === 'ZUSD' || val.quote === 'USD' || val.quote === 'ZEUR' || val.quote === 'EUR');
      })
      .map(([key, val]) => ({
        id: key,
        wsname: val.wsname,
        base: val.base,
        quote: val.quote,
        altname: val.altname,
        type: 'spot',
      }));

    // === Futures perpetuals ===
    const futuresPairs = futuresTickers
      .filter((t) => t.pair && !t.suspended)
      .map((t) => {
        // t.pair is like "XBT:USD", "DOGE:USD", "ETH:USD"
        const [base, quote] = t.pair.split(':');
        const displayName = `${base}/${quote} Perp`;
        return {
          id: t.symbol,            // e.g. "PF_XBTUSD"
          wsname: displayName,     // e.g. "XBT/USD Perp"
          base: base,
          quote: quote,
          altname: t.symbol,       // Use the symbol as altname for storage
          type: 'perpetual',
        };
      });

    // Merge and sort
    const pairs = [...spotPairs, ...futuresPairs].sort((a, b) =>
      (a.wsname || '').localeCompare(b.wsname || '')
    );

    return Response.json({ pairs });
  } catch (error) {
    console.error('Error fetching pairs:', error);
    return Response.json({ error: 'Failed to fetch pairs' }, { status: 500 });
  }
}
