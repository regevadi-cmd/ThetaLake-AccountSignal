import { SupabaseClient } from '@supabase/supabase-js';
import {
  calculateAICost,
  calculateSearchCost,
  estimateTokens,
  TAVILY_QUERIES_PER_ANALYSIS,
} from '@/lib/config/pricing';

export interface UsageLogEntry {
  userId?: string;
  userEmail?: string;
  companyName: string;
  aiProvider: string;
  aiModel: string;
  promptText: string;
  responseText: string;
  searchProvider: string;
  searchQueriesUsed?: number;
  cached: boolean;
  durationMs?: number;
}

/**
 * Log usage and costs to the database
 */
export async function logUsage(
  supabase: SupabaseClient,
  entry: UsageLogEntry
): Promise<void> {
  try {
    // Estimate tokens
    const inputTokens = estimateTokens(entry.promptText);
    const outputTokens = estimateTokens(entry.responseText);

    // Calculate costs
    const aiCost = entry.cached ? 0 : calculateAICost(
      entry.aiProvider,
      entry.aiModel,
      inputTokens,
      outputTokens
    );

    const searchQueries = entry.cached ? 0 : (entry.searchQueriesUsed ?? TAVILY_QUERIES_PER_ANALYSIS);
    const searchCost = entry.cached ? 0 : calculateSearchCost(entry.searchProvider, searchQueries);

    const totalCost = aiCost + searchCost;

    // Insert log entry
    const { error } = await supabase
      .from('usage_logs')
      .insert({
        user_id: entry.userId || null,
        user_email: entry.userEmail || null,
        company_name: entry.companyName,
        ai_provider: entry.aiProvider,
        ai_model: entry.aiModel,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        ai_cost_usd: aiCost,
        search_provider: entry.searchProvider,
        search_queries: searchQueries,
        search_cost_usd: searchCost,
        total_cost_usd: totalCost,
        cached: entry.cached,
        duration_ms: entry.durationMs || null,
      });

    if (error) {
      console.error('Failed to log usage:', error);
    }
  } catch (err) {
    // Don't fail the request if logging fails
    console.error('Usage logging error:', err);
  }
}

export interface UsageSummary {
  totalRequests: number;
  totalCost: number;
  aiCost: number;
  searchCost: number;
  byProvider: Record<string, { requests: number; cost: number }>;
  byUser: Record<string, { email: string; requests: number; cost: number }>;
}

/**
 * Get usage summary for a time period
 */
export async function getUsageSummary(
  supabase: SupabaseClient,
  startDate: Date,
  endDate: Date
): Promise<UsageSummary> {
  const { data, error } = await supabase
    .from('usage_logs')
    .select('*')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch usage:', error);
    return {
      totalRequests: 0,
      totalCost: 0,
      aiCost: 0,
      searchCost: 0,
      byProvider: {},
      byUser: {},
    };
  }

  const summary: UsageSummary = {
    totalRequests: data.length,
    totalCost: 0,
    aiCost: 0,
    searchCost: 0,
    byProvider: {},
    byUser: {},
  };

  for (const log of data) {
    const totalCost = parseFloat(log.total_cost_usd) || 0;
    const aiCost = parseFloat(log.ai_cost_usd) || 0;
    const searchCost = parseFloat(log.search_cost_usd) || 0;

    summary.totalCost += totalCost;
    summary.aiCost += aiCost;
    summary.searchCost += searchCost;

    // By provider
    const provider = log.ai_provider;
    if (!summary.byProvider[provider]) {
      summary.byProvider[provider] = { requests: 0, cost: 0 };
    }
    summary.byProvider[provider].requests++;
    summary.byProvider[provider].cost += totalCost;

    // By user
    const userId = log.user_id || 'anonymous';
    if (!summary.byUser[userId]) {
      summary.byUser[userId] = { email: log.user_email || 'Anonymous', requests: 0, cost: 0 };
    }
    summary.byUser[userId].requests++;
    summary.byUser[userId].cost += totalCost;
  }

  return summary;
}

/**
 * Check if costs exceed thresholds and return alerts
 */
export async function checkCostAlerts(
  supabase: SupabaseClient
): Promise<{ daily: boolean; weekly: boolean; monthly: boolean; thresholds: { daily: number; weekly: number; monthly: number }; current: { daily: number; weekly: number; monthly: number } }> {
  // Get alert settings
  const { data: alertSettings } = await supabase
    .from('cost_alerts')
    .select('*')
    .single();

  const thresholds = {
    daily: parseFloat(alertSettings?.daily_threshold) || 10,
    weekly: parseFloat(alertSettings?.weekly_threshold) || 50,
    monthly: parseFloat(alertSettings?.monthly_threshold) || 200,
  };

  // Calculate current costs
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [dailySummary, weeklySummary, monthlySummary] = await Promise.all([
    getUsageSummary(supabase, startOfDay, now),
    getUsageSummary(supabase, startOfWeek, now),
    getUsageSummary(supabase, startOfMonth, now),
  ]);

  return {
    daily: dailySummary.totalCost >= thresholds.daily,
    weekly: weeklySummary.totalCost >= thresholds.weekly,
    monthly: monthlySummary.totalCost >= thresholds.monthly,
    thresholds,
    current: {
      daily: dailySummary.totalCost,
      weekly: weeklySummary.totalCost,
      monthly: monthlySummary.totalCost,
    },
  };
}
