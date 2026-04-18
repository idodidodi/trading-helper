import { runAlertCheck } from '@/lib/engine';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await runAlertCheck();
    return Response.json({
      message: `Manual scan complete: ${results.checked} alerts checked, ${results.triggered} triggered.`,
      ...results,
    });
  } catch (error) {
    console.error('Manual scan error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
