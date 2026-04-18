import { createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from('alerts').select('count', { count: 'exact', head: true });
    
    if (error) {
      return Response.json({ status: 'error', message: error.message, details: error }, { status: 500 });
    }
    
    return Response.json({ status: 'ok', message: 'Connection to Supabase successful', count: data });
  } catch (error) {
    return Response.json({ status: 'exception', message: error.message }, { status: 500 });
  }
}
