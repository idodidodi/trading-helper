export const dynamic = 'force-dynamic';

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!token || token === 'your_telegram_bot_token') {
    return Response.json({ error: 'Bot token not configured' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await res.json();
    
    if (data.ok) {
      return Response.json({ 
        username: data.result.username,
        first_name: data.result.first_name 
      });
    } else {
      return Response.json({ error: 'Failed to fetch bot info' }, { status: 500 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
