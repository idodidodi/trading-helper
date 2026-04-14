import { getTickerPrice } from '@/lib/kraken';

export async function GET(request) {
  const { searchParams } = request.nextUrl;
  const pairs = searchParams.get('pairs');

  if (!pairs) {
    return Response.json({ error: 'pairs parameter required' }, { status: 400 });
  }

  try {
    const pairList = pairs.split(',').map((p) => p.trim());
    const tickerData = await getTickerPrice(pairList);

    // Extract just the essential price info
    const prices = {};
    for (const [key, data] of Object.entries(tickerData)) {
      prices[key] = {
        last: parseFloat(data.c[0]),
        volume: parseFloat(data.v[1]), // 24h volume
        high: parseFloat(data.h[1]),   // 24h high
        low: parseFloat(data.l[1]),    // 24h low
        open: parseFloat(data.o),      // Today's opening
      };
    }

    return Response.json({ prices });
  } catch (error) {
    console.error('Error fetching ticker:', error);
    return Response.json({ error: 'Failed to fetch ticker data' }, { status: 500 });
  }
}
