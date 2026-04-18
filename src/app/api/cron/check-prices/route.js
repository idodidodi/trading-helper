import { runAlertCheck } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await runAlertCheck();
    return Response.json({
      message: `Checked ${results.checked} alerts, triggered ${results.triggered}`,
      ...results,
    });
  } catch (error) {
    console.error('Cron check-prices error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
