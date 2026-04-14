-- Alert Manager — Database Migration
-- Run this in your Supabase SQL Editor (supabase.com/dashboard → SQL Editor → New Query)

-- ============================================
-- Table: user_settings
-- ============================================
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    check_interval_seconds INTEGER DEFAULT 30,
    telegram_chat_id TEXT,
    telegram_enabled BOOLEAN DEFAULT false,
    discord_webhook_url TEXT,
    discord_enabled BOOLEAN DEFAULT false,
    email_alerts_enabled BOOLEAN DEFAULT false,
    web_push_enabled BOOLEAN DEFAULT true,
    web_push_subscription JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Table: alerts
-- ============================================
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL DEFAULT 'kraken',
    ticker TEXT NOT NULL,
    alert_type TEXT NOT NULL,
    target_value DECIMAL,
    bb_period INTEGER DEFAULT 20,
    bb_multiplier DECIMAL DEFAULT 2.0,
    bb_timeframe INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT true,
    is_triggered BOOLEAN DEFAULT false,
    last_triggered_at TIMESTAMPTZ,
    repeat_after_minutes INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Table: alert_history
-- ============================================
CREATE TABLE IF NOT EXISTS alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID REFERENCES alerts(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ticker TEXT NOT NULL,
    alert_type TEXT NOT NULL,
    target_value DECIMAL,
    triggered_value DECIMAL,
    channels_notified TEXT[],
    triggered_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;

-- Policies for user_settings
CREATE POLICY "Users can view own settings" ON user_settings
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON user_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- Policies for alerts
CREATE POLICY "Users can view own alerts" ON alerts
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own alerts" ON alerts
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts" ON alerts
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own alerts" ON alerts
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for alert_history
CREATE POLICY "Users can view own history" ON alert_history
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own history" ON alert_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_alerts_user_active ON alerts(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_alerts_ticker ON alerts(ticker);
CREATE INDEX IF NOT EXISTS idx_alert_history_user ON alert_history(user_id, triggered_at DESC);
