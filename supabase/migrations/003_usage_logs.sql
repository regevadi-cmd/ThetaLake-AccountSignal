-- Usage logs table for tracking AI and search expenses
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- User info
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,

  -- Request info
  company_name TEXT NOT NULL,

  -- AI provider details
  ai_provider TEXT NOT NULL, -- gemini, openai, anthropic, perplexity
  ai_model TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  ai_cost_usd DECIMAL(10, 6) DEFAULT 0,

  -- Search provider details
  search_provider TEXT, -- tavily, websearchapi, none
  search_queries INTEGER DEFAULT 0,
  search_cost_usd DECIMAL(10, 6) DEFAULT 0,

  -- Total cost
  total_cost_usd DECIMAL(10, 6) DEFAULT 0,

  -- Request metadata
  cached BOOLEAN DEFAULT FALSE,
  duration_ms INTEGER
);

-- Index for efficient queries
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at DESC);
CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_ai_provider ON usage_logs(ai_provider);

-- RLS policies
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins can view all usage logs" ON usage_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Users can view their own logs
CREATE POLICY "Users can view own usage logs" ON usage_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow inserts from authenticated users (server-side)
CREATE POLICY "Service can insert usage logs" ON usage_logs
  FOR INSERT
  WITH CHECK (true);

-- Cost alerts table
CREATE TABLE IF NOT EXISTS cost_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Thresholds (in USD)
  daily_threshold DECIMAL(10, 2) DEFAULT 10.00,
  weekly_threshold DECIMAL(10, 2) DEFAULT 50.00,
  monthly_threshold DECIMAL(10, 2) DEFAULT 200.00,

  -- Alert settings
  alert_email TEXT,
  alerts_enabled BOOLEAN DEFAULT TRUE,

  -- Last alert sent
  last_daily_alert TIMESTAMP WITH TIME ZONE,
  last_weekly_alert TIMESTAMP WITH TIME ZONE,
  last_monthly_alert TIMESTAMP WITH TIME ZONE
);

-- RLS for cost_alerts
ALTER TABLE cost_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage cost alerts" ON cost_alerts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
