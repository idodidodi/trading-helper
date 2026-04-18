import { getTickerPrice, getFuturesTickerPrice, isFuturesSymbol } from '@/lib/kraken';

export async function GET(request) {
  const { searchParams } = request.nextUrl;
  const pairs = searchParams.get('pairs');

  if (!pairs) {
    return Response.json({ error: 'pairs parameter required' }, { status: 400 });
  }

  try {
    const pairList = pairs.split(',').map((p) => p.trim());

    // Split into spot and futures
    const spotPairs = pairList.filter((p) => !isFuturesSymbol(p));
    const futuresPairs = pairList.filter((p) => isFuturesSymbol(p));

    const prices = {};

    // Fetch spot prices
    if (spotPairs.length > 0) {
      const tickerData = await getTickerPrice(spotPairs);
      for (const [key, data] of Object.entries(tickerData)) {
        prices[key] = {
          last: parseFloat(data.c[0]),
          volume: parseFloat(data.v[1]),
          high: parseFloat(data.h[1]),
          low: parseFloat(data.l[1]),
          open: parseFloat(data.o),
        };
      }
    }

    // Fetch futures prices
    if (futuresPairs.length > 0) {
      const futuresData = await getFuturesTickerPrice(futuresPairs);
      for (const [key, data] of Object.entries(futuresData)) {
        prices[key] = {
          last: data.last,
          volume: data.volume,
          high: data.high,
          low: data.low,
          open: data.open,
        };
      }
    }

    return Response.json({ prices });
  } catch (error) {
    console.error('Error fetching ticker:', error);
    return Response.json({ error: 'Failed to fetch ticker data' }, { status: 500 });
  }
}
