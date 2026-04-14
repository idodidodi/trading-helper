import { getTradablePairs } from '@/lib/kraken';

export async function GET() {
  try {
    const allPairs = await getTradablePairs();
    
    // Simplify the pairs data for the frontend dropdown
    const pairs = Object.entries(allPairs)
      .filter(([key, val]) => {
        // Only include pairs with USD or EUR quotes that aren't dark pool (.d suffix)
        return !key.endsWith('.d') && (val.quote === 'ZUSD' || val.quote === 'USD' || val.quote === 'ZEUR' || val.quote === 'EUR');
      })
      .map(([key, val]) => ({
        id: key,
        wsname: val.wsname, // e.g., "BTC/USD"
        base: val.base,
        quote: val.quote,
        altname: val.altname, // e.g., "BTCUSD"
      }))
      .sort((a, b) => (a.wsname || '').localeCompare(b.wsname || ''));

    return Response.json({ pairs });
  } catch (error) {
    console.error('Error fetching pairs:', error);
    return Response.json({ error: 'Failed to fetch pairs' }, { status: 500 });
  }
}
