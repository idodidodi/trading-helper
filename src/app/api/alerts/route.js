import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ alerts: data });
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { platform, ticker, alert_type, target_value, bb_period, bb_multiplier, bb_timeframe, notes } = body;

  if (!ticker || !alert_type) {
    return Response.json({ error: 'ticker and alert_type are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('alerts')
    .insert({
      user_id: user.id,
      platform: platform || 'kraken',
      ticker,
      alert_type,
      target_value: target_value || null,
      bb_period: bb_period || 20,
      bb_multiplier: bb_multiplier || 2.0,
      bb_timeframe: bb_timeframe || 60,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ alert: data }, { status: 201 });
}

export async function PUT(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return Response.json({ error: 'Alert id is required' }, { status: 400 });
  }

  // Remove fields that shouldn't be updated
  delete updates.user_id;
  delete updates.created_at;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('alerts')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id) // Ensure user owns this alert
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ alert: data });
}

export async function DELETE(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const id = searchParams.get('id');

  if (!id) {
    return Response.json({ error: 'Alert id is required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('alerts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
