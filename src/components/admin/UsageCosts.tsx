'use client';

import { useState, useEffect, useCallback } from 'react';
import { DollarSign, TrendingUp, AlertTriangle, RefreshCw, Users, Cpu, Search, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCost } from '@/lib/config/pricing';

interface UsagePeriod {
  totalRequests: number;
  totalCost: number;
  aiCost: number;
  searchCost: number;
  byProvider: Record<string, { requests: number; cost: number }>;
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

interface UsageData {
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

export function UsageCosts() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingThresholds, setEditingThresholds] = useState(false);
  const [thresholds, setThresholds] = useState({ daily: 10, weekly: 50, monthly: 200 });

  const fetchUsage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/usage');
      if (!response.ok) {
        throw new Error('Failed to fetch usage data');
      }
      const usageData = await response.json();
      setData(usageData);
      setThresholds(usageData.alerts.thresholds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const saveThresholds = async () => {
    try {
      const response = await fetch('/api/usage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dailyThreshold: thresholds.daily,
          weeklyThreshold: thresholds.weekly,
          monthlyThreshold: thresholds.monthly,
        }),
      });
      if (!response.ok) throw new Error('Failed to save thresholds');
      setEditingThresholds(false);
      fetchUsage();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error}</p>
        <Button variant="outline" onClick={fetchUsage}>Retry</Button>
      </div>
    );
  }

  if (!data) return null;

  const hasAlerts = data.alerts.daily || data.alerts.weekly || data.alerts.monthly;

  return (
    <div className="space-y-6">
      {/* Alerts Banner */}
      {hasAlerts && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Cost Alert</span>
          </div>
          <div className="text-sm text-amber-300/80 space-y-1">
            {data.alerts.daily && (
              <p>Daily threshold exceeded: {formatCost(data.alerts.current.daily)} / {formatCost(data.alerts.thresholds.daily)}</p>
            )}
            {data.alerts.weekly && (
              <p>Weekly threshold exceeded: {formatCost(data.alerts.current.weekly)} / {formatCost(data.alerts.thresholds.weekly)}</p>
            )}
            {data.alerts.monthly && (
              <p>Monthly threshold exceeded: {formatCost(data.alerts.current.monthly)} / {formatCost(data.alerts.thresholds.monthly)}</p>
            )}
          </div>
        </div>
      )}

      {/* Cost Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <CostCard title="Today" data={data.today} />
        <CostCard title="This Week" data={data.thisWeek} />
        <CostCard title="This Month" data={data.thisMonth} />
        <CostCard title="All Time" data={data.allTime} />
      </div>

      {/* Breakdown Section */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* By Provider */}
        <div className="bg-card/50 border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            By Provider (This Month)
          </h3>
          <div className="space-y-2">
            {Object.entries(data.thisMonth.byProvider).length > 0 ? (
              Object.entries(data.thisMonth.byProvider).map(([provider, stats]) => (
                <div key={provider} className="flex justify-between text-sm">
                  <span className="text-muted-foreground capitalize">{provider}</span>
                  <span className="text-foreground">
                    {stats.requests} req · {formatCost(stats.cost)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">No data yet</p>
            )}
          </div>
        </div>

        {/* By User */}
        <div className="bg-card/50 border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            By User (This Month)
          </h3>
          <div className="space-y-2">
            {Object.entries(data.thisMonth.byUser).length > 0 ? (
              Object.entries(data.thisMonth.byUser).map(([userId, stats]) => (
                <div key={userId} className="flex justify-between text-sm">
                  <span className="text-muted-foreground truncate max-w-[150px]">{stats.email}</span>
                  <span className="text-foreground">
                    {stats.requests} req · {formatCost(stats.cost)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">No data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Thresholds */}
      <div className="bg-card/50 border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Alert Thresholds
          </h3>
          {!editingThresholds ? (
            <Button variant="ghost" size="sm" onClick={() => setEditingThresholds(true)}>
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditingThresholds(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={saveThresholds}>
                Save
              </Button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Daily</label>
            {editingThresholds ? (
              <Input
                type="number"
                value={thresholds.daily}
                onChange={(e) => setThresholds(t => ({ ...t, daily: parseFloat(e.target.value) || 0 }))}
                className="h-8 mt-1"
              />
            ) : (
              <p className="text-foreground font-medium">{formatCost(thresholds.daily)}</p>
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Weekly</label>
            {editingThresholds ? (
              <Input
                type="number"
                value={thresholds.weekly}
                onChange={(e) => setThresholds(t => ({ ...t, weekly: parseFloat(e.target.value) || 0 }))}
                className="h-8 mt-1"
              />
            ) : (
              <p className="text-foreground font-medium">{formatCost(thresholds.weekly)}</p>
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Monthly</label>
            {editingThresholds ? (
              <Input
                type="number"
                value={thresholds.monthly}
                onChange={(e) => setThresholds(t => ({ ...t, monthly: parseFloat(e.target.value) || 0 }))}
                className="h-8 mt-1"
              />
            ) : (
              <p className="text-foreground font-medium">{formatCost(thresholds.monthly)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-card/50 border border-border rounded-lg p-4">
        <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Recent Activity
        </h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {data.recentLogs.length > 0 ? (
            data.recentLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
                <div className="flex-1 min-w-0">
                  <span className="text-foreground truncate block">{log.companyName}</span>
                  <span className="text-muted-foreground text-xs">
                    {log.userEmail || 'Unknown'} · {log.aiProvider}
                    {log.cached && <span className="text-blue-400 ml-1">(cached)</span>}
                  </span>
                </div>
                <div className="text-right">
                  <span className={log.cached ? 'text-muted-foreground' : 'text-emerald-400'}>
                    {formatCost(log.totalCost)}
                  </span>
                  <span className="text-muted-foreground text-xs block">
                    {new Date(log.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">No activity yet</p>
          )}
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={fetchUsage}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
    </div>
  );
}

function CostCard({ title, data }: { title: string; data: UsagePeriod }) {
  return (
    <div className="bg-card/50 border border-border rounded-lg p-3">
      <p className="text-xs text-muted-foreground mb-1">{title}</p>
      <p className="text-lg font-bold text-foreground">{formatCost(data.totalCost)}</p>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
        <span className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          {data.totalRequests}
        </span>
        <span className="flex items-center gap-1">
          <Cpu className="w-3 h-3" />
          {formatCost(data.aiCost)}
        </span>
        <span className="flex items-center gap-1">
          <Search className="w-3 h-3" />
          {formatCost(data.searchCost)}
        </span>
      </div>
    </div>
  );
}
