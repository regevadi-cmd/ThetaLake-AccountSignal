import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUsageSummary, checkCostAlerts } from '@/lib/services/usageLogger';

interface UsageResponse {
  today: UsagePeriod;
  thisWeek: UsagePeriod;
  thisMonth: UsagePeriod;
  allTime: UsagePeriod;
  alerts: {
    daily: boolean;
    weekly: boolean;
    monthly: boolean;
    thresholds: { daily: number; weekly: number; monthly: number };
    current: { daily: number; weekly: number; monthly: number };
  };
  recentLogs: RecentLog[];
}

interface UsagePeriod {
  totalRequests: number;
  totalCost: number;
  aiCost: number;
  searchCost: number;
  byProvider: Record<string, { requests: number; cost: number }>;
  bySearchProvider: Record<string, { queries: number; cost: number }>;
  byUser: Record<string, { email: string; requests: number; cost: number }>;
}

interface RecentLog {
  id: string;
  createdAt: string;
  userEmail: string | null;
  companyName: string;
  aiProvider: string;
  aiModel: string;
  totalCost: number;
  cached: boolean;
}

// GET /api/usage - Get usage summary (admin only)
export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const profileData = profile as { role: string } | null;
    if (!profileData || profileData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Calculate time ranges
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfAllTime = new Date(2020, 0, 1); // Far back enough

    // Get summaries for each period
    const [today, thisWeek, thisMonth, allTime, alerts] = await Promise.all([
      getUsageSummary(supabase, startOfDay, now),
      getUsageSummary(supabase, startOfWeek, now),
      getUsageSummary(supabase, startOfMonth, now),
      getUsageSummary(supabase, startOfAllTime, now),
      checkCostAlerts(supabase),
    ]);

    // Get recent logs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: recentLogsData } = await (supabase as any)
      .from('usage_logs')
      .select('id, created_at, user_email, company_name, ai_provider, ai_model, total_cost_usd, cached')
      .order('created_at', { ascending: false })
      .limit(20);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recentLogs: RecentLog[] = (recentLogsData || []).map((log: any) => ({
      id: log.id,
      createdAt: log.created_at,
      userEmail: log.user_email,
      companyName: log.company_name,
      aiProvider: log.ai_provider,
      aiModel: log.ai_model,
      totalCost: parseFloat(log.total_cost_usd) || 0,
      cached: log.cached,
    }));

    const response: UsageResponse = {
      today,
      thisWeek,
      thisMonth,
      allTime,
      alerts,
      recentLogs,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Usage API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/usage - Update cost alert thresholds (admin only)
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const profileData = profile as { role: string } | null;
    if (!profileData || profileData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { dailyThreshold, weeklyThreshold, monthlyThreshold, alertsEnabled } = body;

    // Check if settings exist
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from('cost_alerts')
      .select('id')
      .single();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (dailyThreshold !== undefined) updateData.daily_threshold = dailyThreshold;
    if (weeklyThreshold !== undefined) updateData.weekly_threshold = weeklyThreshold;
    if (monthlyThreshold !== undefined) updateData.monthly_threshold = monthlyThreshold;
    if (alertsEnabled !== undefined) updateData.alerts_enabled = alertsEnabled;

    if (existing) {
      // Update existing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('cost_alerts')
        .update(updateData)
        .eq('id', existing.id);
    } else {
      // Insert new
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('cost_alerts')
        .insert({
          ...updateData,
          daily_threshold: dailyThreshold ?? 10,
          weekly_threshold: weeklyThreshold ?? 50,
          monthly_threshold: monthlyThreshold ?? 200,
          alerts_enabled: alertsEnabled ?? true,
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Usage API PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
